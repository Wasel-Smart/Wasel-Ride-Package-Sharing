import type {
  AuthChangeEvent,
  AuthError,
  Session,
  User,
} from '@supabase/auth-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { authAPI } from '../services/auth';
import { getAuthCallbackUrl } from '../utils/env';
import { deriveAccountTrustScore } from '../domain/trust/score';

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

export interface WaselUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'rider' | 'driver' | 'both' | 'admin';
  balance: number;
  rating: number;
  trips: number;
  verified: boolean;
  sanadVerified: boolean;
  verificationLevel: string;
  walletStatus: 'active' | 'limited' | 'frozen' | 'closed';
  avatar?: string;
  joinedAt: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  twoFactorEnabled: boolean;
  trustScore: number;
  driverStatus?: string;
  backendMode: 'supabase';
}

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

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? 'Wasel',
    lastName: parts.slice(1).join(' ') || 'User',
  };
}

function computeTrustScore(
  user: Pick<
    WaselUser,
    'verified' | 'sanadVerified' | 'emailVerified' | 'phoneVerified' | 'trips' | 'rating'
  >,
) {
  return deriveAccountTrustScore(user);
}

export function mapBackendProfile({
  authUser,
  profile,
}: {
  authUser: Pick<
    User,
    | 'id'
    | 'email'
    | 'phone'
    | 'created_at'
    | 'email_confirmed_at'
    | 'phone_confirmed_at'
    | 'user_metadata'
  >;
  profile: Profile | null;
}): WaselUser {
  const name =
    profile?.full_name ||
    authUser?.user_metadata?.full_name ||
    authUser?.user_metadata?.name ||
    authUser?.email?.split('@')?.[0] ||
    'Wasel User';
  const phone = profile?.phone_number ?? authUser?.phone ?? undefined;
  const verified = Boolean(profile?.verified ?? profile?.sanad_verified ?? false);
  const sanadVerified = Boolean(profile?.sanad_verified ?? verified);
  const emailVerified = Boolean(profile?.email_verified ?? authUser?.email_confirmed_at ?? false);
  const phoneVerified = Boolean(profile?.phone_verified ?? authUser?.phone_confirmed_at ?? false);
  const role =
    profile?.role === 'driver' || profile?.role === 'both'
      ? profile.role
      : profile?.role === 'admin'
        ? 'admin'
        : 'rider';
  const verificationLevel =
    profile?.verification_level ||
    (sanadVerified
      ? role === 'driver' || role === 'both'
        ? 'level_3'
        : 'level_2'
      : phoneVerified || emailVerified
        ? 'level_1'
        : 'level_0');
  const walletStatus: WaselUser['walletStatus'] =
    profile?.wallet_status === 'limited' ||
    profile?.wallet_status === 'frozen' ||
    profile?.wallet_status === 'closed'
      ? profile.wallet_status
      : 'active';

  const baseUser: WaselUser = {
    id: authUser?.id || `user-${Date.now()}`,
    name,
    email: authUser?.email || profile?.email || '',
    phone,
    role,
    balance: Number(profile?.wallet_balance ?? 0),
    rating: Number(profile?.rating ?? 5),
    trips: Number(profile?.trip_count ?? 0),
    verified,
    sanadVerified,
    verificationLevel,
    walletStatus,
    avatar: profile?.avatar_url ?? authUser?.user_metadata?.avatar_url ?? undefined,
    joinedAt: String(authUser?.created_at ?? new Date().toISOString()).slice(0, 10),
    emailVerified,
    phoneVerified,
    twoFactorEnabled: Boolean(profile?.two_factor_enabled),
    trustScore: 0,
    driverStatus: profile?.driver_status ?? undefined,
    backendMode: 'supabase',
  };

  return {
    ...baseUser,
    trustScore: computeTrustScore(baseUser),
  };
}

export function applyUserUpdates(user: WaselUser, updates: Partial<WaselUser>): WaselUser {
  const next = { ...user, ...updates };
  next.trustScore = computeTrustScore({
    verified: next.verified,
    sanadVerified: next.sanadVerified,
    emailVerified: next.emailVerified,
    phoneVerified: next.phoneVerified,
    trips: next.trips,
    rating: next.rating,
  });

  next.verificationLevel =
    next.verificationLevel ||
    (next.sanadVerified
      ? next.role === 'driver' || next.role === 'both'
        ? 'level_3'
        : 'level_2'
      : next.phoneVerified || next.emailVerified
        ? 'level_1'
        : 'level_0');

  return next;
}
