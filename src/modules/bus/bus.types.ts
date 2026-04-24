import type { BusBookingPayload, BusBookingResult, BusRoute } from '../../services/bus';
import type { BusRouteInfo } from './bus.copy';

export type { BusBookingPayload, BusBookingResult, BusRoute };

export interface BusSearchDraft {
  from: string;
  to: string;
  date: string;
  seats: number;
  searchKey?: string;
}

export interface BusSearchState {
  routes: BusRoute[];
  loading: boolean;
  info: BusRouteInfo | null;
  error: string | null;
  bookingBusy: boolean;
}
