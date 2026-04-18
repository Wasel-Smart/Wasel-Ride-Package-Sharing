import { useEffect, useState } from 'react';
import { tripController } from './trip.controller';
import { createInitialTripState } from './trip.state';
import type { TripState } from './trip.types';

export function useTrips(userId?: string) {
  const [state, setState] = useState<TripState>(() => createInitialTripState());

  useEffect(() => {
    let cancelled = false;
    setState(current => ({ ...current, loading: true }));
    void tripController.getCollections(userId).then(collections => {
      if (cancelled) return;
      setState({ ...collections, loading: false });
    });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { state };
}
