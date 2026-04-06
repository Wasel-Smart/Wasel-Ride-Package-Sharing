import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey, supabase } from './core';
import { getDirectProfile, getDirectVerificationRecord, updateDirectProfile } from './directSupabase';
import { getAuthCallbackUrl, getConfig } from '../utils/env';
import {
  buildTraceHeaders,
  profileUpdatePayloadSchema,
  withDataIntegrity,
} from './dataIntegrity';

function canUseEdgeApi(): boolean {
  return Boolean(API_URL && publicAnonKey);
}

function canUseDirectFallbackForWrites(): boolean {
  return getConfig().allowDirectSupabaseFallback;
}

function getDirectFallbackError(operation: string): Error {
  return new Error(`${operation} is temporarily unavailable while the secure backend is degraded. Please try again shortly.`);
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
    throw new Error('Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
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
  const verificationLevel = verification.verification_level
    || (sanadVerified ? 'level_3' : documentVerified ? 'level_2' : 'level_0');

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
    verification_failure_reason: current.verification_failure_reason ?? verification.failure_reason ?? null,
  };
}

async function enrichProfileWithVerification(userId: string, profile: Record<string, unknown> | null) {
  try {
    const verification = await getDirectVerificationRecord(userId);
    return mergeVerificationIntoProfile(profile, verification);
  } catch {
    return profile;
  }
}

export const authAPI = {
  async signUp(email: string, password: string, firstName: string, lastName: string, phone: string) {
    const client = requireSupabase();
    const redirectTo = getAuthCallbackUrl(
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          phone,
        },
      },
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message, 'signup'));
    }

    return data;
  },

  async createProfile(userId: string, email: string, firstName: string, lastName: string) {
    if (!canUseEdgeApi()) {
      if (!canUseDirectFallbackForWrites()) {
        throw getDirectFallbackError('Profile creation');
      }

      return updateDirectProfile(userId, {
        email,
        full_name: `${firstName} ${lastName}`.trim(),
      });
    }

    const client = requireSupabase();

    try {
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!session && attempts < maxAttempts) {
        const { data: { session: currentSession } } = await client.auth.getSession();
        if (currentSession) {
          session = currentSession;
          break;
        }

        attempts += 1;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!session) {
        throw new Error('Not authenticated - please try logging in again');
      }

      const response = await fetchWithRetry(`${API_URL}/profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          email,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));

        if (response.status === 401 && errorData.message?.includes('JWT')) {
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await client.auth.refreshSession();

          if (refreshError || !refreshedSession) {
            throw new Error('Session expired - please log in again');
          }

          const retryResponse = await fetchWithRetry(`${API_URL}/profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${refreshedSession.access_token}`,
            },
            body: JSON.stringify({
              userId,
              email,
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`.trim(),
            }),
          });

          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(retryErrorData.error || `Failed to create profile: ${retryResponse.status}`);
          }

          return await retryResponse.json();
        }

        throw new Error(errorData.error || `Failed to create profile: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('createProfile error:', error);
      }

      throw error;
    }
  },

  async signIn(email: string, password: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) throw new Error(normalizeAuthError(error.message, 'signin'));
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
    const { token, userId } = await getAuthDetails();
    if (!token || !userId) return { profile: null };

    if (!canUseEdgeApi()) {
      const profile = await getDirectProfile(userId);
      const enrichedProfile = await enrichProfileWithVerification(userId, profile as Record<string, unknown> | null);
      return { profile: enrichedProfile };
    }

    try {
      const response = await fetchWithRetry(
        `${API_URL}/profile/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!response.ok) {
        const profile = await getDirectProfile(userId).catch(() => null);
        const enrichedProfile = await enrichProfileWithVerification(userId, profile as Record<string, unknown> | null);
        return { profile: enrichedProfile };
      }

      const data = await response.json();
      const enrichedProfile = await enrichProfileWithVerification(
        userId,
        data as Record<string, unknown>,
      );
      return { profile: enrichedProfile };
    } catch {
      const profile = await getDirectProfile(userId).catch(() => null);
      const enrichedProfile = await enrichProfileWithVerification(userId, profile as Record<string, unknown> | null);
      return { profile: enrichedProfile };
    }
  },

  async updateProfile(updates: Record<string, unknown>) {
    try {
      return await withDataIntegrity({
        operation: 'profile.update.api',
        schema: profileUpdatePayloadSchema,
        payload: updates,
        execute: async ({ requestId, payload }) => {
          const { token, userId } = await getAuthDetails();
          if (!token || !userId) {
            throw new Error('Not authenticated');
          }

          if (!canUseEdgeApi()) {
            if (!canUseDirectFallbackForWrites()) {
              throw getDirectFallbackError('Profile update');
            }

            const profile = await updateDirectProfile(userId, payload);
            return { success: true, profile };
          }

          let response: Response;
          try {
            response = await fetchWithRetry(`${API_URL}/profile/${userId}`, {
              method: 'PATCH',
              headers: buildTraceHeaders(requestId, {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              }),
              body: JSON.stringify(payload),
            });
          } catch (networkError) {
            if (!canUseDirectFallbackForWrites()) {
              throw networkError;
            }

            const profile = await updateDirectProfile(userId, payload);
            return { success: true, profile };
          }

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
            if (!canUseDirectFallbackForWrites()) {
              console.error('[authAPI.updateProfile] Server error:', response.status, errorData, requestId);
              return {
                success: false,
                error: errorData.error || getDirectFallbackError('Profile update').message,
              };
            }

            try {
              const profile = await updateDirectProfile(userId, payload);
              return { success: true, profile };
            } catch (fallbackError) {
              console.error('[authAPI.updateProfile] Server error:', response.status, errorData, requestId);
              return {
                success: false,
                error:
                  fallbackError instanceof Error
                    ? fallbackError.message
                    : errorData.error || `Failed to update profile: ${response.status}`,
              };
            }
          }

          const data = await response.json();
          return { success: true, profile: data };
        },
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error updating profile',
      };
    }
  },
};
