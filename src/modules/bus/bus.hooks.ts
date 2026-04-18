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
  const [state, setState] = useState<BusSearchState>(() =>
    createInitialBusSearchState(
      busController.getFallbackRoutes({
        from: options.from,
        to: options.to,
        seats: options.seats,
      }),
    ),
  );

  useEffect(() => {
    let cancelled = false;
    const timerId = window.setTimeout(() => {
      setState(current => ({ ...current, loading: true, error: null }));
      void busController.searchRoutes(options).then(next => {
        if (cancelled) return;
        setState(current => ({
          ...current,
          routes: next.routes,
          loading: false,
          info: next.info,
          error: next.error,
        }));
      });
    }, options.delayMs ?? 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [options.date, options.delayMs, options.from, options.searchKey, options.seats, options.to]);

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
