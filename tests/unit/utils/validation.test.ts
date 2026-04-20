/**
 * Validation Schemas — Unit Tests
 *
 * Covers every Zod schema in utils/validation.ts:
 *   signIn, signUp, resetPassword, offerRide, findRide,
 *   sendPackage, updateProfile, changePassword, topUp, transfer
 *
 * Standard: Every schema must reject invalid input and accept valid input
 * with no false positives or false negatives.
 */
import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  resetPasswordSchema,
  offerRideSchema,
  findRideSchema,
  sendPackageSchema,
  updateProfileSchema,
  changePasswordSchema,
  topUpSchema,
  transferSchema,
} from '../../../src/utils/validation';

// ── Helpers ───────────────────────────────────────────────────────────────────

function valid<T>(schema: { safeParse: (v: unknown) => { success: boolean } }, data: T) {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('Unexpected validation failure:', JSON.stringify((result as any).error?.issues));
  }
  expect(result.success).toBe(true);
}

function invalid<T>(schema: { safeParse: (v: unknown) => { success: boolean } }, data: T) {
  expect(schema.safeParse(data).success).toBe(false);
}

// ── 1. Sign-in schema ─────────────────────────────────────────────────────────

describe('signInSchema', () => {
  it('accepts valid credentials', () => {
    valid(signInSchema, { email: 'user@example.com', password: 'SecurePass1!' });
  });

  it('rejects missing email', () => {
    invalid(signInSchema, { password: 'SecurePass1!' });
  });

  it('rejects malformed email', () => {
    invalid(signInSchema, { email: 'not-an-email', password: 'SecurePass1!' });
  });

  it('rejects password shorter than 8 characters', () => {
    invalid(signInSchema, { email: 'user@example.com', password: 'short' });
  });

  it('rejects missing password', () => {
    invalid(signInSchema, { email: 'user@example.com' });
  });

  it('normalises email to lowercase', () => {
    const result = signInSchema.safeParse({
      email: 'USER@EXAMPLE.COM',
      password: 'SecurePass1!',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });
});

// ── 2. Sign-up schema ─────────────────────────────────────────────────────────

describe('signUpSchema', () => {
  const base = {
    fullName: 'Ahmad Al-Najjar',
    email: 'ahmad@wasel.jo',
    password: 'ValidPass1!',
    confirmPassword: 'ValidPass1!',
    phone: '+962791234567',
  };

  it('accepts a complete valid payload', () => {
    valid(signUpSchema, base);
  });

  it('accepts without optional phone', () => {
    valid(signUpSchema, { ...base, phone: '' });
  });

  it('rejects mismatched passwords', () => {
    invalid(signUpSchema, { ...base, confirmPassword: 'DifferentPass1!' });
  });

  it('rejects name shorter than 2 characters', () => {
    invalid(signUpSchema, { ...base, fullName: 'A' });
  });

  it('rejects name longer than 80 characters', () => {
    invalid(signUpSchema, { ...base, fullName: 'A'.repeat(81) });
  });

  it('rejects phone in wrong format (no +)', () => {
    invalid(signUpSchema, { ...base, phone: '0791234567' });
  });

  it('rejects password shorter than 8 chars', () => {
    invalid(signUpSchema, { ...base, password: 'Short1!', confirmPassword: 'Short1!' });
  });

  it('rejects password exceeding 128 chars', () => {
    const long = 'A'.repeat(129);
    invalid(signUpSchema, { ...base, password: long, confirmPassword: long });
  });
});

// ── 3. Reset password schema ──────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  it('accepts a valid email', () => {
    valid(resetPasswordSchema, { email: 'reset@wasel.jo' });
  });

  it('rejects an invalid email', () => {
    invalid(resetPasswordSchema, { email: 'not-email' });
  });

  it('rejects empty email', () => {
    invalid(resetPasswordSchema, { email: '' });
  });
});

// ── 4. Offer ride schema ──────────────────────────────────────────────────────

describe('offerRideSchema', () => {
  const base = {
    origin: 'Amman' as const,
    destination: 'Aqaba' as const,
    departureDate: '2026-06-15',
    departureTime: '08:00',
    seats: 3,
    pricePerSeat: 12.5,
    genderPreference: 'any' as const,
    allowPackages: false,
  };

  it('accepts a complete valid offer', () => {
    valid(offerRideSchema, base);
  });

  it('rejects same origin and destination', () => {
    invalid(offerRideSchema, { ...base, destination: 'Amman' });
  });

  it('rejects seats < 1', () => {
    invalid(offerRideSchema, { ...base, seats: 0 });
  });

  it('rejects seats > 7', () => {
    invalid(offerRideSchema, { ...base, seats: 8 });
  });

  it('rejects negative price', () => {
    invalid(offerRideSchema, { ...base, pricePerSeat: -5 });
  });

  it('rejects price above 500', () => {
    invalid(offerRideSchema, { ...base, pricePerSeat: 501 });
  });

  it('rejects notes longer than 500 chars', () => {
    invalid(offerRideSchema, { ...base, notes: 'X'.repeat(501) });
  });

  it('rejects invalid gender preference', () => {
    invalid(offerRideSchema, { ...base, genderPreference: 'unknown' });
  });

  it('accepts optional notes', () => {
    valid(offerRideSchema, { ...base, notes: 'No smoking please' });
  });
});

// ── 5. Find ride schema ───────────────────────────────────────────────────────

describe('findRideSchema', () => {
  const base = {
    from: 'Irbid',
    to: 'Amman',
    date: '2026-06-15',
    passengers: 2,
  };

  it('accepts a valid search', () => {
    valid(findRideSchema, base);
  });

  it('rejects same origin and destination', () => {
    invalid(findRideSchema, { ...base, to: 'Irbid' });
  });

  it('rejects passengers < 1', () => {
    invalid(findRideSchema, { ...base, passengers: 0 });
  });

  it('rejects passengers > 7', () => {
    invalid(findRideSchema, { ...base, passengers: 8 });
  });

  it('defaults passengers to 1 when omitted', () => {
    const result = findRideSchema.safeParse({ ...base, passengers: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.passengers).toBe(1);
  });
});

// ── 6. Send package schema ────────────────────────────────────────────────────

describe('sendPackageSchema', () => {
  const base = {
    senderPhone: '+962791234567',
    recipientName: 'Sara Haddad',
    recipientPhone: '+962799876543',
    description: 'Books and documents',
    weight: 2.5,
  };

  it('accepts a complete valid package', () => {
    valid(sendPackageSchema, base);
  });

  it('rejects weight above 50 kg', () => {
    invalid(sendPackageSchema, { ...base, weight: 51 });
  });

  it('rejects negative weight', () => {
    invalid(sendPackageSchema, { ...base, weight: -1 });
  });

  it('rejects description shorter than 3 chars', () => {
    invalid(sendPackageSchema, { ...base, description: 'AB' });
  });

  it('rejects missing sender phone', () => {
    invalid(sendPackageSchema, { ...base, senderPhone: '' });
  });

  it('accepts optional declared value', () => {
    valid(sendPackageSchema, { ...base, declaredValue: 150 });
  });

  it('rejects declared value above 10000', () => {
    invalid(sendPackageSchema, { ...base, declaredValue: 10001 });
  });
});

// ── 7. Update profile schema ──────────────────────────────────────────────────

describe('updateProfileSchema', () => {
  const base = {
    fullName: 'Nour Khalil',
    phone: '+96279000000',
  };

  it('accepts minimal valid input', () => {
    valid(updateProfileSchema, base);
  });

  it('accepts optional bio and avatar', () => {
    valid(updateProfileSchema, {
      ...base,
      bio: 'Frequent traveller between Amman and Irbid',
      avatarUrl: 'https://example.com/avatar.jpg',
    });
  });

  it('rejects bio longer than 250 chars', () => {
    invalid(updateProfileSchema, { ...base, bio: 'X'.repeat(251) });
  });

  it('rejects invalid avatar URL', () => {
    invalid(updateProfileSchema, { ...base, avatarUrl: 'not-a-url' });
  });

  it('accepts empty avatar URL (clearing avatar)', () => {
    valid(updateProfileSchema, { ...base, avatarUrl: '' });
  });
});

// ── 8. Change password schema ─────────────────────────────────────────────────

describe('changePasswordSchema', () => {
  const base = {
    currentPassword: 'OldPass1!',
    newPassword: 'NewPass2@',
    confirmPassword: 'NewPass2@',
  };

  it('accepts a valid password change', () => {
    valid(changePasswordSchema, base);
  });

  it('rejects new password without uppercase letter', () => {
    invalid(changePasswordSchema, {
      ...base,
      newPassword: 'newpass2@',
      confirmPassword: 'newpass2@',
    });
  });

  it('rejects new password without a number', () => {
    invalid(changePasswordSchema, {
      ...base,
      newPassword: 'NewPassw!',
      confirmPassword: 'NewPassw!',
    });
  });

  it('rejects mismatched new passwords', () => {
    invalid(changePasswordSchema, {
      ...base,
      confirmPassword: 'DifferentNew2@',
    });
  });
});

// ── 9. Top-up schema ──────────────────────────────────────────────────────────

describe('topUpSchema', () => {
  it('accepts a valid top-up', () => {
    valid(topUpSchema, { amount: 50, paymentMethod: 'card' });
  });

  it('rejects amount of 0', () => {
    invalid(topUpSchema, { amount: 0, paymentMethod: 'card' });
  });

  it('rejects negative amount', () => {
    invalid(topUpSchema, { amount: -10, paymentMethod: 'card' });
  });

  it('rejects amount above 500', () => {
    invalid(topUpSchema, { amount: 501, paymentMethod: 'card' });
  });

  it('rejects invalid payment method', () => {
    invalid(topUpSchema, { amount: 10, paymentMethod: 'bitcoin' });
  });

  it('accepts cliq payment method', () => {
    valid(topUpSchema, { amount: 25, paymentMethod: 'cliq' });
  });

  it('accepts bank_transfer payment method', () => {
    valid(topUpSchema, { amount: 10, paymentMethod: 'bank_transfer' });
  });

  it('defaults payment method to card', () => {
    const result = topUpSchema.safeParse({ amount: 20 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.paymentMethod).toBe('card');
  });
});

// ── 10. Transfer schema ───────────────────────────────────────────────────────

describe('transferSchema', () => {
  const base = {
    recipientPhone: '+962791234567',
    amount: 15,
  };

  it('accepts a valid transfer', () => {
    valid(transferSchema, base);
  });

  it('rejects missing recipient phone', () => {
    invalid(transferSchema, { amount: 15 });
  });

  it('rejects amount of 0', () => {
    invalid(transferSchema, { ...base, amount: 0 });
  });

  it('rejects amount above 200', () => {
    invalid(transferSchema, { ...base, amount: 201 });
  });

  it('accepts an optional note', () => {
    valid(transferSchema, { ...base, note: 'Shared taxi fare' });
  });

  it('rejects note longer than 100 chars', () => {
    invalid(transferSchema, { ...base, note: 'X'.repeat(101) });
  });
});
