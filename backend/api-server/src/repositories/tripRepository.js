import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, ValidationError, InternalError, } from '@wasel/backend-shared/errors/app-errors';
export class TripRepository {
    db = getDb();
    async findAvailableTrips(filters) {
        const { originCity, destinationCity, departureDate, seats, page, limit } = filters;
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE t.status IN (\'posted\', \'open\') AND t.departure_time > NOW()';
        const params = [];
        let paramIndex = 1;
        if (originCity) {
            whereClause += ` AND t.origin_name ILIKE $${paramIndex}`;
            params.push(`%${originCity}%`);
            paramIndex++;
        }
        if (destinationCity) {
            whereClause += ` AND t.destination_name ILIKE $${paramIndex}`;
            params.push(`%${destinationCity}%`);
            paramIndex++;
        }
        if (departureDate) {
            whereClause += ` AND DATE(t.departure_time) = $${paramIndex}`;
            params.push(departureDate);
            paramIndex++;
        }
        if (seats && seats > 0) {
            whereClause += ` AND t.available_seats >= $${paramIndex}`;
            params.push(seats);
            paramIndex++;
        }
        const countQuery = `SELECT COUNT(*) as total FROM trips t ${whereClause}`;
        const countResult = await this.db.unsafe(countQuery, params);
        const total = Number(countResult[0]?.total || 0);
        const dataQuery = `
      SELECT t.*, u.full_name as driver_name, u.avatar_url as driver_avatar,
             dp.vehicle_make, dp.vehicle_model, dp.vehicle_type, dp.average_rating as driver_rating
      FROM trips t
      LEFT JOIN users u ON t.driver_id = u.id
      LEFT JOIN driver_profiles dp ON t.driver_id = dp.user_id
      ${whereClause}
      ORDER BY t.departure_time ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(limit, offset);
        const data = await this.db.unsafe(dataQuery, params);
        return {
            data: data.map((row) => ({ ...row })),
            meta: { total, page, limit },
        };
    }
    async findTripById(id) {
        const result = await this.db.unsafe(`SELECT t.*, u.full_name as driver_name, u.avatar_url as driver_avatar
       FROM trips t
       LEFT JOIN users u ON t.driver_id = u.id
       WHERE t.id = $1`, [id]);
        return result[0] || null;
    }
    async createTrip(input) {
        try {
            const originPoint = `SRID=4326;POINT(${input.originCoords.lng} ${input.originCoords.lat})`;
            const destinationPoint = `SRID=4326;POINT(${input.destinationCoords.lng} ${input.destinationCoords.lat})`;
            const result = await this.db.unsafe(`INSERT INTO trips (
          mode, created_by, origin_name, origin_location, destination_name, destination_location,
          departure_time, total_seats, available_seats, price_per_seat, allows_packages,
          package_capacity_kg, notes, status
        ) VALUES ($1, $2, $3, ST_GeogFromText($4), $5, ST_GeogFromText($6), $7, $8, $9, $10, $11, $12, $13, 'posted')
        RETURNING *`, [
                input.mode,
                input.createdBy,
                input.originCity,
                originPoint,
                input.destinationCity,
                destinationPoint,
                input.departureTime,
                input.availableSeats,
                input.availableSeats,
                input.pricePerSeat || null,
                input.allowPackages ?? false,
                input.packageCapacityKg || null,
                input.notes || null,
            ]);
            return result[0];
        }
        catch (error) {
            logger.error({ error, input }, 'Failed to create trip');
            throw new InternalError('Failed to create trip', error);
        }
    }
    async updateTripStatus(id, status, driverId) {
        try {
            const result = await this.db.unsafe(`UPDATE trips SET status = $1, updated_at = NOW() WHERE id = $2 AND driver_id = $3 RETURNING *`, [status, id, driverId]);
            if (!result[0]) {
                throw new NotFoundError('Trip');
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof NotFoundError)
                throw error;
            logger.error({ error, id, status }, 'Failed to update trip status');
            throw new InternalError('Failed to update trip status', error);
        }
    }
    async createBooking(input) {
        try {
            const tripResult = await this.db.unsafe('SELECT available_seats, status FROM trips WHERE id = $1 FOR UPDATE', [input.tripId]);
            if (!tripResult[0]) {
                throw new NotFoundError('Trip');
            }
            const trip = tripResult[0];
            if (trip.status !== 'posted' && trip.status !== 'open') {
                throw new ValidationError('Trip is not available for booking');
            }
            if (trip.available_seats < input.seatsBooked) {
                throw new ValidationError('Not enough seats available');
            }
            const pkLocation = input.pickupCoords
                ? `SRID=4326;POINT(${input.pickupCoords.lng} ${input.pickupCoords.lat})`
                : null;
            const doLocation = input.dropoffCoords
                ? `SRID=4326;POINT(${input.dropoffCoords.lng} ${input.dropoffCoords.lat})`
                : null;
            const bookingResult = await this.db.unsafe(`INSERT INTO trip_bookings (
          trip_id, passenger_id, seats_booked, price_paid, status,
          pickup_location, pickup_name, dropoff_location, dropoff_name
        ) VALUES ($1, $2, $3, $4, 'booked', $5, $6, $7, $8)
        RETURNING *`, [
                input.tripId,
                input.passengerId,
                input.seatsBooked,
                input.pricePaid,
                pkLocation,
                input.pickupCity || null,
                doLocation,
                input.dropoffCity || null,
            ]);
            await this.db.unsafe('UPDATE trips SET available_seats = available_seats - $1 WHERE id = $2', [input.seatsBooked, input.tripId]);
            return bookingResult[0];
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError)
                throw error;
            logger.error({ error, input }, 'Failed to create booking');
            throw new InternalError('Failed to create booking', error);
        }
    }
    async findBookingById(id) {
        const result = await this.db.unsafe('SELECT * FROM trip_bookings WHERE id = $1', [id]);
        return result[0] || null;
    }
    async findBookingsByTripId(tripId) {
        const result = await this.db.unsafe('SELECT * FROM trip_bookings WHERE trip_id = $1', [tripId]);
        return result;
    }
    async updateBookingStatus(id, status) {
        try {
            const result = await this.db.unsafe(`UPDATE trip_bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, id]);
            if (!result[0]) {
                throw new NotFoundError('Booking');
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof NotFoundError)
                throw error;
            logger.error({ error, id, status }, 'Failed to update booking status');
            throw new InternalError('Failed to update booking status', error);
        }
    }
}
export const tripRepository = new TripRepository();
