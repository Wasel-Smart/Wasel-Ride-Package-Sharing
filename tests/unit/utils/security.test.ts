/**
 * Security Utilities — Unit Tests
 *
 * Covers: CSP header generation, client-side rate limiter,
 * password strength scoring, input sanitization, and validator helpers.
 *
 * Standard: Security primitives must be deterministic and exhaustively tested.
 * Any regression here would be a vulnerability.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getCSPHeader,
  CSP_DIRECTIVES,
  checkRateLimit,
  resetRateLimit,
  checkPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateURL,
  isTwoFactorAvailable,
} from '../../../src/utils/security';

// ── 1. CSP Header ────────────────────────────────────────────────────────────

describe('getCSPHeader()', () => {
  it('returns a non-empty string', () => {
    const header = getCSPHeader();
    expect(typeof header).toBe('string');
    expect(header.length).toBeGreaterThan(0);
  });

  it("contains 'default-src' directive", () => {
    expect(getCSPHeader()).toContain('default-src');
  });

  it("contains 'object-src' set to 'none' (critical security directive)", () => {
    expect(getCSPHeader()).toContain("object-src 'none'");
  });

  it("contains 'frame-ancestors' set to 'none' (clickjacking protection)", () => {
    expect(getCSPHeader()).toContain("frame-ancestors 'none'");
  });

  it("contains 'base-uri' directive (prevents base-tag injection)", () => {
    expect(getCSPHeader()).toContain('base-uri');
  });

  it('allows Stripe scripts (payment processing)', () => {
    const header = getCSPHeader();
    expect(header).toContain('js.stripe.com');
  });

  it('allows Supabase connections', () => {
    const header = getCSPHeader();
    expect(header).toContain('.supabase.co');
  });

  it('contains upgrade-insecure-requests directive', () => {
    expect(getCSPHeader()).toContain('upgrade-insecure-requests');
  });

  it('CSP_DIRECTIVES has all required keys', () => {
    const required = ['default-src', 'script-src', 'style-src', 'img-src', 'connect-src', 'frame-src', 'object-src', 'base-uri'];
    for (const key of required) {
      expect(CSP_DIRECTIVES).toHaveProperty(key);
    }
  });
});

// ── 2. Rate Limiter ───────────────────────────────────────────────────────────

describe('checkRateLimit()', () => {
  const KEY = 'test-rl-key';

  beforeEach(() => {
    resetRateLimit(KEY);
  });

  it('allows the first request', () => {
    expect(checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 })).toBe(true);
  });

  it('allows up to maxRequests requests', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 })).toBe(true);
    }
  });

  it('blocks the request that exceeds maxRequests', () => {
    for (let i = 0; i < 5; i++) {checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 });}
    expect(checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 })).toBe(false);
  });

  it('uses default config (100 requests) when none provided', () => {
    // First call should always succeed
    expect(checkRateLimit('default-test-key')).toBe(true);
    resetRateLimit('default-test-key');
  });

  it('different keys are rate-limited independently', () => {
    for (let i = 0; i < 5; i++) {checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 });}
    // Exceeds limit for KEY
    expect(checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 })).toBe(false);
    // Different key should still be allowed
    expect(checkRateLimit('other-key', { maxRequests: 5, windowMs: 60_000 })).toBe(true);
    resetRateLimit('other-key');
  });

  it('resetRateLimit() allows requests again', () => {
    for (let i = 0; i < 6; i++) {checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 });}
    resetRateLimit(KEY);
    expect(checkRateLimit(KEY, { maxRequests: 5, windowMs: 60_000 })).toBe(true);
  });
});

// ── 3. Password Strength ──────────────────────────────────────────────────────

describe('checkPasswordStrength()', () => {
  it('scores very weak passwords (score 0-1)', () => {
    const result = checkPasswordStrength('abc');
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.isValid).toBe(false);
  });

  it('scores a short common password as invalid', () => {
    const result = checkPasswordStrength('password');
    expect(result.isValid).toBe(false);
  });

  it('scores a strong password (score 3-4)', () => {
    const result = checkPasswordStrength('C0mplex!Pass#2026');
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.isValid).toBe(true);
  });

  it('provides feedback for missing uppercase', () => {
    const result = checkPasswordStrength('lowercase1!');
    expect(result.feedback.some(f => f.toLowerCase().includes('uppercase'))).toBe(true);
  });

  it('provides feedback for missing numbers', () => {
    const result = checkPasswordStrength('NoNumbers!Here');
    expect(result.feedback.some(f => f.toLowerCase().includes('number'))).toBe(true);
  });

  it('provides feedback for missing special characters', () => {
    const result = checkPasswordStrength('NoSpecial1234');
    expect(result.feedback.some(f => f.toLowerCase().includes('special'))).toBe(true);
  });

  it('penalises common patterns (password)', () => {
    const result = checkPasswordStrength('password123!A');
    expect(result.score).toBeLessThan(3);
  });

  it('penalises repeating characters', () => {
    const result = checkPasswordStrength('aaaa1234!A');
    expect(result.score).toBeLessThan(4);
  });

  it('score is always in range 0-4', () => {
    const passwords = ['a', 'short1!', 'Medium1!', 'C0mplex!Pass#99', 'aaaaaaaaaaaa'];
    for (const pw of passwords) {
      const { score } = checkPasswordStrength(pw);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });

  it('isValid requires score >= 3 AND length >= 8', () => {
    const result = checkPasswordStrength('Sh0rt!');
    expect(result.isValid).toBe(false); // too short even if complex
  });
});

describe('getPasswordStrengthLabel()', () => {
  it('returns correct labels for all 5 scores', () => {
    const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    for (let i = 0; i <= 4; i++) {
      expect(getPasswordStrengthLabel(i)).toBe(labels[i]);
    }
  });

  it('returns "Very Weak" for out-of-range score', () => {
    expect(getPasswordStrengthLabel(10)).toBe('Very Weak');
  });
});

describe('getPasswordStrengthColor()', () => {
  it('returns a hex color string for all 5 scores', () => {
    for (let i = 0; i <= 4; i++) {
      const color = getPasswordStrengthColor(i);
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('score 0 is red (danger)', () => {
    expect(getPasswordStrengthColor(0)).toBe('#ef4444');
  });

  it('score 4 is green (safe)', () => {
    expect(getPasswordStrengthColor(4)).toBe('#10b981');
  });
});

// ── 4. Input Sanitization ─────────────────────────────────────────────────────

describe('sanitizeInput()', () => {
  it('escapes < and > HTML tags', () => {
    const result = sanitizeInput('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('escapes double quotes', () => {
    const result = sanitizeInput('"hello"');
    expect(result).toContain('&quot;');
    expect(result).not.toContain('"');
  });

  it('escapes single quotes', () => {
    const result = sanitizeInput("it's");
    expect(result).toContain('&#x27;');
  });

  it('escapes ampersand', () => {
    const result = sanitizeInput('Tom & Jerry');
    expect(result).toContain('&amp;');
  });

  it('returns empty string unchanged', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('leaves safe text unchanged except for encoding', () => {
    const result = sanitizeInput('Hello World');
    expect(result).toBe('Hello World');
  });
});

// ── 5. Validators ─────────────────────────────────────────────────────────────

describe('validateEmail()', () => {
  it('accepts standard emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('ahmad.najjar+tag@wasel.jo')).toBe(true);
  });

  it('rejects emails without @', () => {
    expect(validateEmail('notanemail')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePhone()', () => {
  it('accepts E.164 Jordan number', () => {
    expect(validatePhone('+962791234567')).toBe(true);
  });

  it('accepts E.164 US number', () => {
    expect(validatePhone('+12125551234')).toBe(true);
  });

  it('rejects number without +', () => {
    expect(validatePhone('962791234567')).toBe(false);
  });

  it('rejects too-short number', () => {
    expect(validatePhone('+1')).toBe(false);
  });

  it('rejects number with spaces', () => {
    expect(validatePhone('+962 79 123 4567')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validatePhone('')).toBe(false);
  });
});

describe('validateURL()', () => {
  it('accepts https URLs', () => {
    expect(validateURL('https://wasel.jo')).toBe(true);
  });

  it('accepts http URLs', () => {
    expect(validateURL('http://example.com')).toBe(true);
  });

  it('rejects bare domain without protocol', () => {
    expect(validateURL('wasel.jo')).toBe(false);
  });

  it('rejects javascript: URLs', () => {
    expect(validateURL('javascript:alert(1)')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateURL('')).toBe(false);
  });
});

// ── 6. 2FA availability flag ──────────────────────────────────────────────────

describe('isTwoFactorAvailable()', () => {
  it('returns a boolean', () => {
    expect(typeof isTwoFactorAvailable()).toBe('boolean');
  });

  it('returns false when env flag is not set (test env)', () => {
    // In test environment, VITE_ENABLE_TWO_FACTOR_AUTH is not set
    expect(isTwoFactorAvailable()).toBe(false);
  });
});
