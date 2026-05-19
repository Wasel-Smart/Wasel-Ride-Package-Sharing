import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface WaselProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  is_verified: boolean;
  verification_level: number;
  rating_as_driver: number;
  rating_as_passenger: number;
  total_trips: number;
  trips_as_driver: number;
  trips_as_passenger: number;
  wallet_balance: number;
  language: string;
  notification_enabled: boolean;
  created_at: string;
}

const DEFAULT_PROFILE: WaselProfile = {
  id: '',
  full_name: 'Wasel User',
  email: '',
  phone: null,
  avatar_url: null,
  city: null,
  bio: null,
  is_verified: false,
  verification_level: 0,
  rating_as_driver: 0,
  rating_as_passenger: 0,
  total_trips: 0,
  trips_as_driver: 0,
  trips_as_passenger: 0,
  wallet_balance: 0,
  language: 'en',
  notification_enabled: true,
  created_at: new Date().toISOString(),
};

export function useProfile(user: User | null) {
  const [profile, setProfile] = useState<WaselProfile>(DEFAULT_PROFILE);
  const [loading, setLoading]  = useState(false);
  const [error,   setError]    = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (err) throw err;
      if (data) setProfile(data as WaselProfile);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
      // Populate from auth metadata as fallback
      setProfile(prev => ({
        ...prev,
        id:        user.id,
        email:     user.email ?? '',
        full_name: user.user_metadata?.full_name ?? 'Wasel User',
      }));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchProfile(); }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: Partial<WaselProfile>) => {
    if (!user) return { error: 'Not authenticated' };
    const { error: err } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (!err) setProfile(prev => ({ ...prev, ...updates }));
    return { error: err?.message ?? null };
  }, [user]);

  return { profile, loading, error, refresh: fetchProfile, updateProfile };
}
