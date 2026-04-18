import { describe, it, expect } from 'vitest';
import { canonicalizePhoneNumber, INTERNATIONAL_PHONE_REGEX } from '@/utils/phone';

describe('INTERNATIONAL_PHONE_REGEX', () => {
  it('matches a valid E.164 number', () => {
    expect(INTERNATIONAL_PHONE_REGEX.test('+962791234567')).toBe(true);
  });

  it('rejects a number without leading +', () => {
    expect(INTERNATIONAL_PHONE_REGEX.test('962791234567')).toBe(false);
  });

  it('rejects a number that is too short', () => {
    expect(INTERNATIONAL_PHONE_REGEX.test('+9627')).toBe(false);
  });
});

describe('canonicalizePhoneNumber', () => {
  // Jordan local numbers
  it('converts Jordan local number (0 prefix) to international format', () => {
    expect(canonicalizePhoneNumber('0791234567')).toBe('+962791234567');
  });

  it('accepts already-formatted Jordan international number', () => {
    expect(canonicalizePhoneNumber('+962791234567')).toBe('+962791234567');
  });

  it('handles number with spaces', () => {
    expect(canonicalizePhoneNumber('+962 79 123 4567')).toBe('+962791234567');
  });

  it('handles number with dashes', () => {
    expect(canonicalizePhoneNumber('+962-79-123-4567')).toBe('+962791234567');
  });

  it('handles 00 international prefix', () => {
    expect(canonicalizePhoneNumber('00962791234567')).toBe('+962791234567');
  });

  // Edge cases
  it('returns null for empty string', () => {
    expect(canonicalizePhoneNumber('')).toBeNull();
  });

  it('returns null for whitespace-only', () => {
    expect(canonicalizePhoneNumber('   ')).toBeNull();
  });

  it('returns null for non-digit string', () => {
    expect(canonicalizePhoneNumber('not-a-phone')).toBeNull();
  });

  it('returns null for number that is too short', () => {
    expect(canonicalizePhoneNumber('+1234')).toBeNull();
  });

  it('returns null for number that is too long', () => {
    expect(canonicalizePhoneNumber('+1234567890123456')).toBeNull();
  });

  it('handles parentheses in number', () => {
    const result = canonicalizePhoneNumber('+1 (800) 555-1234');
    expect(result).toBe('+18005551234');
  });

  it('returns null for null input', () => {
    // @ts-expect-error testing runtime null
    expect(canonicalizePhoneNumber(null)).toBeNull();
  });

  it('handles leading/trailing whitespace', () => {
    expect(canonicalizePhoneNumber('  +962791234567  ')).toBe('+962791234567');
  });

  it('converts US number correctly', () => {
    expect(canonicalizePhoneNumber('+18005551234')).toBe('+18005551234');
  });
});
