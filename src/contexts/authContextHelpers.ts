import type {
  AuthChangeEvent,
  AuthError,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import type { WaselUser } from './LocalAuth';
import { authAPI } from '../services/auth';
import { getAuthCallbackUrl } from '../utils/env';

export type Profile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  phone_verified?: boolean | null;
  email_verified?: boolean | null;
  role?: string | null;
  wallet_balance?: number | null;
  rating?: number | null;
  rating_as_driver?: number | null;
  trip_count?: number | null;
  verified?: boolean | null;
  sanad_verified?: boolean | null;
  verification_level?: string | null;
  wallet_status?: string | null;
  avatar_url?: string | null;
  two_factor_enabled?: boolean | null;
  driver_status?: string | null;
};

export type AuthOperationError = AuthError | Error | null;

export function createLocalAuthUser(localUser: WaselUser): User {
  return {
    id: localUser.id,
    email: localUser.email,
    phone: localUser.phone,
    user_metadata: {
      name: localUser.name,
      role: localUser.role,
    },
  } as unknown as User;
}

export function createLocalAuthProfile(localUser: WaselUser): Profile {
  return {
    id: localUser.id,
    email: localUser.email,
    full_name: localUser.name,
    phone_number: localUser.phone ?? null,
    wallet_balance: localUser.balance,
    rating: localUser.rating,
    trip_count: localUser.trips,
    verified: localUser.verified,
    sanad_verified: localUser.sanadVerified,
    verification_level: localUser.verificationLevel,
    wallet_status: localUser.walletStatus,
    avatar_url: localUser.avatar ?? null,
    phone_verified: localUser.phoneVerified,
    email_verified: localUser.emailVerified,
    two_factor_enabled: localUser.twoFactorEnabled,
  };
}

export function shouldIgnoreProfileError(error: Error): boolean {
  return error.message?.includes('aborted') || error.message?.includes('not found');
}

export async function loadProfile(): Promise<Profile | null> {
  const profileData = await authAPI.getProfile();
  return (profileData?.profile as Profile | null) || null;
}

export function normalizeOperationError(error: unknown, fallback: string): Error {
  return error instanceof Error ? error : new Error(fallback);
}

export async function signInWithOAuthProvider(
  client: SupabaseClient | null,
  provider: 'google' | 'facebook',
  returnTo?: string,
): Promise<{ error: AuthOperationError }> {
  if (!client) {
    return { error: new Error('Backend not configured') };
  }

  try {
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getAuthCallbackUrl(
          typeof window !== 'undefined' ? window.location.origin : undefined,
          returnTo ? { returnTo } : undefined,
        ),
      },
    });

    return { error: error ?? null };
  } catch (error: unknown) {
    return {
      error: normalizeOperationError(
        error,
        `${provider.charAt(0).toUpperCase()}${provider.slice(1)} login failed`,
      ),
    };
  }
}

export function shouldRefreshProfile(event: AuthChangeEvent, session: Session | null): boolean {
  return Boolean(session?.user) && event === 'SIGNED_IN';
}
