import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectBooking: vi.fn(
    async ({
      tripId,
      bookingStatus,
      seatsRequested,
      metadata,
    }: {
      tripId: string;
      bookingStatus: string;
      seatsRequested: number;
      metadata?: { total_price?: number | null };
    }) => ({
      booking: {
        booking_id: `backend-${tripId}`,
        id: `backend-${tripId}`,
        trip_id: tripId,
        seats_requested: seatsRequested,
        status: bookingStatus,
        total_price: metadata?.total_price ?? null,
        created_at: '2026-04-15T08:00:00.000Z',
        updated_at: '2026-04-15T08:00:00.000Z',
      },
    }),
  ),
  getDirectDriverBookings: vi.fn(async () => []),
  getDirectUserBookings: vi.fn(async () => []),
  updateDirectBookingStatus: vi.fn(async () => undefined),
}));

vi.mock('../../../src/services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(async () => undefined),
}));

vi.mock('../../../src/services/transactionalEmailTriggers', () => ({
  getTransactionalEmailAppUrl: vi.fn(() => 'https://wasel.jo'),
  triggerBookingStatusUpdateEmail: vi.fn(),
  triggerRideBookingEmails: vi.fn(),
  triggerRideCompletedEmails: vi.fn(),
}));

import {
  canTransitionRideBookingStatus,
  createRideBooking,
  getBookingsForDriver,
  getBookingsForPassenger,
  getBookingsForRide,
  getRideBookings,
  isRideBookingPending,
  syncRideBookingCompletion,
  updateRideBooking,
  type RideBookingRecord,
} from '../../../src/services/rideLifecycle';
import type { PostedRide } from '../../../src/services/journeyLogistics';
import {
  createDirectBooking,
  updateDirectBookingStatus,
} from '../../../src/services/directSupabase';
import { ValidationError } from '../../../src/utils/errors';

const mockedCreateDirectBooking = vi.mocked(createDirectBooking);
const mockedUpdateDirectBookingStatus = vi.mocked(updateDirectBookingStatus);
const BOOKING_KEY = 'wasel-ride-booking-records';

const BASE_INPUT = {
  rideId: 'ride-abc-123',
  ownerId: 'driver-001',
  passengerId: 'passenger-001',
  from: 'Amman',
  to: 'Aqaba',
  date: '2026-07-01',
  time: '08:00',
  driverName: 'Khalid Al-Rashid',
  passengerName: 'Sara Mansour',
  passengerEmail: 'sara@wasel.jo',
  seatsRequested: 2,
  pricePerSeatJod: 12.5,
  routeMode: 'live_post' as const,
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.useRealTimers();
  vi.stubEnv('VITE_APP_ENV', 'test');
  vi.stubEnv('VITE_ENABLE_DEMO_DATA', 'false');
  vi.stubEnv('VITE_ENABLE_SYNTHETIC_TRIPS', 'false');
  vi.stubEnv('VITE_ALLOW_DIRECT_SUPABASE_FALLBACK', 'true');
  vi.stubEnv('VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', 'true');
});

describe('createRideBooking()', () => {
  it('creates a backend-backed booking and stores the synced record', async () => {
    const booking = await createRideBooking(BASE_INPUT);

    expect(booking.rideId).toBe(BASE_INPUT.rideId);
    expect(booking.status).toBe('pending_driver');
    expect(booking.paymentStatus).toBe('pending');
    expect(booking.syncState).toBe('synced');
    expect(booking.backendBookingId).toBe(`backend-${BASE_INPUT.rideId}`);
    expect(isRideBookingPending(booking)).toBe(true);

    const stored = getRideBookings()[0];
    expect(stored?.backendBookingId).toBe(`backend-${BASE_INPUT.rideId}`);
    expect(stored?.syncState).toBe('synced');
    expect(mockedCreateDirectBooking).toHaveBeenCalledTimes(1);
  });

  it('defaults seatsRequested to 1 when omitted', async () => {
    const booking = await createRideBooking({
      ...BASE_INPUT,
      seatsRequested: undefined,
    });

    expect(booking.seatsRequested).toBe(1);
  });

  it('requires authentication before creating a ride booking', async () => {
    await expect(
      createRideBooking({
        ...BASE_INPUT,
        passengerId: undefined,
      }),
    ).rejects.toThrow('Sign in is required to book a ride.');

    expect(mockedCreateDirectBooking).not.toHaveBeenCalled();
  });

  it('surfaces backend booking failures instead of creating local success records', async () => {
    mockedCreateDirectBooking.mockRejectedValueOnce(new Error('offline'));

    await expect(createRideBooking(BASE_INPUT)).rejects.toThrow(
      'Ride could not be booked right now. Please try again.',
    );

    expect(getRideBookings()).toHaveLength(0);
  });
});

describe('booking queries', () => {
  it('filters ride, driver, and passenger views from persisted records', async () => {
    const bookingA = await createRideBooking(BASE_INPUT);
    const bookingB = await createRideBooking({
      ...BASE_INPUT,
      rideId: 'ride-b',
      ownerId: 'driver-002',
      passengerName: 'Ahmad Khalil',
    });

    expect(getBookingsForRide(BASE_INPUT.rideId).map(booking => booking.id)).toContain(bookingA.id);
    expect(
      getBookingsForDriver('driver-001', [
        {
          id: BASE_INPUT.rideId,
          ownerId: 'driver-001',
          from: 'Amman',
          to: 'Aqaba',
          date: '2026-07-01',
          time: '08:00',
          seats: 3,
          price: 25,
          gender: 'any',
          prayer: false,
          carModel: 'Toyota Camry',
          note: '',
          acceptsPackages: false,
          packageCapacity: 'small',
          packageNote: '',
          createdAt: '2026-04-15T08:00:00.000Z',
        } satisfies PostedRide,
      ]).map(booking => booking.id),
    ).toContain(bookingA.id);
    expect(getBookingsForPassenger('Ahmad Khalil').map(booking => booking.id)).toContain(
      bookingB.id,
    );
  });
});

describe('updateRideBooking()', () => {
  it('returns null for an unknown booking id', async () => {
    await expect(updateRideBooking('missing', { status: 'confirmed' })).resolves.toBeNull();
  });

  it('updates persisted non-status fields', async () => {
    const booking = await createRideBooking(BASE_INPUT);

    const updated = await updateRideBooking(booking.id, {
      paymentStatus: 'captured',
      supportThreadOpen: true,
    });

    expect(updated?.paymentStatus).toBe('captured');
    expect(updated?.supportThreadOpen).toBe(true);
    expect(getRideBookings().find(item => item.id === booking.id)?.paymentStatus).toBe('captured');
  });

  it('rejects invalid lifecycle transitions', async () => {
    const booking = await createRideBooking(BASE_INPUT);

    await expect(updateRideBooking(booking.id, { status: 'completed' })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });

  it('sends strict driver-status mutations directly when local fallback is disabled', async () => {
    vi.stubEnv('VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK', 'false');
    const booking = await createRideBooking(BASE_INPUT);

    const updated = await updateRideBooking(booking.id, {
      status: 'confirmed',
      paymentStatus: 'authorized',
    });

    expect(mockedUpdateDirectBookingStatus).toHaveBeenCalledWith(
      `backend-${BASE_INPUT.rideId}`,
      'accepted',
    );
    expect(updated?.status).toBe('confirmed');
    expect(updated?.syncState).toBe('synced');
  });
});

describe('syncRideBookingCompletion()', () => {
  it('marks past confirmed bookings as completed', async () => {
    const booking = await createRideBooking({
      ...BASE_INPUT,
      routeMode: 'network_inventory',
    });

    const stored = JSON.parse(localStorage.getItem(BOOKING_KEY) || '[]') as RideBookingRecord[];
    const next = stored.map(item =>
      item.id === booking.id
        ? {
            ...item,
            date: '2020-01-01',
            time: '08:00',
            status: 'confirmed' as const,
            paymentStatus: 'authorized' as const,
          }
        : item,
    );
    localStorage.setItem(BOOKING_KEY, JSON.stringify(next));

    const synced = syncRideBookingCompletion(new Date('2026-07-02T08:00:00.000Z').getTime());

    expect(synced.find(item => item.id === booking.id)?.status).toBe('completed');
  });
});

describe('helpers', () => {
  it('exposes forward-only status transitions', () => {
    expect(canTransitionRideBookingStatus('pending_driver', 'confirmed')).toBe(true);
    expect(canTransitionRideBookingStatus('confirmed', 'completed')).toBe(true);
    expect(canTransitionRideBookingStatus('completed', 'confirmed')).toBe(false);
  });
});
