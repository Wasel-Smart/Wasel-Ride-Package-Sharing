/**
 * Extended branch coverage for src/shared/validation/phone.ts.
 */
import { describe, it, expect } from 'vitest';
import { normalizePhone, normalizePhoneNumber, isValidE164Phone } from '../../src/shared/validation/phone';

describe('normalizePhone — extended branch coverage', () => {
  // ── Jordanian mobile ────────────────────────────────────────────────────────

  it('normalizes Jordanian mobile with +962 prefix (already E164-like)', () => {
    expect(normalizePhone('+962791234567')).toBe('+962791234567');
  });

  it('normalizes Jordanian mobile stripped of spaces and dashes', () => {
    expect(normalizePhone('+962 79 123 4567')).toBe('+962791234567');
    expect(normalizePhone('+962-79-123-4567')).toBe('+962791234567');
  });

  it('normalizes Jordanian landline starting with 06', () => {
    expect(normalizePhone('064001234')).toMatch(/^\+962/);
  });

  // ── Iraqi mobile ───────────────────────────────────────────────────────────

  it('normalizes Iraqi mobile already in +964 format', () => {
    const result = normalizePhone('+9647901234567');
    expect(result).toBe('+9647901234567');
  });

  it('normalizes Iraqi mobile with 0 prefix', () => {
    // Iraq mobile: 07X xxxxxxxx — 11 digits total
    const result = normalizePhone('07701234567');
    expect(result).toMatch(/^\+964/);
  });

  // ── Pass-through for already-canonical numbers ──────────────────────────────

  it('returns numbers already matching +9627x pattern', () => {
    expect(normalizePhone('+962791234567')).toBe('+962791234567');
  });

  it('returns numbers already matching +9647x pattern', () => {
    expect(normalizePhone('+9647901234567')).toBe('+9647901234567');
  });

  // ── Error cases ─────────────────────────────────────────────────────────────

  it('throws for a completely invalid number', () => {
    expect(() => normalizePhone('notaphone')).toThrow('Invalid phone number provided.');
  });

  it('throws for an empty string', () => {
    expect(() => normalizePhone('')).toThrow();
  });

  it('throws for a number with wrong country code', () => {
    expect(() => normalizePhone('+15551234567')).toThrow();
  });
});

// ── normalizePhoneNumber ──────────────────────────────────────────────────────

describe('normalizePhoneNumber', () => {
  it('strips whitespace', () => {
    expect(normalizePhoneNumber('  +962 79  123  ')).toBe('+96279123');
  });

  it('handles null', () => {
    expect(normalizePhoneNumber(null)).toBe('null');
  });

  it('handles undefined', () => {
    expect(normalizePhoneNumber(undefined)).toBe('undefined');
  });

  it('handles numbers', () => {
    expect(normalizePhoneNumber(962)).toBe('962');
  });
});

// ── isValidE164Phone ──────────────────────────────────────────────────────────

describe('isValidE164Phone', () => {
  it('passes valid E.164 numbers', () => {
    expect(isValidE164Phone('+962791234567')).toBe(true);
    expect(isValidE164Phone('+9647901234567')).toBe(true);
    expect(isValidE164Phone('+15551234567')).toBe(true);
  });

  it('rejects numbers without +', () => {
    expect(isValidE164Phone('962791234567')).toBe(false);
  });

  it('rejects numbers starting with +0', () => {
    expect(isValidE164Phone('+0962791234567')).toBe(false);
  });

  it('rejects too-short numbers', () => {
    expect(isValidE164Phone('+123456')).toBe(false);
  });

  it('rejects too-long numbers', () => {
    expect(isValidE164Phone('+123456789012345678')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidE164Phone('')).toBe(false);
  });

  it('rejects numbers with spaces', () => {
    expect(isValidE164Phone('+962 79 123 4567')).toBe(false);
  });
});
