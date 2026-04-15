import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import {
  createDirectBooking,
  getDirectTripBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';
import {
  bookingCreatePayloadSchema,
  buildTraceHeaders,
  withDataIntegrity,
} from './dataIntegrity';
import { BOOKINGS_CONTRACT_VERSION, bookingListSchema, bookingRecordSchema } from '../contracts/bookings';
import { parseContract } from '../contracts/validation';
import {
  allowDirectSupabaseFallback,
  requireDirectSupabaseFallback,
} from './runtimePolicy';

function canUseEdgeApi(): boolean {
  return Boolean(API_URL);
}

function shouldFallbackToDirectOnResponse(response: Response): boolean {
  return response.status === 404 || response.status === 405 || response.status === 501;
}

export const bookingsAPI = {
  async createBooking(
    tripId: string,
    seatsRequested: number,
    pickup?: string,
    dropoff?: string,
    metadata?: Record<string, unknown>,
  ) {
    const { token, userId } = await getAuthDetails();

    return withDataIntegrity({
      operation: 'booking.create.api',
      schema: bookingCreatePayloadSchema,
      payload: { tripId, userId, seatsRequested, pickup, dropoff, metadata },
      execute: async ({ requestId, payload }) => {
        if (!canUseEdgeApi()) {
          requireDirectSupabaseFallback('Booking creation');
          return parseContract(
            bookingRecordSchema,
            await createDirectBooking(payload),
            'booking.create',
            BOOKINGS_CONTRACT_VERSION,
          );
        }

        let response: Response;
        try {
          response = await fetchWithRetry(`${API_URL}/bookings`, {
            method: 'POST',
            headers: buildTraceHeaders(requestId, {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }),
            body: JSON.stringify({
              trip_id: payload.tripId,
              seats_requested: payload.seatsRequested,
              pickup_stop: payload.pickup,
              dropoff_stop: payload.dropoff,
              ...payload.metadata,
            }),
          });
        } catch (error) {
          if (!allowDirectSupabaseFallback()) {
            throw error;
          }

          return parseContract(
            bookingRecordSchema,
            await createDirectBooking(payload),
            'booking.create',
            BOOKINGS_CONTRACT_VERSION,
          );
        }

        if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
          requireDirectSupabaseFallback('Booking creation');
          return parseContract(
            bookingRecordSchema,
            await createDirectBooking(payload),
            'booking.create',
            BOOKINGS_CONTRACT_VERSION,
          );
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to create booking' }));
          throw new Error(error.error || 'Failed to create booking');
        }

        return parseContract(
          bookingRecordSchema,
          await response.json(),
          'booking.create',
          BOOKINGS_CONTRACT_VERSION,
        );
      },
    });
  },

  async getUserBookings() {
    const { token, userId } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('User booking lookup');
      return parseContract(
        bookingListSchema,
        await getDirectUserBookings(userId),
        'booking.user.list',
        BOOKINGS_CONTRACT_VERSION,
      );
    }

    const response = await fetchWithRetry(`${API_URL}/bookings/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('User booking lookup');
      return parseContract(
        bookingListSchema,
        await getDirectUserBookings(userId),
        'booking.user.list',
        BOOKINGS_CONTRACT_VERSION,
      );
    }

    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }

    return parseContract(
      bookingListSchema,
      await response.json(),
      'booking.user.list',
      BOOKINGS_CONTRACT_VERSION,
    );
  },

  async getTripBookings(tripId: string) {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Trip booking lookup');
      return parseContract(
        bookingListSchema,
        await getDirectTripBookings(tripId),
        'booking.trip.list',
        BOOKINGS_CONTRACT_VERSION,
      );
    }

    const response = await fetchWithRetry(`${API_URL}/trips/${tripId}/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Trip booking lookup');
      return parseContract(
        bookingListSchema,
        await getDirectTripBookings(tripId),
        'booking.trip.list',
        BOOKINGS_CONTRACT_VERSION,
      );
    }

    if (!response.ok) {
      throw new Error('Failed to fetch trip bookings');
    }

    return parseContract(
      bookingListSchema,
      await response.json(),
      'booking.trip.list',
      BOOKINGS_CONTRACT_VERSION,
    );
  },

  async updateBookingStatus(bookingId: string, status: 'accepted' | 'rejected' | 'cancelled') {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Booking status update');
      return parseContract(
        bookingRecordSchema,
        await updateDirectBookingStatus(bookingId, status),
        'booking.update',
        BOOKINGS_CONTRACT_VERSION,
      );
    }

    const response = await fetchWithRetry(`${API_URL}/bookings/${bookingId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Booking status update');
      return parseContract(
        bookingRecordSchema,
        await updateDirectBookingStatus(bookingId, status),
        'booking.update',
        BOOKINGS_CONTRACT_VERSION,
      );
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update booking' }));
      throw new Error(error.error || 'Failed to update booking');
    }

    return parseContract(
      bookingRecordSchema,
      await response.json(),
      'booking.update',
      BOOKINGS_CONTRACT_VERSION,
    );
  },
};
