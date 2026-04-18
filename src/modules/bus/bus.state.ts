import type { BusSearchState } from './bus.types';

export function createInitialBusSearchState(routes: BusSearchState['routes'] = []): BusSearchState {
  return {
    routes,
    loading: false,
    info: null,
    error: null,
    bookingBusy: false,
  };
}
