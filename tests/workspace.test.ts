import { describe, expect, it } from 'vitest';
import { getAuthCallbackUrl, getConfig, getEnv, getWhatsAppSupportUrl, hasEnv } from '@/utils/env';

describe('workspace configuration utilities', () => {
  it('returns defaults when environment variables are missing', () => {
    expect(getEnv('VITE_DOES_NOT_EXIST', 'fallback')).toBe('fallback');
    expect(hasEnv('VITE_DOES_NOT_EXIST')).toBe(false);
  });

  it('exposes stable application defaults', () => {
    const config = getConfig();

    expect(config.appUrl).toBeTruthy();
    expect(config.appName).toBeTruthy();
    expect(config.authCallbackPath.startsWith('/')).toBe(true);
    expect(config.enableTwoFactorAuth).toBe(false);
    expect(typeof config.isProd).toBe('boolean');
    expect(typeof config.isDev).toBe('boolean');
  });

  it('builds stable helper URLs', () => {
    expect(getAuthCallbackUrl('https://wasel.example')).toContain('/app/auth/callback');
    const supportUrl = getWhatsAppSupportUrl('Need help');
    expect(typeof supportUrl).toBe('string');
    if (supportUrl) {
      expect(supportUrl).toContain('text=Need%20help');
    }
  });
});
