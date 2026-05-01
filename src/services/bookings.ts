import { requestEdgeJson, runBackendWorkflow } from './backendWorkflow';
import {
  createDirectBooking,
  getDirectTripBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';

export const bookingsAPI = {
  async createBooking(
    tripId: string,
    seatsRequested: number,
    pickup?: string,
    dropoff?: string,
    metadata?: Record<string, unknown>,
  ): Promise<any> {
    return runBackendWorkflow({
      operation: 'Booking creation',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: ({ userId }) => createDirectBooking({
        tripId,
        userId: userId!,
        seatsRequested,
        pickup,
        dropoff,
        metadata,
      }),
      edge: (context) => requestEdgeJson<any>({
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

  async getUserBookings() {
    return runBackendWorkflow({
      operation: 'User booking loading',
      authMode: 'required',
      fallback: ({ userId }) => getDirectUserBookings(userId!),
      edge: (context) => requestEdgeJson<any>({
        path: `/bookings/user/${context.userId}`,
        authMode: 'required',
        context,
        operation: 'Failed to fetch bookings',
      }),
    });
  },

  async getTripBookings(tripId: string) {
    return runBackendWorkflow({
      operation: 'Trip booking loading',
      authMode: 'required',
      fallback: () => getDirectTripBookings(tripId),
      edge: (context) => requestEdgeJson<any>({
        path: `/trips/${tripId}/bookings`,
        authMode: 'required',
        context,
        operation: 'Failed to fetch trip bookings',
      }),
    });
  },

  async updateBookingStatus(bookingId: string, status: 'accepted' | 'rejected' | 'cancelled') {
    return runBackendWorkflow({
      operation: 'Booking update',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: () => updateDirectBookingStatus(bookingId, status),
      edge: (context) => requestEdgeJson<any>({
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
