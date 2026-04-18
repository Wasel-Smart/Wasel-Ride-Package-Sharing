import type { TripState } from './trip.types';

export function createInitialTripState(): TripState {
  return {
    rides: [],
    packages: [],
    buses: [],
    supportTickets: [],
    loading: true,
  };
}
