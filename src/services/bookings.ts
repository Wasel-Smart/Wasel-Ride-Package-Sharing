import { requestEdgeJson, runBackendWorkflow } from './backendWorkflow';
import {
  createDirectBooking,
  getDirectTripBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';

export interface BookingRecord {
  id: string;
  booking_id: string;
  trip_id: string | null;
  passenger_id: string | null;
  seats_requested: number;
  seat_number: number | null;
  pickup_location: string | null;
  dropoff_location: string | null;
  price_per_seat: number;
  total_price: number;
  amount: number;
  status: string;
  booking_status: string;
  confirmed_by_driver: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface BookingEnvelope {
  booking: BookingRecord;
}

export type BookingStatusUpdate = 'accepted' | 'rejected' | 'cancelled' | 'completed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return null;
}

function requireUserId(userId?: string): string {
  if (!userId) {
    throw new Error('Authenticated user id is required for booking operations.');
  }

  return userId;
}

function normalizeBookingStatus(status?: string | null): string {
  switch (status) {
    case 'accepted':
      return 'confirmed';
    case 'rejected':
      return 'cancelled';
    case 'pending_payment':
      return 'pending';
    default:
      return status || 'pending';
  }
}

function normalizeBookingRecord(payload: unknown): BookingRecord {
  const row = isRecord(payload) ? payload : {};
  const id = toOptionalString(row.booking_id ?? row.id) ?? '';
  const normalizedStatus = normalizeBookingStatus(toOptionalString(row.booking_status ?? row.status));
  const amount = toNumber(row.amount ?? row.total_price, 0);

  return {
    id,
    booking_id: id,
    trip_id: toOptionalString(row.trip_id),
    passenger_id: toOptionalString(row.passenger_id),
    seats_requested: Math.max(1, toNumber(row.seats_requested, 1)),
    seat_number: row.seat_number === null || row.seat_number === undefined ? null : toNumber(row.seat_number, 1),
    pickup_location: toOptionalString(row.pickup_location),
    dropoff_location: toOptionalString(row.dropoff_location),
    price_per_seat: toNumber(row.price_per_seat, amount),
    total_price: amount,
    amount,
    status: normalizedStatus,
    booking_status: normalizedStatus,
    confirmed_by_driver:
      typeof row.confirmed_by_driver === 'boolean' ? row.confirmed_by_driver : normalizedStatus === 'confirmed',
    created_at: toOptionalString(row.created_at),
    updated_at: toOptionalString(row.updated_at),
  };
}

function normalizeBookingEnvelope(payload: unknown): BookingEnvelope {
  if (isRecord(payload) && 'booking' in payload) {
    return { booking: normalizeBookingRecord(payload.booking) };
  }

  return { booking: normalizeBookingRecord(payload) };
}

function normalizeBookingList(payload: unknown): BookingRecord[] {
  return Array.isArray(payload) ? payload.map(normalizeBookingRecord) : [];
}

export const bookingsAPI = {
  async createBooking(
    tripId: string,
    seatsRequested: number,
    pickup?: string,
    dropoff?: string,
    metadata?: Record<string, unknown>,
  ): Promise<BookingEnvelope> {
    return runBackendWorkflow({
      operation: 'Booking creation',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: async ({ userId }) =>
        normalizeBookingEnvelope(
          await createDirectBooking({
            tripId,
            userId: requireUserId(userId),
            seatsRequested,
            pickup,
            dropoff,
            metadata,
          }),
        ),
      edge: async context =>
        normalizeBookingEnvelope(
          await requestEdgeJson<unknown>({
            path: '/bookings',
            method: 'POST',
            authMode: 'required',
            context,
            body: {
              trip_id: tripId,
              seats_requested: seatsRequested,
              pickup_stop: pickup,
              dropoff_stop: dropoff,
              ...metadata,
            },
            operation: 'Failed to create booking',
          }),
        ),
    });
  },

  async getUserBookings(): Promise<BookingRecord[]> {
    return runBackendWorkflow({
      operation: 'User booking loading',
      authMode: 'required',
      fallback: async ({ userId }) =>
        normalizeBookingList(await getDirectUserBookings(requireUserId(userId))),
      edge: async context =>
        normalizeBookingList(
          await requestEdgeJson<unknown>({
            path: `/bookings/user/${context.userId}`,
            authMode: 'required',
            context,
            operation: 'Failed to fetch bookings',
          }),
        ),
    });
  },

  async getTripBookings(tripId: string): Promise<BookingRecord[]> {
    return runBackendWorkflow({
      operation: 'Trip booking loading',
      authMode: 'required',
      fallback: async () => normalizeBookingList(await getDirectTripBookings(tripId)),
      edge: async context =>
        normalizeBookingList(
          await requestEdgeJson<unknown>({
            path: `/trips/${tripId}/bookings`,
            authMode: 'required',
            context,
            operation: 'Failed to fetch trip bookings',
          }),
        ),
    });
  },

  async updateBookingStatus(
    bookingId: string,
    status: Extract<BookingStatusUpdate, 'accepted' | 'rejected' | 'cancelled'>,
  ): Promise<BookingRecord> {
    return runBackendWorkflow({
      operation: 'Booking update',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: async () => normalizeBookingRecord(await updateDirectBookingStatus(bookingId, status)),
      edge: async context =>
        normalizeBookingRecord(
          await requestEdgeJson<unknown>({
            path: `/bookings/${bookingId}`,
            method: 'PUT',
            authMode: 'required',
            context,
            body: { status },
            operation: 'Failed to update booking',
          }),
        ),
    });
  },
};
