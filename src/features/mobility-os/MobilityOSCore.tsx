import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Gauge, MapPinned, Package, Pause, Play, Route, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { C, F, FM, GRAD_AURORA, R, SH } from '../../utils/wasel-ds';
import { type LiveMobilityVehicleSnapshot, useMobilityOSLiveData } from './liveMobilityData';

type FlowType = 'passenger' | 'package';
type ViewMode = 'command' | 'satellite' | 'pulse';
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
type RouteBase = { id: string; from: number; to: number; distanceKm: number; lanes: number; highway: string; highwayAr: string };
type RouteState = RouteBase & { passengerFlow: number; packageFlow: number; density: number; speedKph: number; congestion: number };
type Vehicle = { id: string; routeId: string; type: FlowType; progress: number; direction: 1 | -1; speedFactor: number; x: number; y: number; angle: number; passengers?: number; seatCapacity?: number; packageCapacity?: number; packageLoad?: number; liveLat?: number; liveLng?: number; isLiveTelemetry?: boolean; freshness?: 'fresh' | 'stale' };
type Analytics = { totalVehicles: number; activePassengers: number; activePackages: number; seatAvailability: number; packageCapacity: number; avgSpeed: number; networkUtilization: number; congestionLevel: number; topCorridor: string; recommendedPath: string; dispatchAction: string };
type Star = { x: number; y: number; size: number; alpha: number; drift: number };

const PASSENGER_COLOR = '#00C8E8';
const PACKAGE_COLOR = '#F0A830';
const PASSENGER_GLOW = 'rgba(0,200,232,0.45)';
const PACKAGE_GLOW = 'rgba(240,168,48,0.4)';
const TARGET_VEHICLES = 84;
const BASE_W = 1200;
const BASE_H = 700;
const FLOW_SPEED_SCALE = 0.42;
const HERO_MAP_ASPECT = 1.42;
const CITY_DATA: City[] = [
  { id: 0, name: 'Amman', nameAr: 'عمّان', lat: 31.9454, lon: 35.9284, populationK: 5004.6, officialPopulation: 5004600, officialArea: 'Amman Governorate', officialAreaAr: 'محافظة العاصمة', attractiveness: 1, isHub: true, tier: 1 },
  { id: 1, name: 'Aqaba', nameAr: 'العقبة', lat: 29.532, lon: 35.0063, populationK: 250.9, officialPopulation: 250900, officialArea: 'Aqaba Governorate', officialAreaAr: 'محافظة العقبة', attractiveness: 0.92, isHub: true, tier: 1 },
  { id: 2, name: 'Irbid', nameAr: 'إربد', lat: 32.5556, lon: 35.85, populationK: 2210.5, officialPopulation: 2210500, officialArea: 'Irbid Governorate', officialAreaAr: 'محافظة إربد', attractiveness: 0.88, isHub: true, tier: 1 },
  { id: 3, name: 'Zarqa', nameAr: 'الزرقاء', lat: 32.0728, lon: 36.088, populationK: 1704.5, officialPopulation: 1704500, officialArea: 'Zarqa Governorate', officialAreaAr: 'محافظة الزرقاء', attractiveness: 0.84, isHub: true, tier: 1 },
  { id: 4, name: 'Mafraq', nameAr: 'المفرق', lat: 32.3406, lon: 36.208, populationK: 686.8, officialPopulation: 686800, officialArea: 'Mafraq Governorate', officialAreaAr: 'محافظة المفرق', attractiveness: 0.58, isHub: false, tier: 2 },
  { id: 5, name: 'Jerash', nameAr: 'جرش', lat: 32.2803, lon: 35.8993, populationK: 296, officialPopulation: 296000, officialArea: 'Jerash Governorate', officialAreaAr: 'محافظة جرش', attractiveness: 0.64, isHub: false, tier: 2 },
  { id: 6, name: 'Ajloun', nameAr: 'عجلون', lat: 32.3326, lon: 35.7519, populationK: 219.9, officialPopulation: 219900, officialArea: 'Ajloun Governorate', officialAreaAr: 'محافظة عجلون', attractiveness: 0.62, isHub: false, tier: 2 },
  { id: 7, name: 'Madaba', nameAr: 'مادبا', lat: 31.7197, lon: 35.7936, populationK: 236.2, officialPopulation: 236200, officialArea: 'Madaba Governorate', officialAreaAr: 'محافظة مادبا', attractiveness: 0.6, isHub: false, tier: 2 },
  { id: 8, name: 'Karak', nameAr: 'الكرك', lat: 31.1853, lon: 35.7048, populationK: 395.4, officialPopulation: 395400, officialArea: 'Karak Governorate', officialAreaAr: 'محافظة الكرك', attractiveness: 0.66, isHub: false, tier: 2 },
  { id: 9, name: 'Tafila', nameAr: 'الطفيلة', lat: 30.8375, lon: 35.6042, populationK: 120.3, officialPopulation: 120300, officialArea: 'Tafilah Governorate', officialAreaAr: 'محافظة الطفيلة', attractiveness: 0.48, isHub: false, tier: 3 },
  { id: 10, name: "Ma'an", nameAr: 'معان', lat: 30.1962, lon: 35.736, populationK: 197.9, officialPopulation: 197900, officialArea: "Ma'an Governorate", officialAreaAr: 'محافظة معان', attractiveness: 0.54, isHub: false, tier: 3 },
  { id: 11, name: 'Salt', nameAr: 'السلط', lat: 32.0392, lon: 35.7272, populationK: 614, officialPopulation: 614000, officialArea: 'Balqa Governorate', officialAreaAr: 'محافظة البلقاء', attractiveness: 0.57, isHub: false, tier: 2 },
];
const ROUTES: RouteBase[] = [
  { id: 'amman-aqaba', from: 0, to: 1, distanceKm: 335, lanes: 2, highway: 'Desert Highway', highwayAr: 'الطريق الصحراوي' },
  { id: 'amman-irbid', from: 0, to: 2, distanceKm: 85, lanes: 2, highway: 'Jordan Valley Highway', highwayAr: 'طريق وادي الأردن' },
  { id: 'amman-zarqa', from: 0, to: 3, distanceKm: 25, lanes: 3, highway: 'Amman-Zarqa Expressway', highwayAr: 'أوتوستراد عمّان الزرقاء' },
  { id: 'zarqa-mafraq', from: 3, to: 4, distanceKm: 55, lanes: 2, highway: 'International Highway', highwayAr: 'الطريق الدولي' },
  { id: 'amman-jerash', from: 0, to: 5, distanceKm: 48, lanes: 2, highway: 'Jerash Road', highwayAr: 'طريق جرش' },
  { id: 'irbid-ajloun', from: 2, to: 6, distanceKm: 30, lanes: 1, highway: 'Ajloun Corridor', highwayAr: 'ممر عجلون' },
  { id: 'amman-madaba', from: 0, to: 7, distanceKm: 33, lanes: 2, highway: 'Airport Corridor', highwayAr: 'ممر المطار' },
  { id: 'madaba-karak', from: 7, to: 8, distanceKm: 111, lanes: 2, highway: "King's Highway", highwayAr: 'الطريق الملوكي' },
  { id: 'karak-tafila', from: 8, to: 9, distanceKm: 74, lanes: 1, highway: 'Southern Ridge Road', highwayAr: 'طريق المرتفعات الجنوبية' },
  { id: 'tafila-maan', from: 9, to: 10, distanceKm: 89, lanes: 1, highway: 'South Mountain Road', highwayAr: 'طريق الجبال الجنوبية' },
  { id: 'maan-aqaba', from: 10, to: 1, distanceKm: 114, lanes: 2, highway: 'Aqaba Arterial', highwayAr: 'الشريان المؤدي إلى العقبة' },
  { id: 'irbid-zarqa', from: 2, to: 3, distanceKm: 79, lanes: 2, highway: 'Northern Connector', highwayAr: 'الواصل الشمالي' },
  { id: 'amman-salt', from: 0, to: 11, distanceKm: 32, lanes: 2, highway: 'Salt Corridor', highwayAr: 'ممر السلط' },
  { id: 'salt-jerash', from: 11, to: 5, distanceKm: 38, lanes: 1, highway: 'Hill Connector', highwayAr: 'الواصل الجبلي' },
  { id: 'ajloun-jerash', from: 6, to: 5, distanceKm: 24, lanes: 1, highway: 'Forest Road', highwayAr: 'طريق الغابات' },
];
const BORDER = [{ lat: 33.37, lon: 35.55 }, { lat: 32.58, lon: 36.42 }, { lat: 31.24, lon: 37.12 }, { lat: 29.62, lon: 36.22 }, { lat: 29.2, lon: 35.03 }, { lat: 31.2, lon: 35.5 }, { lat: 32.56, lon: 35.55 }];
const TRAFFIC = { FREE: 120, JAM: 150, CRITICAL: 45 };
const cityMap = new Map(CITY_DATA.map((city) => [city.id, city]));
const bounds = CITY_DATA.reduce((acc, city) => ({ minLat: Math.min(acc.minLat, city.lat), maxLat: Math.max(acc.maxLat, city.lat), minLon: Math.min(acc.minLon, city.lon), maxLon: Math.max(acc.maxLon, city.lon) }), { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity });
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mercator = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const panelStyle = (extra: CSSProperties = {}): CSSProperties => ({ position: 'relative', background: 'linear-gradient(180deg, rgba(7,18,34,0.94), rgba(4,10,22,0.98))', border: `1px solid ${C.border}`, borderRadius: 24, boxShadow: SH.lg, overflow: 'hidden', ...extra });
const sectionLabelStyle: CSSProperties = { fontSize: '0.72rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: C.cyan };
const glassPanelStyle = (extra: CSSProperties = {}): CSSProperties => ({
  ...panelStyle({
    background: 'linear-gradient(180deg, rgba(8,22,39,0.96), rgba(4,10,22,0.99))',
    border: `1px solid ${C.border}`,
    boxShadow: '0 26px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)',
    ...extra,
  }),
});

function hourPalette(hour: number) {
  if (hour >= 6 && hour <= 10) {
    return { top: '#081726', bottom: '#0b2233', glow: 'rgba(255,188,104,0.12)' };
  }
  if (hour >= 17 && hour <= 20) {
    return { top: '#120f20', bottom: '#091726', glow: 'rgba(255,120,72,0.14)' };
  }
  return { top: '#020914', bottom: '#071423', glow: 'rgba(0,200,232,0.12)' };
}

function getCityLabel(city: City, ar: boolean) {
  return ar ? city.nameAr : city.name;
}

function createMobilityOSCopy(ar: boolean) {
  return {
    heroLabel: ar ? 'نظام الحركة / سطح التحكم الوطني' : 'Mobility OS / Jordan Control Surface',
    heroTitle: ar ? 'منصة تشغيل موحّدة لحركة الأردن، وتدفق الركاب، وذكاء الطرود.' : 'A unified live command layer for Jordan mobility, passenger flow, and parcel intelligence.',
    heroBody: ar ? 'سطح تشغيلي واحد بمشهد بصري متماسك يعرض المحاكاة الحية، وذكاء المسارات، وقرارات إعادة التوزيع، وضغط الممرات بلغة واضحة وممتازة ومناسبة للسوق الأردني.' : 'Mobility OS now behaves like one premium operating surface: real-time simulation, cinematic route intelligence, dispatch-aware analytics, and scientifically modeled corridor pressure all presented in a single coherent visual system.',
    controlState: ar ? 'حالة التحكم' : 'Control state',
    selectedCity: ar ? 'المدينة المحددة' : 'Selected city',
    topCorridor: ar ? 'الممر الأبرز' : 'Top corridor',
    dispatch: ar ? 'توجيه التشغيل' : 'Dispatch',
    liveSync: ar ? 'بث مباشر' : 'Live sync',
    selectedNode: ar ? 'العقدة المحددة' : 'Selected node',
    signatureMode: ar ? 'أسلوب العرض' : 'Signature mode',
    actionableOutputs: ar ? 'مخرجات جاهزة للتنفيذ' : 'Actionable outputs',
    servicePriority: ar ? 'أولوية الخدمات' : 'Service priority',
    operationalMap: ar ? 'الخريطة التشغيلية' : 'Operational map',
    mapTitle: ar ? 'الأردن مع 12 مدينة و15 ممراً بين المدن' : 'Jordan with 12 cities and 15 intercity corridors',
    mapBody: ar ? 'الأزرق يوضح حركة الركاب، والذهبي يوضح حركة الطرود. مواقع المركبات، وصحة الممرات، وبروز المدن، وإشارات التوجيه يتم تحديثها مباشرة مع كل إطار.' : 'Blue is passenger flow. Gold is package flow. Vehicle positions, corridor health, city emphasis, and dispatch signals are updated in real time on every simulation frame.',
    passengerFlow: ar ? 'تدفق الركاب' : 'Passenger flow',
    packageFlow: ar ? 'تدفق الطرود' : 'Package flow',
    routeIntelligence: ar ? 'ذكاء المسار' : 'Route intelligence',
    activeMode: ar ? 'النمط الحالي' : 'Active mode',
    liveMesh: ar ? 'المشهد الحي متزامن بسرعة 60 إطار/ث' : 'Live mesh synced at 60 FPS',
    parcelLoad: ar ? 'حمولة الطرود' : 'Parcel load',
    signalLayer: ar ? 'طبقة الإشارات' : 'Signal Layer',
    mobilityMatrix: ar ? 'مصفوفة الحركة الأردنية' : 'Jordan Mobility Matrix',
    fieldEnhancement: ar ? 'تعزيز المشهد' : 'Field enhancement',
    tempoDeck: ar ? 'لوحة الوتيرة والعمق' : 'Flow tempo and depth deck',
    cinematic: ar ? 'أهدأ / سينمائي' : 'cinematic / slower',
    commandNotes: ar ? 'ملاحظات تشغيلية' : 'Command notes',
    commandMode: ar ? 'نمط القيادة' : 'Command mode',
    commandModeBody: ar ? 'عرض متوازن لغرفة التحكم يساعد على قراءة الوضع واتخاذ القرار.' : 'Balanced command-room visibility for routing, dispatch, and health monitoring.',
    satelliteMode: ar ? 'نمط التضاريس' : 'Satellite mode',
    satelliteModeBody: ar ? 'تفاصيل أوضح للتضاريس مع إبراز أقوى لحركة اللوجستيات على الممرات.' : 'Sharper terrain definition and greener logistics emphasis for corridor reading.',
    pulseMode: ar ? 'نمط النبض' : 'Pulse mode',
    pulseModeBody: ar ? 'مشهد أكثر حيوية يبرز الحركة والحرارة ووتيرة الشبكة.' : 'High-energy rhythm view that amplifies motion, heat, and network intensity.',
    population: ar ? 'عدد السكان' : 'Population',
    tier: ar ? 'الفئة' : 'Tier',
    optimalPath: ar ? 'أفضل مسار' : 'Optimal path',
    corridorIntelligence: ar ? 'ذكاء الممرات' : 'Corridor intelligence',
    corridorDeck: ar ? 'ترتيب الممرات المباشر' : 'Live corridor ranking deck',
    corridorDeckBody: ar ? 'ترتيب مباشر للممرات بناءً على التدفق المركب، وهوية الطريق، وضغط الحركة، وكفاءة دمج الركاب والطرود.' : 'Ranked corridors with live composite flow, route identity, health pressure, and blended passenger-package utilization.',
    liveRanking: ar ? 'ترتيب مباشر' : 'Live ranking',
    corridors: ar ? 'ممرات' : 'corridors',
    speed: ar ? 'السرعة' : 'Speed',
    pressure: ar ? 'الضغط' : 'Pressure',
    flow: ar ? 'التدفق' : 'Flow',
    compositeScore: ar ? 'النتيجة المركبة' : 'Composite score',
    passengerOccupancy: ar ? 'إشغال المقاعد' : 'Passenger occupancy',
    packageUtilization: ar ? 'استغلال الطرود' : 'Package utilization',
    congestionIntensity: ar ? 'حدة الازدحام' : 'Congestion intensity',
    rideFlowTempo: ar ? 'وتيرة حركة الركاب' : 'Ride flow tempo',
    parcelCadence: ar ? 'وتيرة الطرود' : 'Parcel cadence',
    depthField: ar ? 'طبقة العمق' : 'Depth field',
    structuredTiers: ar ? 'عدد طبقات الخدمة المنظمة' : 'Structured service tiers',
  };
}

function project(lat: number, lon: number, width: number, height: number) {
  const px = width * 0.075;
  const py = height * 0.06;
  const x = px + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1)) * (width - px * 2);
  const minY = mercator(bounds.minLat);
  const maxY = mercator(bounds.maxLat);
  const y = py + (1 - (mercator(lat) - minY) / (maxY - minY || 1)) * (height - py * 2);
  return { x, y };
}

function getRouteCurve(from: { x: number; y: number }, to: { x: number; y: number }, intensity: number, seed: number) {
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

function pointOnQuadratic(start: { x: number; y: number }, control: { x: number; y: number }, end: { x: number; y: number }, t: number) {
  const mt = 1 - t;
  return {
    x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
    y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
  };
}

function demand(populationK: number, attractiveness: number, hour: number) {
  const morning = 1.8 * Math.exp(-0.5 * ((hour - 8) / 1.5) ** 2);
  const evening = 2 * Math.exp(-0.5 * ((hour - 18) / 1.5) ** 2);
  const freight = 0.55 * Math.exp(-0.5 * ((hour - 13) / 2.6) ** 2);
  return Math.log(populationK + 1) * attractiveness * Math.max(0.25, morning + evening + freight);
}

function speedFromDensity(density: number) {
  return Math.max(18, TRAFFIC.FREE * (1 - clamp(density, 0, TRAFFIC.JAM * 0.98) / TRAFFIC.JAM));
}

function initialRoutes(hour: number): RouteState[] {
  return ROUTES.map((route, index) => {
    const from = cityMap.get(route.from)!;
    const to = cityMap.get(route.to)!;
    const passengerFlow = Math.min(route.lanes * 1800, (demand(from.populationK, from.attractiveness, hour) + demand(to.populationK, to.attractiveness, hour + 0.35)) * 190);
    const packageFlow = Math.min(route.lanes * 820, (demand(from.populationK, from.attractiveness * 0.76, hour + 1.1) + demand(to.populationK, to.attractiveness * 0.7, hour + 1.6)) * 88);
    const density = 16 + passengerFlow / 110 + packageFlow / 230 + index * 1.2;
    return { ...route, passengerFlow, packageFlow, density, speedKph: speedFromDensity(density), congestion: clamp(density / TRAFFIC.CRITICAL, 0, 1) };
  });
}

function initialVehicles(routes: RouteState[]): Vehicle[] {
  return Array.from({ length: TARGET_VEHICLES }, (_, index) => {
    const route = routes[index % routes.length];
    const from = project(cityMap.get(route.from)!.lat, cityMap.get(route.from)!.lon, BASE_W, BASE_H);
    const to = project(cityMap.get(route.to)!.lat, cityMap.get(route.to)!.lon, BASE_W, BASE_H);
    const passenger = index % 3 !== 0;
    return { id: `vehicle-${index}`, routeId: route.id, type: passenger ? 'passenger' : 'package', progress: (index * 0.137) % 1, direction: index % 4 === 0 ? -1 : 1, speedFactor: 0.82 + (index % 7) * 0.05, x: from.x, y: from.y, angle: Math.atan2(to.y - from.y, to.x - from.x), passengers: passenger ? 1 + (index % 4) : undefined, seatCapacity: passenger ? 4 : undefined, packageCapacity: passenger ? undefined : 14 + (index % 6), packageLoad: passenger ? undefined : 5 + (index % 5) };
  });
}

function buildVehicleFleet(routes: RouteState[], liveVehicles: LiveMobilityVehicleSnapshot[] = []): Vehicle[] {
  const liveTelemetryVehicles = liveVehicles
    .map((vehicle): Vehicle | null => {
      const route = routes.find((item) => item.id === vehicle.routeId);
      if (!route) return null;
      const from = project(cityMap.get(route.from)!.lat, cityMap.get(route.from)!.lon, BASE_W, BASE_H);
      const to = project(cityMap.get(route.to)!.lat, cityMap.get(route.to)!.lon, BASE_W, BASE_H);
      return {
        id: vehicle.id,
        routeId: route.id,
        type: vehicle.type,
        progress: 0,
        direction: 1 as const,
        speedFactor: 1,
        x: from.x,
        y: from.y,
        angle: Math.atan2(to.y - from.y, to.x - from.x),
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

  const syntheticVehicles = initialVehicles(routes).slice(0, Math.max(0, TARGET_VEHICLES - liveTelemetryVehicles.length));
  return [...liveTelemetryVehicles, ...syntheticVehicles];
}

function optimalPath(routes: RouteState[], start: number, end: number) {
  const graph = new Map<number, { to: number; weight: number }[]>();
  routes.forEach((route) => {
    const weight = route.distanceKm * (1 + route.congestion);
    graph.set(route.from, [...(graph.get(route.from) ?? []), { to: route.to, weight }]);
    graph.set(route.to, [...(graph.get(route.to) ?? []), { to: route.from, weight }]);
  });
  const dist = new Map<number, number>();
  const prev = new Map<number, number | null>();
  const unvisited = new Set<number>(graph.keys());
  graph.forEach((_, node) => { dist.set(node, Infinity); prev.set(node, null); });
  dist.set(start, 0);
  while (unvisited.size) {
    let current: number | null = null;
    let currentDist = Infinity;
    unvisited.forEach((node) => { const value = dist.get(node) ?? Infinity; if (value < currentDist) { current = node; currentDist = value; } });
    if (current === null || current === end) break;
    unvisited.delete(current);
    (graph.get(current) ?? []).forEach((edge) => {
      if (!unvisited.has(edge.to)) return;
      const next = currentDist + edge.weight;
      if (next < (dist.get(edge.to) ?? Infinity)) { dist.set(edge.to, next); prev.set(edge.to, current); }
    });
  }
  const path: number[] = [];
  let cursor: number | null = end;
  while (cursor !== null) { path.unshift(cursor); cursor = prev.get(cursor) ?? null; }
  return path[0] === start ? path : [start, end];
}

export default function MobilityOSCore() {
  const { language, dir } = useLanguage();
  const ar = language === 'ar';
  const { snapshot: liveSnapshot } = useMobilityOSLiveData(ar);
  const copy = {
    ...createMobilityOSCopy(ar),
    heroBody: ar ? 'يجمع هذا السطح بين بيانات مرجعية رسمية ومحاكاة تشغيلية حيّة، مع فصل واضح بين الحقائق المعتمدة والتوصيات الناتجة عن النموذج.' : 'This surface combines official reference data with a live operational simulation, clearly separating verified facts from model-generated recommendations.',
    controlState: ar ? 'حالة المحاكاة' : 'Simulation state',
    liveSync: ar ? 'محاكاة مباشرة' : 'Live simulation',
    actionableOutputs: ar ? 'توصيات تشغيلية من النموذج' : 'Modeled operational recommendations',
    mapBody: ar ? 'الأزرق يوضح تدفق الركاب والذهبي يوضح تدفق الطرود. الحركة ومواقع المركبات وتوصيات التوجيه هنا مخرجات نموذجية، بينما البيانات السكانية المرجعية معروضة من المصدر الرسمي.' : 'Blue is passenger flow and gold is package flow. Vehicle movement, corridor health, and routing suggestions here are model outputs, while population reference data is shown from the official source.',
    liveMesh: ar ? 'المشهد التشغيلي متزامن بسرعة 60 إطار/ث' : 'Simulation mesh synced at 60 FPS',
    officialUnit: ar ? 'الوحدة الإدارية الرسمية' : 'Official administrative unit',
    officialPopulation2025: ar ? 'تقدير السكان الرسمي 2025' : 'Official 2025 population estimate',
    modelRecommendation: ar ? 'توصية المسار من النموذج' : 'Modeled route recommendation',
    sourceJordanDos: ar ? 'المصدر: دائرة الإحصاءات العامة الأردنية، تقديرات 2025' : 'Source: Jordan Department of Statistics, 2025 estimates',
    simulationTag: ar ? 'محاكاة' : 'Simulated',
    estimateTag: ar ? 'تقديري' : 'Estimated',
    officialTag: ar ? 'رسمي' : 'Official',
    modeledTag: ar ? 'من النموذج' : 'Modeled',
    simulationNotice: ar ? 'كل مؤشرات الحركة والسعة والضغط أدناه ناتجة عن نموذج تشغيلي حيّ.' : 'All movement, capacity, and pressure metrics below come from the live operating model.',
    corridorDeckBody: ar ? 'ترتيب تقديري للممرات وفق نموذج التدفق والضغط والكفاءة التشغيلية، وليس ترتيباً من مصدر حكومي مباشر.' : 'Estimated corridor ranking derived from the operating model, not from a direct government feed.',
    routeIntelligence: ar ? 'توصية المسار' : 'Route recommendation',
    selectedNode: ar ? 'مرجع المدينة المحددة' : 'Selected city reference',
  };
  const liveTag = liveSnapshot ? (ar ? 'مباشر' : 'Live') : copy.modeledTag;
  const liveOpsTag = ar ? 'ØªØ´ØºÙŠÙ„ Ø­ÙŠ' : 'Live ops';
  const hybridTag = ar ? 'Ù‡Ø¬ÙŠÙ†' : 'Hybrid';
  const telemetryFreshLabel = ar ? 'ØªÙ„Ù…ØªØ±ÙŠØ§ Ø­Ø¯ÙŠØ«Ø©' : 'Fresh telemetry';
  const telemetryStaleLabel = ar ? 'ØªÙ„Ù…ØªØ±ÙŠØ§ Ù…ØªØ£Ø®Ø±Ø©' : 'Stale telemetry';
  const telemetryNoneLabel = ar ? 'Ø¨Ù„Ø§ ØªÙ„Ù…ØªØ±ÙŠØ§' : 'No telemetry';
  const telemetryLabel = ar ? 'Ø­Ø§Ù„Ø© Ø§Ù„ØªÙ„Ù…ØªØ±ÙŠØ§' : 'Telemetry status';
  const sourceMatrixLabel = ar ? 'Ù…ØµÙÙˆÙØ© Ø§Ù„Ù…ØµØ§Ø¯Ø±' : 'Source matrix';
  const sourceMatrixBody = ar
    ? 'Ø§Ù„Ø±ÙƒØ§Ø¨ ÙˆØ§Ù„Ø·Ø±ÙˆØ¯ Ù…Ù† Ø³Ø¬Ù„Ø§Øª Ø§Ù„Ø±Ø­Ù„Ø§Øª Ø§Ù„Ø­ÙŠØ©ØŒ Ø§Ù„Ø³Ø±Ø¹Ø© ÙˆØ§Ù„Ø¶ØºØ· ØªÙ‚Ø¯ÙŠØ±ÙŠØ§Ù† Ø­ØªÙ‰ Ø±Ø¨Ø· Ù…ØµØ¯Ø± Ù…Ø±ÙˆØ± Ø­Ù‚ÙŠÙ‚ÙŠØŒ Ø£Ù…Ø§ ØªÙˆØµÙŠØ© Ø§Ù„Ù…Ø³Ø§Ø± ÙÙ†Ø§ØªØ¬Ø© Ø¹Ù† Ù†Ù…ÙˆØ°Ø¬ Ø§Ù„ØªØ­Ø³ÙŠÙ†.'
    : 'Passengers and packages come from live trip records. Speed and pressure remain estimated until a true traffic source is connected. Route guidance is produced by the optimization model.';
  const telemetryHeartbeatLabel = ar ? 'Ø¢Ø®Ø± Ù†Ø¨Ø¶Ø©' : 'Latest heartbeat';
  const telemetryCoverageLabel = ar ? 'ØªØºØ·ÙŠØ© Ø§Ù„ØªÙ„Ù…ØªØ±ÙŠØ§' : 'Telemetry coverage';
  const realtimeVerifiedLabel = ar ? 'Ù…ØªØ­Ù‚Ù‚ Ù…Ø¨Ø§Ø´Ø±Ø§Ù‹' : 'Verified live';
  const estimatedFromLoadLabel = ar ? 'Ù…Ù‚Ø¯Ù‘Ø± Ù…Ù† Ø§Ù„Ø­Ù…ÙˆÙ„Ø©' : 'Estimated from load';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(ar ? 'ar-JO' : 'en-US'), [ar]);
  const dateTimeFormatter = useMemo(() => new Intl.DateTimeFormat(ar ? 'ar-JO' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), [ar]);
  const [paused, setPaused] = useState(false);
  const [timeOfDay, setTimeOfDay] = useState(8);
  const [selectedCityId, setSelectedCityId] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('command');
  const [analytics, setAnalytics] = useState<Analytics>({ totalVehicles: 0, activePassengers: 0, activePackages: 0, seatAvailability: 0, packageCapacity: 0, avgSpeed: 0, networkUtilization: 0, congestionLevel: 0, topCorridor: '', recommendedPath: '', dispatchAction: '' });
  const [routeSnapshot, setRouteSnapshot] = useState<RouteState[]>(() => initialRoutes(8));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const analyticsTickRef = useRef(0);
  const phaseRef = useRef(0);
  const routesRef = useRef<RouteState[]>(initialRoutes(8));
  const vehiclesRef = useRef<Vehicle[]>(buildVehicleFleet(routesRef.current, liveSnapshot?.vehicles ?? []));
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
    () => new Map((liveSnapshot?.routes ?? []).map((route) => [route.routeId, route])),
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
    : (ar ? 'Ù„Ø§ ÙŠÙˆØ¬Ø¯' : 'Unavailable');

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const width = Math.max(320, Math.floor(wrap.clientWidth));
    const height = Math.max(440, Math.floor(wrap.clientHeight || width / HERO_MAP_ASPECT));
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }, []);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const phase = phaseRef.current;
    const palette = hourPalette(timeOfDay);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, viewMode === 'satellite' ? '#03111b' : palette.top);
    bg.addColorStop(0.55, viewMode === 'pulse' ? '#0c1020' : '#081726');
    bg.addColorStop(1, viewMode === 'satellite' ? '#0a1d2e' : palette.bottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    const skyRibbon = ctx.createLinearGradient(0, 0, width, height * 0.32);
    skyRibbon.addColorStop(0, 'rgba(255,255,255,0.02)');
    skyRibbon.addColorStop(0.5, palette.glow);
    skyRibbon.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = skyRibbon;
    ctx.fillRect(0, 0, width, height * 0.38);
    const atmosphere = ctx.createRadialGradient(width * 0.2, height * 0.18, 0, width * 0.2, height * 0.18, width * 0.5);
    atmosphere.addColorStop(0, viewMode === 'pulse' ? 'rgba(167,124,255,0.18)' : 'rgba(0,200,232,0.18)');
    atmosphere.addColorStop(0.35, viewMode === 'pulse' ? 'rgba(167,124,255,0.08)' : 'rgba(0,200,232,0.06)');
    atmosphere.addColorStop(1, 'rgba(0,200,232,0)');
    ctx.fillStyle = atmosphere;
    ctx.fillRect(0, 0, width, height);
    const amberGlow = ctx.createRadialGradient(width * 0.78, height * 0.82, 0, width * 0.78, height * 0.82, width * 0.42);
    amberGlow.addColorStop(0, viewMode === 'satellite' ? 'rgba(102,244,198,0.08)' : 'rgba(240,168,48,0.12)');
    amberGlow.addColorStop(1, 'rgba(240,168,48,0)');
    ctx.fillStyle = amberGlow;
    ctx.fillRect(0, 0, width, height);
    const polarAurora = ctx.createRadialGradient(width * 0.72, height * 0.1, 0, width * 0.72, height * 0.1, width * 0.38);
    polarAurora.addColorStop(0, viewMode === 'satellite' ? 'rgba(112,255,212,0.1)' : 'rgba(145,215,255,0.08)');
    polarAurora.addColorStop(0.45, 'rgba(255,255,255,0.03)');
    polarAurora.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = polarAurora;
    ctx.fillRect(0, 0, width, height);
    const celestialX = width * (0.18 + (timeOfDay / 23) * 0.64);
    const celestialY = timeOfDay >= 6 && timeOfDay <= 18 ? height * (0.18 + Math.abs(12 - timeOfDay) * 0.012) : height * 0.18;
    const isDay = timeOfDay >= 6 && timeOfDay <= 18;
    const celestial = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, isDay ? 58 : 42);
    celestial.addColorStop(0, isDay ? 'rgba(255,240,184,0.72)' : 'rgba(222,238,255,0.52)');
    celestial.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = celestial;
    ctx.beginPath();
    ctx.arc(celestialX, celestialY, isDay ? 58 : 42, 0, Math.PI * 2);
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
    const energyRibbon = ctx.createLinearGradient(-width * 0.1 + Math.sin(phase * 0.00035) * 140, 0, width * 0.65 + Math.sin(phase * 0.00035) * 140, height);
    energyRibbon.addColorStop(0, 'rgba(255,255,255,0)');
    energyRibbon.addColorStop(0.35, 'rgba(0,200,232,0.025)');
    energyRibbon.addColorStop(0.55, 'rgba(255,255,255,0.045)');
    energyRibbon.addColorStop(0.7, 'rgba(240,168,48,0.022)');
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
    horizonShelf.addColorStop(0, 'rgba(0,200,232,0)');
    horizonShelf.addColorStop(0.5, 'rgba(0,200,232,0.05)');
    horizonShelf.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = horizonShelf;
    ctx.fillRect(0, height * 0.62, width, height * 0.25);

    starsRef.current.forEach((star, index) => {
      const x = star.x * width + Math.sin(phase * 0.4 + index) * 2;
      const y = ((star.y + phase * 0.0008 * star.drift) % 1) * height;
      ctx.beginPath();
      ctx.arc(x, y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${star.alpha + Math.sin(phase * 0.8 + index) * 0.04})`;
      ctx.fill();
    });

    ctx.save();
    ctx.strokeStyle = viewMode === 'satellite' ? 'rgba(120,255,214,0.03)' : 'rgba(255,255,255,0.03)';
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
    ctx.strokeStyle = viewMode === 'pulse' ? 'rgba(167,124,255,0.04)' : 'rgba(0,200,232,0.026)';
    for (let x = -height; x < width; x += 58) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * 0.8, height);
      ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    BORDER.forEach((point, index) => { const p = project(point.lat, point.lon, width, height); if (index === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    const landFill = ctx.createLinearGradient(width * 0.2, 0, width * 0.82, height);
    landFill.addColorStop(0, 'rgba(6,17,30,0.86)');
    landFill.addColorStop(1, 'rgba(15,34,53,0.96)');
    ctx.fillStyle = landFill;
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1.1;
    ctx.shadowBlur = 40;
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.save();
    ctx.clip();
    const terrain = ctx.createLinearGradient(width * 0.18, height * 0.1, width * 0.85, height * 0.92);
    terrain.addColorStop(0, 'rgba(96,150,186,0.06)');
    terrain.addColorStop(0.45, 'rgba(255,255,255,0.01)');
    terrain.addColorStop(1, 'rgba(240,168,48,0.05)');
    ctx.fillStyle = terrain;
    ctx.fillRect(0, 0, width, height);
    const reliefWash = ctx.createLinearGradient(width * 0.25, height * 0.12, width * 0.78, height * 0.9);
    reliefWash.addColorStop(0, 'rgba(255,255,255,0.02)');
    reliefWash.addColorStop(0.4, 'rgba(0,200,232,0.03)');
    reliefWash.addColorStop(1, 'rgba(240,168,48,0.03)');
    ctx.fillStyle = reliefWash;
    ctx.fillRect(0, 0, width, height);
    for (let ridge = 0; ridge < 5; ridge += 1) {
      ctx.beginPath();
      const yOffset = height * (0.18 + ridge * 0.14);
      ctx.moveTo(width * 0.12, yOffset);
      ctx.bezierCurveTo(width * 0.28, yOffset - 20 + ridge * 3, width * 0.52, yOffset + 26 - ridge * 5, width * 0.9, yOffset - 8 + ridge * 4);
      ctx.strokeStyle = `rgba(255,255,255,${0.028 - ridge * 0.003})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    for (let contour = 0; contour < 10; contour += 1) {
      ctx.beginPath();
      const yOffset = height * (0.12 + contour * 0.075);
      ctx.moveTo(width * 0.08, yOffset);
      ctx.bezierCurveTo(width * 0.24, yOffset + 18 - contour * 0.8, width * 0.56, yOffset - 16 + contour * 1.2, width * 0.92, yOffset + 8);
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

    const selectedPoint = project(cityMap.get(selectedCityId)!.lat, cityMap.get(selectedCityId)!.lon, width, height);
    const scan = ctx.createRadialGradient(selectedPoint.x, selectedPoint.y, 0, selectedPoint.x, selectedPoint.y, 180);
    scan.addColorStop(0, 'rgba(255,255,255,0.06)');
    scan.addColorStop(0.45, 'rgba(0,200,232,0.08)');
    scan.addColorStop(1, 'rgba(0,200,232,0)');
    ctx.fillStyle = scan;
    ctx.beginPath();
    ctx.arc(selectedPoint.x, selectedPoint.y, 180 + Math.sin(phase * 0.001) * 6, 0, Math.PI * 2);
    ctx.fill();
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.beginPath();
      ctx.arc(selectedPoint.x, selectedPoint.y, 42 + ring * 22 + Math.sin(phase * 0.0012 + ring) * 2, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.1 - ring * 0.02})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    routesRef.current.forEach((route, routeIndex) => {
      const from = project(cityMap.get(route.from)!.lat, cityMap.get(route.from)!.lon, width, height);
      const to = project(cityMap.get(route.to)!.lat, cityMap.get(route.to)!.lon, width, height);
      const curve = getRouteCurve(from, to, route.congestion + route.lanes * 0.1, routeIndex);
      const control = { x: curve.cx, y: curve.cy };
      const flowMix = route.passengerFlow + route.packageFlow;

      ctx.beginPath();
      ctx.moveTo(from.x + width * 0.008, from.y + height * 0.018);
      ctx.quadraticCurveTo(curve.cx + width * 0.008, curve.cy + height * 0.02, to.x + width * 0.008, to.y + height * 0.018);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 6 + route.lanes * 1.6;
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(curve.cx, curve.cy, to.x, to.y);
      ctx.strokeStyle = `rgba(255,255,255,${0.1 + route.congestion * 0.12})`;
      ctx.lineWidth = 1 + route.lanes * 0.35;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(curve.cx, curve.cy, to.x, to.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 9 + route.lanes * 1.1;
      ctx.shadowBlur = 24;
      ctx.shadowColor = 'rgba(0,0,0,0.16)';
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(curve.cx, curve.cy, to.x, to.y);
      const passengerGradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
      passengerGradient.addColorStop(0, viewMode === 'pulse' ? 'rgba(198,166,255,0.2)' : 'rgba(111,246,255,0.18)');
      passengerGradient.addColorStop(0.5, viewMode === 'pulse' ? `rgba(167,124,255,${0.38 + route.passengerFlow / 3400})` : `rgba(0,200,232,${0.34 + route.passengerFlow / 3200})`);
      passengerGradient.addColorStop(1, viewMode === 'pulse' ? 'rgba(217,194,255,0.18)' : 'rgba(98,225,255,0.2)');
      ctx.strokeStyle = passengerGradient;
      ctx.shadowBlur = viewMode === 'pulse' ? 28 : 22;
      ctx.shadowColor = viewMode === 'pulse' ? 'rgba(167,124,255,0.52)' : PASSENGER_GLOW;
      ctx.lineWidth = 1.9 + route.passengerFlow / 1180;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(curve.cx, curve.cy, to.x, to.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.09)';
      ctx.lineWidth = 0.75;
      ctx.stroke();

      ctx.beginPath();
      ctx.setLineDash([7, 6]);
      ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(curve.cx, curve.cy, to.x, to.y);
      ctx.strokeStyle = viewMode === 'satellite' ? `rgba(114,255,213,${0.16 + route.packageFlow / 1500})` : `rgba(240,168,48,${0.18 + route.packageFlow / 1400})`;
      ctx.shadowBlur = viewMode === 'satellite' ? 20 : 16;
      ctx.shadowColor = viewMode === 'satellite' ? 'rgba(114,255,213,0.36)' : PACKAGE_GLOW;
      ctx.lineWidth = 1.3 + route.packageFlow / 880;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      const passengerParticleCount = Math.max(1, Math.round(route.passengerFlow / 450));
      for (let particle = 0; particle < passengerParticleCount; particle += 1) {
        const t = (phase * 0.00018 * FLOW_SPEED_SCALE * (1.2 + particle * 0.08) + particle / passengerParticleCount) % 1;
        const point = pointOnQuadratic(from, control, to, t);
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1.6 + route.lanes * 0.1, 0, Math.PI * 2);
        ctx.fillStyle = viewMode === 'pulse' ? 'rgba(225,208,255,0.96)' : 'rgba(153, 246, 255, 0.92)';
        ctx.shadowBlur = viewMode === 'pulse' ? 20 : 16;
        ctx.shadowColor = viewMode === 'pulse' ? 'rgba(167,124,255,0.5)' : PASSENGER_GLOW;
        ctx.fill();
      }

      const packageParticleCount = Math.max(1, Math.round(route.packageFlow / 190));
      for (let particle = 0; particle < packageParticleCount; particle += 1) {
        const t = (1 - ((phase * 0.00012 * FLOW_SPEED_SCALE * (1 + particle * 0.06) + particle / packageParticleCount) % 1));
        const point = pointOnQuadratic(from, control, to, t);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(phase * 0.002 + particle);
        ctx.fillStyle = viewMode === 'satellite' ? 'rgba(156,255,224,0.92)' : 'rgba(255, 214, 122, 0.92)';
        ctx.shadowBlur = 14;
        ctx.shadowColor = viewMode === 'satellite' ? 'rgba(114,255,213,0.42)' : PACKAGE_GLOW;
        ctx.fillRect(-2.2, -2.2, 4.4, 4.4);
        ctx.restore();
      }

      const shimmer = pointOnQuadratic(from, control, to, (phase * 0.00018 + flowMix / 12000) % 1);
      ctx.beginPath();
      ctx.arc(shimmer.x, shimmer.y, 6 + route.congestion * 3, 0, Math.PI * 2);
      const pulse = ctx.createRadialGradient(shimmer.x, shimmer.y, 0, shimmer.x, shimmer.y, 10 + route.congestion * 4);
      pulse.addColorStop(0, 'rgba(255,255,255,0.24)');
      pulse.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = pulse;
      ctx.fill();

      if (route.congestion > 0.68) {
        const alert = pointOnQuadratic(from, control, to, 0.52);
        ctx.beginPath();
        ctx.arc(alert.x, alert.y, 10 + Math.sin(phase * 0.006 + route.distanceKm) * 2, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,96,96,${0.22 + route.congestion * 0.18})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      if (routeIndex % 3 === 0) {
        const routeMarker = pointOnQuadratic(from, control, to, 0.3);
        ctx.save();
        ctx.translate(routeMarker.x, routeMarker.y);
        ctx.rotate(Math.atan2(to.y - from.y, to.x - from.x));
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(-18, -8, 36, 16);
        ctx.strokeStyle = 'rgba(0,200,232,0.18)';
        ctx.strokeRect(-18, -8, 36, 16);
        ctx.fillStyle = 'rgba(239,246,255,0.86)';
        ctx.font = `600 8px ${F}`;
        ctx.textAlign = 'center';
        ctx.fillText(ar ? `${numberFormatter.format(route.distanceKm)} كم` : `${route.distanceKm} km`, 0, 3);
        ctx.restore();
      }
    });
    [...routesRef.current]
      .sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow))
      .slice(0, 3)
      .forEach((route, rank) => {
        const from = project(cityMap.get(route.from)!.lat, cityMap.get(route.from)!.lon, width, height);
        const to = project(cityMap.get(route.to)!.lat, cityMap.get(route.to)!.lon, width, height);
        const curve = getRouteCurve(from, to, route.congestion + route.lanes * 0.1, rank + 17);
        const control = { x: curve.cx, y: curve.cy };
        const labelPoint = pointOnQuadratic(from, control, to, 0.6);
        const label = `${getCityLabel(cityMap.get(route.from)!, ar)} - ${getCityLabel(cityMap.get(route.to)!, ar)}`;
        ctx.font = `700 10px ${F}`;
        const widthLabel = ctx.measureText(label).width + 28;
        const x = clamp(labelPoint.x - widthLabel / 2, 18, width - widthLabel - 18);
        const y = clamp(labelPoint.y - 30 - rank * 8, 18, height - 36);
        ctx.beginPath();
        ctx.roundRect(x, y, widthLabel, 22, 11);
        const calloutFill = ctx.createLinearGradient(x, y, x + widthLabel, y + 22);
        calloutFill.addColorStop(0, 'rgba(7,18,30,0.78)');
        calloutFill.addColorStop(1, 'rgba(10,40,58,0.82)');
        ctx.fillStyle = calloutFill;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.22)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = rank === 0 ? 'rgba(0,200,232,0.42)' : 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = rank === 0 ? '#9ef8ff' : '#eff6ff';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + widthLabel / 2, y + 14.5);
      });
    vehiclesRef.current.forEach((vehicle) => {
      ctx.save();
      ctx.translate(vehicle.x, vehicle.y);
      ctx.rotate(vehicle.angle);
      ctx.shadowBlur = vehicle.isLiveTelemetry ? 24 : 18;
      ctx.shadowColor = vehicle.type === 'passenger' ? PASSENGER_GLOW : PACKAGE_GLOW;
      if (vehicle.isLiveTelemetry) {
        ctx.beginPath();
        ctx.arc(0, 0, vehicle.freshness === 'fresh' ? 11 : 9, 0, Math.PI * 2);
        ctx.strokeStyle = vehicle.freshness === 'fresh' ? 'rgba(92,255,149,0.9)' : 'rgba(240,168,48,0.82)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      if (vehicle.type === 'passenger') {
        ctx.fillStyle = '#dffcff';
        ctx.beginPath();
        ctx.roundRect(-6, -3.6, 12, 7.2, 3);
        ctx.fill();
        ctx.fillStyle = PASSENGER_COLOR;
        ctx.fillRect(-3.4, -1.8, 6.8, 3.6);
      } else {
        ctx.fillStyle = '#fff2cd';
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
    CITY_DATA.forEach((city) => {
      const point = project(city.lat, city.lon, width, height);
      const selected = city.id === selectedCityId;
      ctx.beginPath();
      ctx.ellipse(point.x + width * 0.007, point.y + height * 0.02, selected ? 18 : city.isHub ? 13 : 10, selected ? 7 : 5, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fill();
      const haloRadius = (city.isHub ? 22 : 14) + Math.sin(phase * 0.0014 + city.id) * 2;
      const halo = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, haloRadius);
      halo.addColorStop(0, selected ? 'rgba(255,255,255,0.34)' : city.isHub ? 'rgba(0,200,232,0.26)' : 'rgba(255,255,255,0.16)');
      halo.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.beginPath();
      ctx.arc(point.x, point.y, haloRadius, 0, Math.PI * 2);
      ctx.fillStyle = halo;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 9 : city.isHub ? 7 : 5.5, 0, Math.PI * 2);
      ctx.fillStyle = selected ? 'rgba(255,255,255,0.98)' : city.isHub ? 'rgba(0,200,232,0.98)' : 'rgba(255,255,255,0.82)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - (selected ? 26 : city.isHub ? 22 : 18));
      ctx.lineTo(point.x, point.y - 6);
      ctx.strokeStyle = selected ? 'rgba(240,168,48,0.34)' : city.isHub ? 'rgba(0,200,232,0.28)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = selected ? 2 : 1.3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 4.6 : city.isHub ? 3.6 : 2.8, 0, Math.PI * 2);
      ctx.fillStyle = selected ? 'rgba(240,168,48,0.94)' : 'rgba(255,255,255,0.95)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(point.x, point.y, selected ? 14 : city.isHub ? 11 : 8, 0, Math.PI * 2);
      ctx.strokeStyle = selected ? 'rgba(240,168,48,0.82)' : city.isHub ? 'rgba(0,200,232,0.34)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = selected ? 1.5 : 1;
      ctx.stroke();

      const labelText = getCityLabel(city, ar);
      ctx.font = `700 ${selected ? 13 : 11}px ${F}`;
      const textWidth = ctx.measureText(labelText).width;
      const labelWidth = textWidth + 18;
      const labelHeight = selected ? 24 : 20;
      const labelX = point.x - labelWidth / 2;
      const labelY = point.y - 36;

      ctx.beginPath();
      ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 10);
      const labelFill = ctx.createLinearGradient(labelX, labelY, labelX + labelWidth, labelY + labelHeight);
      labelFill.addColorStop(0, selected ? 'rgba(16,40,58,0.92)' : 'rgba(10,24,38,0.72)');
      labelFill.addColorStop(1, selected ? 'rgba(11,54,76,0.92)' : 'rgba(7,18,30,0.7)');
      ctx.fillStyle = labelFill;
      ctx.shadowBlur = selected ? 18 : 8;
      ctx.shadowColor = selected ? 'rgba(240,168,48,0.18)' : 'rgba(0,200,232,0.08)';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = selected ? 'rgba(240,168,48,0.42)' : 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(point.x, point.y - 8);
      ctx.lineTo(point.x, labelY + labelHeight);
      ctx.strokeStyle = selected ? 'rgba(240,168,48,0.32)' : 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#EFF6FF';
      ctx.textAlign = 'center';
      ctx.fillText(labelText, point.x, labelY + labelHeight / 2 + 4);
    });

    const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, Math.min(width, height) * 0.2, width * 0.5, height * 0.48, Math.max(width, height) * 0.76);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, width - 24, height - 24);
    ctx.strokeStyle = 'rgba(0,200,232,0.16)';
    ctx.strokeRect(20, 20, width - 40, height - 40);

    [
      [26, 26, 48, 26, 26, 48],
      [width - 26, 26, width - 48, 26, width - 26, 48],
      [26, height - 26, 48, height - 26, 26, height - 48],
      [width - 26, height - 26, width - 48, height - 26, width - 26, height - 48],
    ].forEach((corner) => {
      ctx.beginPath();
      ctx.moveTo(corner[0], corner[1]);
      ctx.lineTo(corner[2], corner[3]);
      ctx.lineTo(corner[4], corner[5]);
      ctx.strokeStyle = 'rgba(0,200,232,0.34)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [ar, numberFormatter, selectedCityId, timeOfDay, viewMode]);

  const updateSimulation = useCallback((deltaTime: number, now: number) => {
    if (paused) return;
    routesRef.current = routesRef.current.map((route, index) => {
      const liveRoute = liveRouteOverrides.get(route.id);
      if (liveRoute) {
        return {
          ...route,
          passengerFlow: liveRoute.passengerFlow,
          packageFlow: liveRoute.packageFlow,
          density: liveRoute.density,
          speedKph: liveRoute.speedKph,
          congestion: liveRoute.congestion,
        };
      }
      const from = cityMap.get(route.from)!;
      const to = cityMap.get(route.to)!;
      const passengerFlow = Math.min(route.lanes * 1800, (demand(from.populationK, from.attractiveness, timeOfDay) + demand(to.populationK, to.attractiveness, timeOfDay + 0.35)) * 190 * (route.from === selectedCityId || route.to === selectedCityId ? 1.12 : 1));
      const packageFlow = Math.min(route.lanes * 820, (demand(from.populationK, from.attractiveness * 0.76, timeOfDay + 1.1) + demand(to.populationK, to.attractiveness * 0.7, timeOfDay + 1.6)) * 88);
      const density = clamp(10 + passengerFlow / 110 + packageFlow / 230 + Math.sin(now * 0.00035 + index * 0.6) * 4.2, 8, 130);
      return { ...route, passengerFlow, packageFlow, density, speedKph: speedFromDensity(density), congestion: clamp(density / TRAFFIC.CRITICAL, 0, 1) };
    });
    const routeMap = new Map(routesRef.current.map((route) => [route.id, route]));
    const canvas = canvasRef.current;
    const width = canvas ? parseFloat(canvas.style.width || '0') || BASE_W : BASE_W;
    const height = canvas ? parseFloat(canvas.style.height || '0') || BASE_H : BASE_H;
    vehiclesRef.current = vehiclesRef.current.map((vehicle, index) => {
      const route = routeMap.get(vehicle.routeId)!;
      const startCity = vehicle.direction === 1 ? cityMap.get(route.from)! : cityMap.get(route.to)!;
      const endCity = vehicle.direction === 1 ? cityMap.get(route.to)! : cityMap.get(route.from)!;
      const start = project(startCity.lat, startCity.lon, width, height);
      const end = project(endCity.lat, endCity.lon, width, height);
      if (vehicle.isLiveTelemetry && typeof vehicle.liveLat === 'number' && typeof vehicle.liveLng === 'number') {
        const livePoint = project(vehicle.liveLat, vehicle.liveLng, width, height);
        return {
          ...vehicle,
          x: livePoint.x,
          y: livePoint.y,
          angle: Math.atan2(end.y - start.y, end.x - start.x),
        };
      }
      let progress = vehicle.progress + (route.speedKph * vehicle.speedFactor / route.distanceKm) * deltaTime * 0.001 * 17 * FLOW_SPEED_SCALE;
      let direction = vehicle.direction;
      if (progress >= 1) { progress = 0; direction = vehicle.direction === 1 ? -1 : 1; }
      return { ...vehicle, progress, direction, x: start.x + (end.x - start.x) * progress, y: start.y + (end.y - start.y) * progress, angle: Math.atan2(end.y - start.y, end.x - start.x), passengers: vehicle.type === 'passenger' ? 1 + ((index + Math.round(route.passengerFlow)) % 4) : undefined, packageLoad: vehicle.type === 'package' ? clamp(Math.round((route.packageFlow / 70 + index) % (vehicle.packageCapacity ?? 12)), 1, vehicle.packageCapacity ?? 12) : undefined };
    });
    if (now - analyticsTickRef.current > 120) {
      analyticsTickRef.current = now;
      setRouteSnapshot(routesRef.current);
      const path = optimalPath(routesRef.current, selectedCityId, 1).map((id) => {
        const city = cityMap.get(id);
        return city ? getCityLabel(city, ar) : '';
      }).join(ar ? ' ← ' : ' -> ');
      if (liveSnapshot?.analytics) {
        setAnalytics({
          ...liveSnapshot.analytics,
          recommendedPath: path,
        });
        return;
      }
      const passengerVehicles = vehiclesRef.current.filter((vehicle) => vehicle.type === 'passenger');
      const packageVehicles = vehiclesRef.current.filter((vehicle) => vehicle.type === 'package');
      const activePassengers = passengerVehicles.reduce((sum, vehicle) => sum + (vehicle.passengers ?? 0), 0);
      const seatCapacity = passengerVehicles.reduce((sum, vehicle) => sum + (vehicle.seatCapacity ?? 0), 0);
      const packageCapacity = packageVehicles.reduce((sum, vehicle) => sum + ((vehicle.packageCapacity ?? 0) - (vehicle.packageLoad ?? 0)), 0);
      const avgSpeed = routesRef.current.reduce((sum, route) => sum + route.speedKph, 0) / routesRef.current.length;
      const congestionLevel = routesRef.current.reduce((sum, route) => sum + route.congestion, 0) / routesRef.current.length;
      const topRoute = [...routesRef.current].sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow))[0];
      setAnalytics({
        totalVehicles: vehiclesRef.current.length,
        activePassengers,
        activePackages: packageVehicles.reduce((sum, vehicle) => sum + (vehicle.packageLoad ?? 0), 0),
        seatAvailability: Math.max(0, seatCapacity - activePassengers),
        packageCapacity: Math.max(0, packageCapacity),
        avgSpeed,
        networkUtilization: vehiclesRef.current.length / (TARGET_VEHICLES * 1.15),
        congestionLevel,
        topCorridor: `${getCityLabel(cityMap.get(topRoute.from)!, ar)}${ar ? ' ← ' : ' -> '}${getCityLabel(cityMap.get(topRoute.to)!, ar)}`,
        recommendedPath: path,
        dispatchAction: topRoute.congestion > 0.78
          ? (ar ? `إعادة توجيه العرض باتجاه ${getCityLabel(cityMap.get(topRoute.to)!, ar)}` : `Reposition supply toward ${getCityLabel(cityMap.get(topRoute.to)!, ar)}`)
          : (ar ? `موازنة العرض حول ${getCityLabel(cityMap.get(selectedCityId)!, ar)}` : `Balance supply around ${getCityLabel(cityMap.get(selectedCityId)!, ar)}`),
      });
    }
  }, [ar, liveSnapshot, liveRouteOverrides, paused, selectedCityId, timeOfDay]);

  useEffect(() => {
    routesRef.current = initialRoutes(timeOfDay);
    vehiclesRef.current = buildVehicleFleet(routesRef.current, liveSnapshot?.vehicles ?? []);
    setRouteSnapshot(routesRef.current);
  }, [liveSnapshot, timeOfDay]);

  useEffect(() => {
    if (!liveSnapshot) return;
    routesRef.current = initialRoutes(timeOfDay).map((route) => {
      const liveRoute = liveRouteOverrides.get(route.id);
      return liveRoute
        ? {
            ...route,
            passengerFlow: liveRoute.passengerFlow,
            packageFlow: liveRoute.packageFlow,
            density: liveRoute.density,
            speedKph: liveRoute.speedKph,
            congestion: liveRoute.congestion,
          }
        : route;
    });
    vehiclesRef.current = buildVehicleFleet(routesRef.current, liveSnapshot.vehicles);
    setRouteSnapshot(routesRef.current);
    setAnalytics((current) => ({
      ...current,
      ...liveSnapshot.analytics,
    }));
  }, [liveRouteOverrides, liveSnapshot, timeOfDay]);

  useEffect(() => {
    resizeCanvas();
    drawScene();
    const observer = new ResizeObserver(() => { resizeCanvas(); drawScene(); });
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, [drawScene, resizeCanvas]);

  useEffect(() => {
    const loop = (timestamp: number) => {
      if (prevTimeRef.current === null) prevTimeRef.current = timestamp;
      const delta = timestamp - prevTimeRef.current;
      prevTimeRef.current = timestamp;
      phaseRef.current = timestamp;
      updateSimulation(delta, timestamp);
      drawScene();
      frameRef.current = requestAnimationFrame(loop);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => { if (frameRef.current !== null) cancelAnimationFrame(frameRef.current); prevTimeRef.current = null; };
  }, [drawScene, updateSimulation]);

  const visibleRoutes = useMemo(() => {
    const filtered = routeSnapshot.filter((route) => route.from === selectedCityId || route.to === selectedCityId);
    return (filtered.length ? filtered : routeSnapshot).slice().sort((a, b) => b.passengerFlow + b.packageFlow - (a.passengerFlow + a.packageFlow)).slice(0, 6);
  }, [routeSnapshot, selectedCityId]);
  const selectedCity = cityMap.get(selectedCityId)!;
  const activeMode = {
    command: { title: copy.commandMode, body: copy.commandModeBody, accent: C.cyan },
    satellite: { title: copy.satelliteMode, body: copy.satelliteModeBody, accent: C.green },
    pulse: { title: copy.pulseMode, body: copy.pulseModeBody, accent: C.purple },
  }[viewMode];
  const heroSignals = [
    { label: copy.controlState, value: paused ? (ar ? 'متوقف مؤقتاً' : 'Paused') : copy.liveSync, tone: paused ? C.orange : C.green },
    { label: `${copy.topCorridor} · ${liveTag}`, value: analytics.topCorridor || (ar ? 'عمّان ← الزرقاء' : 'Amman -> Zarqa'), tone: C.gold },
    { label: `${copy.dispatch} · ${liveTag}`, value: analytics.dispatchAction || (ar ? 'موازنة العرض' : 'Balance supply'), tone: C.text },
  ];
  const systemBands = [
    { label: `${ar ? 'الركاب' : 'Passengers'} · ${liveSnapshot ? liveTag : copy.simulationTag}`, value: numberFormatter.format(analytics.activePassengers), sub: ar ? `${numberFormatter.format(analytics.seatAvailability)} مقعد متاح` : `${analytics.seatAvailability} seats open`, color: PASSENGER_COLOR },
    { label: `${ar ? 'الطرود' : 'Packages'} · ${liveSnapshot ? liveTag : copy.simulationTag}`, value: numberFormatter.format(analytics.activePackages), sub: ar ? `${numberFormatter.format(analytics.packageCapacity)} خانة متاحة` : `${analytics.packageCapacity} slots open`, color: PACKAGE_COLOR },
    { label: `${ar ? 'السرعة' : 'Velocity'} · ${copy.estimateTag}`, value: `${numberFormatter.format(Math.round(analytics.avgSpeed))} ${ar ? 'كم/س' : 'km/h'}`, sub: ar ? `${numberFormatter.format(Math.round(analytics.networkUtilization * 100))}% استخدام` : `${Math.round(analytics.networkUtilization * 100)}% utilization`, color: C.green },
    { label: `${ar ? 'الضغط' : 'Pressure'} · ${copy.estimateTag}`, value: `${numberFormatter.format(Math.round(analytics.congestionLevel * 100))}%`, sub: activeMode.title, color: C.orange },
  ];

  return (
    <div dir={dir} style={{ minHeight: '100vh', background: `${GRAD_AURORA}, radial-gradient(circle at 15% 12%, rgba(0,200,232,0.16), transparent 22%), radial-gradient(circle at 82% 18%, rgba(240,168,48,0.14), transparent 24%), radial-gradient(circle at 50% 100%, rgba(92,255,149,0.08), transparent 28%), ${C.bg}`, color: C.text, fontFamily: F, padding: '20px 14px 88px' }}>
      <div style={{ maxWidth: 1460, margin: '0 auto', display: 'grid', gap: 18 }}>
        <section style={glassPanelStyle({ padding: 28, borderRadius: 34 })}>
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(255,255,255,0.04), transparent 24%, transparent 72%, rgba(0,200,232,0.08))' }} />
          <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, 0.8fr)' }}>
              <div style={{ display: 'grid', gap: 14, alignContent: 'start' }}>
                <div style={sectionLabelStyle}>{copy.heroLabel}</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <h1 style={{ margin: 0, fontSize: 'clamp(2.25rem, 4.6vw, 4.25rem)', lineHeight: 0.96, letterSpacing: '-0.05em', maxWidth: 920 }}>{copy.heroTitle}</h1>
                  <p style={{ margin: 0, color: C.textSub, lineHeight: 1.78, maxWidth: 820, fontSize: '1rem' }}>{copy.heroBody}</p>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 2 }}>
                  {heroSignals.map((signal) => (
                    <div key={signal.label} style={{ minWidth: 170, padding: '12px 14px', borderRadius: 18, border: `1px solid ${C.borderFaint}`, background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.025))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                      <div style={{ color: C.textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{signal.label}</div>
                      <div style={{ marginTop: 6, color: signal.tone, fontWeight: 900, fontSize: signal.label === copy.dispatch ? '0.94rem' : '1rem', lineHeight: 1.35 }}>{signal.value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ ...glassPanelStyle({ padding: 16, borderRadius: 24, boxShadow: 'none' }), background: 'linear-gradient(180deg, rgba(9,25,43,0.94), rgba(5,12,24,0.98))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div>
                      <div style={{ color: C.textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{ar ? 'الساعة التشغيلية' : 'Operating hour'}</div>
                      <div style={{ marginTop: 6, fontSize: '1.1rem', fontWeight: 900 }}>{ar ? 'ساعة الشبكة الأردنية' : 'Jordan network chronograph'}</div>
                    </div>
                    <strong style={{ color: C.gold, fontSize: '1.1rem' }}>{String(timeOfDay).padStart(2, '0')}:00</strong>
                  </div>
                  <input type="range" min={0} max={23} step={1} value={timeOfDay} className="mobility-os-slider" onChange={(event) => setTimeOfDay(Number(event.target.value))} style={{ width: '100%', marginTop: 14 }} />
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    {[
                      { label: ar ? 'الشروق' : 'Sunrise', value: '06:00' },
                      { label: ar ? 'الذروة' : 'Peak', value: '08:00 / 18:00' },
                      { label: ar ? 'الشحن' : 'Freight', value: '13:00' },
                    ].map((item) => (
                      <div key={item.label} style={{ padding: '10px 12px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
                        <div style={{ color: C.textMuted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{item.label}</div>
                        <div style={{ marginTop: 4, color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ ...glassPanelStyle({ padding: 16, borderRadius: 24, boxShadow: 'none' }), background: 'linear-gradient(180deg, rgba(8,20,37,0.94), rgba(4,10,22,0.98))' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ color: C.textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{ar ? 'نمط العرض' : 'Presentation mode'}</div>
                      <div style={{ marginTop: 6, fontWeight: 900, fontSize: '1.02rem', color: activeMode.accent }}>{activeMode.title}</div>
                    </div>
                    <button onClick={() => setPaused((value) => !value)} style={{ height: 42, padding: '0 16px', borderRadius: R.full, border: `1px solid ${paused ? C.border : C.cyanGlow}`, background: paused ? 'rgba(255,255,255,0.04)' : C.cyanDim, color: C.text, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', fontWeight: 800 }}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? (ar ? 'استئناف' : 'Resume') : (ar ? 'إيقاف' : 'Pause')}</button>
                  </div>
                  <div style={{ color: C.textSub, fontSize: '0.88rem', lineHeight: 1.65 }}>{activeMode.body}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                {[
                  { id: 'command', label: ar ? 'قيادة' : 'Command' },
                  { id: 'satellite', label: ar ? 'تضاريس' : 'Satellite' },
                  { id: 'pulse', label: ar ? 'نبض' : 'Pulse' },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as ViewMode)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 999,
                      border: `1px solid ${viewMode === mode.id ? C.cyan : C.border}`,
                      background: viewMode === mode.id ? 'rgba(0,200,232,0.14)' : 'rgba(255,255,255,0.035)',
                      color: viewMode === mode.id ? C.text : C.textSub,
                      cursor: 'pointer',
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      fontSize: '0.72rem',
                      boxShadow: viewMode === mode.id ? '0 0 24px rgba(0,200,232,0.18)' : 'none',
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
              {systemBands.map((band, index) => {
                const displayLabel = index <= 1
                  ? band.label.replace(liveTag, liveOpsTag)
                  : band.label.replace(copy.estimateTag, estimatedFromLoadLabel);
                return (
                <div key={band.label} style={{ padding: '16px 18px', borderRadius: 22, border: `1px solid ${C.borderFaint}`, background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{displayLabel}</div>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: band.color, boxShadow: `0 0 18px ${band.color}` }} />
                  </div>
                  <div style={{ marginTop: 10, fontSize: '1.42rem', fontWeight: 900, color: band.color, textShadow: `0 0 22px ${band.color}30` }}>{band.value}</div>
                  <div style={{ marginTop: 6, color: C.textSub, fontSize: '0.84rem' }}>{band.sub}</div>
                </div>
              )})}
            </div>
            <div style={{ color: C.textMuted, fontSize: '0.8rem', lineHeight: 1.65 }}>
              {copy.simulationNotice}
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 0.7fr)' }}>
              <div style={{ padding: '14px 16px', borderRadius: 20, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{sourceMatrixLabel}</div>
                <div style={{ marginTop: 8, color: C.textSub, fontSize: '0.88rem', lineHeight: 1.7 }}>{sourceMatrixBody}</div>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: 20, border: `1px solid ${C.borderFaint}`, background: 'rgba(255,255,255,0.03)', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ color: C.textMuted, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{telemetryLabel}</div>
                  <div style={{ color: telemetryTone, fontWeight: 800, fontSize: '0.82rem' }}>{telemetryStatus}</div>
                </div>
                <div style={{ color: C.textSub, fontSize: '0.84rem' }}>
                  {telemetryCoverageLabel}: {numberFormatter.format(liveSnapshot?.telemetry.freshTripsWithTelemetry ?? 0)} / {numberFormatter.format(liveSnapshot?.telemetry.totalTripsWithTelemetry ?? 0)}
                </div>
                <div style={{ color: C.textSub, fontSize: '0.84rem' }}>
                  {telemetryHeartbeatLabel}: {latestHeartbeatValue}
                </div>
                <div style={{ color: C.textSub, fontSize: '0.84rem' }}>
                  {ar ? 'حركة المرور' : 'Traffic feed'}: {liveSnapshot?.traffic.enabled ? (ar ? `متصل عبر Google Routes (${numberFormatter.format(liveSnapshot.traffic.liveCorridors)} ممرات)` : `Connected via Google Routes (${liveSnapshot.traffic.liveCorridors} corridors)`) : (ar ? 'غير متاح حتى تهيئة مفتاح خرائط حقيقي' : 'Unavailable until a real Maps key is configured')}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 18 }}>
          <div style={glassPanelStyle({ padding: 20, borderRadius: 30, background: 'linear-gradient(180deg, rgba(8,20,37,0.97), rgba(4,10,22,0.99))', alignSelf: 'start' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={sectionLabelStyle}>{copy.operationalMap}</div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', letterSpacing: '-0.03em' }}>{copy.mapTitle}</h2>
                <p style={{ margin: 0, color: C.textSub, lineHeight: 1.68, maxWidth: 700 }}>{copy.mapBody}</p>
              </div>
              <div style={{ display: 'grid', gap: 10, alignContent: 'start' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {[{ label: copy.passengerFlow, stroke: `3px solid ${PASSENGER_COLOR}` }, { label: copy.packageFlow, stroke: `3px dashed ${PACKAGE_COLOR}` }].map((item) => (
                    <div key={item.label} style={{ padding: '9px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.035)', color: C.textSub, fontSize: '0.82rem', display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ width: 34, height: 0, borderTop: item.stroke, display: 'inline-block' }} />
                      {item.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {[{ label: `${copy.routeIntelligence} · ${copy.modeledTag}`, value: analytics.recommendedPath || (ar ? 'عمّان ← العقبة' : 'Amman -> Aqaba'), color: C.cyan }, { label: copy.activeMode, value: activeMode.title, color: activeMode.accent }].map((item) => (
                    <div key={item.label} style={{ padding: '12px 14px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))' }}>
                      <div style={{ color: C.textMuted, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{item.label}</div>
                      <div style={{ marginTop: 6, color: item.color, fontWeight: 800, fontSize: '0.86rem', lineHeight: 1.45 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div ref={wrapRef} style={{ ...glassPanelStyle({ padding: 0, borderRadius: 34, aspectRatio: `${HERO_MAP_ASPECT} / 1`, minHeight: 'clamp(500px, 54vw, 860px)', boxShadow: '0 60px 160px rgba(0,0,0,0.54), inset 0 1px 0 rgba(255,255,255,0.08)', transform: 'perspective(2200px) rotateX(5deg)', transformStyle: 'preserve-3d', transformOrigin: 'center top' }), background: 'linear-gradient(180deg, rgba(6,16,28,0.98), rgba(5,12,22,0.98))' }}>
              <div style={{ position: 'absolute', inset: -30, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 8%, rgba(255,255,255,0.07), transparent 24%), radial-gradient(circle at 14% 30%, rgba(0,200,232,0.14), transparent 20%), radial-gradient(circle at 84% 26%, rgba(240,168,48,0.12), transparent 22%)', filter: 'blur(18px)', opacity: 0.9 }} />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(135deg, rgba(255,255,255,0.04), transparent 18%, transparent 82%, rgba(0,200,232,0.06))' }} />
              <div style={{ position: 'absolute', inset: 14, borderRadius: 22, border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at top center, rgba(255,255,255,0.08), transparent 22%), radial-gradient(circle at bottom right, rgba(0,200,232,0.08), transparent 28%)' }} />
              <div style={{ position: 'absolute', inset: '0 0 auto 0', height: '24%', pointerEvents: 'none', background: 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0.03) 42%, rgba(255,255,255,0))', mixBlendMode: 'screen', opacity: 0.48 }} />
              <div style={{ position: 'absolute', left: 24, right: 24, bottom: -22, height: 38, borderRadius: 999, pointerEvents: 'none', background: 'linear-gradient(90deg, rgba(0,200,232,0), rgba(0,200,232,0.24), rgba(240,168,48,0.18), rgba(0,200,232,0.24), rgba(0,200,232,0))', filter: 'blur(16px)', opacity: 0.8 }} />
              <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: 'grid', gap: 10 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.68)', border: `1px solid ${C.border}`, backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.24)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: '#5CFF95', boxShadow: '0 0 14px #5CFF95' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>{copy.liveMesh}</span>
                </div>
                <div style={{ display: 'grid', gap: 6, padding: '10px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: C.textMuted }}>{copy.modelRecommendation}</div>
                  <div style={{ fontFamily: FM, fontSize: '0.78rem', color: C.cyan }}>optimal_path(selected,aqaba)</div>
                  <div style={{ fontSize: '0.8rem', color: C.textSub }}>{analytics.recommendedPath || (ar ? 'عمّان ← العقبة' : 'Amman -> Aqaba')}</div>
                </div>
              </div>
              <div style={{ position: 'absolute', right: 16, top: 16, zIndex: 2, display: 'grid', gap: 8 }}>
                {[{ label: `${copy.passengerFlow} · ${copy.simulationTag}`, value: numberFormatter.format(analytics.activePassengers), color: PASSENGER_COLOR }, { label: `${copy.parcelLoad} · ${copy.simulationTag}`, value: numberFormatter.format(analytics.activePackages), color: PACKAGE_COLOR }].map((chip) => (
                  <div key={chip.label} style={{ padding: '10px 12px', borderRadius: 16, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', minWidth: 146 }}>
                    <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: C.textMuted }}>{chip.label}</div>
                    <div style={{ marginTop: 4, color: chip.color, fontSize: '1.05rem', fontWeight: 900, textShadow: `0 0 16px ${chip.color}44` }}>{chip.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', left: 16, right: 16, bottom: 16, zIndex: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  `${copy.topCorridor} ${analytics.topCorridor || (ar ? 'عمّان ← الزرقاء' : 'Amman -> Zarqa')}`,
                  `${copy.dispatch} ${analytics.dispatchAction || (ar ? 'موازنة العرض' : 'Balance supply')}`,
                  ar ? `المقاعد ${numberFormatter.format(analytics.seatAvailability)} / السعة ${numberFormatter.format(analytics.packageCapacity)}` : `Seats ${analytics.seatAvailability} / Capacity ${analytics.packageCapacity}`,
                ].map((chip) => (
                  <div key={chip} style={{ padding: '9px 12px', borderRadius: 999, background: 'rgba(4,12,24,0.58)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(16px)', color: C.textSub, fontSize: '0.78rem' }}>
                    {chip}
                  </div>
                ))}
              </div>
              <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none' }}>
                <div style={{ width: 180, height: 18, borderRadius: 999, background: 'linear-gradient(90deg, rgba(0,200,232,0), rgba(0,200,232,0.16), rgba(240,168,48,0.16), rgba(240,168,48,0))', filter: 'blur(10px)' }} />
              </div>
              <div style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', zIndex: 2, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.28em', textTransform: 'uppercase', fontSize: '0.64rem', color: 'rgba(255,255,255,0.34)', pointerEvents: 'none' }}>
                {copy.mobilityMatrix}
              </div>
              <div style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', zIndex: 2, writingMode: 'vertical-rl', textOrientation: 'mixed', letterSpacing: '0.28em', textTransform: 'uppercase', fontSize: '0.64rem', color: 'rgba(0,200,232,0.34)', pointerEvents: 'none' }}>
                {copy.signalLayer}
              </div>
              <canvas ref={canvasRef} onClick={(event) => { const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top; let match = selectedCityId; let min = 26; CITY_DATA.forEach((city) => { const point = project(city.lat, city.lon, rect.width, rect.height); const distance = Math.hypot(point.x - x, point.y - y); if (distance < min) { min = distance; match = city.id; } }); setSelectedCityId(match); }} style={{ display: 'block', width: '100%', height: '100%', cursor: 'crosshair', borderRadius: 32, filter: 'saturate(1.22) contrast(1.08) brightness(1.04) drop-shadow(0 30px 50px rgba(0,0,0,0.22))' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <article style={glassPanelStyle({ padding: 18, borderRadius: 26, background: 'linear-gradient(180deg, rgba(8,24,38,0.96), rgba(4,10,22,0.98))' })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><MapPinned size={18} color={C.cyan} /><h3 style={{ margin: 0, fontSize: '1rem' }}>{copy.selectedNode}</h3></div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>{CITY_DATA.map((city) => <button key={city.id} onClick={() => setSelectedCityId(city.id)} style={{ padding: '10px 12px', borderRadius: 14, border: `1px solid ${selectedCityId === city.id ? C.gold : C.border}`, background: selectedCityId === city.id ? 'rgba(240,168,48,0.12)' : 'rgba(255,255,255,0.03)', color: C.text, cursor: 'pointer', fontWeight: selectedCityId === city.id ? 800 : 600 }}>{getCityLabel(city, ar)}</button>)}</div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                {[
                  ar ? `${copy.officialUnit} · ${copy.officialTag}: ${cityMap.get(selectedCityId)?.officialAreaAr ?? ''}` : `${copy.officialUnit} · ${copy.officialTag}: ${cityMap.get(selectedCityId)?.officialArea ?? ''}`,
                  `${copy.officialPopulation2025} · ${copy.officialTag}: ${numberFormatter.format(cityMap.get(selectedCityId)?.officialPopulation ?? 0)}`,
                  `${copy.modelRecommendation} ${analytics.recommendedPath}`,
                ].map((row, index) => (
                  <div key={row} style={{ padding: '10px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: index === 2 ? 'rgba(0,200,232,0.08)' : 'rgba(255,255,255,0.03)', color: index === 2 ? C.cyan : C.textSub, fontWeight: index === 2 ? 700 : 500 }}>
                    {row}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, color: C.textMuted, fontSize: '0.76rem', lineHeight: 1.6 }}>{copy.sourceJordanDos}</div>
            </article>
            <article style={glassPanelStyle({ padding: 18, borderRadius: 26, background: 'linear-gradient(180deg, rgba(9,19,35,0.96), rgba(4,10,22,0.98))' })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Route size={18} color={C.gold} /><h3 style={{ margin: 0, fontSize: '1rem' }}>{copy.actionableOutputs}</h3></div>
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>{[analytics.dispatchAction, `${copy.topCorridor}: ${analytics.topCorridor}`, ar ? `توفر المقاعد: ${numberFormatter.format(analytics.seatAvailability)} / سعة الطرود: ${numberFormatter.format(analytics.packageCapacity)}` : `Seat availability: ${analytics.seatAvailability} / Package capacity: ${analytics.packageCapacity}`].map((item, index) => <div key={item} style={{ padding: '12px 14px', borderRadius: 16, background: index === 0 ? 'linear-gradient(135deg, rgba(240,168,48,0.12), rgba(255,255,255,0.03))' : 'rgba(255,255,255,0.03)', border: `1px solid ${index === 0 ? 'rgba(240,168,48,0.24)' : C.borderFaint}`, color: C.textSub, lineHeight: 1.6, boxShadow: index === 0 ? '0 10px 24px rgba(240,168,48,0.08)' : 'none' }}>{item}</div>)}</div>
              <div style={{ marginTop: 12, color: C.textMuted, fontSize: '0.76rem', lineHeight: 1.6 }}>{ar ? 'هذه التوصيات تقديرية وناتجة عن نموذج المحاكاة، وليست بيانات تشغيل حكومية مباشرة.' : 'These recommendations are estimated by the simulation model and are not direct government operational data.'}</div>
            </article>
          </div>
        </section>

        <section style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <article style={glassPanelStyle({ padding: 22, borderRadius: 32, background: 'linear-gradient(180deg, rgba(8,18,34,0.98), rgba(4,10,22,1))' })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 18 }}>
              <div>
                <div style={sectionLabelStyle}>{copy.corridorIntelligence}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}><Gauge size={18} color={C.cyan} /><h3 style={{ margin: 0, fontSize: '1.25rem' }}>{copy.corridorDeck}</h3></div>
                <div style={{ marginTop: 6, color: C.textMuted, fontSize: '0.84rem' }}>{copy.corridorDeckBody}</div>
              </div>
              <div style={{ padding: '10px 14px', borderRadius: 999, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.03)', color: C.textSub, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                {copy.liveRanking} / {numberFormatter.format(visibleRoutes.length)} {copy.corridors}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {visibleRoutes.map((route, index) => {
                const from = cityMap.get(route.from)!;
                const to = cityMap.get(route.to)!;
                const totalFlow = Math.round(route.passengerFlow + route.packageFlow);
                const routeScore = Math.round((route.passengerFlow / Math.max(route.lanes * 1800, 1)) * 52 + (route.packageFlow / Math.max(route.lanes * 820, 1)) * 18 + (1 - route.congestion) * 30);
                const pressureTone = route.congestion > 0.75 ? 'rgba(255,120,92,0.16)' : route.packageFlow > route.passengerFlow * 0.45 ? 'rgba(240,168,48,0.14)' : 'rgba(0,200,232,0.12)';
                return (
                  <div key={route.id} style={{ position: 'relative', padding: '18px 18px 16px', borderRadius: 24, border: `1px solid ${index === 0 ? C.cyanGlow : C.borderFaint}`, background: `linear-gradient(180deg, ${pressureTone}, rgba(255,255,255,0.025))`, boxShadow: index === 0 ? '0 18px 40px rgba(0,200,232,0.12)' : '0 10px 30px rgba(0,0,0,0.16)' }}>
                    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(circle at top right, ${index === 0 ? 'rgba(0,200,232,0.16)' : 'rgba(255,255,255,0.05)'}, transparent 32%)` }} />
                    <div style={{ position: 'absolute', inset: 1, borderRadius: 23, border: '1px solid rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
                    <div style={{ position: 'relative', display: 'grid', gap: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div style={{ display: 'grid', gap: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <div style={{ width: 34, height: 34, borderRadius: 12, background: index === 0 ? 'rgba(0,200,232,0.16)' : 'rgba(255,255,255,0.06)', border: `1px solid ${index === 0 ? 'rgba(0,200,232,0.24)' : 'rgba(255,255,255,0.08)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: index === 0 ? C.cyan : C.textSub }}>
                              {String(index + 1).padStart(2, '0')}
                            </div>
                            <div>
                              <div style={{ fontWeight: 900, fontSize: '1.02rem', letterSpacing: '-0.02em' }}>{getCityLabel(from, ar)}{ar ? ' ← ' : ' -> '}{getCityLabel(to, ar)}</div>
                              <div style={{ marginTop: 3, color: C.textMuted, fontSize: '0.8rem' }}>{ar ? route.highwayAr : route.highway} / {numberFormatter.format(route.distanceKm)} {ar ? 'كم' : 'km'} / {numberFormatter.format(route.lanes)} {ar ? 'مسارب' : 'lanes'}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {[
                              { label: `${copy.speed} · ${copy.estimateTag}`, value: `${numberFormatter.format(Math.round(route.speedKph))} ${ar ? 'كم/س' : 'km/h'}`, color: C.green },
                              { label: `${copy.pressure} · ${copy.estimateTag}`, value: `${numberFormatter.format(Math.round(route.congestion * 100))}%`, color: C.orange },
                              { label: `${copy.flow} · ${copy.simulationTag}`, value: `${numberFormatter.format(totalFlow)}`, color: C.cyan },
                            ].map((pill) => (
                              <div key={pill.label} style={{ padding: '7px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: C.textSub, fontSize: '0.76rem' }}>
                                <span style={{ color: C.textMuted }}>{pill.label}</span>{' '}
                                <strong style={{ color: pill.color }}>{pill.value}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: 8, minWidth: 120 }}>
                          <div style={{ textAlign: 'right', color: C.textMuted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>{copy.compositeScore}</div>
                          <div style={{ textAlign: 'right', color: index === 0 ? C.cyan : C.text, fontWeight: 900, fontSize: '2rem', lineHeight: 1, textShadow: index === 0 ? '0 0 18px rgba(0,200,232,0.22)' : 'none' }}>
                            {routeScore}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                            {[
                          { label: `${copy.passengerOccupancy} · ${copy.estimateTag}`, value: route.passengerFlow / Math.max(route.lanes * 1800, 1), color: PASSENGER_COLOR, tone: 'rgba(0,200,232,0.08)' },
                          { label: `${copy.packageUtilization} · ${copy.estimateTag}`, value: route.packageFlow / Math.max(route.lanes * 820, 1), color: PACKAGE_COLOR, tone: 'rgba(240,168,48,0.08)' },
                          { label: `${copy.congestionIntensity} · ${copy.estimateTag}`, value: route.congestion, color: C.orange, tone: 'rgba(255,149,72,0.08)' },
                        ].map((metric) => (
                          <div key={metric.label} style={{ padding: '12px 12px 10px', borderRadius: 16, background: metric.tone, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                              <span style={{ fontSize: '0.76rem', color: C.textSub }}>{metric.label}</span>
                              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: metric.color }}>{Math.round(metric.value * 100)}%</span>
                            </div>
                            <div style={{ marginTop: 10, height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.round(metric.value * 100)}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${metric.color}, rgba(255,255,255,0.85))`, boxShadow: `0 0 18px ${metric.color}40` }} />
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
