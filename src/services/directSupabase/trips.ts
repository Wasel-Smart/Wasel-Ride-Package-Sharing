// ─── Trip & booking operations ───────────────────────────────────────────────

import {
  getDb,
  mapProfileFromContext,
  mapTripRow,
  mapBookingRow,
  buildTripNotes,
  normalizePackageCapacity,
  normalizeTripStatus,
  normalizeBookingStatus,
  ensureBookingEligibility,
  getWalletByCanonicalUserId,
  toNumber,
} from './helpers';
import { buildUserContext, ensureDriverForUser, getLatestVerificationRecord } from './userContext.ts';
import { recordDirectGrowthEvent } from './growth';
import { processReferralConversionForPassenger } from './referrals';
import type { DriverRow, RawBooking, RawProfile, TripRow, UserContext, UserRow, WalletRow } from './types';
import type { TripCreatePayload, TripSearchResult, TripUpdatePayload } from '../trips';

async function getTripCountForDriver(driverId?: string | null): Promise<number> {
  if (!driverId) return 0;
  const db = getDb();
  const { count, error } = await db
    .from('trips')
    .select('trip_id', { count: 'exact', head: true })
    .eq('driver_id', driverId);
  if (error) return 0;
  return toNumber(count, 0);
}

async function fetchProfilesByDriverIds(driverIds: string[]): Promise<Record<string, RawProfile>> {
  const uniqueIds = Array.from(new Set(driverIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  const db = getDb();
  const { data: driverRows, error } = await db.from('drivers').select('*').in('driver_id', uniqueIds);
  if (error || !Array.isArray(driverRows) || driverRows.length === 0) return {};

  const userIds = driverRows.map((d: DriverRow) => d.user_id).filter(Boolean);
  const { data: users } = await db.from('users').select('*').in('id', userIds);
  const { data: wallets } = await db.from('wallets').select('*').in('user_id', userIds);

  const userMap = new Map<string, UserRow>((Array.isArray(users) ? users : []).map((u: UserRow) => [u.id, u]));
  const walletMap = new Map<string, WalletRow>((Array.isArray(wallets) ? wallets : []).map((w: WalletRow) => [String(w.user_id), w]));

  const resultEntries = await Promise.all(
    (driverRows as DriverRow[]).map(async (driver) => {
      const user = userMap.get(driver.user_id);
      if (!user) return null;
      const verification = await getLatestVerificationRecord(driver.user_id).catch(() => null);
      const tripCount = await getTripCountForDriver(driver.driver_id).catch(() => 0);
      const context: UserContext = {
        user,
        wallet: walletMap.get(driver.user_id) ?? null,
        verification,
        driver,
        authUserId: user.auth_user_id ?? user.id,
      };
      return [driver.driver_id, mapProfileFromContext(context, { tripCount })] as const;
    }),
  );

  return resultEntries.reduce((acc: Record<string, RawProfile>, entry) => {
    if (entry) acc[entry[0]] = entry[1];
    return acc;
  }, {});
}

// ── Public trip queries ───────────────────────────────────────────────────────

export async function getDirectProfile(userId: string): Promise<RawProfile | null> {
  const context = await buildUserContext(userId);
  const tripCount = await getTripCountForDriver(context.driver?.driver_id).catch(() => 0);
  return mapProfileFromContext(context, { tripCount });
}

export async function getDirectVerificationRecord(userId: string) {
  const context = await buildUserContext(userId);
  return context.verification;
}

export async function updateDirectProfile(userId: string, updates: Record<string, unknown>) {
  const context = await buildUserContext(userId, {
    email: typeof updates.email === 'string' ? updates.email : null,
    full_name: typeof updates.full_name === 'string' ? updates.full_name : null,
    phone_number:
      typeof updates.phone_number === 'string'
        ? updates.phone_number
        : typeof updates.phone === 'string'
          ? updates.phone
          : null,
    role: typeof updates.role === 'string' ? updates.role : null,
  });

  const db = getDb();
  const userPatch: Record<string, unknown> = {};
  const walletPatch: Record<string, unknown> = {};

  if (typeof updates.email === 'string') userPatch.email = updates.email.trim();
  if (typeof updates.full_name === 'string') userPatch.full_name = updates.full_name.trim();
  if (typeof updates.phone_number === 'string') userPatch.phone_number = updates.phone_number.trim();
  if (typeof updates.phone === 'string') userPatch.phone_number = updates.phone.trim();
  if (typeof updates.role === 'string') userPatch.role = updates.role;
  if (typeof updates.verification_level === 'string') userPatch.verification_level = updates.verification_level;
  if (typeof updates.avatar_url === 'string') userPatch.avatar_url = updates.avatar_url;
  if (updates.wallet_balance !== undefined) walletPatch.balance = toNumber(updates.wallet_balance, 0);
  if (typeof updates.wallet_status === 'string') walletPatch.wallet_status = updates.wallet_status;

  if (Object.keys(userPatch).length > 0) {
    const { error } = await db.from('users').update(userPatch).eq('id', context.user.id);
    if (error) throw error;
  }
  if (Object.keys(walletPatch).length > 0) {
    const wallet = context.wallet ?? await getWalletByCanonicalUserId(context.user.id);
    if (wallet?.wallet_id) {
      const { error } = await db.from('wallets').update(walletPatch).eq('wallet_id', wallet.wallet_id);
      if (error) throw error;
    }
  }
  return getDirectProfile(userId);
}

export async function searchDirectTrips(from?: string, to?: string, date?: string, seats?: number): Promise<TripSearchResult[]> {
  const db = getDb();
  let query = db
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .is('deleted_at', null);

  if (from) query = query.ilike('origin_city', `%${from}%`);
  if (to) query = query.ilike('destination_city', `%${to}%`);
  if (date) query = query.gte('departure_time', `${date}T00:00:00`).lt('departure_time', `${date}T23:59:59.999`);
  if (seats) query = query.gte('available_seats', seats);
  query = query.in('trip_status', ['open', 'booked', 'in_progress']).order('departure_time');

  const { data, error } = await query;
  if (error) throw error;

  const rows = (Array.isArray(data) ? data : []) as TripRow[];
  const profiles = await fetchProfilesByDriverIds(rows.map((r) => String(r.driver_id ?? '')));
  return rows.map((row) => mapTripRow(row, profiles[String(row.driver_id ?? '')] ?? null));
}

export async function getDirectTripById(tripId: string): Promise<TripSearchResult | null> {
  const db = getDb();
  const { data, error } = await db
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .eq('trip_id', tripId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const profiles = await fetchProfilesByDriverIds([String((data as TripRow).driver_id ?? '')]);
  return mapTripRow(data as TripRow, profiles[String((data as TripRow).driver_id ?? '')] ?? null);
}

export async function getDirectDriverTrips(userId: string): Promise<TripSearchResult[]> {
  const context = await buildUserContext(userId);
  const driver = await ensureDriverForUser(context);
  const db = getDb();
  const { data, error } = await db
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .eq('driver_id', driver.driver_id)
    .order('departure_time', { ascending: false });
  if (error) throw error;
  const rows = (Array.isArray(data) ? data : []) as TripRow[];
  const profile = mapProfileFromContext(context, { tripCount: rows.length });
  return rows.map((row) => mapTripRow(row, profile));
}

export async function createDirectTrip(userId: string, tripData: TripCreatePayload): Promise<TripSearchResult> {
  const context = await buildUserContext(userId);
  const driver = await ensureDriverForUser(context);
  const db = getDb();
  const vehicleParts = (tripData.carModel ?? '').trim().split(/\s+/).filter(Boolean);
  const [vehicleMake = null, ...vehicleRest] = vehicleParts;
  const departureTime = new Date(`${tripData.date}T${tripData.time}:00`).toISOString();

  const { data, error } = await db
    .from('trips')
    .insert({
      driver_id: driver.driver_id,
      origin_city: tripData.from,
      destination_city: tripData.to,
      departure_time: departureTime,
      available_seats: tripData.seats,
      price_per_seat: tripData.price,
      trip_status: 'open',
      allow_packages: Boolean(tripData.acceptsPackages),
      package_capacity: normalizePackageCapacity(tripData.packageCapacity),
      package_slots_remaining: normalizePackageCapacity(tripData.packageCapacity),
      vehicle_make: vehicleMake,
      vehicle_model: vehicleRest.length > 0 ? vehicleRest.join(' ') : tripData.carModel ?? null,
      notes: buildTripNotes(tripData),
    })
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .single();
  if (error) throw error;
  return mapTripRow(data as TripRow, mapProfileFromContext(context));
}

export async function updateDirectTrip(tripId: string, updates: TripUpdatePayload): Promise<TripSearchResult> {
  const db = getDb();
  const payload: Record<string, unknown> = {};

  if (updates.from) payload.origin_city = updates.from;
  if (updates.to) payload.destination_city = updates.to;
  if (updates.date || updates.time) {
    const current = await getDirectTripById(tripId);
    const date = updates.date ?? current?.date ?? new Date().toISOString().slice(0, 10);
    const time = updates.time ?? current?.time ?? '08:00';
    payload.departure_time = new Date(`${date}T${time}:00`).toISOString();
  }
  if (typeof updates.seats === 'number') payload.available_seats = updates.seats;
  if (typeof updates.price === 'number') payload.price_per_seat = updates.price;
  if (updates.carModel !== undefined) {
    const parts = String(updates.carModel ?? '').trim().split(/\s+/).filter(Boolean);
    const [make = null, ...rest] = parts;
    payload.vehicle_make = make;
    payload.vehicle_model = rest.length > 0 ? rest.join(' ') : updates.carModel ?? null;
  }
  if (updates.note !== undefined) payload.notes = updates.note;
  if (updates.status) payload.trip_status = normalizeTripStatus(updates.status);

  const { data, error } = await db
    .from('trips')
    .update(payload)
    .eq('trip_id', tripId)
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .single();
  if (error) throw error;

  const profiles = await fetchProfilesByDriverIds([String((data as TripRow).driver_id ?? '')]);
  return mapTripRow(data as TripRow, profiles[String((data as TripRow).driver_id ?? '')] ?? null);
}

export async function deleteDirectTrip(tripId: string): Promise<{ success: boolean }> {
  const db = getDb();
  const { error } = await db
    .from('trips')
    .update({ trip_status: 'cancelled', deleted_at: new Date().toISOString() })
    .eq('trip_id', tripId);
  if (error) throw error;
  return { success: true };
}

// ── Booking operations ────────────────────────────────────────────────────────

export async function createDirectBooking(input: {
  tripId: string;
  userId: string;
  seatsRequested: number;
  pickup?: string;
  dropoff?: string;
  metadata?: Record<string, unknown>;
  bookingStatus?: string;
}) {
  const db = getDb();
  const passenger = await buildUserContext(input.userId);
  ensureBookingEligibility(mapProfileFromContext(passenger));

  const { data: trip, error: tripError } = await db
    .from('trips')
    .select('trip_id, available_seats, price_per_seat, trip_status')
    .eq('trip_id', input.tripId)
    .single();
  if (tripError) throw tripError;

  const availableSeats = toNumber(trip?.available_seats, 0);
  if (availableSeats < input.seatsRequested) throw new Error('Not enough seats available');

  const { data: existingSeats } = await db
    .from('bookings')
    .select('seat_number')
    .eq('trip_id', input.tripId)
    .neq('booking_status', 'cancelled');

  const usedSeats = new Set(
    (Array.isArray(existingSeats) ? existingSeats : []).map((item: RawBooking) => toNumber(item.seat_number, 0)),
  );
  const resolvedSeatNumber =
    toNumber(input.metadata?.seat_number, 0) ||
    Array.from({ length: Math.max(availableSeats + usedSeats.size + 1, 100) }, (_, i) => i + 1).find(
      (s) => !usedSeats.has(s),
    ) ||
    1;

  const pricePerSeat = toNumber(trip?.price_per_seat, 0);
  const totalPrice = toNumber(input.metadata?.total_price, pricePerSeat * input.seatsRequested);

  const { data, error } = await db
    .from('bookings')
    .insert({
      trip_id: input.tripId,
      passenger_id: passenger.user.id,
      seat_number: resolvedSeatNumber,
      booking_status: input.bookingStatus ?? 'confirmed',
      status: input.bookingStatus ?? 'confirmed',
      confirmed_by_driver: input.bookingStatus === 'pending_driver' ? false : true,
      amount: totalPrice,
    })
    .select('*')
    .single();
  if (error) throw error;

  await recordDirectGrowthEvent({
    userId: input.userId,
    eventName: 'ride_booking_created',
    funnelStage: input.bookingStatus === 'pending_driver' ? 'selected' : 'booked',
    serviceType: 'ride',
    from: input.pickup,
    to: input.dropoff,
    valueJod: totalPrice,
    metadata: { tripId: input.tripId, bookingStatus: input.bookingStatus ?? 'confirmed', seatsRequested: input.seatsRequested },
  }).catch(() => {});

  if (input.bookingStatus !== 'pending_driver') {
    await processReferralConversionForPassenger(passenger.user.id).catch(() => {});
  }

  await db
    .from('trips')
    .update({
      available_seats:
        input.bookingStatus === 'pending_driver'
          ? availableSeats
          : Math.max(availableSeats - input.seatsRequested, 0),
      trip_status:
        input.bookingStatus === 'pending_driver'
          ? (trip?.trip_status ?? 'open')
          : availableSeats - input.seatsRequested <= 0
            ? 'booked'
            : (trip?.trip_status ?? 'open'),
    })
    .eq('trip_id', input.tripId);

  return {
    booking: mapBookingRow({
      ...(data as RawBooking),
      pickup_location: input.pickup ?? null,
      dropoff_location: input.dropoff ?? null,
      seats_requested: input.seatsRequested,
      price_per_seat: pricePerSeat,
      total_price: totalPrice,
    }),
  };
}

export async function getDirectUserBookings(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('passenger_id', context.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? (data as RawBooking[]).map(mapBookingRow) : [];
}

export async function getDirectTripBookings(tripId: string) {
  const db = getDb();
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return Array.isArray(data) ? (data as RawBooking[]).map(mapBookingRow) : [];
}

export async function updateDirectBookingStatus(bookingId: string, status: 'accepted' | 'rejected' | 'cancelled') {
  const db = getDb();
  const mappedStatus = normalizeBookingStatus(status);

  const { data: existing, error: existingError } = await db
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .single();
  if (existingError) throw existingError;

  const bookingRow = existing as RawBooking;
  const { data, error } = await db
    .from('bookings')
    .update({ booking_status: mappedStatus, status: mappedStatus, confirmed_by_driver: mappedStatus === 'confirmed' })
    .eq('booking_id', bookingId)
    .select('*')
    .single();
  if (error) throw error;

  const { data: trip } = await db
    .from('trips')
    .select('trip_id, available_seats, trip_status')
    .eq('trip_id', bookingRow.trip_id)
    .maybeSingle();

  const availableSeats = toNumber((trip as TripRow | null)?.available_seats, 0);
  const seatsRequested = Math.max(1, toNumber(bookingRow.seats_requested, 1));

  if (mappedStatus === 'confirmed' && bookingRow.booking_status === 'pending_driver' && trip) {
    await db
      .from('trips')
      .update({
        available_seats: Math.max(availableSeats - seatsRequested, 0),
        trip_status: availableSeats - seatsRequested <= 0 ? 'booked' : ((trip as TripRow).trip_status ?? 'open'),
      })
      .eq('trip_id', bookingRow.trip_id);
    if (bookingRow.passenger_id) {
      await processReferralConversionForPassenger(String(bookingRow.passenger_id)).catch(() => {});
    }
  }

  if ((mappedStatus === 'cancelled' || mappedStatus === 'rejected') && bookingRow.booking_status === 'confirmed' && trip) {
    await db
      .from('trips')
      .update({ available_seats: availableSeats + seatsRequested, trip_status: 'open' })
      .eq('trip_id', bookingRow.trip_id);
  }

  await recordDirectGrowthEvent({
    userId: String(bookingRow.passenger_id ?? ''),
    eventName: 'ride_booking_status_updated',
    funnelStage: mappedStatus === 'confirmed' ? 'booked' : mappedStatus,
    serviceType: 'ride',
    valueJod: toNumber(bookingRow.amount, 0),
    metadata: {
      bookingId,
      tripId: bookingRow.trip_id,
      previousStatus: bookingRow.booking_status ?? bookingRow.status ?? null,
      nextStatus: mappedStatus,
    },
  }).catch(() => {});

  return mapBookingRow(data as RawBooking);
}

export async function getDirectDriverBookings(userId: string) {
  const context = await buildUserContext(userId);
  const driver = await ensureDriverForUser(context);
  const db = getDb();

  const { data: trips, error: tripsError } = await db
    .from('trips')
    .select('trip_id, origin_city, destination_city, departure_time')
    .eq('driver_id', driver.driver_id);
  if (tripsError) throw tripsError;

  const tripRows = Array.isArray(trips) ? (trips as TripRow[]) : [];
  const tripMap = new Map(tripRows.map((t) => [String(t.trip_id ?? ''), t]));
  const tripIds = tripRows.map((t) => String(t.trip_id ?? '')).filter(Boolean);
  if (tripIds.length === 0) return [];

  const { data: bookings, error } = await db
    .from('bookings')
    .select('*')
    .in('trip_id', tripIds)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return Array.isArray(bookings)
    ? (bookings as RawBooking[]).map((booking) => {
        const trip = tripMap.get(String(booking.trip_id ?? ''));
        return mapBookingRow({
          ...booking,
          pickup_location: booking.pickup_location ?? trip?.origin_city ?? null,
          dropoff_location: booking.dropoff_location ?? trip?.destination_city ?? null,
        });
      })
    : [];
}
