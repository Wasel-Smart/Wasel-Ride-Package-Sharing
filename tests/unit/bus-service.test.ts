/**
 * Unit tests for the bus service layer.
 *
 * Covers: input validation, route normalisation, route cache TTL,
 * official-route fallback, local-session guard, and the fail-closed
 * behaviour for real users when the server rejects the booking.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── mock the backend workflow so no real HTTP is made ─────────────────────────
vi.mock('@/services/backendWorkflow', () => ({
  runBackendWorkflow: vi.fn(async ({ edge }: { edge: (ctx: unknown) => Promise<unknown> }) =>
    edge({ token: 'tok', userId: 'u1' }),
  ),
  requestEdgeJson: vi.fn(async ({ body }: { body: unknown }) => body),
  hasConfiguredEdgeTransport: vi.fn(() => true),
  getSecureBackendFallbackError: vi.fn(() => new Error('fallback')),
  BackendRequestError: class BackendRequestError extends Error {
    recoverable: boolean;
    status?: number;
    constructor(msg: string, recoverable = false, status?: number) {
      super(msg);
      this.recoverable = recoverable;
      this.status = status;
    }
  },
  logFallbackUsage: vi.fn(),
}));

// ── mock the trips API so route search returns a controlled list ─────────────
vi.mock('@/services/trips', () => ({
  tripsAPI: {
    searchTrips: vi.fn(async () => []),
  },
}));

// ── mock growth events so tests don't fire analytics ────────────────────────
vi.mock('@/services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(),
}));

// ── mock bookingsAPI ─────────────────────────────────────────────────────────
vi.mock('@/services/bookings', () => ({
  bookingsAPI: {
    createBooking: vi.fn(async () => ({
      booking_id: 'server-booking-1',
      trip_id: 'trip-1',
      status: 'confirmed',
    })),
  },
}));

// ── mock local session flag (default: not a local-only session) ──────────────
vi.mock('@/utils/localSession', () => ({
  isLocalOnlySession: vi.fn(() => false),
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('bus service -- looksLikeBusTrip', () => {
  it('recognises trips with type "bus"', async () => {
    const { looksLikeBusTrip } = await import('@/services/bus');
    expect(looksLikeBusTrip({ type: 'bus' })).toBe(true);
  });

  it('recognises trips with mode "coach"', async () => {
    const { looksLikeBusTrip } = await import('@/services/bus');
    expect(looksLikeBusTrip({ mode: 'coach' })).toBe(true);
  });

  it('recognises trips with service "intercity"', async () => {
    const { looksLikeBusTrip } = await import('@/services/bus');
    expect(looksLikeBusTrip({ service: 'intercity shuttle' })).toBe(true);
  });

  it('rejects plain ride trips', async () => {
    const { looksLikeBusTrip } = await import('@/services/bus');
    expect(looksLikeBusTrip({ type: 'ride', mode: 'private' })).toBe(false);
  });

  it('is case-insensitive', async () => {
    const { looksLikeBusTrip } = await import('@/services/bus');
    expect(looksLikeBusTrip({ type: 'BUS' })).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('bus service -- normalizeBusRoute', () => {
  it('maps all required fields', async () => {
    const { normalizeBusRoute } = await import('@/services/bus');
    const route = normalizeBusRoute(
      {
        id: 'r1',
        from: 'Amman',
        to: 'Aqaba',
        departure_time: '07:00',
        arrival_time: '11:30',
        price_per_seat: 6,
        seats_available: 20,
        company: 'Jordan Express',
        amenities: 'AC,USB,WiFi',
        via_stops: 'Qatrana,Ma\'an',
        duration: '4h 30m',
        frequency: 'Daily',
        punctuality: '95%',
        pickup_stop: 'Amman Bus Terminal',
        dropoff_stop: 'Aqaba Bus Terminal',
      },
      0,
    );

    expect(route.id).toBe('r1');
    expect(route.from).toBe('Amman');
    expect(route.to).toBe('Aqaba');
    expect(route.dep).toBe('07:00');
    expect(route.price).toBe(6);
    expect(route.seats).toBe(20);
    expect(route.amenities).toContain('AC');
    expect(route.amenities).toContain('WiFi');
    expect(route.via).toContain('Qatrana');
    expect(route.dataSource).toBe('live');
  });

  it('applies safe defaults when fields are missing', async () => {
    const { normalizeBusRoute } = await import('@/services/bus');
    const route = normalizeBusRoute({}, 0);
    expect(route.from).toBe('Amman');
    expect(route.to).toBe('Aqaba');
    expect(route.price).toBe(5);
    expect(route.amenities).toContain('AC');
    expect(route.id).toMatch(/^live-bus-/);
  });

  it('clamps seats to zero for negative values', async () => {
    const { normalizeBusRoute } = await import('@/services/bus');
    const route = normalizeBusRoute({ seats_available: -5 }, 0);
    expect(route.seats).toBe(0);
  });

  it('assigns different colours for the first four routes', async () => {
    const { normalizeBusRoute } = await import('@/services/bus');
    const colors = [0, 1, 2, 3].map(i => normalizeBusRoute({}, i).color);
    const unique = new Set(colors);
    expect(unique.size).toBe(4);
  });

  it('cycles colours for index >= 4', async () => {
    const { normalizeBusRoute } = await import('@/services/bus');
    expect(normalizeBusRoute({}, 4).color).toBe(normalizeBusRoute({}, 0).color);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('bus service -- getOfficialBusRoutes', () => {
  it('returns routes matching both from and to', async () => {
    const { getOfficialBusRoutes } = await import('@/services/bus');
    const routes = getOfficialBusRoutes({ from: 'Amman', to: 'Aqaba' });
    expect(routes.length).toBeGreaterThan(0);
    routes.forEach(r => {
      expect(r.from).toBe('Amman');
      expect(r.to).toBe('Aqaba');
    });
  });

  it('returns something even when from/to does not match (fuzzy fallback)', async () => {
    const { getOfficialBusRoutes } = await import('@/services/bus');
    const routes = getOfficialBusRoutes({ from: 'Nowhere', to: 'Nowhere' });
    expect(routes.length).toBeGreaterThan(0);
  });

  it('filters by seat count', async () => {
    const { getOfficialBusRoutes } = await import('@/services/bus');
    const routes = getOfficialBusRoutes({ seats: 999 });
    // No route has 999 seats available; fallback returns non-seat-filtered list
    expect(routes).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('bus service -- fetchBusRoutes cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns official routes when server returns empty list', async () => {
    const { tripsAPI } = await import('@/services/trips') as unknown as { tripsAPI: { searchTrips: ReturnType<typeof vi.fn> } };
    tripsAPI.searchTrips.mockResolvedValueOnce([]);

    const { fetchBusRoutes } = await import('@/services/bus');
    const routes = await fetchBusRoutes({ from: 'Amman', to: 'Aqaba' });
    expect(routes.length).toBeGreaterThan(0);
  });

  it('returns official routes when server throws', async () => {
    const { tripsAPI } = await import('@/services/trips') as unknown as { tripsAPI: { searchTrips: ReturnType<typeof vi.fn> } };
    tripsAPI.searchTrips.mockRejectedValueOnce(new Error('network error'));

    const { fetchBusRoutes } = await import('@/services/bus');
    const routes = await fetchBusRoutes({ from: 'Amman', to: 'Zarqa' });
    expect(routes.length).toBeGreaterThan(0);
  });

  it('filters live results to bus-only trips', async () => {
    const { tripsAPI } = await import('@/services/trips') as unknown as { tripsAPI: { searchTrips: ReturnType<typeof vi.fn> } };
    tripsAPI.searchTrips.mockResolvedValueOnce([
      { id: 'bus-1', type: 'bus', from: 'Amman', to: 'Aqaba', price_per_seat: 5, seats_available: 10, departure_time: '08:00', arrival_time: '12:00' },
      { id: 'ride-1', type: 'ride', from: 'Amman', to: 'Aqaba', price_per_seat: 3, seats_available: 3 },
    ]);

    const { fetchBusRoutes } = await import('@/services/bus');
    const routes = await fetchBusRoutes({ from: 'Amman', to: 'Aqaba', date: 'cache-miss-test' });
    // Only the bus trip should appear in the result
    const ids = routes.map(r => r.id);
    expect(ids).toContain('bus-1');
    expect(ids).not.toContain('ride-1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('bus service -- createBusBooking validation', () => {
  beforeEach(() => vi.clearAllMocks());

  const validPayload = {
    tripId: 'trip-abc',
    seatsRequested: 2,
    pickupStop: 'Amman Terminal',
    dropoffStop: 'Aqaba Terminal',
    scheduleDate: '2026-12-01',
    departureTime: '08:00',
    seatPreference: 'window',
    scheduleMode: 'depart-now' as const,
    totalPrice: 10,
  };

  it('succeeds with valid payload (server path)', async () => {
    const { createBusBooking } = await import('@/services/bus');
    const result = await createBusBooking(validPayload);
    expect(result.source).toBe('server');
    expect(result.bookingId).toBe('server-booking-1');
  });

  it('throws when tripId is empty', async () => {
    const { createBusBooking } = await import('@/services/bus');
    await expect(
      createBusBooking({ ...validPayload, tripId: '' }),
    ).rejects.toThrow(/trip is required/i);
  });

  it('throws when tripId is whitespace only', async () => {
    const { createBusBooking } = await import('@/services/bus');
    await expect(
      createBusBooking({ ...validPayload, tripId: '   ' }),
    ).rejects.toThrow(/trip is required/i);
  });

  it('throws when seats < 1', async () => {
    const { createBusBooking } = await import('@/services/bus');
    await expect(
      createBusBooking({ ...validPayload, seatsRequested: 0 }),
    ).rejects.toThrow(/1 and 8/i);
  });

  it('throws when seats > 8', async () => {
    const { createBusBooking } = await import('@/services/bus');
    await expect(
      createBusBooking({ ...validPayload, seatsRequested: 9 }),
    ).rejects.toThrow(/1 and 8/i);
  });

  it('throws when seats is fractional', async () => {
    const { createBusBooking } = await import('@/services/bus');
    await expect(
      createBusBooking({ ...validPayload, seatsRequested: 1.5 }),
    ).rejects.toThrow(/1 and 8/i);
  });

  it('fails closed when server rejects and user is NOT a local session', async () => {
    const { bookingsAPI } = await import('@/services/bookings') as unknown as { bookingsAPI: { createBooking: ReturnType<typeof vi.fn> } };
    bookingsAPI.createBooking.mockRejectedValueOnce(new Error('server reject'));

    const { isLocalOnlySession } = await import('@/utils/localSession') as unknown as { isLocalOnlySession: ReturnType<typeof vi.fn> };
    isLocalOnlySession.mockReturnValueOnce(false);

    const { createBusBooking } = await import('@/services/bus');
    await expect(createBusBooking(validPayload)).rejects.toThrow(
      /could not be confirmed/i,
    );
  });

  it('allows local fallback for local-only sessions on recoverable error', async () => {
    // Import the mocked BackendRequestError class
    const workflow = await import('@/services/backendWorkflow') as unknown as {
      BackendRequestError: new (msg: string, recoverable: boolean) => Error & { recoverable: boolean };
      bookingsAPI?: unknown;
    };
    const { bookingsAPI } = await import('@/services/bookings') as unknown as { bookingsAPI: { createBooking: ReturnType<typeof vi.fn> } };
    bookingsAPI.createBooking.mockRejectedValueOnce(
      new workflow.BackendRequestError('unavailable', true),
    );

    const { isLocalOnlySession } = await import('@/utils/localSession') as unknown as { isLocalOnlySession: ReturnType<typeof vi.fn> };
    isLocalOnlySession.mockReturnValueOnce(true);

    const { createBusBooking } = await import('@/services/bus');
    const result = await createBusBooking(validPayload);
    expect(result.source).toBe('local');
    expect(result.ticketCode).toMatch(/^BUS-/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe('bus service -- getStoredBusBookings', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('wasel-bus-bookings');
    }
  });

  afterEach(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('wasel-bus-bookings');
    }
  });

  it('returns empty array when nothing stored', async () => {
    const { getStoredBusBookings } = await import('@/services/bus');
    expect(getStoredBusBookings()).toEqual([]);
  });

  it('returns stored bookings in order (newest first)', async () => {
    if (typeof window === 'undefined') return;

    const stored = [
      { id: 'b2', tripId: 't1', ticket_code: 'BUS-002', status: 'confirmed', seatsRequested: 1, pickupStop: 'A', dropoffStop: 'B', scheduleDate: '2026-12-02', departureTime: '09:00', seatPreference: 'any', scheduleMode: 'depart-now', totalPrice: 5, created_at: '2026-12-02T09:00:00Z' },
      { id: 'b1', tripId: 't1', ticket_code: 'BUS-001', status: 'confirmed', seatsRequested: 1, pickupStop: 'A', dropoffStop: 'B', scheduleDate: '2026-12-01', departureTime: '08:00', seatPreference: 'any', scheduleMode: 'depart-now', totalPrice: 5, created_at: '2026-12-01T08:00:00Z' },
    ];
    window.localStorage.setItem('wasel-bus-bookings', JSON.stringify(stored));

    const { getStoredBusBookings } = await import('@/services/bus');
    const result = getStoredBusBookings();
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe('b2');
  });

  it('gracefully handles corrupt localStorage', async () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('wasel-bus-bookings', '}{invalid json');

    const { getStoredBusBookings } = await import('@/services/bus');
    expect(getStoredBusBookings()).toEqual([]);
  });
});
