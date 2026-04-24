import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockEnsureBookingEligibility = vi.fn();
const mockMapProfileFromContext = vi.fn(() => ({ phone_verified: true }));
const mockRecordDirectGrowthEvent = vi.fn(async () => undefined);
const mockProcessReferralConversionForPassenger = vi.fn(async () => undefined);
const mockBuildUserContext = vi.fn(async () => ({
  user: { id: 'canonical-user-1' },
  wallet: null,
  verification: null,
  driver: null,
  authUserId: 'auth-user-1',
}));

let bookingRpcPayload: Record<string, unknown> | null = null;

function createDbMock() {
  return {
    rpc(functionName: string, payload: Record<string, unknown>) {
      if (functionName !== 'app_create_booking_request') {
        throw new Error(`Unexpected RPC: ${functionName}`);
      }

      bookingRpcPayload = payload;
      return Promise.resolve({
        data: {
          booking_id: 'booking-1',
          trip_id: payload.p_trip_id,
          passenger_id: 'canonical-user-1',
          seats_requested: payload.p_seats_requested,
          pickup_location: payload.p_pickup_location,
          dropoff_location: payload.p_dropoff_location,
          price_per_seat: 7,
          total_price: payload.p_total_price,
          amount: payload.p_total_price,
          booking_status: payload.p_runtime_status,
          status: payload.p_runtime_status,
          seat_number: payload.p_seat_number,
        },
        error: null,
      });
    },
    from(table: string) {
      if (table === 'trips') {
        return {
          select() {
            return {
              eq() {
                return {
                  single: async () => ({
                    data: {
                      trip_id: 'trip-1',
                      available_seats: 3,
                      price_per_seat: 7,
                      trip_status: 'open',
                    },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };
}

vi.mock('../../../src/services/directSupabase/helpers', () => ({
  ensureBookingEligibility: (...args: unknown[]) => mockEnsureBookingEligibility(...args),
  getDb: () => createDbMock(),
  mapBookingRow: (row: unknown) => row,
  mapProfileFromContext: (...args: unknown[]) => mockMapProfileFromContext(...args),
  mapTripRow: vi.fn(),
  buildTripNotes: vi.fn(),
  normalizePackageCapacity: vi.fn(),
  normalizeTripStatus: vi.fn(),
  normalizeBookingStatus: (value: string) => value,
  getWalletByCanonicalUserId: vi.fn(),
  toNumber: (value: unknown, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  },
}));

vi.mock('../../../src/services/directSupabase/userContext.ts', () => ({
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

vi.mock('../../../src/utils/jordanLocations', () => ({
  normalizeJordanLocation: (value: string) => value,
  routeMatchesLocationPair: vi.fn(),
}));

import { createDirectBooking } from '../../../src/services/directSupabase/trips';

describe('direct Supabase booking integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookingRpcPayload = null;
  });

  it('persists all booking fields through the atomic booking RPC instead of only returning them in memory', async () => {
    const result = await createDirectBooking({
      tripId: 'trip-1',
      userId: 'auth-user-1',
      seatsRequested: 2,
      pickup: 'University Street',
      dropoff: '7th Circle',
      metadata: { total_price: 14 },
      bookingStatus: 'confirmed',
    });

    expect(bookingRpcPayload).toMatchObject({
      p_trip_id: 'trip-1',
      p_seats_requested: 2,
      p_pickup_location: 'University Street',
      p_dropoff_location: '7th Circle',
      p_runtime_status: 'confirmed',
      p_total_price: 14,
      p_seat_number: 1,
    });
    expect(result).toMatchObject({
      booking: {
        seats_requested: 2,
        pickup_location: 'University Street',
        dropoff_location: '7th Circle',
      },
    });
  });
});
