import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface MobileRide {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price_jod: number;
  seats_available: number;
  driver_name: string;
  driver_rating: number;
  driver_verified: boolean;
  car_model: string;
  gender_pref: 'any' | 'male' | 'female';
  prayer_stops: boolean;
  accepts_packages: boolean;
  status: 'active' | 'full' | 'cancelled' | 'completed';
}

export interface UseRidesResult {
  rides: MobileRide[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  searchRides: (from: string, to: string, date?: string) => Promise<void>;
}

export function useRides(): UseRidesResult {
  const [rides, setRides] = useState<MobileRide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = useCallback(async (from?: string, to?: string, date?: string) => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .gt('seats_available', 0)
        .order('date', { ascending: true })
        .order('time', { ascending: true })
        .limit(50);

      if (from) query = query.ilike('from', `%${from}%`);
      if (to) query = query.ilike('to', `%${to}%`);
      if (date) query = query.eq('date', date);

      const { data, error: supabaseError } = await query;
      if (supabaseError) throw supabaseError;
      setRides((data as MobileRide[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rides');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchRides(); }, [fetchRides]);

  const refresh = useCallback(() => fetchRides(), [fetchRides]);
  const searchRides = useCallback((from: string, to: string, date?: string) => fetchRides(from, to, date), [fetchRides]);

  return { rides, loading, error, refresh, searchRides };
}
