/**
 * Route Intelligence Engine — Wasel | واصل
 *
 * The core AI advantage of the Wasel platform.
 * Responsible for:
 *   • Trip optimization scoring (overall, seat, route, package)
 *   • Passenger compatibility matching
 *   • Package compatibility with trips (Raje3 rides on carpooling)
 *   • Multi-stop route ordering (TSP approximation)
 *   • Detour tolerance calculation
 *   • Seat utilization scoring
 *   • Ride liquidity health metrics
 *
 * CRITICAL RULE: Package delivery (Raje3) is always secondary.
 * Packages piggyback on existing carpool trips — never standalone.
 */

import type { CountryCode } from './regionConfig';
import { omitUndefined } from './object';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
  label?: string;
  labelAr?: string;
}

export interface TripSummary {
  id: string;
  originCity: string;
  destinationCity: string;
  country: CountryCode;
  departureTime: string;       // ISO timestamp
  availableSeats: number;
  totalSeats: number;
  allowsPackages: boolean;
  maxPackageWeightKg: number;
  genderPreference: 'mixed' | 'women_only' | 'men_only' | 'family_only';
  driverRating: number;        // 0-5
  driverTrustScore: number;    // 0-100
  pricePerSeatJOD: number;
  estimatedArrivalTime: string;
  waypoints?: string[];
}

export interface PassengerRequest {
  id: string;
  originCity: string;
  destinationCity: string;
  country: CountryCode;
  date: string;                // YYYY-MM-DD
  passengersCount: number;
  genderPreference: 'mixed' | 'women_only' | 'men_only' | 'family_only';
  maxPriceJOD?: number;
  minDriverRating?: number;
  requiresPackageCarriage?: boolean;
  packageWeightKg?: number;
}

export interface PackageSummary {
  id: string;
  originCity: string;
  destinationCity: string;
  country: CountryCode;
  weightKg: number;
  neededBy: string;            // ISO timestamp
  category: string;
  fragile: boolean;
  declaredValueJOD: number;
}

// ─── Scoring Results ──────────────────────────────────────────────────────────

export interface TripOptimizationScore {
  /** Overall match quality 0-100 */
  overall: number;
  /** Passenger needs vs trip attributes 0-100 */
  passengerCompatibility: number;
  /** Package carriage feasibility 0-100 (100 if no package) */
  packageCompatibility: number;
  /** Route efficiency — how close this is to the ideal direct route */
  routeEfficiency: number;
  /** Seat utilization after this booking 0-100 */
  seatUtilization: number;
  /** Detour from direct route (km) */
  detourKm: number;
  /** Human-readable match reasons */
  reasons: string[];
  reasonsAr: string[];
  /** Red flags / deal-breakers */
  warnings: string[];
  warningsAr: string[];
}

export interface PackageCompatibilityResult {
  compatible: boolean;
  score: number;               // 0-100
  blockers: string[];          // Why it's incompatible
  blockersAr: string[];
  estimatedDeliveryTime?: string;
  detourKm: number;
}

export interface RouteOptimizationResult {
  orderedStops: string[];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  prayerStopsSuggested: number;
  optimizationSaving: number;  // km saved vs naive order
}

export interface LiquidityMetrics {
  routeId: string;
  availableTrips: number;
  bookedSeats: number;
  totalSeats: number;
  utilizationRate: number;     // 0-1
  averagePriceJOD: number;
  healthScore: number;         // 0-100
  status: 'healthy' | 'low' | 'critical' | 'oversupply';
}

// ─── Weight coefficients (tuneable) ──────────────────────────────────────────

const WEIGHTS = {
  routeMatch:           0.30,  // Route accuracy is most important
  seatAvailability:     0.20,  // Must have seats
  priceMatch:           0.15,  // Price within budget
  driverRating:         0.15,  // Trust matters
  genderCompatibility:  0.10,  // Cultural safety
  packageFit:           0.05,  // Package carriage
  timeFlexibility:      0.05,  // Departure time match
} as const;

// ─── Core Scoring: Trip vs Passenger ─────────────────────────────────────────

/**
 * Score how well a trip matches a passenger's request.
 * Returns a TripOptimizationScore with overall 0-100.
 */
export function scoreTripForPassenger(
  trip: TripSummary,
  request: PassengerRequest,
): TripOptimizationScore {
  const reasons: string[] = [];
  const reasonsAr: string[] = [];
  const warnings: string[] = [];
  const warningsAr: string[] = [];

  // ── 1. Route match ──────────────────────────────────────────────────────────
  const routeMatch = scoreRouteMatch(trip, request);
  if (routeMatch === 100) {
    reasons.push('Exact route match');
    reasonsAr.push('تطابق كامل للمسار');
  } else if (routeMatch >= 60) {
    reasons.push('Partial route match (nearby stop)');
    reasonsAr.push('تطابق جزئي للمسار');
  } else {
    warnings.push('Route mismatch — long detour required');
    warningsAr.push('عدم تطابق المسار — انحراف كبير مطلوب');
  }

  // ── 2. Seat availability ────────────────────────────────────────────────────
  const seatScore =
    trip.availableSeats >= request.passengersCount ? 100 : 0;
  if (seatScore === 0) {
    warnings.push(`Not enough seats (need ${request.passengersCount}, available ${trip.availableSeats})`);
    warningsAr.push(`مقاعد غير كافية (تحتاج ${request.passengersCount}، متاح ${trip.availableSeats})`);
  }

  // ── 3. Price match ──────────────────────────────────────────────────────────
  const priceScore = scorePriceMatch(trip.pricePerSeatJOD, request.maxPriceJOD);
  if (priceScore === 100) {
    reasons.push('Price within budget');
    reasonsAr.push('السعر ضمن الميزانية');
  } else if (priceScore < 50) {
    warnings.push(`Price JOD ${trip.pricePerSeatJOD} exceeds budget JOD ${request.maxPriceJOD}`);
    warningsAr.push(`السعر ${trip.pricePerSeatJOD} دينار يتجاوز الميزانية`);
  }

  // ── 4. Driver rating ────────────────────────────────────────────────────────
  const ratingScore = Math.round(
    Math.min(100, (trip.driverRating / (request.minDriverRating ?? 3.5)) * 100),
  );
  if (trip.driverRating >= 4.5) {
    reasons.push('Highly rated traveler ⭐');
    reasonsAr.push('مسافر عالي التقييم ⭐');
  } else if (trip.driverRating < (request.minDriverRating ?? 3.5)) {
    warnings.push(`Driver rating ${trip.driverRating} below minimum ${request.minDriverRating}`);
    warningsAr.push(`تقييم السائق أقل من الحد الأدنى المطلوب`);
  }

  // ── 5. Gender compatibility ─────────────────────────────────────────────────
  const genderScore = scoreGenderCompatibility(
    trip.genderPreference,
    request.genderPreference,
  );
  if (genderScore === 100) {
    reasons.push('Gender preference matched');
    reasonsAr.push('تفضيلات الجنس متطابقة');
  } else if (genderScore === 0) {
    warnings.push('Gender preference conflict');
    warningsAr.push('تعارض في تفضيلات الجنس');
  }

  // ── 6. Package compatibility ────────────────────────────────────────────────
  const pkgScore = scorePackageCarriage(trip, request);
  if (request.requiresPackageCarriage && !trip.allowsPackages) {
    warnings.push('This trip does not carry packages');
    warningsAr.push('هذه الرحلة لا تقبل الطرود');
  }

  // ── 7. Time flexibility ─────────────────────────────────────────────────────
  const timeScore = scoreTimeMatch(trip.departureTime, request.date);

  // ── Weighted overall score ──────────────────────────────────────────────────
  let overall = Math.round(
    routeMatch      * WEIGHTS.routeMatch +
    seatScore       * WEIGHTS.seatAvailability +
    priceScore      * WEIGHTS.priceMatch +
    ratingScore     * WEIGHTS.driverRating +
    genderScore     * WEIGHTS.genderCompatibility +
    pkgScore        * WEIGHTS.packageFit +
    timeScore       * WEIGHTS.timeFlexibility,
  );

  if (routeMatch < 60) {
    overall = Math.min(overall, 55);
  }
  if (seatScore === 0) {
    overall = Math.min(overall, 45);
  }
  if (genderScore === 0) {
    overall = Math.min(overall, 40);
  }

  // ── Post-booking seat utilization ───────────────────────────────────────────
  const seatsAfterBooking = trip.availableSeats - request.passengersCount;
  const seatUtilization = Math.round(
    ((trip.totalSeats - seatsAfterBooking) / trip.totalSeats) * 100,
  );

  // ── Estimated detour ────────────────────────────────────────────────────────
  const detourKm = estimateDetourKm(trip, request);

  return {
    overall,
    passengerCompatibility: Math.round((genderScore + ratingScore + priceScore) / 3),
    packageCompatibility: pkgScore,
    routeEfficiency: routeMatch,
    seatUtilization,
    detourKm,
    reasons,
    reasonsAr,
    warnings,
    warningsAr,
  };
}

// ─── Package Compatibility ────────────────────────────────────────────────────

/**
 * Check if a package can travel on a given trip (Raje3 on Wasel).
 * RULE: Package must depart before neededBy, route must match, trip must allow packages.
 */
export function checkPackageCompatibility(
  trip: TripSummary,
  pkg: PackageSummary,
): PackageCompatibilityResult {
  const blockers: string[] = [];
  const blockersAr: string[] = [];
  let score = 100;

  // 1. Route match
  const sameOrigin =
    trip.originCity.toLowerCase() === pkg.originCity.toLowerCase();
  const sameDest =
    trip.destinationCity.toLowerCase() === pkg.destinationCity.toLowerCase();
  if (!sameOrigin || !sameDest) {
    blockers.push('Route does not match package pickup/delivery cities');
    blockersAr.push('المسار لا يتطابق مع مدن الاستلام والتسليم');
    score -= 60;
  }

  // 2. Trip allows packages
  if (!trip.allowsPackages) {
    blockers.push('Traveler has not enabled package carriage');
    blockersAr.push('المسافر لم يفعّل خيار حمل الطرود');
    score = 0;
  }

  // 3. Weight limit
  if (pkg.weightKg > trip.maxPackageWeightKg) {
    blockers.push(
      `Package weight ${pkg.weightKg}kg exceeds traveler limit ${trip.maxPackageWeightKg}kg`,
    );
    blockersAr.push(`وزن الطرد يتجاوز الحد المسموح به`);
    score -= 50;
  }

  // 4. Timing — trip must arrive before neededBy
  const tripArrival = new Date(trip.estimatedArrivalTime).getTime();
  const deadline = new Date(pkg.neededBy).getTime();
  const arrivesOnTime = tripArrival <= deadline;
  if (!arrivesOnTime) {
    blockers.push('Trip arrives after package deadline');
    blockersAr.push('الرحلة تصل بعد موعد تسليم الطرد المطلوب');
    score -= 40;
  }

  // 5. High-value fragile packages need higher driver trust
  if (pkg.fragile && trip.driverTrustScore < 70) {
    blockers.push('Fragile package requires higher trust score traveler (70+)');
    blockersAr.push('الطرد الهش يتطلب مسافراً بدرجة ثقة عالية');
    score -= 20;
  }

  score = Math.max(0, score);

  return omitUndefined({
    compatible: blockers.length === 0,
    score,
    blockers,
    blockersAr,
    estimatedDeliveryTime: arrivesOnTime ? trip.estimatedArrivalTime : undefined,
    detourKm: 0, // Same route = no detour for package
  }) as PackageCompatibilityResult;
}

// ─── Multi-Stop Route Optimization ───────────────────────────────────────────

/**
 * Optimise stop order for a multi-stop trip using nearest-neighbour TSP.
 * Prayer stops are injected automatically at 2-hour intervals.
 */
export function optimizeMultiStopRoute(
  origin: string,
  destination: string,
  waypoints: string[],
  _departureTimeISO: string,
  distanceMatrix: Record<string, Record<string, number>>, // city → city → km
): RouteOptimizationResult {
  if (waypoints.length === 0) {
    const direct = distanceMatrix[origin]?.[destination] ?? 0;
    return {
      orderedStops: [origin, destination],
      totalDistanceKm: direct,
      estimatedDurationMin: Math.round(direct * 1.2),  // ~50 km/h average
      prayerStopsSuggested: Math.floor((direct * 1.2) / 120),
      optimizationSaving: 0,
    };
  }

  // Naive (no optimization) distance
  const naiveOrder = [origin, ...waypoints, destination];
  const naiveDistance = calcOrderedDistance(naiveOrder, distanceMatrix);

  // Nearest-neighbour greedy TSP
  const unvisited = [...waypoints];
  const optimized = [origin];
  let current = origin;

  while (unvisited.length > 0) {
    let nearest = unvisited[0];
    let nearestDist = distanceMatrix[current]?.[nearest] ?? Infinity;

    for (const city of unvisited) {
      const d = distanceMatrix[current]?.[city] ?? Infinity;
      if (d < nearestDist) {
        nearestDist = d;
        nearest = city;
      }
    }

    optimized.push(nearest);
    unvisited.splice(unvisited.indexOf(nearest), 1);
    current = nearest;
  }
  optimized.push(destination);

  const optimizedDistance = calcOrderedDistance(optimized, distanceMatrix);
  const durationMin = Math.round(optimizedDistance * 1.4); // incl. stop time
  const prayerStops = Math.floor(durationMin / 120);       // every 2 hours

  return {
    orderedStops: optimized,
    totalDistanceKm: optimizedDistance,
    estimatedDurationMin: durationMin,
    prayerStopsSuggested: prayerStops,
    optimizationSaving: Math.max(0, naiveDistance - optimizedDistance),
  };
}

// ─── Seat Utilization ─────────────────────────────────────────────────────────

/**
 * Score seat utilization for platform liquidity.
 * High utilization = good for driver and platform.
 */
export function scoreSeatUtilization(
  bookedSeats: number,
  totalSeats: number,
): number {
  if (totalSeats === 0) return 0;
  const rate = bookedSeats / totalSeats;
  // Reward high utilization non-linearly
  if (rate >= 1.0) return 100;
  if (rate >= 0.75) return 90;
  if (rate >= 0.50) return 70;
  if (rate >= 0.25) return 45;
  return Math.round(rate * 100);
}

// ─── Liquidity Health ─────────────────────────────────────────────────────────

/**
 * Calculate route liquidity health.
 * Target: 10+ trips/week per route, 1:10 driver-to-passenger ratio.
 */
export function calculateLiquidityHealth(
  availableTripsOrMetrics: number | {
    activeTrips: number;
    pendingRequests: number;
    averageMatchTime: number;
  },
  totalSeats?: number,
  bookedSeats?: number,
): (LiquidityMetrics & { routeId: string; averagePriceJOD: number }) | number {
  if (typeof availableTripsOrMetrics === 'object') {
    const { activeTrips, pendingRequests, averageMatchTime } = availableTripsOrMetrics;
    const balanceRatio = pendingRequests === 0 ? activeTrips : Math.min(activeTrips, pendingRequests) / Math.max(activeTrips, pendingRequests);
    const speedScore = Math.max(0, 100 - averageMatchTime);
    return Math.round((balanceRatio * 70) + (speedScore * 0.3));
  }

  const availableTrips = availableTripsOrMetrics;
  const safeTotalSeats = totalSeats ?? 0;
  const safeBookedSeats = bookedSeats ?? 0;
  const utilizationRate = safeTotalSeats > 0 ? safeBookedSeats / safeTotalSeats : 0;
  let healthScore: number;
  let status: LiquidityMetrics['status'];

  if (utilizationRate >= 0.8 && availableTrips >= 10) {
    healthScore = 95;
    status = 'healthy';
  } else if (utilizationRate >= 0.5 && availableTrips >= 5) {
    healthScore = 70;
    status = 'healthy';
  } else if (utilizationRate < 0.2 || availableTrips < 3) {
    healthScore = 20;
    status = 'critical';
  } else if (utilizationRate > 0.95 && availableTrips > 20) {
    healthScore = 60;
    status = 'oversupply';
  } else {
    healthScore = 40;
    status = 'low';
  }

  return {
    routeId: '',
    availableTrips,
    bookedSeats: safeBookedSeats,
    totalSeats: safeTotalSeats,
    utilizationRate,
    averagePriceJOD: 0,
    healthScore,
    status,
  };
}

// ─── Ranked Match List ────────────────────────────────────────────────────────

/**
 * Rank a list of trips for a passenger request.
 * Returns trips sorted by score descending.
 */
export function rankTripsForPassenger(
  trips: TripSummary[],
  request: PassengerRequest,
): Array<{ trip: TripSummary; score: TripOptimizationScore }> {
  const scored = trips
    .map((trip) => ({ trip, score: scoreTripForPassenger(trip, request) }))
    .filter(({ score }) => score.overall > 30);  // Filter out poor matches

  return scored.sort((a, b) => b.score.overall - a.score.overall);
}

/**
 * Rank trips for a package delivery request.
 */
export function rankTripsForPackage(
  trips: TripSummary[],
  pkg: PackageSummary,
): Array<{ trip: TripSummary; result: PackageCompatibilityResult }> {
  const results = trips
    .map((trip) => ({ trip, result: checkPackageCompatibility(trip, pkg) }))
    .filter(({ result }) => result.compatible);

  return results.sort((a, b) => b.result.score - a.result.score);
}

// ─── Prayer Stop Injection ────────────────────────────────────────────────────

export interface PrayerStop {
  name: string;
  nameAr: string;
  city: string;
  prayerTime: string;         // ISO timestamp
  waitMinutes: number;
}

/**
 * Calculate prayer stops along a route.
 * Prayer times are injected at typical Asr / Maghrib windows for MENA.
 * In production, replace with a live prayer times API.
 */
export function calculatePrayerStops(
  departureISO: string,
  totalDurationMin: number,
  _country: CountryCode,
): PrayerStop[] {
  void _country;
  const stops: PrayerStop[] = [];
  const dep = new Date(departureISO).getTime();

  // Simplified prayer windows (minutes from midnight, local approximate)
  const prayerWindowsMinutesFromMidnight: { name: string; nameAr: string; minute: number }[] = [
    { name: 'Fajr',    nameAr: 'الفجر',   minute: 330  },  // ~5:30 AM
    { name: 'Dhuhr',   nameAr: 'الظهر',   minute: 780  },  // ~1:00 PM
    { name: 'Asr',     nameAr: 'العصر',   minute: 930  },  // ~3:30 PM
    { name: 'Maghrib', nameAr: 'المغرب',  minute: 1080 },  // ~6:00 PM
    { name: 'Isha',    nameAr: 'العشاء',  minute: 1200 },  // ~8:00 PM
  ];

  const endTime = dep + totalDurationMin * 60_000;
  const midnight = new Date(departureISO);
  midnight.setHours(0, 0, 0, 0);

  for (const prayer of prayerWindowsMinutesFromMidnight) {
    const prayerTs = midnight.getTime() + prayer.minute * 60_000;
    if (prayerTs > dep && prayerTs < endTime) {
      stops.push({
        name: prayer.name,
        nameAr: prayer.nameAr,
        city: 'En Route',
        prayerTime: new Date(prayerTs).toISOString(),
        waitMinutes: 20,
      });
    }
  }

  return stops;
}

export function scoreTripMatch(
  trip: TripSummary,
  request: PassengerRequest,
): number {
  const score = scoreTripForPassenger(trip, request);
  const routeMismatch =
    trip.originCity.toLowerCase() !== request.originCity.toLowerCase() ||
    trip.destinationCity.toLowerCase() !== request.destinationCity.toLowerCase();
  const genderConflict =
    scoreGenderCompatibility(trip.genderPreference, request.genderPreference) === 0;

  if (genderConflict) {
    return Math.min(score.overall, 40);
  }

  if (routeMismatch) {
    return Math.min(score.overall, 65);
  }

  return score.overall;
}

export function calculateDetourTolerance(routeDistanceKm: number): number {
  if (routeDistanceKm <= 0) return 0;
  return Math.round(Math.max(10, routeDistanceKm * 0.12));
}

export function suggestPrayerStops(
  departureISO: string,
  totalDurationMin: number,
): PrayerStop[] {
  return calculatePrayerStops(departureISO, totalDurationMin, 'JO');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function scoreRouteMatch(trip: TripSummary, req: PassengerRequest): number {
  const originMatch = trip.originCity.toLowerCase() === req.originCity.toLowerCase();
  const destMatch   = trip.destinationCity.toLowerCase() === req.destinationCity.toLowerCase();

  if (originMatch && destMatch) return 100;
  // Check waypoints
  if (trip.waypoints?.some((w) => w.toLowerCase() === req.destinationCity.toLowerCase())) {
    return 75;   // Destination is a waypoint
  }
  if (originMatch || destMatch) return 40;
  return 0;
}

function scorePriceMatch(tripPriceJOD: number, maxPriceJOD?: number): number {
  if (!maxPriceJOD) return 80;  // No budget constraint = mostly ok
  if (tripPriceJOD <= maxPriceJOD) return 100;
  const overshoot = (tripPriceJOD - maxPriceJOD) / maxPriceJOD;
  return Math.max(0, Math.round(100 - overshoot * 200));
}

function scoreGenderCompatibility(
  tripPref: TripSummary['genderPreference'],
  reqPref: PassengerRequest['genderPreference'],
): number {
  if (tripPref === 'mixed') return 100;               // Driver accepts all
  if (tripPref === reqPref) return 100;               // Exact match
  if (tripPref === 'women_only' && reqPref !== 'women_only') return 0;
  if (tripPref === 'men_only' && reqPref !== 'men_only') return 0;
  if (tripPref === 'family_only' && reqPref !== 'family_only') return 0;
  return 50;
}

function scorePackageCarriage(trip: TripSummary, req: PassengerRequest): number {
  if (!req.requiresPackageCarriage) return 100;
  if (!trip.allowsPackages) return 0;
  if (req.packageWeightKg && req.packageWeightKg > trip.maxPackageWeightKg) return 20;
  return 100;
}

function scoreTimeMatch(tripDepartureISO: string, reqDate: string): number {
  const tripDate = tripDepartureISO.substring(0, 10);
  if (tripDate === reqDate) return 100;
  // Allow 1 day flexibility
  const diff = Math.abs(
    new Date(tripDate).getTime() - new Date(reqDate).getTime(),
  ) / 86_400_000;
  if (diff <= 1) return 60;
  return 0;
}

function estimateDetourKm(trip: TripSummary, req: PassengerRequest): number {
  // Simplified: if exact route match, 0 detour
  if (
    trip.originCity.toLowerCase() === req.originCity.toLowerCase() &&
    trip.destinationCity.toLowerCase() === req.destinationCity.toLowerCase()
  ) return 0;
  // Rough estimate for partial matches
  return 25;
}

function calcOrderedDistance(
  stops: string[],
  matrix: Record<string, Record<string, number>>,
): number {
  let total = 0;
  for (let i = 0; i < stops.length - 1; i++) {
    total += matrix[stops[i]]?.[stops[i + 1]] ?? 0;
  }
  return total;
}
