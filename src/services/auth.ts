import { fetchWithRetry, getAuthDetails } from './core';
import {
  BackendRequestError,
  getSecureBackendFallbackError,
  hasConfiguredEdgeTransport,
  requestEdgeJson,
  runBackendWorkflow,
} from './backendWorkflow';
import {
  getDirectProfile,
  getDirectVerificationRecord,
  updateDirectProfile,
} from './directSupabase';
import { getAuthCallbackUrl, getConfig, resolveAuthRedirectOrigin } from '../utils/env';

function getDirectFallbackError(operation: string): Error {
  return getSecureBackendFallbackError(operation);
}

const ERROR_RULES: Array<{
  test: (lower: string, code: string | undefined) => boolean;
  message: string;
}> = [
  {
    test: (lower) =>
      lower.includes('invalid login credentials') ||
      lower.includes('invalid credentials') ||
      lower.includes('authentication failed') ||
      lower.includes('wrong email') ||
      lower.includes('wrong password'),
    message: 'Incorrect email or password.',
  },
  {
    test: (lower, code) => lower.includes('email not confirmed') || code === 'email_not_confirmed',
    message: 'Please confirm your email before signing in.',
  },
  {
    test: (lower, code) =>
      lower.includes('already been registered') ||
      lower.includes('already registered') ||
      lower.includes('user already exists') ||
      code === 'email_exists',
    message: 'This email is already registered.',
  },
  {
    test: (lower, code) => code === 'user_not_found' || lower.includes('user not found'),
    message: 'Account not found. Please check your email or sign up.',
  },
  {
    test: (lower, code) =>
      code === 'over_request_rate_limit' || lower.includes('too many requests'),
    message: 'Too many attempts. Please wait a moment and try again.',
  },
  {
    test: (lower, code) =>
      code === 'email_address_not_authorized' ||
      lower.includes('signups not allowed') ||
      lower.includes('not allowed for this email domain'),
    message: 'Sign-up is not allowed for this email domain.',
  },
  {
    test: (lower, code) => code === 'email_address_invalid' || lower.includes('invalid email'),
    message: 'Please enter a valid email address.',
  },
  {
    test: (lower, code) => code === 'user_banned' || lower.includes('user banned'),
    message: 'Your account has been suspended. Please contact support.',
  },
  {
    test: (_lower, code) => code === 'weak_password',
    message: 'Password is too weak. Please choose a stronger password.',
  },
  {
    test: (lower, code) => code === 'signup_disabled' || lower.includes('signup disabled'),
    message: 'Sign-up is currently disabled. Please contact support.',
  },
  {
    test: (lower, code) => code === 'phone_exists' || lower.includes('phone already exists'),
    message: 'This phone number is already registered.',
  },
];

function normalizeAuthError(
  message: string,
  code: string | undefined,
  context: 'signin' | 'signup' | 'generic',
): string {
  const lower = message.toLowerCase();

  const match = ERROR_RULES.find(rule => rule.test(lower, code));
  if (match) {return match.message;}

  if (context === 'signin') {return 'Sign in failed. Please try again.';}
  if (context === 'signup') {return 'Sign up failed. Please try again.';}
  return message || 'Request failed.';
}

async function requireSupabase() {
  const { supabase } = await import('../utils/supabase/client');
  if (!supabase) {
    throw new Error(
      'Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}

type VerificationRecord = {
  sanad_status?: string | null;
  document_status?: string | null;
  verification_level?: string | null;
  verification_timestamp?: string | null;
  failure_reason?: string | null;
  updated_at?: string | null;
};

function mergeVerificationIntoProfile(
  profile: Record<string, unknown> | null,
  verification: VerificationRecord | null,
): Record<string, unknown> | null {
  if (!profile && !verification) {
    return null;
  }

  if (!verification) {
    return profile;
  }

  const current = profile ?? {};
  const sanadVerified = verification.sanad_status === 'verified';
  const documentVerified = verification.document_status === 'verified';
  const verificationLevel =
    verification.verification_level ||
    (sanadVerified ? 'level_3' : documentVerified ? 'level_2' : 'level_0');

  return {
    ...current,
    sanad_verified: current.sanad_verified ?? sanadVerified,
    verified: current.verified ?? (sanadVerified || documentVerified),
    verification_level: current.verification_level ?? verificationLevel,
    verification_updated_at:
      current.verification_updated_at ??
      verification.updated_at ??
      verification.verification_timestamp ??
      null,
    verification_failure_reason:
      current.verification_failure_reason ?? verification.failure_reason ?? null,
  };
}

/**
 * Get a valid session, propagating any getSession error and refreshing if expired.
 */
async function getRefreshedSession() {
  const client = await requireSupabase();

  const { data: { session: initialSession }, error: sessionError } = await client.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }
  if (initialSession) {
    return initialSession;
  }

  const { data: { session: refreshedSession }, error: refreshError } = await client.auth.refreshSession();
  if (refreshError || !refreshedSession) {
    throw new Error('Session expired or invalid. Please log in again.');
  }

  return refreshedSession;
}

/**
 * Fetch wrapper that retries once with a refreshed token on 401.
 * Throws a typed error if the retry also returns 401.
 */
async function fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
  const response = await fetchWithRetry(url, options);

  if (response.status === 401) {
    const newSession = await getRefreshedSession();
    const existingHeaders = options.headers instanceof Headers
      ? Object.fromEntries((options.headers as Headers).entries())
      : (options.headers as Record<string, string> ?? {});
    const newOptions: RequestInit = {
      ...options,
      headers: { ...existingHeaders, Authorization: `Bearer ${newSession.access_token}` },
    };
    const retryResponse = await fetchWithRetry(url, newOptions);
    if (retryResponse.status === 401) {
      throw new Error('Session is no longer valid. Please sign in again.');
    }
    return retryResponse;
  }

  return response;
}

async function enrichProfileWithVerification(
  userId: string,
  profile: Record<string, unknown> | null,
) {
  try {
    const verification = await getDirectVerificationRecord(userId);
    return mergeVerificationIntoProfile(profile, verification);
  } catch {
    return profile;
  }
}

async function loadProfileViaFallback(userId: string) {
  try {
    const profile = (await getDirectProfile(userId)) as Record<string, unknown> | null;
    const enrichedProfile = await enrichProfileWithVerification(userId, profile);
    return { profile: enrichedProfile };
  } catch {
    const enrichedProfile = await enrichProfileWithVerification(userId, null);
    return { profile: enrichedProfile };
  }
}

export const authAPI = {
  async signUp(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    returnTo?: string;
  }) {
    const { email, password, firstName, lastName, phone, returnTo } = input;
    const client = await requireSupabase();
    const redirectTo = getAuthCallbackUrl(
      resolveAuthRedirectOrigin(),
      returnTo ? { returnTo } : undefined,
    );

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          ...(phone ? { phone } : {}),
        },
      },
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message, error.code, 'signup'));
    }

    return data;
  },

  async createProfile(
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    phone?: string,
  ) {
    const fullName = `${firstName} ${lastName}`.trim();
    const directUpdates: Record<string, unknown> = { email, full_name: fullName };
    if (phone) {directUpdates.phone_number = phone;}

    if (!hasConfiguredEdgeTransport('required')) {
      if (!getConfig().allowDirectSupabaseFallback) {
        throw getDirectFallbackError('Profile creation');
      }

      return updateDirectProfile(userId, directUpdates);
    }

    try {
      const session = await getRefreshedSession();
      const data = await requestEdgeJson<Record<string, unknown>>({
        path: '/v1/profile',
        method: 'POST',
        authMode: 'required',
        context: { token: session.access_token, userId: session.user.id },
        body: {
          userId,
          email,
          fullName,
          ...(phone ? { phone } : {}),
        },
        operation: 'Failed to create profile',
      });
      return data;
    } catch (error) {
      if (
        error instanceof BackendRequestError &&
        error.status === 404 &&
        getConfig().allowDirectSupabaseFallback
      ) {
        return updateDirectProfile(userId, directUpdates);
      }
      throw error instanceof Error ? error : new Error('Failed to create profile');
    }
  },

  async signIn(email: string, password: string) {
    const client = await requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      if (import.meta.env?.DEV) { // nosec CWE-117
        console.error('[auth.signIn]', error.status, error.code, error.message);
      }
      throw new Error(normalizeAuthError(error.message, error.code, 'signin'));
    }
    return data;
  },

  async signOut() {
    const client = await requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) {throw error;}
  },

  async getSession() {
    const client = await requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) {throw error;}
    return data;
  },

  async getProfile() {
    try {
      const context = await getAuthDetails();

      if (!hasConfiguredEdgeTransport('required')) {
        return loadProfileViaFallback(context.userId);
      }

      try {
        const data = await requestEdgeJson<Record<string, unknown>>({
          path: `/v1/profile/${context.userId}`,
          authMode: 'required',
          context,
          operation: 'Failed to load profile',
        });
        const enrichedProfile = await enrichProfileWithVerification(context.userId, data);
        return { profile: enrichedProfile };
      } catch (edgeError) {
        if (getConfig().allowDirectSupabaseFallback) {
          return loadProfileViaFallback(context.userId);
        }
        throw edgeError;
      }
    } catch (error) {
      // Only swallow not-found states; log real errors in DEV
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      const isNotFound =
        message.includes('not found') ||
        message.includes('no rows') ||
        message.includes('pgrst116');
      if (!isNotFound && import.meta.env?.DEV) {
        console.warn('[auth.getProfile] error:', error instanceof Error ? error.message : String(error));
      }
      return { profile: null };
    }
  },

  async updateProfile(updates: Record<string, unknown>) {
    try {
      const profile = await runBackendWorkflow({
        operation: 'Profile update',
        authMode: 'required',
        fallbackPolicy: 'writes-if-enabled',
        fallback: ({ userId }) => updateDirectProfile(userId ?? '', updates),
        edge: context =>
          requestEdgeJson<Record<string, unknown>>({
            path: `/v1/profile/${context.userId}`,
            method: 'PATCH',
            authMode: 'required',
            context,
            body: updates,
            operation: 'Failed to update profile',
          }),
      });
      return { success: true, profile };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : getDirectFallbackError('Profile update').message,
      };
    }
  },
};
