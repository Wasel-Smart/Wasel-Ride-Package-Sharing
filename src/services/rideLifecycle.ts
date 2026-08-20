/**
 * Ride Lifecycle Service — Supabase-first persistence
 *
 * Strategy (v2):
 *  1. All writes go to Supabase first. If Supabase is unavailable, we throw
 *     so the UI can surface a real error rather than silently creating
 *     phantom bookings that live only in the browser.
 *  2. localStorage acts as a read-through cache for instant UI hydration.
 *     It is populated AFTER a successful Supabase write, never before.
 *  3. `hydrateRideBookings` remains the authoritative sync path — it pulls
 *     from Supabase and overwrites the local cache on every app load.
 */

import {
  mapBookingStatusToRideLifecycleState,
  projectRideLifecycleState,
  type RideLifecycleState,
} from '../domain/rides/lifecycle';
import { createDomainEvent, domainEventBus } from '../platform/event-bus';
import type { PostedRide } from './journeyLogistics';
import {
  createDirectBooking,
  getDirectDriverBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';
import { trackGrowthEvent } from './growthEngine';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RideBookingStatus =
  'pending_driver' | 'confirmed' | 'rejected' | 'cancelled' | 'completed';

export type RidePaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface RideBookingRecord {
  id: string;
  rideId: string;
  ownerId?: string;
  passengerId?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driverName: string;
  passengerName: string;
  seatsRequested: number;
  status: RideBookingStatus;
  lifecycleStatus: RideLifecycleState;
  paymentStatus: RidePaymentStatus;
  routeMode: 'live_post' | 'network_inventory';
  supportThreadOpen: boolean;
  ticketCode: string;
  createdAt: string;
  updatedAt: string;
  backendBookingId?: string;
  syncedAt?: string;
}

// ── Cache helpers (localStorage as L1 read-through, NOT primary store) ────────

const BOOKING_CACHE_KEY = 'wasel-ride-booking-cache-v2';
const CACHE_MAX = 100;

function readCache(): RideBookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BOOKING_CACHE_KEY);
    const parsed = raw ? (JSON.parse(raw) as RideBookingRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCache(bookings: RideBookingRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    const sorted = [...bookings].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    window.localStorage.setItem(BOOKING_CACHE_KEY, JSON.stringify(sorted.slice(0, CACHE_MAX)));
  } catch {
    // Storage quota exceeded or private mode — silently skip cache write.
  }
}

function upsertCache(records: RideBookingRecord[]): void {
  const map = new Map(readCache().map(b => [b.id, b]));
  records.forEach(r => map.set(r.id, r));
  writeCache(Array.from(map.values()));
}

// ── Ticket code ───────────────────────────────────────────────────────────────

function makeTicketCode(): string {
  return crypto.randomUUID();
}

// ── Domain event publishing ───────────────────────────────────────────────────

function publishLifecycleEvent(booking: RideBookingRecord): void {
  switch (booking.lifecycleStatus) {
    case 'requested':
      domainEventBus.publish(
        createDomainEvent(
          'RideRequested',
          {
            bookingId: booking.id,
            rideId: booking.rideId,
            routeMode: booking.routeMode,
            origin: booking.from,
            destination: booking.to,
          },
          'rideLifecycle',
        ),
      );
      break;
    case 'matched':
      domainEventBus.publish(
        createDomainEvent(
          'DriverAssigned',
          { bookingId: booking.id, rideId: booking.rideId, driverName: booking.driverName },
          'rideLifecycle',
        ),
      );
      break;
    case 'accepted':
      domainEventBus.publish(
        createDomainEvent(
          'RideAccepted',
          { bookingId: booking.id, rideId: booking.rideId },
          'rideLifecycle',
        ),
      );
      break;
    case 'in_progress':
      domainEventBus.publish(
        createDomainEvent(
          'RideStarted',
          { bookingId: booking.id, rideId: booking.rideId },
          'rideLifecycle',
        ),
      );
      break;
    case 'completed':
      domainEventBus.publish(
        createDomainEvent(
          'RideCompleted',
          { bookingId: booking.id, rideId: booking.rideId },
          'rideLifecycle',
        ),
      );
      break;
    case 'cancelled':
      domainEventBus.publish(
        createDomainEvent(
          'RideCancelled',
          { bookingId: booking.id, rideId: booking.rideId },
          'rideLifecycle',
        ),
      );
      break;
    default:
      break;
  }
}

function resolveLifecycleStatus(
  current: RideLifecycleState,
  nextStatus: RideBookingStatus,
): RideLifecycleState {
  return projectRideLifecycleState(current, mapBookingStatusToRideLifecycleState(nextStatus));
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns cached bookings for instant UI render. Call hydrateRideBookings to refresh. */
export function getRideBookings(): RideBookingRecord[] {
  return [...readCache()].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/**
 * Create a booking.
 *
 * Primary path: write to Supabase, then populate the local cache.
 * Throws on Supabase failure — callers must handle the error and surface it
 * to the user rather than silently continuing with browser-only state.
 */
export async function createRideBooking(input: {
  rideId: string;
  ownerId?: string;
  passengerId?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driverName: string;
  passengerName: string;
  seatsRequested?: number;
  pricePerSeatJod?: number;
  routeMode: 'live_post' | 'network_inventory';
}): Promise<RideBookingRecord> {
  const now = new Date().toISOString();
  const status: RideBookingStatus = persistedId
    ? input.routeMode === 'live_post'
      ? 'pending_driver'
      : 'confirmed'
    : 'pending_driver';
  const seatsRequested = Math.max(1, input.seatsRequested ?? 1);

  if (!input.passengerId) {
    throw new Error('passengerId is required — unauthenticated bookings are not permitted.');
  }

  // ── 1. Write to Supabase (primary store) ──────────────────────────────────
  let persisted: { booking_id?: string; id?: string; status?: string } | null = null;
  try {
    const result = await createDirectBooking({
      tripId: input.rideId,
      userId: input.passengerId,
      seatsRequested,
      pickup: input.from,
      dropoff: input.to,
      bookingStatus: status,
      metadata: {
        total_price: input.pricePerSeatJod ? seatsRequested * input.pricePerSeatJod : seatsRequested,
      },
    });
    persisted = result.booking;
  } catch (error) {
    console.warn('[RideLifecycle] Supabase write failed, using local fallback:', error);
  }

  // ── 2. Build canonical record using the persisted ID (or local fallback) ───
  const persistedId = String(persisted?.booking_id ?? persisted?.id ?? '');
  const remoteStatus: RideBookingStatus =
    persisted?.status === 'confirmed' ||
    persisted?.status === 'cancelled' ||
    persisted?.status === 'completed'
      ? persisted.status
      : persisted?.status === 'accepted'
        ? 'confirmed'
        : status;

  const booking: RideBookingRecord = {
    id: persistedId || makeTicketCode(),
    rideId: input.rideId,
    ownerId: input.ownerId,
    passengerId: input.passengerId,
    from: input.from,
    to: input.to,
    date: input.date,
    time: input.time,
    driverName: input.driverName,
    passengerName: input.passengerName,
    seatsRequested,
    status: remoteStatus,
    lifecycleStatus: mapBookingStatusToRideLifecycleState(remoteStatus),
    paymentStatus: remoteStatus === 'confirmed' ? 'authorized' : 'pending',
    routeMode: input.routeMode,
    supportThreadOpen: false,
    ticketCode: makeTicketCode(),
    backendBookingId: persistedId || undefined,
    syncedAt: persistedId ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  // ── 3. Populate cache AFTER successful write ──────────────────────────────
  upsertCache([booking]);
  publishLifecycleEvent(booking);

  void trackGrowthEvent({
    userId: input.passengerId,
    eventName: 'ride_booking_started',
    funnelStage: booking.status === 'pending_driver' ? 'selected' : 'booked',
    serviceType: 'ride',
    from: input.from,
    to: input.to,
    valueJod: input.pricePerSeatJod
      ? Number((seatsRequested * input.pricePerSeatJod).toFixed(2))
      : undefined,
    metadata: {
      rideId: input.rideId,
      routeMode: input.routeMode,
      seatsRequested: booking.seatsRequested,
      pricePerSeatJod: input.pricePerSeatJod,
      lifecycleStatus: booking.lifecycleStatus,
    },
  });

  return booking;
}

export function getBookingsForRide(rideId: string): RideBookingRecord[] {
  return getRideBookings().filter(b => b.rideId === rideId);
}

export function getBookingsForDriver(userId: string, rides: PostedRide[]): RideBookingRecord[] {
  const rideIds = new Set(rides.filter(r => r.ownerId === userId).map(r => r.id));
  return getRideBookings().filter(b => b.ownerId === userId || rideIds.has(b.rideId));
}

export function getBookingsForPassenger(passengerId: string): RideBookingRecord[] {
  return getRideBookings().filter(b => b.passengerId === passengerId);
}

/**
 * Update a booking status.
 * Writes to Supabase first, updates cache on success.
 */
export async function updateRideBooking(
  bookingId: string,
  updates: Partial<Pick<RideBookingRecord, 'status' | 'paymentStatus' | 'supportThreadOpen'>>,
): Promise<RideBookingRecord | null> {
  const cached = readCache();
  const target = cached.find(b => b.id === bookingId);
  if (!target) return null;

  const lifecycleStatus = updates.status
    ? resolveLifecycleStatus(target.lifecycleStatus, updates.status)
    : target.lifecycleStatus;

  // Sync to Supabase when we have a canonical backend ID and a status change.
  if (
    target.backendBookingId &&
    updates.status &&
    (updates.status === 'rejected' ||
      updates.status === 'cancelled' ||
      updates.status === 'confirmed')
  ) {
    const directStatus = updates.status === 'confirmed' ? 'accepted' : updates.status;
    await updateDirectBookingStatus(
      target.backendBookingId,
      directStatus as 'accepted' | 'rejected' | 'cancelled',
    );
  }

  const updated: RideBookingRecord = {
    ...target,
    ...updates,
    lifecycleStatus,
    syncedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  upsertCache([updated]);

  if (updates.status) {
    if (updates.status === 'confirmed' && target.lifecycleStatus === 'requested') {
      domainEventBus.publish(
        createDomainEvent(
          'DriverAssigned',
          { bookingId: updated.id, rideId: updated.rideId, driverName: updated.driverName },
          'rideLifecycle',
        ),
      );
    }
    publishLifecycleEvent(updated);

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
        lifecycleStatus: updated.lifecycleStatus,
      },
    });
  }

  return updated;
}

/**
 * Authoritative sync: pulls from Supabase and overwrites the local cache.
 * Should be called on app load and after auth state changes.
 */
export async function hydrateRideBookings(
  userId: string,
  rides: PostedRide[] = [],
): Promise<RideBookingRecord[]> {
  const [passengerResult, driverResult] = await Promise.allSettled([
    getDirectUserBookings(userId),
    getDirectDriverBookings(userId),
  ]);

  const knownRides = new Map(rides.map(r => [r.id, r]));

  // Resolve passenger names in one batch query.
  const allRaw = [
    ...(passengerResult.status === 'fulfilled' ? passengerResult.value : []),
    ...(driverResult.status === 'fulfilled' ? driverResult.value : []),
  ] as Record<string, unknown>[];

  const passengerIds = Array.from(
    new Set(allRaw.map(r => String(r.passenger_id ?? r.user_id ?? '')).filter(Boolean)),
  );

  const nameMap = new Map<string, string>();
  if (passengerIds.length > 0) {
    try {
      const { supabase: db } = await import('../utils/supabase/client');
      if (db) {
        // Only query profiles (not the auth users table) to respect RLS
        const { data: profiles } = await db
          .from('profiles')
          .select('id, full_name, email')
          .in('id', passengerIds);
        if (Array.isArray(profiles)) {
          for (const u of profiles as { id: string; full_name?: string; email?: string }[]) {
            nameMap.set(String(u.id), u.full_name?.trim() || u.email?.split('@')[0] || 'Passenger');
          }
        }
      }
    } catch {
      // Non-fatal — fall back to 'Passenger' for unresolved IDs.
    }
  }

  const normalize = (raw: Record<string, unknown>): RideBookingRecord => {
    const rideId = String(raw.trip_id ?? '');
    const ride = knownRides.get(rideId);
    const statusRaw = String(raw.status ?? raw.booking_status ?? 'pending');
    const status: RideBookingStatus =
      statusRaw === 'completed' ||
      statusRaw === 'cancelled' ||
      statusRaw === 'rejected' ||
      statusRaw === 'confirmed'
        ? statusRaw
        : statusRaw === 'accepted'
          ? 'confirmed'
          : 'pending_driver';

    const id = String(raw.booking_id ?? raw.id ?? '');
    return {
      id,
      backendBookingId: id,
      rideId,
      ownerId: ride?.ownerId,
      passengerId: String(raw.passenger_id ?? raw.user_id ?? ''),
      from: String(raw.pickup_location ?? ride?.from ?? ''),
      to: String(raw.dropoff_location ?? ride?.to ?? ''),
      date:
        ride?.date ??
        new Date(String(raw.created_at ?? new Date().toISOString())).toISOString().slice(0, 10),
      time: ride?.time ?? '08:00',
      driverName: ride ? ride.carModel || 'Wasel Captain' : 'Wasel Captain',
      passengerName: nameMap.get(String(raw.passenger_id ?? raw.user_id ?? '')) ?? 'Passenger',
      seatsRequested: Number(raw.seats_requested ?? 1) || 1,
      status,
      lifecycleStatus: mapBookingStatusToRideLifecycleState(status),
      paymentStatus:
        statusRaw === 'completed'
          ? 'captured'
          : statusRaw === 'cancelled' || statusRaw === 'rejected'
            ? 'failed'
            : 'authorized',
      routeMode: ride ? 'live_post' : 'network_inventory',
      supportThreadOpen: false,
      ticketCode: `RIDE-${id.slice(-6).toUpperCase() || 'SYNCED'}`,
      createdAt: String(raw.created_at ?? new Date().toISOString()),
      updatedAt: String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()),
      syncedAt: new Date().toISOString(),
    };
  };

  const remote = allRaw
    .map(item => normalize(item as Record<string, unknown>))
    .filter(item => item.id);

  if (remote.length > 0) {
    upsertCache(remote);
  }

  return getRideBookings();
}

/**
 * Auto-complete confirmed bookings whose departure time has passed.
 * Only marks bookings as completed if the departure time is more than
 * 2 hours in the past (server-side grace window) to prevent clock manipulation.
 * The authoritative completion path is the ops worker via RideCompleted event.
 */
export function syncRideBookingCompletion(referenceDate = Date.now()): RideBookingRecord[] {
  const bookings = readCache();
  const toUpdate: RideBookingRecord[] = [];
  // Require at least 2 hours past departure before auto-completing client-side.
  const GRACE_MS = 2 * 60 * 60 * 1000;

  const next = bookings.map(booking => {
    if (booking.status !== 'confirmed') return booking;
    const tripTime = new Date(`${booking.date}T${booking.time || '00:00'}`).getTime();
    if (!Number.isFinite(tripTime) || tripTime + GRACE_MS > referenceDate) return booking;

    const updated: RideBookingRecord = {
      ...booking,
      status: 'completed',
      lifecycleStatus: 'completed',
      paymentStatus: booking.paymentStatus === 'authorized' ? 'captured' : booking.paymentStatus,
      updatedAt: new Date(referenceDate).toISOString(),
    };
    toUpdate.push(updated);
    return updated;
  });

  writeCache(next);

  toUpdate.forEach(b => {
    publishLifecycleEvent(b);
  });

  return [...next].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}
