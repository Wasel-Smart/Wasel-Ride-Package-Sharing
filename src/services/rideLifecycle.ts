/**
 * rideLifecycle
 *
 * Orchestrates the full lifecycle of a ride booking:
 *   pending_driver → confirmed → completed
 *   pending_driver → rejected / cancelled
 *
 * CHANGELOG (refactor)
 * ────────────────────
 * - All raw localStorage / pending-sync queue operations are now
 *   delegated to BookingStorageAdapter. This file no longer imports
 *   from window.localStorage directly.
 *
 * - The internal `readBookings`, `writeBookings`, `upsertBookings`,
 *   `loadPendingSyncs`, `savePendingSyncs`, `enqueuePendingSync`,
 *   `removePendingSync`, and `sortBookings` helpers have been removed.
 *   Their contracts are fulfilled by the adapter.
 *
 * - Business rules (state machine, sync, email triggers, growth events)
 *   are unchanged.
 */

import type { PostedRide } from './journeyLogistics';
import {
  createDirectBooking,
  getDirectDriverBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';
import { trackGrowthEvent } from './growthEngine';
import {
  getTransactionalEmailAppUrl,
  triggerBookingStatusUpdateEmail,
  triggerRideBookingEmails,
  triggerRideCompletedEmails,
} from './transactionalEmailTriggers';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logging';
import {
  RIDE_LIFECYCLE_CONTRACT_VERSION,
  rideBookingRecordSchema,
} from '../contracts/rideLifecycle';
import { parseContract } from '../contracts/validation';
import { allowLocalPersistenceFallback, requireLocalPersistenceFallback } from './runtimePolicy';
import {
  enqueuePendingSync,
  incrementSyncRetry,
  loadPendingSyncs,
  RIDE_BOOKINGS_CHANGED_EVENT,
  readBookings,
  removePendingSync,
  upsertBookings,
  writeBookings,
  type PendingSyncEntry,
} from './storage/BookingStorageAdapter';

// ─── Re-export the event name so callers don't need to know the adapter ───────
export { RIDE_BOOKINGS_CHANGED_EVENT };

// ─── Domain types ─────────────────────────────────────────────────────────────

export type RideBookingStatus =
  | 'pending_driver'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type RidePaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

export type RideBookingSyncState = 'local-only' | 'syncing' | 'synced' | 'sync-error';

export interface RideBookingRecord {
  id: string;
  rideId: string;
  ownerId?: string;
  driverPhone?: string;
  driverEmail?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driverName: string;
  passengerName: string;
  passengerPhone?: string;
  passengerEmail?: string;
  seatsRequested: number;
  status: RideBookingStatus;
  paymentStatus: RidePaymentStatus;
  routeMode: 'live_post' | 'network_inventory';
  supportThreadOpen: boolean;
  ticketCode: string;
  pricePerSeatJod?: number;
  totalPriceJod?: number;
  createdAt: string;
  updatedAt: string;
  backendBookingId?: string;
  syncedAt?: string;
  /** True when a Supabase sync failed and a retry is pending. */
  pendingSync?: boolean;
  syncState?: RideBookingSyncState;
}

export type RideBookingCustomerState = 'pending' | 'confirmed' | 'closed';

// ─── State machine ────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<RideBookingStatus, readonly RideBookingStatus[]> = {
  pending_driver: ['confirmed', 'rejected', 'cancelled'],
  confirmed:      ['completed', 'cancelled'],
  rejected:       [],
  cancelled:      [],
  completed:      [],
};

export function getRideBookingCustomerState(
  booking: Pick<RideBookingRecord, 'backendBookingId' | 'status' | 'syncState'>,
): RideBookingCustomerState {
  if (['cancelled', 'rejected', 'completed'].includes(booking.status)) return 'closed';
  if (booking.status === 'confirmed' && (booking.syncState === 'synced' || Boolean(booking.backendBookingId))) return 'confirmed';
  return 'pending';
}

export function isRideBookingConfirmed(
  booking: Pick<RideBookingRecord, 'backendBookingId' | 'status' | 'syncState'>,
): boolean {
  return getRideBookingCustomerState(booking) === 'confirmed';
}

export function isRideBookingPending(
  booking: Pick<RideBookingRecord, 'backendBookingId' | 'status' | 'syncState'>,
): boolean {
  return getRideBookingCustomerState(booking) === 'pending';
}

export function canTransitionRideBookingStatus(
  currentStatus: RideBookingStatus,
  nextStatus: RideBookingStatus,
): boolean {
  return currentStatus === nextStatus || ALLOWED_TRANSITIONS[currentStatus].includes(nextStatus);
}

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateBooking(record: RideBookingRecord, contractName: string): RideBookingRecord {
  return parseContract(rideBookingRecordSchema, record, contractName, RIDE_LIFECYCLE_CONTRACT_VERSION);
}

function markSyncState(
  booking: RideBookingRecord,
  syncState: RideBookingSyncState,
): RideBookingRecord {
  return validateBooking(
    {
      ...booking,
      syncState,
      pendingSync: syncState === 'syncing' || syncState === 'sync-error',
      syncedAt: syncState === 'synced' ? new Date().toISOString() : booking.syncedAt,
    },
    'ride.booking.state',
  );
}

function makeTicketCode(): string {
  return `RIDE-${Math.floor(100_000 + Math.random() * 900_000)}`;
}

// ─── Sync queue drain ─────────────────────────────────────────────────────────

async function attemptSyncEntry(entry: PendingSyncEntry): Promise<void> {
  try {
    const { booking: persisted } = await createDirectBooking({
      bookingStatus: entry.status,
      dropoff: entry.to,
      metadata: { total_price: entry.totalPriceJod ?? entry.seatsRequested },
      pickup: entry.from,
      seatsRequested: entry.seatsRequested,
      tripId: entry.rideId,
      userId: entry.passengerId,
    });

    const backendId = String(persisted.booking_id ?? persisted.id ?? '');
    const bookings = readBookings();
    const idx = bookings.findIndex(b => b.id === entry.bookingId);

    if (idx !== -1 && bookings[idx]) {
      const current = bookings[idx];
      const synced = markSyncState(
        { ...current, backendBookingId: backendId, updatedAt: new Date().toISOString() },
        'synced',
      );
      bookings[idx] = synced;
      writeBookings(bookings);

      if (synced.passengerEmail && !isRideBookingConfirmed(current) && isRideBookingConfirmed(synced)) {
        triggerRideBookingEmails({
          appUrl: getTransactionalEmailAppUrl(),
          booking: synced,
          driverEmail: synced.driverEmail,
          passengerEmail: synced.passengerEmail,
          priceJod: synced.totalPriceJod ?? 0,
        });
      }
    }

    removePendingSync(entry.bookingId);
  } catch {
    // Mark booking as sync-error in storage
    const bookings = readBookings();
    const idx = bookings.findIndex(b => b.id === entry.bookingId);
    if (idx !== -1 && bookings[idx]) {
      bookings[idx] = markSyncState(
        { ...bookings[idx], updatedAt: new Date().toISOString() },
        'sync-error',
      );
      writeBookings(bookings);
    }

    incrementSyncRetry(entry.bookingId);
  }
}

/** Drain the pending sync queue — called at startup and on reconnect. */
export async function drainPendingBookingSyncs(): Promise<void> {
  if (!allowLocalPersistenceFallback()) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  const pending = loadPendingSyncs();
  if (pending.length === 0) return;

  for (const entry of pending) {
    await attemptSyncEntry(entry);
    await new Promise(r => setTimeout(r, 150)); // throttle
  }
}

export function getPendingRideBookingSyncs(): PendingSyncEntry[] {
  return loadPendingSyncs();
}

// Wire drain to reconnect event once at module load
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void drainPendingBookingSyncs());
}

// ─── Read helpers (public, thin wrappers over the adapter) ────────────────────

export function getRideBookings(): RideBookingRecord[] {
  return readBookings();
}

export function getBookingsForRide(rideId: string): RideBookingRecord[] {
  return readBookings().filter(b => b.rideId === rideId);
}

export function getBookingsForDriver(userId: string, rides: PostedRide[]): RideBookingRecord[] {
  const rideIds = new Set(rides.filter(r => r.ownerId === userId).map(r => r.id));
  return readBookings().filter(b => b.ownerId === userId || rideIds.has(b.rideId));
}

export function getBookingsForPassenger(passengerName: string): RideBookingRecord[] {
  return readBookings().filter(b => b.passengerName === passengerName);
}

// ─── Synced booking builder ───────────────────────────────────────────────────

function buildSyncedBooking(
  booking: RideBookingRecord,
  persisted: Record<string, unknown>,
): RideBookingRecord {
  const persistedStatus = String(persisted.status ?? persisted.booking_status ?? booking.status);

  return markSyncState(
    validateBooking(
      {
        ...booking,
        backendBookingId: String(persisted.booking_id ?? persisted.id ?? booking.id),
        id: String(persisted.booking_id ?? persisted.id ?? booking.id),
        paymentStatus: persistedStatus === 'confirmed' ? 'authorized' : booking.paymentStatus,
        pricePerSeatJod: typeof persisted.price_per_seat === 'number' ? persisted.price_per_seat : booking.pricePerSeatJod,
        status: ['confirmed', 'cancelled', 'completed'].includes(persistedStatus)
          ? (persistedStatus as RideBookingStatus)
          : booking.status,
        totalPriceJod: typeof persisted.total_price === 'number' ? persisted.total_price : booking.totalPriceJod,
        updatedAt: new Date().toISOString(),
      },
      'ride.booking.synced',
    ),
    'synced',
  );
}

// ─── Side-effects after status transitions ────────────────────────────────────

function handleStatusSideEffects(
  previous: RideBookingRecord,
  updated: RideBookingRecord,
  bookingId: string,
): void {
  if (updated.status === previous.status) return;

  if (updated.passengerEmail && ['confirmed', 'rejected', 'cancelled'].includes(updated.status)) {
    triggerBookingStatusUpdateEmail({
      date: updated.date,
      driverName: updated.driverName,
      from: updated.from,
      newStatus: updated.status as 'confirmed' | 'rejected' | 'cancelled',
      passengerEmail: updated.passengerEmail,
      passengerName: updated.passengerName,
      priceJod: updated.totalPriceJod ?? 0,
      ticketCode: updated.ticketCode,
      time: updated.time,
      to_city: updated.to,
    });
  }

  if (updated.status === 'completed' && updated.passengerEmail && updated.driverEmail) {
    triggerRideCompletedEmails({
      appUrl: getTransactionalEmailAppUrl(),
      date: updated.date,
      driverEmail: updated.driverEmail,
      driverEarningsJod: updated.totalPriceJod ?? 0,
      driverName: updated.driverName,
      from: updated.from,
      passengerEmail: updated.passengerEmail,
      passengerName: updated.passengerName,
      ticketCode: updated.ticketCode,
      to_city: updated.to,
    });
  }

  void trackGrowthEvent({
    eventName: 'ride_booking_updated',
    from: updated.from,
    funnelStage: updated.status === 'completed' ? 'completed' : updated.status === 'confirmed' ? 'booked' : updated.status,
    metadata: { bookingId, paymentStatus: updated.paymentStatus },
    serviceType: 'ride',
    to: updated.to,
  });
}

// ─── Core mutations ───────────────────────────────────────────────────────────

export async function createRideBooking(input: {
  date: string;
  driverEmail?: string;
  driverName: string;
  driverPhone?: string;
  from: string;
  ownerId?: string;
  passengerId?: string;
  passengerEmail?: string;
  passengerName: string;
  passengerPhone?: string;
  pricePerSeatJod?: number;
  rideId: string;
  routeMode: 'live_post' | 'network_inventory';
  seatsRequested?: number;
  time: string;
  to: string;
}): Promise<RideBookingRecord> {
  const now = new Date().toISOString();
  const seatsRequested = Math.max(1, input.seatsRequested ?? 1);
  const totalPriceJod =
    typeof input.pricePerSeatJod === 'number'
      ? Number((seatsRequested * input.pricePerSeatJod).toFixed(2))
      : undefined;

  const booking = validateBooking(
    {
      backendBookingId: undefined,
      createdAt: now,
      date: input.date,
      driverEmail: input.driverEmail,
      driverName: input.driverName,
      driverPhone: input.driverPhone,
      from: input.from,
      id: `ride-booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId: input.ownerId,
      passengerEmail: input.passengerEmail,
      passengerName: input.passengerName,
      passengerPhone: input.passengerPhone,
      paymentStatus: input.routeMode === 'live_post' ? 'pending' : 'authorized',
      pendingSync: Boolean(input.passengerId),
      pricePerSeatJod: input.pricePerSeatJod,
      rideId: input.rideId,
      routeMode: input.routeMode,
      seatsRequested,
      status: input.routeMode === 'live_post' ? 'pending_driver' : 'confirmed',
      supportThreadOpen: false,
      syncState: input.passengerId ? 'syncing' : 'local-only',
      syncedAt: undefined,
      ticketCode: makeTicketCode(),
      time: input.time,
      to: input.to,
      totalPriceJod,
      updatedAt: now,
    },
    'ride.booking.create',
  );

  const shouldSendEmail = Boolean(
    booking.passengerEmail &&
    (booking.status === 'pending_driver' || isRideBookingConfirmed(booking)),
  );

  // ── Path A: no authenticated user — pure local ─────────────────────────────
  if (!input.passengerId) {
    requireLocalPersistenceFallback('Ride booking creation');
    writeBookings([booking, ...readBookings()]);

    if (booking.passengerEmail && shouldSendEmail) {
      triggerRideBookingEmails({
        appUrl: getTransactionalEmailAppUrl(),
        booking,
        driverEmail: booking.driverEmail,
        passengerEmail: booking.passengerEmail,
        priceJod: booking.totalPriceJod ?? 0,
      });
    }

    void trackGrowthEvent({
      eventName: 'ride_booking_started',
      from: input.from,
      funnelStage: isRideBookingConfirmed(booking) ? 'booked' : 'selected',
      metadata: { pricePerSeatJod: input.pricePerSeatJod, rideId: input.rideId, routeMode: input.routeMode, seatsRequested: booking.seatsRequested },
      serviceType: 'ride',
      to: input.to,
      valueJod: totalPriceJod,
    });

    return booking;
  }

  // ── Path B: no local persistence allowed — direct Supabase only ───────────
  if (!allowLocalPersistenceFallback()) {
    try {
      const { booking: persisted } = await createDirectBooking({
        bookingStatus: booking.status,
        dropoff: input.to,
        metadata: { total_price: booking.totalPriceJod ?? booking.seatsRequested },
        pickup: input.from,
        seatsRequested: booking.seatsRequested,
        tripId: input.rideId,
        userId: input.passengerId,
      });

      const synced = buildSyncedBooking(booking, persisted as Record<string, unknown>);
      upsertBookings([synced]);

      if (synced.passengerEmail && (synced.status === 'pending_driver' || isRideBookingConfirmed(synced))) {
        triggerRideBookingEmails({
          appUrl: getTransactionalEmailAppUrl(),
          booking: synced,
          driverEmail: synced.driverEmail,
          passengerEmail: synced.passengerEmail,
          priceJod: synced.totalPriceJod ?? 0,
        });
      }

      return synced;
    } catch (error) {
      logger.warning('[rideLifecycle] Direct booking persistence unavailable; using local fallback.', {
        error: error instanceof Error ? error.message : String(error),
        operation: 'ride.booking.direct_fallback',
        passengerId: input.passengerId,
        rideId: input.rideId,
      });

      const fallback = markSyncState(
        { ...booking, pendingSync: false, updatedAt: new Date().toISOString() },
        'sync-error',
      );
      writeBookings([fallback, ...readBookings()]);
      return fallback;
    }
  }

  // ── Path C: optimistic local write + async Supabase sync ──────────────────
  writeBookings([booking, ...readBookings()]);

  if (booking.passengerEmail && shouldSendEmail) {
    triggerRideBookingEmails({
      appUrl: getTransactionalEmailAppUrl(),
      booking,
      driverEmail: booking.driverEmail,
      passengerEmail: booking.passengerEmail,
      priceJod: booking.totalPriceJod ?? 0,
    });
  }

  void trackGrowthEvent({
    eventName: 'ride_booking_started',
    from: input.from,
    funnelStage: isRideBookingConfirmed(booking) ? 'booked' : 'selected',
    metadata: { pricePerSeatJod: input.pricePerSeatJod, rideId: input.rideId, routeMode: input.routeMode, seatsRequested: booking.seatsRequested },
    serviceType: 'ride',
    to: input.to,
    userId: input.passengerId,
    valueJod: totalPriceJod,
  });

  const passengerId = input.passengerId;
  void createDirectBooking({
    bookingStatus: booking.status,
    dropoff: input.to,
    metadata: { total_price: booking.totalPriceJod ?? booking.seatsRequested },
    pickup: input.from,
    seatsRequested: booking.seatsRequested,
    tripId: input.rideId,
    userId: passengerId,
  })
    .then(({ booking: persisted }) => {
      const synced = buildSyncedBooking(booking, persisted as Record<string, unknown>);
      upsertBookings([synced]);
      if (synced.passengerEmail && !shouldSendEmail && isRideBookingConfirmed(synced)) {
        triggerRideBookingEmails({
          appUrl: getTransactionalEmailAppUrl(),
          booking: synced,
          driverEmail: synced.driverEmail,
          passengerEmail: synced.passengerEmail,
          priceJod: synced.totalPriceJod ?? 0,
        });
      }
    })
    .catch(() => {
      upsertBookings([
        markSyncState({ ...booking, updatedAt: new Date().toISOString() }, 'sync-error'),
      ]);
      enqueuePendingSync({
        bookingId: booking.id,
        from: input.from,
        passengerId,
        pricePerSeatJod: booking.pricePerSeatJod,
        rideId: input.rideId,
        seatsRequested: booking.seatsRequested,
        status: booking.status,
        to: input.to,
        totalPriceJod: booking.totalPriceJod,
      });
    });

  return booking;
}

export async function updateRideBooking(
  bookingId: string,
  updates: Partial<Pick<RideBookingRecord, 'paymentStatus' | 'status' | 'supportThreadOpen'>>,
): Promise<RideBookingRecord | null> {
  const bookings = readBookings();
  const target = bookings.find(b => b.id === bookingId);
  if (!target) return null;

  if (updates.status && !canTransitionRideBookingStatus(target.status, updates.status)) {
    throw new ValidationError(
      `Invalid ride booking transition from ${target.status} to ${updates.status}.`,
      { bookingId, fromStatus: target.status, toStatus: updates.status },
    );
  }

  const updated = validateBooking(
    { ...target, ...updates, updatedAt: new Date().toISOString() },
    'ride.booking.update',
  );

  const isDriverMutation = Boolean(
    updated.backendBookingId &&
    updates.status &&
    ['rejected', 'cancelled', 'confirmed'].includes(updates.status),
  );

  if (isDriverMutation && !allowLocalPersistenceFallback()) {
    const directStatus = updates.status === 'confirmed' ? 'accepted' : updates.status;
    const backendBookingId = updated.backendBookingId;
    if (!backendBookingId) {
      throw new Error('Driver mutation requires a backend booking id.');
    }
    await updateDirectBookingStatus(
      backendBookingId,
      directStatus as 'accepted' | 'rejected' | 'cancelled',
    );
    const synced = markSyncState(updated, 'synced');
    writeBookings(bookings.map(b => (b.id === bookingId ? synced : b)));
    handleStatusSideEffects(target, synced, bookingId);
    return synced;
  }

  writeBookings(bookings.map(b => (b.id === bookingId ? updated : b)));

  if (isDriverMutation) {
    const directStatus = updates.status === 'confirmed' ? 'accepted' : updates.status;
    const backendBookingId = updated.backendBookingId;
    if (!backendBookingId) {
      return updated;
    }
    void updateDirectBookingStatus(
      backendBookingId,
      directStatus as 'accepted' | 'rejected' | 'cancelled',
    )
      .then(() => upsertBookings([markSyncState(updated, 'synced')]))
      .catch(() => upsertBookings([markSyncState(updated, 'sync-error')]));
  }

  handleStatusSideEffects(target, updated, bookingId);
  return updated;
}

export async function hydrateRideBookings(
  userId: string,
  rides: PostedRide[] = [],
): Promise<RideBookingRecord[]> {
  const [passengerResult, driverResult] = await Promise.allSettled([
    getDirectUserBookings(userId),
    getDirectDriverBookings(userId),
  ]);

  const knownRides = new Map(rides.map(r => [r.id, r]));

  const normalize = (raw: Record<string, unknown>): RideBookingRecord => {
    const rideId = String(raw.trip_id ?? '');
    const ride = knownRides.get(rideId);
    const rawStatus = String(raw.status ?? raw.booking_status ?? 'pending');
    const status: RideBookingStatus =
      rawStatus === 'accepted' ? 'confirmed'
      : ['confirmed', 'cancelled', 'completed', 'rejected'].includes(rawStatus)
        ? (rawStatus as RideBookingStatus)
        : 'pending_driver';

    return validateBooking(
      {
        backendBookingId: String(raw.booking_id ?? raw.id ?? ''),
        createdAt: String(raw.created_at ?? new Date().toISOString()),
        date: ride?.date ?? new Date(String(raw.created_at ?? '')).toISOString().slice(0, 10),
        driverEmail: ride?.ownerEmail,
        driverName: ride ? ride.carModel || 'Wasel Captain' : 'Wasel Captain',
        driverPhone: ride?.ownerPhone,
        from: String(raw.pickup_location ?? ride?.from ?? ''),
        id: String(raw.booking_id ?? raw.id ?? ''),
        ownerId: ride?.ownerId,
        passengerEmail: undefined,
        passengerName: 'Passenger',
        passengerPhone: undefined,
        paymentStatus: status === 'completed' ? 'captured' : ['cancelled', 'rejected'].includes(status) ? 'failed' : 'authorized',
        pendingSync: false,
        pricePerSeatJod: Number(raw.price_per_seat ?? 0) || undefined,
        rideId,
        routeMode: ride ? 'live_post' : 'network_inventory',
        seatsRequested: Number(raw.seats_requested ?? 1) || 1,
        status,
        supportThreadOpen: false,
        syncState: 'synced',
        syncedAt: new Date().toISOString(),
        ticketCode: `RIDE-${String(raw.booking_id ?? raw.id ?? '').slice(-6).toUpperCase() || 'SYNCED'}`,
        time: ride?.time ?? '08:00',
        to: String(raw.dropoff_location ?? ride?.to ?? ''),
        totalPriceJod: Number(raw.total_price ?? raw.amount ?? 0) || undefined,
        updatedAt: String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()),
      },
      'ride.booking.hydrate',
    );
  };

  const remote = [
    ...(passengerResult.status === 'fulfilled' ? passengerResult.value : []),
    ...(driverResult.status === 'fulfilled' ? driverResult.value : []),
  ]
    .map(item => normalize(item as Record<string, unknown>))
    .filter(item => Boolean(item.id));

  if (remote.length > 0) upsertBookings(remote);

  void drainPendingBookingSyncs();

  return getRideBookings();
}

export function syncRideBookingCompletion(referenceDate = Date.now()): RideBookingRecord[] {
  const now = referenceDate;
  const bookings = readBookings();
  const completed: RideBookingRecord[] = [];

  const next = bookings.map(booking => {
    if (booking.status !== 'confirmed') return booking;

    const tripTime = new Date(`${booking.date}T${booking.time || '00:00'}`).getTime();
    if (!Number.isFinite(tripTime) || tripTime > now) return booking;

    const done = validateBooking(
      {
        ...booking,
        paymentStatus: booking.paymentStatus === 'authorized' ? 'captured' : booking.paymentStatus,
        status: 'completed' as RideBookingStatus,
        updatedAt: new Date(now).toISOString(),
      },
      'ride.booking.auto-complete',
    );
    completed.push(done);
    return done;
  });

  writeBookings(next);

  for (const booking of completed) {
    if (booking.passengerEmail && booking.driverEmail) {
      triggerRideCompletedEmails({
        appUrl: getTransactionalEmailAppUrl(),
        date: booking.date,
        driverEmail: booking.driverEmail,
        driverEarningsJod: booking.totalPriceJod ?? 0,
        driverName: booking.driverName,
        from: booking.from,
        passengerEmail: booking.passengerEmail,
        passengerName: booking.passengerName,
        ticketCode: booking.ticketCode,
        to_city: booking.to,
      });
    }
  }

  return readBookings();
}
