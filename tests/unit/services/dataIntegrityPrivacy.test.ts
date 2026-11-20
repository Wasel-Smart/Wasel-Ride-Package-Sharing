import { describe, expect, it } from 'vitest';
import { sanitizePayload } from '../../../src/services/dataIntegrity';

describe('data-flow telemetry privacy', () => {
  it('redacts personal identifiers and credentials recursively', () => {
    const sanitized = sanitizePayload({
      email: 'passenger@example.com',
      phoneNumber: '+962790000000',
      fullName: 'Passenger Name',
      userId: 'user-123',
      pickupLocation: 'Home address',
      nested: {
        otp: '123456',
        walletPin: '9876',
        authorization: 'Bearer secret',
        safeCount: 2,
      },
    });

    expect(sanitized).toEqual({
      email: '[redacted]',
      phoneNumber: '[redacted]',
      fullName: '[redacted]',
      userId: '[redacted]',
      pickupLocation: '[redacted]',
      nested: {
        otp: '[redacted]',
        walletPin: '[redacted]',
        authorization: '[redacted]',
        safeCount: 2,
      },
    });
  });

  it('redacts avatar URLs rather than retaining private image locations', () => {
    expect(sanitizePayload({ avatar_url: 'https://cdn.example.test/private/avatar.jpg' })).toEqual({
      avatar_url: '[redacted]',
    });
  });
});
