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
  let refreshing: Promise<void> | null = null;

  const refresh = () => {
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
          refresh();
        }
      });
  };

  refresh();

  const channel = supabase
    .channel(`ride-bookings-live-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, refresh)
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}
