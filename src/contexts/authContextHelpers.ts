import type { AuthChangeEvent, AuthError, Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { WaselUser } from './LocalAuth';
import { authAPI } from '../services/auth';
import { friendlyAuthError } from '../utils/authHelpers';
import { getAuthRedirectCandidates } from '../utils/env';
import { normalizeAuthReturnTo, persistAuthReturnTo } from '../utils/authFlow';
import { omitUndefined } from '../utils/object';

export type Profile = {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  phone_verified?: boolean | null;
  email_verified?: boolean | null;
  role?: string | null;
  driver_status?: string | null;
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
    driver_status: localUser.driverStatus ?? null,
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

export async function signInWithOAuthProvider(
  client: SupabaseClient | null,
  provider: 'google' | 'facebook',
  returnTo?: string,
): Promise<{ error: AuthOperationError }> {
  if (!client) {
    return { error: new Error('Backend not configured — Supabase is not initialised.') };
  }

  try {
    // Persist the post-auth destination before we leave the page.
    if (returnTo) {
      persistAuthReturnTo(normalizeAuthReturnTo(returnTo));
    }

    // Build the redirect URL from the current origin so it always matches
    // whatever is configured in the Supabase dashboard.
    const redirectTo = getAuthRedirectCandidates(
      typeof window !== 'undefined' ? window.location.origin : undefined,
    )[0];

    // Use the native browser redirect (no skipBrowserRedirect) so Supabase
    // drives the full OAuth flow reliably across all browsers and contexts.
    const { error } = await client.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        scopes: provider === 'facebook' ? 'email,public_profile' : 'email profile',
        ...omitUndefined({
          queryParams:
            provider === 'google'
              ? { prompt: 'select_account', access_type: 'offline' }
              : undefined,
        }),
      },
    });

    if (error) {
      return {
        error: new Error(
          friendlyAuthError(
            error.message,
            `${provider[0].toUpperCase()}${provider.slice(1)} sign-in could not start. Make sure this provider is enabled in your Supabase project and the redirect URL is on the allow-list.`,
          ),
        ),
      };
    }

    // signInWithOAuth with native redirect navigates the page away — we
    // return success here but the Promise may never resolve in practice.
    return { error: null };
  } catch (error: unknown) {
    return {
      error: normalizeOperationError(
        friendlyAuthError(
          error,
          `${provider[0].toUpperCase()}${provider.slice(1)} login failed`,
        ),
        `${provider[0].toUpperCase()}${provider.slice(1)} login failed`,
      ),
    };
  }
}

export function normalizeOperationError(
  error: unknown,
  fallback: string,
): Error {
  if (error instanceof Error) {
    return new Error(friendlyAuthError(error, fallback));
  }

  if (typeof error === 'string') {
    return new Error(friendlyAuthError(error, fallback));
  }

  return new Error(fallback);
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

  return omitUndefined({
    name: String(updates.full_name ?? localUser.name),
    email: String(updates.email ?? localUser.email),
    phone: updates.phone_number ?? localUser.phone,
    avatar: updates.avatar_url ?? localUser.avatar,
    phoneVerified: shouldResetPhoneVerification ? false : localUser.phoneVerified,
  });
}

export function shouldRefreshProfile(
  event: AuthChangeEvent,
  session: Session | null,
): boolean {
  return Boolean(session?.user) && event === 'SIGNED_IN';
}
