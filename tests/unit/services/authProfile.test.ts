import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAuthDetails = vi.fn();
const mockFetchWithRetry = vi.fn();
const mockGetDirectProfile = vi.fn();
const mockGetDirectVerificationRecord = vi.fn();

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  publicAnonKey: 'anon-key',
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
  getAuthDetails: () => mockGetAuthDetails(),
  supabase: {
    auth: {
      getSession: vi.fn(),
      refreshSession: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/directSupabase', () => ({
  getDirectProfile: (...args: any[]) => mockGetDirectProfile(...args),
  getDirectVerificationRecord: (...args: any[]) => mockGetDirectVerificationRecord(...args),
  updateDirectProfile: vi.fn(),
}));

import { authAPI } from '../../../src/services/auth';

describe('authAPI.getProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockGetDirectVerificationRecord.mockResolvedValue(null);
  });

  it('merges verification record data into the profile returned by the backend', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'user-123',
        full_name: 'Sara Ali',
      }),
    });
    mockGetDirectVerificationRecord.mockResolvedValue({
      sanad_status: 'verified',
      document_status: 'verified',
      verification_level: 'level_3',
      verification_timestamp: '2026-04-01T08:00:00.000Z',
    });

    const result = await authAPI.getProfile();

    expect(result.profile).toMatchObject({
      id: 'user-123',
      full_name: 'Sara Ali',
      sanad_verified: true,
      verified: true,
      verification_level: 'level_3',
    });
  });

  it('uses the direct Supabase profile path when the edge endpoint is unavailable', async () => {
    mockFetchWithRetry.mockResolvedValue({ ok: false, json: async () => ({}) });
    mockGetDirectProfile.mockResolvedValue({
      id: 'user-123',
      full_name: 'Sara Ali',
      verification_level: 'level_1',
    });

    const result = await authAPI.getProfile();

    expect(mockGetDirectProfile).toHaveBeenCalledWith('user-123');
    expect(result.profile).toMatchObject({
      id: 'user-123',
      full_name: 'Sara Ali',
      verification_level: 'level_1',
    });
  });
});
