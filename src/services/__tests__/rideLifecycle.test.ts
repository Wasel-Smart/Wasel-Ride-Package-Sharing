import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRideBooking, getRideBookings, type RideBookingRecord } from '../rideLifecycle';

// Mock dependency modules
vi.mock('../growthEngine', () => ({
  trackGrowthEvent: vi.fn(),
}));

vi.mock('../corridorBetaMetrics', () => ({
  recordCorridorBetaMetricsFromBookings: vi.fn(),
}));

vi.mock('../directSupabase', () => ({
  createDirectBooking: vi.fn(async () => ({ success: true, bookingId: 'backend-123' })),
  getDirectDriverBookings: vi.fn(async () => []),
  getDirectUserBookings: vi.fn(async () => []),
  updateDirectBookingStatus: vi.fn(async () => true),
}));

vi.mock('../../platform/event-bus', () => ({
  createDomainEvent: vi.fn((type, payload) => ({ id: 'evt-123', type, payload })),
  domainEventBus: {
    publish: vi.fn(async () => true),
  },
}));

vi.mock('../core', () => ({
  API_URL: 'http://localhost:3000',
  supabase: {},
}));

describe('rideLifecycle Service', () => {
  let localStorageMock: Record<string, string> = {};

  beforeEach(() => {
    localStorageMock = {};
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => localStorageMock[key] || null,
        setItem: (key: string, value: string) => {
          localStorageMock[key] = value;
        },
        removeItem: (key: string) => {
          delete localStorageMock[key];
        },
        clear: () => {
          localStorageMock = {};
        },
      },
    });
    vi.clearAllMocks();
  });

  it('getRideBookings() returns empty array when localStorage is empty', () => {
    const bookings = getRideBookings();
    expect(bookings).toEqual([]);
  });

  it('getRideBookings() returns parsed bookings from localStorage', () => {
    const mockBookings: Partial<RideBookingRecord>[] = [
      { id: '1', rideId: 'ride-1', from: 'Amman', to: 'Irbid', updatedAt: new Date().toISOString() },
    ];
    localStorageMock['wasel-ride-booking-records'] = JSON.stringify(mockBookings);

    const bookings = getRideBookings();
    expect(bookings.length).toBe(1);
    expect(bookings[0]?.from).toBe('Amman');
  });

  it('createRideBooking() saves a booking and returns it', async () => {
    const newBooking = await createRideBooking({
      rideId: 'ride-100',
      from: 'Amman',
      to: 'Zarqa',
      date: '2026-07-02',
      time: '08:00',
      driverName: 'Ahmad',
      passengerName: 'Ali',
      seatsRequested: 2,
      routeMode: 'live_post',
    });

    expect(newBooking.id).toBeDefined();
    expect(newBooking.from).toBe('Amman');
    expect(newBooking.status).toBe('pending_driver');

    const stored = getRideBookings();
    expect(stored.length).toBe(1);
    expect(stored[0]?.id).toBe(newBooking.id);
  });

  it('handles invalid JSON in localStorage gracefully', () => {
    localStorageMock['wasel-ride-booking-records'] = 'invalid-json';
    const bookings = getRideBookings();
    expect(bookings).toEqual([]);
  });
});
