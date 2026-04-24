import { useEffect, useState } from 'react';
import { busController } from './bus.controller';
import { createInitialBusSearchState } from './bus.state';
import type {
  BusBookingPayload,
  BusBookingResult,
  BusSearchDraft,
  BusSearchState,
} from './bus.types';

interface UseBusSearchOptions extends BusSearchDraft {
  delayMs?: number;
}

export function useBusSearch(options: UseBusSearchOptions) {
  const { date, delayMs = 0, from, searchKey, seats, to } = options;
  const [state, setState] = useState<BusSearchState>(() =>
    createInitialBusSearchState(busController.getFallbackRoutes()),
  );

  useEffect(() => {
    let cancelled = false;
    const timerId = window.setTimeout(() => {
      setState(current => ({ ...current, loading: true, error: null }));
      void busController.searchRoutes({ date, from, searchKey, seats, to }).then(next => {
        if (cancelled) return;
        setState(current => ({
          ...current,
          routes: next.routes,
          loading: false,
          info: next.info,
          error: next.error,
        }));
      });
    }, delayMs);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [date, delayMs, from, searchKey, seats, to]);

  const bookRoute = async (payload: BusBookingPayload): Promise<BusBookingResult> => {
    setState(current => ({ ...current, bookingBusy: true }));
    try {
      return await busController.createBooking(payload);
    } finally {
      setState(current => ({ ...current, bookingBusy: false }));
    }
  };

  return { state, bookRoute };
}
