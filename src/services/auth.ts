import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey, supabase } from './core';
import { getDirectProfile, getDirectVerificationRecord, updateDirectProfile } from './directSupabase';
import { getAuthRedirectCandidates, getConfig } from '../utils/env';
import { friendlyAuthError } from '../utils/authHelpers';
import {
  buildTraceHeaders,
  profileUpdatePayloadSchema,
  withDataIntegrity,
} from './dataIntegrity';
import {
  expectJsonResponse,
  sanitizeEmail,
  sanitizeOptionalTextField,
  sanitizePhoneNumber,
  sanitizeTextField,
  withApiTelemetry,
} from './http';
import { ValidationError } from '../utils/errors';
import { checkRateLimit } from '../utils/security';

const AUTH_RATE_LIMITS = {
  signIn:  { maxRequests: 10, windowMs: 60_000 },
  signUp:  { maxRequests: 5,  windowMs: 60_000 },
  reset:   { maxRequests: 3,  windowMs: 60_000 },
  resend:  { maxRequests: 3,  windowMs: 60_000 },
} as const;

function getClientKey(prefix: string): string {
  // Use a stable per-session key so the limit is per-browser-tab, not global
  const sessionId =
    typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('wasel-session-id') ?? (() => {
          const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          try { sessionStorage.setItem('wasel-session-id', id); } catch { /* ignore */ }
          return id;
        })())
      : 'default';
  return `${prefix}:${sessionId}`;
}

function canUseEdgeApi(): boolean {
  return Boolean(API_URL && publicAnonKey);
}

function canUseDirectFallbackForWrites(): boolean {
  return getConfig().allowDirectSupabaseFallback;
}

function getDirectFallbackError(operation: string): Error {
  return new Error(`${operation} is temporarily unavailable while the secure backend is degraded. Please try again shortly.`);
}

export function normalizeAuthError(
  message: string,
  context: 'signin' | 'signup' | 'generic',
): string {
  return friendlyAuthError(
    message,
    context === 'signin'
      ? 'Sign in failed. Please try again.'
      : context === 'signup'
        ? 'Sign up failed. Please try again.'
        : 'Request failed.',
  );
}

function normalizeAuthException(
  error: unknown,
  context: 'signin' | 'signup' | 'generic',
): Error {
  const message =
    error instanceof Error ? error.message : typeof error === 'string' ? error : '';

  return new Error(
    normalizeAuthError(
      message || (context === 'signup' ? 'Sign up failed.' : 'Sign in failed.'),
      context,
    ),
  );
}

function normalizeEmailInput(email: string): string {
  return email.trim().toLowerCase();
}

function isDuplicateSupabaseSignupResult(data: {
  user?: { identities?: Array<unknown> | null } | null;
  session?: unknown;
}): boolean {
  return Boolean(
    data.user &&
      !data.session &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0,
  );
}

function shouldRetryAuthRedirect(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : typeof error === 'string'
        ? error.toLowerCase()
        : '';

  return (
    message.includes('redirect') ||
    message.includes('redirectto') ||
    message.includes('callback') ||
    message.includes('not allowed') ||
    message.includes('allow list') ||
    message.includes('whitelist') ||
    message.includes('url')
  );
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

async function safeGetDirectProfile(userId: string): Promise<Record<string, unknown> | null> {
  try {
    const profile = await getDirectProfile(userId);
    return (profile as Record<string, unknown> | null) ?? null;
  } catch {
    return null;
  }
}

export const authAPI = {
  async signUp(email: string, password: string, firstName: string, lastName: string, phone?: string) {
    if (!checkRateLimit(getClientKey('auth:signup'), AUTH_RATE_LIMITS.signUp)) {
      throw new ValidationError('Too many sign-up attempts. Please wait a minute and try again.');
    }
    const client = requireSupabase();
    const sanitizedEmail = sanitizeEmail(normalizeEmailInput(email));
    const sanitizedFirstName = sanitizeTextField(firstName, 'First name', 80);
    const sanitizedLastName = sanitizeTextField(lastName, 'Last name', 80);
    const sanitizedPhone =
      typeof phone === 'string' && phone.trim().length > 0
        ? sanitizePhoneNumber(phone)
        : undefined;

    if (password.trim().length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    const redirectCandidates = getAuthRedirectCandidates(
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );
    let lastError: Error | null = null;

    for (const redirectTo of redirectCandidates) {
      try {
        const { data, error } = await client.auth.signUp({
          email: sanitizedEmail,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: `${sanitizedFirstName} ${sanitizedLastName}`.trim(),
              ...(sanitizedPhone ? { phone: sanitizedPhone } : {}),
            },
          },
        });

        if (error) {
          lastError = new Error(normalizeAuthError(error.message, 'signup'));
          if (!shouldRetryAuthRedirect(error)) {
            throw lastError;
          }
          continue;
        }

        if (isDuplicateSupabaseSignupResult(data)) {
          throw new Error(
            'An account with this email already exists. Sign in instead, or reset your password if you need access.',
          );
        }

        return data;
      } catch (error) {
        lastError = normalizeAuthException(error, 'signup');
        if (!shouldRetryAuthRedirect(error)) {
          throw lastError;
        }
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Sign up failed. Please try again.');
  },

  async resendSignupConfirmation(email: string) {
    if (!checkRateLimit(getClientKey('auth:resend'), AUTH_RATE_LIMITS.resend)) {
      throw new ValidationError('Too many resend attempts. Please wait a minute and try again.');
    }
    const client = requireSupabase();
    const sanitizedEmail = sanitizeEmail(normalizeEmailInput(email));
    const redirectCandidates = getAuthRedirectCandidates(
      typeof window !== 'undefined' ? window.location.origin : undefined,
    );
    let lastError: Error | null = null;

    for (const redirectTo of redirectCandidates) {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: sanitizedEmail,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (!error) {
        return { success: true };
      }

      lastError = new Error(normalizeAuthError(error.message, 'signup'));
      if (!shouldRetryAuthRedirect(error)) {
        throw lastError;
      }
    }

    if (lastError) {
      throw lastError;
    }

    throw new Error('Confirmation email could not be sent. Please try again.');
  },

  async createProfile(userId: string, email: string, firstName: string, lastName: string) {
    const sanitizedEmail = sanitizeEmail(email);
    const sanitizedFirstName = sanitizeTextField(firstName, 'First name', 80);
    const sanitizedLastName = sanitizeTextField(lastName, 'Last name', 80);

    if (!canUseEdgeApi()) {
      if (!canUseDirectFallbackForWrites()) {
        throw getDirectFallbackError('Profile creation');
      }

      return updateDirectProfile(userId, {
        email: sanitizedEmail,
        full_name: `${sanitizedFirstName} ${sanitizedLastName}`.trim(),
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

      const response = await withApiTelemetry(
        'profile.create',
        `${API_URL}/profile`,
        'POST',
        () =>
          fetchWithRetry(`${API_URL}/profile`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              userId,
              email: sanitizedEmail,
              firstName: sanitizedFirstName,
              lastName: sanitizedLastName,
              fullName: `${sanitizedFirstName} ${sanitizedLastName}`.trim(),
            }),
          }),
      );

      if (!response.ok) {
        const createProfileError = await expectJsonResponse<never>(
          response,
          `Failed to create profile: ${response.status}`,
          { operation: 'profile.create' },
        ).catch((error) => error);

        if (response.status === 401 && createProfileError instanceof Error && createProfileError.message.includes('JWT')) {
          const {
            data: { session: refreshedSession },
            error: refreshError,
          } = await client.auth.refreshSession();

          if (refreshError || !refreshedSession) {
            throw new Error('Session expired - please log in again');
          }

          const retryResponse = await withApiTelemetry(
            'profile.create.retry',
            `${API_URL}/profile`,
            'POST',
            () =>
              fetchWithRetry(`${API_URL}/profile`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${refreshedSession.access_token}`,
                },
                body: JSON.stringify({
                  userId,
                  email: sanitizedEmail,
                  firstName: sanitizedFirstName,
                  lastName: sanitizedLastName,
                  fullName: `${sanitizedFirstName} ${sanitizedLastName}`.trim(),
                }),
              }),
          );

          return expectJsonResponse(retryResponse, `Failed to create profile: ${retryResponse.status}`, {
            operation: 'profile.create.retry',
          });
        }

        throw createProfileError;
      }

      return await expectJsonResponse(response, `Failed to create profile: ${response.status}`, {
        operation: 'profile.create',
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('createProfile error:', error);
      }

      throw error;
    }
  },

  async signIn(email: string, password: string) {
    if (!checkRateLimit(getClientKey('auth:signin'), AUTH_RATE_LIMITS.signIn)) {
      throw new ValidationError('Too many sign-in attempts. Please wait a minute and try again.');
    }
    const client = requireSupabase();
    const sanitizedEmail = sanitizeEmail(normalizeEmailInput(email));

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) throw new Error(normalizeAuthError(error.message, 'signin'));
      return data;
    } catch (error) {
      throw normalizeAuthException(error, 'signin');
    }
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
      const endpoint = `${API_URL}/profile/${userId}`;
      const response = await withApiTelemetry(
        'profile.get',
        endpoint,
        'GET',
        () =>
          fetchWithRetry(
            endpoint,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
      );

      if (!response.ok) {
        const profile = await safeGetDirectProfile(userId);
        const enrichedProfile = await enrichProfileWithVerification(userId, profile);
        return { profile: enrichedProfile };
      }

      const data =
        (typeof response.json === 'function'
          ? await response.json().catch(() => null)
          : null) ??
        await expectJsonResponse<Record<string, unknown>>(response, 'Failed to load profile', {
          operation: 'profile.get',
        });
      const enrichedProfile = await enrichProfileWithVerification(
        userId,
        data as Record<string, unknown>,
      );
      return { profile: enrichedProfile };
    } catch {
      const profile = await safeGetDirectProfile(userId);
      const enrichedProfile = await enrichProfileWithVerification(userId, profile);
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

          const sanitizedPayload = {
            ...payload,
            ...(typeof payload.email === 'string' ? { email: sanitizeEmail(payload.email) } : {}),
            ...(typeof payload.full_name === 'string'
              ? { full_name: sanitizeTextField(payload.full_name, 'Full name', 120) }
              : {}),
            ...(typeof payload.phone_number === 'string'
              ? { phone_number: sanitizePhoneNumber(payload.phone_number) }
              : {}),
            ...(typeof payload.phone === 'string'
              ? { phone: sanitizePhoneNumber(payload.phone) }
              : {}),
            ...(typeof payload.role === 'string'
              ? { role: sanitizeTextField(payload.role, 'Role', 32) }
              : {}),
            ...(typeof payload.verification_level === 'string'
              ? { verification_level: sanitizeTextField(payload.verification_level, 'Verification level', 32) }
              : {}),
            ...(typeof payload.avatar_url === 'string'
              ? { avatar_url: sanitizeOptionalTextField(payload.avatar_url, 500) }
              : {}),
          };

          if (!canUseEdgeApi()) {
            if (!canUseDirectFallbackForWrites()) {
              throw getDirectFallbackError('Profile update');
            }

            const profile = await updateDirectProfile(userId, sanitizedPayload);
            return { success: true, profile };
          }

          let response: Response;
          try {
            response = await withApiTelemetry(
              'profile.update',
              `${API_URL}/profile/${userId}`,
              'PATCH',
              () =>
                fetchWithRetry(`${API_URL}/profile/${userId}`, {
                  method: 'PATCH',
                  headers: buildTraceHeaders(requestId, {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  }),
                  body: JSON.stringify(sanitizedPayload),
                }),
            );
          } catch (networkError) {
            if (!canUseDirectFallbackForWrites()) {
              throw networkError;
            }

            const profile = await updateDirectProfile(userId, sanitizedPayload);
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
              const profile = await updateDirectProfile(userId, sanitizedPayload);
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

          const data = await expectJsonResponse<Record<string, unknown>>(response, 'Failed to update profile', {
            operation: 'profile.update',
            requestId,
          });
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
