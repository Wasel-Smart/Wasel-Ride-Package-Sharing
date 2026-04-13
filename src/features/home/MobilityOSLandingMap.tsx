import { useEffect, useMemo, useState } from 'react';
import {
  useMobilityOSLiveData,
  type LiveMobilityRouteSnapshot,
} from '../mobility-os/liveMobilityData';

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

const VIEWBOX_WIDTH = 720;
const VIEWBOX_HEIGHT = 560;
const FLOW_SPEED_SCALE = 0.42;
const PASSENGER_COLOR = '#FFE7A8';
const PASSENGER_GLOW = 'rgba(255, 231, 168, 0.36)';
const PACKAGE_COLOR = '#F4C651';
const PACKAGE_GLOW = 'rgba(244, 198, 81, 0.3)';
const VEHICLE_COUNT = 28;
const TRAFFIC_FREE_SPEED_KPH = 120;
const TRAFFIC_JAM_DENSITY = 150;
const TRAFFIC_CRITICAL_DENSITY = 45;

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

const COPY = {
  en: {
    mapLabel: 'Jordan mobility simulation',
    passengerLegend: 'Ride flow',
    packageLegend: 'Package flow',
    networkLegend: 'Same Mobility OS routes',
    srDescription:
      'Animated mobility map of Jordan showing rides and packages moving across the same Wasel network corridors as Mobility OS.',
  },
  ar: {
    mapLabel: 'محاكاة الحركة في الأردن',
    passengerLegend: 'حركة الرحلات',
    packageLegend: 'حركة الطرود',
    networkLegend: 'نفس مسارات Mobility OS',
    srDescription:
      'خريطة حركة متحركة للأردن تعرض الرحلات والطرود وهي تتحرك على نفس شبكة المسارات المستخدمة داخل Mobility OS.',
  },
} as const;

const LABELED_CITY_IDS = new Set(['amman', 'aqaba', 'irbid', 'zarqa', 'jerash', 'mafraq', 'karak']);

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

function estimateDensity(passengerFlow: number, packageFlow: number, seed: number) {
  return 16 + passengerFlow / 110 + packageFlow / 230 + seed * 1.2;
}

function estimateSpeedKph(density: number) {
  return Math.max(
    18,
    TRAFFIC_FREE_SPEED_KPH *
      (1 - Math.min(density, TRAFFIC_JAM_DENSITY * 0.98) / TRAFFIC_JAM_DENSITY),
  );
}

function estimateCongestion(density: number) {
  return clamp(density / TRAFFIC_CRITICAL_DENSITY, 0.08, 0.98);
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

export function MobilityOSLandingMap({ ar = false }: { ar?: boolean }) {
  const { snapshot } = useMobilityOSLiveData(ar);
  const [phase, setPhase] = useState(0);
  const copy = ar ? COPY.ar : COPY.en;

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

  const syntheticFleet = useMemo(() => buildSyntheticFleet(corridors), [corridors]);

  const vehicles = useMemo(() => {
    const liveVehicles = (snapshot?.vehicles ?? []).filter(vehicle =>
      geometryMap.has(vehicle.routeId),
    );
    const liveVehicleIds = new Set(liveVehicles.map(vehicle => vehicle.id));
    const syntheticVehicles = syntheticFleet.filter(vehicle => !liveVehicleIds.has(vehicle.id));
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

  const overlayLabels = ar
    ? ['حركة Mobility OS الحية', 'الرحلات والطرود على نفس المسارات', 'الخريطة حيّة على الصفحة']
    : [
        'Mobility OS live movement',
        'Rides and packages share the same corridors',
        'The landing map stays alive',
      ];

  void overlayLabels;
  return (
    <figure
      aria-label={copy.mapLabel}
      style={{
        margin: 0,
      }}
    >
      <style>{`
        .landing-sim-shell {
          position: relative;
          min-height: clamp(440px, 62vw, 720px);
          border-radius: 32px;
          overflow: hidden;
          border: 1px solid rgba(255, 240, 193, 0.14);
          background:
            radial-gradient(circle at 18% 12%, rgba(255, 232, 160, 0.18), rgba(4, 18, 30, 0) 22%),
            radial-gradient(circle at 86% 82%, rgba(96, 131, 255, 0.1), rgba(4, 18, 30, 0) 24%),
            linear-gradient(180deg, rgba(9, 19, 32, 0.99), rgba(4, 10, 18, 1));
          box-shadow:
            inset 0 1px 0 rgba(255, 248, 229, 0.06),
            0 30px 96px rgba(1, 5, 10, 0.44);
        }
        .landing-sim-shell::before {
          content: '';
          position: absolute;
          inset: 14px;
          border-radius: 26px;
          border: 1px solid rgba(255, 240, 193, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0)),
            radial-gradient(circle at top, rgba(255, 232, 160, 0.08), rgba(255, 232, 160, 0) 48%);
          pointer-events: none;
        }
        .landing-sim-shell::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(120deg, rgba(255, 255, 255, 0.06) 0, rgba(255, 255, 255, 0) 24%, rgba(255, 255, 255, 0) 74%, rgba(255, 232, 160, 0.08) 100%);
          pointer-events: none;
          mix-blend-mode: screen;
          opacity: 0.82;
        }
        @media (max-width: 720px) {
          .landing-sim-shell {
            min-height: clamp(360px, 84vw, 520px);
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
          style={{ width: '100%', height: '100%', display: 'block' }}
        >
          <defs>
            <linearGradient
              id="landing-stage-fill"
              x1="360"
              y1="384"
              x2="360"
              y2="560"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="rgba(14, 29, 45, 0.92)" />
              <stop offset="1" stopColor="rgba(3, 8, 15, 1)" />
            </linearGradient>
            <linearGradient
              id="landing-land-surface"
              x1="170"
              y1="78"
              x2="516"
              y2="502"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="rgba(19, 38, 56, 0.98)" />
              <stop offset="0.58" stopColor="rgba(11, 25, 38, 0.96)" />
              <stop offset="1" stopColor="rgba(6, 14, 24, 0.98)" />
            </linearGradient>
            <linearGradient
              id="landing-ride-gradient"
              x1="92"
              y1="502"
              x2="548"
              y2="92"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#FFF5D1" />
              <stop offset="0.5" stopColor={PASSENGER_COLOR} />
              <stop offset="1" stopColor="#F4C651" />
            </linearGradient>
            <linearGradient
              id="landing-package-gradient"
              x1="118"
              y1="520"
              x2="584"
              y2="112"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#C5831F" />
              <stop offset="0.54" stopColor={PACKAGE_COLOR} />
              <stop offset="1" stopColor="#FFF0C1" />
            </linearGradient>
            <radialGradient
              id="landing-map-scan"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(248 138) rotate(42) scale(184 160)"
            >
              <stop stopColor="rgba(255, 232, 160, 0.2)" />
              <stop offset="1" stopColor="rgba(255, 232, 160, 0)" />
            </radialGradient>
            <radialGradient
              id="landing-city-wash"
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(368 284) rotate(90) scale(198 248)"
            >
              <stop stopColor="rgba(255, 240, 193, 0.14)" />
              <stop offset="1" stopColor="rgba(255, 240, 193, 0)" />
            </radialGradient>
            <clipPath id="landing-land-clip">
              <path d={borderPath} />
            </clipPath>
          </defs>

          <path d="M 34 392 L 686 392 L 720 560 L 0 560 Z" fill="url(#landing-stage-fill)" />
          {Array.from({ length: 9 }, (_, index) => {
            const y = 392 + ((index + 1) / 10) ** 1.7 * 152;
            const inset = 34 + index * 8;
            return (
              <path
                key={`landing-floor-row-${index}`}
                d={`M ${inset} ${y} L ${VIEWBOX_WIDTH - inset} ${y}`}
                stroke="rgba(255, 240, 193, 0.07)"
                strokeWidth="1"
                opacity={0.9 - index * 0.08}
              />
            );
          })}
          {Array.from({ length: 12 }, (_, index) => {
            const x = 42 + index * 54;
            const topX = 224 + (index - 5.5) * 16;
            return (
              <path
                key={`landing-floor-col-${index}`}
                d={`M ${x} 560 L ${topX} 392`}
                stroke="rgba(255, 232, 160, 0.05)"
                strokeWidth="1"
              />
            );
          })}

          <path
            d={borderPath}
            fill="rgba(0, 0, 0, 0.18)"
            transform="translate(18 30) scale(1 0.965)"
            opacity="0.82"
          />
          <path
            d={borderPath}
            fill="url(#landing-land-surface)"
            stroke="rgba(255, 240, 193, 0.16)"
            strokeWidth="1.6"
          />
          <path
            d={borderPath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="13"
            opacity="0.24"
            transform="translate(8 12)"
          />
          <g clipPath="url(#landing-land-clip)">
            <rect
              x="0"
              y="0"
              width={VIEWBOX_WIDTH}
              height={VIEWBOX_HEIGHT}
              fill="url(#landing-city-wash)"
            />
            {Array.from({ length: 7 }, (_, index) => {
              const y = 122 + index * 48;
              return (
                <path
                  key={`landing-contour-${index}`}
                  d={`M 108 ${y} C 188 ${y - 20}, 286 ${y + 16}, 388 ${y - 10} S 556 ${y + 18}, 624 ${y - 8}`}
                  stroke="rgba(255, 255, 255, 0.05)"
                  strokeWidth={index % 2 === 0 ? 1 : 0.8}
                  fill="none"
                  opacity={0.65 - index * 0.06}
                />
              );
            })}
            {Array.from({ length: 4 }, (_, index) => {
              const x = 166 + index * 88;
              return (
                <path
                  key={`landing-axis-${index}`}
                  d={`M ${x} 84 L ${x + 34} 448`}
                  stroke="rgba(255, 232, 160, 0.06)"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          <circle cx="248" cy="138" r="44" fill="url(#landing-map-scan)" />

          {corridorGeometry.map(corridor => (
            <g key={`${corridor.id}-route`}>
              <path
                d={corridor.path}
                fill="none"
                stroke="rgba(0, 0, 0, 0.16)"
                strokeWidth={corridor.highlighted ? 12 : 9}
                strokeLinecap="round"
                transform="translate(8 12)"
              />
              <path
                d={corridor.path}
                fill="none"
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={corridor.highlighted ? 9 : 7}
                strokeLinecap="round"
              />
              <path
                d={corridor.path}
                fill="none"
                stroke="url(#landing-ride-gradient)"
                strokeWidth={corridor.highlighted ? 4.4 : 3.1}
                strokeLinecap="round"
                opacity={corridor.highlighted ? 1 : 0.88}
                filter={
                  corridor.highlighted
                    ? 'drop-shadow(0 0 14px rgba(255, 231, 168, 0.34))'
                    : undefined
                }
              />
              <path
                d={corridor.path}
                fill="none"
                stroke="url(#landing-package-gradient)"
                strokeWidth={corridor.highlighted ? 3.2 : 2.4}
                strokeLinecap="round"
                strokeDasharray="8 9"
                opacity={corridor.highlighted ? 0.96 : 0.8}
              />
            </g>
          ))}

          {passengerParticles.map(particle => (
            <circle
              key={particle.id}
              cx={particle.point.x}
              cy={particle.point.y}
              r={particle.radius}
              fill="#FFF7DE"
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
                r="4.9"
                fill="#FFF9E6"
                opacity="0.95"
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
                fill="#FFF0C1"
                opacity="0.94"
                style={{ filter: `drop-shadow(0 0 10px ${PACKAGE_GLOW})` }}
                transform={`rotate(45 ${vehicle.point.x} ${vehicle.point.y})`}
              />
            ),
          )}

          {liveVehicleMarkers.map(vehicle => (
            <g key={vehicle.id}>
              <circle
                cx={vehicle.point.x}
                cy={vehicle.point.y}
                r={vehicle.fresh ? 10.8 : 9}
                fill="none"
                stroke={vehicle.fresh ? 'rgba(255,240,193,0.86)' : 'rgba(244,198,81,0.6)'}
                strokeWidth="1.3"
                opacity={vehicle.fresh ? 0.92 : 0.7}
              />
              {vehicle.type === 'passenger' ? (
                <circle
                  cx={vehicle.point.x}
                  cy={vehicle.point.y}
                  r={vehicle.fresh ? 5.2 : 4.5}
                  fill="#FFFFFF"
                  opacity={vehicle.fresh ? 1 : 0.76}
                  style={{ filter: `drop-shadow(0 0 12px ${PASSENGER_GLOW})` }}
                />
              ) : (
                <rect
                  x={vehicle.point.x - 4}
                  y={vehicle.point.y - 4}
                  width="8"
                  height="8"
                  rx="2"
                  fill="#FFF2CC"
                  opacity={vehicle.fresh ? 1 : 0.76}
                  style={{ filter: `drop-shadow(0 0 12px ${PACKAGE_GLOW})` }}
                  transform={`rotate(45 ${vehicle.point.x} ${vehicle.point.y})`}
                />
              )}
            </g>
          ))}

          {cityPoints.map(city => (
            <g key={city.id}>
              <ellipse
                cx={city.point.x + 7}
                cy={city.point.y + 18}
                rx={city.featured ? 20 : 14}
                ry={city.featured ? 6 : 4.8}
                fill="rgba(0, 0, 0, 0.2)"
              />
              {city.featured ? (
                <circle
                  cx={city.point.x}
                  cy={city.point.y}
                  r="30"
                  fill="rgba(255, 232, 160, 0.1)"
                />
              ) : null}
              <line
                x1={city.point.x}
                y1={city.point.y - (city.featured ? 28 : 22)}
                x2={city.point.x}
                y2={city.point.y - 5}
                stroke={city.featured ? 'rgba(255, 232, 160, 0.34)' : 'rgba(255, 240, 193, 0.14)'}
                strokeWidth={city.featured ? 1.8 : 1.2}
              />
              <circle
                cx={city.point.x}
                cy={city.point.y}
                r={city.tier === 1 ? 6 : city.tier === 2 ? 5 : 4.4}
                fill="#FFF6DD"
              />
              <circle
                cx={city.point.x}
                cy={city.point.y}
                r={city.featured ? 12 : 9}
                fill="none"
                stroke={city.featured ? 'rgba(255, 232, 160, 0.38)' : 'rgba(255, 240, 193, 0.18)'}
              />
              {LABELED_CITY_IDS.has(city.id) ? (
                <text
                  x={city.point.x + (city.id === 'aqaba' ? -24 : city.id === 'mafraq' ? -14 : -18)}
                  y={city.point.y + (city.id === 'karak' || city.id === 'aqaba' ? -18 : -16)}
                  fill={city.featured ? '#FFF7DE' : 'rgba(255, 243, 214, 0.78)'}
                  fontSize={city.featured ? 16 : 13.4}
                  fontWeight={city.featured ? 700 : 600}
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {labelFor(city, ar)}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}
