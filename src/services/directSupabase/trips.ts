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
  toNumber,
} from './helpers';
import { buildUserContext, ensureDriverForUser, getLatestVerificationRecord } from './userContext';
import { recordDirectGrowthEvent } from './growth';
import { processReferralConversionForPassenger } from './referrals';
import {
  bookingCreatePayloadSchema,
  profileUpdatePayloadSchema,
  tripCreatePayloadSchema,
  tripUpdatePayloadSchema,
  withDataIntegrity,
} from '../dataIntegrity';
import type { DriverRow, RawBooking, RawProfile, TripRow, UserContext, UserRow, WalletRow } from './types';
import type { TripCreatePayload, TripSearchResult, TripUpdatePayload } from '../trips';
import {
  normalizeJordanLocation,
  routeMatchesLocationPair,
} from '../../utils/jordanLocations';

async function getTripCountForDriver(driverId?: string | null): Promise<number> {
  if (!driverId) {return 0;}
  const db = getDb();
  const { count, error } = await db
    .from('trips')
    .select('trip_id', { count: 'exact', head: true })
    .eq('driver_id', driverId);
  if (error) {return 0;}
  return toNumber(count, 0);
}

async function fetchProfilesByDriverIds(driverIds: string[]): Promise<Record<string, RawProfile>> {
  const uniqueIds = Array.from(new Set(driverIds.filter(Boolean)));
  if (uniqueIds.length === 0) {return {};}

  const db = getDb();
  const { data: driverRows, error } = await db.from('drivers').select('*').in('driver_id', uniqueIds);
  if (error || !Array.isArray(driverRows) || driverRows.length === 0) {return {};}

  const userIds = driverRows.map((d: DriverRow) => d.user_id).filter(Boolean);
  const { data: users } = await db.from('users').select('*').in('id', userIds);
  const { data: wallets } = await db.from('wallets').select('*').in('user_id', userIds);

  const userMap = new Map<string, UserRow>((Array.isArray(users) ? users : []).map((u: UserRow) => [u.id, u]));
  const walletMap = new Map<string, WalletRow>((Array.isArray(wallets) ? wallets : []).map((w: WalletRow) => [String(w.user_id), w]));

  const resultEntries = await Promise.all(
    (driverRows as DriverRow[]).map(async (driver) => {
      const user = userMap.get(driver.user_id);
      if (!user) {return null;}
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
    if (entry) {acc[entry[0]] = entry[1];}
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
  return withDataIntegrity({
    operation: 'profile.update.direct',
    schema: profileUpdatePayloadSchema,
    payload: updates,
    execute: async ({ payload }) => {
      const nextPhone =
        typeof payload.phone_number === 'string'
          ? payload.phone_number
          : typeof payload.phone === 'string'
            ? payload.phone
            : null;

      const context = await buildUserContext(userId, {
        email: typeof payload.email === 'string' ? payload.email : null,
        full_name: typeof payload.full_name === 'string' ? payload.full_name : null,
        phone_number: nextPhone,
      });

      const db = getDb();
      const userPatch: Record<string, unknown> = {};

      if (typeof payload.email === 'string') {userPatch.email = payload.email.trim();}
      if (typeof payload.full_name === 'string') {userPatch.full_name = payload.full_name.trim();}
      if (typeof payload.phone_number === 'string') {userPatch.phone_number = payload.phone_number.trim();}
      if (typeof payload.phone === 'string') {userPatch.phone_number = payload.phone.trim();}
      if (payload.phone_number === null || payload.phone === null) {
        userPatch.phone_number = null;
      }
      if (typeof payload.avatar_url === 'string') {userPatch.avatar_url = payload.avatar_url;}
      if (payload.phone_number !== undefined || payload.phone !== undefined) {
        userPatch.phone_verified_at = null;
      }

      if (Object.keys(userPatch).length > 0) {
        const { error } = await db.from('users').update(userPatch).eq('id', context.user.id);
        if (error) {throw error;}
      }
      return getDirectProfile(userId);
    },
  });
}

export async function searchDirectTrips(from?: string, to?: string, date?: string, seats?: number): Promise<TripSearchResult[]> {
  const db = getDb();
  let query = db
    .from('trips')
    .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
    .is('deleted_at', null);

  if (date) {query = query.gte('departure_time', `${date}T00:00:00`).lt('departure_time', `${date}T23:59:59.999`);}
  if (seats) {query = query.gte('available_seats', seats);}
  query = query.in('trip_status', ['open', 'booked', 'in_progress']).order('departure_time').limit(200);

  const { data, error } = await query;
  if (error) {throw error;}

  const rows = ((Array.isArray(data) ? data : []) as TripRow[]).filter((row) => {
    const origin = normalizeJordanLocation(String(row.origin_city ?? ''), String(row.origin_city ?? 'Amman'));
    const destination = normalizeJordanLocation(String(row.destination_city ?? ''), String(row.destination_city ?? 'Aqaba'));
    if (from && to) {return routeMatchesLocationPair(origin, destination, from, to, { allowReverse: false });}
    if (from) {return routeMatchesLocationPair(origin, destination, from, destination, { allowReverse: false });}
    if (to) {return routeMatchesLocationPair(origin, destination, origin, to, { allowReverse: false });}
    return true;
  });
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
  if (error) {throw error;}
  if (!data) {return null;}
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
  if (error) {throw error;}
  const rows = (Array.isArray(data) ? data : []) as TripRow[];
  const profile = mapProfileFromContext(context, { tripCount: rows.length });
  return rows.map((row) => mapTripRow(row, profile));
}

export async function createDirectTrip(userId: string, tripData: TripCreatePayload): Promise<TripSearchResult> {
  return withDataIntegrity({
    operation: 'trip.create.direct',
    schema: tripCreatePayloadSchema,
    payload: tripData,
    execute: async ({ payload }) => {
      const context = await buildUserContext(userId);
      const driver = await ensureDriverForUser(context);
      const db = getDb();
      const vehicleParts = (payload.carModel ?? '').trim().split(/\s+/).filter(Boolean);
      const [vehicleMake = null, ...vehicleRest] = vehicleParts;
      const departureTime = new Date(`${payload.date}T${payload.time}:00`).toISOString();

      const { data, error } = await db
        .from('trips')
        .insert({
          driver_id: driver.driver_id,
          origin_city: normalizeJordanLocation(payload.from, payload.from),
          destination_city: normalizeJordanLocation(payload.to, payload.to),
          departure_time: departureTime,
          available_seats: payload.seats,
          price_per_seat: payload.price,
          trip_status: 'open',
          allow_packages: Boolean(payload.acceptsPackages),
          package_capacity: normalizePackageCapacity(payload.packageCapacity),
          package_slots_remaining: normalizePackageCapacity(payload.packageCapacity),
          vehicle_make: vehicleMake,
          vehicle_model: vehicleRest.length > 0 ? vehicleRest.join(' ') : payload.carModel ?? null,
          notes: buildTripNotes(payload),
        })
        .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
        .single();
      if (error) {throw error;}
      return mapTripRow(data as TripRow, mapProfileFromContext(context));
    },
  });
}

export async function updateDirectTrip(tripId: string, updates: TripUpdatePayload): Promise<TripSearchResult> {
  return withDataIntegrity({
    operation: 'trip.update.direct',
    schema: tripUpdatePayloadSchema,
    payload: updates,
    execute: async ({ payload: updatesPayload }) => {
      const db = getDb();
      const payload: Record<string, unknown> = {};

      if (updatesPayload.from) {payload.origin_city = normalizeJordanLocation(updatesPayload.from, updatesPayload.from);}
      if (updatesPayload.to) {payload.destination_city = normalizeJordanLocation(updatesPayload.to, updatesPayload.to);}
      if (updatesPayload.date || updatesPayload.time) {
        const current = await getDirectTripById(tripId);
        const date = updatesPayload.date ?? current?.date ?? new Date().toISOString().slice(0, 10);
        const time = updatesPayload.time ?? current?.time ?? '08:00';
        payload.departure_time = new Date(`${date}T${time}:00`).toISOString();
      }
      if (typeof updatesPayload.seats === 'number') {payload.available_seats = updatesPayload.seats;}
      if (typeof updatesPayload.price === 'number') {payload.price_per_seat = updatesPayload.price;}
      if (updatesPayload.carModel !== undefined) {
        const parts = String(updatesPayload.carModel ?? '').trim().split(/\s+/).filter(Boolean);
        const [make = null, ...rest] = parts;
        payload.vehicle_make = make;
        payload.vehicle_model = rest.length > 0 ? rest.join(' ') : updatesPayload.carModel ?? null;
      }
      if (updatesPayload.note !== undefined) {payload.notes = updatesPayload.note;}
      if (updatesPayload.status) {payload.trip_status = normalizeTripStatus(updatesPayload.status);}

      const { data, error } = await db
        .from('trips')
        .update(payload)
        .eq('trip_id', tripId)
        .select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at')
        .single();
      if (error) {throw error;}

      const profiles = await fetchProfilesByDriverIds([String((data as TripRow).driver_id ?? '')]);
      return mapTripRow(data as TripRow, profiles[String((data as TripRow).driver_id ?? '')] ?? null);
    },
  });
}

export async function deleteDirectTrip(tripId: string): Promise<{ success: boolean }> {
  const db = getDb();
  const { error } = await db
    .from('trips')
    .update({ trip_status: 'cancelled', deleted_at: new Date().toISOString() })
    .eq('trip_id', tripId);
  if (error) {throw error;}
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
  return withDataIntegrity({
    operation: 'booking.create.direct',
    schema: bookingCreatePayloadSchema,
    payload: input,
    execute: async ({ payload }) => {
      const db = getDb();
      const passenger = await buildUserContext(payload.userId);
      ensureBookingEligibility(mapProfileFromContext(passenger));

      const { data: trip, error: tripError } = await db
        .from('trips')
        .select('trip_id, available_seats, price_per_seat, trip_status')
        .eq('trip_id', payload.tripId)
        .single();
      if (tripError) {throw tripError;}

      const availableSeats = toNumber(trip?.available_seats, 0);
      if (availableSeats < payload.seatsRequested) {throw new Error('Not enough seats available');}
      const resolvedSeatNumber =
        toNumber(payload.metadata?.seat_number, 0) || 1;

      const pricePerSeat = toNumber(trip?.price_per_seat, 0);
      const totalPrice = toNumber(payload.metadata?.total_price, pricePerSeat * payload.seatsRequested);
      const bookingStatus = payload.bookingStatus === 'pending_driver' ? 'pending_driver' : 'confirmed';

      const { data, error } = await db.rpc('app_create_booking_request', {
        p_trip_id: payload.tripId,
        p_seats_requested: payload.seatsRequested,
        p_pickup_location: payload.pickup ?? null,
        p_dropoff_location: payload.dropoff ?? null,
        p_runtime_status: bookingStatus,
        p_total_price: totalPrice,
        p_seat_number: resolvedSeatNumber,
      });
      if (error) {throw error;}

      await recordDirectGrowthEvent({
        userId: payload.userId,
        eventName: 'ride_booking_created',
        funnelStage: bookingStatus === 'pending_driver' ? 'selected' : 'booked',
        serviceType: 'ride',
        from: payload.pickup,
        to: payload.dropoff,
        valueJod: totalPrice,
        metadata: {
          tripId: payload.tripId,
          bookingStatus,
          seatsRequested: payload.seatsRequested,
          seatNumber: resolvedSeatNumber,
        },
      }).catch(() => {});

      if (bookingStatus !== 'pending_driver') {
        await processReferralConversionForPassenger(passenger.user.id).catch(() => {});
      }

      return {
        booking: mapBookingRow(data as RawBooking),
      };
    },
  });
}

export async function getDirectUserBookings(userId: string) {
  const context = await buildUserContext(userId);
  const db = getDb();
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('passenger_id', context.user.id)
    .order('created_at', { ascending: false });
  if (error) {throw error;}
  return Array.isArray(data) ? (data as RawBooking[]).map(mapBookingRow) : [];
}

export async function getDirectTripBookings(tripId: string) {
  const db = getDb();
  const { data, error } = await db
    .from('bookings')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (error) {throw error;}
  return Array.isArray(data) ? (data as RawBooking[]).map(mapBookingRow) : [];
}

export async function updateDirectBookingStatus(bookingId: string, status: 'accepted' | 'rejected' | 'cancelled') {
  const db = getDb();
  const nextRuntimeStatus =
    status === 'accepted'
      ? 'confirmed'
      : status;

  const { data: existing, error: existingError } = await db
    .from('bookings')
    .select('*')
    .eq('booking_id', bookingId)
    .single();
  if (existingError) {throw existingError;}

  const bookingRow = existing as RawBooking;
  const previousStatus =
    typeof bookingRow.status === 'string' && bookingRow.status.trim().length > 0
      ? bookingRow.status
      : normalizeBookingStatus(bookingRow.booking_status);

  const { data, error } = await db.rpc('app_update_booking_runtime_status', {
    p_booking_id: bookingId,
    p_runtime_status: nextRuntimeStatus,
  });
  if (error) {throw error;}

  if (nextRuntimeStatus === 'confirmed' && previousStatus === 'pending_driver' && bookingRow.passenger_id) {
    await processReferralConversionForPassenger(String(bookingRow.passenger_id)).catch(() => {});
  }

  await recordDirectGrowthEvent({
    userId: String(bookingRow.passenger_id ?? ''),
    eventName: 'ride_booking_status_updated',
    funnelStage: nextRuntimeStatus === 'confirmed' ? 'booked' : nextRuntimeStatus,
    serviceType: 'ride',
    valueJod: toNumber(bookingRow.amount, 0),
    metadata: {
      bookingId,
      tripId: bookingRow.trip_id,
      previousStatus,
      nextStatus: nextRuntimeStatus,
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
  if (tripsError) {throw tripsError;}

  const tripRows = Array.isArray(trips) ? (trips as TripRow[]) : [];
  const tripMap = new Map(tripRows.map((t) => [String(t.trip_id ?? ''), t]));
  const tripIds = tripRows.map((t) => String(t.trip_id ?? '')).filter(Boolean);
  if (tripIds.length === 0) {return [];}

  const { data: bookings, error } = await db
    .from('bookings')
    .select('*')
    .in('trip_id', tripIds)
    .order('created_at', { ascending: false });
  if (error) {throw error;}

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
