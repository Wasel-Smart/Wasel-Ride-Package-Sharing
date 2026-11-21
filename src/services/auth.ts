import { getAuthDetails } from './core';
import {
  hasConfiguredEdgeTransport,
  requestEdgeJson,
  runBackendWorkflow,
} from './backendWorkflow';
import { getAuthCallbackUrl, resolveAuthRedirectOrigin } from '../utils/env';
import { isUsingLegacySupabaseKey, supabase } from '../utils/supabase/client';

// Shapes that must never reach the UI, even when the upstream error text is
// passed through verbatim instead of being replaced by a fixed message.
const AUTH_ERROR_SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+/gi, '[redacted-key]'],
  [/\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]*/g, '[redacted-jwt]'],
  [/\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9_-]+/gi, '[redacted-key]'],
  [/\b[A-Za-z0-9._%+-]+:[^\s/@]+@[A-Za-z0-9.-]+\b/g, '[redacted-credential]'],
  [/\bey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[redacted-secret]'],
];

const AUTH_ERROR_MAX_LENGTH = 200;

/**
 * Make an upstream error string safe to render in the sign-in banner.
 *
 * Auth errors are the one place where the original text carries diagnostic
 * value, so it is preserved — but only after anything that looks like a
 * credential, key, or connection string has been stripped. Control characters
 * and over-long text are dropped so the banner stays single-line and bounded.
 */
export function redactAuthErrorText(message: string | undefined): string {
  if (!message) {return '';}

  let out = String(message);
  for (const [pattern, replacement] of AUTH_ERROR_SECRET_PATTERNS) {
    out = out.replace(pattern, replacement);
  }

  return out
    .replace(/[^\x20-\x7e]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, AUTH_ERROR_MAX_LENGTH);
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
      code === 'over_request_rate_limit' ||
      code === 'over_email_send_rate_limit' ||
      lower.includes('too many requests') ||
      lower.includes('rate limit'),
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
  {
    // Network failures and CSP-blocked requests both surface as "Failed to fetch".
    test: (lower) =>
      lower.includes('failed to fetch') ||
      lower.includes('load failed') ||
      lower.includes('networkerror') ||
      lower.includes('network request failed'),
    message: 'Cannot reach the sign-in service. Check your connection and try again.',
  },
  {
    // Supabase disabled the legacy anon/service_role JWT keys project-wide. The
    // API answers 401 with this text for every request made with one, so it is
    // a deployment/configuration fault, not a bad password.
    test: (lower, code) =>
      lower.includes('legacy api keys are disabled') ||
      lower.includes('legacy api key') ||
      code === 'legacy_api_key_disabled',
    message:
      'Sign-in service is misconfigured (legacy API key rejected). Please contact support.',
  },
  {
    test: (lower, code) =>
      code === 'invalid_api_key' ||
      code === 'bad_api_key' ||
      lower.includes('invalid api key'),
    message: 'Sign-in service is misconfigured (invalid API key). Please contact support.',
  },
  {
    // CORS preflight rejection: Supabase only echoes the headers its edge
    // function allows. An injected tracing header turns every call into a
    // hard network failure, which the browser reports as "Failed to fetch".
    test: (lower) =>
      lower.includes('access-control-request-headers') ||
      lower.includes('not allowed by access-control-allow-headers'),
    message: 'Sign-in request was blocked by the network policy. Please contact support.',
  },
  {
    // Supabase Auth has captcha enabled but the app sent no token.
    // This means captcha is on in the Dashboard but not wired in the UI.
    // Fix: disable captcha in Supabase Dashboard > Auth > Security.
    test: (lower, code) =>
      code === 'captcha_failed' ||
      lower.includes('captcha protection') ||
      lower.includes('no captcha_token') ||
      lower.includes('captcha verification failed'),
    message: 'Sign-in is temporarily unavailable. Please contact support.',
  },
];

/**
 * Map a raw Supabase/auth error onto a user-facing message.
 *
 * Deliberately does NOT collapse unmatched errors into a generic "Sign in
 * failed" string: doing so destroyed the actual cause (e.g. "Legacy API keys
 * are disabled") and made production misconfiguration undiagnosable. Unmatched
 * errors now keep their own text, which Supabase phrases in user-safe terms.
 * This message is rendered in the sign-in banner, so it must never carry a
 * key, token, or URL — `redactAuthErrorText` strips those first.
 */
function normalizeAuthError(
  message: string,
  code: string | undefined,
  _context: 'signin' | 'signup' | 'generic',
): string {
  const lower = message.toLowerCase();

  const match = ERROR_RULES.find(rule => rule.test(lower, code));
  if (match) {return match.message;}

  return redactAuthErrorText(message) || 'Request failed. Please try again.';
}

async function requireSupabase() {
  if (!supabase) {
    if (isUsingLegacySupabaseKey) {
      throw new Error(
        'Supabase sign-in service is misconfigured: the build is using a legacy API key that Supabase has disabled. Please contact support.',
      );
    }
    throw new Error(
      'Supabase auth is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}

type VerificationRecord = {
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
  const documentVerified = verification.document_status === 'verified';
  const verificationLevel =
    verification.verification_level ||
    (documentVerified ? 'level_2' : 'level_0');

  return {
    ...current,
    verified: current.verified ?? documentVerified,
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

async function enrichProfileWithVerification(
  userId: string,
  profile: Record<string, unknown> | null,
) {
  try {
    const { getDirectVerificationRecord } = await import('./directSupabase');
    const verification = await getDirectVerificationRecord(userId);
    return mergeVerificationIntoProfile(profile, verification);
  } catch {
    return profile;
  }
}

async function loadProfileViaFallback(userId: string) {
  try {
    const { getDirectProfile } = await import('./directSupabase');
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

    // With email confirmation enabled, Supabase does NOT return an error for an
    // already-registered email (anti-enumeration). It returns a placeholder user
    // with an empty `identities` array and sends no email, so the UI would say
    // "check your inbox" forever. Surface it as an explicit error instead.
    if (data?.user?.identities?.length === 0) {
      throw new Error('This email is already registered.');
    }

    return data;
  },

  async createProfile(input: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }) {
    const { userId, email, firstName, lastName, phone } = input;
    const fullName = `${firstName} ${lastName}`.trim();
    const directUpdates: Record<string, unknown> = { email, full_name: fullName };
    if (phone) {directUpdates.phone_number = phone;}

    // Profile creation is idempotent and non-sensitive — always allow the
    // direct-Supabase path as a fallback so new sign-ups never get a null
    // profile regardless of edge function availability.
    if (!hasConfiguredEdgeTransport('required')) {
      const { updateDirectProfile } = await import('./directSupabase');
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
    } catch {
      // Edge function unavailable or returned an error — fall back to direct
      // Supabase unconditionally so sign-up always produces a valid profile.
      const { updateDirectProfile } = await import('./directSupabase');
      return updateDirectProfile(userId, directUpdates);
    }
  },

  async signIn(email: string, password: string) {
    const client = await requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });

    if (error) {
      if (import.meta.env?.DEV) { // nosec CWE-117
        console.error('[auth.signIn]', error.status, error.code, String(error.message).replace(/[\r\n]/g, ' '));
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
      } catch {
        // Edge function unavailable — always fall back to direct Supabase
        // so signed-in users always get their profile loaded.
        return loadProfileViaFallback(context.userId);
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
        fallbackPolicy: 'always',
        operationType: 'write',
        fallback: async ({ userId }) => {
          const { updateDirectProfile } = await import('./directSupabase');
          return updateDirectProfile(userId ?? '', updates);
        },
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
        error: error instanceof Error ? error.message : 'Profile update failed.',
      };
    }
  },
};
