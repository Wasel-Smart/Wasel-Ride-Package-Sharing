import { beforeEach, describe, expect, it, vi } from 'vitest';

const directBookings = vi.hoisted(() => ({
  passenger: [] as Array<Record<string, unknown>>,
  driver: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/services/directSupabase', () => ({
  getDirectUserBookings: vi.fn(async () => directBookings.passenger),
  getDirectDriverBookings: vi.fn(async () => directBookings.driver),
}));
vi.mock('@/services/bookings', () => ({ bookingsAPI: {} }));
vi.mock('@/services/growthEngine', () => ({ trackGrowthEvent: vi.fn(async () => undefined) }));
vi.mock('@/utils/supabase/client', () => ({ supabase: null }));
vi.mock('@/utils/localSession', () => ({ isLocalOnlySession: () => false }));
vi.mock('@/platform/event-bus', () => ({
  createDomainEvent: (type: string, payload: unknown) => ({ type, payload }),
  domainEventBus: { publish: vi.fn() },
}));

import {
  getRideBookings,
  hydrateRideBookings,
  syncRideBookingCompletion,
} from '@/services/rideLifecycle';

function row(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    booking_id: 'booking-1',
    trip_id: 'trip-1',
    passenger_id: 'user-1',
    booking_status: 'confirmed',
    seats_requested: 1,
    created_at: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function scheduledRide(offsetMs: number) {
  const departure = new Date(Date.now() + offsetMs);
  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    id: 'trip-1',
    from: 'Amman',
    to: 'Aqaba',
    date: `${departure.getFullYear()}-${pad(departure.getMonth() + 1)}-${pad(departure.getDate())}`,
    time: `${pad(departure.getHours())}:${pad(departure.getMinutes())}`,
    seats: 3,
    price: 10,
    gender: 'any',
    prayer: false,
    carModel: 'Test car',
    note: '',
    acceptsPackages: false,
    packageCapacity: 'small' as const,
    packageNote: '',
    createdAt: new Date().toISOString(),
  };
}

describe('ride booking payment state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    directBookings.passenger = [];
    directBookings.driver = [];
  });

  it('uses the server payment_status instead of guessing from the booking status', async () => {
    directBookings.passenger = [
      row({ booking_id: 'paid', payment_status: 'paid' }),
      row({ booking_id: 'pending', payment_status: 'pending' }),
      row({ booking_id: 'refunded', payment_status: 'refunded', booking_status: 'cancelled' }),
      row({ booking_id: 'failed', payment_status: 'failed' }),
    ];

    const bookings = await hydrateRideBookings('user-1');
    const byId = Object.fromEntries(bookings.map(b => [b.id, b.paymentStatus]));

    expect(byId).toEqual({
      paid: 'captured',
      pending: 'pending',
      refunded: 'refunded',
      failed: 'failed',
    });
  });

  it('falls back to the booking status only when the server sends no payment_status', async () => {
    directBookings.passenger = [
      row({ booking_id: 'done', booking_status: 'completed' }),
      row({ booking_id: 'gone', booking_status: 'cancelled' }),
      row({ booking_id: 'open', booking_status: 'confirmed' }),
    ];

    const bookings = await hydrateRideBookings('user-1');
    const byId = Object.fromEntries(bookings.map(b => [b.id, b.paymentStatus]));

    expect(byId).toEqual({ done: 'captured', gone: 'failed', open: 'authorized' });
  });

  it('ignores an unrecognised payment_status value rather than trusting it', async () => {
    directBookings.passenger = [row({ booking_id: 'odd', payment_status: 'definitely-paid!' })];

    const [booking] = await hydrateRideBookings('user-1');

    expect(booking?.paymentStatus).toBe('authorized');
  });

  it('never marks payment as captured when a past booking is auto-completed locally', async () => {
    directBookings.passenger = [row({ booking_id: 'past', payment_status: 'authorized' })];
    await hydrateRideBookings('user-1', [scheduledRide(-3 * 60 * 60 * 1000)]);

    const synced = syncRideBookingCompletion(Date.now());
    const past = synced.find(b => b.id === 'past');

    expect(past?.status).toBe('completed');
    expect(past?.paymentStatus).toBe('authorized');
    expect(getRideBookings().find(b => b.id === 'past')?.paymentStatus).toBe('authorized');
  });

  it('does not complete a booking whose departure is inside the grace window', async () => {
    directBookings.passenger = [row({ booking_id: 'future' })];
    const ride = scheduledRide(-60 * 60 * 1000);
    await hydrateRideBookings('user-1', [ride]);

    const synced = syncRideBookingCompletion(Date.now());

    expect(synced.find(b => b.id === 'future')?.status).toBe('confirmed');
  });
});
