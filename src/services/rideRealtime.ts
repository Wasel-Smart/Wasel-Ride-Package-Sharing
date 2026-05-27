import { supabase } from '../utils/supabase/client';
import type { PostedRide } from './journeyLogistics';
import { hydrateRideBookings, type RideBookingRecord } from './rideLifecycle';

interface RideBookingRealtimeOptions {
  userId: string;
  rides?: PostedRide[];
  onBookingsChange?: (bookings: RideBookingRecord[]) => void;
}

export function subscribeToRideBookingRealtime({
  userId,
  rides = [],
  onBookingsChange,
}: RideBookingRealtimeOptions): () => void {
  if (!supabase || !userId) {
    return () => {};
  }

  let active = true;
  let queued = false;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;
  let refreshing: Promise<void> | null = null;

  const refreshNow = () => {
    if (!active) {
      return;
    }

    if (refreshing) {
      queued = true;
      return;
    }

    refreshing = hydrateRideBookings(userId, rides)
      .then(bookings => {
        if (active) {
          onBookingsChange?.(bookings);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        refreshing = null;

        if (queued) {
          queued = false;
          refreshNow();
        }
      });
  };

  const refresh = () => {
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refreshNow();
    }, 750);
  };

  refreshNow();

  const channel = supabase
    .channel(`ride-bookings-live-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings', filter: `passenger_id=eq.${userId}` },
      refresh,
    )
    .subscribe();

  return () => {
    active = false;
    if (refreshTimer) {
      clearTimeout(refreshTimer);
    }
    void supabase.removeChannel(channel);
  };
}
