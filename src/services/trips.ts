import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey } from './core';
import { logger } from '../utils/logging';
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
import { omitUndefined } from '../utils/object';
import {
  TRIPS_CONTRACT_VERSION,
  tripMutationResultSchema,
  tripPriceCalculationResultSchema,
  tripPublishResultSchema,
  tripSearchResultSchema,
  tripSearchResultsSchema,
} from '../contracts/trips';
import { parseContract } from '../contracts/validation';
import { allowDirectSupabaseFallback, requireDirectSupabaseFallback } from './runtimePolicy';

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

function shouldFallbackToDirectOnResponse(response: Response): boolean {
  return response.status === 404 || response.status === 405 || response.status === 501;
}

function sanitizeTripPayload<T extends TripCreatePayload | TripUpdatePayload>(payload: T): T {
  return omitUndefined({
    ...payload,
    ...(typeof payload.from === 'string'
      ? { from: sanitizeTextField(payload.from, 'Origin', 80) }
      : {}),
    ...(typeof payload.to === 'string'
      ? { to: sanitizeTextField(payload.to, 'Destination', 80) }
      : {}),
    ...(typeof payload.gender === 'string'
      ? { gender: sanitizeTextField(payload.gender, 'Gender preference', 32) }
      : {}),
    ...(typeof payload.carModel === 'string'
      ? { carModel: sanitizeTextField(payload.carModel, 'Car model', 120) }
      : {}),
    ...(typeof payload.note === 'string'
      ? { note: sanitizeOptionalTextField(payload.note, 500) }
      : {}),
    ...(typeof payload.packageNote === 'string'
      ? { packageNote: sanitizeOptionalTextField(payload.packageNote, 500) }
      : {}),
  }) as unknown as T;
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
          requireDirectSupabaseFallback('Trip creation');
          return parseContract(
            tripMutationResultSchema,
            await createDirectTrip(userId, sanitizedPayload),
            'trip.create',
            TRIPS_CONTRACT_VERSION,
          );
        }

        let response: Response;
        try {
          response = await withApiTelemetry('trip.create', `${API_URL}/trips`, 'POST', () =>
            fetchWithRetry(`${API_URL}/trips`, {
              method: 'POST',
              headers: buildTraceHeaders(requestId, {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              }),
              body: JSON.stringify(sanitizedPayload),
            }),
          );
        } catch (err) {
          if (!allowDirectSupabaseFallback()) {
            throw err;
          }
          logger.warning(
            '[trips] edge API unavailable for trip.create, falling back to direct Supabase',
            {
              operation: 'trip.create.edge_fallback',
              error: err instanceof Error ? err.message : String(err),
            },
          );
          return parseContract(
            tripMutationResultSchema,
            await createDirectTrip(userId, sanitizedPayload),
            'trip.create',
            TRIPS_CONTRACT_VERSION,
          );
        }

        if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
          requireDirectSupabaseFallback('Trip creation');
          logger.warning(
            '[trips] edge route unavailable for trip.create, falling back to direct Supabase',
            {
              operation: 'trip.create.edge_route_missing',
              status: response.status,
            },
          );
          return parseContract(
            tripMutationResultSchema,
            await createDirectTrip(userId, sanitizedPayload),
            'trip.create',
            TRIPS_CONTRACT_VERSION,
          );
        }

        return parseContract(
          tripMutationResultSchema,
          await expectJsonResponse<unknown>(response, 'Failed to create trip', {
            operation: 'trip.create',
          }),
          'trip.create',
          TRIPS_CONTRACT_VERSION,
        );
      },
    });
  },

  async searchTrips(
    from?: string,
    to?: string,
    date?: string,
    seats?: number,
  ): Promise<TripSearchResult[]> {
    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Trip search');
      return parseContract(
        tripSearchResultsSchema,
        await searchDirectTrips(from, to, date, seats),
        'trip.search',
        TRIPS_CONTRACT_VERSION,
      );
    }

    const params = new URLSearchParams();
    if (from) {params.append('from', from);}
    if (to) {params.append('to', to);}
    if (date) {params.append('date', date);}
    if (seats) {params.append('seats', seats.toString());}

    let response: Response;
    try {
      response = await withApiTelemetry(
        'trip.search',
        `${API_URL}/trips/search?${params}`,
        'GET',
        () =>
          fetchWithRetry(`${API_URL}/trips/search?${params}`, {
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          }),
      );
    } catch (err) {
      if (!allowDirectSupabaseFallback()) {
        throw err;
      }
      logger.warning(
        '[trips] edge API unavailable for trip.search, falling back to direct Supabase',
        {
          operation: 'trip.search.edge_fallback',
          error: err instanceof Error ? err.message : String(err),
        },
      );
      return parseContract(
        tripSearchResultsSchema,
        await searchDirectTrips(from, to, date, seats),
        'trip.search',
        TRIPS_CONTRACT_VERSION,
      );
    }

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Trip search');
      logger.warning(
        '[trips] edge route unavailable for trip.search, falling back to direct Supabase',
        {
          operation: 'trip.search.edge_route_missing',
          status: response.status,
        },
      );
      return parseContract(
        tripSearchResultsSchema,
        await searchDirectTrips(from, to, date, seats),
        'trip.search',
        TRIPS_CONTRACT_VERSION,
      );
    }

    return parseContract(
      tripSearchResultsSchema,
      await expectJsonResponse<unknown>(response, 'Failed to search trips', {
        operation: 'trip.search',
      }),
      'trip.search',
      TRIPS_CONTRACT_VERSION,
    );
  },

  async getTripById(tripId: string): Promise<TripSearchResult> {
    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Trip lookup');
      const trip = await getDirectTripById(tripId);
      if (!trip) {throw new Error('Failed to fetch trip');}
      return parseContract(tripSearchResultSchema, trip, 'trip.get', TRIPS_CONTRACT_VERSION);
    }

    const response = await withApiTelemetry('trip.get', `${API_URL}/trips/${tripId}`, 'GET', () =>
      fetchWithRetry(`${API_URL}/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      }),
    );

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Trip lookup');
      const trip = await getDirectTripById(tripId);
      if (!trip) {throw new Error('Failed to fetch trip');}
      return parseContract(tripSearchResultSchema, trip, 'trip.get', TRIPS_CONTRACT_VERSION);
    }

    return parseContract(
      tripSearchResultSchema,
      await expectJsonResponse<unknown>(response, 'Failed to fetch trip', {
        operation: 'trip.get',
        tripId,
      }),
      'trip.get',
      TRIPS_CONTRACT_VERSION,
    );
  },

  async getDriverTrips(): Promise<TripSearchResult[]> {
    const { token, userId } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Driver trip lookup');
      return parseContract(
        tripSearchResultsSchema,
        await getDirectDriverTrips(userId),
        'trip.driver.list',
        TRIPS_CONTRACT_VERSION,
      );
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

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Driver trip lookup');
      return parseContract(
        tripSearchResultsSchema,
        await getDirectDriverTrips(userId),
        'trip.driver.list',
        TRIPS_CONTRACT_VERSION,
      );
    }

    return parseContract(
      tripSearchResultsSchema,
      await expectJsonResponse<unknown>(response, 'Failed to fetch driver trips', {
        operation: 'trip.driver.list',
        userId,
      }),
      'trip.driver.list',
      TRIPS_CONTRACT_VERSION,
    );
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
        } catch (err) {
          if (!allowDirectSupabaseFallback()) {
            throw err;
          }
          logger.warning(
            '[trips] edge API unavailable for trip.update, falling back to direct Supabase',
            {
              operation: 'trip.update.edge_fallback',
              tripId,
              error: err instanceof Error ? err.message : String(err),
            },
          );
          return parseContract(
            tripMutationResultSchema,
            await updateDirectTrip(tripId, sanitizedPayload),
            'trip.update',
            TRIPS_CONTRACT_VERSION,
          );
        }

        if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
          requireDirectSupabaseFallback('Trip update');
          logger.warning(
            '[trips] edge route unavailable for trip.update, falling back to direct Supabase',
            {
              operation: 'trip.update.edge_route_missing',
              tripId,
              status: response.status,
            },
          );
          return parseContract(
            tripMutationResultSchema,
            await updateDirectTrip(tripId, sanitizedPayload),
            'trip.update',
            TRIPS_CONTRACT_VERSION,
          );
        }

        return parseContract(
          tripMutationResultSchema,
          await expectJsonResponse<unknown>(response, 'Failed to update trip', {
            operation: 'trip.update',
            tripId,
          }),
          'trip.update',
          TRIPS_CONTRACT_VERSION,
        );
      },
    });
  },

  async deleteTrip(tripId: string): Promise<{ success: boolean }> {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Trip deletion');
      return parseContract(
        tripPublishResultSchema,
        await deleteDirectTrip(tripId),
        'trip.delete',
        TRIPS_CONTRACT_VERSION,
      );
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

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Trip deletion');
      return parseContract(
        tripPublishResultSchema,
        await deleteDirectTrip(tripId),
        'trip.delete',
        TRIPS_CONTRACT_VERSION,
      );
    }

    return parseContract(
      tripPublishResultSchema,
      await expectJsonResponse<unknown>(response, 'Failed to delete trip', {
        operation: 'trip.delete',
        tripId,
      }),
      'trip.delete',
      TRIPS_CONTRACT_VERSION,
    );
  },

  async publishTrip(tripId: string): Promise<{ success: boolean }> {
    const { token } = await getAuthDetails();

    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Trip publication');
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

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Trip publication');
      await updateDirectTrip(tripId, { status: 'active' });
      return { success: true };
    }

    return parseContract(
      tripPublishResultSchema,
      await expectJsonResponse<unknown>(response, 'Failed to publish trip', {
        operation: 'trip.publish',
        tripId,
      }),
      'trip.publish',
      TRIPS_CONTRACT_VERSION,
    );
  },

  async calculatePrice(
    type: 'passenger' | 'package',
    weight?: number,
    distance_km?: number,
    base_price?: number,
  ): Promise<PriceCalculationResult> {
    if (!canUseEdgeApi()) {
      requireDirectSupabaseFallback('Trip price calculation');
      return parseContract(
        tripPriceCalculationResultSchema,
        await calculateDirectPrice(type, weight, distance_km, base_price),
        'trip.calculate-price',
        TRIPS_CONTRACT_VERSION,
      );
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

    if (!response.ok && shouldFallbackToDirectOnResponse(response)) {
      requireDirectSupabaseFallback('Trip price calculation');
      return parseContract(
        tripPriceCalculationResultSchema,
        await calculateDirectPrice(type, weight, distance_km, base_price),
        'trip.calculate-price',
        TRIPS_CONTRACT_VERSION,
      );
    }

    return parseContract(
      tripPriceCalculationResultSchema,
      await expectJsonResponse<unknown>(response, 'Failed to calculate price', {
        operation: 'trip.calculatePrice',
      }),
      'trip.calculate-price',
      TRIPS_CONTRACT_VERSION,
    );
  },
};
