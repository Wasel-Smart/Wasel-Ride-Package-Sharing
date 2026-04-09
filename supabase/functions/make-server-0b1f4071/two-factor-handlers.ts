import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildOtpAuthUrl,
  generateBackupCodes,
  generateTOTPSecret,
  hashBackupCodes,
  verifyTwoFactorChallenge,
} from './_shared/two-factor-runtime.ts';
import { getClientIp, takeRateLimitToken } from './_shared/security-runtime.ts';

interface CanonicalUser {
  id: string;
  email?: string | null;
}

type AuthenticatedRequest = {
  admin: SupabaseClient;
  authUser: User;
  canonicalUser: CanonicalUser;
};

type AuthenticationResult = AuthenticatedRequest | { error: Response };

interface TwoFactorRuntime {
  authenticateRequest: (request: Request) => Promise<AuthenticationResult>;
  json: (data: unknown, status?: number) => Response;
}

function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  return request.json()
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}))
    .catch(() => ({}));
}

const TWO_FACTOR_VERIFY_RATE_LIMIT = { maxRequests: 8, windowMs: 10 * 60_000 };
const TWO_FACTOR_SETUP_RATE_LIMIT = { maxRequests: 5, windowMs: 10 * 60_000 };
const MAX_TWO_FACTOR_FAILURES = 5;
const TWO_FACTOR_LOCK_WINDOW_MS = 10 * 60_000;

function buildRateLimitKey(request: Request, auth: AuthenticatedRequest, action: string): string {
  return ['2fa', action, auth.canonicalUser.id, getClientIp(request)].join(':');
}

function validateAuthenticatorCode(code: string, allowBackupCode: boolean): string {
  const normalized = code.trim().replace(/\s+/g, '').toUpperCase();
  if (/^\d{6}$/.test(normalized)) {
    return normalized;
  }

  if (allowBackupCode && /^[A-Z0-9]{8}$/.test(normalized)) {
    return normalized;
  }

  throw new Error('A valid authenticator code is required');
}

async function getTwoFactorState(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .schema('private')
    .from('user_two_factor_secrets')
    .select('user_id, totp_secret, backup_code_hashes, failed_attempts, locked_until')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

async function recordTwoFactorFailure(admin: SupabaseClient, userId: string, nextFailures: number) {
  const now = Date.now();
  const { error } = await admin
    .schema('private')
    .from('user_two_factor_secrets')
    .update({
      failed_attempts: nextFailures,
      locked_until: nextFailures >= MAX_TWO_FACTOR_FAILURES
        ? new Date(now + TWO_FACTOR_LOCK_WINDOW_MS).toISOString()
        : null,
      last_challenge_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw new Error(error.message);
  }
}

export function createTwoFactorHandlers(runtime: TwoFactorRuntime) {
  async function handleTwoFactorSetup(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;
    if (!takeRateLimitToken({
      key: buildRateLimitKey(request, auth, 'setup'),
      ...TWO_FACTOR_SETUP_RATE_LIMIT,
    })) {
      return runtime.json({ error: 'Too many setup attempts. Please wait and try again.' }, 429);
    }

    const label = auth.canonicalUser.email || auth.authUser.email || auth.canonicalUser.id;
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes(10);
    const backupCodeHashes = await hashBackupCodes(backupCodes);

    const now = new Date().toISOString();
    const { error: secretError } = await auth.admin
      .schema('private')
      .from('user_two_factor_secrets')
      .upsert({
        user_id: auth.canonicalUser.id,
        totp_secret: secret,
        backup_code_hashes: backupCodeHashes,
        failed_attempts: 0,
        locked_until: null,
        verified_at: null,
        last_challenge_at: null,
        created_at: now,
        updated_at: now,
      }, { onConflict: 'user_id' });

    if (secretError) {
      return runtime.json({ error: 'Two-factor setup could not be started.' }, 500);
    }

    const { error: userError } = await auth.admin
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
      })
      .eq('id', auth.canonicalUser.id);

    if (userError) {
      return runtime.json({ error: 'Two-factor setup could not be started.' }, 500);
    }

    return runtime.json({
      setup: {
        secret,
        otpauthUrl: buildOtpAuthUrl(secret, label),
        backupCodes,
      },
      pendingVerification: true,
    });
  }

  async function handleTwoFactorVerify(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;
    if (!takeRateLimitToken({
      key: buildRateLimitKey(request, auth, 'verify'),
      ...TWO_FACTOR_VERIFY_RATE_LIMIT,
    })) {
      return runtime.json({ valid: false, error: 'Too many verification attempts. Please wait and try again.' }, 429);
    }

    const body = await readJsonBody(request);
    let code = '';
    try {
      code = validateAuthenticatorCode(typeof body.code === 'string' ? body.code : '', false);
    } catch {
      return runtime.json({ error: 'A valid authenticator code is required' }, 400);
    }

    const factorState = await getTwoFactorState(auth.admin, auth.canonicalUser.id);
    if (!factorState?.totp_secret) {
      return runtime.json({ error: 'Two-factor authentication has not been set up yet.' }, 400);
    }
    if (factorState.locked_until && new Date(factorState.locked_until).getTime() > Date.now()) {
      return runtime.json({ valid: false, error: 'Too many verification attempts. Please wait and try again.' }, 429);
    }

    const result = await verifyTwoFactorChallenge({
      secret: factorState.totp_secret,
      code,
      backupCodeHashes: factorState.backup_code_hashes,
      allowBackupCode: false,
    });

    if (!result.ok) {
      await recordTwoFactorFailure(auth.admin, auth.canonicalUser.id, Number(factorState.failed_attempts ?? 0) + 1);
      return runtime.json({ valid: false }, 401);
    }

    const { error: factorUpdateError } = await auth.admin
      .schema('private')
      .from('user_two_factor_secrets')
      .update({
        failed_attempts: 0,
        locked_until: null,
        verified_at: new Date().toISOString(),
        last_challenge_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', auth.canonicalUser.id);

    if (factorUpdateError) {
      return runtime.json({ error: 'Two-factor verification could not be completed.' }, 500);
    }

    const { error: updateError } = await auth.admin
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_secret: null,
        two_factor_backup_codes: null,
      })
      .eq('id', auth.canonicalUser.id);

    if (updateError) {
      return runtime.json({ error: updateError.message }, 500);
    }

    return runtime.json({
      valid: true,
      enabled: true,
      usedBackupCode: result.usedBackupCode,
    });
  }

  async function handleTwoFactorDisable(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;
    if (!takeRateLimitToken({
      key: buildRateLimitKey(request, auth, 'disable'),
      ...TWO_FACTOR_VERIFY_RATE_LIMIT,
    })) {
      return runtime.json({ disabled: false, error: 'Too many verification attempts. Please wait and try again.' }, 429);
    }

    const body = await readJsonBody(request);
    let code = '';
    try {
      code = validateAuthenticatorCode(typeof body.code === 'string' ? body.code : '', true);
    } catch {
      return runtime.json({ error: 'A valid authenticator or backup code is required' }, 400);
    }

    const factorState = await getTwoFactorState(auth.admin, auth.canonicalUser.id);
    if (!factorState?.totp_secret) {
      return runtime.json({ disabled: true });
    }
    if (factorState.locked_until && new Date(factorState.locked_until).getTime() > Date.now()) {
      return runtime.json({ disabled: false, error: 'Too many verification attempts. Please wait and try again.' }, 429);
    }

    const result = await verifyTwoFactorChallenge({
      secret: factorState.totp_secret,
      code,
      backupCodeHashes: factorState.backup_code_hashes,
      allowBackupCode: true,
    });

    if (!result.ok) {
      await recordTwoFactorFailure(auth.admin, auth.canonicalUser.id, Number(factorState.failed_attempts ?? 0) + 1);
      return runtime.json({ valid: false }, 401);
    }

    const { error: secretDeleteError } = await auth.admin
      .schema('private')
      .from('user_two_factor_secrets')
      .delete()
      .eq('user_id', auth.canonicalUser.id);

    if (secretDeleteError) {
      return runtime.json({ error: 'Two-factor settings could not be removed.' }, 500);
    }

    const { error: updateError } = await auth.admin
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: null,
        two_factor_backup_codes: null,
      })
      .eq('id', auth.canonicalUser.id);

    if (updateError) {
      return runtime.json({ error: updateError.message }, 500);
    }

    return runtime.json({ disabled: true });
  }

  return {
    handleTwoFactorSetup,
    handleTwoFactorVerify,
    handleTwoFactorDisable,
  };
}
