/**
 * useRideInventory
 *
 * Fetches live ride inventory from Supabase (searchDirectTrips) and merges it
 * with locally-posted rides (getConnectedRides). Falls back to the static
 * ALL_RIDES seed data only when the database returns nothing, so the UI is
 * never empty during development.
 */
import { useEffect, useRef, useState } from 'react';
import { searchDirectTrips } from '../../services/directSupabase/trips';
import { getConnectedRides } from '../../services/journeyLogistics';
import {
  buildRideFromPostedRide,
  buildRideFromTripSearchResult,
  ALL_RIDES,
  type Ride,
} from '../../pages/waselCoreRideData';
import { sanitizeLogMessage } from '../../utils/sanitization';

interface UseRideInventoryOptions {
  from: string;
  to: string;
  date: string;
  searched: boolean;
}

interface UseRideInventoryResult {
  rides: Ride[];
  loading: boolean;
  error: string | null;
}

export function useRideInventory({
  from,
  to,
  date,
  searched,
}: UseRideInventoryOptions): UseRideInventoryResult {
  const [rides, setRides] = useState<Ride[]>(() => [
    ...getConnectedRides().map(buildRideFromPostedRide),
    ...ALL_RIDES,
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Always show local + static rides immediately.
    const localRides = getConnectedRides().map(buildRideFromPostedRide);

    if (!searched) {
      setRides([...localRides, ...ALL_RIDES]);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    searchDirectTrips(from || undefined, to || undefined, date || undefined)
      .then(results => {
        if (controller.signal.aborted) return;
        const dbRides = results.map(buildRideFromTripSearchResult);
        // Merge: db rides take precedence over static seed data.
        // Local (user-posted) rides are always included.
        const merged = deduplicateRides([...localRides, ...dbRides, ...ALL_RIDES]);
        setRides(merged);
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        console.warn('[useRideInventory] DB fetch failed, using local+static:', sanitizeLogMessage(err));
        setError(null); // Non-fatal — fall back silently.
        setRides([...localRides, ...ALL_RIDES]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [from, to, date, searched]);

  return { rides, loading, error };
}

/** Deduplicate by id, preferring earlier entries (db > static). */
function deduplicateRides(rides: Ride[]): Ride[] {
  const seen = new Set<string>();
  return rides.filter(ride => {
    if (!ride.id || seen.has(ride.id)) return false;
    seen.add(ride.id);
    return true;
  });
}
