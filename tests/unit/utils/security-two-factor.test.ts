import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFetchWithRetry,
  mockGetAuthDetails,
  mockGetConfig,
  mockLogger,
} = vi.hoisted(() => ({
  mockFetchWithRetry: vi.fn(),
  mockGetAuthDetails: vi.fn(),
  mockGetConfig: vi.fn(),
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
  getAuthDetails: () => mockGetAuthDetails(),
}));

vi.mock('@/utils/env', () => ({
  getConfig: () => mockGetConfig(),
}));

vi.mock('@/utils/monitoring', () => ({
  logger: mockLogger,
}));

import {
  disable2FA,
  enable2FA,
  isTwoFactorAvailable,
  verify2FACode,
} from '@/utils/security';

describe('security two-factor api helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockReturnValue({ enableTwoFactorAuth: true });
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
  });

  it('detects when server-backed 2FA is available', () => {
    expect(isTwoFactorAvailable()).toBe(true);
  });

  it('starts setup through the secure backend', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({
        setup: {
          secret: 'SECRET',
          otpauthUrl: 'otpauth://totp/Wasel:user@example.com?secret=SECRET',
          backupCodes: ['CODE1234'],
        },
      }),
    });

    await expect(enable2FA('user-123')).resolves.toEqual({
      secret: 'SECRET',
      otpauthUrl: 'otpauth://totp/Wasel:user@example.com?secret=SECRET',
      backupCodes: ['CODE1234'],
    });

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/auth/2fa/setup',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('verifies a code through the secure backend', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true }),
    });

    await expect(verify2FACode('user-123', '123456')).resolves.toBe(true);
  });

  it('disables 2FA through the secure backend', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({ disabled: true }),
    });

    await expect(disable2FA('user-123', '123456')).resolves.toBe(true);
  });

  it('returns false when backend verification fails', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Invalid verification code' }),
    });

    await expect(verify2FACode('user-123', '000000')).resolves.toBe(false);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
