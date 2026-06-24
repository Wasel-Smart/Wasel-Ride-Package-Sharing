import { getDb } from '../db.js';
import { logger, NotFoundError, InternalError } from '../db.js';

export interface TripRow {
  id: string;
  mode: 'carpooling' | 'on_demand' | 'scheduled' | 'package' | 'return';
  status: 'posted' | 'requested' | 'matched' | 'accepted' | 'booked' | 'confirmed' | 'pickup' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  driver_id: string | null;
  created_by: string;
  origin_name: string;
  origin_location: unknown;
  destination_name: string;
  destination_location: unknown;
  distance_km: number | null;
  duration_minutes: number | null;
  route_polyline: string | null;
  departure_time: string | null;
  scheduled_pickup_time: string | null;
  actual_pickup_time: string | null;
  actual_dropoff_time: string | null;
  completed_at: string | null;
  total_seats: number;
  available_seats: number;
  price_per_seat: number | null;
  total_price: number | null;
  surge_multiplier: number;
  gender_preference: 'mixed' | 'women_only' | 'men_only' | 'family_only';
  prayer_stop_enabled: boolean;
  prayer_stop_location: unknown;
  prayer_stop_duration_min: number;
  allows_packages: boolean;
  package_capacity_kg: number | null;
  predicted_demand: number | null;
  corridor_id: string | null;
  cluster_id: string | null;
  notes: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripBookingRow {
  id: string;
  trip_id: string;
  passenger_id: string;
  seats_booked: number;
  price_paid: number;
  pickup_location: unknown;
  pickup_name: string | null;
  dropoff_location: unknown;
  dropoff_name: string | null;
  status: 'posted' | 'requested' | 'matched' | 'accepted' | 'booked' | 'confirmed' | 'pickup' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
  confirmed_by_driver: boolean;
  driver_rating: number | null;
  passenger_rating: number | null;
  driver_review: string | null;
  passenger_review: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTripInput {
  mode: 'carpooling' | 'on_demand' | 'scheduled' | 'package' | 'return';
  created_by: string;
  origin_name: string;
  origin_location: unknown;
  destination_name: string;
  destination_location: unknown;
  departure_time?: string;
  total_seats?: number;
  price_per_seat?: number;
  gender_preference?: 'mixed' | 'women_only' | 'men_only' | 'family_only';
  allows_packages?: boolean;
  notes?: string;
}

export interface CreateBookingInput {
  trip_id: string;
  passenger_id: string;
  seats_booked?: number;
  price_paid: number;
  pickup_location?: unknown;
  pickup_name?: string;
  dropoff_location?: unknown;
  dropoff_name?: string;
}

class TripRepository {
  private db = getDb();

  /**
   * Find available trips with optional filters and pagination
   */
  async findAvailableTrips(filters: {
    originCity?: string;
    destinationCity?: string;
    departureDate?: string;
    seats?: number;
    page: number;
    limit: number;
  }): Promise<{ data: TripRow[]; meta: { total: number; page: number; limit: number } }> {
    try {
      const offset = (filters.page - 1) * filters.limit;

      const countResult = await this.db`
        SELECT COUNT(*) as total
        FROM trips t
        WHERE t.status IN (${'posted'}, ${'requested'}) AND t.available_seats > 0
          ${filters.originCity ? this.db`AND LOWER(t.origin_name) LIKE ${`%${filters.originCity.toLowerCase()}%`}` : this.db``}
          ${filters.destinationCity ? this.db`AND LOWER(t.destination_name) LIKE ${`%${filters.destinationCity.toLowerCase()}%`}` : this.db``}
          ${filters.departureDate ? this.db`AND DATE(t.departure_time) = ${filters.departureDate}` : this.db``}
          ${filters.seats ? this.db`AND t.available_seats >= ${filters.seats}` : this.db``}
      ` as unknown as { total: number }[];

      const total = countResult[0]?.total ?? 0;

      const trips = await this.db`
        SELECT
          t.id, t.mode, t.status, t.driver_id, t.created_by,
          t.origin_name, t.origin_location, t.destination_name, t.destination_location,
          t.distance_km, t.duration_minutes, t.route_polyline,
          t.departure_time, t.scheduled_pickup_time, t.actual_pickup_time,
          t.actual_dropoff_time, t.completed_at,
          t.total_seats, t.available_seats, t.price_per_seat, t.total_price,
          t.surge_multiplier, t.gender_preference, t.prayer_stop_enabled,
          t.prayer_stop_location, t.prayer_stop_duration_min,
          t.allows_packages, t.package_capacity_kg, t.predicted_demand,
          t.corridor_id, t.cluster_id, t.notes, t.cancelled_by, t.cancellation_reason,
          t.created_at, t.updated_at
        FROM trips t
        WHERE t.status IN (${'posted'}, ${'requested'}) AND t.available_seats > 0
          ${filters.originCity ? this.db`AND LOWER(t.origin_name) LIKE ${`%${filters.originCity.toLowerCase()}%`}` : this.db``}
          ${filters.destinationCity ? this.db`AND LOWER(t.destination_name) LIKE ${`%${filters.destinationCity.toLowerCase()}%`}` : this.db``}
          ${filters.departureDate ? this.db`AND DATE(t.departure_time) = ${filters.departureDate}` : this.db``}
          ${filters.seats ? this.db`AND t.available_seats >= ${filters.seats}` : this.db``}
        ORDER BY t.departure_time ASC
        LIMIT ${filters.limit} OFFSET ${offset}
      ` as unknown as TripRow[];

      return {
        data: trips,
        meta: { total, page: filters.page, limit: filters.limit },
      };
    } catch (error) {
      logger.error({ err: error }, 'Error finding available trips');
      throw new InternalError('Failed to find available trips');
    }
  }

  /**
   * Find a trip by its ID
   */
  async findTripById(id: string): Promise<TripRow | null> {
    try {
      const [trip] = await this.db`
        SELECT
          id, mode, status, driver_id, created_by,
          origin_name, origin_location, destination_name, destination_location,
          distance_km, duration_minutes, route_polyline,
          departure_time, scheduled_pickup_time, actual_pickup_time,
          actual_dropoff_time, completed_at,
          total_seats, available_seats, price_per_seat, total_price,
          surge_multiplier, gender_preference, prayer_stop_enabled,
          prayer_stop_location, prayer_stop_duration_min,
          allows_packages, package_capacity_kg, predicted_demand,
          corridor_id, cluster_id, notes, cancelled_by, cancellation_reason,
          created_at, updated_at
        FROM trips
        WHERE id = ${id}
      ` as unknown as TripRow[];

      return trip ?? null;
    } catch (error) {
      logger.error({ err: error }, 'Error finding trip by ID');
      throw new InternalError('Failed to find trip');
    }
  }

  /**
   * Create a new trip
   */
  async createTrip(input: CreateTripInput): Promise<TripRow> {
    try {
      const now = new Date().toISOString();
      const [trip] = await this.db`
        INSERT INTO trips (
          mode, status, created_by, origin_name, origin_location,
          destination_name, destination_location, departure_time,
          total_seats, available_seats, price_per_seat,
          gender_preference, allows_packages, notes, created_at, updated_at
        ) VALUES (
          ${input.mode}, ${'posted'}, ${input.created_by}, ${input.origin_name}, ${input.origin_location as string},
          ${input.destination_name}, ${input.destination_location as string}, ${input.departure_time ?? null},
          ${input.total_seats ?? 1}, ${input.total_seats ?? 1}, ${input.price_per_seat ?? null},
          ${input.gender_preference ?? 'mixed'}, ${input.allows_packages ?? false}, ${input.notes ?? null}, ${now}, ${now}
        )
        RETURNING
          id, mode, status, driver_id, created_by,
          origin_name, origin_location, destination_name, destination_location,
          distance_km, duration_minutes, route_polyline,
          departure_time, scheduled_pickup_time, actual_pickup_time,
          actual_dropoff_time, completed_at,
          total_seats, available_seats, price_per_seat, total_price,
          surge_multiplier, gender_preference, prayer_stop_enabled,
          prayer_stop_location, prayer_stop_duration_min,
          allows_packages, package_capacity_kg, predicted_demand,
          corridor_id, cluster_id, notes, cancelled_by, cancellation_reason,
          created_at, updated_at
      ` as unknown as TripRow[];

      return trip;
    } catch (error) {
      logger.error({ err: error }, 'Error creating trip');
      throw new InternalError('Failed to create trip');
    }
  }

  /**
   * Update trip status and optionally assign driver
   */
  async updateTripStatus(id: string, status: string, driverId?: string): Promise<TripRow> {
    try {
      const now = new Date().toISOString();

      if (driverId) {
        const [trip] = await this.db`
          UPDATE trips
          SET status = ${status}, driver_id = ${driverId}, updated_at = ${now}
          WHERE id = ${id}
          RETURNING
            id, mode, status, driver_id, created_by,
            origin_name, origin_location, destination_name, destination_location,
            distance_km, duration_minutes, route_polyline,
            departure_time, scheduled_pickup_time, actual_pickup_time,
            actual_dropoff_time, completed_at,
            total_seats, available_seats, price_per_seat, total_price,
            surge_multiplier, gender_preference, prayer_stop_enabled,
            prayer_stop_location, prayer_stop_duration_min,
            allows_packages, package_capacity_kg, predicted_demand,
            corridor_id, cluster_id, notes, cancelled_by, cancellation_reason,
            created_at, updated_at
        ` as unknown as TripRow[];

        if (!trip) {
          throw new NotFoundError('Trip');
        }

        return trip;
      }

      const [trip] = await this.db`
        UPDATE trips
        SET status = ${status}, updated_at = ${now}
        WHERE id = ${id}
        RETURNING
          id, mode, status, driver_id, created_by,
          origin_name, origin_location, destination_name, destination_location,
          distance_km, duration_minutes, route_polyline,
          departure_time, scheduled_pickup_time, actual_pickup_time,
          actual_dropoff_time, completed_at,
          total_seats, available_seats, price_per_seat, total_price,
          surge_multiplier, gender_preference, prayer_stop_enabled,
          prayer_stop_location, prayer_stop_duration_min,
          allows_packages, package_capacity_kg, predicted_demand,
          corridor_id, cluster_id, notes, cancelled_by, cancellation_reason,
          created_at, updated_at
      ` as unknown as TripRow[];

      if (!trip) {
        throw new NotFoundError('Trip');
      }

      return trip;
    } catch (error) {
      logger.error({ err: error }, 'Error updating trip status');
      throw error instanceof NotFoundError ? error : new InternalError('Failed to update trip status');
    }
  }

  /**
   * Create a booking for a trip
   */
  async createBooking(input: CreateBookingInput): Promise<TripBookingRow> {
    try {
      const now = new Date().toISOString();
      const [booking] = await this.db`
        INSERT INTO trip_bookings (
          trip_id, passenger_id, seats_booked, price_paid,
          pickup_location, pickup_name, dropoff_location, dropoff_name,
          status, created_at, updated_at
        ) VALUES (
          ${input.trip_id}, ${input.passenger_id}, ${input.seats_booked ?? 1}, ${input.price_paid},
          ${input.pickup_location as string ?? null}, ${input.pickup_name ?? null},
          ${input.dropoff_location as string ?? null}, ${input.dropoff_name ?? null},
          ${'booked'}, ${now}, ${now}
        )
        RETURNING
          id, trip_id, passenger_id, seats_booked, price_paid,
          pickup_location, pickup_name, dropoff_location, dropoff_name,
          status, confirmed_by_driver, driver_rating, passenger_rating,
          driver_review, passenger_review, created_at, updated_at
      ` as unknown as TripBookingRow[];

      return booking;
    } catch (error) {
      logger.error({ err: error }, 'Error creating booking');
      throw new InternalError('Failed to create booking');
    }
  }

  /**
   * Find a booking by its ID
   */
  async findBookingById(id: string): Promise<TripBookingRow | null> {
    try {
      const [booking] = await this.db`
        SELECT
          id, trip_id, passenger_id, seats_booked, price_paid,
          pickup_location, pickup_name, dropoff_location, dropoff_name,
          status, confirmed_by_driver, driver_rating, passenger_rating,
          driver_review, passenger_review, created_at, updated_at
        FROM trip_bookings
        WHERE id = ${id}
      ` as unknown as TripBookingRow[];

      return booking ?? null;
    } catch (error) {
      logger.error({ err: error }, 'Error finding booking by ID');
      throw new InternalError('Failed to find booking');
    }
  }

  /**
   * Find all bookings for a trip
   */
  async findBookingsByTripId(tripId: string): Promise<TripBookingRow[]> {
    try {
      const bookings = await this.db`
        SELECT
          id, trip_id, passenger_id, seats_booked, price_paid,
          pickup_location, pickup_name, dropoff_location, dropoff_name,
          status, confirmed_by_driver, driver_rating, passenger_rating,
          driver_review, passenger_review, created_at, updated_at
        FROM trip_bookings
        WHERE trip_id = ${tripId}
        ORDER BY created_at DESC
      ` as unknown as TripBookingRow[];

      return bookings;
    } catch (error) {
      logger.error({ err: error }, 'Error finding bookings by trip ID');
      throw new InternalError('Failed to find bookings');
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(id: string, status: string): Promise<TripBookingRow> {
    try {
      const now = new Date().toISOString();
      const [booking] = await this.db`
        UPDATE trip_bookings
        SET status = ${status}, updated_at = ${now}
        WHERE id = ${id}
        RETURNING
          id, trip_id, passenger_id, seats_booked, price_paid,
          pickup_location, pickup_name, dropoff_location, dropoff_name,
          status, confirmed_by_driver, driver_rating, passenger_rating,
          driver_review, passenger_review, created_at, updated_at
      ` as unknown as TripBookingRow[];

      if (!booking) {
        throw new NotFoundError('Booking');
      }

      return booking;
    } catch (error) {
      logger.error({ err: error }, 'Error updating booking status');
      throw error instanceof NotFoundError ? error : new InternalError('Failed to update booking status');
    }
  }
}

export const tripRepository = new TripRepository();