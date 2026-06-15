// =======================================================
// MOBILITYOS CITY-TO-CITY SIMULATION ENGINE v11
// PRODUCTION-GRADE CLOSED LOOP + SCHEDULING + CONSERVATION
// Jordan Focus: Fixed Corridors + Dynamic Matching + Packages
// =======================================================

import type { CountryCode } from './utils/regionConfig';

// -------------------------------------------------------
// ALL JORDAN CITIES (12 GOVERNORATES + CAPITAL)
// -------------------------------------------------------

export type City =
  | 'Amman' | 'Irbid' | 'Zarqa' | 'Aqaba' | 'Madaba' | 'Karak'
  | 'Maan' | 'Jerash' | 'Ajloun' | 'Mafraq' | 'Salt' | 'Petra'
  | 'Wadi Rum' | 'Dead Sea' | 'Fuheis' | 'Sahab' | 'Marka';

export type JordanCity = City; // Alias for clarity

// -------------------------------------------------------
// CORE TYPES
// -------------------------------------------------------

export type PassengerRequest = {
  id: string;
  originCity: City;
  destinationCity: City;
  country: CountryCode;
  passengersCount: number;
  genderPreference: 'mixed' | 'women_only' | 'men_only' | 'family_only';
  maxPriceJOD?: number;
  requiresPackageCarriage?: boolean;
  packageWeightKg?: number;
  timestamp: number;
};

export type PackageRequest = {
  id: string;
  originCity: City;
  destinationCity: City;
  weightKg: number;
  fragile: boolean;
  declaredValueJOD: number;
  neededBy: number; // Timestamp
  timestamp: number;
};

export type DriverWithCapacity = {
  id: string;
  originCity: City;
  destinationCity: City;
  departureTime: number;
  totalSeats: number;
  availableSeats: number;
  cargoCapacityKg: number;
  allowsPackages: boolean;
  genderPreference: 'mixed' | 'women_only' | 'men_only' | 'family_only';
  rating: number;
  trustScore: number;
  waypoints?: City[];
};

export type Booking = {
  id: string;
  tripId: string;
  passengerIds: string[];
  packageIds: string[];
  seatsBooked: number;
  cargoBookedKg: number;
  priceJOD: number;
  status: 'pending' | 'confirmed' | 'in_transit' | 'completed' | 'cancelled';
  createdAt: number;
};

export type CorridorRoute = {
  id: string;
  origin: City;
  destination: City;
  distanceKm: number;
  baseDurationMin: number;
  departureIntervalMin: number;
  baseSeatCapacity: number;
  baseCargoCapacityKg: number;
  nextDepartureTime: number;
  packageEnabled: boolean;
};

export type CorridorMetrics = {
  routeId: string;
  origin: City;
  destination: City;
  seatPressure: number;
  cargoPressure: number;
  status: 'underutilized' | 'optimal' | 'overloaded';
  demandPerHour: number;
};

export type LivePricing = {
  basePrice: number;
  dynamicMultiplier: number;
  surgeFactor: number;
  finalPrice: number;
  priceReasons: string[];
};

// -------------------------------------------------------
// JORDAN DISTANCE MATRIX (REALISTIC ROAD DISTANCES)
// -------------------------------------------------------

const JORDAN_DISTANCES: Record<City, Record<City, number>> = {
  'Amman': {
    'Amman': 0, 'Irbid': 85, 'Zarqa': 30, 'Aqaba': 330, 'Madaba': 33,
    'Karak': 130, 'Maan': 210, 'Jerash': 50, 'Ajloun': 75, 'Mafraq': 65,
    'Salt': 30, 'Petra': 250, 'Wadi Rum': 320, 'Dead Sea': 60, 'Fuheis': 20,
    'Sahab': 15, 'Marka': 10,
  },
  'Irbid': {
    'Amman': 85, 'Irbid': 0, 'Zarqa': 110, 'Aqaba': 380, 'Madaba': 115,
    'Karak': 210, 'Maan': 290, 'Jerash': 20, 'Ajloun': 25, 'Mafraq': 120,
    'Salt': 90, 'Petra': 290, 'Wadi Rum': 390, 'Dead Sea': 145, 'Fuheis': 70,
    'Sahab': 95, 'Marka': 95,
  },
  'Zarqa': {
    'Amman': 30, 'Irbid': 110, 'Zarqa': 0, 'Aqaba': 360, 'Madaba': 55,
    'Karak': 160, 'Maan': 240, 'Jerash': 70, 'Ajloun': 105, 'Mafraq': 95,
    'Salt': 60, 'Petra': 270, 'Wadi Rum': 340, 'Dead Sea': 85, 'Fuheis': 45,
    'Sahab': 35, 'Marka': 25,
  },
  'Aqaba': {
    'Amman': 330, 'Irbid': 380, 'Zarqa': 360, 'Aqaba': 0, 'Madaba': 360,
    'Karak': 180, 'Maan': 95, 'Jerash': 400, 'Ajloun': 420, 'Mafraq': 400,
    'Salt': 360, 'Petra': 130, 'Wadi Rum': 220, 'Dead Sea': 390, 'Fuheis': 340,
    'Sahab': 345, 'Marka': 320,
  },
  'Madaba': {
    'Amman': 33, 'Irbid': 115, 'Zarqa': 55, 'Aqaba': 360, 'Madaba': 0,
    'Karak': 100, 'Maan': 180, 'Jerash': 80, 'Ajloun': 100, 'Mafraq': 90,
    'Salt': 60, 'Petra': 210, 'Wadi Rum': 340, 'Dead Sea': 30, 'Fuheis': 50,
    'Sahab': 45, 'Marka': 43,
  },
  'Karak': {
    'Amman': 130, 'Irbid': 210, 'Zarqa': 160, 'Aqaba': 180, 'Madaba': 100,
    'Karak': 0, 'Maan': 120, 'Jerash': 180, 'Ajloun': 200, 'Mafraq': 190,
    'Salt': 160, 'Petra': 80, 'Wadi Rum': 250, 'Dead Sea': 130, 'Fuheis': 140,
    'Sahab': 145, 'Marka': 120,
  },
  'Maan': {
    'Amman': 210, 'Irbid': 290, 'Zarqa': 240, 'Aqaba': 95, 'Madaba': 180,
    'Karak': 120, 'Maan': 0, 'Jerash': 260, 'Ajloun': 280, 'Mafraq': 255,
    'Salt': 195, 'Petra': 150, 'Wadi Rum': 150, 'Dead Sea': 210, 'Fuheis': 215,
    'Sahab': 210, 'Marka': 190,
  },
  'Jerash': {
    'Amman': 50, 'Irbid': 20, 'Zarqa': 70, 'Aqaba': 400, 'Madaba': 80,
    'Karak': 180, 'Maan': 260, 'Jerash': 0, 'Ajloun': 45, 'Mafraq': 140,
    'Salt': 60, 'Petra': 230, 'Wadi Rum': 360, 'Dead Sea': 110, 'Fuheis': 65,
    'Sahab': 60, 'Marka': 40,
  },
  'Ajloun': {
    'Amman': 75, 'Irbid': 25, 'Zarqa': 105, 'Aqaba': 420, 'Madaba': 100,
    'Karak': 200, 'Maan': 280, 'Jerash': 45, 'Ajloun': 0, 'Mafraq': 165,
    'Salt': 100, 'Petra': 260, 'Wadi Rum': 380, 'Dead Sea': 140, 'Fuheis': 95,
    'Sahab': 90, 'Marka': 70,
  },
  'Mafraq': {
    'Amman': 65, 'Irbid': 120, 'Zarqa': 95, 'Aqaba': 400, 'Madaba': 90,
    'Karak': 190, 'Maan': 255, 'Jerash': 140, 'Ajloun': 165, 'Mafraq': 0,
    'Salt': 90, 'Petra': 290, 'Wadi Rum': 370, 'Dead Sea': 120, 'Fuheis': 100,
    'Sahab': 75, 'Marka': 55,
  },
  'Salt': {
    'Amman': 30, 'Irbid': 90, 'Zarqa': 60, 'Aqaba': 360, 'Madaba': 60,
    'Karak': 160, 'Maan': 195, 'Jerash': 60, 'Ajloun': 100, 'Mafraq': 90,
    'Salt': 0, 'Petra': 240, 'Wadi Rum': 350, 'Dead Sea': 90, 'Fuheis': 50,
    'Sahab': 45, 'Marka': 35,
  },
  'Petra': {
    'Amman': 250, 'Irbid': 290, 'Zarqa': 270, 'Aqaba': 130, 'Madaba': 210,
    'Karak': 80, 'Maan': 150, 'Jerash': 230, 'Ajloun': 260, 'Mafraq': 290,
    'Salt': 240, 'Petra': 0, 'Wadi Rum': 250, 'Dead Sea': 270, 'Fuheis': 275,
    'Sahab': 270, 'Marka': 245,
  },
  'Wadi Rum': {
    'Amman': 320, 'Irbid': 390, 'Zarqa': 340, 'Aqaba': 220, 'Madaba': 340,
    'Karak': 250, 'Maan': 150, 'Jerash': 360, 'Ajloun': 380, 'Mafraq': 370,
    'Salt': 350, 'Petra': 250, 'Wadi Rum': 0, 'Dead Sea': 380, 'Fuheis': 330,
    'Sahab': 345, 'Marka': 310,
  },
  'Dead Sea': {
    'Amman': 60, 'Irbid': 145, 'Zarqa': 85, 'Aqaba': 390, 'Madaba': 30,
    'Karak': 130, 'Maan': 210, 'Jerash': 110, 'Ajloun': 140, 'Mafraq': 120,
    'Salt': 90, 'Petra': 270, 'Wadi Rum': 380, 'Dead Sea': 0, 'Fuheis': 80,
    'Sahab': 75, 'Marka': 60,
  },
  'Fuheis': {
    'Amman': 20, 'Irbid': 70, 'Zarqa': 45, 'Aqaba': 340, 'Madaba': 50,
    'Karak': 140, 'Maan': 215, 'Jerash': 65, 'Ajloun': 95, 'Mafraq': 100,
    'Salt': 50, 'Petra': 275, 'Wadi Rum': 330, 'Dead Sea': 80, 'Fuheis': 0,
    'Sahab': 35, 'Marka': 30,
  },
  'Sahab': {
    'Amman': 15, 'Irbid': 95, 'Zarqa': 35, 'Aqaba': 345, 'Madaba': 45,
    'Karak': 145, 'Maan': 210, 'Jerash': 60, 'Ajloun': 90, 'Mafraq': 75,
    'Salt': 45, 'Petra': 270, 'Wadi Rum': 345, 'Dead Sea': 75, 'Fuheis': 35,
    'Sahab': 0, 'Marka': 25,
  },
  'Marka': {
    'Amman': 10, 'Irbid': 95, 'Zarqa': 25, 'Aqaba': 320, 'Madaba': 43,
    'Karak': 120, 'Maan': 190, 'Jerash': 40, 'Ajloun': 70, 'Mafraq': 55,
    'Salt': 35, 'Petra': 245, 'Wadi Rum': 310, 'Dead Sea': 60, 'Fuheis': 30,
    'Sahab': 25, 'Marka': 0,
  },
};

// -------------------------------------------------------
// FIXED CORRIDOR ROUTES (HIGH CAPACITY BUS/LTL)
// -------------------------------------------------------

export const FIXED_CORRIDORS: CorridorRoute[] = [
  {
    id: 'COR_AMM_AQB',
    origin: 'Amman',
    destination: 'Aqaba',
    distanceKm: 330,
    baseDurationMin: 240,
    departureIntervalMin: 120,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 1000,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_AMM_IRB',
    origin: 'Amman',
    destination: 'Irbid',
    distanceKm: 85,
    baseDurationMin: 90,
    departureIntervalMin: 60,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 800,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_AMM_ZRQ',
    origin: 'Amman',
    destination: 'Zarqa',
    distanceKm: 30,
    baseDurationMin: 35,
    departureIntervalMin: 30,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 500,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_IRB_JRS',
    origin: 'Irbid',
    destination: 'Jerash',
    distanceKm: 20,
    baseDurationMin: 30,
    departureIntervalMin: 45,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 400,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_JRS_AJL',
    origin: 'Jerash',
    destination: 'Ajloun',
    distanceKm: 45,
    baseDurationMin: 50,
    departureIntervalMin: 60,
    baseSeatCapacity: 30,
    baseCargoCapacityKg: 300,
    nextDepartureTime: Date.now(),
    packageEnabled: false,
  },
  {
    id: 'COR_AMM_MDB',
    origin: 'Amman',
    destination: 'Madaba',
    distanceKm: 33,
    baseDurationMin: 40,
    departureIntervalMin: 30,
    baseSeatCapacity: 30,
    baseCargoCapacityKg: 300,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_AMM_MAF',
    origin: 'Amman',
    destination: 'Mafraq',
    distanceKm: 65,
    baseDurationMin: 70,
    departureIntervalMin: 90,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 600,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_AMM_KRK',
    origin: 'Amman',
    destination: 'Karak',
    distanceKm: 130,
    baseDurationMin: 120,
    departureIntervalMin: 120,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 800,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_KRK_MRN',
    origin: 'Karak',
    destination: 'Maan',
    distanceKm: 120,
    baseDurationMin: 100,
    departureIntervalMin: 180,
    baseSeatCapacity: 50,
    baseCargoCapacityKg: 1200,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
  {
    id: 'COR_MRN_AQB',
    origin: 'Maan',
    destination: 'Aqaba',
    distanceKm: 95,
    baseDurationMin: 80,
    departureIntervalMin: 120,
    baseSeatCapacity: 45,
    baseCargoCapacityKg: 700,
    nextDepartureTime: Date.now(),
    packageEnabled: true,
  },
];

// -------------------------------------------------------
// CITY NODE STATE
// -------------------------------------------------------

export type CityNodeState = {
  city: City;
  outgoingDemand: number;
  incomingDemand: number;
  packageFlow: number;
  congestion: number;
  demandQueue: number;
};

type CityMap = Record<City, CityNodeState>;

// -------------------------------------------------------
// IMMUTABLE HELPERS
// -------------------------------------------------------

function cloneCities(cities: CityMap): CityMap {
  const next: Partial<Record<City, CityNodeState>> = {};
  for (const k of Object.keys(cities) as City[]) {
    next[k] = { ...cities[k] };
  }
  return next as CityMap;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// -------------------------------------------------------
// 1. SCHEDULER (REAL DISPATCH SYSTEM)
// -------------------------------------------------------

export function dispatchBuses(
  routes: CorridorRoute[],
  now: number
): { routes: CorridorRoute[]; newBuses: { id: string; routeId: string; departureTime: number; arrivalTime: number; status: 'scheduled'; seatsUsed: number; cargoUsedKg: number }[] } {
  const newBuses: { id: string; routeId: string; departureTime: number; arrivalTime: number; status: 'scheduled'; seatsUsed: number; cargoUsedKg: number }[] = [];
  const updatedRoutes = routes.map(r => {
    if (now < r.nextDepartureTime) return r;

    const busId = `${r.id}_${r.nextDepartureTime}`;
    newBuses.push({
      id: busId,
      routeId: r.id,
      departureTime: r.nextDepartureTime,
      arrivalTime: r.nextDepartureTime + r.baseDurationMin * 60_000,
      status: 'scheduled',
      seatsUsed: 0,
      cargoUsedKg: 0,
    });

    return {
      ...r,
      nextDepartureTime: r.nextDepartureTime + r.departureIntervalMin * 60_000,
    };
  });

  return { routes: updatedRoutes, newBuses };
}

// -------------------------------------------------------
// 2. BUS LIFECYCLE (IMMUTABLE STATE MACHINE)
// -------------------------------------------------------

export function updateBusInstances(
  buses: { id: string; routeId: string; departureTime: number; arrivalTime: number; status: 'scheduled' | 'in_transit' | 'arrived'; seatsUsed: number; cargoUsedKg: number }[],
  now: number
): { id: string; routeId: string; departureTime: number; arrivalTime: number; status: 'scheduled' | 'in_transit' | 'arrived'; seatsUsed: number; cargoUsedKg: number }[] {
  return buses
    .map(b => {
      if (now >= b.arrivalTime) {
        return { ...b, status: 'arrived' as const };
      }
      if (now >= b.departureTime) {
        return { ...b, status: 'in_transit' as const };
      }
      return b;
    })
    .filter(b => b.status !== 'arrived');
}

// -------------------------------------------------------
// 3. CONSERVATION FLOW ENGINE (NORMALIZED + STABLE)
// -------------------------------------------------------

export function propagateFlow(
  cities: CityMap,
  adjacency: Record<City, Record<City, number>>
): CityMap {
  const next = cloneCities(cities);

  const deltaIn: Partial<Record<City, number>> = {};
  const deltaOut: Partial<Record<City, number>> = {};
  const deltaCong: Partial<Record<City, number>> = {};

  for (const c of Object.keys(cities) as City[]) {
    deltaIn[c] = 0;
    deltaOut[c] = 0;
    deltaCong[c] = 0;
  }

  for (const city of Object.keys(cities) as City[]) {
    const node = cities[city];
    const neighbors = adjacency[city] || {};

    const total = Object.values(neighbors).reduce((a, b) => a + b, 0);

    const pressure = clamp01(node.congestion) * node.outgoingDemand;

    const spill = pressure / (1 + total);

    if (total > 0) {
      for (const n of Object.keys(neighbors) as City[]) {
        const w = neighbors[n] / total;

        deltaIn[n] += spill * w;
        deltaCong[n] += spill * 0.02;
      }
    }

    deltaOut[city] -= spill;
  }

  for (const city of Object.keys(cities) as City[]) {
    const c = cities[city];

    next[city] = {
      ...c,
      incomingDemand: c.incomingDemand + deltaIn[city],
      outgoingDemand: Math.max(0, c.outgoingDemand + deltaOut[city]),
      congestion: clamp01(c.congestion + deltaCong[city]),
    };
  }

  return next;
}

// -------------------------------------------------------
// 4. CORRIDOR PRESSURE (NONLINEAR SATURATION MODEL)
// -------------------------------------------------------

export function corridorPressure(demand: number, capacity: number): number {
  const x = demand / Math.max(1, capacity);
  return 1 - Math.exp(-x * 1.2);
}

// -------------------------------------------------------
// 5. DYNAMIC PRICING ENGINE
// -------------------------------------------------------

export function calculateLivePricing(
  basePrice: number,
  seatPressure: number,
  cargoPressure: number,
  timeOfDay: number,
  isHoliday: boolean
): LivePricing {
  const surge = seatPressure > 0.7 ? 1 + (seatPressure - 0.7) * 2 : 1;
  const cargoMultiplier = cargoPressure > 0.5 ? 1.1 : 1;

  let timeFactor = 1;
  const hour = (timeOfDay % (24 * 3600_000)) / 3600_000;

  if (hour >= 6 && hour < 9) timeFactor = 1.2;
  else if (hour >= 16 && hour < 19) timeFactor = 1.3;
  else if (hour >= 20 || hour < 5) timeFactor = 0.9;

  if (isHoliday) timeFactor *= 1.4;

  const dynamicMultiplier = surge * cargoMultiplier * timeFactor;
  const finalPrice = basePrice * dynamicMultiplier;

  const reasons: string[] = [];
  if (surge > 1) reasons.push('High demand surge');
  if (cargoMultiplier > 1) reasons.push('Cargo capacity limited');
  if (hour >= 6 && hour < 9) reasons.push('Morning rush hour');
  if (hour >= 16 && hour < 19) reasons.push('Evening rush hour');
  if (isHoliday) reasons.push('Holiday premium');

  return {
    basePrice,
    dynamicMultiplier,
    surgeFactor: surge,
    finalPrice: Math.round(finalPrice * 100) / 100,
    priceReasons: reasons,
  };
}

// -------------------------------------------------------
// 6. ROUTE OPTIMIZATION WITH REROUTING
// -------------------------------------------------------

export function calculateDynamicRoute(
  origin: City,
  destination: City,
  waypoints?: City[],
  _activeBuses?: { routeId: string; departureTime: number; arrivalTime: number }[]
): { orderedStops: City[]; totalDistanceKm: number; estimatedDurationMin: number; corridorsUsed: string[] } {
  const allStops = waypoints ? [origin, ...waypoints, destination] : [origin, destination];

  let totalDistance = 0;
  const corridorsUsed: string[] = [];

  for (let i = 0; i < allStops.length - 1; i++) {
    const from = allStops[i];
    const to = allStops[i + 1];
    if (from && to) {
      totalDistance += JORDAN_DISTANCES[from]?.[to] ?? 0;

      const directCorridor = FIXED_CORRIDORS.find(
        c => (c.origin === from && c.destination === to) || (c.origin === to && c.destination === from)
      );
      if (directCorridor) {
        corridorsUsed.push(directCorridor.id);
      }
    }
  }

  return {
    orderedStops: allStops,
    totalDistanceKm: totalDistance,
    estimatedDurationMin: Math.round(totalDistance * 1.3),
    corridorsUsed,
  };
}

// -------------------------------------------------------
// 7. POOLING ENGINE
// -------------------------------------------------------

export function canPoolRides(
  tripA: { origin: City; destination: City; waypoints?: City[] },
  tripB: { origin: City; destination: City; waypoints?: City[] }
): { canPool: boolean; detourKm: number; sharedCorridor: string | null } {
  const routeA = calculateDynamicRoute(tripA.origin, tripA.destination, tripA.waypoints);
  const routeB = calculateDynamicRoute(tripB.origin, tripB.destination, tripB.waypoints);

  if (routeA.corridorsUsed.length > 0 && routeA.corridorsUsed.some(r => routeB.corridorsUsed.includes(r))) {
    const shared = routeA.corridorsUsed.find(r => routeB.corridorsUsed.includes(r));
    return { canPool: true, detourKm: Math.abs(routeA.totalDistanceKm - routeB.totalDistanceKm), sharedCorridor: shared ?? null };
  }

  for (const stopA of routeA.orderedStops) {
    for (const stopB of routeB.orderedStops) {
      if (stopA === stopB) {
        const corridor = FIXED_CORRIDORS.find(c => c.origin === stopA || c.destination === stopA);
        return { canPool: true, detourKm: Math.min(routeA.totalDistanceKm, routeB.totalDistanceKm) * 0.15, sharedCorridor: corridor?.id ?? null };
      }
    }
  }

  return { canPool: false, detourKm: 0, sharedCorridor: null };
}

// -------------------------------------------------------
// 8. BOOKING VALIDATION
// -------------------------------------------------------

export function validateBooking(
  driver: DriverWithCapacity,
  passengers: PassengerRequest[],
  packages: PackageRequest[]
): { valid: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];

  const totalSeatsNeeded = passengers.reduce((sum, p) => sum + p.passengersCount, 0);
  if (totalSeatsNeeded > driver.availableSeats) {
    issues.push(`Not enough seats: need ${totalSeatsNeeded}, available ${driver.availableSeats}`);
  }

  const totalCargoNeeded = packages.reduce((sum, p) => sum + p.weightKg, 0);
  if (!driver.allowsPackages) {
    issues.push('Driver does not allow package carriage');
  } else if (totalCargoNeeded > driver.cargoCapacityKg) {
    issues.push(`Cargo capacity exceeded: need ${totalCargoNeeded}kg, available ${driver.cargoCapacityKg}kg`);
  }

  for (const pkg of packages) {
    if (pkg.fragile && driver.trustScore < 70) {
      warnings.push(`Fragile package requires trust score ≥70 (driver has ${driver.trustScore})`);
    }
  }

  for (const pkg of packages) {
    const arrival = driver.departureTime + (JORDAN_DISTANCES[driver.destination]?.[pkg.destinationCity] ?? 0) * 60_000;
    if (arrival > pkg.neededBy) {
      issues.push(`Package ${pkg.id}: trip arrives after deadline`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    warnings,
  };
}

// -------------------------------------------------------
// 9. ANTI-OVERBOOKING
// -------------------------------------------------------

export function preventOverbooking(
  driver: DriverWithCapacity,
  seatsRequested: number,
  cargoRequestedKg: number
): { allowed: boolean; maxSeats: number; maxCargoKg: number; reason?: string } {
  if (seatsRequested > driver.availableSeats) {
    return {
      allowed: false,
      maxSeats: driver.availableSeats,
      maxCargoKg: driver.cargoCapacityKg,
      reason: 'Exceeds available seats',
    };
  }

  if (cargoRequestedKg > driver.cargoCapacityKg) {
    return {
      allowed: false,
      maxSeats: driver.availableSeats,
      maxCargoKg: driver.cargoCapacityKg,
      reason: 'Exceeds cargo capacity',
    };
  }

  return { allowed: true, maxSeats: driver.availableSeats, maxCargoKg: driver.cargoCapacityKg };
}

// -------------------------------------------------------
// 10. MASTER ENGINE (CLOSED LOOP SYSTEM)
// -------------------------------------------------------

export function runMobilityStep(input: {
  cities: CityMap;
  adjacency: Record<City, Record<City, number>>;
  now: number;
  corridorRoutes?: CorridorRoute[];
}): {
  cities: CityMap;
  buses: { id: string; routeId: string; departureTime: number; arrivalTime: number; status: 'scheduled' | 'in_transit' | 'arrived'; seatsUsed: number; cargoUsedKg: number }[];
  routes: CorridorRoute[];
  corridorMetrics: CorridorMetrics[];
} {
  const corridors = input.corridorRoutes ?? FIXED_CORRIDORS;

  const dispatch = dispatchBuses(corridors, input.now);

  const allBuses: { id: string; routeId: string; departureTime: number; arrivalTime: number; status: 'scheduled'; seatsUsed: number; cargoUsedKg: number }[] = [];
  const activeBuses = updateBusInstances(allBuses, input.now);

  const afterFlow = propagateFlow(input.cities, input.adjacency);

  const corridorMetrics = dispatch.routes.map(route => {
    const city = afterFlow[route.origin];

    return {
      routeId: route.id,
      origin: route.origin,
      destination: route.destination,

      seatPressure: corridorPressure(
        city.outgoingDemand,
        route.baseSeatCapacity
      ),

      cargoPressure: corridorPressure(
        city.packageFlow,
        route.baseCargoCapacityKg
      ),

      status:
        city.outgoingDemand > route.baseSeatCapacity * 1.2
          ? 'overloaded'
          : city.outgoingDemand > route.baseSeatCapacity * 0.7
          ? 'optimal'
          : 'underutilized',

      demandPerHour: Math.round(city.outgoingDemand / Math.max(1, route.baseDurationMin / 60)),
    };
  });

  return {
    cities: afterFlow,
    buses: activeBuses,
    routes: dispatch.routes,
    corridorMetrics,
  };
}

// -------------------------------------------------------
// 11. FACTORY: INITIALIZE ALL JORDAN CITIES
// -------------------------------------------------------

export function initializeJordanCities(): CityMap {
  const cities: Partial<Record<City, CityNodeState>> = {};

  const jordanCities: City[] = [
    'Amman', 'Irbid', 'Zarqa', 'Aqaba', 'Madaba', 'Karak',
    'Maan', 'Jerash', 'Ajloun', 'Mafraq', 'Salt', 'Petra',
    'Wadi Rum', 'Dead Sea', 'Fuheis', 'Sahab', 'Marka',
  ];

  for (const city of jordanCities) {
    cities[city] = {
      city,
      outgoingDemand: 0,
      incomingDemand: 0,
      packageFlow: 0,
      congestion: 0,
      demandQueue: 0,
    };
  }

  return cities as CityMap;
}

// -------------------------------------------------------
// 12. BUILD ADJACENCY FROM FIXED CORRIDORS
// -------------------------------------------------------

export function buildCorridorAdjacency(): Record<City, Record<City, number>> {
  const adjacency: Partial<Record<City, Record<City, number>>> = {};

  for (const corridor of FIXED_CORRIDORS) {
    if (!adjacency[corridor.origin]) {
      adjacency[corridor.origin] = {};
    }
    adjacency[corridor.origin][corridor.destination] = corridor.baseSeatCapacity;
  }

  return adjacency as Record<City, Record<City, number>>;
}

// -------------------------------------------------------
// 13. CITY GRAPH GENERATOR
// -------------------------------------------------------

export function generateCityGraph(): {
  nodes: City[];
  edges: Array<{ from: City; to: City; weight: number }>;
} {
  const nodes = Object.keys(JORDAN_DISTANCES).filter(
    (k): k is City => k in JORDAN_DISTANCES
  );

  const edges: Array<{ from: City; to: City; weight: number }> = [];

  for (const from of nodes) {
    const distances = JORDAN_DISTANCES[from];
    for (const to of Object.keys(distances)) {
      const weight = distances[to as City] ?? 0;
      if (weight > 0) {
        edges.push({
          from,
          to: to as City,
          weight,
        });
      }
    }
  }

  return { nodes, edges };
}

// -------------------------------------------------------
// 14. DISTANCE HELPER
// -------------------------------------------------------

export function getDistance(origin: City, destination: City): number {
  return JORDAN_DISTANCES[origin]?.[destination] ?? JORDAN_DISTANCES[destination]?.[origin] ?? Infinity;
}