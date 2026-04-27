import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRpc = vi.fn();
const mockTripSingle = vi.fn();
const mockBookingSingle = vi.fn();
const mockBuildUserContext = vi.fn();
const mockMapProfileFromContext = vi.fn();
const mockEnsureBookingEligibility = vi.fn();
const mockMapBookingRow = vi.fn((row: Record<string, unknown>) => ({
  id: row.booking_id ?? row.id,
  ...row,
}));
const mockRecordDirectGrowthEvent = vi.fn();
const mockProcessReferralConversionForPassenger = vi.fn();

vi.mock('../../../src/services/directSupabase/helpers', () => ({
  getDb: () => ({
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (table: string) => {
      if (table === 'trips') {
        return {
          select: () => ({
            eq: () => ({
              single: (...args: unknown[]) => mockTripSingle(...args),
            }),
          }),
        };
      }

      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: (...args: unknown[]) => mockBookingSingle(...args),
            }),
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  }),
  mapProfileFromContext: (...args: unknown[]) => mockMapProfileFromContext(...args),
  mapTripRow: vi.fn(),
  mapBookingRow: (...args: unknown[]) => mockMapBookingRow(...args),
  buildTripNotes: vi.fn(),
  normalizePackageCapacity: vi.fn(),
  normalizeTripStatus: vi.fn(),
  normalizeBookingStatus: (status?: string | null) =>
    status === 'accepted' ? 'confirmed' : status === 'rejected' ? 'cancelled' : status || 'pending',
  ensureBookingEligibility: (...args: unknown[]) => mockEnsureBookingEligibility(...args),
  toNumber: (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
}));

vi.mock('../../../src/services/directSupabase/userContext', () => ({
  buildUserContext: (...args: unknown[]) => mockBuildUserContext(...args),
  ensureDriverForUser: vi.fn(),
  getLatestVerificationRecord: vi.fn(),
}));

vi.mock('../../../src/services/directSupabase/growth', () => ({
  recordDirectGrowthEvent: (...args: unknown[]) => mockRecordDirectGrowthEvent(...args),
}));

vi.mock('../../../src/services/directSupabase/referrals', () => ({
  processReferralConversionForPassenger: (...args: unknown[]) =>
    mockProcessReferralConversionForPassenger(...args),
}));

vi.mock('../../../src/services/dataIntegrity', () => ({
  bookingCreatePayloadSchema: { parse: (value: unknown) => value },
  profileUpdatePayloadSchema: { parse: (value: unknown) => value },
  tripCreatePayloadSchema: { parse: (value: unknown) => value },
  tripUpdatePayloadSchema: { parse: (value: unknown) => value },
  withDataIntegrity: async ({
    execute,
    payload,
  }: {
    execute: (ctx: { payload: unknown }) => unknown;
    payload: unknown;
  }) => execute({ payload }),
}));

import {
  createDirectBooking,
  updateDirectBookingStatus,
} from '../../../src/services/directSupabase/trips';

describe('directSupabase booking mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildUserContext.mockResolvedValue({
      user: { id: 'canonical-user-1' },
    });
    mockMapProfileFromContext.mockReturnValue({
      id: 'auth-user-1',
      phone_verified: true,
      wallet_status: 'active',
      role: 'passenger',
    });
    mockEnsureBookingEligibility.mockReturnValue(undefined);
    mockTripSingle.mockResolvedValue({
      data: {
        trip_id: 'trip-1',
        available_seats: 3,
        price_per_seat: 7.5,
        trip_status: 'open',
      },
      error: null,
    });
    mockRecordDirectGrowthEvent.mockResolvedValue(undefined);
    mockProcessReferralConversionForPassenger.mockResolvedValue(undefined);
  });

  it('routes direct booking creation through the atomic booking RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        booking_id: 'booking-1',
        trip_id: 'trip-1',
        passenger_id: 'canonical-user-1',
        seats_requested: 2,
        status: 'pending_driver',
        booking_status: 'pending_payment',
      },
      error: null,
    });

    const result = await createDirectBooking({
      tripId: 'trip-1',
      userId: 'auth-user-1',
      seatsRequested: 2,
      pickup: 'Amman',
      dropoff: 'Irbid',
      bookingStatus: 'pending_driver',
    });

    expect(mockRpc).toHaveBeenCalledWith('app_create_booking_request', {
      p_trip_id: 'trip-1',
      p_seats_requested: 2,
      p_pickup_location: 'Amman',
      p_dropoff_location: 'Irbid',
      p_runtime_status: 'pending_driver',
      p_total_price: 15,
      p_seat_number: 1,
    });
    expect(result.booking.id).toBe('booking-1');
  });

  it('routes booking status updates through the atomic status RPC', async () => {
    mockBookingSingle.mockResolvedValue({
      data: {
        booking_id: 'booking-1',
        trip_id: 'trip-1',
        passenger_id: 'canonical-user-1',
        amount: 15,
        status: 'pending_driver',
        booking_status: 'pending_payment',
      },
      error: null,
    });
    mockRpc.mockResolvedValueOnce({
      data: {
        booking_id: 'booking-1',
        trip_id: 'trip-1',
        passenger_id: 'canonical-user-1',
        amount: 15,
        status: 'confirmed',
        booking_status: 'confirmed',
      },
      error: null,
    });

    const result = await updateDirectBookingStatus('booking-1', 'accepted');

    expect(mockRpc).toHaveBeenCalledWith('app_update_booking_runtime_status', {
      p_booking_id: 'booking-1',
      p_runtime_status: 'confirmed',
    });
    expect(result.id).toBe('booking-1');
    expect(mockProcessReferralConversionForPassenger).toHaveBeenCalledWith('canonical-user-1');
  });
});
