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

export const tripsAPI = {
  async createTrip(tripData: TripCreatePayload): Promise<TripSearchResult> {
    return withDataIntegrity({
      operation: 'trip.create.api',
      schema: tripCreatePayloadSchema,
      payload: tripData,
      execute: async ({ requestId, payload }) => {
        const { token, userId } = await getAuthDetails();

        if (!canUseEdgeApi()) {
          return createDirectTrip(userId, payload);
        }

        let response: Response;
        try {
          response = await fetchWithRetry(`${API_URL}/trips`, {
            method: 'POST',
            headers: buildTraceHeaders(requestId, {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }),
            body: JSON.stringify(payload),
          });
        } catch {
          return createDirectTrip(userId, payload);
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to create trip' }));
          throw new Error(error.error || 'Failed to create trip');
        }

        return response.json();
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

    const response = await fetchWithRetry(`${API_URL}/trips/search?${params}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });

    if (!response.ok) {
      throw new Error('Failed to search trips');
    }

    return response.json();
  },

  async getTripById(tripId: string): Promise<TripSearchResult> {
    if (!canUseEdgeApi()) {
      const trip = await getDirectTripById(tripId);
      if (!trip) throw new Error('Failed to fetch trip');
      return trip;
    }

    const response = await fetchWithRetry(`${API_URL}/trips/${tripId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch trip');
    }

    return response.json();
  },

  async getDriverTrips(): Promise<TripSearchResult[]> {
    const { token, userId } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return getDirectDriverTrips(userId);
    }

    const response = await fetchWithRetry(`${API_URL}/trips/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch driver trips');
    }

    return response.json();
  },

  async updateTrip(tripId: string, updates: TripUpdatePayload): Promise<TripSearchResult> {
    return withDataIntegrity({
      operation: 'trip.update.api',
      schema: tripUpdatePayloadSchema,
      payload: updates,
      execute: async ({ requestId, payload }) => {
        const { token } = await getAuthDetails();

        if (!canUseEdgeApi()) {
          return updateDirectTrip(tripId, payload);
        }

        let response: Response;
        try {
          response = await fetchWithRetry(`${API_URL}/trips/${tripId}`, {
            method: 'PUT',
            headers: buildTraceHeaders(requestId, {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            }),
            body: JSON.stringify(payload),
          });
        } catch {
          return updateDirectTrip(tripId, payload);
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to update trip' }));
          throw new Error(error.error || 'Failed to update trip');
        }

        return response.json();
      },
    });
  },

  async deleteTrip(tripId: string): Promise<{ success: boolean }> {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      return deleteDirectTrip(tripId);
    }

    const response = await fetchWithRetry(`${API_URL}/trips/${tripId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to delete trip' }));
      throw new Error(error.error || 'Failed to delete trip');
    }

    return response.json();
  },

  async publishTrip(tripId: string): Promise<{ success: boolean }> {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      await updateDirectTrip(tripId, { status: 'active' });
      return { success: true };
    }

    const response = await fetchWithRetry(`${API_URL}/trips/${tripId}/publish`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to publish trip' }));
      throw new Error(error.error || 'Failed to publish trip');
    }

    return response.json();
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

    const response = await fetchWithRetry(`${API_URL}/trips/calculate-price`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, weight, distance_km, base_price }),
    });

    if (!response.ok) {
      throw new Error('Failed to calculate price');
    }

    return response.json();
  },
};
