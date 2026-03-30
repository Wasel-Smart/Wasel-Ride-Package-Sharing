import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSearchTrips = vi.fn();
const mockCreateBooking = vi.fn();

vi.mock('../../../src/services/trips', () => ({
  tripsAPI: {
    searchTrips: (...args: unknown[]) => mockSearchTrips(...args),
  },
}));

vi.mock('../../../src/services/bookings', () => ({
  bookingsAPI: {
    createBooking: (...args: unknown[]) => mockCreateBooking(...args),
  },
}));

import { createBusBooking, fetchBusRoutes, getOfficialBusRoutes, normalizeBusRoute } from '../../../src/services/bus';

describe('bus service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        removeItem: (key: string) => store.delete(key),
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
  });

  it('normalizes backend strings into bus-friendly route fields', () => {
    const route = normalizeBusRoute({
      id: 'bus-1',
      from: 'Amman',
      to: 'Aqaba',
      amenities: 'AC, WiFi, USB',
      via_stops: 'Karak Service Plaza; Airport Road',
      seats_available: '-2',
    }, 0);

    expect(route.amenities).toEqual(['AC', 'WiFi', 'USB']);
    expect(route.via).toEqual(['Karak Service Plaza', 'Airport Road']);
    expect(route.seats).toBe(0);
  });

  it('returns only real bus inventory from trip search results', async () => {
    mockSearchTrips.mockResolvedValue([
      {
        id: 'ride-1',
        from: 'Amman',
        to: 'Irbid',
        type: 'carpool',
        price: 4,
        seats: 3,
      },
      {
        id: 'bus-2',
        from: 'Amman',
        to: 'Irbid',
        transport_type: 'intercity_bus',
        price_per_seat: 3,
        seats_available: 9,
        amenities: ['AC', 'USB'],
      },
    ]);

    const routes = await fetchBusRoutes({ from: 'Amman', to: 'Irbid', date: '2026-04-02', seats: 2 });

    expect(mockSearchTrips).toHaveBeenCalledWith('Amman', 'Irbid', '2026-04-02', 2);
    expect(routes).toHaveLength(1);
    expect(routes[0].id).toBe('bus-2');
  });

  it('falls back to the official Jordan schedule network when no live bus inventory is returned', async () => {
    mockSearchTrips.mockResolvedValue([]);

    const routes = await fetchBusRoutes({ from: 'Amman', to: 'Petra', date: '2026-04-02', seats: 1 });

    expect(routes.length).toBeGreaterThan(0);
    expect(routes[0].from).toBe('Amman');
    expect(routes[0].to).toBe('Petra');
    expect(routes[0].dataSource).toBe('official');
    expect(routes[0].departureTimes?.length).toBeGreaterThan(0);
  });

  it('returns the wider official network when an exact official route is missing', () => {
    const routes = getOfficialBusRoutes({ from: 'Ajloun', to: 'Aqaba', seats: 1 });

    expect(routes.length).toBeGreaterThan(0);
  });

  it('stores a local backup booking when the booking API fails', async () => {
    mockCreateBooking.mockRejectedValue(new Error('offline'));
    window.localStorage.setItem('wasel-bus-bookings', '{bad json');

    const result = await createBusBooking({
      tripId: 'bus-3',
      seatsRequested: 2,
      pickupStop: 'Abdali Intercity Hub',
      dropoffStop: 'Aqaba Marina Stop',
      scheduleDate: '2026-04-05',
      departureTime: '07:00',
      seatPreference: 'window',
      scheduleMode: 'schedule-later',
      totalPrice: 14,
    });

    expect(result.source).toBe('local');

    const stored = JSON.parse(window.localStorage.getItem('wasel-bus-bookings') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      tripId: 'bus-3',
      seatsRequested: 2,
      departureTime: '07:00',
      seatPreference: 'window',
    });
  });
});
