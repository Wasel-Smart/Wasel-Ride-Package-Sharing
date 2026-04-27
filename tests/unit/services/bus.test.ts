import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSearchTrips = vi.fn();
const mockCreateBooking = vi.fn();
let mockBusEnabled = false;

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

vi.mock('../../../src/features/core/featureFlags', () => ({
  isCoreFeatureEnabled: (feature: string) => feature === 'bus' && mockBusEnabled,
}));

vi.mock('../../../src/utils/env', async () => {
  const actual = await vi.importActual<typeof import('../../../src/utils/env')>(
    '../../../src/utils/env',
  );
  return {
    ...actual,
  };
});

import { createBusBooking, fetchBusRoutes, normalizeBusRoute } from '../../../src/services/bus';

describe('bus service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBusEnabled = false;
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
    mockBusEnabled = true;
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

  it('returns no routes when live bus inventory is unavailable', async () => {
    mockBusEnabled = true;
    mockSearchTrips.mockResolvedValue([]);

    const routes = await fetchBusRoutes({ from: 'Amman', to: 'Petra', date: '2026-04-02', seats: 1 });

    expect(routes).toEqual([]);
  });

  it('surfaces booking failures when fake bus bookings are disabled', async () => {
    mockBusEnabled = true;
    mockCreateBooking.mockRejectedValue(new Error('offline'));

    await expect(
      createBusBooking({
        tripId: 'bus-3',
        seatsRequested: 2,
        pickupStop: 'Abdali Intercity Hub',
        dropoffStop: 'Aqaba Marina Stop',
        scheduleDate: '2026-04-05',
        departureTime: '07:00',
        seatPreference: 'window',
        scheduleMode: 'schedule-later',
        totalPrice: 14,
      }),
    ).rejects.toThrow('offline');
  });

  it('fails closed when the bus feature is disabled', async () => {
    await expect(
      createBusBooking({
        tripId: 'bus-3',
        seatsRequested: 2,
        pickupStop: 'Abdali Intercity Hub',
        dropoffStop: 'Aqaba Marina Stop',
        scheduleDate: '2026-04-05',
        departureTime: '07:00',
        seatPreference: 'window',
        scheduleMode: 'schedule-later',
        totalPrice: 14,
      }),
    ).rejects.toThrow('Bus service is unavailable.');

    await expect(
      fetchBusRoutes({ from: 'Amman', to: 'Aqaba', date: '2026-04-05', seats: 1 }),
    ).rejects.toThrow('Bus service is unavailable.');
  });

  it('returns a server booking only when the backend succeeds', async () => {
    mockBusEnabled = true;
    mockCreateBooking.mockResolvedValue({ id: 'bus-booking-1' });

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

    expect(result).toEqual({
      source: 'server',
      bookingId: 'bus-booking-1',
      ticketCode: 'bus-booking-1',
    });
  });
});
