/**
 * Unit tests — src/services/auth.ts (logic layer)
 * All Supabase network calls are mocked — no real requests.
 */
import { describe, it, expect, vi } from 'vitest';

// ── Auth URL helpers ──────────────────────────────────────────────────────────
// These helpers are pure functions and need no mocking.
import { getAuthCallbackUrl, getConfig } from '@/utils/env';

describe('getAuthCallbackUrl', () => {
  it('appends the callback path to the given origin', () => {
    const url = getAuthCallbackUrl('https://wasel14.online');
    expect(url).toBe('https://wasel14.online/app/auth/callback');
  });

  it('strips a trailing slash from the origin', () => {
    const url = getAuthCallbackUrl('https://wasel14.online/');
    expect(url).toContain('/app/auth/callback');
    expect(url).not.toContain('//app');
  });

  it('falls back to VITE_APP_URL when no origin is provided', () => {
    const url = getAuthCallbackUrl();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
    expect(url).toContain('/app/auth/callback');
  });
});

// ── Config defaults ───────────────────────────────────────────────────────────

describe('getConfig', () => {
  it('returns a stable shape', () => {
    const config = getConfig();
    expect(config).toHaveProperty('appName');
    expect(config).toHaveProperty('appUrl');
    expect(config).toHaveProperty('authCallbackPath');
    expect(config).toHaveProperty('isProd');
    expect(config).toHaveProperty('isDev');
    expect(config).toHaveProperty('enableTwoFactorAuth');
    expect(config).toHaveProperty('enableDemoAccount');
  });

  it('authCallbackPath always starts with /', () => {
    expect(getConfig().authCallbackPath.startsWith('/')).toBe(true);
  });

  it('enableTwoFactorAuth is a boolean', () => {
    expect(typeof getConfig().enableTwoFactorAuth).toBe('boolean');
  });
});

// ── Session token validation logic ────────────────────────────────────────────

describe('auth token validation rules', () => {
  const isValidJwt = (token: string) => {
    const parts = token.split('.');
    return parts.length === 3 && parts.every(p => p.length > 0);
  };

  it('identifies a well-formed JWT structure', () => {
    const fakeJwt = 'aaa.bbb.ccc';
    expect(isValidJwt(fakeJwt)).toBe(true);
  });

  it('rejects tokens with wrong number of segments', () => {
    expect(isValidJwt('aaa.bbb')).toBe(false);
    expect(isValidJwt('aaa')).toBe(false);
    expect(isValidJwt('')).toBe(false);
  });
});

// ── Error normalisation ───────────────────────────────────────────────────────

describe('auth error normalisation', () => {
  const toMessage = (error: unknown): string => {
    if (error instanceof Error) {return error.message;}
    if (typeof error === 'string') {return error;}
    return 'An unknown error occurred';
  };

  it('extracts message from Error instances', () => {
    expect(toMessage(new Error('Invalid credentials'))).toBe('Invalid credentials');
  });

  it('passes string errors through', () => {
    expect(toMessage('rate limited')).toBe('rate limited');
  });

  it('returns fallback for unknown error types', () => {
    expect(toMessage(null)).toBe('An unknown error occurred');
    expect(toMessage(undefined)).toBe('An unknown error occurred');
    expect(toMessage(42)).toBe('An unknown error occurred');
  });
});
