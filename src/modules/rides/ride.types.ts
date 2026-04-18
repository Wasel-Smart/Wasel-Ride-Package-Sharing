import type { RideBookingRecord } from '../../services/rideLifecycle';

export type RideSearchMode = 'now' | 'schedule';
export type RideType = 'any' | 'economy' | 'comfort' | 'family';
export type RideRequestPhase =
  | 'idle'
  | 'searching'
  | 'results'
  | 'submitting'
  | 'success'
  | 'error';
export type RideLocationField = 'from' | 'to';

export interface RideDriver {
  id: string;
  name: string;
  rating: number;
  verified: boolean;
  trips?: number;
  phone?: string;
  email?: string;
}

export interface RideSearchParams {
  from: string;
  to: string;
  date?: string;
  seats?: number;
  rideType?: RideType;
}

export interface RideSuggestion {
  value: string;
  label: string;
  supportingText: string;
}

export interface RideResult {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seatsAvailable: number;
  pricePerSeat: number;
  driver: RideDriver;
  routeMode: 'live_post' | 'network_inventory';
  ownerId?: string;
  vehicleType: string;
  etaMinutes: number;
  estimatedArrivalLabel: string;
  recommendedReason?: string;
  rideType: Exclude<RideType, 'any'>;
}

export interface RideRequestPayload {
  ride: RideResult;
  passengerId: string;
  passengerName?: string;
  passengerPhone?: string;
  passengerEmail?: string;
}

export interface RideRequestResult {
  booking: RideBookingRecord;
  queueJobId: string | null;
  lifecycleSynced: boolean;
}

export interface RideSearchDraft {
  fromQuery: string;
  toQuery: string;
  from: string;
  to: string;
  date: string;
  mode: RideSearchMode;
  rideType: RideType;
}

export interface RideValidationState {
  from?: string;
  to?: string;
  date?: string;
}

export interface RideSearchState {
  draft: RideSearchDraft;
  phase: RideRequestPhase;
  loading: boolean;
  searched: boolean;
  detectingOrigin: boolean;
  results: RideResult[];
  visibleResultCount: number;
  fromSuggestions: RideSuggestion[];
  toSuggestions: RideSuggestion[];
  validation: RideValidationState;
  recommendedRideId?: string;
  selectedRideId?: string;
  activeRequest?: RideBookingRecord | null;
  requestsByRideId: Record<string, RideBookingRecord>;
  activeQueueJobId?: string | null;
  successMessage?: string | null;
  error?: string | null;
}
