import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../authContextHelpers';
import { supabase } from '../../utils/supabase/client';

export async function loadProfileFromBackend(): Promise<Profile | null> {
  const { authAPI } = await import('../../services/auth');
  const profileData = await authAPI.getProfile();
  return (profileData?.profile as Profile | null) ?? null;
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  return supabase;
}
