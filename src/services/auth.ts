import type { AuthChangeEvent } from '@supabase/supabase-js';

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
import { getAuthCallbackUrl, getConfig } from '../utils/env';

export interface AuthRecoverySubscription {
  unsubscribe: () => void;
}

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
    lower.includes('captcha') ||
    lower.includes('request disallowed') ||
    lower.includes('account protection')
  ) {
    return 'Authentication is blocked by account protection settings.';
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

function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

function normalizePhoneInput(phone: string): string {
  const compact = phone.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+962${compact.slice(1)}`;
  return compact;
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
  const profile = (await getDirectProfile(userId).catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const enrichedProfile = await enrichProfileWithVerification(
    userId,
    profile as Record<string, unknown> | null,
  );
  return { profile: enrichedProfile };
}

export const authAPI = {
  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    returnTo?: string,
    captchaToken?: string,
  ) {
    const client = requireSupabase();
    const redirectTo = getAuthCallbackUrl(
      typeof window !== 'undefined' ? window.location.origin : undefined,
      returnTo ? { returnTo } : undefined,
    );

    const normalizedEmail = normalizeEmailInput(email);
    const normalizedPhone = normalizePhoneInput(phone ?? '');

    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: redirectTo,
        captchaToken,
        data: {
          full_name: `${firstName} ${lastName}`.trim(),
          ...(normalizedPhone ? { phone: normalizedPhone } : {}),
        },
      },
    });

    if (error) {
      throw new Error(normalizeAuthError(error.message, 'signup'));
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
    const normalizedPhone = phone?.trim();

    if (!hasConfiguredEdgeTransport('required')) {
      if (!getConfig().allowDirectSupabaseFallback) {
        throw getDirectFallbackError('Profile creation');
      }

      return updateDirectProfile(userId, {
        email,
        full_name: fullName,
        ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
      });
    }

    const client = requireSupabase();

    try {
      let session = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!session && attempts < maxAttempts) {
        const {
          data: { session: currentSession },
        } = await client.auth.getSession();
        if (currentSession) {
          session = currentSession;
          break;
        }

        attempts += 1;
        await new Promise(resolve => setTimeout(resolve, 500));
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
          fullName,
          ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
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
              fullName,
              ...(normalizedPhone ? { phone_number: normalizedPhone } : {}),
            }),
          });

          if (!retryResponse.ok) {
            const retryErrorData = await retryResponse
              .json()
              .catch(() => ({ error: 'Unknown error' }));
            throw new Error(
              retryErrorData.error || `Failed to create profile: ${retryResponse.status}`,
            );
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

  async signIn(email: string, password: string, captchaToken?: string) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizeEmailInput(email),
      password,
      options: { captchaToken },
    });

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
    try {
      const context = await getAuthDetails();

      if (!hasConfiguredEdgeTransport('required')) {
        return loadProfileViaFallback(context.userId);
      }

      try {
        const data = await requestEdgeJson<Record<string, unknown>>({
          path: `/profile/${context.userId}`,
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
        fallback: ({ userId }) => updateDirectProfile(userId!, updates),
        edge: context =>
          requestEdgeJson<Record<string, unknown>>({
            path: `/profile/${context.userId}`,
            method: 'PATCH',
            authMode: 'required',
            context,
            body: updates,
            operation: 'Failed to update profile',
          }),
      });
      return { success: true, profile };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[authAPI.updateProfile] Error:', error);
      }
      return {
        success: false,
        error:
          error instanceof Error ? error.message : getDirectFallbackError('Profile update').message,
      };
    }
  },
};

export function subscribeToPasswordRecovery(onRecovery: () => void): AuthRecoverySubscription {
  const client = requireSupabase();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event: AuthChangeEvent) => {
    if (event === 'PASSWORD_RECOVERY') {
      onRecovery();
    }
  });

  return subscription;
}

export async function completeAuthCallbackSession(): Promise<void> {
  const client = requireSupabase();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();

  if (error) {
    throw error;
  }

  if (!session) {
    throw new Error('Authentication session could not be established.');
  }
}

export async function updateRecoveredPassword(password: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  await client.auth.signOut().catch(() => undefined);
}
