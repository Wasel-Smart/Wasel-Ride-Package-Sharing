import { supabase } from '../utils/supabase/client';

type LatLng = {
  lat: number;
  lng: number;
};

type LiveTripStatus =
  | 'en_route_to_pickup'
  | 'driver_arrived'
  | 'en_route'
  | 'arriving'
  | 'completed';

export interface LiveTripSnapshot {
  bookingId: string;
  tripId: string;
  status: LiveTripStatus;
  from: string;
  fromAr?: string;
  fromCoord: LatLng;
  to: string;
  toAr?: string;
  toCoord: LatLng;
  driver: {
    id: string;
    name: string;
    nameAr?: string;
    rating: number;
    trips: number;
    img: string;
    phone: string;
    initials: string;
  };
  vehicle: {
    model: string;
    color: string;
    plate: string;
    year: number;
  };
  price: number;
  startedAt: string;
  estimatedArrival: string;
  totalDistanceKm: number;
  passengers: number;
  shareCode: string;
  progress: number;
  timeLeftMinutes: number;
  driverPosition: LatLng;
  waypoints: Array<{
    label: string;
    coord: LatLng;
  }>;
  heartbeatAt: string | null;
  telemetryFresh: boolean;
}

const CITY_COORDS: Record<string, LatLng> = {
  amman: { lat: 31.9539, lng: 35.9106 },
  aqaba: { lat: 29.5321, lng: 35.0060 },
  irbid: { lat: 32.5568, lng: 35.8479 },
  zarqa: { lat: 32.0728, lng: 36.0880 },
  jerash: { lat: 32.2744, lng: 35.8961 },
  mafraq: { lat: 32.3429, lng: 36.2080 },
  madaba: { lat: 31.7196, lng: 35.7939 },
  karak: { lat: 31.1854, lng: 35.7048 },
  salt: { lat: 32.0392, lng: 35.7272 },
  ajloun: { lat: 32.3326, lng: 35.7519 },
  tafila: { lat: 30.8375, lng: 35.6042 },
  maan: { lat: 30.1962, lng: 35.7360 },
};

type CanonicalUserRow = {
  id: string;
};

type BookingRow = {
  booking_id?: string;
  id?: string;
  trip_id: string;
  seats_requested?: number | null;
  total_price?: number | null;
  amount?: number | null;
  created_at?: string | null;
  booking_status?: string | null;
  status?: string | null;
};

type TripRow = {
  trip_id?: string | null;
  driver_id?: string | null;
  origin_name?: string | null;
  origin_location?: string | null;
  destination_name?: string | null;
  destination_location?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  departure_time?: string | null;
  price_per_seat?: number | null;
  trip_status?: string | null;
};

type DriverRow = {
  driver_id: string;
  user_id: string;
};

type UserRow = {
  id: string;
  full_name?: string | null;
  phone_number?: string | null;
  avatar_url?: string | null;
};

type VehicleRow = {
  vehicle_make?: string | null;
  vehicle_model?: string | null;
  plate_number?: string | null;
};

type PresenceRow = {
  trip_id: string;
  active_passengers?: number | null;
  last_location?: {
    lat?: number;
    lng?: number;
    lon?: number;
  } | null;
  last_heartbeat_at?: string | null;
};

function normalizeCity(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/\s+/g, ' ');
}

function coordFromCity(city: string | null | undefined): LatLng {
  return CITY_COORDS[normalizeCity(city)] ?? CITY_COORDS.amman;
}

function parseCoordValue(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseLocation(value: string | null | undefined): LatLng | null {
  const text = String(value ?? '').trim();
  if (!text) return null;

  const jsonMatch = text.startsWith('{') ? text : '';
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch) as { lat?: unknown; lng?: unknown; lon?: unknown };
      const lat = parseCoordValue(parsed.lat);
      const lng = parseCoordValue(parsed.lng ?? parsed.lon);
      if (lat !== null && lng !== null) {
        return { lat, lng };
      }
    } catch {
      // Fall through to raw pair parsing.
    }
  }

  const pair = text.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (!pair) return null;

  const lat = Number(pair[1]);
  const lng = Number(pair[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'WD';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthKm * Math.asin(Math.sqrt(h));
}

function interpolate(a: LatLng, b: LatLng, ratio: number): LatLng {
  return {
    lat: a.lat + ((b.lat - a.lat) * ratio),
    lng: a.lng + ((b.lng - a.lng) * ratio),
  };
}

function formatClockEta(minutesFromNow: number): string {
  const date = new Date(Date.now() + (minutesFromNow * 60 * 1000));
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isFreshHeartbeat(value: string | null | undefined): boolean {
  if (!value) return false;
  const heartbeatAt = new Date(value).getTime();
  if (Number.isNaN(heartbeatAt)) return false;
  return Date.now() - heartbeatAt <= 5 * 60 * 1000;
}

function mapTripStatus(
  tripStatus: string | null | undefined,
  progress: number,
): LiveTripStatus {
  if (tripStatus === 'completed' || progress >= 99.5) return 'completed';
  if (tripStatus === 'in_progress' && progress >= 85) return 'arriving';
  if (tripStatus === 'in_progress') return 'en_route';
  if (progress >= 12) return 'driver_arrived';
  return 'en_route_to_pickup';
}

async function resolveCanonicalUserId(authUserId: string): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) throw error;
  return (data as CanonicalUserRow | null)?.id ?? null;
}

async function fetchLatestActiveBooking(canonicalUserId: string): Promise<BookingRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('bookings')
    .select('booking_id, id, trip_id, seats_requested, total_price, amount, created_at, booking_status, status')
    .eq('passenger_id', canonicalUserId)
    .in('booking_status', ['confirmed', 'checked_in', 'completed'])
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as BookingRow | null) ?? null;
}

function derivePrice(booking: BookingRow, trip: TripRow): number {
  const bookingAmount = Number(booking.total_price ?? booking.amount ?? 0);
  if (Number.isFinite(bookingAmount) && bookingAmount > 0) return bookingAmount;
  const seats = Number(booking.seats_requested ?? 1) || 1;
  const perSeat = Number(trip.price_per_seat ?? 0);
  return Number.isFinite(perSeat) ? Number((perSeat * seats).toFixed(2)) : 0;
}

async function fetchLiveTripSnapshot(authUserId: string): Promise<LiveTripSnapshot | null> {
  if (!supabase || !authUserId) return null;

  const canonicalUserId = await resolveCanonicalUserId(authUserId);
  if (!canonicalUserId) return null;

  const booking = await fetchLatestActiveBooking(canonicalUserId);
  if (!booking?.trip_id) return null;

  const [{ data: tripData, error: tripError }, { data: presenceData }] = await Promise.all([
    supabase
      .from('trips')
      .select('trip_id, driver_id, origin_name, origin_location, destination_name, destination_location, origin_city, destination_city, departure_time, price_per_seat, trip_status')
      .eq('trip_id', booking.trip_id)
      .maybeSingle(),
    supabase
      .from('trip_presence')
      .select('trip_id, active_passengers, last_location, last_heartbeat_at')
      .eq('trip_id', booking.trip_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (tripError) throw tripError;
  const trip = (tripData as TripRow | null) ?? null;
  if (!trip?.trip_id || !trip.driver_id) return null;

  const [{ data: driverData }, { data: vehicleData }] = await Promise.all([
    supabase
      .from('drivers')
      .select('driver_id, user_id')
      .eq('driver_id', trip.driver_id)
      .maybeSingle(),
    supabase
      .from('vehicles')
      .select('vehicle_make, vehicle_model, plate_number')
      .eq('driver_id', trip.driver_id)
      .limit(1)
      .maybeSingle(),
  ]);

  const driver = (driverData as DriverRow | null) ?? null;
  const vehicle = (vehicleData as VehicleRow | null) ?? null;
  if (!driver?.user_id) return null;

  const [{ data: driverUserData }, { count: tripCount }] = await Promise.all([
    supabase
      .from('users')
      .select('id, full_name, phone_number, avatar_url')
      .eq('id', driver.user_id)
      .maybeSingle(),
    supabase
      .from('trips')
      .select('trip_id', { count: 'exact', head: true })
      .eq('driver_id', trip.driver_id),
  ]);

  const driverUser = (driverUserData as UserRow | null) ?? null;
  const presence = (presenceData as PresenceRow | null) ?? null;

  const fromLabel = trip.origin_name || trip.origin_city || 'Pickup';
  const toLabel = trip.destination_name || trip.destination_city || 'Dropoff';
  const fromCoord = parseLocation(trip.origin_location) ?? coordFromCity(trip.origin_city);
  const toCoord = parseLocation(trip.destination_location) ?? coordFromCity(trip.destination_city);
  const fallbackDriverPosition = interpolate(fromCoord, toCoord, 0.18);
  const lastLocation = presence?.last_location && typeof presence.last_location === 'object'
    ? {
        lat: parseCoordValue(presence.last_location.lat) ?? fallbackDriverPosition.lat,
        lng: parseCoordValue(presence.last_location.lng ?? presence.last_location.lon) ?? fallbackDriverPosition.lng,
      }
    : fallbackDriverPosition;

  const totalDistanceKm = Math.max(haversineKm(fromCoord, toCoord), 0.8);
  const travelledKm = Math.min(haversineKm(fromCoord, lastLocation), totalDistanceKm);
  const progress = Math.max(3, Math.min(100, (travelledKm / totalDistanceKm) * 100));
  const remainingKm = Math.max(totalDistanceKm - travelledKm, 0);
  const timeLeftMinutes = Math.max(1, Math.round((remainingKm / 48) * 60));
  const status = mapTripStatus(trip.trip_status, progress);
  const startedAtSource = trip.departure_time ?? booking.created_at ?? new Date().toISOString();
  const startedAtDate = new Date(startedAtSource);
  const startedAt = Number.isNaN(startedAtDate.getTime())
    ? startedAtSource
    : startedAtDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

  return {
    bookingId: String(booking.booking_id ?? booking.id ?? ''),
    tripId: String(trip.trip_id),
    status,
    from: fromLabel,
    to: toLabel,
    fromCoord,
    toCoord,
    driver: {
      id: trip.driver_id,
      name: driverUser?.full_name?.trim() || 'Wasel Captain',
      rating: 4.9,
      trips: Number(tripCount ?? 0) || 0,
      img: driverUser?.avatar_url?.trim() || `https://i.pravatar.cc/150?u=${trip.driver_id}`,
      phone: driverUser?.phone_number?.trim() || '',
      initials: buildInitials(driverUser?.full_name?.trim() || 'Wasel Driver'),
    },
    vehicle: {
      model: [vehicle?.vehicle_make, vehicle?.vehicle_model].filter(Boolean).join(' ') || 'Wasel Vehicle',
      color: 'White',
      plate: vehicle?.plate_number?.trim() || 'WASEL',
      year: new Date().getFullYear(),
    },
    price: derivePrice(booking, trip),
    startedAt,
    estimatedArrival: formatClockEta(timeLeftMinutes),
    totalDistanceKm: Number(totalDistanceKm.toFixed(1)),
    passengers: Math.max(1, Number(presence?.active_passengers ?? booking.seats_requested ?? 1) || 1),
    shareCode: String(trip.trip_id).slice(-8).toUpperCase(),
    progress,
    timeLeftMinutes,
    driverPosition: lastLocation,
    waypoints: [
      { label: fromLabel, coord: fromCoord },
      { label: 'On route', coord: interpolate(fromCoord, toCoord, 0.33) },
      { label: 'Approaching', coord: interpolate(fromCoord, toCoord, 0.72) },
      { label: toLabel, coord: toCoord },
    ],
    heartbeatAt: presence?.last_heartbeat_at ?? null,
    telemetryFresh: isFreshHeartbeat(presence?.last_heartbeat_at),
  };
}

export function subscribeToLiveTripPresence(
  authUserId: string,
  onSnapshot: (snapshot: LiveTripSnapshot | null) => void,
): () => void {
  if (!supabase || !authUserId) {
    onSnapshot(null);
    return () => {};
  }

  let active = true;
  let refreshing: Promise<void> | null = null;
  let queued = false;

  const refresh = () => {
    if (!active) return;
    if (refreshing) {
      queued = true;
      return;
    }

    refreshing = fetchLiveTripSnapshot(authUserId)
      .then((snapshot) => {
        if (active) {
          onSnapshot(snapshot);
        }
      })
      .catch(() => {
        if (active) {
          onSnapshot(null);
        }
      })
      .finally(() => {
        refreshing = null;
        if (queued) {
          queued = false;
          refresh();
        }
      });
  };

  refresh();

  const channel = supabase
    .channel(`live-trip-presence-${authUserId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_presence' }, refresh)
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
}
