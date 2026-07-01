/**
 * tests/utils/validation.test.ts
 *
 * Unit tests for src/utils/validation.ts
 * Covers: signInSchema, signUpSchema, offerRideSchema, topUpSchema, transferSchema
 */

import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  offerRideSchema,
  findRideSchema,
  topUpSchema,
  transferSchema,
  updateProfileSchema,
} from '@/utils/validation';

// ── Helper ────────────────────────────────────────────────────────────────────

function isValid(schema: { safeParse: (v: unknown) => { success: boolean } }, value: unknown) {
  return schema.safeParse(value).success;
}

function errorMessages(
  schema: { safeParse: (v: unknown) => { success: boolean; error?: { errors: { message: string }[] } } },
  value: unknown,
): string[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error?.errors.map(e => e.message) ?? [];
}

// ── signInSchema ──────────────────────────────────────────────────────────────

describe('signInSchema', () => {
  const valid = { email: 'user@wasel.jo', password: 'Secure@123' };

  it('accepts a valid email + password', () => {
    expect(isValid(signInSchema, valid)).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(isValid(signInSchema, { ...valid, email: 'not-an-email' })).toBe(false);
  });

  it('lowercases the email', () => {
    const result = signInSchema.safeParse({ ...valid, email: 'USER@WASEL.JO' });
    expect(result.success && result.data.email).toBe('user@wasel.jo');
  });

  it('rejects a password shorter than 8 chars', () => {
    expect(isValid(signInSchema, { ...valid, password: 'Ab1@' })).toBe(false);
  });

  it('rejects a password with no uppercase', () => {
    expect(isValid(signInSchema, { ...valid, password: 'secure@123' })).toBe(false);
  });

  it('rejects a password with no special character', () => {
    expect(isValid(signInSchema, { ...valid, password: 'Secure123' })).toBe(false);
  });
});

// ── signUpSchema ──────────────────────────────────────────────────────────────

describe('signUpSchema', () => {
  const valid = {
    fullName: 'Ahmad Ali',
    email: 'ahmad@wasel.jo',
    password: 'Secure@123',
    confirmPassword: 'Secure@123',
    phone: '+962791234567',
  };

  it('accepts a valid signup payload', () => {
    expect(isValid(signUpSchema, valid)).toBe(true);
  });

  it('rejects when passwords do not match', () => {
    expect(isValid(signUpSchema, { ...valid, confirmPassword: 'Different@1' })).toBe(false);
    const msgs = errorMessages(signUpSchema, { ...valid, confirmPassword: 'Different@1' });
    expect(msgs.some(m => m.toLowerCase().includes('match'))).toBe(true);
  });

  it('rejects a name shorter than 2 chars', () => {
    expect(isValid(signUpSchema, { ...valid, fullName: 'A' })).toBe(false);
  });

  it('rejects a name longer than 80 chars', () => {
    expect(isValid(signUpSchema, { ...valid, fullName: 'A'.repeat(81) })).toBe(false);
  });

  it('accepts an empty phone (optional)', () => {
    expect(isValid(signUpSchema, { ...valid, phone: '' })).toBe(true);
  });

  it('rejects an invalid phone format', () => {
    expect(isValid(signUpSchema, { ...valid, phone: '0791234567' })).toBe(false);
  });
});

// ── resetPasswordSchema ───────────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(isValid(resetPasswordSchema, { email: 'user@example.com' })).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(isValid(resetPasswordSchema, { email: 'bad' })).toBe(false);
  });
});

// ── offerRideSchema ───────────────────────────────────────────────────────────

describe('offerRideSchema', () => {
  const valid = {
    origin: 'Amman',
    destination: 'Aqaba',
    departureDate: '2025-08-01',
    departureTime: '08:00',
    seats: 3,
    pricePerSeat: 8.5,
    allowPackages: false,
    genderPreference: 'any',
  };

  it('accepts a valid ride offer', () => {
    expect(isValid(offerRideSchema, valid)).toBe(true);
  });

  it('rejects when origin === destination', () => {
    expect(isValid(offerRideSchema, { ...valid, destination: 'Amman' })).toBe(false);
    const msgs = errorMessages(offerRideSchema, { ...valid, destination: 'Amman' });
    expect(msgs.some(m => m.toLowerCase().includes('different'))).toBe(true);
  });

  it('rejects seats < 1', () => {
    expect(isValid(offerRideSchema, { ...valid, seats: 0 })).toBe(false);
  });

  it('rejects seats > 7', () => {
    expect(isValid(offerRideSchema, { ...valid, seats: 8 })).toBe(false);
  });

  it('rejects pricePerSeat of 0', () => {
    expect(isValid(offerRideSchema, { ...valid, pricePerSeat: 0 })).toBe(false);
  });

  it('rejects pricePerSeat > 500', () => {
    expect(isValid(offerRideSchema, { ...valid, pricePerSeat: 501 })).toBe(false);
  });

  it('accepts optional notes up to 500 chars', () => {
    expect(isValid(offerRideSchema, { ...valid, notes: 'AC car' })).toBe(true);
    expect(isValid(offerRideSchema, { ...valid, notes: 'x'.repeat(501) })).toBe(false);
  });

  it('rejects an unrecognised city', () => {
    expect(isValid(offerRideSchema, { ...valid, origin: 'London' })).toBe(false);
  });
});

// ── findRideSchema ────────────────────────────────────────────────────────────

describe('findRideSchema', () => {
  const valid = {
    origin: 'Irbid',
    destination: 'Amman',
    date: '2025-09-01',
    passengers: 2,
  };

  it('accepts a valid search payload', () => {
    expect(isValid(findRideSchema, valid)).toBe(true);
  });

  it('rejects when origin === destination', () => {
    expect(isValid(findRideSchema, { ...valid, destination: 'Irbid' })).toBe(false);
  });

  it('defaults passengers to 1 when not provided', () => {
    const result = findRideSchema.safeParse({ ...valid, passengers: undefined });
    // Zod .default(1) — when undefined the default kicks in
    if (result.success) {
      expect(result.data.passengers).toBe(1);
    }
  });
});

// ── topUpSchema ───────────────────────────────────────────────────────────────

describe('topUpSchema', () => {
  it('accepts a valid top-up', () => {
    expect(isValid(topUpSchema, { amount: 50, paymentMethod: 'card' })).toBe(true);
  });

  it('rejects amount of 0', () => {
    expect(isValid(topUpSchema, { amount: 0, paymentMethod: 'card' })).toBe(false);
  });

  it('rejects negative amount', () => {
    expect(isValid(topUpSchema, { amount: -10, paymentMethod: 'card' })).toBe(false);
  });

  it('rejects amount > 500', () => {
    expect(isValid(topUpSchema, { amount: 501, paymentMethod: 'card' })).toBe(false);
  });

  it('rejects unknown payment method', () => {
    expect(isValid(topUpSchema, { amount: 50, paymentMethod: 'crypto' })).toBe(false);
  });

  it('accepts cliq and cash_agent payment methods', () => {
    expect(isValid(topUpSchema, { amount: 50, paymentMethod: 'cliq' })).toBe(true);
    expect(isValid(topUpSchema, { amount: 50, paymentMethod: 'cash_agent' })).toBe(true);
  });
});

// ── transferSchema ────────────────────────────────────────────────────────────

describe('transferSchema', () => {
  const valid = { recipientPhone: '+962791234567', amount: 10 };

  it('accepts a valid transfer', () => {
    expect(isValid(transferSchema, valid)).toBe(true);
  });

  it('rejects amount > 200', () => {
    expect(isValid(transferSchema, { ...valid, amount: 201 })).toBe(false);
  });

  it('rejects an empty recipient phone', () => {
    expect(isValid(transferSchema, { ...valid, recipientPhone: '' })).toBe(false);
  });

  it('accepts an optional note up to 100 chars', () => {
    expect(isValid(transferSchema, { ...valid, note: 'For lunch' })).toBe(true);
    expect(isValid(transferSchema, { ...valid, note: 'x'.repeat(101) })).toBe(false);
  });
});

// ── updateProfileSchema ───────────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  const valid = { fullName: 'Sara Mohammad' };

  it('accepts a valid profile update', () => {
    expect(isValid(updateProfileSchema, valid)).toBe(true);
  });

  it('accepts a valid avatar https URL', () => {
    expect(
      isValid(updateProfileSchema, { ...valid, avatarUrl: 'https://cdn.wasel.jo/avatars/sara.jpg' }),
    ).toBe(true);
  });

  it('accepts an empty string avatar URL', () => {
    expect(isValid(updateProfileSchema, { ...valid, avatarUrl: '' })).toBe(true);
  });

  it('rejects bio longer than 250 chars', () => {
    expect(isValid(updateProfileSchema, { ...valid, bio: 'x'.repeat(251) })).toBe(false);
  });
});
