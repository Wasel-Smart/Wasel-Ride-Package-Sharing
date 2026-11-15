/**
 * tests/utils/security.test.ts
 *
 * Unit tests for src/utils/security.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimit,
  checkPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  isTwoFactorAvailable,
  isMFAEnforced,
  validateEmail,
  validatePhone,
  validateJordanPhone,
  validateIraqPhone,
  validateURL,
  sanitizeInput,
} from '@/utils/security';
import { getConfig } from '@/utils/env';

// Mock the config module
vi.mock('@/utils/env', () => ({
  getConfig: vi.fn(() => ({
    appName: 'Wasel',
    appUrl: 'https://www.wasel14.online',
    allowedApiDomain: 'wasel14.online',
    supportWhatsAppNumber: '',
    supportEmail: 'support@wasel.jo',
    supportPhoneNumber: '',
    supportSmsNumber: '',
    authCallbackPath: '/app/auth/callback',
    enableDemoAccount: false,
    enableTwoFactorAuth: false,
    enforceTwoFactorAuth: false,
    enableEmailNotifications: true,
    enableSmsNotifications: true,
    enableWhatsAppNotifications: true,
    allowDirectSupabaseFallback: false,
    isProd: false,
    isDev: true,
  })),
}));

// Mock API_URL from services/core
vi.mock('@/services/core', () => ({
  API_URL: 'https://www.wasel14.online/api',
  fetchWithRetry: vi.fn(),
  getAuthDetails: vi.fn(),
}));

beforeEach(() => {
  resetRateLimit('security-test-key');
  resetRateLimit('security-test-reset');
  resetRateLimit('security-test-reset2');
  resetRateLimit('wasel-test-threshold');
  resetRateLimit('wasel-test-window-expiry');
  resetRateLimit('wasel-test-with-rl-success');
  resetRateLimit('wasel-test-with-rl-exhausted');
  resetRateLimit('wasel-test-with-rl-op-error');
  resetRateLimit('wasel-test-skip-success');
  resetRateLimit('wasel-test-skip-failed');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkRateLimit()', () => {
  it('allows requests up to maxRequests, then blocks', () => {
    const results = [];
    for (let i = 0; i < 5; i++) {
      results.push(checkRateLimit('security-test-key', { maxRequests: 3, windowMs: 60_000 }));
    }
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('uses separate stores per key', () => {
    expect(checkRateLimit('key-a', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit('key-b', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit('key-a', { maxRequests: 1, windowMs: 60_000 })).toBe(false);
  });

  it('resets after the window expires', () => {
    vi.useFakeTimers();
    const key = 'security-test-reset';
    expect(checkRateLimit(key, { maxRequests: 1, windowMs: 50 })).toBe(true);
    expect(checkRateLimit(key, { maxRequests: 1, windowMs: 50 })).toBe(false);
    vi.advanceTimersByTime(100);
    expect(checkRateLimit(key, { maxRequests: 1, windowMs: 50 })).toBe(true);
    vi.useRealTimers();
  });

  it('resets with resetRateLimit', () => {
    expect(checkRateLimit('security-test-reset2', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit('security-test-reset2', { maxRequests: 1, windowMs: 60_000 })).toBe(false);
    resetRateLimit('security-test-reset2');
    expect(checkRateLimit('security-test-reset2', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
  });
});

describe('checkPasswordStrength()', () => {
  it('returns score 0 for empty password', () => {
    const result = checkPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.isValid).toBe(false);
    expect(result.feedback.length).toBeGreaterThan(0);
  });

  it('rejects short passwords', () => {
    const result = checkPasswordStrength('Ab1!');
    expect(result.score).toBeLessThan(3);
    expect(result.isValid).toBe(false);
  });

  it('rejects common patterns', () => {
    const result = checkPasswordStrength('password123!');
    expect(result.isValid).toBe(false);
    expect(result.feedback.some(f => f.includes('common'))).toBe(true);
  });

  it('rejects repeating characters', () => {
    const result = checkPasswordStrength('aaaabbbb123!');
    expect(result.feedback.some(f => f.includes('repeating'))).toBe(true);
  });

  it('accepts strong passwords', () => {
    const result = checkPasswordStrength('Str0ng!Pass#Word');
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.isValid).toBe(true);
  });

  it('returns valid labels and colors for all scores', () => {
    for (let score = 0; score <= 4; score++) {
      const label = getPasswordStrengthLabel(score);
      const color = getPasswordStrengthColor(score);
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
      expect(typeof color).toBe('string');
      expect(color.startsWith('#')).toBe(true);
    }
  });
});

describe('isTwoFactorAvailable()', () => {
  it('returns false when 2FA is not enabled', () => {
    vi.mocked(getConfig).mockReturnValue({
      ...getConfig(),
      enableTwoFactorAuth: false,
      enforceTwoFactorAuth: false,
    });
    expect(isTwoFactorAvailable()).toBe(false);
  });

  it('returns true when 2FA is enabled and API_URL is set', () => {
    vi.mocked(getConfig).mockReturnValue({
      ...getConfig(),
      enableTwoFactorAuth: true,
      enforceTwoFactorAuth: false,
    });
    expect(isTwoFactorAvailable()).toBe(true);
  });
});

describe('isMFAEnforced()', () => {
  it('returns false by default', () => {
    expect(isMFAEnforced()).toBe(false);
  });

  it('returns true when enforced', () => {
    vi.mocked(getConfig).mockReturnValue({
      ...getConfig(),
      enforceTwoFactorAuth: true,
    });
    expect(isMFAEnforced()).toBe(true);
  });
});

describe('validateEmail()', () => {
  it.each([
    ['user@example.com', true],
    ['user.name@domain.co.uk', true],
    ['', false],
    ['not-an-email', false],
    ['@example.com', false],
    ['user@', false],
    ['user@.com', false],
  ])('%s is %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });
});

describe('validatePhone()', () => {
  it('accepts E.164 international numbers', () => {
    expect(validatePhone('+1234567890')).toBe(true);
    expect(validatePhone('+962791234567')).toBe(true);
    expect(validatePhone('+9647801234567')).toBe(true);
  });

  it('rejects invalid formats', () => {
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('0791234567')).toBe(false);
    expect(validatePhone('abcdef')).toBe(false);
  });
});

describe('validateJordanPhone()', () => {
  it('accepts valid Jordanian mobile numbers', () => {
    expect(validateJordanPhone('+962791234567')).toBe(true);
    expect(validateJordanPhone('+962780123456')).toBe(true);
  });

  it('rejects non-Jordanian numbers', () => {
    expect(validateJordanPhone('+9647801234567')).toBe(false);
    expect(validateJordanPhone('+1234567890')).toBe(false);
    expect(validateJordanPhone('')).toBe(false);
  });
});

describe('validateIraqPhone()', () => {
  it('accepts valid Iraqi numbers', () => {
    expect(validateIraqPhone('+9647801234567')).toBe(true);
    expect(validateIraqPhone('+9640750123456')).toBe(true);
  });

  it('rejects non-Iraqi numbers', () => {
    expect(validateIraqPhone('+962791234567')).toBe(false);
    expect(validateIraqPhone('+1234567890')).toBe(false);
    expect(validateIraqPhone('')).toBe(false);
  });
});

describe('validateURL()', () => {
  it('accepts https URLs', () => {
    expect(validateURL('https://wasel.jo')).toBe(true);
    expect(validateURL('https://api.wasel14.online/v1/health')).toBe(true);
  });

  it('rejects non-HTTPS and invalid URLs', () => {
    expect(validateURL('http://example.com')).toBe(false);
    expect(validateURL('ftp://example.com')).toBe(false);
    expect(validateURL('not-a-url')).toBe(false);
    expect(validateURL('')).toBe(false);
  });
});

describe('sanitizeInput()', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
    );
  });

  it('escapes ampersands and quotes', () => {
    expect(sanitizeInput('a&b"c\'d/e')).toBe(
      'a&amp;b&quot;c&#x27;d&#x2F;e',
    );
  });

  it('returns empty string for empty input', () => {
    expect(sanitizeInput('')).toBe('');
  });
});
