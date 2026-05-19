import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MobileBooking {
  id: string;
  trip_id: string;
  user_id: string;
  seats_requested: number;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';
  created_at: string;
  updated_at: string;
  pickup_location: string | null;
  dropoff_location: string | null;
  // joined from trips
  trip?: {
    id: string;
    from_city: string;
    to_city: string;
    departure_date: string;
    departure_time: string;
    price_per_seat: number;
    driver_name: string;
    car_model: string;
    status: string;
  };
}

export interface UseBookingsResult {
  bookings: MobileBooking[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  cancelBooking: (id: string) => Promise<{ error: string | null }>;
}

export function useBookings(userId: string | undefined): UseBookingsResult {
  const [bookings, setBookings] = useState<MobileBooking[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('bookings')
        .select(`
          *,
          trip:trips (
            id, from_city, to_city, departure_date, departure_time,
            price_per_seat, driver_name, car_model, status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) throw err;
      setBookings((data as MobileBooking[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void fetchBookings(); }, [fetchBookings]);

  const cancelBooking = useCallback(async (id: string) => {
    const { error: err } = await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!err) {
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b),
      );
    }
    return { error: err?.message ?? null };
  }, []);

  return { bookings, loading, error, refresh: fetchBookings, cancelBooking };
}
