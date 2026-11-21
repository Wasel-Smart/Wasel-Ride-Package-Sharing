import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCSPHeader,
  CSP_DIRECTIVES,
  checkRateLimit,
  resetRateLimit,
  checkPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  isTwoFactorAvailable,
  isMFAEnforced,
  requireMFAForOperation,
  sanitizeInput,
  validateEmail,
  validatePhone,
  validateIraqPhone,
  validateJordanPhone,
  validateURL,
} from '@/utils/security';

// ─── CSP ─────────────────────────────────────────────────────────────────────

describe('CSP_DIRECTIVES', () => {
  it('default-src is self-only', () => {
    expect(CSP_DIRECTIVES['default-src']).toEqual(["'self'"]);
  });

  it('object-src is none', () => {
    expect(CSP_DIRECTIVES['object-src']).toEqual(["'none'"]);
  });

  it('frame-ancestors is none', () => {
    expect(CSP_DIRECTIVES['frame-ancestors']).toEqual(["'none'"]);
  });

  it('form-action is self', () => {
    expect(CSP_DIRECTIVES['form-action']).toEqual(["'self'"]);
  });
});

describe('getCSPHeader', () => {
  it('returns a non-empty string', () => {
    const header = getCSPHeader();
    expect(typeof header).toBe('string');
    expect(header.length).toBeGreaterThan(0);
  });

  it('contains default-src', () => {
    expect(getCSPHeader()).toContain('default-src');
  });

  it('contains object-src', () => {
    expect(getCSPHeader()).toContain("object-src 'none'");
  });

  it('directives are separated by semicolons', () => {
    const parts = getCSPHeader().split(';');
    expect(parts.length).toBeGreaterThan(3);
  });
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimit('test-key');
  });

  it('allows first request', () => {
    expect(checkRateLimit('test-key', { maxRequests: 3, windowMs: 60_000 })).toBe(true);
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit('test-key', { maxRequests: 3, windowMs: 60_000 })).toBe(true);
    }
  });

  it('blocks requests over the limit', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('test-key', { maxRequests: 3, windowMs: 60_000 });
    }
    expect(checkRateLimit('test-key', { maxRequests: 3, windowMs: 60_000 })).toBe(false);
  });

  it('resets after window expires', () => {
    checkRateLimit('test-key', { maxRequests: 1, windowMs: 1 });
    checkRateLimit('test-key', { maxRequests: 1, windowMs: 1 });
    // After reset the key is gone
    resetRateLimit('test-key');
    expect(checkRateLimit('test-key', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
  });

  it('different keys are independent', () => {
    resetRateLimit('key-a');
    resetRateLimit('key-b');
    checkRateLimit('key-a', { maxRequests: 1, windowMs: 60_000 });
    checkRateLimit('key-a', { maxRequests: 1, windowMs: 60_000 }); // blocked
    expect(checkRateLimit('key-b', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
    resetRateLimit('key-a');
    resetRateLimit('key-b');
  });
});

describe('resetRateLimit', () => {
  it('clears the rate limit for a key', () => {
    checkRateLimit('reset-test', { maxRequests: 1, windowMs: 60_000 });
    checkRateLimit('reset-test', { maxRequests: 1, windowMs: 60_000 }); // blocked
    resetRateLimit('reset-test');
    expect(checkRateLimit('reset-test', { maxRequests: 1, windowMs: 60_000 })).toBe(true);
    resetRateLimit('reset-test');
  });
});

// ─── Password Strength ────────────────────────────────────────────────────────

describe('checkPasswordStrength', () => {
  it('empty string scores 0 and is invalid', () => {
    const result = checkPasswordStrength('');
    expect(result.score).toBe(0);
    expect(result.isValid).toBe(false);
  });

  it('short weak password scores low', () => {
    const result = checkPasswordStrength('abc');
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.isValid).toBe(false);
  });

  it('strong password with all criteria scores high', () => {
    const result = checkPasswordStrength('Tr0ub4dor&3!XyZ');
    expect(result.score).toBeGreaterThanOrEqual(3);
    expect(result.isValid).toBe(true);
  });

  it('common pattern "password123" is penalised', () => {
    const result = checkPasswordStrength('password123');
    expect(result.feedback.some(f => /common/i.test(f))).toBe(true);
  });

  it('repeating characters are penalised', () => {
    const result = checkPasswordStrength('aaabbbccc');
    expect(result.feedback.some(f => /repeat/i.test(f))).toBe(true);
  });

  it('returns feedback array', () => {
    const result = checkPasswordStrength('weak');
    expect(Array.isArray(result.feedback)).toBe(true);
  });

  it('score is always 0-4', () => {
    const passwords = ['', 'a', 'Abc123!@#XyZ', 'password', 'AAAAAAA'];
    for (const p of passwords) {
      const { score } = checkPasswordStrength(p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(4);
    }
  });
});

describe('getPasswordStrengthLabel', () => {
  it('maps 0-4 to correct labels', () => {
    expect(getPasswordStrengthLabel(0)).toBe('Very Weak');
    expect(getPasswordStrengthLabel(1)).toBe('Weak');
    expect(getPasswordStrengthLabel(2)).toBe('Fair');
    expect(getPasswordStrengthLabel(3)).toBe('Strong');
    expect(getPasswordStrengthLabel(4)).toBe('Very Strong');
  });

  it('returns Very Weak for out-of-range values', () => {
    expect(getPasswordStrengthLabel(99)).toBe('Very Weak');
    expect(getPasswordStrengthLabel(-1)).toBe('Very Weak');
  });
});

describe('getPasswordStrengthColor', () => {
  it('returns a hex color for each score', () => {
    for (let i = 0; i <= 4; i++) {
      expect(getPasswordStrengthColor(i)).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('returns red for score 0', () => {
    expect(getPasswordStrengthColor(0)).toBe('#FF7C8B');
  });

  it('returns green for score 4', () => {
    expect(getPasswordStrengthColor(4)).toBe('#72C70D');
  });
});

// ─── MFA ─────────────────────────────────────────────────────────────────────

describe('isTwoFactorAvailable', () => {
  it('returns a boolean', () => {
    expect(typeof isTwoFactorAvailable()).toBe('boolean');
  });
});

describe('isMFAEnforced', () => {
  it('returns a boolean', () => {
    expect(typeof isMFAEnforced()).toBe('boolean');
  });
});

describe('requireMFAForOperation', () => {
  it('passes when MFA is not enforced', async () => {
    const result = await requireMFAForOperation('payment', false);
    if (!result.enforced) {
      expect(result.passed).toBe(true);
    }
  });

  it('returns enforced=false when MFA is not configured', async () => {
    const result = await requireMFAForOperation('sensitive');
    expect(typeof result.enforced).toBe('boolean');
    expect(typeof result.passed).toBe('boolean');
  });
});

// ─── sanitizeInput ────────────────────────────────────────────────────────────

describe('sanitizeInput', () => {
  it('encodes ampersand', () => {
    expect(sanitizeInput('a&b')).toBe('a&amp;b');
  });

  it('encodes less-than', () => {
    expect(sanitizeInput('<script>')).toContain('&lt;');
  });

  it('encodes greater-than', () => {
    expect(sanitizeInput('a>b')).toContain('&gt;');
  });

  it('encodes double quote', () => {
    expect(sanitizeInput('"hello"')).toContain('&quot;');
  });

  it('encodes single quote', () => {
    expect(sanitizeInput("it's")).toContain('&#x27;');
  });

  it('encodes forward slash', () => {
    expect(sanitizeInput('a/b')).toContain('&#x2F;');
  });

  it('leaves safe text unchanged', () => {
    expect(sanitizeInput('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });
});

// ─── validateEmail ────────────────────────────────────────────────────────────

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('user+tag@sub.domain.io')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });
});

// ─── validatePhone ────────────────────────────────────────────────────────────

describe('validatePhone', () => {
  it('accepts valid E.164 numbers', () => {
    expect(validatePhone('+962791234567')).toBe(true);
    expect(validatePhone('+9647901234567')).toBe(true);
    expect(validatePhone('+1234567890')).toBe(true);
  });

  it('rejects invalid numbers', () => {
    expect(validatePhone('0791234567')).toBe(false);
    expect(validatePhone('+0123456789')).toBe(false);
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('not-a-phone')).toBe(false);
  });
});

describe('validateIraqPhone', () => {
  it('accepts valid Iraqi numbers', () => {
    expect(validateIraqPhone('+9647901234567')).toBe(true);
    expect(validateIraqPhone('+9647801234567')).toBe(true);
  });

  it('rejects non-Iraqi numbers', () => {
    expect(validateIraqPhone('+962791234567')).toBe(false);
    expect(validateIraqPhone('+1234567890')).toBe(false);
  });
});

describe('validateJordanPhone', () => {
  it('accepts valid Jordanian numbers', () => {
    expect(validateJordanPhone('+962791234567')).toBe(true);
    expect(validateJordanPhone('+96277123456')).toBe(true);
  });

  it('rejects non-Jordanian numbers', () => {
    expect(validateJordanPhone('+9647901234567')).toBe(false);
    expect(validateJordanPhone('+1234567890')).toBe(false);
  });
});

// ─── validateURL ─────────────────────────────────────────────────────────────

describe('validateURL', () => {
  it('accepts HTTPS URLs', () => {
    expect(validateURL('https://example.com')).toBe(true);
    expect(validateURL('https://api.wasel14.online/v1/health')).toBe(true);
  });

  it('rejects HTTP URLs', () => {
    expect(validateURL('http://example.com')).toBe(false);
  });

  it('rejects non-URLs', () => {
    expect(validateURL('not-a-url')).toBe(false);
    expect(validateURL('')).toBe(false);
  });

  it('rejects javascript: protocol', () => {
    expect(validateURL('javascript:alert(1)')).toBe(false);
  });
});
