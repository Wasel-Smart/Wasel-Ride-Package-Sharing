import { useEffect, useState } from 'react';
import { supabase } from '../../services/core';

export type LiveMobilityRouteSnapshot = {
  routeId: string;
  passengerFlow: number;
  packageFlow: number;
  density: number;
  speedKph: number;
  congestion: number;
};

export type LiveMobilityAnalytics = {
  totalVehicles: number;
  activePassengers: number;
  activePackages: number;
  seatAvailability: number;
  packageCapacity: number;
  avgSpeed: number;
  networkUtilization: number;
  congestionLevel: number;
  topCorridor: string;
  recommendedPath: string;
  dispatchAction: string;
};

export type LiveMobilityVehicleSnapshot = {
  id: string;
  tripId: string;
  routeId: string;
  lat: number;
  lng: number;
  type: 'passenger' | 'package';
  passengers?: number;
  seatCapacity?: number;
  packageCapacity?: number;
  packageLoad?: number;
  fresh: boolean;
};

export type LiveMobilitySnapshot = {
  routes: LiveMobilityRouteSnapshot[];
  analytics: LiveMobilityAnalytics;
  vehicles: LiveMobilityVehicleSnapshot[];
  telemetry: {
    totalTripsWithTelemetry: number;
    freshTripsWithTelemetry: number;
    staleTripsWithTelemetry: number;
    latestHeartbeatAt: string | null;
    hasRenderableLocations: boolean;
  };
  traffic: {
    provider: 'google-routes' | 'none';
    enabled: boolean;
    liveCorridors: number;
    updatedAt: string | null;
  };
  source: 'supabase';
  updatedAt: string;
};

type TripRow = {
  trip_id: string | null;
  origin_city: string | null;
  destination_city: string | null;
  available_seats: number | null;
  total_seats: number | null;
  package_capacity: number | null;
  package_slots_remaining: number | null;
  departure_time: string | null;
  trip_status: string | null;
  allow_packages: boolean | null;
};

type BookingRow = {
  trip_id: string;
  seats_requested: number | null;
  booking_status: string | null;
  status: string | null;
};

type PackageRow = {
  trip_id: string | null;
  origin_name: string | null;
  origin_location: string | null;
  destination_name: string | null;
  destination_location: string | null;
  package_status: string | null;
  status: string | null;
};

type PresenceRow = {
  trip_id: string;
  active_passengers: number;
  active_packages: number;
  last_location?: {
    lat?: number;
    lng?: number;
    lon?: number;
    city?: string;
  } | null;
  last_heartbeat_at: string;
};

type CorridorAggregate = {
  routeId: string;
  from: string;
  to: string;
  trips: number;
  activeTrips: number;
  seatsOpen: number;
  seatsFilled: number;
  packageSlotsOpen: number;
  packageSlotsFilled: number;
  activePassengers: number;
  activePackages: number;
};

type TrafficSnapshot = {
  speedKph: number;
  congestion: number;
  updatedAt: string;
};

const ROUTE_CITY_PAIRS = [
  {
    routeId: 'amman-aqaba',
    from: 'amman',
    to: 'aqaba',
    label: 'Amman -> Aqaba',
    labelAr: 'عمّان ← العقبة',
  },
  {
    routeId: 'amman-irbid',
    from: 'amman',
    to: 'irbid',
    label: 'Amman -> Irbid',
    labelAr: 'عمّان ← إربد',
  },
  {
    routeId: 'amman-zarqa',
    from: 'amman',
    to: 'zarqa',
    label: 'Amman -> Zarqa',
    labelAr: 'عمّان ← الزرقاء',
  },
  {
    routeId: 'zarqa-mafraq',
    from: 'zarqa',
    to: 'mafraq',
    label: 'Zarqa -> Mafraq',
    labelAr: 'الزرقاء ← المفرق',
  },
  {
    routeId: 'amman-jerash',
    from: 'amman',
    to: 'jerash',
    label: 'Amman -> Jerash',
    labelAr: 'عمّان ← جرش',
  },
  {
    routeId: 'irbid-ajloun',
    from: 'irbid',
    to: 'ajloun',
    label: 'Irbid -> Ajloun',
    labelAr: 'إربد ← عجلون',
  },
  {
    routeId: 'amman-madaba',
    from: 'amman',
    to: 'madaba',
    label: 'Amman -> Madaba',
    labelAr: 'عمّان ← مادبا',
  },
  {
    routeId: 'madaba-karak',
    from: 'madaba',
    to: 'karak',
    label: 'Madaba -> Karak',
    labelAr: 'مادبا ← الكرك',
  },
  {
    routeId: 'karak-tafila',
    from: 'karak',
    to: 'tafila',
    label: 'Karak -> Tafila',
    labelAr: 'الكرك ← الطفيلة',
  },
  {
    routeId: 'tafila-maan',
    from: 'tafila',
    to: 'maan',
    label: "Tafila -> Ma'an",
    labelAr: 'الطفيلة ← معان',
  },
  {
    routeId: 'maan-aqaba',
    from: 'maan',
    to: 'aqaba',
    label: "Ma'an -> Aqaba",
    labelAr: 'معان ← العقبة',
  },
  {
    routeId: 'irbid-zarqa',
    from: 'irbid',
    to: 'zarqa',
    label: 'Irbid -> Zarqa',
    labelAr: 'إربد ← الزرقاء',
  },
  {
    routeId: 'amman-salt',
    from: 'amman',
    to: 'salt',
    label: 'Amman -> Salt',
    labelAr: 'عمّان ← السلط',
  },
  {
    routeId: 'salt-jerash',
    from: 'salt',
    to: 'jerash',
    label: 'Salt -> Jerash',
    labelAr: 'السلط ← جرش',
  },
  {
    routeId: 'ajloun-jerash',
    from: 'ajloun',
    to: 'jerash',
    label: 'Ajloun -> Jerash',
    labelAr: 'عجلون ← جرش',
  },
] as const;

const CITY_ALIASES: Record<string, string> = {
  amman: 'amman',
  'amman governorate': 'amman',
  عمان: 'amman',
  عمّان: 'amman',
  aqaba: 'aqaba',
  العقبة: 'aqaba',
  irbid: 'irbid',
  اربد: 'irbid',
  إربد: 'irbid',
  zarqa: 'zarqa',
  الزرقاء: 'zarqa',
  mafraq: 'mafraq',
  المفرق: 'mafraq',
  jerash: 'jerash',
  jarash: 'jerash',
  جرش: 'jerash',
  ajloun: 'ajloun',
  ajlun: 'ajloun',
  عجلون: 'ajloun',
  madaba: 'madaba',
  مادبا: 'madaba',
  karak: 'karak',
  الكرك: 'karak',
  tafila: 'tafila',
  tafilah: 'tafila',
  الطفيلة: 'tafila',
  maan: 'maan',
  "ma'an": 'maan',
  معان: 'maan',
  salt: 'salt',
  السلط: 'salt',
};

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  amman: { lat: 31.9454, lng: 35.9284 },
  aqaba: { lat: 29.532, lng: 35.0063 },
  irbid: { lat: 32.5556, lng: 35.85 },
  zarqa: { lat: 32.0728, lng: 36.088 },
  mafraq: { lat: 32.3406, lng: 36.208 },
  jerash: { lat: 32.2803, lng: 35.8993 },
  ajloun: { lat: 32.3326, lng: 35.7519 },
  madaba: { lat: 31.7197, lng: 35.7936 },
  karak: { lat: 31.1853, lng: 35.7048 },
  tafila: { lat: 30.8375, lng: 35.6042 },
  maan: { lat: 30.1962, lng: 35.736 },
  salt: { lat: 32.0392, lng: 35.7272 },
};

const TRAFFIC_CACHE_TTL_MS = 2 * 60 * 1000;
const trafficCache = new Map<string, { expiresAt: number; snapshot: TrafficSnapshot }>();
const ENABLE_MOBILITY_OS_LIVE_DATA =
  String(import.meta.env.VITE_ENABLE_MOBILITY_OS_LIVE_DATA ?? '').trim().toLowerCase() ===
  'true';

function shouldUseMobilityLiveData() {
  if (!supabase) return false;
  if (import.meta.env.VITE_ENABLE_DEMO_DATA === 'true') return false;
  if (typeof window === 'undefined') return ENABLE_MOBILITY_OS_LIVE_DATA;

  const hostname = window.location.hostname;
  const isLocalPreview = hostname === 'localhost' || hostname === '127.0.0.1';
  return ENABLE_MOBILITY_OS_LIVE_DATA || !isLocalPreview;
}

function normalizeCity(value: string | null | undefined): string | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/[’']/g, '').replace(/\s+/g, ' ').replace(/-/g, ' ');
  return CITY_ALIASES[normalized] ?? null;
}

function matchRouteId(
  origin: string | null | undefined,
  destination: string | null | undefined,
): string | null {
  const from = normalizeCity(origin);
  const to = normalizeCity(destination);
  if (!from || !to || from === to) return null;

  const exact = ROUTE_CITY_PAIRS.find(route => route.from === from && route.to === to);
  if (exact) return exact.routeId;

  const reverse = ROUTE_CITY_PAIRS.find(route => route.from === to && route.to === from);
  return reverse?.routeId ?? null;
}

function routeLabel(routeId: string, ar: boolean): string {
  const route = ROUTE_CITY_PAIRS.find(item => item.routeId === routeId);
  if (!route) return routeId;
  return ar ? route.labelAr : route.label;
}

function getPresencePassengers(presence: PresenceRow | undefined, bookedSeats: number): number {
  return Math.max(0, Number(presence?.active_passengers ?? bookedSeats) || 0);
}

function getPresencePackages(presence: PresenceRow | undefined, packagesOnTrip: number): number {
  return Math.max(0, Number(presence?.active_packages ?? packagesOnTrip) || 0);
}

function hasRenderableLocation(value: PresenceRow['last_location']): boolean {
  if (!value || typeof value !== 'object') return false;
  const lat = Number(value.lat);
  const lng = Number(value.lng ?? value.lon);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function isFreshHeartbeat(timestamp: string | null | undefined): boolean {
  if (!timestamp) return false;
  const heartbeatAt = new Date(timestamp).getTime();
  if (Number.isNaN(heartbeatAt)) return false;
  return Date.now() - heartbeatAt <= 5 * 60 * 1000;
}

function getGoogleMapsApiKey(): string | null {
  const key = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '').trim();
  if (!key || key === 'your-google-maps-api-key-here') return null;
  return key;
}

function parseGoogleDurationSeconds(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^([0-9]+(?:\.[0-9]+)?)s$/.exec(value.trim());
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) ? seconds : null;
}

async function fetchTrafficSnapshot(
  routeId: string,
  from: string,
  to: string,
): Promise<TrafficSnapshot | null> {
  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return null;

  const origin = CITY_COORDS[from];
  const destination = CITY_COORDS[to];
  if (!origin || !destination) return null;

  const cached = trafficCache.get(routeId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.snapshot;
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.staticDuration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lng } },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
        departureTime: new Date().toISOString(),
      }),
    });

    if (!response.ok) return null;
    const json = await response.json();
    const route = Array.isArray(json?.routes) ? json.routes[0] : null;
    const durationSeconds = parseGoogleDurationSeconds(route?.duration);
    const staticDurationSeconds = parseGoogleDurationSeconds(route?.staticDuration);
    const distanceMeters = Number(route?.distanceMeters ?? 0);

    if (!durationSeconds || distanceMeters <= 0) return null;

    const speedKph = Math.max(18, Math.round((distanceMeters / durationSeconds) * 3.6));
    const trafficRatio =
      staticDurationSeconds && staticDurationSeconds > 0
        ? durationSeconds / staticDurationSeconds
        : 1;
    const congestion = Math.max(0.05, Math.min(0.98, (trafficRatio - 1) / 0.65));
    const snapshot = {
      speedKph,
      congestion,
      updatedAt: new Date().toISOString(),
    };

    trafficCache.set(routeId, {
      expiresAt: Date.now() + TRAFFIC_CACHE_TTL_MS,
      snapshot,
    });

    return snapshot;
  } catch {
    return null;
  }
}

function estimateCongestion(
  activeTrips: number,
  seatsFilled: number,
  seatsOpen: number,
  packageFilled: number,
  packageOpen: number,
): number {
  const seatCapacity = Math.max(seatsFilled + seatsOpen, 1);
  const packageCapacity = Math.max(packageFilled + packageOpen, 1);
  const seatUtil = seatsFilled / seatCapacity;
  const packageUtil = packageFilled / packageCapacity;
  return Math.max(0.08, Math.min(0.98, activeTrips * 0.12 + seatUtil * 0.52 + packageUtil * 0.22));
}

function estimateSpeed(congestion: number): number {
  return Math.max(28, Math.round(110 - congestion * 62));
}

function buildDispatch(topRoute: string, ar: boolean): string {
  const route = ROUTE_CITY_PAIRS.find(item => item.routeId === topRoute);
  if (!route) return ar ? 'مراجعة التوزيع التشغيلي' : 'Review operational distribution';
  const target = ar ? route.labelAr.split(' ← ')[0] : route.label.split(' -> ')[1];
  return ar ? `إعادة توجيه العرض باتجاه ${target}` : `Reposition supply toward ${target}`;
}

async function fetchMobilitySnapshot(ar: boolean): Promise<LiveMobilitySnapshot | null> {
  if (!supabase) return null;

  const [{ data: trips }, { data: bookings }, { data: packages }, { data: tripPresence }] =
    await Promise.all([
      supabase
        .from('trips')
        .select(
          'trip_id, origin_city, destination_city, available_seats, total_seats, package_capacity, package_slots_remaining, departure_time, trip_status, allow_packages',
        )
        .is('deleted_at', null)
        .in('trip_status', ['open', 'booked', 'in_progress']),
      supabase
        .from('bookings')
        .select('trip_id, seats_requested, booking_status, status')
        .in('booking_status', ['confirmed', 'pending_driver'])
        .order('created_at', { ascending: false }),
      supabase
        .from('packages')
        .select(
          'trip_id, origin_name, origin_location, destination_name, destination_location, package_status, status',
        )
        .in('package_status', ['created', 'assigned', 'in_transit']),
      supabase
        .from('trip_presence')
        .select('trip_id, active_passengers, active_packages, last_location, last_heartbeat_at'),
    ]);

  const tripRows = (Array.isArray(trips) ? trips : []) as TripRow[];
  if (tripRows.length === 0) return null;

  const bookingRows = (Array.isArray(bookings) ? bookings : []) as BookingRow[];
  const packageRows = (Array.isArray(packages) ? packages : []) as PackageRow[];
  const presenceRows = (Array.isArray(tripPresence) ? tripPresence : []) as PresenceRow[];

  const bookingsByTrip = new Map<string, BookingRow[]>();
  bookingRows.forEach(row => {
    const current = bookingsByTrip.get(row.trip_id) ?? [];
    current.push(row);
    bookingsByTrip.set(row.trip_id, current);
  });

  const packagesByTrip = new Map<string, PackageRow[]>();
  packageRows.forEach(row => {
    if (!row.trip_id) return;
    const current = packagesByTrip.get(row.trip_id) ?? [];
    current.push(row);
    packagesByTrip.set(row.trip_id, current);
  });

  const presenceByTrip = new Map<string, PresenceRow>();
  presenceRows.forEach(row => {
    if (!row.trip_id) return;
    presenceByTrip.set(row.trip_id, row);
  });

  const tripsByTripId = new Map<string, TripRow>();
  tripRows.forEach(trip => {
    if (!trip.trip_id) return;
    tripsByTripId.set(trip.trip_id, trip);
  });

  const corridorMap = new Map<string, CorridorAggregate>();

  tripRows.forEach(trip => {
    const routeId = matchRouteId(trip.origin_city, trip.destination_city);
    if (!routeId || !trip.trip_id) return;

    const routeConfig = ROUTE_CITY_PAIRS.find(item => item.routeId === routeId);
    if (!routeConfig) return;

    const tripBookings = bookingsByTrip.get(trip.trip_id) ?? [];
    const bookedSeats = tripBookings.reduce(
      (sum, booking) => sum + Math.max(1, Number(booking.seats_requested ?? 1) || 1),
      0,
    );
    const tripPackages = packagesByTrip.get(trip.trip_id) ?? [];
    const packagesOnTrip = tripPackages.length;
    const presence = presenceByTrip.get(trip.trip_id);
    const seatsOpen = Math.max(0, Number(trip.available_seats ?? 0) || 0);
    const totalSeats = Math.max(seatsOpen + bookedSeats, Number(trip.total_seats ?? 0) || 0);
    const packageCapacity = Math.max(
      Number(trip.package_capacity ?? 0) || 0,
      Number(trip.package_slots_remaining ?? 0) || 0,
    );
    const packageSlotsOpen = Math.max(
      0,
      Number(trip.package_slots_remaining ?? Math.max(packageCapacity - packagesOnTrip, 0)) || 0,
    );
    const packageSlotsFilled = Math.max(
      0,
      Math.max(packageCapacity - packageSlotsOpen, packagesOnTrip),
    );

    const current = corridorMap.get(routeId) ?? {
      routeId,
      from: routeConfig.from,
      to: routeConfig.to,
      trips: 0,
      activeTrips: 0,
      seatsOpen: 0,
      seatsFilled: 0,
      packageSlotsOpen: 0,
      packageSlotsFilled: 0,
      activePassengers: 0,
      activePackages: 0,
    };

    current.trips += 1;
    current.activeTrips += 1;
    current.seatsOpen += seatsOpen;
    current.seatsFilled += Math.max(bookedSeats, totalSeats - seatsOpen);
    current.packageSlotsOpen += packageSlotsOpen;
    current.packageSlotsFilled += packageSlotsFilled;
    current.activePassengers += getPresencePassengers(presence, bookedSeats);
    current.activePackages += getPresencePackages(presence, packagesOnTrip);

    corridorMap.set(routeId, current);
  });

  if (corridorMap.size === 0) return null;

  const trafficEntries = await Promise.all(
    Array.from(corridorMap.values()).map(async corridor => {
      const snapshot = await fetchTrafficSnapshot(corridor.routeId, corridor.from, corridor.to);
      return [corridor.routeId, snapshot] as const;
    }),
  );
  const trafficByRoute = new Map(
    trafficEntries.filter(entry => entry[1]).map(entry => [entry[0], entry[1] as TrafficSnapshot]),
  );

  const routes = Array.from(corridorMap.values()).map(corridor => {
    const estimatedCongestion = estimateCongestion(
      corridor.activeTrips,
      corridor.seatsFilled,
      corridor.seatsOpen,
      corridor.packageSlotsFilled,
      corridor.packageSlotsOpen,
    );
    const trafficSnapshot = trafficByRoute.get(corridor.routeId);
    return {
      routeId: corridor.routeId,
      passengerFlow: corridor.activePassengers,
      packageFlow: corridor.activePackages,
      density: Math.round(
        corridor.activeTrips * 10 + corridor.seatsFilled * 1.5 + corridor.packageSlotsFilled * 2,
      ),
      speedKph: trafficSnapshot?.speedKph ?? estimateSpeed(estimatedCongestion),
      congestion: trafficSnapshot?.congestion ?? estimatedCongestion,
    };
  });

  const totals = Array.from(corridorMap.values()).reduce(
    (acc, corridor) => {
      acc.totalVehicles += corridor.activeTrips;
      acc.activePassengers += corridor.activePassengers;
      acc.activePackages += corridor.activePackages;
      acc.seatAvailability += corridor.seatsOpen;
      acc.packageCapacity += corridor.packageSlotsOpen;
      return acc;
    },
    {
      totalVehicles: 0,
      activePassengers: 0,
      activePackages: 0,
      seatAvailability: 0,
      packageCapacity: 0,
    },
  );

  const telemetryRows = presenceRows.filter(row => Boolean(row.trip_id));
  const totalTripsWithTelemetry = telemetryRows.length;
  const freshTripsWithTelemetry = telemetryRows.filter(row =>
    isFreshHeartbeat(row.last_heartbeat_at),
  ).length;
  const staleTripsWithTelemetry = Math.max(0, totalTripsWithTelemetry - freshTripsWithTelemetry);
  const latestHeartbeatAt =
    telemetryRows
      .map(row => row.last_heartbeat_at)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;
  const hasRenderableLocations = telemetryRows.some(row =>
    hasRenderableLocation(row.last_location),
  );
  const vehicles = telemetryRows.flatMap(presence => {
    const trip = tripsByTripId.get(presence.trip_id);
    if (!trip) return [];

    const routeId = matchRouteId(trip.origin_city, trip.destination_city);
    if (!routeId || !hasRenderableLocation(presence.last_location)) return [];

    const lat = Number(presence.last_location?.lat);
    const lng = Number(presence.last_location?.lng ?? presence.last_location?.lon);
    const bookedSeats = (bookingsByTrip.get(presence.trip_id) ?? []).reduce(
      (sum, booking) => sum + Math.max(1, Number(booking.seats_requested ?? 1) || 1),
      0,
    );
    const packageRowsForTrip = packagesByTrip.get(presence.trip_id) ?? [];
    const packageCapacity = Math.max(
      Number(trip.package_capacity ?? 0) || 0,
      packageRowsForTrip.length,
    );
    const totalSeats = Math.max(
      Number(trip.total_seats ?? 0) || 0,
      bookedSeats + Math.max(0, Number(trip.available_seats ?? 0) || 0),
    );
    const passengers = getPresencePassengers(presence, bookedSeats);
    const packageLoad = getPresencePackages(presence, packageRowsForTrip.length);

    return [
      {
        id: `live-${presence.trip_id}`,
        tripId: presence.trip_id,
        routeId,
        lat,
        lng,
        type: packageLoad > passengers ? ('package' as const) : ('passenger' as const),
        passengers,
        seatCapacity: totalSeats || undefined,
        packageCapacity: packageCapacity || undefined,
        packageLoad: packageLoad || undefined,
        fresh: isFreshHeartbeat(presence.last_heartbeat_at),
      },
    ];
  });

  const avgSpeed =
    routes.reduce((sum, route) => sum + route.speedKph, 0) / Math.max(routes.length, 1);
  const congestionLevel =
    routes.reduce((sum, route) => sum + route.congestion, 0) / Math.max(routes.length, 1);
  const topRoute = routes
    .slice()
    .sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow))[0];
  const networkUtilization = Math.max(0.05, Math.min(1, totals.totalVehicles / 24));

  return {
    source: 'supabase',
    updatedAt: new Date().toISOString(),
    routes,
    vehicles,
    telemetry: {
      totalTripsWithTelemetry,
      freshTripsWithTelemetry,
      staleTripsWithTelemetry,
      latestHeartbeatAt,
      hasRenderableLocations,
    },
    traffic: {
      provider: trafficByRoute.size > 0 ? 'google-routes' : 'none',
      enabled: trafficByRoute.size > 0,
      liveCorridors: trafficByRoute.size,
      updatedAt:
        trafficByRoute.size > 0
          ? (Array.from(trafficByRoute.values())
              .map(item => item.updatedAt)
              .sort()
              .slice(-1)[0] ?? null)
          : null,
    },
    analytics: {
      totalVehicles: totals.totalVehicles,
      activePassengers: totals.activePassengers,
      activePackages: totals.activePackages,
      seatAvailability: totals.seatAvailability,
      packageCapacity: totals.packageCapacity,
      avgSpeed,
      networkUtilization,
      congestionLevel,
      topCorridor: topRoute ? routeLabel(topRoute.routeId, ar) : '',
      recommendedPath: topRoute ? routeLabel(topRoute.routeId, ar) : '',
      dispatchAction: topRoute
        ? buildDispatch(topRoute.routeId, ar)
        : ar
          ? 'مراجعة التوزيع التشغيلي'
          : 'Review operational distribution',
    },
  };
}

export function useMobilityOSLiveData(ar: boolean) {
  const [snapshot, setSnapshot] = useState<LiveMobilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shouldUseMobilityLiveData()) {
      setSnapshot(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let refreshInFlight = false;

    const refresh = async () => {
      if (refreshInFlight) return;
      refreshInFlight = true;
      try {
        const next = await fetchMobilitySnapshot(ar);
        if (!cancelled) {
          setSnapshot(next);
        }
      } finally {
        refreshInFlight = false;
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();

    const supabaseClient = supabase;
    if (!supabaseClient) {
      return () => {
        cancelled = true;
      };
    }

    const refreshInterval =
      typeof window !== 'undefined'
        ? window.setInterval(() => {
            void refresh();
          }, 15_000)
        : null;

    const handleVisibilityRefresh = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
      }
    };
    const handleWindowFocus = () => {
      void refresh();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleWindowFocus);
      document.addEventListener('visibilitychange', handleVisibilityRefresh);
    }

    const channel = supabaseClient
      .channel(`mobility-os-live-${ar ? 'ar' : 'en'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'packages' }, () => {
        void refresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trip_presence' }, () => {
        void refresh();
      })
      .subscribe();

    return () => {
      cancelled = true;
      if (refreshInterval !== null && typeof window !== 'undefined') {
        window.clearInterval(refreshInterval);
        window.removeEventListener('focus', handleWindowFocus);
        document.removeEventListener('visibilitychange', handleVisibilityRefresh);
      }
      void supabaseClient.removeChannel(channel);
    };
  }, [ar]);

  return { snapshot, loading };
}
