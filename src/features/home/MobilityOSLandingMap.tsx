import { useEffect, useId, useMemo, useState } from 'react';
import {
  useMobilityOSLiveData,
  type LiveMobilityRouteSnapshot,
} from '../mobility-os/liveMobilityData';
import { allowSyntheticData } from '../../services/runtimePolicy';

type City = {
  id: string;
  label: string;
  labelAr: string;
  lat: number;
  lon: number;
  tier: 1 | 2 | 3;
  featured?: boolean;
};

type Corridor = {
  id: string;
  from: string;
  to: string;
  distanceKm: number;
  passengerFlow: number;
  packageFlow: number;
  density?: number;
  speedKph?: number;
  congestion?: number;
  highlighted?: boolean;
};

type Point = { x: number; y: number };

type FleetVehicle = {
  id: string;
  routeId: string;
  type: 'passenger' | 'package';
  progress: number;
  direction: 1 | -1;
  speedFactor: number;
  passengers?: number;
  seatCapacity?: number;
  packageCapacity?: number;
  packageLoad?: number;
};

type SvgIds = {
  clip: string;
  sky: string;
  stage: string;
  land: string;
  landEdge: string;
  ride: string;
  package: string;
  cityWash: string;
  scan: string;
};

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 560;
const FLOW_SPEED_SCALE = 0.42;
const PASSENGER_COLOR = '#F5EFE7';
const PASSENGER_GLOW = 'rgba(245, 239, 231, 0.34)';
const PACKAGE_COLOR = '#F59A2C';
const PACKAGE_GLOW = 'rgba(245, 154, 44, 0.3)';
const VEHICLE_COUNT = 28;
const TRAFFIC_FREE_SPEED_KPH = 120;
const TRAFFIC_JAM_DENSITY = 150;

const CITIES: readonly City[] = [
  {
    id: 'amman',
    label: 'Amman',
    labelAr: 'عمّان',
    lat: 31.9454,
    lon: 35.9284,
    tier: 1,
    featured: true,
  },
  { id: 'aqaba', label: 'Aqaba', labelAr: 'العقبة', lat: 29.532, lon: 35.0063, tier: 1 },
  { id: 'irbid', label: 'Irbid', labelAr: 'إربد', lat: 32.5556, lon: 35.85, tier: 1 },
  { id: 'zarqa', label: 'Zarqa', labelAr: 'الزرقاء', lat: 32.0728, lon: 36.088, tier: 1 },
  { id: 'mafraq', label: 'Mafraq', labelAr: 'المفرق', lat: 32.3406, lon: 36.208, tier: 2 },
  {
    id: 'jerash',
    label: 'Jerash',
    labelAr: 'جرش',
    lat: 32.2803,
    lon: 35.8993,
    tier: 2,
    featured: true,
  },
  { id: 'ajloun', label: 'Ajloun', labelAr: 'عجلون', lat: 32.3326, lon: 35.7519, tier: 2 },
  { id: 'salt', label: 'Salt', labelAr: 'السلط', lat: 32.0392, lon: 35.7272, tier: 2 },
  { id: 'madaba', label: 'Madaba', labelAr: 'مادبا', lat: 31.7197, lon: 35.7936, tier: 2 },
  { id: 'karak', label: 'Karak', labelAr: 'الكرك', lat: 31.1853, lon: 35.7048, tier: 2 },
  { id: 'tafila', label: 'Tafila', labelAr: 'الطفيلة', lat: 30.8375, lon: 35.6042, tier: 3 },
  { id: 'maan', label: "Ma'an", labelAr: 'معان', lat: 30.1962, lon: 35.736, tier: 3 },
] as const;

const DEFAULT_CORRIDORS: readonly Corridor[] = [
  {
    id: 'amman-aqaba',
    from: 'amman',
    to: 'aqaba',
    distanceKm: 335,
    passengerFlow: 88,
    packageFlow: 54,
    highlighted: true,
  },
  {
    id: 'amman-irbid',
    from: 'amman',
    to: 'irbid',
    distanceKm: 85,
    passengerFlow: 74,
    packageFlow: 32,
  },
  {
    id: 'amman-zarqa',
    from: 'amman',
    to: 'zarqa',
    distanceKm: 25,
    passengerFlow: 84,
    packageFlow: 40,
  },
  {
    id: 'zarqa-mafraq',
    from: 'zarqa',
    to: 'mafraq',
    distanceKm: 55,
    passengerFlow: 52,
    packageFlow: 38,
  },
  {
    id: 'amman-jerash',
    from: 'amman',
    to: 'jerash',
    distanceKm: 48,
    passengerFlow: 96,
    packageFlow: 34,
    highlighted: true,
  },
  {
    id: 'irbid-ajloun',
    from: 'irbid',
    to: 'ajloun',
    distanceKm: 30,
    passengerFlow: 42,
    packageFlow: 20,
  },
  {
    id: 'amman-madaba',
    from: 'amman',
    to: 'madaba',
    distanceKm: 33,
    passengerFlow: 55,
    packageFlow: 26,
  },
  {
    id: 'madaba-karak',
    from: 'madaba',
    to: 'karak',
    distanceKm: 111,
    passengerFlow: 48,
    packageFlow: 28,
  },
  {
    id: 'karak-tafila',
    from: 'karak',
    to: 'tafila',
    distanceKm: 74,
    passengerFlow: 36,
    packageFlow: 22,
  },
  {
    id: 'tafila-maan',
    from: 'tafila',
    to: 'maan',
    distanceKm: 89,
    passengerFlow: 32,
    packageFlow: 18,
  },
  {
    id: 'maan-aqaba',
    from: 'maan',
    to: 'aqaba',
    distanceKm: 114,
    passengerFlow: 44,
    packageFlow: 30,
  },
  {
    id: 'irbid-zarqa',
    from: 'irbid',
    to: 'zarqa',
    distanceKm: 79,
    passengerFlow: 46,
    packageFlow: 18,
  },
  {
    id: 'amman-salt',
    from: 'amman',
    to: 'salt',
    distanceKm: 32,
    passengerFlow: 40,
    packageFlow: 16,
  },
  {
    id: 'salt-jerash',
    from: 'salt',
    to: 'jerash',
    distanceKm: 38,
    passengerFlow: 26,
    packageFlow: 14,
  },
  {
    id: 'ajloun-jerash',
    from: 'ajloun',
    to: 'jerash',
    distanceKm: 24,
    passengerFlow: 24,
    packageFlow: 12,
  },
] as const;

const BORDER = [
  { lat: 33.37, lon: 35.55 },
  { lat: 32.58, lon: 36.42 },
  { lat: 31.24, lon: 37.12 },
  { lat: 29.62, lon: 36.22 },
  { lat: 29.2, lon: 35.03 },
  { lat: 31.2, lon: 35.5 },
  { lat: 32.56, lon: 35.55 },
] as const;

const STARFIELD = [
  { x: 112, y: 78, r: 1.6, opacity: 0.34 },
  { x: 178, y: 108, r: 1.1, opacity: 0.26 },
  { x: 268, y: 62, r: 1.4, opacity: 0.32 },
  { x: 334, y: 96, r: 1.2, opacity: 0.22 },
  { x: 446, y: 72, r: 1.5, opacity: 0.31 },
  { x: 528, y: 122, r: 1.2, opacity: 0.2 },
  { x: 596, y: 88, r: 1.9, opacity: 0.28 },
  { x: 622, y: 154, r: 1.2, opacity: 0.24 },
  { x: 654, y: 112, r: 1.1, opacity: 0.22 },
] as const;

const CITY_LABEL_POSITIONS: Record<string, { dx: number; dy: number; anchor: 'start' | 'end' }> = {
  amman: { dx: 18, dy: -20, anchor: 'start' },
  aqaba: { dx: -18, dy: -20, anchor: 'end' },
  irbid: { dx: 18, dy: -18, anchor: 'start' },
  zarqa: { dx: 16, dy: 24, anchor: 'start' },
  jerash: { dx: -18, dy: -22, anchor: 'end' },
  mafraq: { dx: -18, dy: -22, anchor: 'end' },
  karak: { dx: 16, dy: -20, anchor: 'start' },
};

const COPY = {
  en: {
    mapLabel: 'Jordan mobility simulation',
    passengerLegend: 'Ride flow',
    packageLegend: 'Package flow',
    networkLegend: 'Same Mobility OS routes',
    srDescription:
      'Animated mobility map of Jordan showing rides and packages moving across the same Wasel network corridors as Mobility OS.',
    heroEyebrow: 'Live orchestration layer',
    heroTitle: 'Jordan network twin',
    heroBody:
      'A cinematic landing map for Mobility OS showing live fleet signals, route pressure, and corridor reuse across the country.',
    telemetryTitle: 'Network pulse',
    topCorridor: 'Top corridor',
    dispatchAction: 'Dispatch action',
    utilization: 'Utilization',
    congestion: 'Congestion',
    activeFleet: 'Active fleet',
    avgSpeed: 'Avg speed',
    liveFeed: 'Live feed',
    previewMode: 'Preview mode',
    citiesMapped: 'cities mapped',
    corridorsSynced: 'corridors synced',
    freshPings: 'fresh pings',
    hotCorridors: 'Hot corridors',
    routeHealth: 'Route health',
    updated: 'Updated',
    awaitingSync: 'Awaiting sync',
    rideDetail: 'Network-wide ride pressure',
    packageDetail: 'Network-wide package pressure',
    movements: 'movements',
    dispatchFallback: 'Rebalance demand around Amman and fan spare capacity north.',
    overlayOne: 'Mobility OS live movement',
    overlayTwo: 'Rides and packages share the same corridors',
    overlayThree: 'Designed as a real-time landing twin',
    kmh: 'km/h',
  },
  ar: {
    mapLabel: 'محاكاة الحركة في الأردن',
    passengerLegend: 'حركة الرحلات',
    packageLegend: 'حركة الطرود',
    networkLegend: 'نفس مسارات Mobility OS',
    srDescription:
      'خريطة حركة متحركة للأردن تعرض الرحلات والطرود وهي تتحرك على نفس شبكة المسارات المستخدمة داخل Mobility OS.',
    heroEyebrow: 'طبقة تشغيل حية',
    heroTitle: 'التوأم الحي لشبكة الأردن',
    heroBody:
      'خريطة هبوط سينمائية لـ Mobility OS تعرض إشارات الأسطول الحية وضغط المسارات وإعادة استخدام الممرات على مستوى المملكة.',
    telemetryTitle: 'نبض الشبكة',
    topCorridor: 'المسار الأبرز',
    dispatchAction: 'إجراء تشغيلي',
    utilization: 'الاستغلال',
    congestion: 'الازدحام',
    activeFleet: 'الأسطول النشط',
    avgSpeed: 'متوسط السرعة',
    liveFeed: 'تغذية حية',
    previewMode: 'وضع المعاينة',
    citiesMapped: 'مدن على الخريطة',
    corridorsSynced: 'مسارات متزامنة',
    freshPings: 'إشارات حديثة',
    hotCorridors: 'المسارات الساخنة',
    routeHealth: 'صحة المسار',
    updated: 'آخر تحديث',
    awaitingSync: 'بانتظار التحديث',
    rideDetail: 'ضغط الرحلات على مستوى الشبكة',
    packageDetail: 'ضغط الطرود على مستوى الشبكة',
    movements: 'حركة',
    dispatchFallback: 'وازن الطلب حول عمّان وادفع السعة الاحتياطية نحو الشمال.',
    overlayOne: 'حركة Mobility OS الحية',
    overlayTwo: 'الرحلات والطرود على نفس الممرات',
    overlayThree: 'مصممة كتوأم هبوط حي',
    kmh: 'كم/س',
  },
} as const;

const LABELED_CITY_IDS = new Set(['amman', 'aqaba', 'irbid', 'zarqa', 'jerash', 'mafraq', 'karak']);
const CITY_LOOKUP = new Map(CITIES.map(city => [city.id, city] as const));

function mercator(lat: number) {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
}

const bounds = CITIES.reduce(
  (acc, city) => ({
    minLat: Math.min(acc.minLat, city.lat),
    maxLat: Math.max(acc.maxLat, city.lat),
    minLon: Math.min(acc.minLon, city.lon),
    maxLon: Math.max(acc.maxLon, city.lon),
  }),
  { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity },
);

function project(lat: number, lon: number): Point {
  const padX = VIEWBOX_WIDTH * 0.14;
  const padY = VIEWBOX_HEIGHT * 0.12;
  const x =
    padX +
    ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (VIEWBOX_WIDTH - padX * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y = padY + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (VIEWBOX_HEIGHT - padY * 2);
  return { x, y };
}

function getCurve(from: Point, to: Point, intensity: number, seed: number) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const direction = seed % 2 === 0 ? 1 : -1;
  const offset = Math.min(42, 12 + intensity * 10 + (seed % 5) * 2.4) * direction;

  return {
    x: (from.x + to.x) / 2 - (dy / length) * offset,
    y: (from.y + to.y) / 2 + (dx / length) * offset,
  };
}

function pointOnQuadratic(start: Point, control: Point, end: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function pathFor(start: Point, control: Point, end: Point) {
  return `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`;
}

function labelFor(city: City, ar: boolean) {
  return ar ? city.labelAr : city.label;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trafficDensityRatio(density: number) {
  return clamp(density / TRAFFIC_JAM_DENSITY, 0, 0.98);
}

function estimateDensity(passengerFlow: number, packageFlow: number, seed: number) {
  const directionalImbalance = Math.abs(passengerFlow - packageFlow) / 260;
  return 14 + passengerFlow / 118 + packageFlow / 244 + seed * 1.08 + directionalImbalance;
}

function estimateSpeedKph(density: number) {
  const densityRatio = trafficDensityRatio(density);
  const greenshieldsVelocity = TRAFFIC_FREE_SPEED_KPH * (1 - densityRatio);
  const shockwaveLoss = 1 - densityRatio ** 1.42 * 0.42;
  return Math.max(18, greenshieldsVelocity * shockwaveLoss);
}

function estimateCongestion(density: number) {
  const densityRatio = trafficDensityRatio(density);
  return clamp(0.08 + densityRatio ** 1.2 * 0.9, 0.08, 0.98);
}

function buildSyntheticFleet(corridors: readonly Corridor[]): FleetVehicle[] {
  const weightedCorridors = corridors.flatMap(corridor => {
    const corridorWeight = Math.max(
      1,
      Math.round((corridor.passengerFlow + corridor.packageFlow) / 36),
    );
    return Array.from({ length: corridorWeight }, () => corridor);
  });

  return Array.from({ length: VEHICLE_COUNT }, (_, index) => {
    const corridor =
      weightedCorridors[index % weightedCorridors.length] ?? corridors[index % corridors.length];
    const totalFlow = Math.max(corridor.passengerFlow + corridor.packageFlow, 1);
    const passengerShare = corridor.passengerFlow / totalFlow;
    const passenger = ((index * 17) % 10) / 10 < passengerShare;
    return {
      id: `landing-vehicle-${index}`,
      routeId: corridor.id,
      type: passenger ? 'passenger' : 'package',
      progress: (index * 0.137) % 1,
      direction: index % 4 === 0 ? -1 : 1,
      speedFactor: 0.82 + (index % 7) * 0.05,
      passengers: passenger ? 1 + (index % 4) : undefined,
      seatCapacity: passenger ? 4 : undefined,
      packageCapacity: passenger ? undefined : 14 + (index % 6),
      packageLoad: passenger ? undefined : 5 + (index % 5),
    };
  });
}

function mergeLiveRoute(
  route: Corridor,
  liveRoute: LiveMobilityRouteSnapshot | undefined,
  index: number,
): Corridor {
  const passengerFlow = Math.max(route.passengerFlow, liveRoute?.passengerFlow ?? 0);
  const packageFlow = Math.max(route.packageFlow, liveRoute?.packageFlow ?? 0);
  const density = liveRoute?.density ?? estimateDensity(passengerFlow, packageFlow, index);

  return {
    ...route,
    passengerFlow,
    packageFlow,
    density,
    speedKph: liveRoute?.speedKph ?? estimateSpeedKph(density),
    congestion: liveRoute?.congestion ?? estimateCongestion(density),
  };
}

function corridorLabel(
  corridor: Pick<Corridor, 'from' | 'to'> | { fromId?: string; toId?: string },
  ar: boolean,
) {
  const fromId = 'from' in corridor ? corridor.from : corridor.fromId;
  const toId = 'to' in corridor ? corridor.to : corridor.toId;
  const from = fromId ? CITY_LOOKUP.get(fromId) : undefined;
  const to = toId ? CITY_LOOKUP.get(toId) : undefined;
  if (!from || !to) {
    return ar ? 'ممر غير معروف' : 'Unknown corridor';
  }
  return `${labelFor(from, ar)} - ${labelFor(to, ar)}`;
}

function formatCompactNumber(value: number, ar: boolean) {
  return new Intl.NumberFormat(ar ? 'ar-JO' : 'en-US', {
    notation: value >= 1_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000 ? 1 : 0,
  }).format(Math.round(value));
}

function formatPercent(value: number, ar: boolean) {
  return `${new Intl.NumberFormat(ar ? 'ar-JO' : 'en-US', {
    maximumFractionDigits: 0,
  }).format(Math.round(clamp(value, 0, 1) * 100))}%`;
}

function formatSpeed(value: number, ar: boolean, unit: string) {
  return `${new Intl.NumberFormat(ar ? 'ar-JO' : 'en-US', {
    maximumFractionDigits: value < 40 ? 1 : 0,
  }).format(Number.isFinite(value) ? value : 0)} ${unit}`;
}

function formatUpdateTime(value: string | null | undefined, ar: boolean, fallback: string) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat(ar ? 'ar-JO' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function estimateLabelWidth(label: string, fontSize: number) {
  return label.length * fontSize * 0.62 + 18;
}

function corridorPriority(
  corridor: Pick<Corridor, 'passengerFlow' | 'packageFlow' | 'congestion' | 'highlighted'>,
) {
  return (
    corridor.passengerFlow +
    corridor.packageFlow +
    (corridor.congestion ?? 0) * 48 +
    (corridor.highlighted ? 24 : 0)
  );
}

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

export function MobilityOSLandingMap({ ar = false }: { ar?: boolean }) {
  const { snapshot } = useMobilityOSLiveData(ar);
  const [phase, setPhase] = useState(0);
  const copy = ar ? COPY.ar : COPY.en;
  const idSeed = useId().replace(/:/g, '');

  const ids = useMemo<SvgIds>(
    () => ({
      clip: `${idSeed}-landing-clip`,
      sky: `${idSeed}-landing-sky`,
      stage: `${idSeed}-landing-stage`,
      land: `${idSeed}-landing-land`,
      landEdge: `${idSeed}-landing-land-edge`,
      ride: `${idSeed}-landing-ride`,
      package: `${idSeed}-landing-package`,
      cityWash: `${idSeed}-landing-city-wash`,
      scan: `${idSeed}-landing-scan`,
    }),
    [idSeed],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return undefined;

    let frameId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      setPhase(now - start);
      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, []);

  const cityPoints = useMemo(
    () =>
      CITIES.map(city => ({
        ...city,
        point: project(city.lat, city.lon),
      })),
    [],
  );

  const cityMap = useMemo(
    () => new Map(cityPoints.map(city => [city.id, city] as const)),
    [cityPoints],
  );

  const liveRouteMap = useMemo(
    () => new Map((snapshot?.routes ?? []).map(route => [route.routeId, route] as const)),
    [snapshot?.routes],
  );

  const corridors = useMemo(
    () =>
      DEFAULT_CORRIDORS.map((route, index) =>
        mergeLiveRoute(route, liveRouteMap.get(route.id), index),
      ),
    [liveRouteMap],
  );

  const borderPath = useMemo(
    () =>
      BORDER.map((point, index) => {
        const projected = project(point.lat, point.lon);
        return `${index === 0 ? 'M' : 'L'} ${projected.x} ${projected.y}`;
      }).join(' '),
    [],
  );

  const corridorGeometry = useMemo(
    () =>
      corridors.map((corridor, index) => {
        const from = cityMap.get(corridor.from)?.point ?? { x: 0, y: 0 };
        const to = cityMap.get(corridor.to)?.point ?? { x: 0, y: 0 };
        const intensity = (corridor.passengerFlow + corridor.packageFlow) / 120;
        const control = getCurve(from, to, intensity, index + 2);
        return {
          ...corridor,
          fromId: corridor.from,
          toId: corridor.to,
          from,
          to,
          control,
          path: pathFor(from, control, to),
        };
      }),
    [cityMap, corridors],
  );

  const geometryMap = useMemo(
    () => new Map(corridorGeometry.map(corridor => [corridor.id, corridor] as const)),
    [corridorGeometry],
  );

  const syntheticFleet = useMemo(
    () => (allowSyntheticData() ? buildSyntheticFleet(corridors) : []),
    [corridors],
  );

  const vehicles = useMemo(() => {
    const liveVehicles = (snapshot?.vehicles ?? []).filter(vehicle =>
      geometryMap.has(vehicle.routeId),
    );
    const syntheticBackfillCount = Math.max(0, VEHICLE_COUNT - liveVehicles.length);
    const syntheticVehicles = syntheticFleet.slice(0, syntheticBackfillCount);
    return { liveVehicles, syntheticVehicles };
  }, [geometryMap, snapshot?.vehicles, syntheticFleet]);

  const passengerParticles = useMemo(
    () =>
      corridorGeometry.flatMap(corridor => {
        const count = Math.max(1, Math.round(corridor.passengerFlow / 18));
        return Array.from({ length: count }, (_, index) => {
          const travelRate =
            ((corridor.speedKph ?? 48) / Math.max(corridor.distanceKm, 1)) *
            FLOW_SPEED_SCALE *
            0.0038 *
            (1.04 + index * 0.05);
          const t = (phase * travelRate + index / count) % 1;
          return {
            id: `${corridor.id}-ride-${index}`,
            point: pointOnQuadratic(corridor.from, corridor.control, corridor.to, t),
            radius: corridor.highlighted ? 3.2 : 2.4,
          };
        });
      }),
    [corridorGeometry, phase],
  );

  const packageParticles = useMemo(
    () =>
      corridorGeometry.flatMap(corridor => {
        const count = Math.max(1, Math.round(corridor.packageFlow / 12));
        return Array.from({ length: count }, (_, index) => {
          const travelRate =
            ((corridor.speedKph ?? 42) / Math.max(corridor.distanceKm, 1)) *
            FLOW_SPEED_SCALE *
            0.0028 *
            (0.96 + index * 0.04);
          const t = 1 - ((phase * travelRate + index / count) % 1);
          return {
            id: `${corridor.id}-pkg-${index}`,
            point: pointOnQuadratic(corridor.from, corridor.control, corridor.to, t),
            size: corridor.highlighted ? 5 : 4,
          };
        });
      }),
    [corridorGeometry, phase],
  );

  const syntheticVehicleMarkers = useMemo(
    () =>
      vehicles.syntheticVehicles
        .map(vehicle => {
          const corridor = geometryMap.get(vehicle.routeId);
          if (!corridor) return null;
          const rawTravel =
            (phase *
              ((corridor.speedKph ?? 48) / Math.max(corridor.distanceKm, 1)) *
              0.017 *
              FLOW_SPEED_SCALE *
              vehicle.speedFactor +
              vehicle.progress) %
            1;
          const t = vehicle.direction === 1 ? rawTravel : 1 - rawTravel;
          return {
            id: vehicle.id,
            type: vehicle.type,
            point: pointOnQuadratic(corridor.from, corridor.control, corridor.to, t),
          };
        })
        .filter(
          (vehicle): vehicle is { id: string; type: 'passenger' | 'package'; point: Point } =>
            vehicle !== null,
        ),
    [geometryMap, phase, vehicles.syntheticVehicles],
  );

  const liveVehicleMarkers = useMemo(
    () =>
      vehicles.liveVehicles.map(vehicle => {
        const corridor = geometryMap.get(vehicle.routeId);
        const point = project(vehicle.lat, vehicle.lng);
        const fallbackAngle = corridor
          ? Math.atan2(corridor.to.y - corridor.from.y, corridor.to.x - corridor.from.x)
          : 0;
        return {
          id: vehicle.id,
          type: vehicle.type,
          point,
          fresh: vehicle.fresh,
          angle: fallbackAngle,
        };
      }),
    [geometryMap, vehicles.liveVehicles],
  );

  const scanPoint = useMemo(
    () =>
      pointOnQuadratic(
        { x: 144, y: 112 },
        { x: 584, y: 128 },
        { x: 512, y: 430 },
        (phase * 0.000045) % 1,
      ),
    [phase],
  );

  const freshLiveCount = useMemo(
    () => liveVehicleMarkers.filter(vehicle => vehicle.fresh).length,
    [liveVehicleMarkers],
  );

  const corridorHighlights = useMemo(() => {
    const maxPassenger = Math.max(...corridorGeometry.map(corridor => corridor.passengerFlow), 1);
    const maxPackage = Math.max(...corridorGeometry.map(corridor => corridor.packageFlow), 1);

    return corridorGeometry
      .slice()
      .sort((a, b) => corridorPriority(b) - corridorPriority(a))
      .slice(0, 3)
      .map(corridor => ({
        id: corridor.id,
        name: corridorLabel(corridor, ar),
        total: formatCompactNumber(corridor.passengerFlow + corridor.packageFlow, ar),
        speed: formatSpeed(corridor.speedKph ?? 0, ar, copy.kmh),
        congestion: formatPercent(corridor.congestion ?? 0, ar),
        passengerWidth: `${clamp((corridor.passengerFlow / maxPassenger) * 100, 18, 100)}%`,
        packageWidth: `${clamp((corridor.packageFlow / maxPackage) * 100, 14, 100)}%`,
      }));
  }, [ar, copy.kmh, corridorGeometry]);

  const dashboard = useMemo(() => {
    const routeCount = corridorGeometry.length;
    const passengerLoad = corridorGeometry.reduce(
      (sum, corridor) => sum + corridor.passengerFlow,
      0,
    );
    const packageLoad = corridorGeometry.reduce((sum, corridor) => sum + corridor.packageFlow, 0);
    const avgSpeed =
      snapshot?.analytics.avgSpeed ??
      corridorGeometry.reduce((sum, corridor) => sum + (corridor.speedKph ?? 0), 0) /
        Math.max(routeCount, 1);
    const activeFleet =
      snapshot?.analytics.totalVehicles ??
      vehicles.liveVehicles.length + vehicles.syntheticVehicles.length;
    const networkUtilization =
      snapshot?.analytics.networkUtilization ?? clamp(activeFleet / 24, 0.06, 0.98);
    const congestion =
      snapshot?.analytics.congestionLevel ??
      corridorGeometry.reduce((sum, corridor) => sum + (corridor.congestion ?? 0), 0) /
        Math.max(routeCount, 1);

    return {
      activeFleet,
      activePassengers: snapshot?.analytics.activePassengers ?? passengerLoad,
      activePackages: snapshot?.analytics.activePackages ?? packageLoad,
      avgSpeed,
      networkUtilization,
      congestion,
      liveCorridors: snapshot?.traffic.liveCorridors ?? routeCount,
      topCorridor:
        snapshot?.analytics.topCorridor || corridorHighlights[0]?.name || copy.awaitingSync,
      dispatchAction: snapshot?.analytics.dispatchAction || copy.dispatchFallback,
      updatedAt: snapshot?.telemetry.latestHeartbeatAt ?? snapshot?.updatedAt ?? null,
      hasRenderableLocations: Boolean(
        snapshot?.telemetry.hasRenderableLocations ||
        snapshot?.routes.length ||
        snapshot?.vehicles.length,
      ),
    };
  }, [
    corridorGeometry,
    corridorHighlights,
    copy.awaitingSync,
    copy.dispatchFallback,
    snapshot?.analytics.activePackages,
    snapshot?.analytics.activePassengers,
    snapshot?.analytics.avgSpeed,
    snapshot?.analytics.congestionLevel,
    snapshot?.analytics.dispatchAction,
    snapshot?.analytics.networkUtilization,
    snapshot?.analytics.topCorridor,
    snapshot?.analytics.totalVehicles,
    snapshot?.routes.length,
    snapshot?.telemetry.hasRenderableLocations,
    snapshot?.telemetry.latestHeartbeatAt,
    snapshot?.traffic.liveCorridors,
    snapshot?.updatedAt,
    snapshot?.vehicles.length,
    vehicles.liveVehicles.length,
    vehicles.syntheticVehicles.length,
  ]);

  const updatedAtLabel = useMemo(
    () => formatUpdateTime(dashboard.updatedAt, ar, copy.awaitingSync),
    [ar, copy.awaitingSync, dashboard.updatedAt],
  );

  const overlayLabels = ar
    ? [copy.overlayOne, copy.overlayTwo, copy.overlayThree]
    : [copy.overlayOne, copy.overlayTwo, copy.overlayThree];

  const statusTags = useMemo(
    () => [
      dashboard.hasRenderableLocations ? copy.liveFeed : copy.previewMode,
      `${formatCompactNumber(dashboard.liveCorridors, ar)} ${copy.corridorsSynced}`,
      `${formatCompactNumber(CITIES.length, ar)} ${copy.citiesMapped}`,
    ],
    [
      ar,
      copy.citiesMapped,
      copy.corridorsSynced,
      copy.liveFeed,
      copy.previewMode,
      dashboard.hasRenderableLocations,
      dashboard.liveCorridors,
    ],
  );

  const summaryCards = useMemo(
    () => [
      {
        id: 'fleet',
        label: copy.activeFleet,
        value: formatCompactNumber(dashboard.activeFleet, ar),
        detail: `${formatCompactNumber(freshLiveCount, ar)} ${copy.freshPings}`,
        accent: 'rgba(101, 225, 255, 0.22)',
        glow: 'rgba(101, 225, 255, 0.18)',
      },
      {
        id: 'speed',
        label: copy.avgSpeed,
        value: formatSpeed(dashboard.avgSpeed, ar, copy.kmh),
        detail: `${copy.topCorridor}: ${dashboard.topCorridor}`,
        accent: 'rgba(255, 179, 87, 0.22)',
        glow: 'rgba(245, 154, 44, 0.18)',
      },
      {
        id: 'rides',
        label: copy.passengerLegend,
        value: formatCompactNumber(dashboard.activePassengers, ar),
        detail: copy.rideDetail,
        accent: 'rgba(245, 239, 231, 0.18)',
        glow: 'rgba(245, 239, 231, 0.14)',
      },
      {
        id: 'packages',
        label: copy.packageLegend,
        value: formatCompactNumber(dashboard.activePackages, ar),
        detail: copy.packageDetail,
        accent: 'rgba(245, 154, 44, 0.2)',
        glow: 'rgba(245, 154, 44, 0.18)',
      },
    ],
    [
      ar,
      copy.activeFleet,
      copy.avgSpeed,
      copy.freshPings,
      copy.kmh,
      copy.packageDetail,
      copy.packageLegend,
      copy.passengerLegend,
      copy.rideDetail,
      copy.topCorridor,
      dashboard.activeFleet,
      dashboard.activePackages,
      dashboard.activePassengers,
      dashboard.avgSpeed,
      dashboard.topCorridor,
      freshLiveCount,
    ],
  );

  const utilizationWidth = `${Math.round(dashboard.networkUtilization * 100)}%`;
  const congestionWidth = `${Math.round(dashboard.congestion * 100)}%`;

  return (
    <figure
      aria-label={copy.mapLabel}
      style={{
        margin: 0,
        direction: ar ? 'rtl' : 'ltr',
      }}
    >
      <style>{`
        .landing-sim-shell {
          position: relative;
          min-height: clamp(440px, 60vw, 720px);
          border-radius: 34px;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid color-mix(in srgb, var(--wasel-service-border-strong) 88%, rgba(99, 218, 255, 0.24));
          background:
            radial-gradient(circle at 14% 14%, rgba(94, 229, 255, 0.16), transparent 28%),
            radial-gradient(circle at 86% 14%, rgba(245, 154, 44, 0.14), transparent 24%),
            radial-gradient(circle at 72% 82%, rgba(128, 222, 171, 0.09), transparent 22%),
            linear-gradient(180deg, rgba(6, 16, 28, 0.98) 0%, rgba(4, 10, 18, 0.99) 52%, rgba(3, 8, 15, 1) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 28px 80px rgba(2, 6, 15, 0.38),
            var(--wasel-shadow-xl);
        }
        .landing-sim-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 44px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 44px),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          opacity: 0.45;
          pointer-events: none;
        }
        .landing-sim-shell::after {
          content: '';
          position: absolute;
          inset: 10px;
          border-radius: 26px;
          border: 1px solid rgba(153, 237, 255, 0.12);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.025),
            inset 0 24px 80px rgba(119, 229, 255, 0.03);
          pointer-events: none;
        }
        .landing-sim-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .landing-sim-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          padding: 22px;
          z-index: 1;
          pointer-events: none;
        }
        .landing-sim-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }
        .landing-sim-bottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }
        .landing-sim-panel {
          pointer-events: auto;
          border-radius: 24px;
          border: 1px solid rgba(162, 232, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(8, 17, 30, 0.88), rgba(6, 12, 22, 0.76)),
            radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 48%);
          backdrop-filter: blur(18px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 24px 60px rgba(3, 8, 15, 0.24);
        }
        .landing-sim-title-panel {
          max-width: min(460px, 100%);
          padding: 20px 22px;
        }
        .landing-sim-telemetry-panel {
          width: min(360px, 100%);
          padding: 18px 20px 20px;
        }
        .landing-sim-overline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(96, 230, 255, 0.12);
          border: 1px solid rgba(96, 230, 255, 0.18);
          color: rgba(220, 247, 255, 0.9);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .landing-sim-overline-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #71f5d0;
          box-shadow: 0 0 14px rgba(113, 245, 208, 0.72);
        }
        .landing-sim-title {
          margin: 14px 0 0;
          color: #f7fcff;
          font-size: clamp(1.6rem, 1.3rem + 1vw, 2.4rem);
          line-height: 1.02;
          letter-spacing: -0.045em;
          font-weight: 800;
        }
        .landing-sim-body {
          margin: 10px 0 0;
          color: rgba(218, 238, 248, 0.82);
          font-size: 0.98rem;
          line-height: 1.55;
          max-width: 38rem;
        }
        .landing-sim-meta-row,
        .landing-sim-tag-row,
        .landing-sim-status-row,
        .landing-sim-legend-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .landing-sim-meta-row {
          margin-top: 16px;
        }
        .landing-sim-tag-row {
          margin-top: 14px;
        }
        .landing-sim-legend-row {
          margin-top: 16px;
        }
        .landing-sim-kv,
        .landing-sim-tag,
        .landing-sim-status-chip,
        .landing-sim-legend-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(6, 12, 22, 0.54);
          color: rgba(223, 241, 249, 0.84);
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1;
        }
        .landing-sim-kv strong {
          color: #f7fcff;
          font-weight: 700;
        }
        .landing-sim-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex: 0 0 auto;
        }
        .landing-sim-legend-line {
          width: 16px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(247,252,255,0.92), rgba(245,154,44,0.88));
        }
        .landing-sim-telemetry-title {
          margin: 0;
          color: rgba(189, 230, 246, 0.76);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .landing-sim-telemetry-value {
          margin: 10px 0 0;
          color: #f7fcff;
          font-size: clamp(1.2rem, 1rem + 0.55vw, 1.55rem);
          line-height: 1.16;
          letter-spacing: -0.03em;
          font-weight: 780;
        }
        .landing-sim-telemetry-copy {
          margin: 10px 0 0;
          color: rgba(221, 237, 244, 0.74);
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .landing-sim-meter-group {
          margin-top: 16px;
          display: grid;
          gap: 12px;
        }
        .landing-sim-meter-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: rgba(227, 240, 247, 0.82);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .landing-sim-meter {
          position: relative;
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.18);
        }
        .landing-sim-meter-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
        }
        .landing-sim-stat-grid {
          flex: 1 1 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .landing-sim-stat-card {
          min-width: 0;
          padding: 16px 18px;
        }
        .landing-sim-stat-label {
          color: rgba(182, 221, 235, 0.72);
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .landing-sim-stat-value {
          margin-top: 10px;
          color: #f7fcff;
          font-size: clamp(1.1rem, 0.94rem + 0.45vw, 1.52rem);
          line-height: 1.1;
          font-weight: 780;
          letter-spacing: -0.03em;
        }
        .landing-sim-stat-detail {
          margin-top: 8px;
          color: rgba(221, 237, 244, 0.7);
          font-size: 0.82rem;
          line-height: 1.45;
        }
        .landing-sim-hotspots {
          width: min(356px, 100%);
          padding: 18px 18px 20px;
        }
        .landing-sim-hotspots-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .landing-sim-hotspots-title {
          margin: 0;
          color: #f7fcff;
          font-size: 1rem;
          font-weight: 760;
          letter-spacing: -0.02em;
        }
        .landing-sim-hotspot-list {
          display: grid;
          gap: 12px;
        }
        .landing-sim-hotspot-item {
          padding: 14px 14px 12px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(5, 11, 21, 0.46);
        }
        .landing-sim-hotspot-head,
        .landing-sim-hotspot-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .landing-sim-hotspot-head {
          color: #f7fcff;
          font-size: 0.88rem;
          font-weight: 700;
        }
        .landing-sim-hotspot-total {
          color: rgba(255, 214, 167, 0.92);
          font-size: 0.84rem;
          font-weight: 700;
        }
        .landing-sim-track-stack {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }
        .landing-sim-track {
          position: relative;
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.06);
        }
        .landing-sim-track > span {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
        }
        .landing-sim-hotspot-foot {
          margin-top: 10px;
          color: rgba(211, 234, 243, 0.72);
          font-size: 0.76rem;
          font-weight: 600;
        }
        @media (max-width: 1080px) {
          .landing-sim-top,
          .landing-sim-bottom {
            flex-direction: column;
            align-items: stretch;
          }
          .landing-sim-title-panel,
          .landing-sim-telemetry-panel,
          .landing-sim-hotspots {
            width: auto;
            max-width: none;
          }
        }
        @media (max-width: 720px) {
          .landing-sim-shell {
            min-height: clamp(540px, 122vw, 860px);
          }
          .landing-sim-overlay {
            padding: 18px;
            gap: 16px;
          }
          .landing-sim-stat-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 560px) {
          .landing-sim-shell {
            border-radius: 28px;
          }
          .landing-sim-stat-grid {
            grid-template-columns: 1fr;
          }
          .landing-sim-title-panel,
          .landing-sim-telemetry-panel,
          .landing-sim-hotspots {
            padding-inline: 16px;
          }
        }
      `}</style>

      <div className="landing-sim-shell">
        <span
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {copy.srDescription}
        </span>

        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          role="img"
          aria-hidden="true"
          className="landing-sim-svg"
        >
          <defs>
            <linearGradient
              id={ids.sky}
              x1="360"
              y1="0"
              x2="360"
              y2="560"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="rgba(10, 22, 38, 1)" />
              <stop offset="0.44" stopColor="rgba(6, 15, 28, 1)" />
              <stop offset="1" stopColor="rgba(2, 8, 16, 1)" />
            </linearGradient>
            <linearGradient
              id={ids.stage}
              x1="360"
              y1="388"
              x2="360"
              y2="560"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="rgba(14, 29, 45, 0.94)" />
              <stop offset="1" stopColor="rgba(3, 8, 15, 1)" />
            </linearGradient>
            <linearGradient
              id={ids.land}
              x1="186"
              y1="78"
              x2="530"
              y2="510"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="rgba(18, 44, 62, 0.98)" />
              <stop offset="0.44" stopColor="rgba(10, 28, 42, 0.98)" />
              <stop offset="0.76" stopColor="rgba(7, 19, 32, 0.98)" />
              <stop offset="1" stopColor="rgba(4, 12, 22, 0.99)" />
            </linearGradient>
            <linearGradient
              id={ids.landEdge}
              x1="168"
              y1="112"
              x2="558"
              y2="458"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="rgba(176, 235, 255, 0.32)" />
              <stop offset="0.52" stopColor="rgba(102, 208, 255, 0.12)" />
              <stop offset="1" stopColor="rgba(255, 182, 96, 0.22)" />
            </linearGradient>
            <linearGradient
              id={ids.ride}
              x1="92"
              y1="502"
              x2="548"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#F7FCFF" />
              <stop offset="0.52" stopColor={PASSENGER_COLOR} />
              <stop offset="1" stopColor="#8EE8FF" />
            </linearGradient>
            <linearGradient
              id={ids.package}
              x1="118"
              y1="520"
              x2="584"
              y2="112"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#FFB357" />
              <stop offset="0.46" stopColor={PACKAGE_COLOR} />
              <stop offset="1" stopColor="#FFE8BC" />
            </linearGradient>
            <radialGradient
              id={ids.cityWash}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(366 278) rotate(90) scale(228 270)"
            >
              <stop stopColor="rgba(193, 248, 255, 0.13)" />
              <stop offset="0.62" stopColor="rgba(120, 225, 255, 0.06)" />
              <stop offset="1" stopColor="rgba(120, 225, 255, 0)" />
            </radialGradient>
            <radialGradient
              id={ids.scan}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(0.5 0.5) scale(0.5)"
            >
              <stop stopColor="rgba(137, 232, 255, 0.26)" />
              <stop offset="0.5" stopColor="rgba(137, 232, 255, 0.12)" />
              <stop offset="1" stopColor="rgba(137, 232, 255, 0)" />
            </radialGradient>
            <clipPath id={ids.clip}>
              <path d={borderPath} />
            </clipPath>
          </defs>

          <rect
            x="0"
            y="0"
            width={VIEWBOX_WIDTH}
            height={VIEWBOX_HEIGHT}
            fill={`url(#${ids.sky})`}
          />

          {STARFIELD.map(star => (
            <circle
              key={`${star.x}-${star.y}`}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="rgba(244, 251, 255, 0.94)"
              opacity={star.opacity}
            />
          ))}

          <path d="M 34 396 L 686 396 L 720 560 L 0 560 Z" fill={`url(#${ids.stage})`} />
          {Array.from({ length: 10 }, (_, index) => {
            const y = 396 + ((index + 1) / 11) ** 1.75 * 148;
            const inset = 34 + index * 8.5;
            return (
              <path
                key={`landing-floor-row-${index}`}
                d={`M ${inset} ${y} L ${VIEWBOX_WIDTH - inset} ${y}`}
                stroke="rgba(220, 255, 248, 0.055)"
                strokeWidth="1"
              />
            );
          })}
          {Array.from({ length: 12 }, (_, index) => {
            const x = 44 + index * 53.5;
            const topX = 222 + (index - 5.5) * 17;
            return (
              <path
                key={`landing-floor-col-${index}`}
                d={`M ${x} 560 L ${topX} 396`}
                stroke="rgba(101, 225, 255, 0.045)"
                strokeWidth="1"
              />
            );
          })}

          <path
            d={borderPath}
            fill="rgba(0, 0, 0, 0.18)"
            transform="translate(20 30) scale(1 0.964)"
            opacity="0.78"
          />
          <path
            d={borderPath}
            fill={`url(#${ids.land})`}
            stroke={`url(#${ids.landEdge})`}
            strokeWidth="1.7"
          />
          <path
            d={borderPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="13"
            opacity="0.18"
            transform="translate(7 10)"
          />

          <g clipPath={`url(#${ids.clip})`}>
            <rect
              x="0"
              y="0"
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
              fill={`url(#${ids.cityWash})`}
            />
            <ellipse
              cx={scanPoint.x}
              cy={scanPoint.y}
              rx="118"
              ry="88"
              fill={`url(#${ids.scan})`}
              opacity={0.54 + Math.sin(phase * 0.0021) * 0.08}
            />

            {Array.from({ length: 7 }, (_, index) => {
              const y = 118 + index * 48;
              return (
                <path
                  key={`landing-contour-${index}`}
                  d={`M 104 ${y} C 192 ${y - 26}, 286 ${y + 16}, 388 ${y - 12} S 556 ${y + 18}, 628 ${y - 6}`}
                  stroke="rgba(234, 248, 255, 0.05)"
                  strokeWidth={index % 2 === 0 ? 1 : 0.8}
                  fill="none"
                  opacity={0.68 - index * 0.06}
                />
              );
            })}

            <path
              d="M 128 116 C 236 92, 356 128, 472 118 C 536 112, 592 122, 644 142 L 644 228 C 556 210, 462 220, 350 212 C 240 204, 178 188, 128 168 Z"
              fill="rgba(126, 233, 255, 0.05)"
            />
            <path
              d="M 148 248 C 238 224, 318 248, 408 238 C 500 228, 568 238, 630 272 L 630 346 C 546 316, 458 326, 344 320 C 242 314, 178 292, 148 274 Z"
              fill="rgba(245, 154, 44, 0.04)"
            />
            <path d="M 184 152 L 222 446" stroke="rgba(101, 225, 255, 0.05)" strokeWidth="1" />
            <path d="M 266 96 L 316 438" stroke="rgba(101, 225, 255, 0.05)" strokeWidth="1" />
            <path d="M 358 88 L 414 452" stroke="rgba(101, 225, 255, 0.05)" strokeWidth="1" />
            <path d="M 462 118 L 520 438" stroke="rgba(101, 225, 255, 0.05)" strokeWidth="1" />
          </g>

          {corridorGeometry.map(corridor => {
            const congestion = corridor.congestion ?? 0.12;
            const highlightedWidth = corridor.highlighted ? 1.4 : 0;
            const baseWidth = 3.1 + congestion * 1.1 + highlightedWidth;
            const auraWidth = 11 + congestion * 5 + highlightedWidth * 2;
            const trafficWidth = 6.6 + congestion * 2.4;

            return (
              <g key={`${corridor.id}-route`}>
                <path
                  d={corridor.path}
                  fill="none"
                  stroke="rgba(0, 0, 0, 0.18)"
                  strokeWidth={auraWidth + 2}
                  strokeLinecap="round"
                  transform="translate(8 12)"
                />
                <path
                  d={corridor.path}
                  fill="none"
                  stroke={`rgba(245, 154, 44, ${0.08 + congestion * 0.22})`}
                  strokeWidth={trafficWidth}
                  strokeLinecap="round"
                />
                <path
                  d={corridor.path}
                  fill="none"
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={auraWidth}
                  strokeLinecap="round"
                />
                <path
                  d={corridor.path}
                  fill="none"
                  stroke={`url(#${ids.ride})`}
                  strokeWidth={baseWidth}
                  strokeLinecap="round"
                  opacity={corridor.highlighted ? 1 : 0.88}
                  style={{
                    filter: corridor.highlighted
                      ? 'drop-shadow(0 0 16px rgba(111, 228, 255, 0.34))'
                      : 'drop-shadow(0 0 8px rgba(111, 228, 255, 0.14))',
                  }}
                />
                <path
                  d={corridor.path}
                  fill="none"
                  stroke={`url(#${ids.package})`}
                  strokeWidth={2.1 + highlightedWidth}
                  strokeLinecap="round"
                  strokeDasharray={`${8 + corridor.packageFlow / 18} ${8 + congestion * 18}`}
                  strokeDashoffset={-(phase * 0.018 * (1 + congestion))}
                  opacity={corridor.highlighted ? 0.94 : 0.8}
                />
              </g>
            );
          })}

          {passengerParticles.map(particle => (
            <circle
              key={particle.id}
              cx={particle.point.x}
              cy={particle.point.y}
              r={particle.radius}
              fill="#F7FCFF"
              style={{ filter: `drop-shadow(0 0 8px ${PASSENGER_GLOW})` }}
            />
          ))}

          {packageParticles.map(particle => (
            <rect
              key={particle.id}
              x={particle.point.x - particle.size / 2}
              y={particle.point.y - particle.size / 2}
              width={particle.size}
              height={particle.size}
              rx="1.4"
              fill={PACKAGE_COLOR}
              style={{ filter: `drop-shadow(0 0 8px ${PACKAGE_GLOW})` }}
              transform={`rotate(45 ${particle.point.x} ${particle.point.y})`}
            />
          ))}

          {syntheticVehicleMarkers.map(vehicle =>
            vehicle.type === 'passenger' ? (
              <circle
                key={vehicle.id}
                cx={vehicle.point.x}
                cy={vehicle.point.y}
                r="4.7"
                fill="#F7FCFF"
                opacity="0.92"
                style={{ filter: `drop-shadow(0 0 10px ${PASSENGER_GLOW})` }}
              />
            ) : (
              <rect
                key={vehicle.id}
                x={vehicle.point.x - 3.4}
                y={vehicle.point.y - 3.4}
                width="6.8"
                height="6.8"
                rx="1.8"
                fill="#F7FCFF"
                opacity="0.9"
                style={{ filter: `drop-shadow(0 0 10px ${PACKAGE_GLOW})` }}
                transform={`rotate(45 ${vehicle.point.x} ${vehicle.point.y})`}
              />
            ),
          )}

          {liveVehicleMarkers.map(vehicle => {
            const angle = radiansToDegrees(vehicle.angle);
            const accent =
              vehicle.type === 'passenger'
                ? 'rgba(247, 252, 255, 0.96)'
                : 'rgba(255, 202, 122, 0.96)';

            return (
              <g key={vehicle.id} transform={`translate(${vehicle.point.x} ${vehicle.point.y})`}>
                <circle
                  r={vehicle.fresh ? 11 : 9.5}
                  fill="none"
                  stroke={vehicle.fresh ? 'rgba(171, 236, 255, 0.82)' : 'rgba(255,179,87,0.52)'}
                  strokeWidth="1.3"
                  opacity={vehicle.fresh ? 0.96 : 0.72}
                />
                <g transform={`rotate(${angle})`}>
                  <path
                    d="M -5.4 -2.6 L 7.4 0 L -5.4 2.6 Z"
                    fill={accent}
                    opacity={vehicle.fresh ? 0.94 : 0.74}
                  />
                  {vehicle.type === 'passenger' ? (
                    <circle
                      r={vehicle.fresh ? 5.1 : 4.5}
                      fill="#FFFFFF"
                      opacity={vehicle.fresh ? 1 : 0.78}
                      style={{ filter: `drop-shadow(0 0 12px ${PASSENGER_GLOW})` }}
                    />
                  ) : (
                    <rect
                      x={-3.9}
                      y={-3.9}
                      width="7.8"
                      height="7.8"
                      rx="1.8"
                      fill="#F7FCFF"
                      opacity={vehicle.fresh ? 1 : 0.78}
                      style={{ filter: `drop-shadow(0 0 12px ${PACKAGE_GLOW})` }}
                      transform="rotate(45)"
                    />
                  )}
                </g>
              </g>
            );
          })}

          {cityPoints.map((city, index) => {
            const label = labelFor(city, ar);
            const labelConfig = CITY_LABEL_POSITIONS[city.id];
            const fontSize = city.featured ? 14.2 : 12.8;
            const pulseRadius = city.featured
              ? 18 + ((Math.sin(phase * 0.0022 + index) + 1) / 2) * 8
              : 0;

            return (
              <g key={city.id}>
                <ellipse
                  cx={city.point.x + 7}
                  cy={city.point.y + 18}
                  rx={city.featured ? 20 : 14}
                  ry={city.featured ? 6 : 4.8}
                  fill="rgba(0, 0, 0, 0.22)"
                />
                {city.featured ? (
                  <>
                    <circle
                      cx={city.point.x}
                      cy={city.point.y}
                      r="28"
                      fill="rgba(169, 227, 255, 0.1)"
                    />
                    <circle
                      cx={city.point.x}
                      cy={city.point.y}
                      r={pulseRadius}
                      fill="none"
                      stroke="rgba(126, 233, 255, 0.22)"
                      strokeWidth="1.1"
                    />
                  </>
                ) : null}
                <line
                  x1={city.point.x}
                  y1={city.point.y - (city.featured ? 28 : 22)}
                  x2={city.point.x}
                  y2={city.point.y - 5}
                  stroke={city.featured ? 'rgba(169, 227, 255, 0.42)' : 'rgba(247, 252, 255, 0.16)'}
                  strokeWidth={city.featured ? 1.8 : 1.2}
                />
                <circle
                  cx={city.point.x}
                  cy={city.point.y}
                  r={city.tier === 1 ? 6 : city.tier === 2 ? 5 : 4.4}
                  fill="#F7FCFF"
                />
                <circle
                  cx={city.point.x}
                  cy={city.point.y}
                  r={city.featured ? 12 : 9}
                  fill="none"
                  stroke={city.featured ? 'rgba(169, 227, 255, 0.44)' : 'rgba(247, 252, 255, 0.2)'}
                />

                {LABELED_CITY_IDS.has(city.id) && labelConfig ? (
                  <g>
                    <rect
                      x={
                        labelConfig.anchor === 'end'
                          ? city.point.x + labelConfig.dx - estimateLabelWidth(label, fontSize)
                          : city.point.x + labelConfig.dx - 10
                      }
                      y={city.point.y + labelConfig.dy - 16}
                      width={estimateLabelWidth(label, fontSize)}
                      height="24"
                      rx="999"
                      fill="rgba(6, 12, 22, 0.68)"
                      stroke={
                        city.featured ? 'rgba(126, 233, 255, 0.24)' : 'rgba(255, 255, 255, 0.08)'
                      }
                    />
                    <text
                      x={city.point.x + labelConfig.dx}
                      y={city.point.y + labelConfig.dy}
                      textAnchor={labelConfig.anchor}
                      fill={city.featured ? '#F7FCFF' : 'rgba(234, 247, 255, 0.86)'}
                      fontSize={fontSize}
                      fontWeight={city.featured ? 720 : 620}
                      style={{ letterSpacing: '-0.02em' }}
                    >
                      {label}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}
        </svg>

        <div className="landing-sim-overlay">
          <div className="landing-sim-top">
            <div className="landing-sim-panel landing-sim-title-panel">
              <div className="landing-sim-overline">
                <span className="landing-sim-overline-dot" />
                {copy.heroEyebrow}
              </div>
              <h3 className="landing-sim-title">{copy.heroTitle}</h3>
              <p className="landing-sim-body">{copy.heroBody}</p>

              <div className="landing-sim-meta-row">
                <span className="landing-sim-kv">
                  <strong>{copy.updated}</strong>
                  {updatedAtLabel}
                </span>
                <span className="landing-sim-kv">
                  <strong>{copy.routeHealth}</strong>
                  {formatPercent(1 - dashboard.congestion * 0.58, ar)}
                </span>
              </div>

              <div className="landing-sim-tag-row">
                {overlayLabels.map(label => (
                  <span key={label} className="landing-sim-tag">
                    {label}
                  </span>
                ))}
              </div>

              <div className="landing-sim-legend-row">
                <span className="landing-sim-legend-chip">
                  <span className="landing-sim-legend-dot" style={{ background: '#F7FCFF' }} />
                  {copy.passengerLegend}
                </span>
                <span className="landing-sim-legend-chip">
                  <span className="landing-sim-legend-dot" style={{ background: PACKAGE_COLOR }} />
                  {copy.packageLegend}
                </span>
                <span className="landing-sim-legend-chip">
                  <span className="landing-sim-legend-line" />
                  {copy.networkLegend}
                </span>
              </div>
            </div>

            <div className="landing-sim-panel landing-sim-telemetry-panel">
              <p className="landing-sim-telemetry-title">{copy.telemetryTitle}</p>
              <div className="landing-sim-status-row" style={{ marginTop: 12 }}>
                {statusTags.map(tag => (
                  <span key={tag} className="landing-sim-status-chip">
                    {tag}
                  </span>
                ))}
              </div>
              <h4 className="landing-sim-telemetry-value">{dashboard.topCorridor}</h4>
              <p className="landing-sim-telemetry-copy">
                <strong style={{ color: '#F7FCFF' }}>{copy.dispatchAction}:</strong>{' '}
                {dashboard.dispatchAction}
              </p>

              <div className="landing-sim-meter-group">
                <div>
                  <div className="landing-sim-meter-label">
                    <span>{copy.utilization}</span>
                    <strong>{formatPercent(dashboard.networkUtilization, ar)}</strong>
                  </div>
                  <div className="landing-sim-meter">
                    <span
                      className="landing-sim-meter-fill"
                      style={{
                        width: utilizationWidth,
                        background:
                          'linear-gradient(90deg, rgba(120, 232, 255, 0.82), rgba(245, 239, 231, 0.94))',
                        boxShadow: '0 0 18px rgba(120, 232, 255, 0.28)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="landing-sim-meter-label">
                    <span>{copy.congestion}</span>
                    <strong>{formatPercent(dashboard.congestion, ar)}</strong>
                  </div>
                  <div className="landing-sim-meter">
                    <span
                      className="landing-sim-meter-fill"
                      style={{
                        width: congestionWidth,
                        background:
                          'linear-gradient(90deg, rgba(255, 179, 87, 0.82), rgba(245, 154, 44, 0.96))',
                        boxShadow: '0 0 18px rgba(245, 154, 44, 0.24)',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="landing-sim-bottom">
            <div className="landing-sim-stat-grid">
              {summaryCards.map(card => (
                <div
                  key={card.id}
                  className="landing-sim-panel landing-sim-stat-card"
                  style={{
                    borderColor: card.accent,
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 48px ${card.glow}`,
                  }}
                >
                  <div className="landing-sim-stat-label">{card.label}</div>
                  <div className="landing-sim-stat-value">{card.value}</div>
                  <div className="landing-sim-stat-detail">{card.detail}</div>
                </div>
              ))}
            </div>

            <div className="landing-sim-panel landing-sim-hotspots">
              <div className="landing-sim-hotspots-head">
                <h4 className="landing-sim-hotspots-title">{copy.hotCorridors}</h4>
                <span className="landing-sim-kv">{copy.routeHealth}</span>
              </div>
              <div className="landing-sim-hotspot-list">
                {corridorHighlights.map(corridor => (
                  <div key={corridor.id} className="landing-sim-hotspot-item">
                    <div className="landing-sim-hotspot-head">
                      <span>{corridor.name}</span>
                      <span className="landing-sim-hotspot-total">
                        {corridor.total} {copy.movements}
                      </span>
                    </div>
                    <div className="landing-sim-track-stack">
                      <div className="landing-sim-track">
                        <span
                          style={{
                            width: corridor.passengerWidth,
                            background:
                              'linear-gradient(90deg, rgba(247,252,255,0.98), rgba(151,236,255,0.92))',
                          }}
                        />
                      </div>
                      <div className="landing-sim-track">
                        <span
                          style={{
                            width: corridor.packageWidth,
                            background:
                              'linear-gradient(90deg, rgba(255,200,116,0.96), rgba(245,154,44,0.98))',
                          }}
                        />
                      </div>
                    </div>
                    <div className="landing-sim-hotspot-foot">
                      <span>{corridor.speed}</span>
                      <span>{corridor.congestion}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
