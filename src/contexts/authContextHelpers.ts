import type { AuthChangeEvent, AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { WaselUser } from './LocalAuth';
import { authAPI } from '../services/auth';
import { getAuthRedirectCandidates } from '../utils/env';
import { persistAuthReturnTo } from '../utils/authFlow';

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
  trip_count?: number | null;
  verified?: boolean | null;
  sanad_verified?: boolean | null;
  verification_level?: string | null;
  wallet_status?: string | null;
  avatar_url?: string | null;
  two_factor_enabled?: boolean | null;
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

export function normalizeOperationError(
  error: unknown,
  fallback: string,
): Error {
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
    if (returnTo) {
      persistAuthReturnTo(returnTo);
    }

    const redirectCandidates = getAuthRedirectCandidates(
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );
    let lastError: AuthOperationError = null;

    for (const redirectTo of redirectCandidates) {
      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: provider === 'facebook' ? 'email,public_profile' : 'email profile',
          queryParams:
            provider === 'google'
              ? { prompt: 'select_account' }
              : undefined,
        },
      });

      if (!error && data?.url) {
        window.location.assign(data.url);
        return { error: null };
      }

      lastError = error ?? new Error(`${provider} sign-in could not start.`);

      const message =
        error instanceof Error
          ? error.message.toLowerCase()
          : '';

      const shouldRetry =
        message.includes('redirect') ||
        message.includes('callback') ||
        message.includes('not allowed') ||
        message.includes('allow list') ||
        message.includes('whitelist') ||
        message.includes('url');

      if (!shouldRetry) {
        break;
      }
    }

    return { error: lastError };
  } catch (error: unknown) {
    return {
      error: normalizeOperationError(
        error,
        `${provider[0].toUpperCase()}${provider.slice(1)} login failed`,
      ),
    };
  }
}

export function buildUpdatedLocalUser(
  localUser: WaselUser,
  updates: Partial<Profile>,
): Partial<WaselUser> {
  const normalizedPhone =
    typeof updates.phone_number === 'string'
      ? updates.phone_number.trim()
      : undefined;
  const currentPhone = String(localUser.phone ?? '').trim();
  const shouldResetPhoneVerification =
    normalizedPhone !== undefined && normalizedPhone !== currentPhone;

  return {
    name: String(updates.full_name ?? localUser.name),
    email: String(updates.email ?? localUser.email),
    phone: updates.phone_number ?? localUser.phone,
    avatar: updates.avatar_url ?? localUser.avatar,
    phoneVerified: shouldResetPhoneVerification ? false : localUser.phoneVerified,
  };
}

export function shouldRefreshProfile(
  event: AuthChangeEvent,
  session: Session | null,
): boolean {
  return Boolean(session?.user) && event === 'SIGNED_IN';
}
