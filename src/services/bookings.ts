import { requestEdgeJson, runBackendWorkflow } from './backendWorkflow';
import {
  createDirectBooking,
  getDirectTripBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';

export interface BookingRecord {
  booking_id: string;
  trip_id: string;
  status: string;
  seats_requested?: number;
  pickup?: string;
  dropoff?: string;
  [key: string]: unknown;
}

export interface BookingListResponse {
  bookings?: BookingRecord[];
  data?: BookingRecord[];
  [key: string]: unknown;
}

export function normalizeBookingRecord(value: unknown): BookingRecord {
  const record =
    value && typeof value === 'object' && 'booking' in value
      ? (value as { booking?: unknown }).booking
      : value;
  const raw = (record && typeof record === 'object' ? record : {}) as Record<string, unknown>;
  const bookingId = String(raw.booking_id ?? raw.id ?? '');
  const tripId = String(raw.trip_id ?? '');

  return {
    ...raw,
    booking_id: bookingId,
    trip_id: tripId,
    status: String(raw.status ?? raw.booking_status ?? 'pending'),
  };
}

export function normalizeBookingList(bookings: unknown): BookingListResponse {
  const list = Array.isArray(bookings) ? bookings : [];
  return {
    bookings: list.map(normalizeBookingRecord),
  };
}

export const bookingsAPI = {
  async createBooking(
    tripId: string,
    seatsRequested: number,
    pickup?: string,
    dropoff?: string,
    metadata?: Record<string, unknown>,
  ): Promise<BookingRecord> {
    return runBackendWorkflow({
      operation: 'Booking creation',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: async ({ userId }) =>
        normalizeBookingRecord(
          await createDirectBooking({
            tripId,
            userId: userId ?? '',
            seatsRequested,
            pickup,
            dropoff,
            metadata,
          }),
        ),
      edge: context =>
        requestEdgeJson<BookingRecord>({
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
    });
  },

  async getUserBookings(): Promise<BookingListResponse> {
    return runBackendWorkflow({
      operation: 'User booking loading',
      authMode: 'required',
      fallback: async ({ userId }) =>
        normalizeBookingList(await getDirectUserBookings(userId ?? '')),
      edge: context =>
        requestEdgeJson<BookingListResponse>({
          path: `/bookings/user/${context.userId}`,
          authMode: 'required',
          context,
          operation: 'Failed to fetch bookings',
        }),
    });
  },

  async getTripBookings(tripId: string): Promise<BookingListResponse> {
    return runBackendWorkflow({
      operation: 'Trip booking loading',
      authMode: 'required',
      fallback: async () => normalizeBookingList(await getDirectTripBookings(tripId)),
      edge: context =>
        requestEdgeJson<BookingListResponse>({
          path: `/trips/${tripId}/bookings`,
          authMode: 'required',
          context,
          operation: 'Failed to fetch trip bookings',
        }),
    });
  },

  async updateBookingStatus(
    bookingId: string,
    status: 'accepted' | 'rejected' | 'cancelled',
  ): Promise<BookingRecord> {
    return runBackendWorkflow({
      operation: 'Booking update',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: async () =>
        normalizeBookingRecord(await updateDirectBookingStatus(bookingId, status)),
      edge: context =>
        requestEdgeJson<BookingRecord>({
          path: `/bookings/${bookingId}`,
          method: 'PUT',
          authMode: 'required',
          context,
          body: { status },
          operation: 'Failed to update booking',
        }),
    });
  },
};
