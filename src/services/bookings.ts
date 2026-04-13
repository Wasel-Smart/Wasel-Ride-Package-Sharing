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
          return createDirectBooking(payload);
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
        } catch {
          return createDirectBooking(payload);
        }

        if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
          return createDirectBooking(payload);
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to create booking' }));
          throw new Error(error.error || 'Failed to create booking');
        }

        return await response.json();
      },
    });
  },

  async getUserBookings() {
    const { token, userId } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return getDirectUserBookings(userId);
    }

    const response = await fetchWithRetry(`${API_URL}/bookings/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      return getDirectUserBookings(userId);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch bookings');
    }

    return await response.json();
  },

  async getTripBookings(tripId: string) {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return getDirectTripBookings(tripId);
    }

    const response = await fetchWithRetry(`${API_URL}/trips/${tripId}/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      return getDirectTripBookings(tripId);
    }

    if (!response.ok) {
      throw new Error('Failed to fetch trip bookings');
    }

    return await response.json();
  },

  async updateBookingStatus(bookingId: string, status: 'accepted' | 'rejected' | 'cancelled') {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return updateDirectBookingStatus(bookingId, status);
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
      return updateDirectBookingStatus(bookingId, status);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update booking' }));
      throw new Error(error.error || 'Failed to update booking');
    }

    return await response.json();
  },
};
