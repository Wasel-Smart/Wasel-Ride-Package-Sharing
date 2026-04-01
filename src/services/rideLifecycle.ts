import type { PostedRide } from './journeyLogistics';
import {
  createDirectBooking,
  getDirectDriverBookings,
  getDirectUserBookings,
  updateDirectBookingStatus,
} from './directSupabase';
import { trackGrowthEvent } from './growthEngine';

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
  passengerId?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  driverName: string;
  passengerName: string;
  seatsRequested?: number;
  routeMode: 'live_post' | 'network_inventory';
}): RideBookingRecord {
  const now = new Date().toISOString();
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
    status: input.routeMode === 'live_post' ? 'pending_driver' : 'confirmed',
    paymentStatus: input.routeMode === 'live_post' ? 'pending' : 'authorized',
    routeMode: input.routeMode,
    supportThreadOpen: false,
    ticketCode: makeTicketCode(),
    createdAt: now,
    updatedAt: now,
  };

  writeBookings([booking, ...readBookings()]);
  void trackGrowthEvent({
    userId: input.passengerId,
    eventName: 'ride_booking_started',
    funnelStage: booking.status === 'pending_driver' ? 'selected' : 'booked',
    serviceType: 'ride',
    from: input.from,
    to: input.to,
    metadata: {
      rideId: input.rideId,
      routeMode: input.routeMode,
      seatsRequested: booking.seatsRequested,
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
          syncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        upsertBookings([synced]);
      })
      .catch(() => {});
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
        upsertBookings([{ ...updated, syncedAt: new Date().toISOString() }]);
      })
      .catch(() => {});
  }

  if (updates.status) {
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
      from: String(raw.pickup_location ?? ride?.from ?? ''),
      to: String(raw.dropoff_location ?? ride?.to ?? ''),
      date: ride?.date ?? new Date(String(raw.created_at ?? new Date().toISOString())).toISOString().slice(0, 10),
      time: ride?.time ?? '08:00',
      driverName: ride ? ride.carModel || 'Wasel Captain' : 'Wasel Captain',
      passengerName: 'Passenger',
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
      createdAt: String(raw.created_at ?? new Date().toISOString()),
      updatedAt: String(raw.updated_at ?? raw.created_at ?? new Date().toISOString()),
      syncedAt: new Date().toISOString(),
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

  return getRideBookings();
}

export function syncRideBookingCompletion(referenceDate = Date.now()): RideBookingRecord[] {
  const now = referenceDate;
  const bookings = readBookings();
  const next = bookings.map((booking) => {
    if (booking.status !== 'confirmed') return booking;
    const tripTime = new Date(`${booking.date}T${booking.time || '00:00'}`).getTime();
    if (!Number.isFinite(tripTime) || tripTime > now) return booking;
    return {
      ...booking,
      status: 'completed' as RideBookingStatus,
      paymentStatus: booking.paymentStatus === 'authorized' ? 'captured' as RidePaymentStatus : booking.paymentStatus,
      updatedAt: new Date(now).toISOString(),
    };
  });

  writeBookings(next);
  return sortBookings(next);
}
