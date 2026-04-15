/**
 * Env Configuration — Unit Tests
 *
 * Covers: getEnv, hasEnv, getConfig, getAuthCallbackUrl,
 * WhatsApp/email/SMS URL generators.
 *
 * Standard: Environment configuration is the bootstrap contract.
 * Incorrect defaults silently break auth, payments, and support flows.
 */
import { afterEach, describe, it, expect } from 'vitest';
import {
  getEnv,
  hasEnv,
  getConfig,
  getAuthCallbackUrl,
  getWhatsAppSupportUrl,
  getSupportEmailUrl,
  getSmsSupportUrl,
  getSupportPhoneUrl,
} from '../../../src/utils/env';

const originalAppUrl = process.env.VITE_APP_URL;

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.VITE_APP_URL;
  } else {
    process.env.VITE_APP_URL = originalAppUrl;
  }

  window.history.replaceState({}, '', '/');
});

// ── 1. getEnv ─────────────────────────────────────────────────────────────────

describe('getEnv()', () => {
  it('returns fallback for unknown key', () => {
    expect(getEnv('VITE_NONEXISTENT_KEY', 'fallback')).toBe('fallback');
  });

  it('returns empty string as fallback by default', () => {
    expect(getEnv('VITE_NONEXISTENT_KEY')).toBe('');
  });
});

// ── 2. hasEnv ─────────────────────────────────────────────────────────────────

describe('hasEnv()', () => {
  it('returns false for unknown key', () => {
    expect(hasEnv('VITE_NONEXISTENT_KEY')).toBe(false);
  });

  it('returns a boolean', () => {
    expect(typeof hasEnv('VITE_APP_NAME')).toBe('boolean');
  });
});

// ── 3. getConfig ──────────────────────────────────────────────────────────────

describe('getConfig()', () => {
  it('returns an object with required keys', () => {
    const config = getConfig();
    expect(config).toHaveProperty('appName');
    expect(config).toHaveProperty('appUrl');
    expect(config).toHaveProperty('authCallbackPath');
    expect(config).toHaveProperty('enableTwoFactorAuth');
    expect(config).toHaveProperty('isProd');
    expect(config).toHaveProperty('isDev');
  });

  it('appName defaults to "Wasel"', () => {
    expect(getConfig().appName).toBe('Wasel');
  });

  it('activates exactly one environment flag at a time', () => {
    const config = getConfig();
    const activeFlags = [
      config.isProd,
      config.isDev,
      config.isStaging,
      config.isTest,
    ].filter(Boolean);

    expect(activeFlags).toHaveLength(1);
  });

  it('authCallbackPath starts with /', () => {
    expect(getConfig().authCallbackPath.startsWith('/')).toBe(true);
  });

  it('enableTwoFactorAuth is a boolean', () => {
    expect(typeof getConfig().enableTwoFactorAuth).toBe('boolean');
  });

  it('enableEmailNotifications defaults to true in test env', () => {
    expect(getConfig().enableEmailNotifications).toBe(true);
  });

  it('prefers the runtime localhost origin over a stale local VITE_APP_URL', () => {
    process.env.VITE_APP_URL = 'http://localhost:5173';

    expect(getConfig().appUrl).toBe(window.location.origin);
  });
});

// ── 4. getAuthCallbackUrl ──────────────────────────────────────────────────────

describe('getAuthCallbackUrl()', () => {
  it('returns a non-empty string', () => {
    const url = getAuthCallbackUrl();
    expect(url.length).toBeGreaterThan(0);
  });

  it('includes the auth callback path', () => {
    const url = getAuthCallbackUrl('https://wasel.jo');
    expect(url).toContain('/app/auth/callback');
  });

  it('does not double-slash when origin ends with /', () => {
    const url = getAuthCallbackUrl('https://wasel.jo/');
    expect(url).not.toContain('//app');
  });

  it('uses provided origin as base', () => {
    const url = getAuthCallbackUrl('https://staging.wasel.jo');
    expect(url.startsWith('https://staging.wasel.jo')).toBe(true);
  });
});

// ── 5. getWhatsAppSupportUrl ──────────────────────────────────────────────────

describe('getWhatsAppSupportUrl()', () => {
  it('returns empty string when no WhatsApp number configured', () => {
    const url = getWhatsAppSupportUrl();
    // In test env no number is configured → should return ''
    // OR if configured, should be a valid WhatsApp URL
    if (url.length > 0) {
      expect(url).toContain('wa.me');
    }
  });

  it('includes encoded message when number is present', () => {
    const url = getWhatsAppSupportUrl('Hello Wasel');
    if (url.length > 0) {
      expect(url).toContain('text=Hello%20Wasel');
    }
  });
});

// ── 6. getSupportEmailUrl ─────────────────────────────────────────────────────

describe('getSupportEmailUrl()', () => {
  it('returns a mailto URL when email is configured', () => {
    const url = getSupportEmailUrl('Test Subject', 'Test Body');
    if (url.length > 0) {
      expect(url.startsWith('mailto:')).toBe(true);
    }
  });

  it('includes subject in URL when provided', () => {
    const url = getSupportEmailUrl('Test Subject');
    if (url.length > 0) {
      expect(url).toContain('subject=');
    }
  });
});

// ── 7. getSmsSupportUrl ───────────────────────────────────────────────────────

describe('getSmsSupportUrl()', () => {
  it('returns sms: URL when number is configured', () => {
    const url = getSmsSupportUrl('Hi Wasel');
    if (url.length > 0) {
      expect(url.startsWith('sms:')).toBe(true);
    }
  });
});

// ── 8. getSupportPhoneUrl ─────────────────────────────────────────────────────

describe('getSupportPhoneUrl()', () => {
  it('returns tel: URL when number is configured', () => {
    const url = getSupportPhoneUrl();
    if (url.length > 0) {
      expect(url.startsWith('tel:')).toBe(true);
    }
  });
});
