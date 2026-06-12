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
import { recordCorridorBetaMetricsFromBookings } from './corridorBetaMetrics';

export type RideBookingStatus =
  | 'pending_driver'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export type RidePaymentStatus = 'pending' | 'authorized' | 'captured' | 'refunded' | 'failed';

export interface RideBookingRecord {
  id: string;
  rideId: string;
  ownerId?: string;
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

const BOOKING_KEY = 'wasel-ride-booking-records';

function readBookings(): RideBookingRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(BOOKING_KEY);
    const parsed = raw ? (JSON.parse(raw) as RideBookingRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sortBookings(items: RideBookingRecord[]): RideBookingRecord[] {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function writeBookings(bookings: RideBookingRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(BOOKING_KEY, JSON.stringify(sortBookings(bookings).slice(0, 100)));
}

function upsertBookings(records: RideBookingRecord[]): void {
  const current = new Map(readBookings().map(booking => [booking.id, booking]));
  records.forEach(record => {
    current.set(record.id, record);
  });
  writeBookings(Array.from(current.values()));
}

function makeTicketCode(): string {
  return `RIDE-${Math.floor(100000 + Math.random() * 900000)}`;
}

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
          {
            bookingId: booking.id,
            rideId: booking.rideId,
            driverName: booking.driverName,
          },
          'rideLifecycle',
        ),
      );
      break;
    case 'accepted':
      domainEventBus.publish(
        createDomainEvent(
          'RideAccepted',
          {
            bookingId: booking.id,
            rideId: booking.rideId,
          },
          'rideLifecycle',
        ),
      );
      break;
    case 'in_progress':
      domainEventBus.publish(
        createDomainEvent(
          'RideStarted',
          {
            bookingId: booking.id,
            rideId: booking.rideId,
          },
          'rideLifecycle',
        ),
      );
      break;
    case 'completed':
      domainEventBus.publish(
        createDomainEvent(
          'RideCompleted',
          {
            bookingId: booking.id,
            rideId: booking.rideId,
          },
          'rideLifecycle',
        ),
      );
      break;
    case 'cancelled':
      domainEventBus.publish(
        createDomainEvent(
          'RideCancelled',
          {
            bookingId: booking.id,
            rideId: booking.rideId,
          },
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
  const target = mapBookingStatusToRideLifecycleState(nextStatus);

  return projectRideLifecycleState(current, target);
}

export function getRideBookings(): RideBookingRecord[] {
  return sortBookings(readBookings());
}

export function createRideBooking(input: {
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
}): RideBookingRecord {
  const now = new Date().toISOString();
  const status: RideBookingStatus =
    input.routeMode === 'live_post' ? 'pending_driver' : 'confirmed';
  const lifecycleStatus: RideLifecycleState =
    input.routeMode === 'live_post' ? 'requested' : 'accepted';

  const booking: RideBookingRecord = {
    id: `ride-booking-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    rideId: input.rideId,
    ownerId: input.ownerId,
    from: input.from,
    to: input.to,
    date: input.date,
    time: input.time,
    driverName: input.driverName,
    passengerName: input.passengerName,
    seatsRequested: Math.max(1, input.seatsRequested ?? 1),
    status,
    lifecycleStatus,
    paymentStatus: input.routeMode === 'live_post' ? 'pending' : 'authorized',
    routeMode: input.routeMode,
    supportThreadOpen: false,
    ticketCode: makeTicketCode(),
    createdAt: now,
    updatedAt: now,
  };

  const nextBookings = [booking, ...readBookings()];
  writeBookings(nextBookings);
  recordCorridorBetaMetricsFromBookings(nextBookings);
  publishLifecycleEvent(booking);

  void trackGrowthEvent({
    userId: input.passengerId,
    eventName: 'ride_booking_started',
    funnelStage: booking.status === 'pending_driver' ? 'selected' : 'booked',
    serviceType: 'ride',
    from: input.from,
    to: input.to,
    valueJod: input.pricePerSeatJod
      ? Number((booking.seatsRequested * input.pricePerSeatJod).toFixed(2))
      : undefined,
    metadata: {
      rideId: input.rideId,
      routeMode: input.routeMode,
      seatsRequested: booking.seatsRequested,
      pricePerSeatJod: input.pricePerSeatJod,
      lifecycleStatus: booking.lifecycleStatus,
    },
  });

  if (input.passengerId) {
    void createDirectBooking({
      tripId: input.rideId,
      userId: input.passengerId,
      seatsRequested: booking.seatsRequested,
      pickup: input.from,
      dropoff: input.to,
      bookingStatus: booking.status,
      metadata: {
        total_price: booking.seatsRequested,
      },
    })
      .then(({ booking: persisted }) => {
        const persistedId = String(persisted.booking_id ?? persisted.id ?? booking.id);
        const remoteStatus =
          persisted.status === 'confirmed' ||
          persisted.status === 'cancelled' ||
          persisted.status === 'completed'
            ? persisted.status
            : booking.status;

        upsertBookings([
          {
            ...booking,
            id: persistedId,
            backendBookingId: persistedId,
            status: remoteStatus,
            lifecycleStatus: mapBookingStatusToRideLifecycleState(remoteStatus),
            paymentStatus: persisted.status === 'confirmed' ? 'authorized' : booking.paymentStatus,
            syncedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      })
      .catch(() => undefined);
  }

  return booking;
}

export function getBookingsForRide(rideId: string): RideBookingRecord[] {
  return getRideBookings().filter(booking => booking.rideId === rideId);
}

export function getBookingsForDriver(userId: string, rides: PostedRide[]): RideBookingRecord[] {
  const rideIds = new Set(rides.filter(ride => ride.ownerId === userId).map(ride => ride.id));

  return getRideBookings().filter(
    booking => booking.ownerId === userId || rideIds.has(booking.rideId),
  );
}

export function getBookingsForPassenger(passengerName: string): RideBookingRecord[] {
  return getRideBookings().filter(booking => booking.passengerName === passengerName);
}

export function updateRideBooking(
  bookingId: string,
  updates: Partial<Pick<RideBookingRecord, 'status' | 'paymentStatus' | 'supportThreadOpen'>>,
): RideBookingRecord | null {
  const bookings = readBookings();
  const target = bookings.find(booking => booking.id === bookingId);

  if (!target) {
    return null;
  }

  const lifecycleStatus = updates.status
    ? resolveLifecycleStatus(target.lifecycleStatus, updates.status)
    : target.lifecycleStatus;

  const updated: RideBookingRecord = {
    ...target,
    ...updates,
    lifecycleStatus,
    updatedAt: new Date().toISOString(),
  };

  const nextBookings = bookings.map(booking => (booking.id === bookingId ? updated : booking));
  writeBookings(nextBookings);
  recordCorridorBetaMetricsFromBookings(nextBookings);

  if (
    updated.backendBookingId &&
    updates.status &&
    (updates.status === 'rejected' ||
      updates.status === 'cancelled' ||
      updates.status === 'confirmed')
  ) {
    const directStatus = updates.status === 'confirmed' ? 'accepted' : updates.status;

    void updateDirectBookingStatus(
      updated.backendBookingId,
      directStatus as 'accepted' | 'rejected' | 'cancelled',
    )
      .then(() => {
        upsertBookings([{ ...updated, syncedAt: new Date().toISOString() }]);
      })
      .catch(() => undefined);
  }

  if (updates.status) {
    if (updates.status === 'confirmed' && target.lifecycleStatus === 'requested') {
      domainEventBus.publish(
        createDomainEvent(
          'DriverAssigned',
          {
            bookingId: updated.id,
            rideId: updated.rideId,
            driverName: updated.driverName,
          },
          'rideLifecycle',
        ),
      );
    }

    if (updates.status === 'completed' && target.lifecycleStatus === 'accepted') {
      domainEventBus.publish(
        createDomainEvent(
          'RideStarted',
          {
            bookingId: updated.id,
            rideId: updated.rideId,
          },
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

export async function hydrateRideBookings(
  userId: string,
  rides: PostedRide[] = [],
): Promise<RideBookingRecord[]> {
  const [passengerBookings, driverBookings] = await Promise.allSettled([
    getDirectUserBookings(userId),
    getDirectDriverBookings(userId),
  ]);

  const knownRides = new Map(rides.map(ride => [ride.id, ride]));
  const normalize = (raw: Record<string, unknown>): RideBookingRecord => {
    const rideId = String(raw.trip_id ?? '');
    const ride = knownRides.get(rideId);
    const status = String(raw.status ?? raw.booking_status ?? 'pending');
    const normalizedStatus: RideBookingStatus =
      status === 'completed' ||
      status === 'cancelled' ||
      status === 'rejected' ||
      status === 'confirmed'
        ? status
        : status === 'accepted'
          ? 'confirmed'
          : 'pending_driver';

    return {
      id: String(raw.booking_id ?? raw.id ?? ''),
      backendBookingId: String(raw.booking_id ?? raw.id ?? ''),
      rideId,
      ownerId: ride?.ownerId,
      from: String(raw.pickup_location ?? ride?.from ?? ''),
      to: String(raw.dropoff_location ?? ride?.to ?? ''),
      date:
        ride?.date ??
        new Date(String(raw.created_at ?? new Date().toISOString())).toISOString().slice(0, 10),
      time: ride?.time ?? '08:00',
      driverName: ride ? ride.carModel || 'Wasel Captain' : 'Wasel Captain',
      passengerName: 'Passenger',
      seatsRequested: Number(raw.seats_requested ?? 1) || 1,
      status: normalizedStatus,
      lifecycleStatus: mapBookingStatusToRideLifecycleState(normalizedStatus),
      paymentStatus:
        status === 'completed'
          ? 'captured'
          : status === 'cancelled' || status === 'rejected'
            ? 'failed'
            : 'authorized',
      routeMode: ride ? 'live_post' : 'network_inventory',
      supportThreadOpen: false,
      ticketCode: `RIDE-${
        String(raw.booking_id ?? raw.id ?? '')
          .slice(-6)
          .toUpperCase() || 'SYNCED'
      }`,
      createdAt: String(raw.created_at ?? new Date().toISOString()),
      updatedAt: String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()),
      syncedAt: new Date().toISOString(),
    };
  };

  const remote = [
    ...(passengerBookings.status === 'fulfilled' ? passengerBookings.value : []),
    ...(driverBookings.status === 'fulfilled' ? driverBookings.value : []),
  ]
    .map(item => normalize(item as Record<string, unknown>))
    .filter(item => item.id);

  if (remote.length > 0) {
    upsertBookings(remote);
  }

  return getRideBookings();
}

export function syncRideBookingCompletion(referenceDate = Date.now()): RideBookingRecord[] {
  const bookings = readBookings();
  const next = bookings.map(booking => {
    if (booking.status !== 'confirmed') {
      return booking;
    }

    const tripTime = new Date(`${booking.date}T${booking.time || '00:00'}`).getTime();
    if (!Number.isFinite(tripTime) || tripTime > referenceDate) {
      return booking;
    }

    const updated: RideBookingRecord = {
      ...booking,
      status: 'completed',
      lifecycleStatus: 'completed',
      paymentStatus: booking.paymentStatus === 'authorized' ? 'captured' : booking.paymentStatus,
      updatedAt: new Date(referenceDate).toISOString(),
    };

    publishLifecycleEvent(updated);
    return updated;
  });

  writeBookings(next);
  recordCorridorBetaMetricsFromBookings(next);
  return sortBookings(next);
}
