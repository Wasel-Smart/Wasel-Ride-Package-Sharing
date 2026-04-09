import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey } from './core';
import {
  calculateDirectPrice,
  createDirectTrip,
  deleteDirectTrip,
  getDirectDriverTrips,
  getDirectTripById,
  searchDirectTrips,
  updateDirectTrip,
} from './directSupabase';
import {
  buildTraceHeaders,
  tripCreatePayloadSchema,
  tripUpdatePayloadSchema,
  withDataIntegrity,
} from './dataIntegrity';
import {
  expectJsonResponse,
  sanitizeOptionalTextField,
  sanitizeTextField,
  withApiTelemetry,
} from './http';

export interface TripCreatePayload {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  gender?: string;
  prayer?: boolean;
  carModel?: string;
  note?: string;
  acceptsPackages?: boolean;
  packageCapacity?: 'small' | 'medium' | 'large';
  packageNote?: string;
}

export interface TripUpdatePayload extends Partial<TripCreatePayload> {
  status?: 'active' | 'cancelled' | 'completed';
}

export interface TripSearchResult {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  driver: { id: string; name: string; rating: number; verified: boolean };
}

export interface PriceCalculationResult {
  price: number;
  currency: string;
  breakdown?: Record<string, number>;
}

function canUseEdgeApi(): boolean {
  return Boolean(API_URL && publicAnonKey);
}

function sanitizeTripPayload(payload: TripCreatePayload | TripUpdatePayload): TripCreatePayload | TripUpdatePayload {
  return {
    ...payload,
    ...(typeof payload.from === 'string' ? { from: sanitizeTextField(payload.from, 'Origin', 80) } : {}),
    ...(typeof payload.to === 'string' ? { to: sanitizeTextField(payload.to, 'Destination', 80) } : {}),
    ...(typeof payload.gender === 'string' ? { gender: sanitizeTextField(payload.gender, 'Gender preference', 32) } : {}),
    ...(typeof payload.carModel === 'string' ? { carModel: sanitizeTextField(payload.carModel, 'Car model', 120) } : {}),
    ...(typeof payload.note === 'string' ? { note: sanitizeOptionalTextField(payload.note, 500) } : {}),
    ...(typeof payload.packageNote === 'string' ? { packageNote: sanitizeOptionalTextField(payload.packageNote, 500) } : {}),
  };
}

export const tripsAPI = {
  async createTrip(tripData: TripCreatePayload): Promise<TripSearchResult> {
    return withDataIntegrity({
      operation: 'trip.create.api',
      schema: tripCreatePayloadSchema,
      payload: tripData,
      execute: async ({ requestId, payload }) => {
        const { token, userId } = await getAuthDetails();
        const sanitizedPayload = sanitizeTripPayload(payload) as TripCreatePayload;

        if (!canUseEdgeApi()) {
          return createDirectTrip(userId, sanitizedPayload);
        }

        let response: Response;
        try {
          response = await withApiTelemetry(
            'trip.create',
            `${API_URL}/trips`,
            'POST',
            () =>
              fetchWithRetry(`${API_URL}/trips`, {
                method: 'POST',
                headers: buildTraceHeaders(requestId, {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                }),
                body: JSON.stringify(sanitizedPayload),
              }),
          );
        } catch {
          return createDirectTrip(userId, sanitizedPayload);
        }

        return expectJsonResponse(response, 'Failed to create trip', { operation: 'trip.create' });
      },
    });
  },

  async searchTrips(from?: string, to?: string, date?: string, seats?: number): Promise<TripSearchResult[]> {
    if (!canUseEdgeApi()) {
      return searchDirectTrips(from, to, date, seats);
    }

    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (date) params.append('date', date);
    if (seats) params.append('seats', seats.toString());

    const response = await withApiTelemetry(
      'trip.search',
      `${API_URL}/trips/search?${params}`,
      'GET',
      () =>
        fetchWithRetry(`${API_URL}/trips/search?${params}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
    );

    return expectJsonResponse(response, 'Failed to search trips', { operation: 'trip.search' });
  },

  async getTripById(tripId: string): Promise<TripSearchResult> {
    if (!canUseEdgeApi()) {
      const trip = await getDirectTripById(tripId);
      if (!trip) throw new Error('Failed to fetch trip');
      return trip;
    }

    const response = await withApiTelemetry(
      'trip.get',
      `${API_URL}/trips/${tripId}`,
      'GET',
      () =>
        fetchWithRetry(`${API_URL}/trips/${tripId}`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        }),
    );

    return expectJsonResponse(response, 'Failed to fetch trip', { operation: 'trip.get', tripId });
  },

  async getDriverTrips(): Promise<TripSearchResult[]> {
    const { token, userId } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return getDirectDriverTrips(userId);
    }

    const response = await withApiTelemetry(
      'trip.driver.list',
      `${API_URL}/trips/user/${userId}`,
      'GET',
      () =>
        fetchWithRetry(`${API_URL}/trips/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
    );

    return expectJsonResponse(response, 'Failed to fetch driver trips', {
      operation: 'trip.driver.list',
      userId,
    });
  },

  async updateTrip(tripId: string, updates: TripUpdatePayload): Promise<TripSearchResult> {
    return withDataIntegrity({
      operation: 'trip.update.api',
      schema: tripUpdatePayloadSchema,
      payload: updates,
      execute: async ({ requestId, payload }) => {
        const { token } = await getAuthDetails();
        const sanitizedPayload = sanitizeTripPayload(payload) as TripUpdatePayload;

        if (!canUseEdgeApi()) {
          return updateDirectTrip(tripId, sanitizedPayload);
        }

        let response: Response;
        try {
          response = await withApiTelemetry(
            'trip.update',
            `${API_URL}/trips/${tripId}`,
            'PUT',
            () =>
              fetchWithRetry(`${API_URL}/trips/${tripId}`, {
                method: 'PUT',
                headers: buildTraceHeaders(requestId, {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                }),
                body: JSON.stringify(sanitizedPayload),
              }),
          );
        } catch {
          return updateDirectTrip(tripId, sanitizedPayload);
        }

        return expectJsonResponse(response, 'Failed to update trip', {
          operation: 'trip.update',
          tripId,
        });
      },
    });
  },

  async deleteTrip(tripId: string): Promise<{ success: boolean }> {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return deleteDirectTrip(tripId);
    }

    const response = await withApiTelemetry(
      'trip.delete',
      `${API_URL}/trips/${tripId}`,
      'DELETE',
      () =>
        fetchWithRetry(`${API_URL}/trips/${tripId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }),
    );

    return expectJsonResponse(response, 'Failed to delete trip', { operation: 'trip.delete', tripId });
  },

  async publishTrip(tripId: string): Promise<{ success: boolean }> {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      await updateDirectTrip(tripId, { status: 'active' });
      return { success: true };
    }

    const response = await withApiTelemetry(
      'trip.publish',
      `${API_URL}/trips/${tripId}/publish`,
      'POST',
      () =>
        fetchWithRetry(`${API_URL}/trips/${tripId}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        }),
    );

    return expectJsonResponse(response, 'Failed to publish trip', { operation: 'trip.publish', tripId });
  },

  async calculatePrice(
    type: 'passenger' | 'package',
    weight?: number,
    distance_km?: number,
    base_price?: number,
  ): Promise<PriceCalculationResult> {
    if (!canUseEdgeApi()) {
      return calculateDirectPrice(type, weight, distance_km, base_price);
    }

    const response = await withApiTelemetry(
      'trip.calculatePrice',
      `${API_URL}/trips/calculate-price`,
      'POST',
      () =>
        fetchWithRetry(`${API_URL}/trips/calculate-price`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, weight, distance_km, base_price }),
        }),
    );

    return expectJsonResponse(response, 'Failed to calculate price', { operation: 'trip.calculatePrice' });
  },
};
