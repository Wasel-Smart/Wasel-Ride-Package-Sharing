import { API_URL, fetchWithRetry, getAuthDetails, supabase } from './core';
import {
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

function normalizeAuthError(message: string, context: 'signin' | 'signup' | 'generic'): string {
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('authentication failed') ||
    lower.includes('wrong email') ||
    lower.includes('wrong password')
  ) {
    return 'Incorrect email or password.';
  }

  if (lower.includes('email not confirmed')) {
    return 'Please confirm your email before signing in.';
  }

  if (
    lower.includes('already been registered') ||
    lower.includes('already registered') ||
    lower.includes('user already exists')
  ) {
    return 'This email is already registered.';
  }

  if (context === 'signin') return 'Sign in failed. Please try again.';
  if (context === 'signup') return 'Sign up failed. Please try again.';
  return message || 'Request failed.';
}

function requireSupabase() {
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
 * A helper to get a valid Supabase session, trying to refresh it if it's expired.
 * Throws an error if no valid session can be obtained.
 */
async function getRefreshedSession() {
  const client = requireSupabase();

  // First, try to get the current session.
  const { data: { session: initialSession } } = await client.auth.getSession();
  if (initialSession) {
    return initialSession;
  }

  // If no session, try to refresh it. This can happen on the first load after login.
  const { data: { session: refreshedSession }, error: refreshError } = await client.auth.refreshSession();

  if (refreshError || !refreshedSession) {
    throw new Error('Session expired or invalid. Please log in again.');
  }

  return refreshedSession;
}

/**
 * A wrapper for fetch that automatically handles token refresh on 401 errors.
 */
async function fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
  const response = await fetchWithRetry(url, options);

  if (response.status === 401) {
    const newSession = await getRefreshedSession();
    const existingHeaders = options.headers instanceof Headers
      ? Object.fromEntries((options.headers as Headers).entries())
      : (options.headers as Record<string, string> ?? {});
    const newOptions: RequestInit = { ...options, headers: { ...existingHeaders, Authorization: `Bearer ${newSession.access_token}` } };
    return fetchWithRetry(url, newOptions);
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
  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    returnTo?: string,
  ) {
    const client = requireSupabase();
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
          // Only include phone if it's a non-empty string
          ...(phone ? { phone } : {}),
        },
      },
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message, 'signup'));
    }

    return data;
  },

  async createProfile(userId: string, email: string, firstName: string, lastName: string) {
    if (!hasConfiguredEdgeTransport('required')) {
      if (!getConfig().allowDirectSupabaseFallback) {
        throw getDirectFallbackError('Profile creation');
      }

      return updateDirectProfile(userId, {
        email,
        full_name: `${firstName} ${lastName}`.trim(),
      });
    }

    try {
      const session = await getRefreshedSession();
      const response = await fetchWithAuth(`${API_URL}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          fullName: `${firstName} ${lastName}`.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to create profile: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw error instanceof Error ? error : new Error('Failed to create profile');
    }
  },

  async signIn(email: string, password: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      if (import.meta.env?.DEV) {
        console.error('[auth.signIn]', error.status, error.code, error.message);
      }
      throw new Error(normalizeAuthError(error.message, 'signin'));
    }
    return data;
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
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
      } catch {
        return loadProfileViaFallback(context.userId);
      }
    } catch {
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
