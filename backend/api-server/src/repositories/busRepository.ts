import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export interface BusRouteRow {
  id: string;
  operator_id: string | null;
  corridor_id: string | null;
  name: string;
  origin_city: string;
  destination_city: string;
  stops: string[] | null;
  estimated_duration: number | null;
  amenities: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface BusScheduleRow {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  available_seats: number;
  price: number;
  vehicle_id: string | null;
  created_at: string;
}

export interface BusBookingRow {
  id: string;
  schedule_id: string;
  passenger_id: string;
  seats: number;
  total_amount: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'checked_in';
  qr_code: string | null;
  share_code: string | null;
  created_at: string;
  updated_at: string;
}

class BusRepository {
  private db = getDb();

  /**
   * Find bus routes by origin/destination filters
   */
  async findRoutes(originCity?: string, destinationCity?: string): Promise<BusRouteRow[]> {
    try {
      const routes = await this.db`
        SELECT
          id, operator_id, corridor_id, name, origin_city, destination_city,
          stops, estimated_duration, amenities, created_at, updated_at
        FROM bus_routes
        ${originCity && destinationCity
          ? this.db`WHERE LOWER(origin_city) = ${originCity.toLowerCase()} AND LOWER(destination_city) = ${destinationCity.toLowerCase()}`
          : originCity
            ? this.db`WHERE LOWER(origin_city) = ${originCity.toLowerCase()}`
            : destinationCity
              ? this.db`WHERE LOWER(destination_city) = ${destinationCity.toLowerCase()}`
              : this.db``}
        ORDER BY corridor_id, name
      ` as unknown as BusRouteRow[];

      return routes;
    } catch (error) {
      logger.error('Error finding bus routes', error);
      throw new InternalError('Failed to find bus routes');
    }
  }

  /**
   * Find a bus route by its ID
   */
  async findRouteById(id: string): Promise<BusRouteRow | null> {
    try {
      const [route] = await this.db`
        SELECT
          id, operator_id, corridor_id, name, origin_city, destination_city,
          stops, estimated_duration, amenities, created_at, updated_at
        FROM bus_routes
        WHERE id = ${id}
      ` as unknown as BusRouteRow[];

      return route ?? null;
    } catch (error) {
      logger.error('Error finding bus route by ID', error);
      throw new InternalError('Failed to find bus route');
    }
  }

  /**
   * Find schedules for a route, optionally filtered by date
   */
  async findSchedules(routeId: string, date?: string): Promise<BusScheduleRow[]> {
    try {
      const schedules = await this.db`
        SELECT
          id, route_id, departure_time, arrival_time, available_seats, price, vehicle_id, created_at
        FROM bus_schedules
        WHERE route_id = ${routeId}
          AND available_seats > 0
          ${date ? this.db`AND DATE(departure_time) = ${date}` : this.db``}
        ORDER BY departure_time ASC
      ` as unknown as BusScheduleRow[];

      return schedules;
    } catch (error) {
      logger.error('Error finding bus schedules', error);
      throw new InternalError('Failed to find bus schedules');
    }
  }

  /**
   * Create a bus booking
   */
  async createBooking(scheduleId: string, passengerId: string, seats: number): Promise<BusBookingRow> {
    try {
      const now = new Date().toISOString();
      const qrCode = `BUS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const shareCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const [booking] = await this.db`
        INSERT INTO bus_bookings (
          schedule_id, passenger_id, seats, total_amount, status, qr_code, share_code, created_at, updated_at
        ) VALUES (
          ${scheduleId}, ${passengerId}, ${seats}, 0, 'confirmed', ${qrCode}, ${shareCode}, ${now}, ${now}
        )
        RETURNING
          id, schedule_id, passenger_id, seats, total_amount, status, qr_code, share_code, created_at, updated_at
      ` as unknown as BusBookingRow[];

      return booking;
    } catch (error) {
      logger.error('Error creating bus booking', error);
      throw new InternalError('Failed to create bus booking');
    }
  }

  /**
   * Find a bus booking by its ID
   */
  async findBookingById(id: string): Promise<BusBookingRow | null> {
    try {
      const [booking] = await this.db`
        SELECT
          id, schedule_id, passenger_id, seats, total_amount, status, qr_code, share_code, created_at, updated_at
        FROM bus_bookings
        WHERE id = ${id}
      ` as unknown as BusBookingRow[];

      return booking ?? null;
    } catch (error) {
      logger.error('Error finding bus booking by ID', error);
      throw new InternalError('Failed to find bus booking');
    }
  }

  /**
   * Update bus booking status
   */
  async updateBookingStatus(id: string, status: string): Promise<BusBookingRow> {
    try {
      const now = new Date().toISOString();
      const [booking] = await this.db`
        UPDATE bus_bookings
        SET status = ${status}, updated_at = ${now}
        WHERE id = ${id}
        RETURNING
          id, schedule_id, passenger_id, seats, total_amount, status, qr_code, share_code, created_at, updated_at
      ` as unknown as BusBookingRow[];

      if (!booking) {
        throw new NotFoundError('Bus booking');
      }

      return booking;
    } catch (error) {
      logger.error('Error updating bus booking status', error);
      throw error instanceof NotFoundError ? error : new InternalError('Failed to update bus booking status');
    }
  }
}

export const busRepository = new BusRepository();