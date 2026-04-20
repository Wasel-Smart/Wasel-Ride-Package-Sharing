/**
 * Validation — Additional edge-case tests
 *
 * These supplement the existing validation.test.ts with edge cases
 * that were not previously covered:
 *   - SQL injection / XSS patterns in fields
 *   - Boundary values on number fields
 *   - Unicode / Arabic name handling
 *   - Phone number format edge cases
 *   - URL safety in avatarUrl
 */
import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  updateProfileSchema,
  offerRideSchema,
  topUpSchema,
  transferSchema,
} from '../../../src/utils/validation';

function valid<T>(schema: { safeParse: (v: unknown) => { success: boolean } }, data: T) {
  const result = schema.safeParse(data);
  expect(
    result.success,
    `Expected valid but got: ${JSON.stringify((result as any).error?.issues)}`,
  ).toBe(true);
}

function invalid<T>(schema: { safeParse: (v: unknown) => { success: boolean } }, data: T) {
  expect(schema.safeParse(data).success).toBe(false);
}

// ── SQL injection / XSS safety in text fields ──────────────────────────────

describe('signInSchema — injection safety', () => {
  it('rejects email containing SQL injection attempt', () => {
    invalid(signInSchema, { email: "' OR 1=1--@test.com", password: 'ValidPass1!' });
  });

  it('rejects email with embedded newline (header injection)', () => {
    invalid(signInSchema, { email: 'user\n@example.com', password: 'ValidPass1!' });
  });

  it('rejects password exceeding 128 chars (DoS guard)', () => {
    invalid(signInSchema, { email: 'user@example.com', password: 'A'.repeat(129) });
  });
});

// ── Arabic / Unicode names ─────────────────────────────────────────────────

describe('signUpSchema — Unicode name support', () => {
  const base = {
    email: 'ahmad@wasel.jo',
    password: 'ValidPass1!',
    confirmPassword: 'ValidPass1!',
    phone: '+962791234567',
  };

  it('accepts a fully Arabic name', () => {
    valid(signUpSchema, { ...base, fullName: 'أحمد النجار' });
  });

  it('accepts a mixed Arabic-English name', () => {
    valid(signUpSchema, { ...base, fullName: 'Ahmad أحمد' });
  });

  it('accepts a name with hyphens and apostrophes (common in Jordan)', () => {
    valid(signUpSchema, { ...base, fullName: 'Khalil Al-Najjar' });
  });

  it('rejects a name that is only whitespace after trim', () => {
    invalid(signUpSchema, { ...base, fullName: '   ' });
  });
});

// ── Phone format edge cases ────────────────────────────────────────────────

describe('signUpSchema — phone format edge cases', () => {
  const base = {
    fullName: 'Test User',
    email: 'test@wasel.jo',
    password: 'ValidPass1!',
    confirmPassword: 'ValidPass1!',
  };

  it('accepts Jordanian mobile number (+962 7x)', () => {
    valid(signUpSchema, { ...base, phone: '+962799123456' });
  });

  it('rejects non-Jordanian phone numbers', () => {
    invalid(signUpSchema, { ...base, phone: '+971501234567' });
  });

  it('rejects phone starting with 00 (not E.164)', () => {
    invalid(signUpSchema, { ...base, phone: '00962799123456' });
  });

  it('rejects phone with non-numeric characters after +', () => {
    invalid(signUpSchema, { ...base, phone: '+962abc123456' });
  });

  it('rejects phone that is too short (< 7 digits after country code)', () => {
    invalid(signUpSchema, { ...base, phone: '+9621234' });
  });

  it('rejects phone with spaces', () => {
    invalid(signUpSchema, { ...base, phone: '+962 799 123 456' });
  });
});

// ── Profile avatar URL safety ─────────────────────────────────────────────

describe('updateProfileSchema — avatarUrl safety', () => {
  const base = { fullName: 'Nour Khalil' };

  it('accepts https URLs', () => {
    valid(updateProfileSchema, { ...base, avatarUrl: 'https://cdn.wasel.jo/avatar.jpg' });
  });

  it('accepts http URLs (some internal services)', () => {
    valid(updateProfileSchema, { ...base, avatarUrl: 'http://example.com/avatar.jpg' });
  });

  it('rejects javascript: protocol (XSS vector)', () => {
    invalid(updateProfileSchema, { ...base, avatarUrl: 'javascript:alert(1)' });
  });

  it('rejects data: URI (potential XSS vector)', () => {
    invalid(updateProfileSchema, {
      ...base,
      avatarUrl: 'data:text/html,<script>alert(1)</script>',
    });
  });

  it('accepts empty string (clearing avatar)', () => {
    valid(updateProfileSchema, { ...base, avatarUrl: '' });
  });
});

// ── Offer ride boundary values ──────────────────────────────────────────────

describe('offerRideSchema — numeric boundary values', () => {
  const base = {
    origin: 'Amman' as const,
    destination: 'Aqaba' as const,
    departureDate: '2026-08-15',
    departureTime: '09:00',
    seats: 3,
    pricePerSeat: 12,
    genderPreference: 'any' as const,
    allowPackages: false,
  };

  it('accepts price of exactly 0.01', () => {
    valid(offerRideSchema, { ...base, pricePerSeat: 0.01 });
  });

  it('accepts price of exactly 500', () => {
    valid(offerRideSchema, { ...base, pricePerSeat: 500 });
  });

  it('rejects price of 0', () => {
    invalid(offerRideSchema, { ...base, pricePerSeat: 0 });
  });

  it('accepts seats at boundary of 1', () => {
    valid(offerRideSchema, { ...base, seats: 1 });
  });

  it('accepts seats at boundary of 7', () => {
    valid(offerRideSchema, { ...base, seats: 7 });
  });
});

// ── Top-up boundary ────────────────────────────────────────────────────────

describe('topUpSchema — exact boundary values', () => {
  it('accepts amount of exactly 500 (max allowed)', () => {
    const result = topUpSchema.safeParse({ amount: 500, paymentMethod: 'card' });
    expect(result.success).toBe(true);
  });

  it('rejects amount of 500.01 (over max)', () => {
    invalid(topUpSchema, { amount: 500.01, paymentMethod: 'card' });
  });

  it('accepts amount of 0.01 (minimum positive)', () => {
    valid(topUpSchema, { amount: 0.01, paymentMethod: 'card' });
  });
});

// ── Transfer boundary ──────────────────────────────────────────────────────

describe('transferSchema — exact boundary values', () => {
  const base = { recipientPhone: '+962791234567' };

  it('accepts amount of exactly 200 (max)', () => {
    valid(transferSchema, { ...base, amount: 200 });
  });

  it('rejects amount of 200.01', () => {
    invalid(transferSchema, { ...base, amount: 200.01 });
  });
});
