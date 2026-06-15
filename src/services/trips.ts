import { hasConfiguredEdgeTransport, requestEdgeJson, runBackendWorkflow } from './backendWorkflow';
import {
  calculateDirectPrice,
  createDirectTrip,
  deleteDirectTrip,
  getDirectDriverTrips,
  getDirectTripById,
  searchDirectTrips,
  updateDirectTrip,
} from './directSupabase';

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

export const tripsAPI = {
   async createTrip(tripData: TripCreatePayload): Promise<TripSearchResult> {
     return runBackendWorkflow({
       operation: 'Trip creation',
       authMode: 'required',
       fallbackPolicy: 'writes-if-enabled',
       fallback: ({ userId }) => createDirectTrip(userId ?? '', tripData),
       edge: context =>
         requestEdgeJson<TripSearchResult>({
           path: '/trips',
           method: 'POST',
           authMode: 'required',
           context,
           body: tripData,
           operation: 'Failed to create trip',
         }),
     });
  },

  async searchTrips(
    from?: string,
    to?: string,
    date?: string,
    seats?: number,
  ): Promise<TripSearchResult[]> {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (date) params.append('date', date);
    if (seats) params.append('seats', seats.toString());

    return runBackendWorkflow({
      operation: 'Trip search',
      authMode: 'public',
      edgeAvailable: hasConfiguredEdgeTransport('public'),
      fallback: () => searchDirectTrips(from, to, date, seats),
      edge: () =>
        requestEdgeJson<TripSearchResult[]>({
          path: `/trips/search?${params.toString()}`,
          authMode: 'public',
          operation: 'Failed to search trips',
        }),
    });
  },

  async getTripById(tripId: string): Promise<TripSearchResult> {
    return runBackendWorkflow({
      operation: 'Trip lookup',
      authMode: 'public',
      edgeAvailable: hasConfiguredEdgeTransport('public'),
      fallback: async () => {
        const trip = await getDirectTripById(tripId);
        if (!trip) throw new Error('Failed to fetch trip');
        return trip;
      },
      edge: () =>
        requestEdgeJson<TripSearchResult>({
          path: `/trips/${tripId}`,
          authMode: 'public',
          operation: 'Failed to fetch trip',
        }),
    });
  },

async getDriverTrips(): Promise<TripSearchResult[]> {
     return runBackendWorkflow({
       operation: 'Driver trip loading',
       authMode: 'required',
       fallback: ({ userId }) => getDirectDriverTrips(userId ?? ''),
       edge: context =>
         requestEdgeJson<TripSearchResult[]>({
           path: `/trips/user/${context.userId}`,
           authMode: 'required',
           context,
           operation: 'Failed to fetch driver trips',
         }),
     });
   },

  async updateTrip(tripId: string, updates: TripUpdatePayload): Promise<TripSearchResult> {
    return runBackendWorkflow({
      operation: 'Trip update',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: () => updateDirectTrip(tripId, updates),
      edge: context =>
        requestEdgeJson<TripSearchResult>({
          path: `/trips/${tripId}`,
          method: 'PUT',
          authMode: 'required',
          context,
          body: updates,
          operation: 'Failed to update trip',
        }),
    });
  },

  async deleteTrip(tripId: string): Promise<{ success: boolean }> {
    return runBackendWorkflow({
      operation: 'Trip deletion',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: () => deleteDirectTrip(tripId),
      edge: context =>
        requestEdgeJson<{ success: boolean }>({
          path: `/trips/${tripId}`,
          method: 'DELETE',
          authMode: 'required',
          context,
          operation: 'Failed to delete trip',
        }),
    });
  },

  async publishTrip(tripId: string): Promise<{ success: boolean }> {
    return runBackendWorkflow({
      operation: 'Trip publishing',
      authMode: 'required',
      fallbackPolicy: 'writes-if-enabled',
      fallback: async () => {
        await updateDirectTrip(tripId, { status: 'active' });
        return { success: true };
      },
      edge: context =>
        requestEdgeJson<{ success: boolean }>({
          path: `/trips/${tripId}/publish`,
          method: 'POST',
          authMode: 'required',
          context,
          operation: 'Failed to publish trip',
        }),
    });
  },

  async calculatePrice(
    type: 'passenger' | 'package',
    weight?: number,
    distance_km?: number,
    base_price?: number,
  ): Promise<PriceCalculationResult> {
    return runBackendWorkflow({
      operation: 'Price calculation',
      authMode: 'none',
      fallback: async () => calculateDirectPrice(type, weight, distance_km, base_price),
      edge: () =>
        requestEdgeJson<PriceCalculationResult>({
          path: '/trips/calculate-price',
          method: 'POST',
          body: { type, weight, distance_km, base_price },
          operation: 'Failed to calculate price',
        }),
    });
  },
};
