/**
 * Unit tests â€” src/utils/validation.ts
 * Covers all Zod schemas: auth, rides, packages, wallet, profile.
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
} from '@/utils/validation';

// â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('signInSchema', () => {
  it('accepts valid credentials', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: 'Password1!' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({ email: 'not-an-email', password: 'Password1!' });
    expect(result.success).toBe(false);
  });

  it('rejects password shorter than 8 chars', () => {
    const result = signInSchema.safeParse({ email: 'user@example.com', password: 'short' });
    expect(result.success).toBe(false);
  });

  it('lowercases the email', () => {
    const result = signInSchema.safeParse({ email: 'USER@EXAMPLE.COM', password: 'Password1!' });
    if (result.success) {
      expect(result.data.email).toBe('user@example.com');
    }
  });
});

describe('signUpSchema', () => {
  const valid = {
    fullName: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    password: 'Secure@123',
    confirmPassword: 'Secure@123',
    phone: '+962791234567',
  };

  it('accepts a valid registration payload', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: 'Different1!' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i: any) => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects a name shorter than 2 characters', () => {
    expect(signUpSchema.safeParse({ ...valid, fullName: 'A' }).success).toBe(false);
  });

  it('accepts optional phone as empty string', () => {
    expect(signUpSchema.safeParse({ ...valid, phone: '' }).success).toBe(true);
  });

  it('rejects phone not in E.164 format', () => {
    expect(signUpSchema.safeParse({ ...valid, phone: '0791234567' }).success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(resetPasswordSchema.safeParse({ email: 'test@wasel.jo' }).success).toBe(true);
  });

  it('rejects missing email', () => {
    expect(resetPasswordSchema.safeParse({}).success).toBe(false);
  });
});

// â”€â”€ Rides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('offerRideSchema', () => {
  const valid = {
    origin: 'Amman',
    destination: 'Aqaba',
    departureDate: '2026-04-15',
    departureTime: '08:00',
    seats: 3,
    pricePerSeat: 12.5,
    allowPackages: false,
    genderPreference: 'any',
  };

  it('accepts a valid offer ride payload', () => {
    expect(offerRideSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects same origin and destination', () => {
    const result = offerRideSchema.safeParse({ ...valid, destination: 'Amman' });
    expect(result.success).toBe(false);
  });

  it('rejects zero or negative price', () => {
    expect(offerRideSchema.safeParse({ ...valid, pricePerSeat: 0 }).success).toBe(false);
    expect(offerRideSchema.safeParse({ ...valid, pricePerSeat: -5 }).success).toBe(false);
  });

  it('rejects seats outside 1â€“7 range', () => {
    expect(offerRideSchema.safeParse({ ...valid, seats: 0 }).success).toBe(false);
    expect(offerRideSchema.safeParse({ ...valid, seats: 8 }).success).toBe(false);
  });

  it('accepts optional notes up to 500 chars', () => {
    expect(offerRideSchema.safeParse({ ...valid, notes: 'Quiet ride preferred' }).success).toBe(true);
  });
});

describe('findRideSchema', () => {
  const valid = { origin: 'Irbid', destination: 'Amman', date: '2026-04-15', passengers: 2 };

  it('accepts valid search params', () => {
    expect(findRideSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects same origin and destination', () => {
    expect(findRideSchema.safeParse({ ...valid, destination: 'Irbid' }).success).toBe(false);
  });

  it('defaults passengers to 1', () => {
    const result = findRideSchema.safeParse({ origin: 'Zarqa', destination: 'Aqaba', date: '2026-04-15' });
    if (result.success) expect(result.data.passengers).toBe(1);
  });
});

// â”€â”€ Packages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('sendPackageSchema', () => {
  const valid = {
    senderName: 'Khalid Al-Omar',
    senderPhone: '+962791111111',
    recipientName: 'Sara Nasser',
    recipientPhone: '+962792222222',
    origin: 'Amman',
    destination: 'Irbid',
    description: 'Handmade pottery set',
    weightKg: 3.5,
    fragile: true,
  };

  it('accepts a valid package payload', () => {
    expect(sendPackageSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects weight over 50 kg', () => {
    expect(sendPackageSchema.safeParse({ ...valid, weightKg: 51 }).success).toBe(false);
  });

  it('rejects empty description', () => {
    expect(sendPackageSchema.safeParse({ ...valid, description: 'AB' }).success).toBe(false);
  });
});

// â”€â”€ Wallet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('topUpSchema', () => {
  it('accepts a valid top-up', () => {
    expect(topUpSchema.safeParse({ amount: 50, paymentMethod: 'card' }).success).toBe(true);
  });

  it('rejects amount over 500', () => {
    expect(topUpSchema.safeParse({ amount: 501, paymentMethod: 'card' }).success).toBe(false);
  });

  it('rejects zero or negative amount', () => {
    expect(topUpSchema.safeParse({ amount: 0, paymentMethod: 'cliq' }).success).toBe(false);
  });

  it('defaults paymentMethod to card', () => {
    const result = topUpSchema.safeParse({ amount: 20 });
    if (result.success) expect(result.data.paymentMethod).toBe('card');
  });
});

describe('transferSchema', () => {
  const valid = { recipientPhone: '+962799999999', amount: 15 };

  it('accepts a valid transfer', () => {
    expect(transferSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects amount over 200', () => {
    expect(transferSchema.safeParse({ ...valid, amount: 201 }).success).toBe(false);
  });
});

// â”€â”€ Profile â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('updateProfileSchema', () => {
  it('accepts valid profile update', () => {
    expect(updateProfileSchema.safeParse({ fullName: 'Lina Khatib', phone: '+962711234567' }).success).toBe(true);
  });

  it('rejects bio over 250 chars', () => {
    const longBio = 'x'.repeat(251);
    expect(updateProfileSchema.safeParse({ fullName: 'Test', bio: longBio }).success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const valid = {
    currentPassword: 'OldPassword1!',
    newPassword: 'NewSecure@99',
    confirmNewPassword: 'NewSecure@99',
  };

  it('accepts matching passwords', () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects mismatched new passwords', () => {
    expect(changePasswordSchema.safeParse({ ...valid, confirmNewPassword: 'Wrong1!' }).success).toBe(false);
  });

  it('rejects new password without uppercase or number', () => {
    expect(changePasswordSchema.safeParse({ ...valid, newPassword: 'alllowercase!!', confirmNewPassword: 'alllowercase!!' }).success).toBe(false);
  });
});

