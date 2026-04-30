import type { RideSearchState } from './ride.types';

export type RideSearchAction =
  | { type: 'SET_FROM_QUERY'; payload: string }
  | { type: 'SET_TO_QUERY'; payload: string }
  | { type: 'SET_FROM'; payload: string }
  | { type: 'SET_TO'; payload: string }
  | { type: 'SET_DATE'; payload: string }
  | { type: 'SET_MODE'; payload: RideSearchState['draft']['mode'] }
  | { type: 'SET_RIDE_TYPE'; payload: RideSearchState['draft']['rideType'] }
  | { type: 'SET_FROM_SUGGESTIONS'; payload: RideSearchState['fromSuggestions'] }
  | { type: 'SET_TO_SUGGESTIONS'; payload: RideSearchState['toSuggestions'] }
  | { type: 'SET_VALIDATION'; payload: RideSearchState['validation'] }
  | { type: 'DETECT_ORIGIN_START' }
  | { type: 'DETECT_ORIGIN_SUCCESS'; payload: string }
  | { type: 'SEARCH_START' }
  | {
      type: 'SEARCH_SUCCESS';
      payload: {
        results: RideSearchState['results'];
        recommendedRideId?: string;
      };
    }
  | { type: 'SEARCH_ERROR'; payload: string }
  | {
      type: 'HYDRATE_REQUESTS';
      payload: RideSearchState['requestsByRideId'];
    }
  | { type: 'SELECT_RIDE'; payload?: string }
  | {
      type: 'REQUEST_START';
      payload: { rideId: string };
    }
  | {
      type: 'REQUEST_SUCCESS';
      payload: {
        rideId: string;
        activeRequest: RideSearchState['activeRequest'];
        queueJobId?: string | null;
        successMessage: string;
      };
    }
  | { type: 'REQUEST_ERROR'; payload: string }
  | { type: 'SYNC_ACTIVE_REQUEST'; payload: RideSearchState['activeRequest'] }
  | { type: 'LOAD_MORE_RESULTS' }
  | { type: 'CLEAR_FEEDBACK' };

/**
 * FIX [Issue 1 – defence-in-depth]: Returns the local calendar date string
 * (YYYY-MM-DD) so that past-date checks are consistent with the minDate
 * produced by todayIsoDate() in ride.hooks.ts (both subtract timezone offset).
 */
function localTodayIsoDate(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Returns the date string only if it is today or in the future; otherwise
 * returns an empty string.  This prevents a stale date from URL params or
 * any other source from pre-populating the date field with a past value,
 * which would leave the input below its own `min` attribute and block the
 * user from switching to schedule mode without manually clearing the field.
 */
function guardDate(date: string | undefined): string {
  if (!date) return '';
  return date >= localTodayIsoDate() ? date : '';
}

export function createInitialRideSearchState(
  initial?: Partial<RideSearchState['draft']> & Pick<RideSearchState, 'searched'>,
): RideSearchState {
  // FIX [Issue 1]: discard past dates before they reach state.
  const safeDate = guardDate(initial?.date);

  return {
    draft: {
      fromQuery: initial?.from ?? 'Amman',
      toQuery: initial?.to ?? 'Aqaba',
      from: initial?.from ?? 'Amman',
      to: initial?.to ?? 'Aqaba',
      date: safeDate,
      // If the sanitised date is now empty (was in the past), default to
      // 'now' mode rather than 'schedule' so the form isn't left in a broken
      // state where schedule mode is active but the date field is blank.
      mode: initial?.mode ?? (safeDate ? 'schedule' : 'now'),
      rideType: initial?.rideType ?? 'any',
    },
    phase: initial?.searched ? 'results' : 'idle',
    loading: false,
    searched: initial?.searched ?? false,
    detectingOrigin: false,
    results: [],
    visibleResultCount: 4,
    fromSuggestions: [],
    toSuggestions: [],
    validation: {},
    recommendedRideId: undefined,
    selectedRideId: undefined,
    activeRequest: null,
    requestsByRideId: {},
    activeQueueJobId: null,
    successMessage: null,
    error: null,
  };
}

export function rideSearchReducer(
  state: RideSearchState,
  action: RideSearchAction,
): RideSearchState {
  switch (action.type) {
    case 'SET_FROM_QUERY':
      return {
        ...state,
        draft: { ...state.draft, fromQuery: action.payload },
        error: null,
      };
    case 'SET_TO_QUERY':
      return {
        ...state,
        draft: { ...state.draft, toQuery: action.payload },
        error: null,
      };
    case 'SET_FROM':
      return {
        ...state,
        draft: { ...state.draft, from: action.payload, fromQuery: action.payload },
        validation: { ...state.validation, from: undefined },
      };
    case 'SET_TO':
      return {
        ...state,
        draft: { ...state.draft, to: action.payload, toQuery: action.payload },
        validation: { ...state.validation, to: undefined },
      };
    case 'SET_DATE':
      return {
        ...state,
        draft: { ...state.draft, date: action.payload },
        validation: { ...state.validation, date: undefined },
      };
    case 'SET_MODE':
      return {
        ...state,
        draft: {
          ...state.draft,
          mode: action.payload,
          date: action.payload === 'now' ? '' : state.draft.date,
        },
      };
    case 'SET_RIDE_TYPE':
      return {
        ...state,
        draft: { ...state.draft, rideType: action.payload },
      };
    case 'SET_FROM_SUGGESTIONS':
      return { ...state, fromSuggestions: action.payload };
    case 'SET_TO_SUGGESTIONS':
      return { ...state, toSuggestions: action.payload };
    case 'SET_VALIDATION':
      return { ...state, validation: action.payload, error: null };
    case 'DETECT_ORIGIN_START':
      return { ...state, detectingOrigin: true, error: null };
    case 'DETECT_ORIGIN_SUCCESS':
      return {
        ...state,
        detectingOrigin: false,
        draft: {
          ...state.draft,
          from: action.payload,
          fromQuery: action.payload,
        },
      };
    case 'SEARCH_START':
      return {
        ...state,
        phase: 'searching',
        loading: true,
        searched: true,
        error: null,
        successMessage: null,
      };
    case 'SEARCH_SUCCESS':
      return {
        ...state,
        phase: 'results',
        loading: false,
        results: action.payload.results,
        visibleResultCount: Math.min(4, action.payload.results.length),
        recommendedRideId: action.payload.recommendedRideId,
        selectedRideId: action.payload.recommendedRideId,
      };
    case 'SEARCH_ERROR':
      return {
        ...state,
        phase: 'error',
        loading: false,
        error: action.payload,
      };
    case 'HYDRATE_REQUESTS':
      return {
        ...state,
        requestsByRideId: action.payload,
        activeRequest:
          (state.selectedRideId ? action.payload[state.selectedRideId] : undefined) ??
          state.activeRequest,
      };
    case 'SELECT_RIDE':
      return { ...state, selectedRideId: action.payload };
    case 'REQUEST_START':
      return {
        ...state,
        phase: 'submitting',
        loading: true,
        selectedRideId: action.payload.rideId,
        error: null,
        successMessage: null,
      };
    case 'REQUEST_SUCCESS':
      return {
        ...state,
        phase: 'success',
        loading: false,
        selectedRideId: action.payload.rideId,
        activeRequest: action.payload.activeRequest,
        requestsByRideId: action.payload.activeRequest
          ? {
              ...state.requestsByRideId,
              [action.payload.activeRequest.rideId]: action.payload.activeRequest,
            }
          : state.requestsByRideId,
        activeQueueJobId: action.payload.queueJobId ?? null,
        successMessage: action.payload.successMessage,
      };
    case 'REQUEST_ERROR':
      return {
        ...state,
        phase: state.results.length > 0 ? 'results' : 'error',
        loading: false,
        error: action.payload,
      };
    case 'SYNC_ACTIVE_REQUEST':
      if (!action.payload) {
        return {
          ...state,
          activeRequest: null,
        };
      }

      return {
        ...state,
        activeRequest: action.payload,
        requestsByRideId: {
          ...state.requestsByRideId,
          [action.payload.rideId]: action.payload,
        },
      };
    case 'LOAD_MORE_RESULTS':
      return {
        ...state,
        visibleResultCount: Math.min(state.visibleResultCount + 4, state.results.length),
      };
    case 'CLEAR_FEEDBACK':
      return {
        ...state,
        successMessage: null,
        error: null,
      };
    default:
      return state;
  }
}
