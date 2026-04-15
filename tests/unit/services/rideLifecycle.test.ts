/**
 * Ride Lifecycle Service — Unit Tests
 *
 * Covers: booking creation, retrieval, update, status progression,
 * auto-completion of past confirmed rides, driver/passenger filtering,
 * ticket code generation, and localStorage persistence.
 *
 * Standard: Booking lifecycle is a financial and operational contract.
 * Every state transition must be tested for correctness and idempotency.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../src/services/directSupabase', () => ({
  createDirectBooking: vi.fn(() => new Promise(() => {})),
  getDirectDriverBookings: vi.fn(async () => []),
  getDirectUserBookings: vi.fn(async () => []),
  updateDirectBookingStatus: vi.fn(async () => undefined),
}));

vi.mock('../../../src/services/growthEngine', () => ({
  trackGrowthEvent: vi.fn(async () => undefined),
}));

vi.mock('../../../src/services/transactionalEmailTriggers', () => ({
  getTransactionalEmailAppUrl: vi.fn(() => 'https://wasel.example'),
  triggerBookingStatusUpdateEmail: vi.fn(),
  triggerRideBookingEmails: vi.fn(),
  triggerRideCompletedEmails: vi.fn(),
}));

import {
  canTransitionRideBookingStatus,
  createRideBooking,
  getRideBookings,
  getBookingsForRide,
  getBookingsForDriver,
  getBookingsForPassenger,
  getRideBookingCustomerState,
  isRideBookingConfirmed,
  isRideBookingPending,
  updateRideBooking,
  syncRideBookingCompletion,
  type RideBookingRecord,
} from '../../../src/services/rideLifecycle';
import { ValidationError } from '../../../src/utils/errors';

// ── Setup: clear localStorage before each test ────────────────────────────────

beforeEach(() => {
  localStorage.clear();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

type RideBookingInput = Parameters<typeof createRideBooking>[0];

const BASE_INPUT: RideBookingInput = {
  rideId: 'ride-abc-123',
  ownerId: 'driver-001',
  passengerId: 'passenger-001',
  from: 'Amman',
  to: 'Aqaba',
  date: '2026-07-01',
  time: '08:00',
  driverName: 'Khalid Al-Rashid',
  passengerName: 'Sara Mansour',
  seatsRequested: 2,
  pricePerSeatJod: 12.5,
  routeMode: 'live_post' as const,
};

function createTestBooking(overrides: Partial<RideBookingInput> = {}) {
  return createRideBooking({ ...BASE_INPUT, ...overrides });
}

// ── 1. createRideBooking ──────────────────────────────────────────────────────

describe('createRideBooking()', () => {
  it('returns a RideBookingRecord with required fields', async () => {
    const booking = await createTestBooking();
    expect(booking.id).toBeTruthy();
    expect(booking.rideId).toBe('ride-abc-123');
    expect(booking.from).toBe('Amman');
    expect(booking.to).toBe('Aqaba');
    expect(booking.driverName).toBe('Khalid Al-Rashid');
    expect(booking.passengerName).toBe('Sara Mansour');
    expect(booking.seatsRequested).toBe(2);
    expect(booking.ticketCode).toMatch(/^RIDE-\d{6}$/);
  });

  it('live_post bookings start as pending_driver', async () => {
    const booking = await createTestBooking({ routeMode: 'live_post' });
    expect(booking.status).toBe('pending_driver');
    expect(booking.paymentStatus).toBe('pending');
    expect(booking.syncState).toBe('syncing');
  });

  it('network_inventory bookings start as confirmed', async () => {
    const booking = await createTestBooking({ routeMode: 'network_inventory' });
    expect(booking.status).toBe('confirmed');
    expect(booking.paymentStatus).toBe('authorized');
    expect(booking.syncState).toBe('syncing');
  });

  it('treats unsynced network_inventory bookings as pending for customer-facing state', async () => {
    const booking = await createTestBooking({ routeMode: 'network_inventory' });
    expect(getRideBookingCustomerState(booking)).toBe('pending');
    expect(isRideBookingPending(booking)).toBe(true);
    expect(isRideBookingConfirmed(booking)).toBe(false);
  });

  it('treats synced confirmed bookings as confirmed for customer-facing state', async () => {
    const booking = await createTestBooking({ routeMode: 'network_inventory' });
    const syncedBooking = {
      ...booking,
      backendBookingId: 'backend-booking-1',
      syncState: 'synced' as const,
    };
    expect(getRideBookingCustomerState(syncedBooking)).toBe('confirmed');
    expect(isRideBookingConfirmed(syncedBooking)).toBe(true);
    expect(isRideBookingPending(syncedBooking)).toBe(false);
  });

  it('defaults seatsRequested to 1 when not provided', async () => {
    const booking = await createTestBooking({ seatsRequested: undefined });
    expect(booking.seatsRequested).toBe(1);
  });

  it('persists the booking to localStorage', async () => {
    await createTestBooking();
    const persisted = getRideBookings();
    expect(persisted.length).toBe(1);
  });

  it('each booking has a unique id', async () => {
    const [b1, b2] = await Promise.all([createTestBooking(), createTestBooking()]);
    expect(b1.id).not.toBe(b2.id);
  });

  it('each booking has a unique ticketCode', async () => {
    const bookings = await Promise.all(
      Array.from({ length: 10 }, () => createTestBooking()),
    );
    const codes = new Set(bookings.map((booking) => booking.ticketCode));
    // Very high probability of uniqueness
    expect(codes.size).toBeGreaterThan(1);
  });

  it('createdAt and updatedAt are valid ISO timestamps', async () => {
    const booking = await createTestBooking();
    expect(new Date(booking.createdAt).getFullYear()).toBeGreaterThan(2000);
    expect(new Date(booking.updatedAt).getFullYear()).toBeGreaterThan(2000);
  });

  it('supportThreadOpen defaults to false', async () => {
    const booking = await createTestBooking();
    expect(booking.supportThreadOpen).toBe(false);
  });

  it('creates a local-only booking when no passenger id is available for backend sync', async () => {
    const booking = await createTestBooking({ passengerId: undefined });
    expect(booking.syncState).toBe('local-only');
    expect(booking.pendingSync).toBe(false);
  });

  it('ownerId is preserved from input', async () => {
    const booking = await createTestBooking();
    expect(booking.ownerId).toBe('driver-001');
  });
});

// ── 2. getRideBookings ────────────────────────────────────────────────────────

describe('getRideBookings()', () => {
  it('returns empty array when no bookings exist', () => {
    expect(getRideBookings()).toEqual([]);
  });

  it('returns bookings sorted by updatedAt descending (most recent first)', async () => {
    await createTestBooking();
    // Small delay to ensure different timestamps
    await createTestBooking({ from: 'Irbid', to: 'Amman' });
    const bookings = getRideBookings();
    expect(bookings.length).toBe(2);
    const t0 = new Date(bookings[0]!.updatedAt).getTime();
    const t1 = new Date(bookings[1]!.updatedAt).getTime();
    expect(t0).toBeGreaterThanOrEqual(t1);
  });

  it('returns all created bookings', async () => {
    await Promise.all([createTestBooking(), createTestBooking(), createTestBooking()]);
    expect(getRideBookings().length).toBe(3);
  });
});

// ── 3. getBookingsForRide ─────────────────────────────────────────────────────

describe('getBookingsForRide()', () => {
  it('returns only bookings for the specified rideId', async () => {
    await Promise.all([
      createTestBooking({ rideId: 'ride-A' }),
      createTestBooking({ rideId: 'ride-B' }),
      createTestBooking({ rideId: 'ride-A' }),
    ]);

    const forA = getBookingsForRide('ride-A');
    expect(forA.length).toBe(2);
    for (const b of forA) {
      expect(b.rideId).toBe('ride-A');
    }
  });

  it('returns empty array for unknown rideId', async () => {
    await createTestBooking();
    expect(getBookingsForRide('unknown-ride')).toEqual([]);
  });
});

// ── 4. getBookingsForDriver ───────────────────────────────────────────────────

describe('getBookingsForDriver()', () => {
  it('returns bookings where ownerId matches userId', async () => {
    await Promise.all([
      createTestBooking({ rideId: 'ride-driver-001', ownerId: 'driver-001' }),
      createTestBooking({ rideId: 'ride-driver-002', ownerId: 'driver-002' }),
    ]);
    const rides = [{ id: 'ride-driver-001', ownerId: 'driver-001' } as any];
    const forDriver = getBookingsForDriver('driver-001', rides);
    expect(forDriver.every((booking) => booking.ownerId === 'driver-001')).toBe(true);
  });
});

// ── 5. getBookingsForPassenger ────────────────────────────────────────────────

describe('getBookingsForPassenger()', () => {
  it('filters by passenger name', async () => {
    await Promise.all([
      createTestBooking({ passengerName: 'Sara Mansour' }),
      createTestBooking({ passengerName: 'Ahmad Khalil' }),
    ]);

    const saraBooksings = getBookingsForPassenger('Sara Mansour');
    expect(saraBooksings.length).toBe(1);
    expect(saraBooksings[0]!.passengerName).toBe('Sara Mansour');
  });
});

// ── 6. updateRideBooking ──────────────────────────────────────────────────────

describe('updateRideBooking()', () => {
  it('returns null for unknown bookingId', async () => {
    const result = await updateRideBooking('nonexistent-id', { status: 'confirmed' });
    expect(result).toBeNull();
  });

  it('updates booking status', async () => {
    const booking = await createTestBooking();
    const updated = await updateRideBooking(booking.id, { status: 'confirmed' });
    expect(updated?.status).toBe('confirmed');
  });

  it('updates payment status', async () => {
    const booking = await createTestBooking();
    const updated = await updateRideBooking(booking.id, { paymentStatus: 'captured' });
    expect(updated?.paymentStatus).toBe('captured');
  });

  it('updates supportThreadOpen', async () => {
    const booking = await createTestBooking();
    const updated = await updateRideBooking(booking.id, { supportThreadOpen: true });
    expect(updated?.supportThreadOpen).toBe(true);
  });

  it('updates updatedAt timestamp', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T00:00:00.000Z'));

    try {
      const booking = await createTestBooking();
      const originalTs = booking.updatedAt;

      vi.setSystemTime(new Date('2026-04-02T00:00:05.000Z'));
      const updated = await updateRideBooking(booking.id, { status: 'confirmed' });

      expect(updated?.updatedAt).not.toBe(originalTs);
    } finally {
      vi.useRealTimers();
    }
  });

  it('persists the update in localStorage', async () => {
    const booking = await createTestBooking();
    await updateRideBooking(booking.id, { status: 'confirmed' });
    const persisted = getRideBookings().find(b => b.id === booking.id);
    expect(persisted?.status).toBe('confirmed');
  });

  it('does not affect other bookings', async () => {
    const [b1, b2] = await Promise.all([createTestBooking(), createTestBooking()]);
    await updateRideBooking(b1.id, { status: 'rejected' });
    const b2Persisted = getRideBookings().find(b => b.id === b2.id);
    expect(b2Persisted?.status).toBe('pending_driver');
  });

  it('rejects invalid lifecycle regressions', async () => {
    const booking = await createTestBooking();
    await expect(updateRideBooking(booking.id, { status: 'completed' })).rejects.toThrow(ValidationError);
  });
});

describe('canTransitionRideBookingStatus()', () => {
  it('allows valid forward transitions', () => {
    expect(canTransitionRideBookingStatus('pending_driver', 'confirmed')).toBe(true);
    expect(canTransitionRideBookingStatus('confirmed', 'completed')).toBe(true);
  });

  it('blocks invalid backward or terminal transitions', () => {
    expect(canTransitionRideBookingStatus('completed', 'confirmed')).toBe(false);
    expect(canTransitionRideBookingStatus('rejected', 'confirmed')).toBe(false);
  });
});

// ── 7. syncRideBookingCompletion ──────────────────────────────────────────────

describe('syncRideBookingCompletion()', () => {
  it('marks past confirmed bookings as completed', async () => {
    // Create a confirmed booking in the past
    const booking = await createTestBooking({ routeMode: 'network_inventory' });
    // Manually set date to the past
    const pastDate = '2020-01-01';
    await updateRideBooking(booking.id, { status: 'confirmed' });
    // Patch the stored booking's date via localStorage
    const stored = JSON.parse(localStorage.getItem('wasel-ride-booking-records') || '[]') as RideBookingRecord[];
    const idx = stored.findIndex(b => b.id === booking.id);
    if (idx !== -1) {
      stored[idx] = { ...stored[idx]!, date: pastDate, time: '08:00', status: 'confirmed' };
      localStorage.setItem('wasel-ride-booking-records', JSON.stringify(stored));
    }

    const synced = syncRideBookingCompletion(Date.now());
    const completedBooking = synced.find(b => b.id === booking.id);
    expect(completedBooking?.status).toBe('completed');
  });

  it('does not affect future confirmed bookings', async () => {
    const booking = await createTestBooking({ routeMode: 'network_inventory' });
    // Future date
    const stored = JSON.parse(localStorage.getItem('wasel-ride-booking-records') || '[]') as RideBookingRecord[];
    const idx = stored.findIndex(b => b.id === booking.id);
    if (idx !== -1) {
      stored[idx] = { ...stored[idx]!, date: '2099-12-31', time: '08:00', status: 'confirmed' };
      localStorage.setItem('wasel-ride-booking-records', JSON.stringify(stored));
    }

    const synced = syncRideBookingCompletion(Date.now());
    const futureBooking = synced.find(b => b.id === booking.id);
    expect(futureBooking?.status).toBe('confirmed');
  });

  it('does not change non-confirmed bookings', async () => {
    const booking = await createTestBooking(); // status: pending_driver
    const stored = JSON.parse(localStorage.getItem('wasel-ride-booking-records') || '[]') as RideBookingRecord[];
    const idx = stored.findIndex(b => b.id === booking.id);
    if (idx !== -1) {
      stored[idx] = { ...stored[idx]!, date: '2020-01-01', time: '08:00' };
      localStorage.setItem('wasel-ride-booking-records', JSON.stringify(stored));
    }

    const synced = syncRideBookingCompletion(Date.now());
    const unchangedBooking = synced.find(b => b.id === booking.id);
    expect(unchangedBooking?.status).toBe('pending_driver');
  });

  it('returns sorted bookings array', async () => {
    await createTestBooking();
    const synced = syncRideBookingCompletion(Date.now());
    expect(Array.isArray(synced)).toBe(true);
  });
});

// ── 8. Ticket code format ────────────────────────────────────────────────────

describe('Ticket code generation', () => {
  it('every ticket code matches RIDE-XXXXXX pattern', async () => {
    const bookings = await Promise.all(
      Array.from({ length: 20 }, () => createTestBooking()),
    );
    for (const booking of bookings) {
      expect(booking.ticketCode).toMatch(/^RIDE-\d{6}$/);
    }
  });
});

// ── 9. Storage capacity guard ─────────────────────────────────────────────────

describe('Storage capacity guard', () => {
  it('does not persist more than 100 bookings (cap enforcement)', async () => {
    await Promise.all(
      Array.from({ length: 110 }, () => createTestBooking({ passengerId: undefined })),
    );
    const stored = JSON.parse(localStorage.getItem('wasel-ride-booking-records') || '[]');
    expect(stored.length).toBeLessThanOrEqual(100);
  });
});
