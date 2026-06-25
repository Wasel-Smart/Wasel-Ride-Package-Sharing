import { getDb } from '@wasel/backend-shared/db';
import { logger } from '@wasel/backend-shared/logging/logger';
import { NotFoundError, ValidationError, InternalError } from '@wasel/backend-shared/errors/app-errors';

export interface BusRouteRow {
  id: string;
  operator_id: string | null;
  name: string;
  origin_city: string;
  destination_city: string;
  intermediate_stops: string[] | null;
  estimated_duration_min: number | null;
  amenities: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusScheduleRow {
  id: string;
  route_id: string;
  departure_time: string;
  arrival_time: string;
  available_seats: number;
  price_jod: number;
  vehicle_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusBookingRow {
  id: string;
  schedule_id: string;
  passenger_id: string;
  seats: number;
  total_amount: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  qr_code: string | null;
  share_code: string | null;
  created_at: string;
  updated_at: string;
}

export class BusRepository {
  private db = getDb();

  async findRoutes(originCity?: string, destinationCity?: string): Promise<BusRouteRow[]> {
    let query = 'SELECT * FROM bus_routes WHERE is_active = true';
    const params: any[] = [];
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
    return result as unknown as BusRouteRow[];
  }

  async findRouteById(id: string): Promise<BusRouteRow | null> {
    const result = await this.db.unsafe('SELECT * FROM bus_routes WHERE id = $1', [id]);
    return (result[0] as unknown as BusRouteRow) || null;
  }

  async findSchedules(routeId: string, date?: string): Promise<BusScheduleRow[]> {
    let query = 'SELECT * FROM bus_schedules WHERE route_id = $1 AND is_active = true';
    const params: any[] = [routeId];

    if (date) {
      query += ` AND DATE(departure_time) = $2`;
      params.push(date);
    }

    query += ' ORDER BY departure_time ASC';
    const result = await this.db.unsafe(query, params);
    return result as unknown as BusScheduleRow[];
  }

  async createBooking(scheduleId: string, passengerId: string, seats: number): Promise<BusBookingRow> {
    try {
      const scheduleResult = await this.db.unsafe(
        'SELECT available_seats, price_jod FROM bus_schedules WHERE id = $1 FOR UPDATE',
        [scheduleId]
      );

      if (!scheduleResult[0]) {
        throw new NotFoundError('Bus schedule');
      }

      const schedule = scheduleResult[0] as unknown as { available_seats: number; price_jod: number };
      if (schedule.available_seats < seats) {
        throw new ValidationError('Not enough seats available');
      }

      const shareCode = `BUS-${Date.now().toString(36).toUpperCase()}`;
      const totalAmount = Math.round(schedule.price_jod * seats * 100) / 100;

      const bookingResult = await this.db.unsafe(
        `INSERT INTO bus_bookings (schedule_id, passenger_id, seats, total_amount, status, share_code)
         VALUES ($1, $2, $3, $4, 'confirmed', $5)
         RETURNING *`,
        [scheduleId, passengerId, seats, totalAmount, shareCode]
      );

      await this.db.unsafe(
        'UPDATE bus_schedules SET available_seats = available_seats - $1 WHERE id = $2',
        [seats, scheduleId]
      );

      return bookingResult[0] as unknown as BusBookingRow;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) throw error;
      logger.error({ error, scheduleId, passengerId }, 'Failed to create bus booking');
      throw new InternalError('Failed to create bus booking', error as Error);
    }
  }

  async findBookingById(id: string): Promise<BusBookingRow | null> {
    const result = await this.db.unsafe('SELECT * FROM bus_bookings WHERE id = $1', [id]);
    return (result[0] as unknown as BusBookingRow) || null;
  }

  async updateBookingStatus(id: string, status: 'confirmed' | 'cancelled' | 'completed'): Promise<BusBookingRow> {
    try {
      const result = await this.db.unsafe(
        `UPDATE bus_bookings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, id]
      );
      if (!result[0]) {
        throw new NotFoundError('Bus booking');
      }
      return result[0] as unknown as BusBookingRow;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      logger.error({ error, id, status }, 'Failed to update bus booking status');
      throw new InternalError('Failed to update bus booking status', error as Error);
    }
  }
}

export const busRepository = new BusRepository();
