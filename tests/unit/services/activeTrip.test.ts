/**
 * activeTrip service — Unit Tests
 *
 * Covers: getActiveTrip, setActiveTrip, patchActiveTrip, clearActiveTrip.
 * All network calls are mocked; no real HTTP requests are made.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockFetch, mockGetAuthDetails } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockGetAuthDetails: vi.fn().mockResolvedValue({ token: 'test-token', userId: 'user-abc' }),
}));

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  fetchWithRetry: (...args: any[]) => mockFetch(...args),
  getAuthDetails: (...args: any[]) => mockGetAuthDetails(...args),
}));

import { activeTripAPI, type ActiveTrip } from '../../../src/services/activeTrip';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_TRIP: ActiveTrip = {
  id: 'trip-001',
  from: 'Amman',
  fromAr: 'عمان',
  to: 'Aqaba',
  toAr: 'العقبة',
  driver: {
    name: 'Khalid',
    nameAr: 'خالد',
    rating: 4.8,
    trips: 320,
    img: '',
    phone: '+962790000000',
    initials: 'KH',
  },
  vehicle: { model: 'Toyota Camry', color: 'White', plate: 'ABC-1234', year: 2022 },
  price: 18.5,
  passengers: 1,
  eta: '12 min',
  duration: '2h 40m',
  status: 'en_route_to_pickup',
  shareCode: 'WSSL-XYZ',
  tier: 'economy',
  startedAt: '2026-04-06T08:00:00.000Z',
  userId: 'user-abc',
};

function jsonResponse(body: unknown, ok = true) {
  return Promise.resolve({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('activeTripAPI.getActiveTrip()', () => {
  it('returns the active trip on success', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    const result = await activeTripAPI.getActiveTrip();
    expect(result).not.toBeNull();
    expect(result!.id).toBe('trip-001');
    expect(result!.from).toBe('Amman');
    expect(result!.status).toBe('en_route_to_pickup');
  });

  it('returns null when the server responds with a non-OK status', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}, false));
    const result = await activeTripAPI.getActiveTrip();
    expect(result).toBeNull();
  });

  it('returns null when the response has no activeTrip property', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ something: 'else' }));
    const result = await activeTripAPI.getActiveTrip();
    expect(result).toBeNull();
  });

  it('returns null on network error without throwing', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await activeTripAPI.getActiveTrip();
    expect(result).toBeNull();
  });

  it('returns null on AbortError', async () => {
    const abort = new DOMException('Aborted', 'AbortError');
    mockFetch.mockRejectedValueOnce(abort);
    const result = await activeTripAPI.getActiveTrip();
    expect(result).toBeNull();
  });

  it('sends the Authorization header', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.getActiveTrip();
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });

  it('calls the correct endpoint URL', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.getActiveTrip();
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/active-trip');
  });

  it('preserves all driver fields from response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    const result = await activeTripAPI.getActiveTrip();
    expect(result!.driver.name).toBe('Khalid');
    expect(result!.driver.rating).toBe(4.8);
    expect(result!.driver.trips).toBe(320);
  });

  it('preserves vehicle fields from response', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    const result = await activeTripAPI.getActiveTrip();
    expect(result!.vehicle.model).toBe('Toyota Camry');
    expect(result!.vehicle.plate).toBe('ABC-1234');
  });
});

describe('activeTripAPI.setActiveTrip()', () => {
  const { userId: _u, startedAt: _s, ...tripInput } = MOCK_TRIP;

  it('returns the created active trip on success', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    const result = await activeTripAPI.setActiveTrip(tripInput);
    expect(result).not.toBeNull();
    expect(result!.id).toBe('trip-001');
  });

  it('returns null when server responds with non-OK status', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ error: 'Server error' }, false));
    const result = await activeTripAPI.setActiveTrip(tripInput);
    expect(result).toBeNull();
  });

  it('returns null on network failure without throwing', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Timeout'));
    const result = await activeTripAPI.setActiveTrip(tripInput);
    expect(result).toBeNull();
  });

  it('uses POST method', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.setActiveTrip(tripInput);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('POST');
  });

  it('includes Content-Type application/json header', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.setActiveTrip(tripInput);
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('serialises trip data in the request body', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.setActiveTrip(tripInput);
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.id).toBe('trip-001');
    expect(body.from).toBe('Amman');
  });
});

describe('activeTripAPI.patchActiveTrip()', () => {
  it('returns the patched trip on success', async () => {
    const patched = { ...MOCK_TRIP, status: 'arriving' as const, eta: '2 min' };
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: patched }));
    const result = await activeTripAPI.patchActiveTrip({ status: 'arriving', eta: '2 min' });
    expect(result!.status).toBe('arriving');
    expect(result!.eta).toBe('2 min');
  });

  it('returns null when server responds with non-OK status', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({}, false));
    const result = await activeTripAPI.patchActiveTrip({ status: 'arriving' });
    expect(result).toBeNull();
  });

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Net error'));
    const result = await activeTripAPI.patchActiveTrip({ eta: '5 min' });
    expect(result).toBeNull();
  });

  it('uses PATCH method', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.patchActiveTrip({ status: 'driver_arrived' });
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('PATCH');
  });

  it('sends only the patched fields in body', async () => {
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: MOCK_TRIP }));
    await activeTripAPI.patchActiveTrip({ eta: '3 min' });
    const [, init] = mockFetch.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toEqual({ eta: '3 min' });
  });

  it('can patch updatedAt alongside status', async () => {
    const ts = new Date().toISOString();
    mockFetch.mockReturnValueOnce(jsonResponse({ activeTrip: { ...MOCK_TRIP, updatedAt: ts } }));
    const result = await activeTripAPI.patchActiveTrip({ status: 'completed', updatedAt: ts });
    expect(result!.updatedAt).toBe(ts);
  });
});

describe('activeTripAPI.clearActiveTrip()', () => {
  it('returns true when the server responds with OK', async () => {
    mockFetch.mockReturnValueOnce({ ok: true, json: () => Promise.resolve({}) });
    const result = await activeTripAPI.clearActiveTrip();
    expect(result).toBe(true);
  });

  it('returns false when server responds with non-OK status', async () => {
    mockFetch.mockReturnValueOnce({ ok: false, json: () => Promise.resolve({}) });
    const result = await activeTripAPI.clearActiveTrip();
    expect(result).toBe(false);
  });

  it('returns false on network error without throwing', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
    const result = await activeTripAPI.clearActiveTrip();
    expect(result).toBe(false);
  });

  it('uses DELETE method', async () => {
    mockFetch.mockReturnValueOnce({ ok: true, json: () => Promise.resolve({}) });
    await activeTripAPI.clearActiveTrip();
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).method).toBe('DELETE');
  });

  it('calls the correct endpoint', async () => {
    mockFetch.mockReturnValueOnce({ ok: true, json: () => Promise.resolve({}) });
    await activeTripAPI.clearActiveTrip();
    const [url] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/active-trip');
  });

  it('sends the Authorization header on clear', async () => {
    mockFetch.mockReturnValueOnce({ ok: true, json: () => Promise.resolve({}) });
    await activeTripAPI.clearActiveTrip();
    const [, init] = mockFetch.mock.calls[0]!;
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer test-token' });
  });
});
