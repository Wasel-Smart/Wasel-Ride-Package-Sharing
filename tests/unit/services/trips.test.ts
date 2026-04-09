/**
 * trips service — Unit Tests
 *
 * Covers: createTrip, searchTrips, getTripById, getDriverTrips,
 *         updateTrip, deleteTrip, publishTrip, calculatePrice.
 *
 * When the edge API is unavailable (API_URL / publicAnonKey empty) the
 * service falls back to the direct-Supabase helpers — both paths are
 * tested here.  All network and Supabase calls are mocked.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockFetch,
  mockGetAuthDetails,
  mockCreateDirectTrip,
  mockSearchDirectTrips,
  mockGetDirectTripById,
  mockGetDirectDriverTrips,
  mockUpdateDirectTrip,
  mockDeleteDirectTrip,
  mockCalculateDirectPrice,
} = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
  mockCreateDirectTrip: vi.fn(),
  mockSearchDirectTrips: vi.fn(),
  mockGetDirectTripById: vi.fn(),
  mockGetDirectDriverTrips: vi.fn(),
  mockUpdateDirectTrip: vi.fn(),
  mockDeleteDirectTrip: vi.fn(),
  mockCalculateDirectPrice: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  publicAnonKey: 'anon-key',
  fetchWithRetry: (...a: any[]) => mockFetch(...a),
  getAuthDetails: (...a: any[]) => mockGetAuthDetails(...a),
}));

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectTrip: (...a: any[]) => mockCreateDirectTrip(...a),
  searchDirectTrips: (...a: any[]) => mockSearchDirectTrips(...a),
  getDirectTripById: (...a: any[]) => mockGetDirectTripById(...a),
  getDirectDriverTrips: (...a: any[]) => mockGetDirectDriverTrips(...a),
  updateDirectTrip: (...a: any[]) => mockUpdateDirectTrip(...a),
  deleteDirectTrip: (...a: any[]) => mockDeleteDirectTrip(...a),
  calculateDirectPrice: (...a: any[]) => mockCalculateDirectPrice(...a),
}));

vi.mock('../../../src/services/dataIntegrity', () => ({
  buildTraceHeaders: (_id: string, headers: Record<string, string>) => headers,
  tripCreatePayloadSchema: { parse: (v: unknown) => v },
  tripUpdatePayloadSchema: { parse: (v: unknown) => v },
  withDataIntegrity: async ({
    execute,
    payload,
  }: {
    execute: (ctx: { requestId: string; payload: unknown }) => unknown;
    payload: unknown;
  }) => execute({ requestId: 'req-test', payload }),
}));

import { tripsAPI, type TripCreatePayload } from '../../../src/services/trips';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TRIP_RESULT = {
  id: 'trip-1',
  from: 'Amman',
  to: 'Irbid',
  date: '2026-05-01',
  time: '09:00',
  seats: 3,
  price: 8,
  driver: { id: 'drv-1', name: 'Ahmad', rating: 4.9, verified: true },
};

const CREATE_PAYLOAD: TripCreatePayload = {
  from: 'Amman',
  to: 'Irbid',
  date: '2026-05-01',
  time: '09:00',
  seats: 3,
  price: 8,
};

function ok(body: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  });
}

function fail(body: unknown = { error: 'Server error' }, status = 500) {
  return Promise.resolve({
    ok: false,
    status,
    statusText: 'Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(body),
  });
}

// ── createTrip ────────────────────────────────────────────────────────────────

describe('tripsAPI.createTrip()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the new trip from the edge API on success', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    const result = await tripsAPI.createTrip(CREATE_PAYLOAD);
    expect(result.id).toBe('trip-1');
    expect(result.from).toBe('Amman');
  });

  it('uses POST method', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    await tripsAPI.createTrip(CREATE_PAYLOAD);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('serialises payload in the request body', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    await tripsAPI.createTrip(CREATE_PAYLOAD);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.from).toBe('Amman');
    expect(body.seats).toBe(3);
  });

  it('falls back to directSupabase on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network down'));
    mockCreateDirectTrip.mockResolvedValueOnce(TRIP_RESULT);
    const result = await tripsAPI.createTrip(CREATE_PAYLOAD);
    expect(mockCreateDirectTrip).toHaveBeenCalledOnce();
    expect(result.id).toBe('trip-1');
  });

  it('throws when the edge API returns a non-OK response and no fallback succeeds', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Validation failed' }));
    await expect(tripsAPI.createTrip(CREATE_PAYLOAD)).rejects.toThrow('Validation failed');
  });

  it('sends Authorization header', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    await tripsAPI.createTrip(CREATE_PAYLOAD);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('handles optional fields (prayer, gender, note)', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    const result = await tripsAPI.createTrip({
      ...CREATE_PAYLOAD,
      prayer: true,
      gender: 'female',
      note: 'Quiet ride please',
    });
    expect(result.id).toBe('trip-1');
  });

  it('handles package trip fields', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    const result = await tripsAPI.createTrip({
      ...CREATE_PAYLOAD,
      acceptsPackages: true,
      packageCapacity: 'medium',
      packageNote: 'Handle with care',
    });
    expect(result.id).toBe('trip-1');
  });
});

// ── searchTrips ───────────────────────────────────────────────────────────────

describe('tripsAPI.searchTrips()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns trips from the edge API', async () => {
    mockFetch.mockReturnValueOnce(ok([TRIP_RESULT]));
    const results = await tripsAPI.searchTrips('Amman', 'Irbid', '2026-05-01', 2);
    expect(results).toHaveLength(1);
    expect(results[0]!.from).toBe('Amman');
  });

  it('builds correct query params', async () => {
    mockFetch.mockReturnValueOnce(ok([TRIP_RESULT]));
    await tripsAPI.searchTrips('Amman', 'Irbid', '2026-05-01', 2);
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('from=Amman');
    expect(url).toContain('to=Irbid');
    expect(url).toContain('date=2026-05-01');
    expect(url).toContain('seats=2');
  });

  it('throws when API returns non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Failed to search trips' }));
    await expect(tripsAPI.searchTrips('Amman', 'Irbid')).rejects.toThrow('Failed to search trips');
  });

  it('omits optional params when not supplied', async () => {
    mockFetch.mockReturnValueOnce(ok([]));
    await tripsAPI.searchTrips();
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).not.toContain('from=');
    expect(url).not.toContain('to=');
  });
});

// ── getTripById ───────────────────────────────────────────────────────────────

describe('tripsAPI.getTripById()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the trip from the edge API', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    const result = await tripsAPI.getTripById('trip-1');
    expect(result.id).toBe('trip-1');
  });

  it('includes the trip ID in the URL', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    await tripsAPI.getTripById('trip-1');
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('trip-1');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Failed to fetch trip' }));
    await expect(tripsAPI.getTripById('trip-x')).rejects.toThrow('Failed to fetch trip');
  });
});

// ── getDriverTrips ────────────────────────────────────────────────────────────

describe('tripsAPI.getDriverTrips()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the driver\'s trips from the edge API', async () => {
    mockFetch.mockReturnValueOnce(ok([TRIP_RESULT]));
    const results = await tripsAPI.getDriverTrips();
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('trip-1');
  });

  it('sends the Authorization header', async () => {
    mockFetch.mockReturnValueOnce(ok([TRIP_RESULT]));
    await tripsAPI.getDriverTrips();
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Failed to fetch driver trips' }));
    await expect(tripsAPI.getDriverTrips()).rejects.toThrow('Failed to fetch driver trips');
  });
});

// ── updateTrip ────────────────────────────────────────────────────────────────

describe('tripsAPI.updateTrip()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the updated trip on success', async () => {
    const updated = { ...TRIP_RESULT, seats: 2 };
    mockFetch.mockReturnValueOnce(ok(updated));
    const result = await tripsAPI.updateTrip('trip-1', { seats: 2 });
    expect(result.seats).toBe(2);
  });

  it('uses PUT method', async () => {
    mockFetch.mockReturnValueOnce(ok(TRIP_RESULT));
    await tripsAPI.updateTrip('trip-1', { price: 9 });
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('PUT');
  });

  it('falls back to directSupabase on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network down'));
    mockUpdateDirectTrip.mockResolvedValueOnce({ ...TRIP_RESULT, price: 9 });
    const result = await tripsAPI.updateTrip('trip-1', { price: 9 });
    expect(mockUpdateDirectTrip).toHaveBeenCalledWith('trip-1', { price: 9 });
    expect(result.price).toBe(9);
  });

  it('throws when API returns error and no fallback', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Update rejected' }));
    await expect(tripsAPI.updateTrip('trip-1', { status: 'cancelled' })).rejects.toThrow('Update rejected');
  });

  it('can update status to cancelled', async () => {
    const cancelled = { ...TRIP_RESULT };
    mockFetch.mockReturnValueOnce(ok(cancelled));
    const result = await tripsAPI.updateTrip('trip-1', { status: 'cancelled' });
    expect(result.id).toBe('trip-1');
  });
});

// ── deleteTrip ────────────────────────────────────────────────────────────────

describe('tripsAPI.deleteTrip()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success on OK response', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    const result = await tripsAPI.deleteTrip('trip-1');
    expect(result.success).toBe(true);
  });

  it('uses DELETE method', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    await tripsAPI.deleteTrip('trip-1');
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('includes the trip ID in the URL', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    await tripsAPI.deleteTrip('trip-1');
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('trip-1');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Not found' }));
    await expect(tripsAPI.deleteTrip('trip-x')).rejects.toThrow('Not found');
  });

  it('sends Authorization header', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    await tripsAPI.deleteTrip('trip-1');
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer tok' });
  });
});

// ── publishTrip ───────────────────────────────────────────────────────────────

describe('tripsAPI.publishTrip()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns success on OK response', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    const result = await tripsAPI.publishTrip('trip-1');
    expect(result.success).toBe(true);
  });

  it('uses POST method', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    await tripsAPI.publishTrip('trip-1');
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('calls the /publish endpoint', async () => {
    mockFetch.mockReturnValueOnce(ok({ success: true }));
    await tripsAPI.publishTrip('trip-1');
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/publish');
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Cannot publish' }));
    await expect(tripsAPI.publishTrip('trip-1')).rejects.toThrow('Cannot publish');
  });
});

// ── calculatePrice ────────────────────────────────────────────────────────────

describe('tripsAPI.calculatePrice()', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns calculated price from edge API', async () => {
    mockFetch.mockReturnValueOnce(ok({ price: 12.5, currency: 'JOD' }));
    const result = await tripsAPI.calculatePrice('passenger', undefined, 80);
    expect(result.price).toBe(12.5);
    expect(result.currency).toBe('JOD');
  });

  it('uses POST method', async () => {
    mockFetch.mockReturnValueOnce(ok({ price: 5, currency: 'JOD' }));
    await tripsAPI.calculatePrice('package', 2, 30);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('serialises all calculation params', async () => {
    mockFetch.mockReturnValueOnce(ok({ price: 5, currency: 'JOD' }));
    await tripsAPI.calculatePrice('package', 2, 30, 4);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.type).toBe('package');
    expect(body.weight).toBe(2);
    expect(body.distance_km).toBe(30);
    expect(body.base_price).toBe(4);
  });

  it('throws on non-OK response', async () => {
    mockFetch.mockReturnValueOnce(fail({ error: 'Failed to calculate price' }));
    await expect(tripsAPI.calculatePrice('passenger')).rejects.toThrow('Failed to calculate price');
  });
});
