import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { RIDE_BOOKINGS_CHANGED_EVENT } from '../../services/rideLifecycle';
import { rideController } from './ride.controller';
import { createInitialRideSearchState, rideSearchReducer } from './ride.state';
import type {
  RideRequestPayload,
  RideSearchDraft,
  RideSearchState,
  RideSuggestion,
} from './ride.types';

type UseRideSearchOptions = Partial<RideSearchDraft> & {
  passengerId?: string;
  searched?: boolean;
  messages?: {
    validation?: {
      from?: string;
      to?: string;
      distinctRoute?: string;
      date?: string;
    };
    suggestions?: {
      liveCorridor: (count: number) => string;
      recentSearch: string;
      cityPickup: string;
      regionalCorridor: string;
    };
    searchError?: string;
    requestError?: string;
    requestSuccess?: string;
    requestPendingSync?: string;
  };
};

function todayIsoDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function useRideSearch(options: UseRideSearchOptions = {}) {
  const [state, dispatch] = useReducer(
    rideSearchReducer,
    createInitialRideSearchState({
      from: options.from,
      to: options.to,
      date: options.date,
      mode: options.mode,
      rideType: options.rideType,
      searched: Boolean(options.searched),
    }),
  );

  const fromTimerRef = useRef<number | null>(null);
  const toTimerRef = useRef<number | null>(null);

  const setSuggestions = useCallback((field: 'from' | 'to', suggestions: RideSuggestion[]) => {
    dispatch({
      type: field === 'from' ? 'SET_FROM_SUGGESTIONS' : 'SET_TO_SUGGESTIONS',
      payload: suggestions,
    });
  }, []);

  const hydrateRequests = useCallback(
    async (rideIds?: string[]) => {
      try {
        const next =
          options.passengerId && options.passengerId.trim().length > 0
            ? await rideController.hydrateRequests(options.passengerId, rideIds)
            : rideController.getRequestIndex(rideIds);

        dispatch({ type: 'HYDRATE_REQUESTS', payload: next });
      } catch {
        dispatch({ type: 'HYDRATE_REQUESTS', payload: rideController.getRequestIndex(rideIds) });
      }
    },
    [options.passengerId],
  );

  const loadSuggestions = useCallback(
    (field: 'from' | 'to', query: string) => {
      const timerRef = field === 'from' ? fromTimerRef : toTimerRef;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(() => {
        void rideController
          .getSuggestions(field, query, state.draft, options.messages?.suggestions)
          .then(suggestions => setSuggestions(field, suggestions))
          .finally(() => {
            timerRef.current = null;
          });
      }, 300);
    },
    [options.messages?.suggestions, setSuggestions, state.draft],
  );

  useEffect(() => {
    loadSuggestions('from', state.draft.fromQuery);
  }, [loadSuggestions, state.draft.fromQuery]);

  useEffect(() => {
    loadSuggestions('to', state.draft.toQuery);
  }, [loadSuggestions, state.draft.toQuery]);

  useEffect(() => {
    if (!options.searched) return;
    void submitSearch();
    // Intentional first-render bootstrap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!options.passengerId && state.results.length === 0) {
      return;
    }

    void hydrateRequests(state.results.map(ride => ride.id));
  }, [hydrateRequests, options.passengerId, state.results]);

  useEffect(() => {
    const syncFromLocal = () => {
      dispatch({
        type: 'HYDRATE_REQUESTS',
        payload: rideController.getRequestIndex(state.results.map(ride => ride.id)),
      });
    };

    window.addEventListener(RIDE_BOOKINGS_CHANGED_EVENT, syncFromLocal);
    return () => {
      window.removeEventListener(RIDE_BOOKINGS_CHANGED_EVENT, syncFromLocal);
    };
  }, [state.results]);

  useEffect(() => {
    if (!options.passengerId) return;

    const intervalId = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }

      void hydrateRequests(state.results.map(ride => ride.id));
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hydrateRequests, options.passengerId, state.results]);

  useEffect(() => {
    const fromTimerId = fromTimerRef.current;
    const toTimerId = toTimerRef.current;
    return () => {
      if (fromTimerId !== null) window.clearTimeout(fromTimerId);
      if (toTimerId !== null) window.clearTimeout(toTimerId);
    };
  }, []);

  const submitSearch = useCallback(async (): Promise<boolean> => {
    const validation = rideController.validateDraft(state.draft, options.messages?.validation);
    if (Object.values(validation).some(Boolean)) {
      dispatch({ type: 'SET_VALIDATION', payload: validation });
      return false;
    }

    dispatch({ type: 'SEARCH_START' });

    try {
      const next = await rideController.search(state.draft, options.messages?.validation);
      dispatch({ type: 'SEARCH_SUCCESS', payload: next });
      await hydrateRequests(next.results.map(ride => ride.id));
      return true;
    } catch {
      dispatch({
        type: 'SEARCH_ERROR',
        payload: options.messages?.searchError ?? 'Unable to search rides right now.',
      });
      return false;
    }
  }, [hydrateRequests, options.messages?.searchError, options.messages?.validation, state.draft]);

  const autoDetectOrigin = useCallback(async () => {
    dispatch({ type: 'DETECT_ORIGIN_START' });
    const location = await rideController.autoDetectOrigin().catch(() => 'Amman');
    dispatch({ type: 'DETECT_ORIGIN_SUCCESS', payload: location });
  }, []);

  const requestRide = useCallback(
    async (payload: RideRequestPayload): Promise<boolean> => {
      dispatch({ type: 'REQUEST_START', payload: { rideId: payload.ride.id } });

      try {
        const result = await rideController.submitRideRequest(payload);
        dispatch({
          type: 'REQUEST_SUCCESS',
          payload: {
            rideId: payload.ride.id,
            activeRequest: result.booking,
            queueJobId: result.queueJobId,
            successMessage: result.lifecycleSynced
              ? (options.messages?.requestSuccess ??
                'Ride request sent. Driver matching is running now.')
              : (options.messages?.requestPendingSync ??
                'Ride booked. Driver confirmation will appear here when the backend updates it.'),
          },
        });

        await hydrateRequests(
          Array.from(new Set([...state.results.map(ride => ride.id), payload.ride.id])),
        );
        return true;
      } catch {
        dispatch({
          type: 'REQUEST_ERROR',
          payload: options.messages?.requestError ?? 'Ride request failed.',
        });
        return false;
      }
    },
    [
      hydrateRequests,
      options.messages?.requestError,
      options.messages?.requestPendingSync,
      options.messages?.requestSuccess,
      state.results,
    ],
  );

  const selectedRide = useMemo(
    () => state.results.find(ride => ride.id === state.selectedRideId) ?? null,
    [state.results, state.selectedRideId],
  );

  const visibleResults = useMemo(
    () => state.results.slice(0, state.visibleResultCount),
    [state.results, state.visibleResultCount],
  );

  return {
    state,
    selectedRide,
    visibleResults,
    hasMoreResults: state.visibleResultCount < state.results.length,
    minDate: todayIsoDate(),
    setFromQuery: (value: string) => dispatch({ type: 'SET_FROM_QUERY', payload: value }),
    setToQuery: (value: string) => dispatch({ type: 'SET_TO_QUERY', payload: value }),
    setFrom: (value: string) => dispatch({ type: 'SET_FROM', payload: value }),
    setTo: (value: string) => dispatch({ type: 'SET_TO', payload: value }),
    setDate: (value: string) => dispatch({ type: 'SET_DATE', payload: value }),
    setMode: (value: RideSearchState['draft']['mode']) =>
      dispatch({ type: 'SET_MODE', payload: value }),
    setRideType: (value: RideSearchState['draft']['rideType']) =>
      dispatch({ type: 'SET_RIDE_TYPE', payload: value }),
    selectRide: (rideId?: string) => dispatch({ type: 'SELECT_RIDE', payload: rideId }),
    loadMoreResults: () => dispatch({ type: 'LOAD_MORE_RESULTS' }),
    autoDetectOrigin,
    submitSearch,
    requestRide,
    hydrateRequests: () => hydrateRequests(state.results.map(ride => ride.id)),
    clearFeedback: () => dispatch({ type: 'CLEAR_FEEDBACK' }),
  };
}
