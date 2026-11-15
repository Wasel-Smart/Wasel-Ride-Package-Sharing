import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../authContextHelpers';
import { supabase } from '../../utils/supabase/client';
import { authAPI } from '../../services/auth';

export { authAPI };

export async function loadProfileFromBackend (): Promise<Profile | null> {
  const profileData = await authAPI.getProfile();
  return ( profileData?.profile as Profile | null ) ?? null;
}

export function getSupabaseClient (): SupabaseClient | null {
  return supabase;
}
