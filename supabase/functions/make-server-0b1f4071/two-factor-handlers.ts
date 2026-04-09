import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  generateBackupCodes,
  generateQRCode,
  generateTOTPSecret,
  hashBackupCode,
  hashBackupCodes,
  verifyTwoFactorChallenge,
} from './_shared/two-factor-runtime.ts';

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

export function createTwoFactorHandlers(runtime: TwoFactorRuntime) {
  async function handleTwoFactorSetup(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const label = auth.canonicalUser.email || auth.authUser.email || auth.canonicalUser.id;
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes(10);
    const backupCodeHashes = await hashBackupCodes(backupCodes);

    const { error } = await auth.admin
      .from('users')
      .update({
        two_factor_enabled: false,
        two_factor_secret: secret,
        two_factor_backup_codes: backupCodeHashes,
      })
      .eq('id', auth.canonicalUser.id);

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    return runtime.json({
      setup: {
        secret,
        qrCode: generateQRCode(secret, label),
        backupCodes,
      },
      pendingVerification: true,
    });
  }

  async function handleTwoFactorVerify(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const body = await readJsonBody(request);
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return runtime.json({ error: 'Verification code is required' }, 400);
    }

    const { data: userRow, error } = await auth.admin
      .from('users')
      .select('two_factor_secret, two_factor_backup_codes, two_factor_enabled')
      .eq('id', auth.canonicalUser.id)
      .single();

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    const result = await verifyTwoFactorChallenge({
      secret: userRow.two_factor_secret,
      code,
      backupCodeHashes: userRow.two_factor_backup_codes,
      allowBackupCode: false,
    });

    if (!result.ok) {
      return runtime.json({ valid: false }, 401);
    }

    const normalizedCodeHash = result.usedBackupCode ? await hashBackupCode(code) : null;
    const nextBackupCodes = result.usedBackupCode
      ? (userRow.two_factor_backup_codes ?? []).filter((hashed) => hashed !== normalizedCodeHash)
      : userRow.two_factor_backup_codes;

    const { error: updateError } = await auth.admin
      .from('users')
      .update({
        two_factor_enabled: true,
        two_factor_backup_codes: nextBackupCodes,
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

    const body = await readJsonBody(request);
    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!code) {
      return runtime.json({ error: 'Verification code is required' }, 400);
    }

    const { data: userRow, error } = await auth.admin
      .from('users')
      .select('two_factor_secret, two_factor_backup_codes')
      .eq('id', auth.canonicalUser.id)
      .single();

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    const result = await verifyTwoFactorChallenge({
      secret: userRow.two_factor_secret,
      code,
      backupCodeHashes: userRow.two_factor_backup_codes,
      allowBackupCode: true,
    });

    if (!result.ok) {
      return runtime.json({ valid: false }, 401);
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
