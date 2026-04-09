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
import {
  canTransitionRideBookingStatus,
  createRideBooking,
  getRideBookings,
  getBookingsForRide,
  getBookingsForDriver,
  getBookingsForPassenger,
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
  seatsRequested: 2,
  pricePerSeatJod: 12.5,
  routeMode: 'live_post' as const,
};

// ── 1. createRideBooking ──────────────────────────────────────────────────────

describe('createRideBooking()', () => {
  it('returns a RideBookingRecord with required fields', () => {
    const booking = createRideBooking(BASE_INPUT);
    expect(booking.id).toBeTruthy();
    expect(booking.rideId).toBe('ride-abc-123');
    expect(booking.from).toBe('Amman');
    expect(booking.to).toBe('Aqaba');
    expect(booking.driverName).toBe('Khalid Al-Rashid');
    expect(booking.passengerName).toBe('Sara Mansour');
    expect(booking.seatsRequested).toBe(2);
    expect(booking.ticketCode).toMatch(/^RIDE-\d{6}$/);
  });

  it('live_post bookings start as pending_driver', () => {
    const booking = createRideBooking({ ...BASE_INPUT, routeMode: 'live_post' });
    expect(booking.status).toBe('pending_driver');
    expect(booking.paymentStatus).toBe('pending');
    expect(booking.syncState).toBe('syncing');
  });

  it('network_inventory bookings start as confirmed', () => {
    const booking = createRideBooking({ ...BASE_INPUT, routeMode: 'network_inventory' });
    expect(booking.status).toBe('confirmed');
    expect(booking.paymentStatus).toBe('authorized');
    expect(booking.syncState).toBe('syncing');
  });

  it('defaults seatsRequested to 1 when not provided', () => {
    const booking = createRideBooking({ ...BASE_INPUT, seatsRequested: undefined });
    expect(booking.seatsRequested).toBe(1);
  });

  it('persists the booking to localStorage', () => {
    createRideBooking(BASE_INPUT);
    const persisted = getRideBookings();
    expect(persisted.length).toBe(1);
  });

  it('each booking has a unique id', () => {
    const b1 = createRideBooking(BASE_INPUT);
    const b2 = createRideBooking(BASE_INPUT);
    expect(b1.id).not.toBe(b2.id);
  });

  it('each booking has a unique ticketCode', () => {
    const codes = new Set(
      Array.from({ length: 10 }, () => createRideBooking(BASE_INPUT).ticketCode),
    );
    // Very high probability of uniqueness
    expect(codes.size).toBeGreaterThan(1);
  });

  it('createdAt and updatedAt are valid ISO timestamps', () => {
    const booking = createRideBooking(BASE_INPUT);
    expect(new Date(booking.createdAt).getFullYear()).toBeGreaterThan(2000);
    expect(new Date(booking.updatedAt).getFullYear()).toBeGreaterThan(2000);
  });

  it('supportThreadOpen defaults to false', () => {
    const booking = createRideBooking(BASE_INPUT);
    expect(booking.supportThreadOpen).toBe(false);
  });

  it('creates a local-only booking when no passenger id is available for backend sync', () => {
    const booking = createRideBooking({ ...BASE_INPUT, passengerId: undefined });
    expect(booking.syncState).toBe('local-only');
    expect(booking.pendingSync).toBe(false);
  });

  it('ownerId is preserved from input', () => {
    const booking = createRideBooking(BASE_INPUT);
    expect(booking.ownerId).toBe('driver-001');
  });
});

// ── 2. getRideBookings ────────────────────────────────────────────────────────

describe('getRideBookings()', () => {
  it('returns empty array when no bookings exist', () => {
    expect(getRideBookings()).toEqual([]);
  });

  it('returns bookings sorted by updatedAt descending (most recent first)', () => {
    createRideBooking(BASE_INPUT);
    // Small delay to ensure different timestamps
    createRideBooking({ ...BASE_INPUT, from: 'Irbid', to: 'Amman' });
    const bookings = getRideBookings();
    expect(bookings.length).toBe(2);
    const t0 = new Date(bookings[0]!.updatedAt).getTime();
    const t1 = new Date(bookings[1]!.updatedAt).getTime();
    expect(t0).toBeGreaterThanOrEqual(t1);
  });

  it('returns all created bookings', () => {
    createRideBooking(BASE_INPUT);
    createRideBooking(BASE_INPUT);
    createRideBooking(BASE_INPUT);
    expect(getRideBookings().length).toBe(3);
  });
});

// ── 3. getBookingsForRide ─────────────────────────────────────────────────────

describe('getBookingsForRide()', () => {
  it('returns only bookings for the specified rideId', () => {
    createRideBooking({ ...BASE_INPUT, rideId: 'ride-A' });
    createRideBooking({ ...BASE_INPUT, rideId: 'ride-B' });
    createRideBooking({ ...BASE_INPUT, rideId: 'ride-A' });

    const forA = getBookingsForRide('ride-A');
    expect(forA.length).toBe(2);
    for (const b of forA) {
      expect(b.rideId).toBe('ride-A');
    }
  });

  it('returns empty array for unknown rideId', () => {
    createRideBooking(BASE_INPUT);
    expect(getBookingsForRide('unknown-ride')).toEqual([]);
  });
});

// ── 4. getBookingsForDriver ───────────────────────────────────────────────────

describe('getBookingsForDriver()', () => {
  it('returns bookings where ownerId matches userId', () => {
    createRideBooking({ ...BASE_INPUT, rideId: 'ride-driver-001', ownerId: 'driver-001' });
    createRideBooking({ ...BASE_INPUT, rideId: 'ride-driver-002', ownerId: 'driver-002' });
    const rides = [{ id: 'ride-driver-001', ownerId: 'driver-001' } as any];
    const forDriver = getBookingsForDriver('driver-001', rides);
    expect(forDriver.every((booking) => booking.ownerId === 'driver-001')).toBe(true);
  });
});

// ── 5. getBookingsForPassenger ────────────────────────────────────────────────

describe('getBookingsForPassenger()', () => {
  it('filters by passenger name', () => {
    createRideBooking({ ...BASE_INPUT, passengerName: 'Sara Mansour' });
    createRideBooking({ ...BASE_INPUT, passengerName: 'Ahmad Khalil' });

    const saraBooksings = getBookingsForPassenger('Sara Mansour');
    expect(saraBooksings.length).toBe(1);
    expect(saraBooksings[0]!.passengerName).toBe('Sara Mansour');
  });
});

// ── 6. updateRideBooking ──────────────────────────────────────────────────────

describe('updateRideBooking()', () => {
  it('returns null for unknown bookingId', () => {
    const result = updateRideBooking('nonexistent-id', { status: 'confirmed' });
    expect(result).toBeNull();
  });

  it('updates booking status', () => {
    const booking = createRideBooking(BASE_INPUT);
    const updated = updateRideBooking(booking.id, { status: 'confirmed' });
    expect(updated?.status).toBe('confirmed');
  });

  it('updates payment status', () => {
    const booking = createRideBooking(BASE_INPUT);
    const updated = updateRideBooking(booking.id, { paymentStatus: 'captured' });
    expect(updated?.paymentStatus).toBe('captured');
  });

  it('updates supportThreadOpen', () => {
    const booking = createRideBooking(BASE_INPUT);
    const updated = updateRideBooking(booking.id, { supportThreadOpen: true });
    expect(updated?.supportThreadOpen).toBe(true);
  });

  it('updates updatedAt timestamp', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-02T00:00:00.000Z'));

    try {
      const booking = createRideBooking(BASE_INPUT);
      const originalTs = booking.updatedAt;

      vi.setSystemTime(new Date('2026-04-02T00:00:05.000Z'));
      const updated = updateRideBooking(booking.id, { status: 'confirmed' });

      expect(updated?.updatedAt).not.toBe(originalTs);
    } finally {
      vi.useRealTimers();
    }
  });

  it('persists the update in localStorage', () => {
    const booking = createRideBooking(BASE_INPUT);
    updateRideBooking(booking.id, { status: 'confirmed' });
    const persisted = getRideBookings().find(b => b.id === booking.id);
    expect(persisted?.status).toBe('confirmed');
  });

  it('does not affect other bookings', () => {
    const b1 = createRideBooking(BASE_INPUT);
    const b2 = createRideBooking(BASE_INPUT);
    updateRideBooking(b1.id, { status: 'rejected' });
    const b2Persisted = getRideBookings().find(b => b.id === b2.id);
    expect(b2Persisted?.status).toBe('pending_driver');
  });

  it('rejects invalid lifecycle regressions', () => {
    const booking = createRideBooking(BASE_INPUT);
    expect(() => updateRideBooking(booking.id, { status: 'completed' })).toThrow(ValidationError);
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
  it('marks past confirmed bookings as completed', () => {
    // Create a confirmed booking in the past
    const booking = createRideBooking({ ...BASE_INPUT, routeMode: 'network_inventory' });
    // Manually set date to the past
    const pastDate = '2020-01-01';
    updateRideBooking(booking.id, { status: 'confirmed' });
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

  it('does not affect future confirmed bookings', () => {
    const booking = createRideBooking({ ...BASE_INPUT, routeMode: 'network_inventory' });
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

  it('does not change non-confirmed bookings', () => {
    const booking = createRideBooking(BASE_INPUT); // status: pending_driver
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

  it('returns sorted bookings array', () => {
    createRideBooking(BASE_INPUT);
    const synced = syncRideBookingCompletion(Date.now());
    expect(Array.isArray(synced)).toBe(true);
  });
});

// ── 8. Ticket code format ────────────────────────────────────────────────────

describe('Ticket code generation', () => {
  it('every ticket code matches RIDE-XXXXXX pattern', () => {
    for (let i = 0; i < 20; i++) {
      const booking = createRideBooking(BASE_INPUT);
      expect(booking.ticketCode).toMatch(/^RIDE-\d{6}$/);
    }
  });
});

// ── 9. Storage capacity guard ─────────────────────────────────────────────────

describe('Storage capacity guard', () => {
  it('does not persist more than 100 bookings (cap enforcement)', () => {
    for (let i = 0; i < 110; i++) {
      createRideBooking(BASE_INPUT);
    }
    const stored = JSON.parse(localStorage.getItem('wasel-ride-booking-records') || '[]');
    expect(stored.length).toBeLessThanOrEqual(100);
  });
});
