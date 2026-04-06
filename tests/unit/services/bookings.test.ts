/**
 * bookings service — Unit Tests
 *
 * Covers: createBooking, getUserBookings, getTripBookings, updateBookingStatus.
 * Both the edge-API path and the direct-Supabase fallback path are exercised.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockFetch,
  mockGetAuthDetails,
  mockCreateDirectBooking,
  mockGetDirectUserBookings,
  mockGetDirectTripBookings,
  mockUpdateDirectBookingStatus,
} = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  mockCreateDirectBooking: vi.fn(),
  mockGetDirectUserBookings: vi.fn(),
  mockGetDirectTripBookings: vi.fn(),
  mockUpdateDirectBookingStatus: vi.fn(),
}));

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  fetchWithRetry: (...a: any[]) => mockFetch(...a),
  getAuthDetails: (...a: any[]) => mockGetAuthDetails(...a),
}));

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectBooking: (...a: any[]) => mockCreateDirectBooking(...a),
  getDirectUserBookings: (...a: any[]) => mockGetDirectUserBookings(...a),
  getDirectTripBookings: (...a: any[]) => mockGetDirectTripBookings(...a),
  updateDirectBookingStatus: (...a: any[]) => mockUpdateDirectBookingStatus(...a),
}));

vi.mock('../../../src/services/dataIntegrity', () => ({
  buildTraceHeaders: (_id: string, headers: Record<string, string>) => headers,
  bookingCreatePayloadSchema: { parse: (v: unknown) => v },
  withDataIntegrity: async ({
    execute,
    payload,
  }: {
    execute: (ctx: { requestId: string; payload: unknown }) => unknown;
    payload: unknown;
  }) => execute({ requestId: 'req-test', payload }),
}));

import { bookingsAPI } from '../../../src/services/bookings';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BOOKING_RESULT = {
  id: 'bk-1',
  tripId: 'trip-1',
  userId: 'u1',
  seatsRequested: 2,
  status: 'pending',
  createdAt: '2026-04-06T08:00:00.000Z',
};

function ok(body: unknown) {
  return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
}

function fail(body: unknown = { error: 'Server error' }) {
  return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve(body) });
}

beforeEach(() => vi.clearAllMocks());

// ── createBooking ─────────────────────────────────────────────────────────────

describe('bookingsAPI.createBooking()', () => {
  it('returns the booking from the edge API on success', async () => {
    mockFetch.mockReturnValueOnce(ok(BOOKING_RESULT));
    const result = await bookingsAPI.createBooking('trip-1', 2);
    expect(result.id).toBe('bk-1');
    expect(result.seatsRequested).toBe(2);
  });

  it('uses POST method', async () => {
    mockFetch.mockReturnValueOnce(ok(BOOKING_RESULT));
    await bookingsAPI.createBooking('trip-1', 2);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('includes Authorization header', async () => {
    mockFetch.mockReturnValueOnce(ok(BOOKING_RESULT));
    await bookingsAPI.createBooking('trip-1', 2);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('serialises trip_id and seats_requested in body', async () => {
    mockFetch.mockReturnValueOnce(ok(BOOKING_RESULT));
    await bookingsAPI.createBooking('trip-1', 2, 'Stop A', 'Stop B');
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.trip_id).toBe('trip-1');
    expect(body.seats_requested).toBe(2);
    expect(body.pickup_stop).toBe('Stop A');
    expect(body.dropoff_stop).toBe('Stop B');
  });

  it('falls back to directSupabase on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network down'));
    mockCreateDirectBooking.mockResolvedValueOnce(BOOKING_RESULT);
    const result = await bookingsAPI.createBooking('trip-1', 2);
    expect(mockCreateDirectBooking).toHaveBeenCalledOnce();
    expect(result.id).toBe('bk-1');
  });

  it('throws when API returns error body', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'No seats available' }));
    await expect(bookingsAPI.createBooking('trip-1', 5)).rejects.toThrow('No seats available');
  });

  it('accepts optional metadata', async () => {
    mockFetch.mockReturnValueOnce(ok(BOOKING_RESULT));
    const result = await bookingsAPI.createBooking('trip-1', 1, undefined, undefined, { promo: 'SAVE10' });
    expect(result.id).toBe('bk-1');
  });
});

// ── getUserBookings ───────────────────────────────────────────────────────────

describe('bookingsAPI.getUserBookings()', () => {
  it('returns the user bookings from the edge API', async () => {
    mockFetch.mockReturnValueOnce(ok([BOOKING_RESULT]));
    const result = await bookingsAPI.getUserBookings();
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('bk-1');
  });

  it('includes Authorization header', async () => {
    mockFetch.mockReturnValueOnce(ok([BOOKING_RESULT]));
    await bookingsAPI.getUserBookings();
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('includes the userId in the URL', async () => {
    mockFetch.mockReturnValueOnce(ok([BOOKING_RESULT]));
    await bookingsAPI.getUserBookings();
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('u1');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail());
    await expect(bookingsAPI.getUserBookings()).rejects.toThrow();
  });
});
