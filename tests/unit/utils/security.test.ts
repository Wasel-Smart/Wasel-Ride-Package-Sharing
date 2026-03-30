import { describe, expect, it } from 'vitest';
import { isTwoFactorAvailable, verify2FACode } from '@/utils/security';

describe('security helpers', () => {
  it('keeps 2FA disabled by default until backend verification is enabled', () => {
    expect(isTwoFactorAvailable()).toBe(false);
  });

  it('rejects 2FA verification requests when 2FA is disabled', async () => {
    await expect(verify2FACode('user-123', '000000')).resolves.toBe(false);
  });
});
