import {
  startTransition,
  type CSSProperties,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowRight,
  Gauge,
  Layers3,
  MapPinned,
  Pause,
  Play,
  Radar,
  RefreshCcw,
  Route,
  ShieldCheck,
  Waypoints,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  buildCorridorCommercialSnapshot,
  type CorridorCommercialSnapshot,
} from '../../services/corridorCommercial';
import { C, F, GRAD_AURORA, R, SH } from '../../utils/wasel-ds';
import {
  type LiveMobilityRouteSnapshot,
  type LiveMobilitySnapshot,
  type LiveMobilityVehicleSnapshot,
  useMobilityOSLiveData,
} from './liveMobilityData';
import { allowSyntheticData } from '../../services/runtimePolicy';

type FlowType = 'passenger' | 'package';
type ViewMode = 'command' | 'satellite' | 'pulse';
type RouteLens = 'all' | 'rides' | 'parcels' | 'stress';
type City = {
  id: number;
  name: string;
  nameAr: string;
  lat: number;
  lon: number;
  populationK: number;
  officialPopulation: number;
  officialArea: string;
  officialAreaAr: string;
  attractiveness: number;
  isHub: boolean;
  tier: 1 | 2 | 3;
};
type RouteBase = {
  id: string;
  from: number;
  to: number;
  distanceKm: number;
  lanes: number;
  highway: string;
  highwayAr: string;
};
type RouteState = RouteBase & {
  passengerFlow: number;
  packageFlow: number;
  density: number;
  speedKph: number;
  congestion: number;
};
type Vehicle = {
  id: string;
  routeId: string;
  type: FlowType;
  progress: number;
  direction: 1 | -1;
  speedFactor: number;
  x: number;
  y: number;
  angle: number;
  velocityX: number;
  velocityY: number;
  laneOffset: number;
  driftAmplitude: number;
  driftPhase: number;
  passengers?: number;
  seatCapacity?: number;
  packageCapacity?: number;
  packageLoad?: number;
  liveLat?: number;
  liveLng?: number;
  isLiveTelemetry?: boolean;
  freshness?: 'fresh' | 'stale';
};
type MetricSource = 'live' | 'hybrid' | 'modeled';
type Analytics = {
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
  sources: {
    totalVehicles: MetricSource;
    activePassengers: MetricSource;
    activePackages: MetricSource;
    seatAvailability: MetricSource;
    packageCapacity: MetricSource;
    avgSpeed: MetricSource;
    networkUtilization: MetricSource;
    congestionLevel: MetricSource;
    topCorridor: MetricSource;
    recommendedPath: MetricSource;
    dispatchAction: MetricSource;
  };
};
type Star = { x: number; y: number; size: number; alpha: number; drift: number };
type Point = { x: number; y: number };
type CurveGeometry = { start: Point; control: Point; end: Point };

const PASSENGER_COLOR = '#EAF7FF';
const PACKAGE_COLOR = '#8BD8FF';
const PASSENGER_GLOW = 'rgba(234,247,255,0.48)';
const PACKAGE_GLOW = 'rgba(139,216,255,0.42)';
const TARGET_VEHICLES = 96;
const BASE_W = 1200;
const BASE_H = 700;
const FLOW_SPEED_SCALE = 0.58;
const HERO_MAP_ASPECT = 1.42;
const ACTIVE_FRAME_RATE = 36;
const SCROLLING_FRAME_RATE = 20;
const ANALYTICS_COMMIT_INTERVAL_MS = 320;
const INTERACTION_COOLDOWN_MS = 180;
const MAP_VISIBILITY_THRESHOLD = 0.18;
const SERVICE_TEXT = '#EEF8FF';
const SERVICE_SUB = 'rgba(220,238,255,0.82)';
const SERVICE_MUTED = 'rgba(183,206,228,0.72)';
const SERVICE_BORDER = 'rgba(169,227,255,0.18)';
const SERVICE_BORDER_STRONG = 'rgba(169,227,255,0.30)';
const SKY_ACCENT = '#A9E3FF';
const SKY_SUCCESS = '#79F3D0';
const SKY_WARNING = '#FFC78D';
const CITY_DATA: City[] = [
  {
    id: 0,
    name: 'Amman',
    nameAr: '?????',
    lat: 31.9454,
    lon: 35.9284,
    populationK: 5004.6,
    officialPopulation: 5004600,
    officialArea: 'Amman Governorate',
    officialAreaAr: '?????? ???????',
    attractiveness: 1,
    isHub: true,
    tier: 1,
  },
  {
    id: 1,
    name: 'Aqaba',
    nameAr: '??????',
    lat: 29.532,
    lon: 35.0063,
    populationK: 250.9,
    officialPopulation: 250900,
    officialArea: 'Aqaba Governorate',
    officialAreaAr: '?????? ??????',
    attractiveness: 0.92,
    isHub: true,
    tier: 1,
  },
  {
    id: 2,
    name: 'Irbid',
    nameAr: '????',
    lat: 32.5556,
    lon: 35.85,
    populationK: 2210.5,
    officialPopulation: 2210500,
    officialArea: 'Irbid Governorate',
    officialAreaAr: '?????? ????',
    attractiveness: 0.88,
    isHub: true,
    tier: 1,
  },
  {
    id: 3,
    name: 'Zarqa',
    nameAr: '???????',
    lat: 32.0728,
    lon: 36.088,
    populationK: 1704.5,
    officialPopulation: 1704500,
    officialArea: 'Zarqa Governorate',
    officialAreaAr: '?????? ???????',
    attractiveness: 0.84,
    isHub: true,
    tier: 1,
  },
  {
    id: 4,
    name: 'Mafraq',
    nameAr: '??????',
    lat: 32.3406,
    lon: 36.208,
    populationK: 686.8,
    officialPopulation: 686800,
    officialArea: 'Mafraq Governorate',
    officialAreaAr: '?????? ??????',
    attractiveness: 0.58,
    isHub: false,
    tier: 2,
  },
  {
    id: 5,
    name: 'Jerash',
    nameAr: '???',
    lat: 32.2803,
    lon: 35.8993,
    populationK: 296,
    officialPopulation: 296000,
    officialArea: 'Jerash Governorate',
    officialAreaAr: '?????? ???',
    attractiveness: 0.64,
    isHub: false,
    tier: 2,
  },
  {
    id: 6,
    name: 'Ajloun',
    nameAr: '?????',
    lat: 32.3326,
    lon: 35.7519,
    populationK: 219.9,
    officialPopulation: 219900,
    officialArea: 'Ajloun Governorate',
    officialAreaAr: '?????? ?????',
    attractiveness: 0.62,
    isHub: false,
    tier: 2,
  },
  {
    id: 7,
    name: 'Madaba',
    nameAr: '?????',
    lat: 31.7197,
    lon: 35.7936,
    populationK: 236.2,
    officialPopulation: 236200,
    officialArea: 'Madaba Governorate',
    officialAreaAr: '?????? ?????',
    attractiveness: 0.6,
    isHub: false,
    tier: 2,
  },
  {
    id: 8,
    name: 'Karak',
    nameAr: '?????',
    lat: 31.1853,
    lon: 35.7048,
    populationK: 395.4,
    officialPopulation: 395400,
    officialArea: 'Karak Governorate',
    officialAreaAr: '?????? ?????',
    attractiveness: 0.66,
    isHub: false,
    tier: 2,
  },
  {
    id: 9,
    name: 'Tafila',
    nameAr: '???????',
    lat: 30.8375,
    lon: 35.6042,
    populationK: 120.3,
    officialPopulation: 120300,
    officialArea: 'Tafilah Governorate',
    officialAreaAr: '?????? ???????',
    attractiveness: 0.48,
    isHub: false,
    tier: 3,
  },
  {
    id: 10,
    name: "Ma'an",
    nameAr: '????',
    lat: 30.1962,
    lon: 35.736,
    populationK: 197.9,
    officialPopulation: 197900,
    officialArea: "Ma'an Governorate",
    officialAreaAr: '?????? ????',
    attractiveness: 0.54,
    isHub: false,
    tier: 3,
  },
  {
    id: 11,
    name: 'Salt',
    nameAr: '?????',
    lat: 32.0392,
    lon: 35.7272,
    populationK: 614,
    officialPopulation: 614000,
    officialArea: 'Balqa Governorate',
    officialAreaAr: '?????? ???????',
    attractiveness: 0.57,
    isHub: false,
    tier: 2,
  },
];
const ROUTES: RouteBase[] = [
  {
    id: 'amman-aqaba',
    from: 0,
    to: 1,
    distanceKm: 335,
    lanes: 2,
    highway: 'Desert Highway',
    highwayAr: '?????? ????????',
  },
  {
    id: 'amman-irbid',
    from: 0,
    to: 2,
    distanceKm: 85,
    lanes: 2,
    highway: 'Jordan Valley Highway',
    highwayAr: '???? ???? ??????',
  },
  {
    id: 'amman-zarqa',
    from: 0,
    to: 3,
    distanceKm: 25,
    lanes: 3,
    highway: 'Amman-Zarqa Expressway',
    highwayAr: '????????? ????? ???????',
  },
  {
    id: 'zarqa-mafraq',
    from: 3,
    to: 4,
    distanceKm: 55,
    lanes: 2,
    highway: 'International Highway',
    highwayAr: '?????? ??????',
  },
  {
    id: 'amman-jerash',
    from: 0,
    to: 5,
    distanceKm: 48,
    lanes: 2,
    highway: 'Jerash Road',
    highwayAr: '???? ???',
  },
  {
    id: 'irbid-ajloun',
    from: 2,
    to: 6,
    distanceKm: 30,
    lanes: 1,
    highway: 'Ajloun Corridor',
    highwayAr: '??? ?????',
  },
  {
    id: 'amman-madaba',
    from: 0,
    to: 7,
    distanceKm: 33,
    lanes: 2,
    highway: 'Airport Corridor',
    highwayAr: '??? ??????',
  },
  {
    id: 'madaba-karak',
    from: 7,
    to: 8,
    distanceKm: 111,
    lanes: 2,
    highway: "King's Highway",
    highwayAr: '?????? ???????',
  },
  {
    id: 'karak-tafila',
    from: 8,
    to: 9,
    distanceKm: 74,
    lanes: 1,
    highway: 'Southern Ridge Road',
    highwayAr: '???? ????????? ????????',
  },
  {
    id: 'tafila-maan',
    from: 9,
    to: 10,
    distanceKm: 89,
    lanes: 1,
    highway: 'South Mountain Road',
    highwayAr: '???? ?????? ????????',
  },
  {
    id: 'maan-aqaba',
    from: 10,
    to: 1,
    distanceKm: 114,
    lanes: 2,
    highway: 'Aqaba Arterial',
    highwayAr: '??????? ?????? ??? ??????',
  },
  {
    id: 'irbid-zarqa',
    from: 2,
    to: 3,
    distanceKm: 79,
    lanes: 2,
    highway: 'Northern Connector',
    highwayAr: '?????? ???????',
  },
  {
    id: 'amman-salt',
    from: 0,
    to: 11,
    distanceKm: 32,
    lanes: 2,
    highway: 'Salt Corridor',
    highwayAr: '??? ?????',
  },
  {
    id: 'salt-jerash',
    from: 11,
    to: 5,
    distanceKm: 38,
    lanes: 1,
    highway: 'Hill Connector',
    highwayAr: '?????? ??????',
  },
  {
    id: 'ajloun-jerash',
    from: 6,
    to: 5,
    distanceKm: 24,
    lanes: 1,
    highway: 'Forest Road',
    highwayAr: '???? ???????',
  },
];
const routeVisualIndexById = new Map(ROUTES.map((route, index) => [route.id, index]));
const BORDER = [
  { lat: 33.37, lon: 35.55 },
  { lat: 32.58, lon: 36.42 },
  { lat: 31.24, lon: 37.12 },
  { lat: 29.62, lon: 36.22 },
  { lat: 29.2, lon: 35.03 },
  { lat: 31.2, lon: 35.5 },
  { lat: 32.56, lon: 35.55 },
];
const TRAFFIC = { FREE: 120, JAM: 150, CRITICAL: 45 };
const cityMap = new Map(CITY_DATA.map(city => [city.id, city]));
const bounds = CITY_DATA.reduce(
  (acc, city) => ({
    minLat: Math.min(acc.minLat, city.lat),
    maxLat: Math.max(acc.maxLat, city.lat),
    minLon: Math.min(acc.minLon, city.lon),
    maxLon: Math.max(acc.maxLon, city.lon),
  }),
  { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity },
);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const panelStyle = (extra: CSSProperties = {}): CSSProperties => ({
  position: 'relative',
  background: 'linear-gradient(180deg, rgba(7,18,34,0.94), rgba(4,10,22,0.98))',
  border: `1px solid ${SERVICE_BORDER}`,
  borderRadius: 24,
  boxShadow: SH.lg,
  overflow: 'hidden',
  ...extra,
});
const sectionLabelStyle: CSSProperties = {
  fontSize: '0.72rem',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: SKY_ACCENT,
};
const glassPanelStyle = (extra: CSSProperties = {}): CSSProperties => ({
  ...panelStyle({
    background: 'linear-gradient(180deg, rgba(9,24,42,0.96), rgba(4,10,22,0.99))',
    border: `1px solid ${SERVICE_BORDER}`,
    boxShadow: '0 26px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)',
    ...extra,
  }),
});

function hourPalette(hour: number) {
  if (hour >= 6 && hour <= 10) {
    return { top: '#081523', bottom: '#11283b', glow: 'rgba(101,225,255,0.16)' };
  }
  if (hour >= 17 && hour <= 20) {
    return { top: '#071118', bottom: '#0b1827', glow: 'rgba(169,227,255,0.18)' };
  }
  return { top: '#030914', bottom: '#0a1624', glow: 'rgba(220,255,248,0.12)' };
}

function getCityLabel(city: City, ar: boolean) {
  return ar ? city.nameAr : city.name;
}

function getCityOrThrow(cityId: number): City {
  const city = cityMap.get(cityId);
  if (!city) {
    throw new Error(`[MobilityOSCore] Missing city for id ${cityId}`);
  }
  return city;
}

function getRouteCities(route: Pick<RouteBase, 'from' | 'to'>) {
  return {
    from: getCityOrThrow(route.from),
    to: getCityOrThrow(route.to),
  };
}

function projectCity(cityId: number, width: number, height: number) {
  const city = getCityOrThrow(cityId);
  return project(city.lat, city.lon, width, height);
}

function createMobilityOSCopy(ar: boolean) {
  return {
    heroLabel: ar ? '???? ?????? / ??? ?????? ??????' : 'Mobility OS / Live network view',
    heroTitle: ar
      ? '???? ????? ?????? ????? ??????? ????? ??????? ????? ??????.'
      : 'A clear live view of how Jordan moves people and packages.',
    heroBody: ar
      ? '??? ?????? ???? ????? ???? ?????? ???? ???????? ?????? ????? ????????? ??????? ????? ???????? ???? ??????? ???? ????? ??????? ??????? ????? ???????.'
      : 'Mobility OS brings route pressure, travel speed, package load, and corridor health into one readable network view.',
    controlState: ar ? '???? ??????' : 'Control state',
    selectedCity: ar ? '??????? ???????' : 'Selected city',
    topCorridor: ar ? '????? ??????' : 'Top corridor',
    dispatch: ar ? '????? ???????' : 'Dispatch',
    liveSync: ar ? '?? ?????' : 'Live sync',
    selectedNode: ar ? '?????? ???????' : 'Selected node',
    signatureMode: ar ? '????? ?????' : 'Signature mode',
    actionableOutputs: ar ? '?????? ????? ???????' : 'Actionable outputs',
    servicePriority: ar ? '?????? ???????' : 'Service priority',
    operationalMap: ar ? '??????? ?????????' : 'Operational map',
    mapTitle: ar
      ? '?????? ?? 12 ????? ?15 ????? ??? ?????'
      : 'Jordan with 12 cities and 15 intercity corridors',
    mapBody: ar
      ? '?????? ???? ???? ??????? ??????? ???? ???? ??????. ????? ????????? ???? ???????? ????? ?????? ??????? ??????? ??? ??????? ?????? ?? ?? ????.'
      : 'Mint light is passenger flow. Teal is package flow. The map now renders as a layered command-stage with live vehicles, corridor pressure, and elevated city beacons.',
    passengerFlow: ar ? '???? ??????' : 'Passenger flow',
    packageFlow: ar ? '???? ??????' : 'Package flow',
    routeIntelligence: ar ? '???? ??????' : 'Route intelligence',
    activeMode: ar ? '????? ??????' : 'Active mode',
    liveMesh: ar ? '?????? ???? ?????? ????? 60 ????/?' : 'Live network feed',
    parcelLoad: ar ? '????? ??????' : 'Parcel load',
    signalLayer: ar ? '???? ????????' : 'Route signals',
    mobilityMatrix: ar ? '?????? ?????? ????????' : 'Jordan route map',
    fieldEnhancement: ar ? '????? ??????' : 'Field enhancement',
    tempoDeck: ar ? '???? ??????? ??????' : 'Flow tempo and depth deck',
    cinematic: ar ? '???? / ???????' : 'cinematic / slower',
    commandNotes: ar ? '??????? ???????' : 'Command notes',
    commandMode: ar ? '??? ???????' : 'Command mode',
    commandModeBody: ar
      ? '??? ?????? ????? ?????? ????? ??? ????? ????? ?????? ??????.'
      : 'Balanced command-room visibility for routing, dispatch, and health monitoring.',
    satelliteMode: ar ? '??? ????????' : 'Satellite mode',
    satelliteModeBody: ar
      ? '?????? ???? ???????? ?? ????? ???? ????? ?????????? ??? ???????.'
      : 'Sharper terrain definition and greener logistics emphasis for corridor reading.',
    pulseMode: ar ? '??? ?????' : 'Pulse mode',
    pulseModeBody: ar
      ? '???? ???? ????? ???? ?????? ???????? ?????? ??????.'
      : 'High-energy rhythm view that amplifies motion, heat, and network intensity.',
    population: ar ? '??? ??????' : 'Population',
    tier: ar ? '?????' : 'Tier',
    optimalPath: ar ? '???? ????' : 'Optimal path',
    corridorIntelligence: ar ? '???? ???????' : 'Corridor intelligence',
    corridorDeck: ar ? '????? ??????? ???????' : 'Live corridor ranking deck',
    corridorDeckBody: ar
      ? '????? ????? ??????? ????? ??? ?????? ??????? ????? ??????? ???? ??????? ?????? ??? ?????? ???????.'
      : 'Ranked corridors with live composite flow, route identity, health pressure, and blended passenger-package utilization.',
    liveRanking: ar ? '????? ?????' : 'Live ranking',
    corridors: ar ? '?????' : 'corridors',
    speed: ar ? '??????' : 'Speed',
    pressure: ar ? '?????' : 'Pressure',
    flow: ar ? '??????' : 'Flow',
    compositeScore: ar ? '??????? ???????' : 'Composite score',
    passengerOccupancy: ar ? '????? ???????' : 'Passenger occupancy',
    packageUtilization: ar ? '??????? ??????' : 'Package utilization',
    congestionIntensity: ar ? '??? ????????' : 'Congestion intensity',
    rideFlowTempo: ar ? '????? ???? ??????' : 'Ride flow tempo',
    parcelCadence: ar ? '????? ??????' : 'Parcel cadence',
    depthField: ar ? '???? ?????' : 'Depth field',
    structuredTiers: ar ? '??? ????? ?????? ???????' : 'Structured service tiers',
  };
}

function getOperationalViewport(width: number, height: number) {
  const desktopStage = width >= 860;
  const railWidth = desktopStage ? Math.min(280, Math.max(220, width * 0.22)) : 0;
  return {
    left: desktopStage ? railWidth + width * 0.04 : width * 0.08,
    right: width * 0.95,
    top: desktopStage ? height * 0.08 : height * 0.08,
    bottom: height * 0.92,
    railWidth,
  };
}

function project(lat: number, lon: number, width: number, height: number) {
  const viewport = getOperationalViewport(width, height);
  const lonRatio = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1);
  const stretchedLonRatio = clamp(0.5 + (lonRatio - 0.5) * (width >= 860 ? 1.12 : 1.04), 0, 1);
  const x = viewport.left + stretchedLonRatio * (viewport.right - viewport.left);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y =
    viewport.top +
    (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (viewport.bottom - viewport.top);
  return { x, y };
}

function getRouteCurve(from: Point, to: Point, intensity: number, seed: number) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const direction = seed % 2 === 0 ? 1 : -1;
  const offset = Math.min(42, 12 + intensity * 10 + (seed % 5) * 2.4) * direction;
  return {
    cx: midX - (dy / length) * offset,
    cy: midY + (dx / length) * offset,
  };
}

function pointOnQuadratic(start: Point, control: Point, end: Point, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function tangentOnQuadratic(start: Point, control: Point, end: Point, t: number) {
  return {
    x: 2 * (1 - t) * (control.x - start.x) + 2 * t * (end.x - control.x),
    y: 2 * (1 - t) * (control.y - start.y) + 2 * t * (end.y - control.y),
  };
}

function getRouteVisualSeed(routeId: string) {
  return routeVisualIndexById.get(routeId) ?? 0;
}

function getNormalFromTangent(tangent: Point) {
  const tangentLength = Math.max(0.001, Math.hypot(tangent.x, tangent.y));
  return {
    x: -tangent.y / tangentLength,
    y: tangent.x / tangentLength,
  };
}

function getRouteLaneGap(route: Pick<RouteBase, 'lanes'>) {
  return 6 + route.lanes * 1.2;
}

function offsetQuadraticCurve(
  start: Point,
  control: Point,
  end: Point,
  offset: number,
): CurveGeometry {
  const startNormal = getNormalFromTangent(tangentOnQuadratic(start, control, end, 0.08));
  const midNormal = getNormalFromTangent(tangentOnQuadratic(start, control, end, 0.5));
  const endNormal = getNormalFromTangent(tangentOnQuadratic(start, control, end, 0.92));

  return {
    start: { x: start.x + startNormal.x * offset, y: start.y + startNormal.y * offset },
    control: {
      x: control.x + midNormal.x * offset * 1.08,
      y: control.y + midNormal.y * offset * 1.08,
    },
    end: { x: end.x + endNormal.x * offset, y: end.y + endNormal.y * offset },
  };
}

function traceQuadraticCurve(ctx: CanvasRenderingContext2D, curve: CurveGeometry) {
  ctx.beginPath();
  ctx.moveTo(curve.start.x, curve.start.y);
  ctx.quadraticCurveTo(curve.control.x, curve.control.y, curve.end.x, curve.end.y);
}

function getVehicleLaneOffset(type: FlowType, index: number, isLiveTelemetry = false) {
  const baseOffset = type === 'passenger' ? -5.8 : 5.8;
  const laneSpread = type === 'passenger' ? 2.2 : 2.6;
  const groupOffset = ((index % 3) - 1) * laneSpread;
  const microOffset = isLiveTelemetry ? 0 : index % 2 === 0 ? -0.45 : 0.45;
  return baseOffset + groupOffset + microOffset;
}

function getVehicleDriftAmplitude(type: FlowType, index: number, isLiveTelemetry = false) {
  if (isLiveTelemetry) {
    return type === 'passenger' ? 0.42 : 0.56;
  }

  return type === 'passenger' ? 0.72 + (index % 2) * 0.16 : 0.92 + (index % 2) * 0.18;
}

function getVehicleRouteTarget(
  route: RouteState,
  vehicle: Vehicle,
  width: number,
  height: number,
  now: number,
) {
  const from = projectCity(route.from, width, height);
  const to = projectCity(route.to, width, height);
  const routeSeed = getRouteVisualSeed(route.id);
  const curve = getRouteCurve(from, to, route.congestion + route.lanes * 0.1, routeSeed);
  const control = { x: curve.cx, y: curve.cy };
  const point = pointOnQuadratic(from, control, to, vehicle.progress);
  const tangent = tangentOnQuadratic(from, control, to, vehicle.progress);
  const { x: normalX, y: normalY } = getNormalFromTangent(tangent);
  const standingWave = Math.sin(
    now * (vehicle.type === 'package' ? 0.00068 : 0.00082) +
      routeSeed * 0.91 +
      vehicle.driftPhase +
      vehicle.progress * Math.PI * (vehicle.type === 'package' ? 4.4 : 5),
  );
  const compressionWave = Math.cos(
    now * 0.0004 + routeSeed * 0.47 + route.congestion * 1.15 + vehicle.progress * Math.PI * 2.8,
  );
  const driftWeight = vehicle.isLiveTelemetry ? 0.34 : 1;
  const offset =
    vehicle.laneOffset +
    standingWave * vehicle.driftAmplitude * driftWeight +
    compressionWave *
      (vehicle.isLiveTelemetry ? 0.18 + route.congestion * 0.42 : 0.3 + route.congestion * 0.88);

  return {
    angle: Math.atan2(tangent.y, tangent.x),
    normalX,
    normalY,
    x: point.x + normalX * offset,
    y: point.y + normalY * offset,
  };
}

function getCanvasDpr(isCompactMobile: boolean) {
  if (typeof window === 'undefined') {
    return 1;
  }
  return Math.min(window.devicePixelRatio || 1, isCompactMobile ? 1.35 : 1.8);
}

function upsertMetaTag(name: string, content: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = name;
    meta.dataset.managedBy = 'mobility-os';
    document.head.appendChild(meta);
  }

  meta.content = content;
  return meta;
}

function demand(populationK: number, attractiveness: number, hour: number) {
  const morning = 1.8 * Math.exp(-0.5 * ((hour - 8) / 1.5) ** 2);
  const evening = 2 * Math.exp(-0.5 * ((hour - 18) / 1.5) ** 2);
  const freight = 0.55 * Math.exp(-0.5 * ((hour - 13) / 2.6) ** 2);
  return Math.log(populationK + 1) * attractiveness * Math.max(0.25, morning + evening + freight);
}

function trafficDensityRatio(density: number) {
  return clamp(density / TRAFFIC.JAM, 0, 0.98);
}

function speedFromDensity(density: number) {
  const densityRatio = trafficDensityRatio(density);
  const greenshieldsVelocity = TRAFFIC.FREE * (1 - densityRatio);
  const shockwaveLoss = 1 - densityRatio ** 1.45 * 0.44;
  const turbulenceLoss = 1 - densityRatio ** 2 * 0.12;
  return Math.max(18, greenshieldsVelocity * shockwaveLoss * turbulenceLoss);
}

function congestionFromDensity(density: number) {
  const densityRatio = trafficDensityRatio(density);
  return clamp(0.08 + densityRatio ** 1.22 * 0.9, 0.08, 0.98);
}

function corridorMomentum(route: Pick<RouteState, 'speedKph' | 'congestion'>) {
  const freeFlowRatio = clamp(route.speedKph / TRAFFIC.FREE, 0.18, 1);
  return clamp(freeFlowRatio * (1 - route.congestion * 0.34), 0.24, 1);
}

function lerpNumber(from: number, to: number, t: number) {
  return from + (to - from) * t;
}

function getRouteCompositeLoad(
  route: Pick<RouteState, 'passengerFlow' | 'packageFlow' | 'congestion' | 'lanes'>,
) {
  return (
    route.passengerFlow * 1.05 +
    route.packageFlow * 1.18 +
    route.congestion * 420 +
    route.lanes * 52
  );
}

function buildRouteVehicleQuota(routes: RouteState[], fleetSize: number) {
  if (fleetSize <= 0 || routes.length === 0) {
    return new Map<string, number>();
  }

  const minimumPerRoute = fleetSize >= routes.length * 2 ? 2 : 1;
  const quota = new Map(routes.map(route => [route.id, minimumPerRoute]));
  let remaining = Math.max(0, fleetSize - minimumPerRoute * routes.length);
  const weightedRoutes = routes.map(route => {
    const weight = Math.max(1, getRouteCompositeLoad(route));
    return { route, weight, fraction: 0, extra: 0 };
  });
  const totalWeight = weightedRoutes.reduce((sum, item) => sum + item.weight, 0);

  if (remaining > 0 && totalWeight > 0) {
    weightedRoutes.forEach(item => {
      const exactExtra = (item.weight / totalWeight) * remaining;
      item.extra = Math.floor(exactExtra);
      item.fraction = exactExtra - item.extra;
      quota.set(item.route.id, (quota.get(item.route.id) ?? 0) + item.extra);
    });

    remaining -= weightedRoutes.reduce((sum, item) => sum + item.extra, 0);

    weightedRoutes
      .slice()
      .sort((a, b) => b.fraction - a.fraction)
      .slice(0, remaining)
      .forEach(item => {
        quota.set(item.route.id, (quota.get(item.route.id) ?? 0) + 1);
      });
  }

  return quota;
}

function splitRouteVehicleMix(route: RouteState, quota: number) {
  if (quota <= 1) {
    return {
      passengerCount: route.passengerFlow >= route.packageFlow ? 1 : 0,
      packageCount: route.packageFlow > route.passengerFlow ? 1 : 0,
    };
  }

  const totalFlow = Math.max(1, route.passengerFlow + route.packageFlow);
  const passengerShare = clamp(route.passengerFlow / totalFlow, 0.26, 0.84);
  let passengerCount = clamp(Math.round(quota * passengerShare), 1, quota - 1);
  let packageCount = quota - passengerCount;

  if (route.packageFlow > route.passengerFlow * 0.22 && packageCount === 0) {
    passengerCount = Math.max(1, passengerCount - 1);
    packageCount = quota - passengerCount;
  }

  return { passengerCount, packageCount };
}

function createSyntheticVehicle(
  route: RouteState,
  type: FlowType,
  routeIndex: number,
  localIndex: number,
  quota: number,
) {
  const from = projectCity(route.from, BASE_W, BASE_H);
  const to = projectCity(route.to, BASE_W, BASE_H);
  const routeSeed = getRouteVisualSeed(route.id);
  const progress = ((localIndex + 0.5) / Math.max(1, quota) + routeSeed * 0.037) % 1;
  const curve = getRouteCurve(from, to, route.congestion + route.lanes * 0.1, routeSeed);
  const control = { x: curve.cx, y: curve.cy };
  const point = pointOnQuadratic(from, control, to, progress);
  const tangent = tangentOnQuadratic(from, control, to, progress);
  const packageVehicle = type === 'package';

  return {
    id: `modeled-${route.id}-${type}-${localIndex}`,
    routeId: route.id,
    type,
    progress,
    direction: (localIndex + routeIndex + routeSeed) % 2 === 0 ? (1 as const) : (-1 as const),
    speedFactor: packageVehicle
      ? 0.78 + ((localIndex + routeSeed) % 6) * 0.045
      : 0.92 + ((localIndex + routeSeed) % 5) * 0.05,
    x: point.x,
    y: point.y,
    angle: Math.atan2(tangent.y, tangent.x),
    velocityX: 0,
    velocityY: 0,
    laneOffset: getVehicleLaneOffset(type, localIndex + routeIndex * 3),
    driftAmplitude: getVehicleDriftAmplitude(type, localIndex + routeIndex * 3),
    driftPhase: routeIndex * 0.91 + localIndex * 0.63,
    passengers: packageVehicle ? undefined : 1 + ((localIndex + routeIndex) % 4),
    seatCapacity: packageVehicle ? undefined : 4 + ((localIndex + routeSeed) % 2),
    packageCapacity: packageVehicle ? 12 + ((localIndex + routeSeed) % 8) : undefined,
    packageLoad: packageVehicle ? 4 + ((localIndex + routeSeed) % 6) : undefined,
  } satisfies Vehicle;
}

function buildSyntheticVehicles(routes: RouteState[], fleetSize: number) {
  const quotaByRoute = buildRouteVehicleQuota(routes, fleetSize);

  return routes.flatMap((route, routeIndex) => {
    const quota = quotaByRoute.get(route.id) ?? 0;
    const { passengerCount, packageCount } = splitRouteVehicleMix(route, quota);
    const passengerVehicles = Array.from({ length: passengerCount }, (_, localIndex) =>
      createSyntheticVehicle(route, 'passenger', routeIndex, localIndex, quota),
    );
    const packageVehicles = Array.from({ length: packageCount }, (_, localIndex) =>
      createSyntheticVehicle(route, 'package', routeIndex, passengerCount + localIndex, quota),
    );
    return [...passengerVehicles, ...packageVehicles];
  });
}

function getSimulatedRouteDistance(distanceKm: number) {
  return Math.max(64, Math.pow(distanceKm, 0.86) * 3.8);
}

function buildModeledRouteState(
  route: RouteState,
  index: number,
  hour: number,
  selectedCityId: number,
  now: number,
  simulationStep: number,
) {
  const { from, to } = getRouteCities(route);
  const routeSeed = getRouteVisualSeed(route.id) + 1;
  const focusBoost = route.from === selectedCityId || route.to === selectedCityId ? 1.14 : 1;
  const hubBoost = from.isHub || to.isHub ? 1.06 : 0.96;
  const passengerWave =
    1 +
    Math.sin(now * 0.00016 + routeSeed * 1.13 + index * 0.72) * 0.08 +
    Math.cos(now * 0.00007 + route.distanceKm * 0.028) * 0.04;
  const packageWave =
    1 +
    Math.cos(now * 0.00012 + routeSeed * 0.61 + route.distanceKm * 0.018) * 0.12 +
    Math.sin(now * 0.00005 + index * 0.94) * 0.04;
  const passengerTarget = Math.min(
    route.lanes * 1900,
    (demand(from.populationK, from.attractiveness, hour) +
      demand(to.populationK, to.attractiveness, hour + 0.35)) *
      190 *
      focusBoost *
      hubBoost *
      passengerWave,
  );
  const packageTarget = Math.min(
    route.lanes * 900,
    (demand(from.populationK, from.attractiveness * 0.76, hour + 1.1) +
      demand(to.populationK, to.attractiveness * 0.7, hour + 1.6)) *
      90 *
      (from.isHub || to.isHub ? 1.08 : 0.98) *
      packageWave,
  );
  const densityTarget = clamp(
    10 +
      passengerTarget / 112 +
      packageTarget / 228 +
      Math.sin(now * 0.00022 + index * 0.65) * 3.4 +
      Math.cos(now * 0.0001 + routeSeed * 0.84) * 2.2 +
      route.lanes * 1.4,
    8,
    132,
  );
  const smoothing = clamp(0.08 * simulationStep, 0.06, 0.18);
  const passengerFlow = lerpNumber(route.passengerFlow, passengerTarget, smoothing);
  const packageFlow = lerpNumber(route.packageFlow, packageTarget, smoothing);
  const density = lerpNumber(route.density, densityTarget, smoothing * 0.9);
  const speedTarget = speedFromDensity(density);

  return {
    ...route,
    passengerFlow,
    packageFlow,
    density,
    speedKph: lerpNumber(route.speedKph, speedTarget, smoothing * 0.84),
    congestion: lerpNumber(
      route.congestion,
      congestionFromDensity(density),
      smoothing * 0.9,
    ),
  };
}

function initialRoutes(hour: number): RouteState[] {
  return ROUTES.map((route, index) => {
    const { from, to } = getRouteCities(route);
    const passengerFlow = Math.min(
      route.lanes * 1800,
      (demand(from.populationK, from.attractiveness, hour) +
        demand(to.populationK, to.attractiveness, hour + 0.35)) *
        190,
    );
    const packageFlow = Math.min(
      route.lanes * 820,
      (demand(from.populationK, from.attractiveness * 0.76, hour + 1.1) +
        demand(to.populationK, to.attractiveness * 0.7, hour + 1.6)) *
        88,
    );
    const density = 16 + passengerFlow / 110 + packageFlow / 230 + index * 1.2;
    return {
      ...route,
      passengerFlow,
      packageFlow,
      density,
      speedKph: speedFromDensity(density),
      congestion: congestionFromDensity(density),
    };
  });
}

function buildVehicleFleet(
  routes: RouteState[],
  liveVehicles: LiveMobilityVehicleSnapshot[] = [],
): Vehicle[] {
  const liveTelemetryVehicles = liveVehicles
    .map((vehicle, index): Vehicle | null => {
      const route = routes.find(item => item.id === vehicle.routeId);
      if (!route) return null;
      const from = projectCity(route.from, BASE_W, BASE_H);
      const to = projectCity(route.to, BASE_W, BASE_H);
      const livePoint = project(vehicle.lat, vehicle.lng, BASE_W, BASE_H);
      return {
        id: vehicle.id,
        routeId: route.id,
        type: vehicle.type,
        progress: 0,
        direction: 1 as const,
        speedFactor: 1,
        x: livePoint.x,
        y: livePoint.y,
        angle: Math.atan2(to.y - from.y, to.x - from.x),
        velocityX: 0,
        velocityY: 0,
        laneOffset: getVehicleLaneOffset(vehicle.type, index, true),
        driftAmplitude: getVehicleDriftAmplitude(vehicle.type, index, true),
        driftPhase: index * 0.71,
        passengers: vehicle.passengers,
        seatCapacity: vehicle.seatCapacity,
        packageCapacity: vehicle.packageCapacity,
        packageLoad: vehicle.packageLoad,
        liveLat: vehicle.lat,
        liveLng: vehicle.lng,
        isLiveTelemetry: true,
        freshness: vehicle.fresh ? 'fresh' : 'stale',
      };
    })
    .filter((vehicle): vehicle is Vehicle => vehicle !== null);

  if (!allowSyntheticData()) {
    return liveTelemetryVehicles;
  }

  const syntheticVehicles = buildSyntheticVehicles(
    routes,
    Math.max(0, TARGET_VEHICLES - liveTelemetryVehicles.length),
  );
  return [...liveTelemetryVehicles, ...syntheticVehicles];
}

function hasLiveRouteSignal(
  liveRoute: LiveMobilityRouteSnapshot | undefined,
): liveRoute is LiveMobilityRouteSnapshot {
  if (!liveRoute) return false;
  return (
    liveRoute.passengerFlow > 0 ||
    liveRoute.packageFlow > 0 ||
    liveRoute.density > 0 ||
    liveRoute.speedKph > 0 ||
    liveRoute.congestion > 0
  );
}

function mergeRouteStateWithLiveData(
  modeledRoute: RouteState,
  liveRoute: LiveMobilityRouteSnapshot | undefined,
) {
  if (!hasLiveRouteSignal(liveRoute)) {
    return modeledRoute;
  }

  return {
    ...modeledRoute,
    passengerFlow:
      liveRoute.passengerFlow > 0 ? liveRoute.passengerFlow : modeledRoute.passengerFlow,
    packageFlow: liveRoute.packageFlow > 0 ? liveRoute.packageFlow : modeledRoute.packageFlow,
    density: Math.max(modeledRoute.density * 0.72, liveRoute?.density ?? 0),
    speedKph: liveRoute.speedKph > 0 ? liveRoute.speedKph : modeledRoute.speedKph,
    congestion: liveRoute?.congestion ?? modeledRoute.congestion,
  };
}

function buildDispatchAction(topRoute: RouteState, selectedCityId: number, ar: boolean) {
  const topRouteCities = getRouteCities(topRoute);
  const selectedCity = getCityOrThrow(selectedCityId);
  if (topRoute.congestion > 0.78) {
    return ar
      ? `????? ????? ????? ?????? ${getCityLabel(topRouteCities.to, ar)}`
      : `Reposition supply toward ${getCityLabel(topRouteCities.to, ar)}`;
  }

  return ar
    ? `?????? ????? ??? ${getCityLabel(selectedCity, ar)}`
    : `Balance supply around ${getCityLabel(selectedCity, ar)}`;
}

function buildModeledAnalytics(
  routes: RouteState[],
  vehicles: Vehicle[],
  selectedCityId: number,
  ar: boolean,
  signalSource: Exclude<MetricSource, 'live'> = 'modeled',
): Analytics {
  const telemetryVehicles = vehicles.filter(vehicle => vehicle.isLiveTelemetry);
  const analyticsVehicles = telemetryVehicles.length > 0 ? telemetryVehicles : vehicles;
  const fleetSource: Exclude<MetricSource, 'live'> =
    telemetryVehicles.length > 0 ? 'hybrid' : signalSource;
  const passengerVehicles = analyticsVehicles.filter(vehicle => vehicle.type === 'passenger');
  const packageVehicles = analyticsVehicles.filter(vehicle => vehicle.type === 'package');
  const activePassengers = passengerVehicles.reduce(
    (sum, vehicle) => sum + (vehicle.passengers ?? 0),
    0,
  );
  const seatCapacity = passengerVehicles.reduce(
    (sum, vehicle) => sum + (vehicle.seatCapacity ?? 0),
    0,
  );
  const packageCapacity = packageVehicles.reduce(
    (sum, vehicle) => sum + ((vehicle.packageCapacity ?? 0) - (vehicle.packageLoad ?? 0)),
    0,
  );
  const avgSpeed =
    routes.reduce((sum, route) => sum + route.speedKph, 0) / Math.max(routes.length, 1);
  const congestionLevel =
    routes.reduce((sum, route) => sum + route.congestion, 0) / Math.max(routes.length, 1);
  const topRoute = routes
    .slice()
    .sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow))[0];

  const recommendedPath = optimalPath(routes, selectedCityId, 1)
    .map(id => {
      const city = cityMap.get(id);
      return city ? getCityLabel(city, ar) : '';
    })
    .join(ar ? ' ? ' : ' -> ');

  if (!topRoute) {
    return {
      totalVehicles: analyticsVehicles.length,
      activePassengers,
      activePackages: packageVehicles.reduce((sum, vehicle) => sum + (vehicle.packageLoad ?? 0), 0),
      seatAvailability: Math.max(0, seatCapacity - activePassengers),
      packageCapacity: Math.max(0, packageCapacity),
      avgSpeed,
      networkUtilization: analyticsVehicles.length / (TARGET_VEHICLES * 1.15),
      congestionLevel,
      topCorridor: '',
      recommendedPath,
      dispatchAction: ar ? '?????? ?????' : 'Balance supply',
      sources: {
        totalVehicles: fleetSource,
        activePassengers: fleetSource,
        activePackages: fleetSource,
        seatAvailability: fleetSource,
        packageCapacity: fleetSource,
        avgSpeed: signalSource,
        networkUtilization: fleetSource,
        congestionLevel: signalSource,
        topCorridor: signalSource,
        recommendedPath: signalSource,
        dispatchAction: signalSource,
      },
    };
  }

  const topRouteCities = getRouteCities(topRoute);

  return {
    totalVehicles: analyticsVehicles.length,
    activePassengers,
    activePackages: packageVehicles.reduce((sum, vehicle) => sum + (vehicle.packageLoad ?? 0), 0),
    seatAvailability: Math.max(0, seatCapacity - activePassengers),
    packageCapacity: Math.max(0, packageCapacity),
    avgSpeed,
    networkUtilization: analyticsVehicles.length / (TARGET_VEHICLES * 1.15),
    congestionLevel,
    topCorridor: `${getCityLabel(topRouteCities.from, ar)}${ar ? ' ? ' : ' -> '}${getCityLabel(topRouteCities.to, ar)}`,
    recommendedPath,
    dispatchAction: buildDispatchAction(topRoute, selectedCityId, ar),
    sources: {
      totalVehicles: fleetSource,
      activePassengers: fleetSource,
      activePackages: fleetSource,
      seatAvailability: fleetSource,
      packageCapacity: fleetSource,
      avgSpeed: signalSource,
      networkUtilization: fleetSource,
      congestionLevel: signalSource,
      topCorridor: signalSource,
      recommendedPath: signalSource,
      dispatchAction: signalSource,
    },
  };
}

function mergeLiveAnalyticsWithModel(
  modeledAnalytics: Analytics,
  liveSnapshot: LiveMobilitySnapshot | null | undefined,
): Analytics {
  if (!liveSnapshot) {
    return modeledAnalytics;
  }

  const { analytics: liveAnalytics, telemetry } = liveSnapshot;
  const hasLivePassengers = liveAnalytics.activePassengers > 0;
  const hasLivePackages = liveAnalytics.activePackages > 0;
  const hasLiveCapacity =
    liveAnalytics.seatAvailability > 0 ||
    liveAnalytics.packageCapacity > 0 ||
    liveAnalytics.totalVehicles > 0;
  const hasLiveTraffic =
    liveAnalytics.avgSpeed > 0 || liveAnalytics.congestionLevel > 0 || liveSnapshot.traffic.enabled;
  const hasLiveDemandSignal =
    hasLivePassengers || hasLivePackages || telemetry.freshTripsWithTelemetry > 0;

  return {
    totalVehicles:
      liveAnalytics.totalVehicles > 0
        ? liveAnalytics.totalVehicles
        : modeledAnalytics.totalVehicles,
    activePassengers: hasLivePassengers
      ? liveAnalytics.activePassengers
      : modeledAnalytics.activePassengers,
    activePackages: hasLivePackages
      ? liveAnalytics.activePackages
      : modeledAnalytics.activePackages,
    seatAvailability: hasLiveCapacity
      ? liveAnalytics.seatAvailability
      : modeledAnalytics.seatAvailability,
    packageCapacity: hasLiveCapacity
      ? liveAnalytics.packageCapacity
      : modeledAnalytics.packageCapacity,
    avgSpeed: hasLiveTraffic ? liveAnalytics.avgSpeed : modeledAnalytics.avgSpeed,
    networkUtilization:
      liveAnalytics.networkUtilization > 0
        ? liveAnalytics.networkUtilization
        : modeledAnalytics.networkUtilization,
    congestionLevel: hasLiveTraffic
      ? liveAnalytics.congestionLevel
      : modeledAnalytics.congestionLevel,
    topCorridor:
      hasLiveDemandSignal && liveAnalytics.topCorridor
        ? liveAnalytics.topCorridor
        : modeledAnalytics.topCorridor,
    recommendedPath: modeledAnalytics.recommendedPath,
    dispatchAction:
      hasLiveDemandSignal && liveAnalytics.dispatchAction
        ? liveAnalytics.dispatchAction
        : modeledAnalytics.dispatchAction,
    sources: {
      totalVehicles:
        liveAnalytics.totalVehicles > 0 ? 'live' : modeledAnalytics.sources.totalVehicles,
      activePassengers: hasLivePassengers ? 'live' : modeledAnalytics.sources.activePassengers,
      activePackages: hasLivePackages ? 'live' : modeledAnalytics.sources.activePackages,
      seatAvailability: hasLiveCapacity ? 'live' : modeledAnalytics.sources.seatAvailability,
      packageCapacity: hasLiveCapacity ? 'live' : modeledAnalytics.sources.packageCapacity,
      avgSpeed: hasLiveTraffic ? 'live' : modeledAnalytics.sources.avgSpeed,
      networkUtilization:
        liveAnalytics.networkUtilization > 0
          ? 'live'
          : modeledAnalytics.sources.networkUtilization,
      congestionLevel: hasLiveTraffic ? 'live' : modeledAnalytics.sources.congestionLevel,
      topCorridor:
        hasLiveDemandSignal && liveAnalytics.topCorridor
          ? 'live'
          : modeledAnalytics.sources.topCorridor,
      recommendedPath: modeledAnalytics.sources.recommendedPath,
      dispatchAction:
        hasLiveDemandSignal && liveAnalytics.dispatchAction
          ? 'live'
          : modeledAnalytics.sources.dispatchAction,
    },
  };
}

function hasMeaningfulLiveDemand(snapshot: LiveMobilitySnapshot | null | undefined) {
  if (!snapshot) return false;
  return (
    snapshot.analytics.activePassengers > 0 ||
    snapshot.analytics.activePackages > 0 ||
    snapshot.telemetry.freshTripsWithTelemetry > 0
  );
}

function matchesRouteLens(
  route: Pick<RouteState, 'passengerFlow' | 'packageFlow' | 'congestion'>,
  lens: RouteLens,
) {
  switch (lens) {
    case 'rides':
      return route.passengerFlow >= route.packageFlow * 1.08;
    case 'parcels':
      return route.packageFlow >= route.passengerFlow * 0.62;
    case 'stress':
      return route.congestion >= 0.72;
    default:
      return true;
  }
}

function optimalPath(routes: RouteState[], start: number, end: number) {
  const graph = new Map<number, { to: number; weight: number }[]>();
  routes.forEach(route => {
    const weight = route.distanceKm * (1 + route.congestion);
    graph.set(route.from, [...(graph.get(route.from) ?? []), { to: route.to, weight }]);
    graph.set(route.to, [...(graph.get(route.to) ?? []), { to: route.from, weight }]);
  });
  const dist = new Map<number, number>();
  const prev = new Map<number, number | null>();
  const unvisited = new Set<number>(graph.keys());
  graph.forEach((_, node) => {
    dist.set(node, Infinity);
    prev.set(node, null);
  });
  dist.set(start, 0);
  while (unvisited.size) {
    let current: number | null = null;
    let currentDist = Infinity;
    unvisited.forEach(node => {
      const value = dist.get(node) ?? Infinity;
      if (value < currentDist) {
        current = node;
        currentDist = value;
      }
    });
    if (current === null || current === end) break;
    unvisited.delete(current);
    (graph.get(current) ?? []).forEach(edge => {
      if (!unvisited.has(edge.to)) return;
      const next = currentDist + edge.weight;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, current);
      }
    });
  }
  const path: number[] = [];
  let cursor: number | null = end;
  while (cursor !== null) {
    path.unshift(cursor);
    cursor = prev.get(cursor) ?? null;
  }
  return path[0] === start ? path : [start, end];
}

export default function MobilityOSCore() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const { snapshot: liveSnapshot } = useMobilityOSLiveData(ar);
  const hasActiveLiveDemand = hasMeaningfulLiveDemand(liveSnapshot);
  const copy = {
    ...createMobilityOSCopy(ar),
    heroBody: ar
      ? '???? ??? ????? ??? ?????? ?????? ????? ??????? ??????? ????? ?? ??? ???? ??? ??????? ???????? ????????? ??????? ?? ???????.'
      : 'This surface combines official reference data with a live route model so teams can compare corridor pressure, capacity, and recommended next actions in one place.',
    controlState: ar ? '???? ????????' : 'Network state',
    liveSync: ar ? '?????? ??????' : 'Live route model',
    actionableOutputs: ar ? '?????? ??????? ?? ???????' : 'Recommended next actions',
    mapBody: ar
      ? '?????? ???? ???? ?????? ??????? ???? ???? ??????. ?????? ?????? ???????? ??????? ??????? ??? ?????? ???????? ????? ???????? ???????? ???????? ?????? ?? ?????? ??????.'
      : 'Mint is passenger flow and teal is package flow. Vehicle movement, corridor pressure, and route recommendations come from the live model, while population data comes from the official reference source.',
    liveMesh: ar ? '?????? ???????? ?????? ????? 60 ????/?' : 'Live network feed',
    officialUnit: ar ? '?????? ???????? ???????' : 'Official administrative unit',
    officialPopulation2025: ar ? '????? ?????? ?????? 2025' : 'Official 2025 population estimate',
    modelRecommendation: ar ? '????? ?????? ?? ???????' : 'Best route now',
    sourceJordanDos: ar
      ? '??????: ????? ????????? ?????? ????????? ??????? 2025'
      : 'Source: Jordan Department of Statistics, 2025 estimates',
    simulationTag: ar ? '??????' : 'Model',
    estimateTag: ar ? '??????' : 'Modelled',
    officialTag: ar ? '????' : 'Reference',
    modeledTag: ar ? '?? ???????' : 'Modeled',
    simulationNotice: ar
      ? '?? ?????? ?????? ?????? ?????? ????? ????? ?? ????? ?????? ???.'
      : 'Movement, capacity, and pressure metrics below come from the live route model.',
    corridorDeckBody: ar
      ? '????? ?????? ??????? ??? ????? ?????? ?????? ???????? ?????????? ???? ??????? ?? ???? ????? ?????.'
      : 'A model-based ranking of corridors using flow, pressure, and operating efficiency.',
    routeIntelligence: ar ? '????? ??????' : 'Route recommendation',
    selectedNode: ar ? '???? ??????? ???????' : 'Selected city reference',
  };
  const liveTag = ar ? '?????' : 'Live';
  const liveOpsTag = 'Live ops';
  const hybridTag = 'Hybrid';
  const telemetryFreshLabel = 'Fresh telemetry';
  const telemetryStaleLabel = 'Stale telemetry';
  const telemetryNoneLabel = 'No telemetry';
  const sourceMatrixBody = ar
    ? 'Passengers and packages come from live trip records. Speed and pressure remain estimated until a true traffic source is connected. Route guidance is produced by the optimization model.'
    : 'Passengers and packages come from live trip records. Speed and pressure remain estimated until a true traffic source is connected. Route guidance is produced by the optimization model.';
  const telemetryHeartbeatLabel = 'Latest heartbeat';
  const telemetryCoverageLabel = 'Telemetry coverage';
  const realtimeVerifiedLabel = 'Verified live';
  const estimatedFromLoadLabel = 'Estimated from load';
  void realtimeVerifiedLabel;
  const getOperationalSourceTag = (source: MetricSource) => {
    switch (source) {
      case 'live':
        return liveOpsTag;
      case 'hybrid':
        return hybridTag;
      default:
        return copy.simulationTag;
    }
  };
  const getSignalSourceTag = (source: MetricSource) => {
    switch (source) {
      case 'live':
        return liveTag;
      case 'hybrid':
        return hybridTag;
      default:
        return copy.modeledTag;
    }
  };
  const getTrafficSourceTag = (source: MetricSource) => {
    switch (source) {
      case 'live':
        return liveTag;
      case 'hybrid':
        return hybridTag;
      default:
        return estimatedFromLoadLabel;
    }
  };
  const numberFormatter = useMemo(() => new Intl.NumberFormat(ar ? 'ar-JO' : 'en-US'), [ar]);
  const dateTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(ar ? 'ar-JO' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [ar],
  );
  const [paused, setPaused] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(8);
  const [selectedCityId, setSelectedCityId] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('command');
  const [routeLens, setRouteLens] = useState<RouteLens>('all');
  const [analytics, setAnalytics] = useState<Analytics>(() => {
    const seededRoutes = initialRoutes(8);
    return buildModeledAnalytics(seededRoutes, buildVehicleFleet(seededRoutes), 0, ar, 'modeled');
  });
  const [routeSnapshot, setRouteSnapshot] = useState<RouteState[]>(() => initialRoutes(8));
  const [commercialSnapshot, setCommercialSnapshot] = useState<CorridorCommercialSnapshot | null>(
    null,
  );
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 768,
  );
  const isCompactMobile = isMobile;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  const insightSectionRef = useRef<HTMLElement | null>(null);
  const corridorSectionRef = useRef<HTMLElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const analyticsTickRef = useRef(0);
  const phaseRef = useRef(0);
  const lastDrawTimeRef = useRef(0);
  const canvasMetricsRef = useRef({ width: 0, height: 0, dpr: 0 });
  const prefersReducedMotionRef = useRef(false);
  const staticSceneModeRef = useRef(false);
  const mapVisibleRef = useRef(true);
  const documentVisibleRef = useRef(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  );
  const interactionActiveRef = useRef(false);
  const interactionTimeoutRef = useRef<number | null>(null);
  const routesRef = useRef<RouteState[]>(initialRoutes(8));
  const vehiclesRef = useRef<Vehicle[]>(
    buildVehicleFleet(routesRef.current, liveSnapshot?.vehicles ?? []),
  );
  const starsRef = useRef<Star[]>(
    Array.from({ length: 90 }, (_, index) => ({
      x: ((index * 37) % 100) / 100,
      y: ((index * 19) % 100) / 100,
      size: index % 7 === 0 ? 2.2 : 1.1,
      alpha: 0.14 + (index % 9) * 0.028,
      drift: 0.4 + (index % 6) * 0.12,
    })),
  );
  const liveRouteOverrides = useMemo(
    () => new Map((liveSnapshot?.routes ?? []).map(route => [route.routeId, route])),
    [liveSnapshot],
  );
  const telemetryStatus = liveSnapshot?.telemetry.freshTripsWithTelemetry
    ? telemetryFreshLabel
    : liveSnapshot?.telemetry.staleTripsWithTelemetry
      ? telemetryStaleLabel
      : telemetryNoneLabel;
  const telemetryTone = liveSnapshot?.telemetry.freshTripsWithTelemetry
    ? C.green
    : liveSnapshot?.telemetry.staleTripsWithTelemetry
      ? C.orange
      : C.textMuted;
  const latestHeartbeatValue = liveSnapshot?.telemetry.latestHeartbeatAt
    ? dateTimeFormatter.format(new Date(liveSnapshot.telemetry.latestHeartbeatAt))
    : 'Unavailable';
  const selectedCity = getCityOrThrow(selectedCityId);
  const liveUpdatedAtValue = liveSnapshot?.updatedAt
    ? dateTimeFormatter.format(new Date(liveSnapshot.updatedAt))
    : ar
      ? '???? ?????'
      : 'Modeled';
  const telemetryTotalTrips = liveSnapshot?.telemetry.totalTripsWithTelemetry ?? 0;
  const telemetryFreshTrips = liveSnapshot?.telemetry.freshTripsWithTelemetry ?? 0;
  const telemetryCoveragePercent = telemetryTotalTrips
    ? Math.round((telemetryFreshTrips / telemetryTotalTrips) * 100)
    : 0;
  const signalConfidence = Math.round(
    clamp(
      (hasActiveLiveDemand ? 58 : 42) +
        (liveSnapshot?.traffic.enabled ? 14 : 0) +
        telemetryCoveragePercent * 0.16 +
        (liveSnapshot?.telemetry.hasRenderableLocations ? 1 : 0) * 10 +
        Math.round(clamp(analytics.avgSpeed / 10, 0, 9)),
      42,
      97,
    ),
  );
  const confidenceTone =
    signalConfidence >= 84 ? C.green : signalConfidence >= 68 ? C.cyan : C.orange;
  const telemetrySummary =
    telemetryTotalTrips > 0
      ? `${numberFormatter.format(telemetryFreshTrips)} / ${numberFormatter.format(telemetryTotalTrips)}`
      : ar
        ? '?? ???????'
        : 'Model only';
  const trafficState = liveSnapshot?.traffic.enabled
    ? ar
      ? `Google Routes · ${numberFormatter.format(liveSnapshot.traffic.liveCorridors)}`
      : `Google Routes · ${liveSnapshot.traffic.liveCorridors} live`
    : ar
      ? '???? ??????'
      : 'Modeled traffic';
  const liveModeSummary = hasActiveLiveDemand
    ? liveSnapshot?.traffic.enabled
      ? ar
        ? '?? + ???? + ???'
        : 'Live + telemetry + traffic'
      : ar
        ? '?? + ????'
        : 'Live + modeled traffic'
    : ar
      ? '????? ?????'
      : 'Modeled continuity';
  const mapA11ySummary = ar
    ? `????? ?????? ??????? ????? ????? ?? ${getCityLabel(selectedCity, ar)}. ?????? ??????? ${analytics.topCorridor || ''}. ????? ??????? ${analytics.dispatchAction || ''}. ???? ??????? ${telemetryStatus}.`
    : `Live Jordan operations map centered on ${getCityLabel(selectedCity, ar)}. Top corridor ${analytics.topCorridor || 'not available'}. Dispatch action ${analytics.dispatchAction || 'not available'}. Telemetry status ${telemetryStatus}.`;

  useEffect(() => {
    const title = ar ? 'نظام التنقل | واصل' : 'Mobility OS | Wasel';
    const description = ar
      ? 'سطح تشغيل حي يوضح ضغط المسارات وسرعة الحركة وسعة الطرود عبر شبكة الأردن.'
      : 'A live operations surface for Jordan route pressure, movement speed, package capacity, and next-best corridor actions.';
    const previousTitle = document.title;
    const previousDescription =
      document.querySelector('meta[name="description"]')?.getAttribute('content') ?? '';

    document.title = title;
    upsertMetaTag('description', description);

    return () => {
      document.title = previousTitle;
      const meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!meta) {
        return;
      }
      if (meta.dataset.managedBy === 'mobility-os' && previousDescription.length === 0) {
        meta.remove();
        return;
      }
      meta.content = previousDescription;
    };
  }, [ar]);

  useEffect(() => {
    if (isCompactMobile) {
      setCommercialSnapshot(null);
      return undefined;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      void buildCorridorCommercialSnapshot()
        .then(snapshot => {
          if (!cancelled) {
            startTransition(() => {
              setCommercialSnapshot(snapshot);
            });
          }
        })
        .catch(() => {
          if (!cancelled) setCommercialSnapshot(null);
        });
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [isCompactMobile]);

  const scrollToSection = useCallback((targetRef: RefObject<HTMLElement | null>) => {
    targetRef.current?.scrollIntoView({
      behavior: prefersReducedMotionRef.current ? 'auto' : 'smooth',
      block: 'start',
    });
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = Math.max(320, Math.floor(wrap.clientWidth));
    const minH = window.innerWidth < 768 ? 220 : 440;
    const height = Math.max(minH, Math.floor(wrap.clientHeight || width / HERO_MAP_ASPECT));
    const dpr = getCanvasDpr(isCompactMobile);
    if (
      canvasMetricsRef.current.width === width &&
      canvasMetricsRef.current.height === height &&
      canvasMetricsRef.current.dpr === dpr
    ) {
      return;
    }
    canvasMetricsRef.current = { width, height, dpr };
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, [isCompactMobile]);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = getCanvasDpr(isCompactMobile);
    const reducedEffects =
      isCompactMobile ||
      interactionActiveRef.current ||
      prefersReducedMotionRef.current ||
      staticSceneModeRef.current;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const phase = phaseRef.current;
    const palette = hourPalette(timeOfDay);
    const routeTopN = reducedEffects ? 2 : 3;
    const showMapChrome = !reducedEffects;
    const operationalViewport = getOperationalViewport(width, height);
    const stageLeft = width >= 860 ? operationalViewport.left - width * 0.035 : width * 0.06;
    const stageRight = width >= 860 ? width * 0.975 : width * 0.96;
    const stageWidth = stageRight - stageLeft;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, viewMode === 'satellite' ? '#08111a' : palette.top);
    bg.addColorStop(0.55, viewMode === 'pulse' ? '#140f1d' : '#091624');
    bg.addColorStop(1, viewMode === 'satellite' ? '#102234' : palette.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    const skyRibbon = ctx.createLinearGradient(0, 0, width, height * 0.32);
    skyRibbon.addColorStop(0, 'rgba(255,255,255,0.02)');
    skyRibbon.addColorStop(0.5, palette.glow);
    skyRibbon.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = skyRibbon;
    ctx.fillRect(0, 0, width, height * 0.38);
    const atmosphere = ctx.createRadialGradient(
      width * 0.2,
      height * 0.18,
      0,
      width * 0.2,
      height * 0.18,
      width * 0.5,
    );
    atmosphere.addColorStop(
      0,
      viewMode === 'pulse' ? 'rgba(167,124,255,0.16)' : 'rgba(101,225,255,0.16)',
    );
    atmosphere.addColorStop(
      0.35,
      viewMode === 'pulse' ? 'rgba(167,124,255,0.08)' : 'rgba(101,225,255,0.06)',
    );
    atmosphere.addColorStop(1, 'rgba(101,225,255,0)');
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);
    const amberGlow = ctx.createRadialGradient(
      width * 0.78,
      height * 0.82,
      0,
      width * 0.78,
      height * 0.82,
      width * 0.42,
    );
    amberGlow.addColorStop(
      0,
      viewMode === 'satellite' ? 'rgba(220,255,248,0.08)' : 'rgba(169,227,255,0.14)',
    );
    amberGlow.addColorStop(1, 'rgba(169,227,255,0)');
    ctx.fillStyle = amberGlow;
    ctx.fillRect(0, 0, width, height);
    const polarAurora = ctx.createRadialGradient(
      width * 0.72,
      height * 0.1,
      0,
      width * 0.72,
      height * 0.1,
      width * 0.38,
    );
    polarAurora.addColorStop(
      0,
      viewMode === 'satellite' ? 'rgba(220,255,248,0.08)' : 'rgba(101,225,255,0.08)',
    );
    polarAurora.addColorStop(0.45, 'rgba(255,255,255,0.03)');
    polarAurora.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = polarAurora;
    ctx.fillRect(0, 0, width, height);
    const celestialX = width * (0.28 + (timeOfDay / 23) * 0.44);
    const celestialY =
      timeOfDay >= 6 && timeOfDay <= 18
        ? height * (0.18 + Math.abs(12 - timeOfDay) * 0.012)
        : height * 0.18;
    const isDay = timeOfDay >= 6 && timeOfDay <= 18;
    const celestial = ctx.createRadialGradient(
      celestialX,
      celestialY,
      0,
      celestialX,
      celestialY,
      isDay ? 42 : 30,
    );
    celestial.addColorStop(0, isDay ? 'rgba(220,255,248,0.46)' : 'rgba(222,238,255,0.4)');
    celestial.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = celestial;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, isDay ? 42 : 30, 0, Math.PI * 2);
    ctx.fill();
    if (!isDay) {
      ctx.beginPath();
      ctx.arc(celestialX, celestialY, 12, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(236,245,255,0.95)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(celestialX + 4, celestialY - 2, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#071423';
      ctx.fill();
    }
    const energyRibbon = ctx.createLinearGradient(
      -width * 0.1 + Math.sin(phase * 0.00035) * 140,
      0,
      width * 0.65 + Math.sin(phase * 0.00035) * 140,
      height,
    );
    energyRibbon.addColorStop(0, 'rgba(255,255,255,0)');
    energyRibbon.addColorStop(0.35, 'rgba(101,225,255,0.03)');
    energyRibbon.addColorStop(0.55, 'rgba(255,255,255,0.045)');
    energyRibbon.addColorStop(0.7, 'rgba(169,227,255,0.028)');
    energyRibbon.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = energyRibbon;
    ctx.fillRect(0, 0, width, height);

    const floorGlow = ctx.createLinearGradient(0, height * 0.58, 0, height);
    floorGlow.addColorStop(0, 'rgba(255,255,255,0)');
    floorGlow.addColorStop(0.55, 'rgba(0,0,0,0.08)');
    floorGlow.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = floorGlow;
    ctx.fillRect(0, height * 0.52, width, height * 0.48);
    const horizonShelf = ctx.createLinearGradient(0, height * 0.66, 0, height);
    horizonShelf.addColorStop(0, 'rgba(101,225,255,0)');
    horizonShelf.addColorStop(0.5, 'rgba(101,225,255,0.06)');
    horizonShelf.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = horizonShelf;
    ctx.fillRect(0, height * 0.62, width, height * 0.25);
    const stageTop = height * 0.69;
    const vanishingX =
      stageLeft + stageWidth * (0.52 + Math.sin(phase * 0.00012) * (width >= 860 ? 0.02 : 0.03));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(stageLeft, stageTop);
    ctx.lineTo(stageRight, stageTop);
    ctx.lineTo(stageRight + width * 0.04, height);
    ctx.lineTo(stageLeft - width * 0.08, height);
    ctx.closePath();
    const stageFill = ctx.createLinearGradient(0, stageTop, 0, height);
    stageFill.addColorStop(0, 'rgba(12,24,36,0.72)');
    stageFill.addColorStop(0.42, 'rgba(9,18,28,0.86)');
    stageFill.addColorStop(1, 'rgba(3,8,14,0.98)');
    ctx.fillStyle = stageFill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,255,248,0.04)';
    ctx.lineWidth = 1;
    for (let line = 0; line < 12; line += 1) {
      const startX = stageLeft + line * (stageWidth / 11);
      const endX = vanishingX + (line - 5.5) * stageWidth * 0.028;
      ctx.beginPath();
      ctx.moveTo(startX, height);
      ctx.lineTo(endX, stageTop);
      ctx.stroke();
    }
    for (let row = 0; row < 7; row += 1) {
      const y = stageTop + ((row + 1) / 8) ** 1.75 * (height - stageTop);
      const inset = row * 8;
      ctx.beginPath();
      ctx.moveTo(stageLeft + inset, y);
      ctx.lineTo(stageRight - inset, y);
      ctx.strokeStyle = `rgba(169,227,255,${0.055 - row * 0.005})`;
      ctx.stroke();
    }
    ctx.restore();

    starsRef.current
      .slice(0, reducedEffects ? 18 : starsRef.current.length)
      .forEach((star, index) => {
        const x = star.x * width + Math.sin(phase * 0.4 + index) * 2;
        const y = ((star.y + phase * 0.0008 * star.drift) % 1) * height;
        ctx.beginPath();
        ctx.arc(x, y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${star.alpha + Math.sin(phase * 0.8 + index) * 0.04})`;
        ctx.fill();
      });

    if (!reducedEffects) {
      ctx.save();
      ctx.strokeStyle =
        viewMode === 'satellite' ? 'rgba(220,255,248,0.03)' : 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 34) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.strokeStyle = viewMode === 'pulse' ? 'rgba(167,124,255,0.04)' : 'rgba(101,225,255,0.026)';
      for (let x = -height; x < width; x += 58) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + height * 0.8, height);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.beginPath();
    BORDER.forEach((point, index) => {
      const p = project(point.lat, point.lon, width, height);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    const landFill = ctx.createLinearGradient(width * 0.2, 0, width * 0.82, height);
    landFill.addColorStop(0, 'rgba(10,22,35,0.92)');
    landFill.addColorStop(0.58, 'rgba(9,18,28,0.97)');
    landFill.addColorStop(1, 'rgba(16,35,50,0.98)');
    ctx.fillStyle = landFill;
    ctx.strokeStyle = 'rgba(220,255,248,0.1)';
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 46;
    ctx.shadowColor = 'rgba(0,0,0,0.38)';
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.clip();
    const terrain = ctx.createLinearGradient(
      width * 0.18,
      height * 0.1,
      width * 0.85,
      height * 0.92,
    );
    terrain.addColorStop(0, 'rgba(220,255,248,0.08)');
    terrain.addColorStop(0.45, 'rgba(255,255,255,0.015)');
    terrain.addColorStop(1, 'rgba(169,227,255,0.08)');
    ctx.fillStyle = terrain;
    ctx.fillRect(0, 0, width, height);
    const reliefWash = ctx.createLinearGradient(
      width * 0.25,
      height * 0.12,
      width * 0.78,
      height * 0.9,
    );
    reliefWash.addColorStop(0, 'rgba(255,255,255,0.02)');
    reliefWash.addColorStop(0.4, 'rgba(101,225,255,0.04)');
    reliefWash.addColorStop(1, 'rgba(169,227,255,0.04)');
    ctx.fillStyle = reliefWash;
    ctx.fillRect(0, 0, width, height);
    for (let ridge = 0; ridge < (reducedEffects ? 2 : 5); ridge += 1) {
      ctx.beginPath();
      const yOffset = height * (0.18 + ridge * 0.14);
      ctx.moveTo(width * 0.12, yOffset);
      ctx.bezierCurveTo(
        width * 0.28,
        yOffset - 20 + ridge * 3,
        width * 0.52,
        yOffset + 26 - ridge * 5,
        width * 0.9,
        yOffset - 8 + ridge * 4,
      );
      ctx.strokeStyle = `rgba(255,255,255,${0.028 - ridge * 0.003})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let contour = 0; contour < (reducedEffects ? 4 : 10); contour += 1) {
      ctx.beginPath();
      const yOffset = height * (0.12 + contour * 0.075);
      ctx.moveTo(width * 0.08, yOffset);
      ctx.bezierCurveTo(
        width * 0.24,
        yOffset + 18 - contour * 0.8,
        width * 0.56,
        yOffset - 16 + contour * 1.2,
        width * 0.92,
        yOffset + 8,
      );
      ctx.strokeStyle = `rgba(255,255,255,${0.02 - contour * 0.0013})`;
      ctx.lineWidth = contour % 2 === 0 ? 0.8 : 0.55;
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    BORDER.forEach((point, index) => {
      const p = project(point.lat, point.lon, width, height);
      const shadowPoint = { x: p.x + width * 0.016, y: p.y + height * 0.03 };
      if (index === 0) ctx.moveTo(shadowPoint.x, shadowPoint.y);
      else ctx.lineTo(shadowPoint.x, shadowPoint.y);
    });
    ctx.closePath();
    const landShadow = ctx.createLinearGradient(0, height * 0.45, width, height);
    landShadow.addColorStop(0, 'rgba(0,0,0,0.02)');
    landShadow.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = landShadow;
    ctx.filter = 'blur(12px)';
    ctx.fill();
    ctx.filter = 'none';
    ctx.restore();

    const selectedPoint = projectCity(selectedCityId, width, height);
    const scan = ctx.createRadialGradient(
      selectedPoint.x,
      selectedPoint.y,
      0,
      selectedPoint.x,
      selectedPoint.y,
      180,
    );
    scan.addColorStop(0, 'rgba(255,255,255,0.06)');
    scan.addColorStop(0.45, 'rgba(101,225,255,0.1)');
    scan.addColorStop(1, 'rgba(101,225,255,0)');
    ctx.fillStyle = scan;
    ctx.beginPath();
    ctx.arc(selectedPoint.x, selectedPoint.y, 180 + Math.sin(phase * 0.001) * 6, 0, Math.PI * 2);
    ctx.fill();
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(
        selectedPoint.x,
        selectedPoint.y,
        42 + ring * 22 + Math.sin(phase * 0.0012 + ring) * 2,
        0,
        Math.PI * 2,
      );
      ctx.strokeStyle = `rgba(255,255,255,${0.1 - ring * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    routesRef.current.forEach((route, routeIndex) => {
      const lensMatch = matchesRouteLens(route, routeLens);
      const routeAlpha = routeLens === 'all' ? 1 : lensMatch ? 1 : reducedEffects ? 0.08 : 0.16;
      const from = projectCity(route.from, width, height);
      const to = projectCity(route.to, width, height);
      const curve = getRouteCurve(from, to, route.congestion + route.lanes * 0.1, routeIndex);
      const control = { x: curve.cx, y: curve.cy };
      const flowMix = route.passengerFlow + route.packageFlow;
      const baseCurve = { start: from, control, end: to };
      const laneGap = getRouteLaneGap(route);
      const passengerCurve = offsetQuadraticCurve(
        from,
        control,
        to,
        -laneGap * (route.lanes > 1 ? 0.46 : 0.38),
      );
      const packageCurve = offsetQuadraticCurve(
        from,
        control,
        to,
        laneGap * (route.lanes > 1 ? 0.46 : 0.38),
      );

      ctx.save();
      ctx.globalAlpha = routeAlpha;
      ctx.beginPath();
      ctx.moveTo(from.x + width * 0.008, from.y + height * 0.018);
      ctx.quadraticCurveTo(
        curve.cx + width * 0.008,
        curve.cy + height * 0.02,
        to.x + width * 0.008,
        to.y + height * 0.018,
      );
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 6 + route.lanes * 1.6;
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      traceQuadraticCurve(ctx, baseCurve);
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + route.congestion * 0.12})`;
      ctx.lineWidth = 1 + route.lanes * 0.35;
      ctx.stroke();

      traceQuadraticCurve(ctx, baseCurve);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 9 + route.lanes * 1.1;
      ctx.shadowBlur = 24;
      ctx.shadowColor = 'rgba(0,0,0,0.16)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      traceQuadraticCurve(ctx, passengerCurve);
      const passengerGradient = ctx.createLinearGradient(
        passengerCurve.start.x,
        passengerCurve.start.y,
        passengerCurve.end.x,
        passengerCurve.end.y,
      );
      passengerGradient.addColorStop(
        0,
        viewMode === 'pulse' ? 'rgba(198,166,255,0.2)' : 'rgba(220,255,248,0.18)',
      );
      passengerGradient.addColorStop(
        0.5,
        viewMode === 'pulse'
          ? `rgba(167,124,255,${0.38 + route.passengerFlow / 3400})`
          : `rgba(234,247,255,${0.34 + route.passengerFlow / 3200})`,
      );
      passengerGradient.addColorStop(
        1,
        viewMode === 'pulse' ? 'rgba(217,194,255,0.18)' : 'rgba(101,225,255,0.2)',
      );
      ctx.strokeStyle = passengerGradient;
      ctx.shadowBlur = viewMode === 'pulse' ? 28 : 22;
      ctx.shadowColor = viewMode === 'pulse' ? 'rgba(167,124,255,0.52)' : PASSENGER_GLOW;
      ctx.lineWidth = 1.85 + route.passengerFlow / 1280;
      ctx.stroke();
      traceQuadraticCurve(ctx, passengerCurve);
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      traceQuadraticCurve(ctx, packageCurve);
      ctx.setLineDash([7, 6]);
      ctx.strokeStyle =
        viewMode === 'satellite'
          ? `rgba(220,255,248,${0.16 + route.packageFlow / 1500})`
          : `rgba(139,216,255,${0.22 + route.packageFlow / 1400})`;
      ctx.shadowBlur = viewMode === 'satellite' ? 20 : 16;
      ctx.shadowColor = viewMode === 'satellite' ? 'rgba(220,255,248,0.36)' : PACKAGE_GLOW;
      ctx.lineWidth = 1.25 + route.packageFlow / 960;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      if (routeLens === 'all' || lensMatch) {
        const passengerParticleCount = Math.max(
          2,
          Math.round(route.passengerFlow / (reducedEffects ? 980 : 620)),
        );
        for (let particle = 0; particle < passengerParticleCount; particle += 1) {
          const t =
            (phase * 0.00018 * FLOW_SPEED_SCALE * (1.2 + particle * 0.08) +
              particle / passengerParticleCount) %
            1;
          const point = pointOnQuadratic(
            passengerCurve.start,
            passengerCurve.control,
            passengerCurve.end,
            t,
          );
          ctx.beginPath();
          ctx.arc(point.x, point.y, 1.6 + route.lanes * 0.1, 0, Math.PI * 2);
          ctx.fillStyle =
            viewMode === 'pulse' ? 'rgba(225,208,255,0.96)' : 'rgba(255, 249, 230, 0.94)';
          ctx.shadowBlur = reducedEffects ? 10 : viewMode === 'pulse' ? 20 : 16;
          ctx.shadowColor = viewMode === 'pulse' ? 'rgba(167,124,255,0.5)' : PASSENGER_GLOW;
          ctx.fill();
        }

        const packageParticleCount = Math.max(
          2,
          Math.round(route.packageFlow / (reducedEffects ? 420 : 250)),
        );
        for (let particle = 0; particle < packageParticleCount; particle += 1) {
          const t =
            1 -
            ((phase * 0.00012 * FLOW_SPEED_SCALE * (1 + particle * 0.06) +
              particle / packageParticleCount) %
              1);
          const point = pointOnQuadratic(
            packageCurve.start,
            packageCurve.control,
            packageCurve.end,
            t,
          );
          const tangent = tangentOnQuadratic(
            packageCurve.start,
            packageCurve.control,
            packageCurve.end,
            t,
          );
          ctx.save();
          ctx.translate(point.x, point.y);
          ctx.rotate(Math.atan2(tangent.y, tangent.x) + Math.PI / 4);
          ctx.fillStyle =
            viewMode === 'satellite' ? 'rgba(220,255,248,0.92)' : 'rgba(139,216,255,0.94)';
          ctx.shadowBlur = reducedEffects ? 8 : 14;
          ctx.shadowColor = viewMode === 'satellite' ? 'rgba(220,255,248,0.42)' : PACKAGE_GLOW;
          ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
          ctx.restore();
        }
      }

      const shimmer = pointOnQuadratic(from, control, to, (phase * 0.00018 + flowMix / 12000) % 1);
      ctx.beginPath();
      ctx.arc(shimmer.x, shimmer.y, 6 + route.congestion * 3, 0, Math.PI * 2);
      const pulse = ctx.createRadialGradient(
        shimmer.x,
        shimmer.y,
        0,
        shimmer.x,
        shimmer.y,
        10 + route.congestion * 4,
      );
      pulse.addColorStop(0, 'rgba(255,255,255,0.24)');
      pulse.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = pulse;
      ctx.fill();

      if (route.congestion > 0.68) {
        const alert = pointOnQuadratic(from, control, to, 0.52);
        ctx.beginPath();
        ctx.arc(
          alert.x,
          alert.y,
          10 + Math.sin(phase * 0.006 + route.distanceKm) * 2,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(255,96,96,${0.22 + route.congestion * 0.18})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (!reducedEffects && routeIndex % 3 === 0) {
        const routeMarker = pointOnQuadratic(from, control, to, 0.3);
        ctx.save();
        ctx.translate(routeMarker.x, routeMarker.y);
        ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x));
        ctx.fillStyle = 'rgba(9,22,34,0.78)';
        ctx.fillRect(-18, -8, 36, 16);
        ctx.strokeStyle = 'rgba(101,225,255,0.24)';
        ctx.strokeRect(-18, -8, 36, 16);
        ctx.fillStyle = 'rgba(255,247,229,0.9)';
        ctx.font = `600 8px ${F}`;
        ctx.textAlign = 'center';
        ctx.fillText(
          ar ? `${numberFormatter.format(route.distanceKm)} ??` : `${route.distanceKm} km`,
          0,
          3,
        );
        ctx.restore();
      }
      ctx.restore();
    });
    [...routesRef.current]
      .filter(route => matchesRouteLens(route, routeLens))
      .sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow))
      .slice(0, routeTopN)
      .forEach((route, rank) => {
        const from = projectCity(route.from, width, height);
        const to = projectCity(route.to, width, height);
        const curve = getRouteCurve(from, to, route.congestion + route.lanes * 0.1, rank + 17);
        const control = { x: curve.cx, y: curve.cy };
        const labelPoint = pointOnQuadratic(from, control, to, 0.6);
        const { from: fromCity, to: toCity } = getRouteCities(route);
        const label = `${getCityLabel(fromCity, ar)} - ${getCityLabel(toCity, ar)}`;
        ctx.font = `700 10px ${F}`;
        const widthLabel = ctx.measureText(label).width + 28;
        const x = clamp(labelPoint.x - widthLabel / 2, 18, width - widthLabel - 18);
        const y = clamp(labelPoint.y - 30 - rank * 8, 18, height - 36);
        ctx.beginPath();
        ctx.roundRect(x, y, widthLabel, 22, 11);
        const calloutFill = ctx.createLinearGradient(x, y, x + widthLabel, y + 22);
        calloutFill.addColorStop(0, 'rgba(7,18,30,0.82)');
        calloutFill.addColorStop(1, 'rgba(7,28,40,0.84)');
        ctx.fillStyle = calloutFill;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = rank === 0 ? 'rgba(101,225,255,0.42)' : 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = rank === 0 ? '#DCFFF8' : '#eff6ff';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + widthLabel / 2, y + 14.5);
      });
    const routeLensMap = new Map(routesRef.current.map(route => [route.id, route] as const));
    vehiclesRef.current.forEach(vehicle => {
      const route = routeLensMap.get(vehicle.routeId);
      const lensMatch = route ? matchesRouteLens(route, routeLens) : true;
      ctx.save();
      ctx.globalAlpha = routeLens === 'all' || lensMatch ? 1 : 0.14;
      ctx.translate(vehicle.x, vehicle.y);
      ctx.rotate(vehicle.angle);
      ctx.shadowBlur = vehicle.isLiveTelemetry ? 24 : 18;
      ctx.shadowColor = vehicle.type === 'passenger' ? PASSENGER_GLOW : PACKAGE_GLOW;
      const speedMagnitude = Math.hypot(vehicle.velocityX, vehicle.velocityY);
      const trailLength = clamp(
        8 + speedMagnitude * 18 + (vehicle.isLiveTelemetry ? 4 : 0),
        10,
        vehicle.isLiveTelemetry ? 32 : 24,
      );
      ctx.beginPath();
      ctx.moveTo(-trailLength, 0);
      ctx.lineTo(0.5, 0);
      ctx.strokeStyle =
        vehicle.type === 'passenger'
          ? `rgba(220,255,248,${vehicle.isLiveTelemetry ? 0.54 : 0.3})`
          : `rgba(139,216,255,${vehicle.isLiveTelemetry ? 0.52 : 0.32})`;
      ctx.lineWidth = vehicle.type === 'passenger' ? 1.8 : 1.4;
      ctx.stroke();
      if (!reducedEffects) {
        ctx.beginPath();
        ctx.arc(0, 0, vehicle.isLiveTelemetry ? 8.4 : 6.6, 0, Math.PI * 2);
        ctx.fillStyle =
          vehicle.type === 'passenger' ? 'rgba(220,255,248,0.1)' : 'rgba(139,216,255,0.12)';
        ctx.fill();
      }
      if (vehicle.isLiveTelemetry) {
        ctx.beginPath();
        ctx.arc(0, 0, vehicle.freshness === 'fresh' ? 11 : 9, 0, Math.PI * 2);
        ctx.strokeStyle =
          vehicle.freshness === 'fresh' ? 'rgba(234,247,255,0.92)' : 'rgba(139,216,255,0.84)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (vehicle.type === 'passenger') {
        ctx.fillStyle = '#DCFFF8';
        ctx.beginPath();
        ctx.roundRect(-6, -3.6, 12, 7.2, 3);
        ctx.fill();
        ctx.fillStyle = PASSENGER_COLOR;
        ctx.fillRect(-3.4, -1.8, 6.8, 3.6);
      } else {
        ctx.fillStyle = '#EAF7FF';
        ctx.beginPath();
        ctx.moveTo(0, -5);
        ctx.lineTo(5, 0);
        ctx.lineTo(0, 5);
        ctx.lineTo(-5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = PACKAGE_COLOR;
        ctx.fillRect(-2.1, -2.1, 4.2, 4.2);
      }
      ctx.restore();
    });
    CITY_DATA.forEach(city => {
      const point = project(city.lat, city.lon, width, height);
      const selected = city.id === selectedCityId;
      ctx.beginPath();
      ctx.ellipse(
        point.x + width * 0.007,
        point.y + height * 0.02,
        selected ? 18 : city.isHub ? 13 : 10,
        selected ? 7 : 5,
        0,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      const haloRadius = (city.isHub ? 22 : 14) + Math.sin(phase * 0.0014 + city.id) * 2;
      const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, haloRadius);
      halo.addColorStop(
        0,
        selected
          ? 'rgba(220,255,248,0.34)'
          : city.isHub
            ? 'rgba(169,227,255,0.26)'
            : 'rgba(255,255,255,0.16)',
      );
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(point.x, point.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 9 : city.isHub ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = selected
          ? 'rgba(234,247,255,0.98)'
          : city.isHub
            ? 'rgba(169,227,255,0.98)'
          : 'rgba(255,255,255,0.82)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - (selected ? 26 : city.isHub ? 22 : 18));
      ctx.lineTo(point.x, point.y - 6);
      ctx.strokeStyle = selected
        ? 'rgba(169,227,255,0.44)'
        : city.isHub
          ? 'rgba(101,225,255,0.28)'
          : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = selected ? 2 : 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 4.6 : city.isHub ? 3.6 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = selected ? 'rgba(139,216,255,0.96)' : 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 14 : city.isHub ? 11 : 8, 0, Math.PI * 2);
      ctx.strokeStyle = selected
        ? 'rgba(169,227,255,0.86)'
        : city.isHub
          ? 'rgba(101,225,255,0.34)'
          : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.stroke();

      if (!reducedEffects || selected || city.isHub) {
        const labelText = getCityLabel(city, ar);
        ctx.font = `700 ${selected ? 13 : 11}px ${F}`;
        const textWidth = ctx.measureText(labelText).width;
        const labelWidth = textWidth + 18;
        const labelHeight = selected ? 24 : 20;
        const labelX = point.x - labelWidth / 2;
        const labelY = point.y - 36;

        ctx.beginPath();
        ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 10);
        const labelFill = ctx.createLinearGradient(
          labelX,
          labelY,
          labelX + labelWidth,
          labelY + labelHeight,
        );
        labelFill.addColorStop(0, selected ? 'rgba(7,28,40,0.9)' : 'rgba(10,24,38,0.72)');
        labelFill.addColorStop(1, selected ? 'rgba(9,52,54,0.9)' : 'rgba(7,18,30,0.7)');
        ctx.fillStyle = labelFill;
        ctx.shadowBlur = selected ? 18 : 8;
        ctx.shadowColor = selected ? 'rgba(169,227,255,0.18)' : 'rgba(101,225,255,0.08)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = selected ? 'rgba(169,227,255,0.42)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(point.x, point.y - 8);
        ctx.lineTo(point.x, labelY + labelHeight);
        ctx.strokeStyle = selected ? 'rgba(169,227,255,0.32)' : 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#EFF6FF';
        ctx.textAlign = 'center';
        ctx.fillText(labelText, point.x, labelY + labelHeight / 2 + 4);
      }
    });

    const vignette = ctx.createRadialGradient(
      width * 0.5,
      height * 0.48,
      Math.min(width, height) * 0.2,
      width * 0.5,
      height * 0.48,
      Math.max(width, height) * 0.76,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    if (showMapChrome) {
      const frameLeft = Math.max(12, stageLeft - 12);
      const frameTop = 12;
      const frameWidth = Math.min(width - frameLeft - 12, stageRight - frameLeft + 12);
      const frameHeight = height - 24;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(frameLeft, frameTop, frameWidth, frameHeight);
      ctx.strokeStyle = 'rgba(169,227,255,0.16)';
      ctx.strokeRect(frameLeft + 8, frameTop + 8, frameWidth - 16, frameHeight - 16);

      [
        [
          frameLeft + 6,
          frameTop + 6,
          frameLeft + 28,
          frameTop + 6,
          frameLeft + 6,
          frameTop + 28,
        ],
        [
          frameLeft + frameWidth - 6,
          frameTop + 6,
          frameLeft + frameWidth - 28,
          frameTop + 6,
          frameLeft + frameWidth - 6,
          frameTop + 28,
        ],
        [
          frameLeft + 6,
          frameTop + frameHeight - 6,
          frameLeft + 28,
          frameTop + frameHeight - 6,
          frameLeft + 6,
          frameTop + frameHeight - 28,
        ],
        [
          frameLeft + frameWidth - 6,
          frameTop + frameHeight - 6,
          frameLeft + frameWidth - 28,
          frameTop + frameHeight - 6,
          frameLeft + frameWidth - 6,
          frameTop + frameHeight - 28,
        ],
      ].forEach(corner => {
        ctx.beginPath();
        ctx.moveTo(corner[0], corner[1]);
        ctx.lineTo(corner[2], corner[3]);
        ctx.lineTo(corner[4], corner[5]);
        ctx.strokeStyle = 'rgba(169,227,255,0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
  }, [ar, isCompactMobile, numberFormatter, routeLens, selectedCityId, timeOfDay, viewMode]);

  const updateSimulation = useCallback(
    (deltaTime: number, now: number) => {
      if (paused) return;
      const simulationStep = clamp(deltaTime / 16.67, 0.55, 1.6);
      routesRef.current = routesRef.current
        .map((route, index) =>
          buildModeledRouteState(route, index, timeOfDay, selectedCityId, now, simulationStep),
        )
        .map(route => mergeRouteStateWithLiveData(route, liveRouteOverrides.get(route.id)));
      const routeMap = new Map(routesRef.current.map(route => [route.id, route]));
      const canvas = canvasRef.current;
      const width = canvas ? parseFloat(canvas.style.width || '0') || BASE_W : BASE_W;
      const height = canvas ? parseFloat(canvas.style.height || '0') || BASE_H : BASE_H;
      vehiclesRef.current = vehiclesRef.current.map((vehicle, index) => {
        const route = routeMap.get(vehicle.routeId);
        if (!route) {
          return vehicle;
        }
        const simulatedDistance = getSimulatedRouteDistance(route.distanceKm);
        const routeMomentum = corridorMomentum(route);
        const flowVelocityMultiplier =
          (vehicle.type === 'passenger' ? 1.06 : 0.92) * (0.78 + routeMomentum * 0.32);
        let progress =
          vehicle.progress +
          ((route.speedKph * vehicle.speedFactor * flowVelocityMultiplier) / simulatedDistance) *
            simulationStep *
            0.018 *
            FLOW_SPEED_SCALE *
            vehicle.direction;
        let direction = vehicle.direction;
        if (progress > 1) {
          progress = 2 - progress;
          direction = -1;
        } else if (progress < 0) {
          progress = -progress;
          direction = 1;
        }
        const routeField = getVehicleRouteTarget(
          route,
          { ...vehicle, progress },
          width,
          height,
          now,
        );
        let targetX = routeField.x;
        let targetY = routeField.y;
        if (
          vehicle.isLiveTelemetry &&
          typeof vehicle.liveLat === 'number' &&
          typeof vehicle.liveLng === 'number'
        ) {
          const livePoint = project(vehicle.liveLat, vehicle.liveLng, width, height);
          const telemetryBlend = vehicle.freshness === 'fresh' ? 0.78 : 0.64;
          targetX = livePoint.x * telemetryBlend + routeField.x * (1 - telemetryBlend);
          targetY = livePoint.y * telemetryBlend + routeField.y * (1 - telemetryBlend);
        }
        const spring =
          ((vehicle.isLiveTelemetry ? 0.18 : vehicle.type === 'package' ? 0.14 : 0.16) +
            routeMomentum * 0.05) *
          simulationStep;
        const damping = clamp(
          0.62 +
            routeMomentum * 0.28 +
            (vehicle.type === 'passenger' ? 0.02 : 0) -
            route.congestion * 0.05,
          0.52,
          0.92,
        );
        const velocityX = (vehicle.velocityX + (targetX - vehicle.x) * spring) * damping;
        const velocityY = (vehicle.velocityY + (targetY - vehicle.y) * spring) * damping;
        const shouldSnap =
          Math.hypot(targetX - vehicle.x, targetY - vehicle.y) >
          (vehicle.isLiveTelemetry ? 44 : 96);
        const x = shouldSnap ? targetX : vehicle.x + velocityX;
        const y = shouldSnap ? targetY : vehicle.y + velocityY;
        const angle =
          Math.abs(velocityX) + Math.abs(velocityY) > 0.04
            ? Math.atan2(velocityY, velocityX)
            : routeField.angle + (direction === 1 ? 0 : Math.PI);
        return {
          ...vehicle,
          progress,
          direction,
          x,
          y,
          angle,
          velocityX: shouldSnap ? 0 : velocityX,
          velocityY: shouldSnap ? 0 : velocityY,
          passengers:
            vehicle.type === 'passenger'
              ? vehicle.isLiveTelemetry
                ? vehicle.passengers
                : 1 + ((index + Math.round(route.passengerFlow)) % 4)
              : undefined,
          packageLoad:
            vehicle.type === 'package'
              ? vehicle.isLiveTelemetry
                ? vehicle.packageLoad
                : clamp(
                    Math.round((route.packageFlow / 70 + index) % (vehicle.packageCapacity ?? 12)),
                    1,
                    vehicle.packageCapacity ?? 12,
                  )
              : undefined,
        };
      });
      if (now - analyticsTickRef.current > ANALYTICS_COMMIT_INTERVAL_MS) {
        analyticsTickRef.current = now;
        const nextRouteSnapshot = routesRef.current;
        const modeledAnalytics = buildModeledAnalytics(
          nextRouteSnapshot,
          vehiclesRef.current,
          selectedCityId,
          ar,
          liveSnapshot ? 'hybrid' : 'modeled',
        );
        startTransition(() => {
          setRouteSnapshot(nextRouteSnapshot);
          setAnalytics(mergeLiveAnalyticsWithModel(modeledAnalytics, liveSnapshot));
        });
      }
    },
    [ar, liveSnapshot, liveRouteOverrides, paused, selectedCityId, timeOfDay],
  );

  useEffect(() => {
    routesRef.current = initialRoutes(timeOfDay);
    vehiclesRef.current = buildVehicleFleet(routesRef.current);
    startTransition(() => {
      setRouteSnapshot(routesRef.current);
      setAnalytics(
        buildModeledAnalytics(
          routesRef.current,
          vehiclesRef.current,
          selectedCityId,
          ar,
          'modeled',
        ),
      );
    });
  }, [ar, selectedCityId, timeOfDay]);

  useEffect(() => {
    if (!liveSnapshot) return;
    routesRef.current = initialRoutes(timeOfDay).map(route =>
      mergeRouteStateWithLiveData(route, liveRouteOverrides.get(route.id)),
    );
    vehiclesRef.current = buildVehicleFleet(routesRef.current, liveSnapshot.vehicles);
    const modeledAnalytics = buildModeledAnalytics(
      routesRef.current,
      vehiclesRef.current,
      selectedCityId,
      ar,
      'hybrid',
    );
    startTransition(() => {
      setRouteSnapshot(routesRef.current);
      setAnalytics(mergeLiveAnalyticsWithModel(modeledAnalytics, liveSnapshot));
    });
  }, [ar, liveRouteOverrides, liveSnapshot, selectedCityId, timeOfDay]);

  useEffect(() => {
    resizeCanvas();
    drawScene();
    const observer = new ResizeObserver(() => {
      resizeCanvas();
      drawScene();
    });
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [drawScene, resizeCanvas]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMotionPreference = () => {
      prefersReducedMotionRef.current = mediaQuery.matches;
      drawScene();
    };

    syncMotionPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncMotionPreference);
      return () => mediaQuery.removeEventListener('change', syncMotionPreference);
    }

    mediaQuery.addListener(syncMotionPreference);
    return () => mediaQuery.removeListener(syncMotionPreference);
  }, [drawScene]);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const userAgent = navigator.userAgent || '';
    const automatedBrowser = navigator.webdriver || /HeadlessChrome|Lighthouse/i.test(userAgent);
    const connection = navigator as Navigator & {
      connection?: {
        saveData?: boolean;
      };
    };

    staticSceneModeRef.current = automatedBrowser || Boolean(connection.connection?.saveData);
    if (staticSceneModeRef.current) {
      phaseRef.current = 0;
      drawScene();
    }
  }, [drawScene]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const handleVisibilityChange = () => {
      documentVisibleRef.current = document.visibilityState === 'visible';
      if (documentVisibleRef.current) {
        drawScene();
      }
    };

    handleVisibilityChange();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [drawScene]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        mapVisibleRef.current =
          entry.isIntersecting && entry.intersectionRatio >= MAP_VISIBILITY_THRESHOLD;
        if (mapVisibleRef.current) {
          drawScene();
        }
      },
      {
        threshold: [0, MAP_VISIBILITY_THRESHOLD, 0.5],
      },
    );

    observer.observe(wrap);
    return () => observer.disconnect();
  }, [drawScene]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const markInteraction = () => {
      interactionActiveRef.current = true;
      if (interactionTimeoutRef.current !== null) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
      interactionTimeoutRef.current = window.setTimeout(() => {
        interactionActiveRef.current = false;
      }, INTERACTION_COOLDOWN_MS);
    };

    window.addEventListener('scroll', markInteraction, { passive: true });
    window.addEventListener('wheel', markInteraction, { passive: true });
    window.addEventListener('touchmove', markInteraction, { passive: true });

    return () => {
      window.removeEventListener('scroll', markInteraction);
      window.removeEventListener('wheel', markInteraction);
      window.removeEventListener('touchmove', markInteraction);
      if (interactionTimeoutRef.current !== null) {
        window.clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (prevTimeRef.current === null) prevTimeRef.current = timestamp;
      const delta = timestamp - prevTimeRef.current;
      prevTimeRef.current = timestamp;
      const shouldAdvanceSimulation = !paused && documentVisibleRef.current;
      const canAnimateMap =
        mapVisibleRef.current && !prefersReducedMotionRef.current && !staticSceneModeRef.current;
      const targetFrameInterval =
        1000 / (interactionActiveRef.current ? SCROLLING_FRAME_RATE : ACTIVE_FRAME_RATE);

      if (shouldAdvanceSimulation && timestamp - lastDrawTimeRef.current >= targetFrameInterval) {
        if (shouldAdvanceSimulation) {
          phaseRef.current = timestamp;
          updateSimulation(delta, timestamp);
        }
        if (canAnimateMap) {
          drawScene();
        }
        lastDrawTimeRef.current = timestamp;
      }

      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      prevTimeRef.current = null;
      lastDrawTimeRef.current = 0;
    };
  }, [drawScene, paused, updateSimulation]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleRoutes = useMemo(() => {
    const selectedCityRoutes = routeSnapshot.filter(
      route => route.from === selectedCityId || route.to === selectedCityId,
    );
    const scopedRoutes = selectedCityRoutes.length ? selectedCityRoutes : routeSnapshot;
    const lensFilteredRoutes = scopedRoutes.filter(route => matchesRouteLens(route, routeLens));
    return (lensFilteredRoutes.length ? lensFilteredRoutes : scopedRoutes)
      .slice()
      .sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow))
      .slice(0, 6);
  }, [routeLens, routeSnapshot, selectedCityId]);
  const primaryActionItems = [
    analytics.dispatchAction,
    `${copy.topCorridor}: ${analytics.topCorridor}`,
    ar
      ? `???? ???????: ${numberFormatter.format(analytics.seatAvailability)} / ??? ??????: ${numberFormatter.format(analytics.packageCapacity)}`
      : `Seat availability: ${analytics.seatAvailability} / Package capacity: ${analytics.packageCapacity}`,
  ].filter(Boolean);
  const activeMode = {
    command: { title: copy.commandMode, body: copy.commandModeBody, accent: C.cyan },
    satellite: { title: copy.satelliteMode, body: copy.satelliteModeBody, accent: C.green },
    pulse: { title: copy.pulseMode, body: copy.pulseModeBody, accent: C.purple },
  }[viewMode];
  const quickSectionLinks = [
    {
      id: 'overview',
      label: ar ? '??????' : 'Overview',
      icon: ShieldCheck,
      ref: heroSectionRef,
    },
    {
      id: 'map',
      label: ar ? '???????' : 'Live map',
      icon: Waypoints,
      ref: mapSectionRef,
    },
    {
      id: 'insights',
      label: ar ? '???????' : 'City intel',
      icon: MapPinned,
      ref: insightSectionRef,
    },
    {
      id: 'corridors',
      label: ar ? '?????' : 'Corridors',
      icon: Gauge,
      ref: corridorSectionRef,
    },
  ] as const;
  const sourceSignalCards = [
    {
      label: ar ? '???? ?????' : 'Source integrity',
      value: `${numberFormatter.format(signalConfidence)}%`,
      sub: liveModeSummary,
      tone: confidenceTone,
      icon: ShieldCheck,
    },
    {
      label: ar ? '??????? ??????' : 'Telemetry freshness',
      value: telemetrySummary,
      sub:
        telemetryTotalTrips > 0
          ? `${numberFormatter.format(telemetryCoveragePercent)}% ${ar ? '??????' : 'coverage'}`
          : telemetryStatus,
      tone: telemetryTone,
      icon: Radar,
    },
    {
      label: ar ? '????? ???????' : 'Refresh cadence',
      value: liveUpdatedAtValue,
      sub: hasActiveLiveDemand ? (ar ? '???? 15 ?????' : 'Realtime + 15s refresh') : trafficState,
      tone: C.cyan,
      icon: RefreshCcw,
    },
  ] as const;
  const mapLensOptions = [
    {
      id: 'all',
      label: ar ? '?????? ??????' : 'Full network',
      description: ar ? '???? ??????' : 'All corridors',
      count: routeSnapshot.length,
    },
    {
      id: 'rides',
      label: ar ? '???? ??????' : 'Ride-heavy',
      description: ar ? '???? ??????' : 'Passenger-led',
      count: routeSnapshot.filter(route => matchesRouteLens(route, 'rides')).length,
    },
    {
      id: 'parcels',
      label: ar ? '???? ??????' : 'Parcel-heavy',
      description: ar ? '???? ??????' : 'Package-led',
      count: routeSnapshot.filter(route => matchesRouteLens(route, 'parcels')).length,
    },
    {
      id: 'stress',
      label: ar ? '???? ?????' : 'Stress watch',
      description: ar ? '??? ?????' : 'High pressure',
      count: routeSnapshot.filter(route => matchesRouteLens(route, 'stress')).length,
    },
  ] as const;
  const routeLensSummary =
    mapLensOptions.find(option => option.id === routeLens) ?? mapLensOptions[0];
  const selectedCityRoutes = routeSnapshot.filter(
    route => route.from === selectedCityId || route.to === selectedCityId,
  );
  const selectedCityPeers = new Set(
    selectedCityRoutes.map(route => (route.from === selectedCityId ? route.to : route.from)),
  );
  const mapRailWidth = isCompactMobile ? '0px' : 'clamp(220px, 22vw, 280px)';
  const mapStageInset = isCompactMobile ? '14px' : `calc(${mapRailWidth} + 28px)`;
  const mapChromePanelStyle: CSSProperties = {
    padding: isCompactMobile ? '12px 13px' : '14px 15px',
    borderRadius: isCompactMobile ? 18 : 20,
    border: `1px solid ${SERVICE_BORDER}`,
    background: 'linear-gradient(180deg, rgba(9,20,32,0.86), rgba(5,12,22,0.96))',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 32px rgba(0,0,0,0.18)',
    backdropFilter: 'blur(18px)',
  };
  const mapStageStatusCards = [
    {
      label: copy.liveMesh,
      value: liveModeSummary,
      sub: telemetryStatus,
      tone: SKY_ACCENT,
    },
    {
      label: ar ? 'Route focus' : 'Route focus',
      value: routeLensSummary.label,
      sub: `${routeLensSummary.description} · ${numberFormatter.format(routeLensSummary.count)}`,
      tone: PACKAGE_COLOR,
    },
  ] as const;
  const mapRailStats = [
    {
      label: copy.speed,
      value: `${numberFormatter.format(Math.round(analytics.avgSpeed))} ${ar ? '??/?' : 'km/h'}`,
      sub: ar
        ? `${numberFormatter.format(Math.round(analytics.networkUtilization * 100))}% ???????`
        : `${Math.round(analytics.networkUtilization * 100)}% utilization`,
      tone: PASSENGER_COLOR,
    },
    {
      label: copy.pressure,
      value: `${numberFormatter.format(Math.round(analytics.congestionLevel * 100))}%`,
      sub: activeMode.title,
      tone: SKY_WARNING,
    },
    {
      label: ar ? 'Signal confidence' : 'Signal confidence',
      value: `${numberFormatter.format(signalConfidence)}%`,
      sub: telemetryStatus,
      tone: confidenceTone,
    },
  ] as const;
  const mapRailCards = [
    {
      label: copy.routeIntelligence,
      value: analytics.recommendedPath || (ar ? '????? ? ??????' : 'Amman -> Aqaba'),
      sub: `${copy.topCorridor}: ${analytics.topCorridor || (ar ? '????? ? ???????' : 'Amman -> Zarqa')}`,
      tone: PACKAGE_COLOR,
    },
    {
      label: copy.dispatch,
      value: analytics.dispatchAction || (ar ? '?????? ?????' : 'Balance supply'),
      sub: activeMode.body,
      tone: SKY_ACCENT,
    },
  ] as const;
  const mapStageBottomCards = [
    {
      label: `${copy.topCorridor} · ${getSignalSourceTag(analytics.sources.topCorridor)}`,
      value: analytics.topCorridor || (ar ? '????? ? ???????' : 'Amman -> Zarqa'),
      tone: PACKAGE_COLOR,
    },
    {
      label: `${copy.passengerFlow} · ${getOperationalSourceTag(analytics.sources.activePassengers)}`,
      value: numberFormatter.format(analytics.activePassengers),
      tone: PASSENGER_COLOR,
    },
    {
      label: `${copy.parcelLoad} · ${getOperationalSourceTag(analytics.sources.activePackages)}`,
      value: numberFormatter.format(analytics.activePackages),
      tone: PACKAGE_COLOR,
    },
  ] as const;
  const heroSignals = [
    {
      label: copy.controlState,
      value: paused
        ? ar
          ? '????? ??????'
          : 'Paused'
        : hasActiveLiveDemand
          ? copy.liveSync
          : copy.simulationTag,
      tone: paused ? C.orange : C.green,
    },
    {
      label: `${copy.topCorridor} · ${getSignalSourceTag(analytics.sources.topCorridor)}`,
      value: analytics.topCorridor || (ar ? '????? ? ???????' : 'Amman -> Zarqa'),
      tone: PACKAGE_COLOR,
    },
    {
      label: `${copy.dispatch} · ${getSignalSourceTag(analytics.sources.dispatchAction)}`,
      value: analytics.dispatchAction || (ar ? '?????? ?????' : 'Balance supply'),
      tone: C.text,
    },
  ];
  const systemBands = [
    {
      label: `${ar ? '??????' : 'Passengers'} · ${getOperationalSourceTag(analytics.sources.activePassengers)}`,
      value: numberFormatter.format(analytics.activePassengers),
      sub: ar
        ? `${numberFormatter.format(analytics.seatAvailability)} ???? ????`
        : `${analytics.seatAvailability} seats open`,
      color: PASSENGER_COLOR,
    },
    {
      label: `${ar ? '??????' : 'Packages'} · ${getOperationalSourceTag(analytics.sources.activePackages)}`,
      value: numberFormatter.format(analytics.activePackages),
      sub: ar
        ? `${numberFormatter.format(analytics.packageCapacity)} ???? ?????`
        : `${analytics.packageCapacity} slots open`,
      color: PACKAGE_COLOR,
    },
    {
      label: `${ar ? '??????' : 'Velocity'} · ${getTrafficSourceTag(analytics.sources.avgSpeed)}`,
      value: `${numberFormatter.format(Math.round(analytics.avgSpeed))} ${ar ? '??/?' : 'km/h'}`,
      sub: ar
        ? `${numberFormatter.format(Math.round(analytics.networkUtilization * 100))}% ???????`
        : `${Math.round(analytics.networkUtilization * 100)}% utilization`,
      color: C.green,
    },
    {
      label: `${ar ? '?????' : 'Pressure'} · ${getTrafficSourceTag(analytics.sources.congestionLevel)}`,
      value: `${numberFormatter.format(Math.round(analytics.congestionLevel * 100))}%`,
      sub: activeMode.title,
      color: C.orange,
    },
  ];
  const topMobileBands = isCompactMobile ? systemBands.slice(0, 2) : systemBands;
  const commercialBands = commercialSnapshot
    ? [
        {
          label: ar ? '????? ??????' : 'Recurring revenue',
          value: `${numberFormatter.format(Math.round(commercialSnapshot.totalRecurringRevenueJod))} ${ar ? '?.?' : 'JOD'}`,
          sub:
            commercialSnapshot.topContract?.corridorLabel ??
            (ar ? '???? ??? ?????' : 'No contract lead'),
          color: C.cyan,
        },
        {
          label: ar ? '????? ???????' : 'Owned contracts',
          value: numberFormatter.format(commercialSnapshot.ownedCorridorContracts),
          sub: ar ? '?????? ????? ??? ?????? ??????' : 'Corridors backed by recurring agreements',
          color: C.green,
        },
        {
          label: ar ? '????? ????????' : 'Stakeholders',
          value: numberFormatter.format(commercialSnapshot.activeStakeholders),
          sub:
            commercialSnapshot.corridorPassCoverage ??
            (ar ? '???? ?????? ????? ???' : 'No corridor pass pinned'),
          color: PACKAGE_COLOR,
        },
      ]
    : [];
  const formatLabel = (value: string) => value.replace(/\s*·\s*/g, ' · ');
  const surfaceThemeVars: CSSProperties = {
    '--bg-primary': '#06111d',
    '--text-primary': SERVICE_TEXT,
    '--text-secondary': SERVICE_SUB,
    '--text-muted': SERVICE_MUTED,
    '--border': SERVICE_BORDER,
    '--border-strong': SERVICE_BORDER_STRONG,
    '--surface-divider': 'rgba(169,227,255,0.12)',
    '--surface-muted': 'rgba(169,227,255,0.08)',
    '--surface-muted-strong': 'rgba(169,227,255,0.14)',
    '--primary': SKY_ACCENT,
    '--accent-secondary': SKY_ACCENT,
    '--accent-secondary-rgb': '169 227 255',
    '--success': SKY_SUCCESS,
    '--success-rgb': '121 243 208',
    '--warning': SKY_WARNING,
    '--warning-rgb': '255 199 141',
  } as CSSProperties;

  return (
    <div
      dir={dir}
      style={{
        ...surfaceThemeVars,
        minHeight: '100vh',
        background: `${GRAD_AURORA}, radial-gradient(circle at 15% 12%, rgba(169,227,255,0.22), transparent 22%), radial-gradient(circle at 82% 18%, rgba(139,216,255,0.16), transparent 24%), radial-gradient(circle at 50% 100%, rgba(234,247,255,0.08), transparent 28%), #06111d`,
        color: SERVICE_TEXT,
        fontFamily: F,
        padding: isCompactMobile ? '14px 12px 84px' : '20px 14px 88px',
      }}
    >
      <style>{`
        @keyframes mobility-os-brand-drift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(0, -6px, 0) scale(1.018); }
        }
        @keyframes mobility-os-brand-glow {
          0%, 100% { opacity: 0.44; transform: scale(0.94); }
          50% { opacity: 0.82; transform: scale(1.08); }
        }
        .mobility-os-brand-badge {
          position: absolute;
          left: 17%;
          top: 19%;
          z-index: 1;
          width: clamp(116px, 14vw, 182px);
          height: clamp(86px, 10vw, 132px);
          display: grid;
          place-items: center;
          pointer-events: none;
          border-radius: 999px;
          background:
            radial-gradient(circle at 28% 50%, rgba(169,227,255,0.18) 0%, rgba(101,225,255,0.12) 26%, rgba(8,18,28,0) 70%),
            linear-gradient(90deg, rgba(7,18,30,0.26), rgba(7,18,30,0));
          contain: layout paint;
          will-change: transform, opacity;
          animation: mobility-os-brand-drift 7.2s ease-in-out infinite;
        }
        .mobility-os-brand-badge__tray {
          position: absolute;
          inset: 12px -18px;
          border-radius: 999px;
          border: 1px solid rgba(220,255,248,0.08);
          background:
            linear-gradient(90deg, rgba(8,18,28,0.56), rgba(8,18,28,0.16)),
            radial-gradient(circle at 20% 50%, rgba(169,227,255,0.16), rgba(169,227,255,0) 44%);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.04),
            0 14px 32px rgba(0,0,0,0.16);
        }
        .mobility-os-brand-badge__glow {
          position: absolute;
          inset: -18px -30px;
          border-radius: 999px;
          background: radial-gradient(circle, rgba(25,231,187,0.34) 0%, rgba(101,225,255,0.18) 38%, rgba(4,15,27,0) 74%);
          filter: blur(16px);
          animation: mobility-os-brand-glow 4.8s ease-in-out infinite;
        }
        .mobility-os-brand-badge__mark {
          position: relative;
          z-index: 1;
          display: grid;
          place-items: center;
          transform: translateX(-10%);
          filter: drop-shadow(0 18px 28px rgba(4,8,14,0.24));
        }
        @media (max-width: 767px) {
          .mobility-os-brand-badge {
            left: 18%;
            top: 18%;
            width: clamp(94px, 26vw, 132px);
            height: clamp(72px, 20vw, 102px);
          }
          .mobility-os-brand-badge__tray {
            inset: 10px -12px;
          }
          .mobility-os-brand-badge__mark {
            transform: translateX(-6%) scale(0.94);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .mobility-os-brand-badge,
          .mobility-os-brand-badge__glow {
            animation: none;
          }
        }
        .mobility-os-focusable {
          transition: box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease;
        }
        .mobility-os-focusable:focus-visible {
          outline: none;
          border-color: rgba(101,225,255,0.9) !important;
          box-shadow:
            0 0 0 1px rgba(101,225,255,0.8),
            0 0 0 4px rgba(101,225,255,0.16) !important;
        }
        .mobility-os-focusable:hover {
          transform: translateY(-1px);
        }
        .mobility-os-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
      <div
        style={{
          maxWidth: 1460,
          margin: '0 auto',
          display: 'grid',
          gap: isCompactMobile ? 14 : 18,
        }}
      >
        <section
          ref={heroSectionRef}
          style={glassPanelStyle({
            padding: isCompactMobile ? 18 : 28,
            borderRadius: isCompactMobile ? 24 : 34,
          })}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.04), transparent 24%, transparent 72%, rgba(169,227,255,0.1))',
            }}
          />
          <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
            <div
              style={{
                display: 'grid',
                gap: isCompactMobile ? 14 : 12,
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(0, 1.2fr) minmax(320px, 0.8fr)',
              }}
            >
              <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                <div style={sectionLabelStyle}>{copy.heroLabel}</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <h1
                    style={{
                      margin: 0,
                      color: SERVICE_TEXT,
                      fontFamily:
                        "var(--wasel-font-display, 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif)",
                      fontWeight: 800,
                      fontSize: isCompactMobile
                        ? 'clamp(1.8rem, 8vw, 2.5rem)'
                        : 'clamp(2.25rem, 4.6vw, 4.25rem)',
                      lineHeight: isCompactMobile ? 1.02 : 0.96,
                      letterSpacing: '-0.05em',
                      maxWidth: 920,
                      textShadow: '0 10px 36px rgba(169,227,255,0.08)',
                    }}
                  >
                    {copy.heroTitle}
                  </h1>
                  <p
                    style={{
                      margin: 0,
                      color: SERVICE_SUB,
                      lineHeight: isCompactMobile ? 1.6 : 1.78,
                      maxWidth: 820,
                      fontSize: isCompactMobile ? '0.98rem' : '1.04rem',
                    }}
                  >
                    {copy.heroBody}
                  </p>
                </div>
                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                    gridTemplateColumns: isCompactMobile
                      ? '1fr'
                      : 'repeat(auto-fit, minmax(170px, 1fr))',
                    marginTop: 2,
                  }}
                >
                  {heroSignals.map(signal => (
                    <div
                      key={signal.label}
                      style={{
                        minWidth: 0,
                        padding: isCompactMobile ? '11px 12px' : '12px 14px',
                        borderRadius: 18,
                        border: `1px solid ${C.borderFaint}`,
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(signal.label)}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: signal.tone,
                          fontWeight: 900,
                          fontSize: signal.label === copy.dispatch ? '0.94rem' : '1rem',
                          lineHeight: 1.35,
                        }}
                      >
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginTop: 4,
                  }}
                >
                  {quickSectionLinks.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="mobility-os-focusable"
                        onClick={() => scrollToSection(item.ref)}
                        style={{
                          minHeight: 42,
                          padding: '0 14px',
                          borderRadius: 999,
                          border: `1px solid ${C.borderFaint}`,
                          background: 'rgba(255,255,255,0.035)',
                          color: C.textSub,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                        }}
                      >
                        <Icon size={15} color={C.cyan} />
                        <span>{item.label}</span>
                        <ArrowRight size={14} color={C.textMuted} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div
                  style={{
                    ...glassPanelStyle({ padding: 16, borderRadius: 24, boxShadow: 'none' }),
                    background: 'linear-gradient(180deg, rgba(9,25,43,0.94), rgba(5,12,24,0.98))',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {ar ? '?????? ?????????' : 'Operating hour'}
                      </div>
                      <div style={{ marginTop: 6, fontSize: '1.1rem', fontWeight: 900 }}>
                        {ar ? '???? ?????? ????????' : 'Jordan network chronograph'}
                      </div>
                    </div>
                    <strong style={{ color: PACKAGE_COLOR, fontSize: '1.1rem' }}>
                      {String(timeOfDay).padStart(2, '0')}:00
                    </strong>
                  </div>
                  <input
                    aria-label={ar ? 'ساعة محاكاة الشبكة' : 'Mobility network simulation hour'}
                    type="range"
                    min={0}
                    max={23}
                    step={1}
                    value={timeOfDay}
                    className="mobility-os-slider"
                    onChange={event => setTimeOfDay(Number(event.target.value))}
                    style={{ width: '100%', marginTop: 14, accentColor: PACKAGE_COLOR }}
                  />
                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gridTemplateColumns: isCompactMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                      gap: 8,
                    }}
                  >
                    {[
                      { label: ar ? '??????' : 'Sunrise', value: '06:00' },
                      { label: ar ? '??????' : 'Peak', value: '08:00 / 18:00' },
                      { label: ar ? '?????' : 'Freight', value: '13:00' },
                    ].map(item => (
                      <div
                        key={item.label}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 16,
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(255,255,255,0.03)',
                        }}
                      >
                        <div
                          style={{
                            color: C.textMuted,
                            fontSize: '0.68rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            marginTop: 4,
                            color: C.text,
                            fontWeight: 800,
                            fontSize: '0.82rem',
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    ...glassPanelStyle({ padding: 16, borderRadius: 24, boxShadow: 'none' }),
                    background: 'linear-gradient(180deg, rgba(8,20,37,0.94), rgba(4,10,22,0.98))',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {ar ? '??? ?????' : 'Presentation mode'}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          fontWeight: 900,
                          fontSize: '1.02rem',
                          color: activeMode.accent,
                        }}
                      >
                        {activeMode.title}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="mobility-os-focusable"
                      onClick={() => setPaused(value => !value)}
                      aria-pressed={paused}
                      style={{
                        height: 42,
                        padding: '0 16px',
                        borderRadius: R.full,
                        border: `1px solid ${paused ? C.border : C.cyanGlow}`,
                        background: paused ? 'rgba(255,255,255,0.04)' : C.cyanDim,
                        color: C.text,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        fontWeight: 800,
                      }}
                    >
                      {paused ? <Play size={16} /> : <Pause size={16} />}
                      {paused ? (ar ? '???????' : 'Resume') : ar ? '?????' : 'Pause'}
                    </button>
                  </div>
                  <div style={{ color: C.textSub, fontSize: '0.88rem', lineHeight: 1.65 }}>
                    {activeMode.body}
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                    {[
                      { id: 'command', label: ar ? '?????' : 'Command' },
                      { id: 'satellite', label: ar ? '??????' : 'Satellite' },
                      { id: 'pulse', label: ar ? '???' : 'Pulse' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        className="mobility-os-focusable"
                        onClick={() => setViewMode(mode.id as ViewMode)}
                        aria-pressed={viewMode === mode.id}
                        style={{
                          padding: isCompactMobile ? '10px 12px' : '10px 14px',
                          borderRadius: 999,
                          border: `1px solid ${viewMode === mode.id ? C.cyan : C.border}`,
                          background:
                            viewMode === mode.id
                              ? 'rgba(169,227,255,0.14)'
                              : 'rgba(255,255,255,0.035)',
                          color: viewMode === mode.id ? C.text : C.textSub,
                          cursor: 'pointer',
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          fontSize: '0.72rem',
                          boxShadow:
                            viewMode === mode.id ? '0 0 24px rgba(169,227,255,0.2)' : 'none',
                        }}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: `repeat(auto-fit, minmax(${isCompactMobile ? 160 : 220}px, 1fr))`,
              }}
            >
              {topMobileBands.map((band, index) => {
                const displayLabel =
                  index <= 1
                    ? band.label.replace(liveTag, liveOpsTag)
                    : band.label.replace(copy.estimateTag, estimatedFromLoadLabel);
                return (
                  <div
                    key={band.label}
                    style={{
                      padding: isCompactMobile ? '14px 14px' : '16px 18px',
                      borderRadius: 22,
                      border: `1px solid ${C.borderFaint}`,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(displayLabel)}
                      </div>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: band.color,
                          boxShadow: `0 0 18px ${band.color}`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: '1.42rem',
                        fontWeight: 900,
                        color: band.color,
                        textShadow: `0 0 22px ${band.color}30`,
                      }}
                    >
                      {band.value}
                    </div>
                    <div style={{ marginTop: 6, color: C.textSub, fontSize: '0.84rem' }}>
                      {band.sub}
                    </div>
                  </div>
                );
              })}
            </div>
            {!isCompactMobile && commercialBands.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  gridTemplateColumns: `repeat(auto-fit, minmax(${isCompactMobile ? 160 : 220}px, 1fr))`,
                }}
              >
                {commercialBands.map(band => (
                  <div
                    key={band.label}
                    style={{
                      padding: '16px 18px',
                      borderRadius: 22,
                      border: `1px solid ${C.borderFaint}`,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.72rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(band.label)}
                      </div>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: band.color,
                          boxShadow: `0 0 18px ${band.color}`,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: '1.3rem',
                        fontWeight: 900,
                        color: band.color,
                      }}
                    >
                      {band.value}
                    </div>
                    <div
                      style={{
                        marginTop: 6,
                        color: C.textSub,
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {band.sub}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <div
              style={{
                color: C.textMuted,
                fontSize: '0.8rem',
                lineHeight: 1.65,
                display: isCompactMobile ? 'none' : 'block',
              }}
            >
              {copy.simulationNotice}
            </div>
            <div
              style={{
                display: 'grid',
                gap: 12,
                gridTemplateColumns: isCompactMobile
                  ? '1fr'
                  : 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              {sourceSignalCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 20,
                      border: `1px solid ${C.borderFaint}`,
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
                      display: 'grid',
                      gap: 10,
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 12,
                            display: 'grid',
                            placeItems: 'center',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.06)',
                          }}
                        >
                          <Icon size={16} color={card.tone} />
                        </span>
                        <span
                          style={{
                            color: C.textMuted,
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                          }}
                        >
                          {card.label}
                        </span>
                      </div>
                      <strong style={{ color: card.tone, fontSize: '0.98rem' }}>
                        {card.value}
                      </strong>
                    </div>
                    <div style={{ color: C.textSub, fontSize: '0.86rem', lineHeight: 1.6 }}>
                      {card.sub}
                    </div>
                    <div
                      style={{
                        color: C.textMuted,
                        fontSize: '0.78rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {card.label === (ar ? '???? ?????' : 'Source integrity')
                        ? sourceMatrixBody
                        : card.label === (ar ? '??????? ??????' : 'Telemetry freshness')
                          ? `${telemetryCoverageLabel}: ${numberFormatter.format(telemetryFreshTrips)} / ${numberFormatter.format(telemetryTotalTrips)} · ${telemetryHeartbeatLabel}: ${latestHeartbeatValue}`
                          : liveSnapshot?.traffic.enabled
                            ? ar
                              ? `???? ??? Google Routes (${numberFormatter.format(liveSnapshot.traffic.liveCorridors)} ?????)`
                              : `Connected via Google Routes (${liveSnapshot.traffic.liveCorridors} corridors)`
                            : ar
                              ? '??? ???? ??? ????? ????? ????? ?????'
                              : 'Using modeled traffic because no live Maps key is configured yet.'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section ref={mapSectionRef} style={{ display: 'grid', gap: 18 }}>
          <div
            style={glassPanelStyle({
              padding: isCompactMobile ? 14 : 18,
              borderRadius: isCompactMobile ? 24 : 30,
              background: 'linear-gradient(180deg, rgba(8,18,30,0.96), rgba(5,10,20,0.99))',
              alignSelf: 'start',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
            })}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <div style={{ display: 'grid', gap: 8, maxWidth: 760 }}>
                <div style={{ ...sectionLabelStyle, color: 'rgba(158,248,255,0.82)' }}>
                  {copy.operationalMap}
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: isCompactMobile ? '1.22rem' : '1.4rem',
                    letterSpacing: '-0.03em',
                  }}
                >
                  {isCompactMobile
                    ? 'Jordan live network'
                    : 'A simpler live view of Jordan’s mobility network'}
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: C.textSub,
                    lineHeight: 1.62,
                    maxWidth: 680,
                    fontSize: isCompactMobile ? '0.9rem' : '0.95rem',
                  }}
                >
                  {isCompactMobile
                    ? 'See the route network, key movement totals, and the best next corridor action in one clean view.'
                    : 'A cleaner operational surface for route reading, movement totals, and the next recommended corridor action.'}
                </p>
              </div>
              <div
                style={{
                  display: 'grid',
                  gap: 10,
                  alignContent: 'start',
                  width: isCompactMobile ? '100%' : 340,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: isCompactMobile ? 'stretch' : 'flex-end',
                  }}
                >
                  {[
                    { label: copy.passengerFlow, stroke: `3px solid ${PASSENGER_COLOR}` },
                    { label: copy.packageFlow, stroke: `3px dashed ${PACKAGE_COLOR}` },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{
                        padding: '9px 12px',
                        borderRadius: 999,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                        color: C.textSub,
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        gap: 10,
                        alignItems: 'center',
                        minHeight: 38,
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 0,
                          borderTop: item.stroke,
                          display: 'inline-block',
                        }}
                      />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    display: 'none',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      color: C.textMuted,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    <Layers3 size={14} color={C.cyan} />
                    <span>{ar ? '???? ???????' : 'Route lens'}</span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      flexWrap: 'wrap',
                      justifyContent: isCompactMobile ? 'stretch' : 'flex-end',
                    }}
                  >
                    {mapLensOptions.map(option => (
                      <button
                        key={option.id}
                        type="button"
                        className="mobility-os-focusable"
                        onClick={() => setRouteLens(option.id as RouteLens)}
                        aria-pressed={routeLens === option.id}
                        style={{
                          minHeight: 42,
                          padding: '0 12px',
                          borderRadius: 16,
                          border: `1px solid ${routeLens === option.id ? C.cyan : C.border}`,
                          background:
                            routeLens === option.id
                              ? 'rgba(169,227,255,0.14)'
                              : 'rgba(255,255,255,0.03)',
                          color: routeLens === option.id ? C.text : C.textSub,
                          cursor: 'pointer',
                          display: 'grid',
                          gap: 2,
                          alignContent: 'center',
                          textAlign: ar ? 'right' : 'left',
                        }}
                      >
                        <span style={{ fontSize: '0.76rem', fontWeight: 800 }}>{option.label}</span>
                        <span style={{ fontSize: '0.68rem', color: C.textMuted }}>
                          {option.description} · {numberFormatter.format(option.count)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    display: 'none',
                    gridTemplateColumns: isCompactMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  {[
                    {
                      label: `${copy.routeIntelligence} · ${copy.modeledTag}`,
                      value:
                        analytics.recommendedPath || (ar ? '????? ? ??????' : 'Amman -> Aqaba'),
                      color: C.cyan,
                    },
                    { label: copy.activeMode, value: activeMode.title, color: activeMode.accent },
                  ].map(item => (
                    <div
                      key={item.label}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 18,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)',
                      }}
                    >
                      <div
                        style={{
                          color: C.textMuted,
                          fontSize: '0.68rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(item.label)}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: item.color,
                          fontWeight: 800,
                          fontSize: '0.86rem',
                          lineHeight: 1.45,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div
              ref={wrapRef}
              style={{
                ...glassPanelStyle({
                  padding: 0,
                  borderRadius: isCompactMobile ? 22 : 30,
                  aspectRatio: isMobile ? '4/3' : `${HERO_MAP_ASPECT} / 1`,
                  minHeight: isMobile ? 'clamp(220px, 72vw, 360px)' : 'clamp(500px, 54vw, 860px)',
                  boxShadow: '0 18px 44px rgba(0,0,0,0.32)',
                  transform: 'none',
                  transformStyle: 'flat',
                  transformOrigin: 'center top',
                }),
                background:
                  'radial-gradient(circle at 78% 14%, rgba(169,227,255,0.12), rgba(169,227,255,0) 24%), linear-gradient(180deg, rgba(6,15,25,0.99), rgba(4,11,20,0.99))',
                border: `1px solid ${SERVICE_BORDER}`,
                contain: 'layout paint size',
              }}
            >
              <div id="mobility-os-map-summary" className="mobility-os-sr-only">
                {mapA11ySummary}
              </div>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0) 18%, rgba(169,227,255,0.05) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background:
                    'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.05), transparent 18%), radial-gradient(circle at 82% 20%, rgba(169,227,255,0.08), transparent 22%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: mapStageInset,
                  right: 14,
                  bottom: 14,
                  zIndex: 1,
                  pointerEvents: 'none',
                  borderRadius: isCompactMobile ? 20 : 28,
                  border: `1px solid ${SERVICE_BORDER}`,
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0) 18%, rgba(169,227,255,0.05) 100%), radial-gradient(circle at 72% 16%, rgba(169,227,255,0.09), rgba(169,227,255,0) 28%)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 0 0 1px rgba(255,255,255,0.02)',
                }}
              />
              {!isCompactMobile ? (
                <div
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: 14,
                    bottom: 14,
                    width: mapRailWidth,
                    zIndex: 2,
                    display: 'grid',
                    gap: 12,
                    alignContent: 'start',
                  }}
                >
                  <div style={mapChromePanelStyle}>
                    <div
                      style={{
                        color: SERVICE_MUTED,
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                      }}
                    >
                      {copy.selectedNode}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: SERVICE_TEXT,
                        fontSize: '1.8rem',
                        fontWeight: 900,
                        letterSpacing: '-0.05em',
                        lineHeight: 0.98,
                      }}
                    >
                      {getCityLabel(selectedCity, ar)}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: SERVICE_SUB,
                        fontSize: '0.82rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {selectedCityRoutes.length > 0
                        ? ar
                          ? `${numberFormatter.format(selectedCityRoutes.length)} ????? ? ${numberFormatter.format(selectedCityPeers.size)} ???? ?????`
                          : `${selectedCityRoutes.length} connected corridors across ${selectedCityPeers.size} linked cities`
                        : ar
                          ? '????? ?????? ????? ?????? ???????'
                          : 'Network-wide view with all modeled corridors in focus.'}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                        gap: 8,
                      }}
                    >
                      {mapRailStats.map(stat => (
                        <div
                          key={stat.label}
                          style={{
                            padding: '10px 10px 9px',
                            borderRadius: 16,
                            background: 'rgba(255,255,255,0.03)',
                            border: `1px solid ${SERVICE_BORDER}`,
                          }}
                        >
                          <div
                            style={{
                              color: SERVICE_MUTED,
                              fontSize: '0.62rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                            }}
                          >
                            {stat.label}
                          </div>
                          <div
                            style={{
                              marginTop: 5,
                              color: stat.tone,
                              fontSize: '0.92rem',
                              fontWeight: 900,
                            }}
                          >
                            {stat.value}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              color: SERVICE_SUB,
                              fontSize: '0.7rem',
                              lineHeight: 1.4,
                            }}
                          >
                            {stat.sub}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={mapChromePanelStyle}>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        color: SERVICE_MUTED,
                        fontSize: '0.68rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                      }}
                    >
                      <Layers3 size={14} color={SKY_ACCENT} />
                      <span>{ar ? '???? ???????' : 'Route lens'}</span>
                    </div>
                    <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                      {mapLensOptions.map(option => (
                        <button
                          key={option.id}
                          type="button"
                          className="mobility-os-focusable"
                          onClick={() => setRouteLens(option.id as RouteLens)}
                          aria-pressed={routeLens === option.id}
                          style={{
                            minHeight: 48,
                            padding: '0 12px',
                            borderRadius: 16,
                            border: `1px solid ${routeLens === option.id ? SKY_ACCENT : SERVICE_BORDER}`,
                            background:
                              routeLens === option.id
                                ? 'linear-gradient(180deg, rgba(169,227,255,0.18), rgba(169,227,255,0.08))'
                                : 'rgba(255,255,255,0.03)',
                            color: routeLens === option.id ? SERVICE_TEXT : SERVICE_SUB,
                            cursor: 'pointer',
                            display: 'grid',
                            gap: 2,
                            alignContent: 'center',
                            textAlign: ar ? 'right' : 'left',
                            boxShadow:
                              routeLens === option.id
                                ? '0 10px 24px rgba(169,227,255,0.12)'
                                : 'none',
                          }}
                        >
                          <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>{option.label}</span>
                          <span style={{ fontSize: '0.68rem', color: SERVICE_MUTED }}>
                            {option.description} · {numberFormatter.format(option.count)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                  {mapRailCards.map(card => (
                    <div key={card.label} style={mapChromePanelStyle}>
                      <div
                        style={{
                          color: SERVICE_MUTED,
                          fontSize: '0.66rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(card.label)}
                      </div>
                      <div
                        style={{
                          marginTop: 7,
                          color: card.tone,
                          fontWeight: 900,
                          fontSize: '1rem',
                          lineHeight: 1.3,
                        }}
                      >
                        {card.value}
                      </div>
                      <div
                        style={{
                          marginTop: 6,
                          color: SERVICE_SUB,
                          fontSize: '0.76rem',
                          lineHeight: 1.55,
                        }}
                      >
                        {card.sub}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: mapStageInset,
                  right: 14,
                  zIndex: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(7,18,30,0.78)',
                    border: `1px solid ${SERVICE_BORDER}`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: SKY_ACCENT,
                      boxShadow: '0 0 14px rgba(169,227,255,0.64)',
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: SERVICE_TEXT }}>
                    {copy.liveMesh}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                    marginLeft: 'auto',
                  }}
                >
                  {mapStageStatusCards.map(item => (
                    <div
                      key={item.label}
                      style={{
                        ...mapChromePanelStyle,
                        padding: '10px 12px',
                        minWidth: isCompactMobile ? 0 : 158,
                        maxWidth: isCompactMobile ? '100%' : 186,
                      }}
                    >
                      <div
                        style={{
                          color: SERVICE_MUTED,
                          fontSize: '0.64rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(item.label)}
                      </div>
                      <div
                        style={{
                          marginTop: 5,
                          color: item.tone,
                          fontSize: '0.82rem',
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: mapStageInset,
                  right: 14,
                  bottom: 14,
                  zIndex: 2,
                  display: 'grid',
                  gridTemplateColumns: isCompactMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))',
                  gap: 8,
                  alignItems: 'stretch',
                }}
              >
                {(isCompactMobile ? mapStageBottomCards.slice(0, 2) : mapStageBottomCards).map(
                  chip => (
                    <div
                      key={chip.label}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 16,
                        background: 'rgba(7,18,30,0.78)',
                        border: `1px solid ${SERVICE_BORDER}`,
                        backdropFilter: 'blur(12px)',
                        display: 'grid',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          color: SERVICE_MUTED,
                          fontSize: '0.66rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        {formatLabel(chip.label)}
                      </div>
                      <div
                        style={{
                          color: chip.tone,
                          fontSize: '0.84rem',
                          fontWeight: 800,
                          lineHeight: 1.35,
                        }}
                      >
                        {chip.value}
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div className="mobility-os-brand-badge" aria-hidden="true" style={{ display: 'none' }} />
              <div
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  right: 14,
                  zIndex: 2,
                  display: 'none',
                  justifyContent: 'space-between',
                  gap: 10,
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(7,18,30,0.74)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: SKY_ACCENT,
                      boxShadow: '0 0 14px rgba(169,227,255,0.64)',
                    }}
                  />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{copy.liveMesh}</span>
                </div>
                {!isCompactMobile ? (
                  <div
                    style={{
                      display: 'grid',
                      gap: 6,
                      padding: '10px 12px',
                      borderRadius: 16,
                      background: 'rgba(7,18,30,0.72)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(12px)',
                      minWidth: 172,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.66rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: C.textMuted,
                      }}
                    >
                      Best route now
                    </div>
                    <div
                      style={{
                        color: C.cyan,
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {analytics.recommendedPath || (ar ? '????? ? ??????' : 'Amman -> Aqaba')}
                    </div>
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 14,
                  zIndex: 2,
                  display: 'none',
                  gridTemplateColumns: isCompactMobile ? '1fr' : '1fr auto auto',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                {(isCompactMobile
                  ? primaryActionItems.slice(0, 1)
                  : [
                      `${copy.topCorridor} ${analytics.topCorridor || (ar ? '????? ? ???????' : 'Amman -> Zarqa')}`,
                      `${copy.dispatch} ${analytics.dispatchAction || (ar ? '?????? ?????' : 'Balance supply')}`,
                      ar
                        ? `??????? ${numberFormatter.format(analytics.seatAvailability)} / ????? ${numberFormatter.format(analytics.packageCapacity)}`
                        : `Seats ${analytics.seatAvailability} / Capacity ${analytics.packageCapacity}`,
                    ]
                ).map(chip => (
                  <div
                    key={chip}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 16,
                      background: 'rgba(7,18,30,0.72)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(12px)',
                      color: C.textSub,
                      fontSize: '0.76rem',
                    }}
                  >
                    {chip}
                  </div>
                ))}
              </div>
              <canvas
                ref={canvasRef}
                aria-describedby="mobility-os-map-summary"
                aria-label={
                  ar
                    ? '????? ??????? ??? ????? ???? ?? ??????'
                    : 'Live operational Wasel network map of Jordan'
                }
                role="img"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  borderRadius: isCompactMobile ? 22 : 30,
                  filter: 'saturate(1.02) contrast(1.01) brightness(1.01)',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gap: 14,
              gridTemplateColumns: `repeat(auto-fit, minmax(${isCompactMobile ? 260 : 320}px, 1fr))`,
              contentVisibility: 'auto',
              containIntrinsicSize: isCompactMobile ? '420px' : '360px',
            }}
          >
            <article
              ref={insightSectionRef}
              style={glassPanelStyle({
                padding: isCompactMobile ? 16 : 18,
                borderRadius: isCompactMobile ? 20 : 26,
                background: 'linear-gradient(180deg, rgba(8,24,38,0.96), rgba(4,10,22,0.98))',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPinned size={18} color={C.cyan} />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{copy.selectedNode}</h3>
              </div>
              <div
                style={{
                  marginTop: 14,
                  display: 'grid',
                  gap: 8,
                  gridTemplateColumns: isCompactMobile ? 'repeat(2, minmax(0, 1fr))' : undefined,
                }}
              >
                {CITY_DATA.map(city => (
                  <button
                    key={city.id}
                    type="button"
                    className="mobility-os-focusable"
                    onClick={() => setSelectedCityId(city.id)}
                    aria-pressed={selectedCityId === city.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: `1px solid ${selectedCityId === city.id ? PACKAGE_COLOR : C.border}`,
                      background:
                        selectedCityId === city.id
                          ? 'rgba(169,227,255,0.12)'
                          : 'rgba(255,255,255,0.03)',
                      color: C.text,
                      cursor: 'pointer',
                      fontWeight: selectedCityId === city.id ? 800 : 600,
                    }}
                  >
                    {getCityLabel(city, ar)}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {[
                  ar
                    ? `${copy.officialUnit} · ${copy.officialTag}: ${cityMap.get(selectedCityId)?.officialAreaAr ?? ''}`
                    : `${copy.officialUnit} · ${copy.officialTag}: ${cityMap.get(selectedCityId)?.officialArea ?? ''}`,
                  `${copy.officialPopulation2025} · ${copy.officialTag}: ${numberFormatter.format(cityMap.get(selectedCityId)?.officialPopulation ?? 0)}`,
                  `${copy.modelRecommendation} ${analytics.recommendedPath}`,
                ].map((row, index) => (
                  <div
                    key={row}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 14,
                      border: '1px solid rgba(255,255,255,0.07)',
                      background: index === 2 ? 'rgba(169,227,255,0.08)' : 'rgba(255,255,255,0.03)',
                      color: index === 2 ? C.cyan : C.textSub,
                      fontWeight: index === 2 ? 700 : 500,
                    }}
                  >
                    {formatLabel(row)}
                  </div>
                ))}
              </div>
              <div
                style={{ marginTop: 12, color: C.textMuted, fontSize: '0.76rem', lineHeight: 1.6 }}
              >
                {copy.sourceJordanDos}
              </div>
            </article>
            <article
              style={glassPanelStyle({
                padding: isCompactMobile ? 16 : 18,
                borderRadius: isCompactMobile ? 20 : 26,
                background: 'linear-gradient(180deg, rgba(9,19,35,0.96), rgba(4,10,22,0.98))',
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Route size={18} color={PACKAGE_COLOR} />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>{copy.actionableOutputs}</h3>
              </div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {primaryActionItems.map((item, index) => (
                  <div
                    key={item}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background:
                        index === 0
                          ? 'linear-gradient(135deg, rgba(169,227,255,0.14), rgba(255,255,255,0.03))'
                          : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${index === 0 ? 'rgba(169,227,255,0.24)' : C.borderFaint}`,
                      color: C.textSub,
                      lineHeight: 1.6,
                      boxShadow: index === 0 ? '0 10px 24px rgba(169,227,255,0.08)' : 'none',
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div
                style={{ marginTop: 12, color: C.textMuted, fontSize: '0.76rem', lineHeight: 1.6 }}
              >
                {ar
                  ? '??? ???????? ??????? ?????? ?? ????? ????????? ????? ?????? ????? ?????? ??????.'
                  : 'These recommendations are estimated by the simulation model and are not direct government operational data.'}
              </div>
            </article>
          </div>
        </section>

        <section
          ref={corridorSectionRef}
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'minmax(0, 1fr)',
            contentVisibility: 'auto',
            containIntrinsicSize: isCompactMobile ? '1100px' : '900px',
          }}
        >
          <article
            style={glassPanelStyle({
              padding: isCompactMobile ? 16 : 22,
              borderRadius: isCompactMobile ? 24 : 32,
              background: 'linear-gradient(180deg, rgba(8,18,34,0.98), rgba(4,10,22,1))',
            })}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 14,
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                marginBottom: 18,
              }}
            >
              <div>
                <div style={sectionLabelStyle}>{copy.corridorIntelligence}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <Gauge size={18} color={C.cyan} />
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{copy.corridorDeck}</h3>
                </div>
                <div style={{ marginTop: 6, color: C.textMuted, fontSize: '0.84rem' }}>
                  {copy.corridorDeckBody}
                </div>
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: `1px solid ${C.border}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: C.textSub,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  display: isCompactMobile ? 'none' : 'block',
                }}
              >
                {copy.liveRanking} / {numberFormatter.format(visibleRoutes.length)} {copy.corridors}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {visibleRoutes.map((route, index) => {
                const { from, to } = getRouteCities(route);
                const totalFlow = Math.round(route.passengerFlow + route.packageFlow);
                const routeScore = Math.round(
                  (route.passengerFlow / Math.max(route.lanes * 1800, 1)) * 52 +
                    (route.packageFlow / Math.max(route.lanes * 820, 1)) * 18 +
                    (1 - route.congestion) * 30,
                );
                const pressureTone =
                  route.congestion > 0.75
                    ? 'rgba(255,120,92,0.16)'
                    : route.packageFlow > route.passengerFlow * 0.45
                      ? 'rgba(169,227,255,0.14)'
                      : 'rgba(234,247,255,0.12)';
                return (
                  <div
                    key={route.id}
                    style={{
                      position: 'relative',
                      padding: isCompactMobile ? '14px 14px 12px' : '18px 18px 16px',
                      borderRadius: isCompactMobile ? 18 : 24,
                      border: `1px solid ${index === 0 ? C.cyanGlow : C.borderFaint}`,
                      background: `linear-gradient(180deg, ${pressureTone}, rgba(255,255,255,0.025))`,
                      boxShadow:
                        index === 0
                          ? '0 18px 40px rgba(169,227,255,0.12)'
                          : '0 10px 30px rgba(0,0,0,0.16)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background: `radial-gradient(circle at top right, ${index === 0 ? 'rgba(169,227,255,0.16)' : 'rgba(255,255,255,0.05)'}, transparent 32%)`,
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 1,
                        borderRadius: 23,
                        border: '1px solid rgba(255,255,255,0.04)',
                        pointerEvents: 'none',
                      }}
                    />
                    <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 16,
                          alignItems: 'flex-start',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                background:
                                  index === 0 ? 'rgba(169,227,255,0.16)' : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${index === 0 ? 'rgba(169,227,255,0.24)' : 'rgba(255,255,255,0.08)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 900,
                                color: index === 0 ? C.cyan : C.textSub,
                              }}
                            >
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <div
                                style={{
                                  fontWeight: 900,
                                  fontSize: '1.02rem',
                                  letterSpacing: '-0.02em',
                                }}
                              >
                                {getCityLabel(from, ar)}
                                {ar ? ' ? ' : ' -> '}
                                {getCityLabel(to, ar)}
                              </div>
                              <div style={{ marginTop: 3, color: C.textMuted, fontSize: '0.8rem' }}>
                                {ar ? route.highwayAr : route.highway} /{' '}
                                {numberFormatter.format(route.distanceKm)} {ar ? '??' : 'km'} /{' '}
                                {numberFormatter.format(route.lanes)} {ar ? '?????' : 'lanes'}
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              flexWrap: 'wrap',
                              flexDirection: isCompactMobile ? 'column' : 'row',
                            }}
                          >
                            {[
                              {
                                label: `${copy.speed} · ${copy.estimateTag}`,
                                value: `${numberFormatter.format(Math.round(route.speedKph))} ${ar ? '??/?' : 'km/h'}`,
                                color: C.green,
                              },
                              {
                                label: `${copy.pressure} · ${copy.estimateTag}`,
                                value: `${numberFormatter.format(Math.round(route.congestion * 100))}%`,
                                color: C.orange,
                              },
                              {
                                label: `${copy.flow} · ${copy.simulationTag}`,
                                value: `${numberFormatter.format(totalFlow)}`,
                                color: C.cyan,
                              },
                            ].map(pill => (
                              <div
                                key={pill.label}
                                style={{
                                  padding: '7px 10px',
                                  borderRadius: 999,
                                  background: 'rgba(255,255,255,0.04)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  color: C.textSub,
                                  fontSize: '0.76rem',
                                  width: isCompactMobile ? '100%' : undefined,
                                }}
                              >
                                <span style={{ color: C.textMuted }}>
                                  {formatLabel(pill.label)}
                                </span>{' '}
                                <strong style={{ color: pill.color }}>{pill.value}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: 8, minWidth: 120 }}>
                          <div
                            style={{
                              textAlign: 'right',
                              color: C.textMuted,
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.12em',
                            }}
                          >
                            {copy.compositeScore}
                          </div>
                          <div
                            style={{
                              textAlign: 'right',
                              color: index === 0 ? C.cyan : C.text,
                              fontWeight: 900,
                              fontSize: '2rem',
                              lineHeight: 1,
                              textShadow: index === 0 ? '0 0 18px rgba(25,231,187,0.22)' : 'none',
                            }}
                          >
                            {routeScore}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: `repeat(auto-fit, minmax(${isCompactMobile ? 140 : 180}px, 1fr))`,
                          gap: 12,
                        }}
                      >
                        {[
                          {
                            label: `${copy.passengerOccupancy} · ${copy.estimateTag}`,
                            value: route.passengerFlow / Math.max(route.lanes * 1800, 1),
                            color: PASSENGER_COLOR,
                            tone: 'rgba(162,255,231,0.08)',
                          },
                          {
                            label: `${copy.packageUtilization} · ${copy.estimateTag}`,
                            value: route.packageFlow / Math.max(route.lanes * 820, 1),
                            color: PACKAGE_COLOR,
                            tone: 'rgba(169,227,255,0.08)',
                          },
                          {
                            label: `${copy.congestionIntensity} · ${copy.estimateTag}`,
                            value: route.congestion,
                            color: C.orange,
                            tone: 'rgba(255,149,72,0.08)',
                          },
                        ].map(metric => (
                          <div
                            key={metric.label}
                            style={{
                              padding: '12px 12px 10px',
                              borderRadius: 16,
                              background: metric.tone,
                              border: '1px solid rgba(255,255,255,0.05)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 10,
                              }}
                            >
                              <span style={{ fontSize: '0.76rem', color: C.textSub }}>
                                {formatLabel(metric.label)}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.82rem',
                                  fontWeight: 800,
                                  color: metric.color,
                                }}
                              >
                                {Math.round(metric.value * 100)}%
                              </span>
                            </div>
                            <div
                              style={{
                                marginTop: 10,
                                height: 8,
                                borderRadius: 999,
                                background: 'rgba(255,255,255,0.06)',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.round(metric.value * 100)}%`,
                                  height: '100%',
                                  borderRadius: 999,
                                  background: `linear-gradient(90deg, ${metric.color}, rgba(255,255,255,0.85))`,
                                  boxShadow: `0 0 18px ${metric.color}40`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </div>
    </div>
  );
}
