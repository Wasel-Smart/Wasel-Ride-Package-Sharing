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

let insertedBookingPayload: Record<string, unknown> | null = null;
let tripUpdatePayload: Record<string, unknown> | null = null;

function createDbMock() {
  return {
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
          update(payload: Record<string, unknown>) {
            tripUpdatePayload = payload;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }

      if (table === 'bookings') {
        return {
          select(selection: string) {
            if (selection === '*') {
              return {
                eq() {
                  return {
                    eq() {
                      return {
                        in() {
                          return {
                            order() {
                              return {
                                limit() {
                                  return {
                                    maybeSingle: async () => ({ data: null, error: null }),
                                  };
                                },
                              };
                            },
                          };
                        },
                      };
                    },
                  };
                },
              };
            }

            return {
              eq() {
                return {
                  neq: async () => ({ data: [], error: null }),
                };
              },
            };
          },
          insert(payload: Record<string, unknown>) {
            insertedBookingPayload = payload;
            return {
              select() {
                return {
                  single: async () => ({
                    data: {
                      booking_id: 'booking-1',
                      ...payload,
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
    insertedBookingPayload = null;
    tripUpdatePayload = null;
  });

  it('persists all booking fields instead of only returning them in memory', async () => {
    const result = await createDirectBooking({
      tripId: 'trip-1',
      userId: 'auth-user-1',
      seatsRequested: 2,
      pickup: 'University Street',
      dropoff: '7th Circle',
      metadata: { total_price: 14 },
      bookingStatus: 'confirmed',
    });

    expect(insertedBookingPayload).toMatchObject({
      trip_id: 'trip-1',
      passenger_id: 'canonical-user-1',
      seats_requested: 2,
      pickup_location: 'University Street',
      dropoff_location: '7th Circle',
      price_per_seat: 7,
      total_price: 14,
      amount: 14,
      booking_status: 'confirmed',
    });
    expect(tripUpdatePayload).toMatchObject({
      available_seats: 1,
      trip_status: 'open',
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
