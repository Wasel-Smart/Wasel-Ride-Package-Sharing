/**
 * activeTrip.ts — Service layer for Wasel Active Trip management
 *
 * Provides typed CRUD operations against the server-side
 * `active_trip:{userId}` KV record so the Dashboard banner
 * and LiveTripTracking can share real-time state.
 *
 * ✅ All methods are typed with ActiveTrip interface
 * ✅ Uses fetchWithRetry with abort/timeout support
 * ✅ Structured error logging with method context
 */

import { API_URL, fetchWithRetry, getAuthDetails } from './core';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TripStatus =
  | 'en_route_to_pickup'
  | 'driver_arrived'
  | 'en_route'
  | 'arriving'
  | 'completed';

export interface ActiveTripDriver {
  name: string;
  nameAr: string;
  rating: number;
  trips: number;
  img: string;
  phone: string;
  initials: string;
}

export interface ActiveTripVehicle {
  model: string;
  color: string;
  plate: string;
  year: number;
}

export interface ActiveTrip {
  id: string;
  from: string;
  fromAr?: string;
  to: string;
  toAr?: string;
  driver: ActiveTripDriver;
  vehicle: ActiveTripVehicle;
  price: number;
  passengers: number;
  eta: string;
  duration: string;
  status: TripStatus;
  shareCode: string;
  tier: 'economy' | 'comfort' | 'premium' | 'van';
  startedAt: string;
  userId: string;
  updatedAt?: string;
}

// ── API Methods ───────────────────────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const { token } = await getAuthDetails();
  return { Authorization: `Bearer ${token}` };
}

export const activeTripAPI = {
  /** Fetch the current user's active trip (returns null if none). */
  async getActiveTrip(signal?: AbortSignal): Promise<ActiveTrip | null> {
    try {
      const headers = await authHeaders();
      const response = await fetchWithRetry(
        `${API_URL}/active-trip`, 
        {
          headers,
          signal,
        }
        // Using defaults: 1 retry, 500ms backoff, 5s timeout
      );
      if (!response.ok) {return null;}
      const data = await response.json();
      return data.activeTrip ?? null;
    } catch (err) {
      if ((err as Error).name === 'AbortError') {return null;}
      console.error('[activeTripAPI.getActiveTrip]', err);
      return null;
    }
  },

  /** Persist the active trip after a ride is confirmed. */
  async setActiveTrip(
    tripData: Omit<ActiveTrip, 'userId' | 'startedAt'>,
  ): Promise<ActiveTrip | null> {
    try {
      const headers = await authHeaders();
      const response = await fetchWithRetry(
        `${API_URL}/active-trip`, 
        {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(tripData),
        }
        // Using defaults: 1 retry, 500ms backoff, 5s timeout
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        console.error('[activeTripAPI.setActiveTrip] Server error:', response.status, body);
        return null;
      }
      const data = await response.json();
      return data.activeTrip ?? null;
    } catch (err) {
      console.error('[activeTripAPI.setActiveTrip]', err);
      return null;
    }
  },

  /** Update the active trip's status / ETA without replacing the whole record. */
  async patchActiveTrip(
    updates: Partial<Pick<ActiveTrip, 'status' | 'eta' | 'updatedAt'>>,
  ): Promise<ActiveTrip | null> {
    try {
      const headers = await authHeaders();
      const response = await fetchWithRetry(
        `${API_URL}/active-trip`, 
        {
          method: 'PATCH',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
        // Using defaults: 1 retry, 500ms backoff, 5s timeout
      );
      if (!response.ok) {return null;}
      const data = await response.json();
      return data.activeTrip ?? null;
    } catch (err) {
      console.error('[activeTripAPI.patchActiveTrip]', err);
      return null;
    }
  },

  /** Clear the active trip (ride completed or cancelled). */
  async clearActiveTrip(): Promise<boolean> {
    try {
      const headers = await authHeaders();
      const response = await fetchWithRetry(
        `${API_URL}/active-trip`, 
        {
          method: 'DELETE',
          headers,
        }
        // Using defaults: 1 retry, 500ms backoff, 5s timeout
      );
      return response.ok;
    } catch (err) {
      console.error('[activeTripAPI.clearActiveTrip]', err);
      return false;
    }
  },
};
