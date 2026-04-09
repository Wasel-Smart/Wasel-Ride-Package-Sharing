import { describe, expect, it } from 'vitest';

import {
  buildOtpAuthUrl,
  generateBackupCodes,
  generateTOTPSecret,
  hashBackupCode,
  hashBackupCodes,
  sanitizeAuthenticatorCode,
  verifyBackupCode,
  verifyTwoFactorChallenge,
} from '../../../supabase/functions/make-server-0b1f4071/_shared/two-factor-runtime';

describe('two-factor runtime helpers', () => {
  it('generates a base32 secret and otpauth url', () => {
    const secret = generateTOTPSecret();
    const otpauthUrl = buildOtpAuthUrl(secret, 'user@example.com');

    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(otpauthUrl).toContain('otpauth://totp/');
  });

  it('creates distinct backup codes and hashes them', async () => {
    const codes = generateBackupCodes(5);
    const hashes = await hashBackupCodes(codes);

    expect(new Set(codes).size).toBe(codes.length);
    expect(hashes).toHaveLength(5);
    expect(hashes[0]).not.toBe(codes[0]);
  });

  it('sanitizes and verifies backup codes case-insensitively', async () => {
    const hash = await hashBackupCode('ab12cd34');

    expect(sanitizeAuthenticatorCode(' 123 456 ')).toBe('123456');
    await expect(verifyBackupCode('AB12CD34', [hash])).resolves.toBe(true);
    await expect(verifyBackupCode('ZZ99ZZ99', [hash])).resolves.toBe(false);
  });

  it('accepts a hashed backup code challenge when totp does not match', async () => {
    const backupHash = await hashBackupCode('AB12CD34');

    await expect(verifyTwoFactorChallenge({
      secret: generateTOTPSecret(),
      code: 'AB12CD34',
      backupCodeHashes: [backupHash],
    })).resolves.toEqual({
      ok: true,
      usedBackupCode: true,
    });
  });

  it('rejects backup codes when the flow requires an authenticator code', async () => {
    const backupHash = await hashBackupCode('AB12CD34');

    await expect(verifyTwoFactorChallenge({
      secret: generateTOTPSecret(),
      code: 'AB12CD34',
      backupCodeHashes: [backupHash],
      allowBackupCode: false,
    })).resolves.toEqual({
      ok: false,
      usedBackupCode: false,
    });
  });
});
