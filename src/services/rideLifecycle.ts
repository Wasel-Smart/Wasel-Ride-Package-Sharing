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

export type RideBookingStatus =
  | 'pending_driver'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type RidePaymentStatus =
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'refunded'
  | 'failed';

export type RideBookingSyncState =
  | 'local-only'
  | 'syncing'
  | 'synced'
  | 'sync-error';

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
  /** True when the Supabase sync failed and a retry is pending */
  pendingSync?: boolean;
  syncState?: RideBookingSyncState;
}

const ALLOWED_RIDE_STATUS_TRANSITIONS: Record<RideBookingStatus, readonly RideBookingStatus[]> = {
  pending_driver: ['confirmed', 'rejected', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  rejected: [],
  cancelled: [],
  completed: [],
};

export function canTransitionRideBookingStatus(
  currentStatus: RideBookingStatus,
  nextStatus: RideBookingStatus,
): boolean {
  return currentStatus === nextStatus || ALLOWED_RIDE_STATUS_TRANSITIONS[currentStatus].includes(nextStatus);
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline-resilient Supabase sync helpers
// ─────────────────────────────────────────────────────────────────────────────

const PENDING_SYNCS_KEY = 'wasel-pending-booking-syncs';

interface PendingSyncEntry {
  bookingId: string;
  passengerId: string;
  rideId: string;
  seatsRequested: number;
  from: string;
  to: string;
  status: RideBookingStatus;
  totalPriceJod?: number;
  pricePerSeatJod?: number;
  retries: number;
  queuedAt: number;
}

function markRideBookingSyncState(
  booking: RideBookingRecord,
  syncState: RideBookingSyncState,
): RideBookingRecord {
  return {
    ...booking,
    syncState,
    pendingSync: syncState === 'syncing' || syncState === 'sync-error',
    syncedAt: syncState === 'synced' ? new Date().toISOString() : booking.syncedAt,
  };
}

function loadPendingSyncs(): PendingSyncEntry[] {
  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(PENDING_SYNCS_KEY) : null;
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePendingSyncs(entries: PendingSyncEntry[]): void {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(PENDING_SYNCS_KEY, JSON.stringify(entries.slice(0, 50)));
    }
  } catch { /* storage unavailable */ }
}

function enqueuePendingSync(entry: Omit<PendingSyncEntry, 'retries' | 'queuedAt'>): void {
  const existing = loadPendingSyncs();
  // Deduplicate by bookingId
  const filtered = existing.filter((e) => e.bookingId !== entry.bookingId);
  savePendingSyncs([...filtered, { ...entry, retries: 0, queuedAt: Date.now() }]);
}

function removePendingSync(bookingId: string): void {
  savePendingSyncs(loadPendingSyncs().filter((e) => e.bookingId !== bookingId));
}

async function attemptSyncEntry(entry: PendingSyncEntry): Promise<void> {
  try {
    const { booking: persisted } = await createDirectBooking({
      tripId: entry.rideId,
      userId: entry.passengerId,
      seatsRequested: entry.seatsRequested,
      pickup: entry.from,
      dropoff: entry.to,
      bookingStatus: entry.status,
      metadata: { total_price: entry.totalPriceJod ?? entry.seatsRequested },
    });

    const backendId = String(persisted.booking_id ?? persisted.id ?? '');
    // Patch local record with backend ID
    const bookings = readBookings();
    const idx = bookings.findIndex((b) => b.id === entry.bookingId);
    if (idx !== -1) {
      bookings[idx] = markRideBookingSyncState({
        ...bookings[idx],
        backendBookingId: backendId,
        updatedAt: new Date().toISOString(),
      }, 'synced');
      writeBookings(bookings);
    }
    removePendingSync(entry.bookingId);
  } catch {
    const bookings = readBookings();
    const idx = bookings.findIndex((b) => b.id === entry.bookingId);
    if (idx !== -1) {
      bookings[idx] = markRideBookingSyncState({
        ...bookings[idx],
        updatedAt: new Date().toISOString(),
      }, 'sync-error');
      writeBookings(bookings);
    }
    // Increment retry count; give up after 10 attempts
    const all = loadPendingSyncs();
    const updated = all.map((e) =>
      e.bookingId === entry.bookingId ? { ...e, retries: e.retries + 1 } : e,
    );
    savePendingSyncs(updated.filter((e) => e.retries < 10));
  }
}

/** Drain all pending syncs — called on reconnect and on app start */
export async function drainPendingBookingSyncs(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const pending = loadPendingSyncs();
  if (pending.length === 0) return;

  for (const entry of pending) {
    await attemptSyncEntry(entry);
    // Throttle
    await new Promise((r) => setTimeout(r, 150));
  }
}

export function getPendingRideBookingSyncs(): PendingSyncEntry[] {
  return loadPendingSyncs();
}

// Wire drain to reconnect event once
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void drainPendingBookingSyncs();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Core booking storage
// ─────────────────────────────────────────────────────────────────────────────

const BOOKING_KEY = 'wasel-ride-booking-records';

function readBookings(): RideBookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOKING_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBookings(bookings: RideBookingRecord[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings.slice(0, 100)));
}

function upsertBookings(records: RideBookingRecord[]) {
  const current = new Map(readBookings().map((booking) => [booking.id, booking]));
  for (const record of records) {
    current.set(record.id, record);
  }
  writeBookings(sortBookings(Array.from(current.values())));
}

function sortBookings(items: RideBookingRecord[]) {
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function makeTicketCode() {
  return `RIDE-${Math.floor(100000 + Math.random() * 900000)}`;
}

export function getRideBookings(): RideBookingRecord[] {
  return sortBookings(readBookings());
}

export function createRideBooking(input: {
  rideId: string;
  ownerId?: string;
  driverPhone?: string;
  driverEmail?: string;
  passengerId?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driverName: string;
  passengerName: string;
  passengerPhone?: string;
  passengerEmail?: string;
  seatsRequested?: number;
  pricePerSeatJod?: number;
  routeMode: 'live_post' | 'network_inventory';
}): RideBookingRecord {
  const now = new Date().toISOString();
  const seatsRequested = Math.max(1, input.seatsRequested ?? 1);
  const totalPriceJod =
    typeof input.pricePerSeatJod === 'number'
      ? Number((seatsRequested * input.pricePerSeatJod).toFixed(2))
      : undefined;
  const booking: RideBookingRecord = {
    id: `ride-booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    rideId: input.rideId,
    ownerId: input.ownerId,
    driverPhone: input.driverPhone,
    driverEmail: input.driverEmail,
    from: input.from,
    to: input.to,
    date: input.date,
    time: input.time,
    driverName: input.driverName,
    passengerName: input.passengerName,
    passengerPhone: input.passengerPhone,
    passengerEmail: input.passengerEmail,
    seatsRequested,
    status: input.routeMode === 'live_post' ? 'pending_driver' : 'confirmed',
    paymentStatus: input.routeMode === 'live_post' ? 'pending' : 'authorized',
    routeMode: input.routeMode,
    supportThreadOpen: false,
    ticketCode: makeTicketCode(),
    pricePerSeatJod: input.pricePerSeatJod,
    totalPriceJod,
    createdAt: now,
    updatedAt: now,
    pendingSync: Boolean(input.passengerId), // will be cleared on successful sync
    syncState: input.passengerId ? 'syncing' : 'local-only',
  };

  writeBookings([booking, ...readBookings()]);
  if (booking.passengerEmail) {
    triggerRideBookingEmails({
      booking,
      passengerEmail: booking.passengerEmail,
      driverEmail: booking.driverEmail,
      priceJod: booking.totalPriceJod ?? 0,
      appUrl: getTransactionalEmailAppUrl(),
    });
  }
  void trackGrowthEvent({
    userId: input.passengerId,
    eventName: 'ride_booking_started',
    funnelStage: booking.status === 'pending_driver' ? 'selected' : 'booked',
    serviceType: 'ride',
    from: input.from,
    to: input.to,
    valueJod: totalPriceJod,
    metadata: {
      rideId: input.rideId,
      routeMode: input.routeMode,
      seatsRequested: booking.seatsRequested,
      pricePerSeatJod: input.pricePerSeatJod,
    },
  });
  if (input.passengerId) {
    const passengerId = input.passengerId;
    void createDirectBooking({
      tripId: input.rideId,
      userId: passengerId,
      seatsRequested: booking.seatsRequested,
      pickup: input.from,
      dropoff: input.to,
      bookingStatus: booking.status,
      metadata: {
        total_price: booking.totalPriceJod ?? booking.seatsRequested,
      },
    })
      .then(({ booking: persisted }) => {
        const synced: RideBookingRecord = {
          ...booking,
          id: String(persisted.booking_id ?? persisted.id ?? booking.id),
          backendBookingId: String(persisted.booking_id ?? persisted.id ?? booking.id),
          status:
            persisted.status === 'confirmed' || persisted.status === 'cancelled' || persisted.status === 'completed'
              ? persisted.status
              : booking.status,
          paymentStatus:
            persisted.status === 'confirmed'
              ? 'authorized'
              : booking.paymentStatus,
          pricePerSeatJod:
            typeof persisted.price_per_seat === 'number'
              ? persisted.price_per_seat
              : booking.pricePerSeatJod,
          totalPriceJod:
            typeof persisted.total_price === 'number'
              ? persisted.total_price
              : booking.totalPriceJod,
          updatedAt: new Date().toISOString(),
        };
        upsertBookings([markRideBookingSyncState(synced, 'synced')]);
      })
      .catch(() => {
        upsertBookings([markRideBookingSyncState({
          ...booking,
          updatedAt: new Date().toISOString(),
        }, 'sync-error')]);
        // Sync failed (offline or transient error) — enqueue for retry on reconnect
        enqueuePendingSync({
          bookingId: booking.id,
          passengerId,
          rideId: input.rideId,
          seatsRequested: booking.seatsRequested,
          from: input.from,
          to: input.to,
          status: booking.status,
          totalPriceJod: booking.totalPriceJod,
          pricePerSeatJod: booking.pricePerSeatJod,
        });
      });
  }
  return booking;
}

export function getBookingsForRide(rideId: string): RideBookingRecord[] {
  return getRideBookings().filter((booking) => booking.rideId === rideId);
}

export function getBookingsForDriver(userId: string, rides: PostedRide[]): RideBookingRecord[] {
  const rideIds = new Set(rides.filter((ride) => ride.ownerId === userId).map((ride) => ride.id));
  return getRideBookings().filter((booking) => booking.ownerId === userId || rideIds.has(booking.rideId));
}

export function getBookingsForPassenger(passengerName: string): RideBookingRecord[] {
  return getRideBookings().filter((booking) => booking.passengerName === passengerName);
}

export function updateRideBooking(
  bookingId: string,
  updates: Partial<Pick<RideBookingRecord, 'status' | 'paymentStatus' | 'supportThreadOpen'>>,
): RideBookingRecord | null {
  const bookings = readBookings();
  const target = bookings.find((booking) => booking.id === bookingId);
  if (!target) return null;

  if (updates.status && !canTransitionRideBookingStatus(target.status, updates.status)) {
    throw new ValidationError(
      `Invalid ride booking transition from ${target.status} to ${updates.status}.`,
      { bookingId, fromStatus: target.status, toStatus: updates.status },
    );
  }

  const updated: RideBookingRecord = {
    ...target,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  writeBookings(bookings.map((booking) => (booking.id === bookingId ? updated : booking)));

  if (updated.backendBookingId && updates.status && (updates.status === 'rejected' || updates.status === 'cancelled' || updates.status === 'confirmed')) {
    const directStatus = updates.status === 'confirmed' ? 'accepted' : updates.status;
    void updateDirectBookingStatus(updated.backendBookingId, directStatus as 'accepted' | 'rejected' | 'cancelled')
      .then(() => {
        upsertBookings([markRideBookingSyncState(updated, 'synced')]);
      })
      .catch(() => {
        // Status update failed — mark as pending so it retries on reconnect
        upsertBookings([markRideBookingSyncState(updated, 'sync-error')]);
      });
  }

  if (updates.status) {
    if (
      updates.status !== target.status &&
      updated.passengerEmail &&
      (updates.status === 'confirmed' || updates.status === 'rejected' || updates.status === 'cancelled')
    ) {
      triggerBookingStatusUpdateEmail({
        passengerEmail: updated.passengerEmail,
        passengerName: updated.passengerName,
        ticketCode: updated.ticketCode,
        from: updated.from,
        to_city: updated.to,
        date: updated.date,
        time: updated.time,
        driverName: updated.driverName,
        newStatus: updates.status,
        priceJod: updated.totalPriceJod ?? 0,
      });
    }

    if (
      updates.status === 'completed' &&
      updates.status !== target.status &&
      updated.passengerEmail &&
      updated.driverEmail
    ) {
      triggerRideCompletedEmails({
        passengerEmail: updated.passengerEmail,
        passengerName: updated.passengerName,
        driverEmail: updated.driverEmail,
        driverName: updated.driverName,
        ticketCode: updated.ticketCode,
        from: updated.from,
        to_city: updated.to,
        date: updated.date,
        driverEarningsJod: updated.totalPriceJod ?? 0,
        appUrl: getTransactionalEmailAppUrl(),
      });
    }

    void trackGrowthEvent({
      eventName: 'ride_booking_updated',
      funnelStage:
        updates.status === 'completed'
          ? 'completed'
          : updates.status === 'confirmed'
            ? 'booked'
            : updates.status,
      serviceType: 'ride',
      from: updated.from,
      to: updated.to,
      metadata: {
        bookingId,
        paymentStatus: updated.paymentStatus,
      },
    });
  }

  return updated;
}

export async function hydrateRideBookings(userId: string, rides: PostedRide[] = []): Promise<RideBookingRecord[]> {
  const [passengerBookings, driverBookings] = await Promise.allSettled([
    getDirectUserBookings(userId),
    getDirectDriverBookings(userId),
  ]);

  const knownRides = new Map(rides.map((ride) => [ride.id, ride]));
  const normalize = (raw: Record<string, unknown>): RideBookingRecord => {
    const rideId = String(raw.trip_id ?? '');
    const ride = knownRides.get(rideId);
    const status = String(raw.status ?? raw.booking_status ?? 'pending');
    return {
      id: String(raw.booking_id ?? raw.id ?? ''),
      backendBookingId: String(raw.booking_id ?? raw.id ?? ''),
      rideId,
      ownerId: ride?.ownerId,
      driverPhone: ride?.ownerPhone,
      driverEmail: ride?.ownerEmail,
      from: String(raw.pickup_location ?? ride?.from ?? ''),
      to: String(raw.dropoff_location ?? ride?.to ?? ''),
      date: ride?.date ?? new Date(String(raw.created_at ?? new Date().toISOString())).toISOString().slice(0, 10),
      time: ride?.time ?? '08:00',
      driverName: ride ? ride.carModel || 'Wasel Captain' : 'Wasel Captain',
      passengerName: 'Passenger',
      passengerPhone: undefined,
      passengerEmail: undefined,
      seatsRequested: Number(raw.seats_requested ?? 1) || 1,
      status:
        status === 'completed' || status === 'cancelled' || status === 'rejected' || status === 'confirmed'
          ? status
          : status === 'accepted'
            ? 'confirmed'
            : 'pending_driver',
      paymentStatus:
        status === 'completed'
          ? 'captured'
          : status === 'cancelled' || status === 'rejected'
            ? 'failed'
            : 'authorized',
      routeMode: ride ? 'live_post' : 'network_inventory',
      supportThreadOpen: false,
      ticketCode: `RIDE-${String(raw.booking_id ?? raw.id ?? '').slice(-6).toUpperCase() || 'SYNCED'}`,
      pricePerSeatJod: Number(raw.price_per_seat ?? 0) || undefined,
      totalPriceJod: Number(raw.total_price ?? raw.amount ?? 0) || undefined,
      createdAt: String(raw.created_at ?? new Date().toISOString()),
      updatedAt: String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()),
      syncedAt: new Date().toISOString(),
      pendingSync: false,
      syncState: 'synced',
    };
  };

  const remote = [
    ...(passengerBookings.status === 'fulfilled' ? passengerBookings.value : []),
    ...(driverBookings.status === 'fulfilled' ? driverBookings.value : []),
  ]
    .map((item) => normalize(item as Record<string, unknown>))
    .filter((item) => item.id);

  if (remote.length > 0) {
    upsertBookings(remote);
  }

  // Drain any pending syncs that were queued while offline
  void drainPendingBookingSyncs();

  return getRideBookings();
}

export function syncRideBookingCompletion(referenceDate = Date.now()): RideBookingRecord[] {
  const now = referenceDate;
  const bookings = readBookings();
  const completedThisPass: RideBookingRecord[] = [];
  const next = bookings.map((booking) => {
    if (booking.status !== 'confirmed') return booking;
    const tripTime = new Date(`${booking.date}T${booking.time || '00:00'}`).getTime();
    if (!Number.isFinite(tripTime) || tripTime > now) return booking;
    const completedBooking = {
      ...booking,
      status: 'completed' as RideBookingStatus,
      paymentStatus: booking.paymentStatus === 'authorized' ? 'captured' as RidePaymentStatus : booking.paymentStatus,
      updatedAt: new Date(now).toISOString(),
    };
    completedThisPass.push(completedBooking);
    return completedBooking;
  });

  writeBookings(next);
  for (const booking of completedThisPass) {
    if (booking.passengerEmail && booking.driverEmail) {
      triggerRideCompletedEmails({
        passengerEmail: booking.passengerEmail,
        passengerName: booking.passengerName,
        driverEmail: booking.driverEmail,
        driverName: booking.driverName,
        ticketCode: booking.ticketCode,
        from: booking.from,
        to_city: booking.to,
        date: booking.date,
        driverEarningsJod: booking.totalPriceJod ?? 0,
        appUrl: getTransactionalEmailAppUrl(),
      });
    }
  }
  return sortBookings(next);
}
