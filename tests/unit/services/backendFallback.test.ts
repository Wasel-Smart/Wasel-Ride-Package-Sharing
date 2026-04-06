import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetAuthDetails = vi.fn();
const mockFetchWithRetry = vi.fn();
const mockSupabaseSignUp = vi.fn();
const mockCreateDirectTrip = vi.fn();
const mockSearchDirectTrips = vi.fn();
const mockGetDirectProfile = vi.fn();
const mockUpdateDirectProfile = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('../../../src/services/core', () => ({
  API_URL: '',
  publicAnonKey: '',
  fetchWithRetry: (...args: any[]) => mockFetchWithRetry(...args),
  getAuthDetails: () => mockGetAuthDetails(),
  supabase: {
    auth: {
      signUp: (...args: any[]) => mockSupabaseSignUp(...args),
    },
  },
}));

vi.mock('../../../src/services/directSupabase', () => ({
  calculateDirectPrice: vi.fn(),
  createDirectTrip: (...args: any[]) => mockCreateDirectTrip(...args),
  deleteDirectTrip: vi.fn(),
  getDirectDriverTrips: vi.fn(),
  getDirectTripById: vi.fn(),
  getDirectProfile: (...args: any[]) => mockGetDirectProfile(...args),
  searchDirectTrips: (...args: any[]) => mockSearchDirectTrips(...args),
  updateDirectBookingStatus: vi.fn(),
  updateDirectProfile: (...args: any[]) => mockUpdateDirectProfile(...args),
  updateDirectTrip: vi.fn(),
  createDirectBooking: vi.fn(),
  getDirectTripBookings: vi.fn(),
  getDirectUserBookings: vi.fn(),
}));

vi.mock('../../../src/utils/env', () => ({
  getConfig: () => mockGetConfig(),
  getAuthCallbackUrl: vi.fn(() => 'http://localhost:3000/app/auth/callback'),
}));

import { authAPI } from '../../../src/services/auth';
import { tripsAPI } from '../../../src/services/trips';

describe('backend fallback services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthDetails.mockResolvedValue({ token: 'token-123', userId: 'user-123' });
    mockGetConfig.mockReturnValue({
      allowDirectSupabaseFallback: true,
    });
  });

  it('uses Supabase auth signUp directly when the edge auth endpoint is unavailable', async () => {
    mockSupabaseSignUp.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    });

    const result = await authAPI.signUp('sara@example.com', 'secret123', 'Sara', 'Ali', '+962790000000');

    expect(mockSupabaseSignUp).toHaveBeenCalledWith({
      email: 'sara@example.com',
      password: 'secret123',
      options: {
        emailRedirectTo: 'http://localhost:3000/app/auth/callback',
        data: {
          full_name: 'Sara Ali',
          phone: '+962790000000',
        },
      },
    });
    expect(result.user.id).toBe('user-123');
  });

  it('reads the profile directly from Supabase when the edge profile endpoint is unavailable', async () => {
    mockGetDirectProfile.mockResolvedValue({
      id: 'user-123',
      full_name: 'Sara Ali',
      email: 'sara@example.com',
    });

    const result = await authAPI.getProfile();

    expect(mockGetDirectProfile).toHaveBeenCalledWith('user-123');
    expect(result.profile?.full_name).toBe('Sara Ali');
  });

  it('updates the profile directly through Supabase when the edge update endpoint returns an error', async () => {
    mockFetchWithRetry.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'edge failed' }),
    });
    mockUpdateDirectProfile.mockResolvedValue({
      id: 'user-123',
      phone_number: '+962791234567',
    });

    const result = await authAPI.updateProfile({ phone_number: '+962791234567' });

    expect(mockUpdateDirectProfile).toHaveBeenCalledWith('user-123', { phone_number: '+962791234567' });
    expect(result.success).toBe(true);
    expect(result.profile?.phone_number).toBe('+962791234567');
  });

  it('fails closed for profile updates when direct fallback is disabled', async () => {
    mockGetConfig.mockReturnValue({
      allowDirectSupabaseFallback: false,
    });
    mockFetchWithRetry.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'edge failed' }),
    });

    const result = await authAPI.updateProfile({ phone_number: '+962791234567' });

    expect(mockUpdateDirectProfile).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.error).toContain(
      'Profile update is temporarily unavailable while the secure backend is degraded. Please try again shortly.',
    );
  });

  it('creates trips through the direct Supabase adapter when the edge trip endpoint is unavailable', async () => {
    mockCreateDirectTrip.mockResolvedValue({
      id: 'trip-123',
      from: 'Amman',
      to: 'Irbid',
      date: '2026-04-01',
      time: '08:00',
      seats: 3,
      price: 6,
      driver: {
        id: 'user-123',
        name: 'Sara Ali',
        rating: 4.9,
        verified: true,
      },
    });

    const result = await tripsAPI.createTrip({
      from: 'Amman',
      to: 'Irbid',
      date: '2026-04-01',
      time: '08:00',
      seats: 3,
      price: 6,
    });

    expect(mockCreateDirectTrip).toHaveBeenCalledWith('user-123', {
      from: 'Amman',
      to: 'Irbid',
      date: '2026-04-01',
      time: '08:00',
      seats: 3,
      price: 6,
    });
    expect(result.id).toBe('trip-123');
  });

  it('searches trips through the direct Supabase adapter when the public edge search endpoint is unavailable', async () => {
    mockSearchDirectTrips.mockResolvedValue([
      {
        id: 'trip-1',
        from: 'Amman',
        to: 'Zarqa',
        date: '2026-04-02',
        time: '09:30',
        seats: 2,
        price: 4,
        driver: {
          id: 'driver-1',
          name: 'Wasel Driver',
          rating: 5,
          verified: false,
        },
      },
    ]);

    const result = await tripsAPI.searchTrips('Amman', 'Zarqa', '2026-04-02', 2);

    expect(mockSearchDirectTrips).toHaveBeenCalledWith('Amman', 'Zarqa', '2026-04-02', 2);
    expect(result).toHaveLength(1);
  });
});
