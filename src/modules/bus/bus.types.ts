import type { BusBookingPayload, BusBookingResult, BusRoute } from '../../services/bus';

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
  info: string | null;
  error: string | null;
  bookingBusy: boolean;
}
