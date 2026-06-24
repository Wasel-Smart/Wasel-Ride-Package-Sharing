import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';
export class BusRepository {
    db = getDb();
    async findRoutes(originCity, destinationCity) {
        let query = 'SELECT * FROM bus_routes WHERE is_active = true';
        const params = [];
        let paramIndex = 1;
        if (originCity) {
            query += ` AND origin_city ILIKE $${paramIndex}`;
            params.push(`%${originCity}%`);
            paramIndex++;
        }
        if (destinationCity) {
            query += ` AND destination_city ILIKE $${paramIndex}`;
            params.push(`%${destinationCity}%`);
            paramIndex++;
        }
        query += ' ORDER BY name ASC';
        const result = await this.db.unsafe(query, params);
        return result;
    }
    async findRouteById(id) {
        const result = await this.db.unsafe('SELECT * FROM bus_routes WHERE id = $1', [id]);
        return result[0] || null;
    }
    async findSchedules(routeId, date) {
        let query = 'SELECT * FROM bus_schedules WHERE route_id = $1 AND is_active = true';
        const params = [routeId];
        if (date) {
            query += ` AND DATE(departure_time) = $2`;
            params.push(date);
        }
        query += ' ORDER BY departure_time ASC';
        const result = await this.db.unsafe(query, params);
        return result;
    }
    async createBooking(scheduleId, passengerId, seats) {
        try {
            const scheduleResult = await this.db.unsafe('SELECT available_seats, price_jod FROM bus_schedules WHERE id = $1 FOR UPDATE', [scheduleId]);
            if (!scheduleResult[0]) {
                throw new NotFoundError('Bus schedule');
            }
            const schedule = scheduleResult[0];
            if (schedule.available_seats < seats) {
                throw new ValidationError('Not enough seats available');
            }
            const shareCode = `BUS-${Date.now().toString(36).toUpperCase()}`;
            const totalAmount = Math.round(schedule.price_jod * seats * 100) / 100;
            const bookingResult = await this.db.unsafe(`INSERT INTO bus_bookings (schedule_id, passenger_id, seats, total_amount, status, share_code)
         VALUES ($1, $2, $3, $4, 'confirmed', $5)
         RETURNING *`, [scheduleId, passengerId, seats, totalAmount, shareCode]);
            await this.db.unsafe('UPDATE bus_schedules SET available_seats = available_seats - $1 WHERE id = $2', [seats, scheduleId]);
            return bookingResult[0];
        }
        catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError)
                throw error;
            logger.error({ error, scheduleId, passengerId }, 'Failed to create bus booking');
            throw new InternalError('Failed to create bus booking', error);
        }
    }
    async findBookingById(id) {
        const result = await this.db.unsafe('SELECT * FROM bus_bookings WHERE id = $1', [id]);
        return result[0] || null;
    }
    async updateBookingStatus(id, status) {
        try {
            const result = await this.db.unsafe(`UPDATE bus_bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`, [status, id]);
            if (!result[0]) {
                throw new NotFoundError('Bus booking');
            }
            return result[0];
        }
        catch (error) {
            if (error instanceof NotFoundError)
                throw error;
            logger.error({ error, id, status }, 'Failed to update bus booking status');
            throw new InternalError('Failed to update bus booking status', error);
        }
    }
}
export const busRepository = new BusRepository();
