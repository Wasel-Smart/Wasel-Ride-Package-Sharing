import { useEffect, useRef, useState } from 'react';
import {
  fetchMobilityLiveRows,
  subscribeToMobilityLiveRows,
  type MobilityBookingRow,
  type MobilityPackageRow,
  type MobilityPresenceRow,
  type MobilityTripRow,
} from '../../services/mobilityLiveData';
import {
  fetchGoogleTrafficSnapshot,
  type GoogleTrafficSnapshot,
} from '../../services/googleRoutesTraffic';

const DEBOUNCE_MS = 2000;

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

type TripRow = MobilityTripRow;
type BookingRow = MobilityBookingRow;
type PackageRow = MobilityPackageRow;
type PresenceRow = MobilityPresenceRow;

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

type TrafficSnapshot = GoogleTrafficSnapshot;

const ROUTE_CITY_PAIRS = [
  {
    routeId: 'amman-aqaba',
    from: 'amman',
    to: 'aqaba',
    label: 'Amman -> Aqaba',
    labelAr: 'عمان ← الإقبة',
  },
  {
    routeId: 'amman-irbid',
    from: 'amman',
    to: 'irbid',
    label: 'Amman -> Irbid',
    labelAr: 'عمان ← إربد',
  },
  {
    routeId: 'amman-zarqa',
    from: 'amman',
    to: 'zarqa',
    label: 'Amman -> Zarqa',
    labelAr: 'عمان ← الزرقاء',
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
    labelAr: 'عمان ← جرش',
  },
  {
    routeId: 'irbid-ajloun',
    from: 'irbid',
    to: 'ajloun',
    label: 'Irbid -> Ajloun',
    labelAr: 'إربد ← إجلون',
  },
  {
    routeId: 'amman-madaba',
    from: 'amman',
    to: 'madaba',
    label: 'Amman -> Madaba',
    labelAr: 'عمان ← مادبا',
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
    labelAr: 'معان ← الإقبة',
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
    labelAr: 'عمان ← السلط',
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
    labelAr: 'إجلون ← جرش',
  },
] as const;

const CITY_ALIASES: Record<string, string> = {
  amman: 'amman',
  'amman governorate': 'amman',
  عمان: 'amman',
  aqaba: 'aqaba',
  الإقبة: 'aqaba',
  irbid: 'irbid',
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
  إجلون: 'ajloun',
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

function normalizeCity(value: string | null | undefined): string | null {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  if (!raw) return null;
  const normalized = raw.replace(/['']/g, '').replace(/\s+/g, ' ').replace(/-/g, ' ').trim();
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
  return ar ? `اعادة توجيه العرض باتجاه ${target}` : `Reposition supply toward ${target}`;
}

async function fetchMobilitySnapshot(ar: boolean): Promise<LiveMobilitySnapshot | null> {
  const rows = await fetchMobilityLiveRows();
  if (!rows) return null;

  const tripRows = rows.trips;
  if (tripRows.length === 0) return null;

  const bookingRows = rows.bookings;
  const packageRows = rows.packages;
  const presenceRows = rows.tripPresence;

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
      const snapshot = await fetchGoogleTrafficSnapshot(corridor.routeId, corridor.from, corridor.to);
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const next = await fetchMobilitySnapshot(ar);
        if (!cancelled) {
          setSnapshot(next);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void refresh();

    // Debounce: clear any pending refresh
    const scheduleRefresh = () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        void refresh();
      }, DEBOUNCE_MS);
    };

    unsubscribeRef.current = subscribeToMobilityLiveRows(ar ? 'ar' : 'en', scheduleRefresh, () => {
      console.error('MobilityOS realtime subscription error');
    });

    return () => {
      cancelled = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [ar]);

  return { snapshot, loading };
}

