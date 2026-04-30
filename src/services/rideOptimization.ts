import { getCorridorOpportunity } from '../config/wasel-movement-network';
import { buildJordanCorridorKey } from '../utils/jordanLocations';

export interface RideFlowCoordinate {
  lat: number;
  lng: number;
  label?: string;
}

export interface RealTimeDriverLocation {
  driver_id: string;
  location: RideFlowCoordinate;
  availability: 'available' | 'busy' | 'offline';
  acceptance_rate: number;
  vehicle_capacity?: number;
  current_load?: number;
  matched_request_id?: string;
  updated_at?: string;
}

export interface ActiveRideRequest {
  request_id: string;
  rider_id: string;
  pickup: RideFlowCoordinate;
  dropoff: RideFlowCoordinate;
  requested_at?: string;
  seats_requested?: number;
  base_fare?: number;
  trip_state?:
    | 'requested'
    | 'matched'
    | 'driver_en_route'
    | 'in_progress'
    | 'dropoff_reached'
    | 'completed'
    | 'cancelled';
  payment_status?: 'pending' | 'authorized' | 'paid' | 'failed' | 'retry_required';
  matched_driver_id?: string;
}

export interface HistoricalDemandDatum {
  corridor_key?: string;
  pickup?: RideFlowCoordinate;
  dropoff?: RideFlowCoordinate;
  hour_of_day?: number;
  demand_count?: number;
  completed_count?: number;
  cancelled_count?: number;
  delayed_count?: number;
  average_fare_multiplier?: number;
  average_wait_minutes?: number;
  average_delay_minutes?: number;
}

export interface SystemHealthMetric {
  service: string;
  status?: 'healthy' | 'degraded' | 'down';
  latency_ms?: number;
  success_rate?: number;
  error_rate?: number;
}

export interface SystemHealthMetrics {
  metrics?: SystemHealthMetric[];
  api_latency_ms?: number;
  payment_success_rate?: number;
  trip_state_consistency?: number;
  cancellation_rate?: number;
  delay_rate?: number;
}

export interface OptimizeRideFlowInput {
  real_time_driver_locations: RealTimeDriverLocation[];
  active_ride_requests: ActiveRideRequest[];
  historical_demand_data: HistoricalDemandDatum[];
  system_health_metrics: SystemHealthMetrics;
}

export interface OptimizeRideFlowOptions {
  latency_target_ms?: number;
  max_pickup_eta_ms?: number;
  min_payment_success_rate?: number;
  min_trip_state_consistency?: number;
  cancellation_spike_multiplier?: number;
  delay_spike_multiplier?: number;
  now?: string;
}

export interface OptimizedMatch {
  request_id: string;
  driver_id: string | null;
  match_score: number;
  priority_score: number;
  pickup_eta_ms: number | null;
  trip_eta_ms: number;
  route_distance_km: number;
  route_recalculated: boolean;
  fallback_driver_ids: string[];
  corridor_key: string;
  reason: string;
}

export interface DynamicPrice {
  request_id: string;
  corridor_key: string;
  base_price: number;
  final_price: number;
  price_multiplier: number;
  demand_supply_ratio: number;
  price_tier: 'discount' | 'standard' | 'surge';
}

export interface SystemAlert {
  type:
    | 'latency'
    | 'payments'
    | 'trip_state'
    | 'cancellations'
    | 'delays'
    | 'driver_reassignment'
    | 'payment_retry';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  request_id?: string;
  driver_id?: string;
  fallback_action?: 'reassign_driver' | 'retry_payment' | 'manual_dispatch' | 'degrade_routing';
}

export interface CompletedRide {
  request_id: string;
  driver_id?: string;
  status: 'completed';
  payment_status: 'paid' | 'retry_required';
  feedback_required: boolean;
  completed_at: string;
}

export interface OptimizeRideFlowOutput {
  optimized_matches: OptimizedMatch[];
  dynamic_prices: DynamicPrice[];
  system_alerts: SystemAlert[];
  completed_rides: CompletedRide[];
}

type CorridorHistory = {
  demandCount: number;
  completedCount: number;
  cancelledCount: number;
  delayedCount: number;
  averageFareMultiplier: number;
  averageWaitMinutes: number;
  averageDelayMinutes: number;
};

const DEFAULT_OPTIONS: Required<OptimizeRideFlowOptions> = {
  latency_target_ms: 250,
  max_pickup_eta_ms: 12 * 60 * 1000,
  min_payment_success_rate: 0.93,
  min_trip_state_consistency: 0.97,
  cancellation_spike_multiplier: 1.35,
  delay_spike_multiplier: 1.3,
  now: '',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeRate(rate: number | undefined) {
  if (!Number.isFinite(rate)) {
    return 0.5;
  }

  if ((rate as number) > 1) {
    return clamp((rate as number) / 100, 0, 1);
  }

  return clamp(rate as number, 0, 1);
}

function resolveNow(options: Required<OptimizeRideFlowOptions>) {
  return options.now ? new Date(options.now) : new Date();
}

function getCorridorKey(pickup: RideFlowCoordinate, dropoff: RideFlowCoordinate) {
  if (pickup.label && dropoff.label) {
    return buildJordanCorridorKey(pickup.label, dropoff.label);
  }

  return [
    roundNumber(pickup.lat, 2),
    roundNumber(pickup.lng, 2),
    roundNumber(dropoff.lat, 2),
    roundNumber(dropoff.lng, 2),
  ].join('__');
}

function haversineDistanceKm(from: RideFlowCoordinate, to: RideFlowCoordinate) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDiff = toRadians(to.lat - from.lat);
  const lngDiff = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a =
    Math.sin(latDiff / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDiff / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateTravelTimeMs(distanceKm: number) {
  const speedKph = distanceKm >= 25 ? 72 : distanceKm >= 8 ? 42 : 28;
  return Math.round((distanceKm / speedKph) * 60 * 60 * 1000);
}

function buildHistoricalProfiles(
  historicalDemandData: HistoricalDemandDatum[],
  now: Date,
): Map<string, CorridorHistory> {
  const profiles = new Map<string, CorridorHistory>();
  const currentHour = now.getHours();

  for (const item of historicalDemandData) {
    const corridorKey =
      item.corridor_key ??
      (item.pickup && item.dropoff ? getCorridorKey(item.pickup, item.dropoff) : null);
    if (!corridorKey) {
      continue;
    }

    const current = profiles.get(corridorKey) ?? {
      demandCount: 0,
      completedCount: 0,
      cancelledCount: 0,
      delayedCount: 0,
      averageFareMultiplier: 1,
      averageWaitMinutes: 0,
      averageDelayMinutes: 0,
    };

    const demandCount = Math.max(0, item.demand_count ?? 0);
    const hourDistance = Math.abs((item.hour_of_day ?? currentHour) - currentHour);
    const recencyWeight = clamp(1.2 - hourDistance * 0.08, 0.55, 1.2);
    const weightedDemand = demandCount * recencyWeight;

    current.demandCount += weightedDemand;
    current.completedCount += Math.max(0, item.completed_count ?? 0) * recencyWeight;
    current.cancelledCount += Math.max(0, item.cancelled_count ?? 0) * recencyWeight;
    current.delayedCount += Math.max(0, item.delayed_count ?? 0) * recencyWeight;
    current.averageFareMultiplier +=
      ((item.average_fare_multiplier ?? 1) - current.averageFareMultiplier) * 0.35;
    current.averageWaitMinutes +=
      ((item.average_wait_minutes ?? 0) - current.averageWaitMinutes) * 0.35;
    current.averageDelayMinutes +=
      ((item.average_delay_minutes ?? 0) - current.averageDelayMinutes) * 0.35;

    profiles.set(corridorKey, current);
  }

  return profiles;
}

function getBasePrice(request: ActiveRideRequest) {
  if (typeof request.base_fare === 'number' && request.base_fare > 0) {
    return request.base_fare;
  }

  if (request.pickup.label && request.dropoff.label) {
    const corridor = getCorridorOpportunity(request.pickup.label, request.dropoff.label);
    if (corridor) {
      return corridor.sharedPriceJod;
    }
  }

  const fallbackDistance = haversineDistanceKm(request.pickup, request.dropoff);
  const fallbackBasePrice = Math.max(3.5, fallbackDistance * 0.22);

  return roundNumber(fallbackBasePrice, 2);
}

function getAvailableSeats(driver: RealTimeDriverLocation) {
  const capacity = Math.max(1, driver.vehicle_capacity ?? 4);
  const load = Math.max(0, driver.current_load ?? 0);
  return Math.max(0, capacity - load);
}

function buildDriverCandidate(
  driver: RealTimeDriverLocation,
  request: ActiveRideRequest,
  maxPickupEtaMs: number,
) {
  const pickupDistanceKm = haversineDistanceKm(driver.location, request.pickup);
  const tripDistanceKm = haversineDistanceKm(request.pickup, request.dropoff);
  const pickupEtaMs = estimateTravelTimeMs(pickupDistanceKm);
  const tripEtaMs = estimateTravelTimeMs(tripDistanceKm);
  const acceptanceRate = normalizeRate(driver.acceptance_rate);
  const availableSeats = getAvailableSeats(driver);
  const requestedSeats = Math.max(1, request.seats_requested ?? 1);
  const seatPenalty = availableSeats >= requestedSeats ? 0 : 200;
  const freshnessMinutes = driver.updated_at
    ? Math.max(0, (Date.now() - new Date(driver.updated_at).getTime()) / 60_000)
    : 1;
  const freshnessScore = clamp(1 - freshnessMinutes / 15, 0.2, 1);
  const continuityBonus = request.matched_driver_id === driver.driver_id ? 8 : 0;
  const pickupEtaPenalty = pickupEtaMs > maxPickupEtaMs ? 16 : 0;
  const proximityScore = clamp(60 - pickupDistanceKm * 7, 0, 60);
  const acceptanceScore = acceptanceRate * 28;
  const freshnessWeightedScore = freshnessScore * 8;
  const score = roundNumber(
    proximityScore + acceptanceScore + freshnessWeightedScore + continuityBonus - seatPenalty - pickupEtaPenalty,
  );

  return {
    driver,
    pickupDistanceKm,
    tripDistanceKm,
    pickupEtaMs,
    tripEtaMs,
    score,
    priorityScore: roundNumber((acceptanceRate * 0.55 + clamp(1 - pickupEtaMs / maxPickupEtaMs, 0, 1) * 0.45) * 100),
  };
}

function needsDispatch(request: ActiveRideRequest) {
  return !['completed', 'cancelled', 'dropoff_reached'].includes(request.trip_state ?? 'requested');
}

function isCompletable(request: ActiveRideRequest) {
  return ['dropoff_reached', 'completed'].includes(request.trip_state ?? '');
}

function buildCorridorLiveStats(
  requests: ActiveRideRequest[],
  drivers: RealTimeDriverLocation[],
) {
  const demandByCorridor = new Map<string, number>();
  const supplyByCorridor = new Map<string, number>();

  for (const request of requests) {
    const corridorKey = getCorridorKey(request.pickup, request.dropoff);
    demandByCorridor.set(corridorKey, (demandByCorridor.get(corridorKey) ?? 0) + 1);
  }

  for (const driver of drivers) {
    if (driver.availability !== 'available') {
      continue;
    }

    let closestCorridor: string | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const request of requests) {
      const corridorKey = getCorridorKey(request.pickup, request.dropoff);
      const distance = haversineDistanceKm(driver.location, request.pickup);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestCorridor = corridorKey;
      }
    }

    if (closestCorridor) {
      supplyByCorridor.set(closestCorridor, (supplyByCorridor.get(closestCorridor) ?? 0) + 1);
    }
  }

  return { demandByCorridor, supplyByCorridor };
}

function buildMatchReason(driverId: string | null, pickupEtaMs: number | null, score: number) {
  if (!driverId) {
    return 'No eligible driver was available within the active dispatch window.';
  }

  if (pickupEtaMs === null) {
    return 'Driver selected, but pickup ETA could not be estimated.';
  }

  return `Driver ${driverId} selected with ${Math.round(pickupEtaMs / 60_000)} min pickup ETA and score ${score}.`;
}

function buildPricing(
  request: ActiveRideRequest,
  corridorKey: string,
  liveDemand: number,
  liveSupply: number,
  history: CorridorHistory | undefined,
) {
  const demandPressure = liveDemand + (history?.demandCount ?? 0) / 40;
  const supplyPressure = Math.max(1, liveSupply);
  const demandSupplyRatio = roundNumber(demandPressure / supplyPressure, 2);
  const historicalMultiplier = clamp(history?.averageFareMultiplier ?? 1, 0.9, 1.3);

  let realTimeMultiplier = 1;
  let priceTier: DynamicPrice['price_tier'] = 'standard';

  if (demandSupplyRatio >= 1.45) {
    realTimeMultiplier = 1.18;
    priceTier = 'surge';
  } else if (demandSupplyRatio >= 1.1) {
    realTimeMultiplier = 1.08;
    priceTier = 'surge';
  } else if (demandSupplyRatio <= 0.72) {
    realTimeMultiplier = 0.95;
    priceTier = 'discount';
  }

  const basePrice = getBasePrice(request);
  const priceMultiplier = roundNumber(clamp(historicalMultiplier * realTimeMultiplier, 0.9, 1.35), 2);
  const finalPrice = roundNumber(basePrice * priceMultiplier, 2);

  return {
    request_id: request.request_id,
    corridor_key: corridorKey,
    base_price: roundNumber(basePrice, 2),
    final_price: finalPrice,
    price_multiplier: priceMultiplier,
    demand_supply_ratio: demandSupplyRatio,
    price_tier: priceTier,
  } satisfies DynamicPrice;
}

function buildSystemAlerts(
  input: OptimizeRideFlowInput,
  matches: OptimizedMatch[],
  completedRides: CompletedRide[],
  options: Required<OptimizeRideFlowOptions>,
  historicalProfiles: Map<string, CorridorHistory>,
) {
  const alerts: SystemAlert[] = [];
  const apiLatencyMs =
    input.system_health_metrics.api_latency_ms ??
    input.system_health_metrics.metrics?.find(metric => metric.service === 'api')?.latency_ms;
  const paymentSuccessRate =
    input.system_health_metrics.payment_success_rate ??
    input.system_health_metrics.metrics?.find(metric => metric.service === 'payments')?.success_rate;
  const tripStateConsistency =
    input.system_health_metrics.trip_state_consistency ??
    input.system_health_metrics.metrics?.find(metric => metric.service === 'trip_state')?.success_rate;

  const totalHistoricalDemand = Array.from(historicalProfiles.values()).reduce(
    (sum, profile) => sum + profile.demandCount,
    0,
  );
  const historicalCancellationRate = totalHistoricalDemand > 0
    ? Array.from(historicalProfiles.values()).reduce((sum, profile) => sum + profile.cancelledCount, 0) / totalHistoricalDemand
    : 0.08;
  const historicalDelayRate = totalHistoricalDemand > 0
    ? Array.from(historicalProfiles.values()).reduce((sum, profile) => sum + profile.delayedCount, 0) / totalHistoricalDemand
    : 0.1;
  const liveCancellationRate = input.system_health_metrics.cancellation_rate ?? 0;
  const liveDelayRate = input.system_health_metrics.delay_rate ?? 0;

  if (typeof apiLatencyMs === 'number' && apiLatencyMs > options.latency_target_ms) {
    alerts.push({
      type: 'latency',
      severity: apiLatencyMs > options.latency_target_ms * 2 ? 'critical' : 'warning',
      message: `Dispatch latency is ${apiLatencyMs} ms, above the ${options.latency_target_ms} ms target.`,
      fallback_action: 'degrade_routing',
    });
  }

  if (typeof paymentSuccessRate === 'number' && paymentSuccessRate < options.min_payment_success_rate) {
    alerts.push({
      type: 'payments',
      severity: paymentSuccessRate < 0.85 ? 'critical' : 'warning',
      message: `Payment success rate dropped to ${Math.round(paymentSuccessRate * 100)}%.`,
      fallback_action: 'retry_payment',
    });
  }

  if (typeof tripStateConsistency === 'number' && tripStateConsistency < options.min_trip_state_consistency) {
    alerts.push({
      type: 'trip_state',
      severity: tripStateConsistency < 0.92 ? 'critical' : 'warning',
      message: `Trip state consistency fell to ${Math.round(tripStateConsistency * 100)}%.`,
      fallback_action: 'manual_dispatch',
    });
  }

  if (
    liveCancellationRate > 0 &&
    liveCancellationRate >= historicalCancellationRate * options.cancellation_spike_multiplier
  ) {
    alerts.push({
      type: 'cancellations',
      severity: liveCancellationRate > 0.2 ? 'critical' : 'warning',
      message: `Cancellation rate spiked to ${Math.round(liveCancellationRate * 100)}% against a ${Math.round(historicalCancellationRate * 100)}% baseline.`,
      fallback_action: 'reassign_driver',
    });
  }

  if (liveDelayRate > 0 && liveDelayRate >= historicalDelayRate * options.delay_spike_multiplier) {
    alerts.push({
      type: 'delays',
      severity: liveDelayRate > 0.22 ? 'critical' : 'warning',
      message: `Delay rate spiked to ${Math.round(liveDelayRate * 100)}% against a ${Math.round(historicalDelayRate * 100)}% baseline.`,
      fallback_action: 'degrade_routing',
    });
  }

  for (const match of matches) {
    if (!match.driver_id) {
      alerts.push({
        type: 'driver_reassignment',
        severity: 'critical',
        request_id: match.request_id,
        message: `Request ${match.request_id} has no eligible driver and needs manual dispatch.`,
        fallback_action: 'manual_dispatch',
      });
      continue;
    }

    if (typeof match.pickup_eta_ms === 'number' && match.pickup_eta_ms > options.max_pickup_eta_ms) {
      alerts.push({
        type: 'driver_reassignment',
        severity: 'warning',
        request_id: match.request_id,
        driver_id: match.driver_id,
        message: `Pickup ETA for request ${match.request_id} exceeded the dispatch target.`,
        fallback_action: 'reassign_driver',
      });
    }
  }

  const completedById = new Map(completedRides.map(ride => [ride.request_id, ride]));

  for (const request of input.active_ride_requests) {
    const completedRide = completedById.get(request.request_id);
    if (!completedRide || completedRide.payment_status !== 'retry_required') {
      continue;
    }

    alerts.push({
      type: 'payment_retry',
      severity: 'warning',
      request_id: request.request_id,
      driver_id: request.matched_driver_id,
      message: `Ride ${request.request_id} completed, but payment needs a retry.`,
      fallback_action: 'retry_payment',
    });
  }

  return alerts;
}

export function optimizeRideFlow(
  input: OptimizeRideFlowInput,
  rawOptions: OptimizeRideFlowOptions = {},
): OptimizeRideFlowOutput {
  const options = { ...DEFAULT_OPTIONS, ...rawOptions };
  const now = resolveNow(options).toISOString();
  const historicalProfiles = buildHistoricalProfiles(
    input.historical_demand_data,
    resolveNow(options),
  );
  const dispatchableRequests = input.active_ride_requests.filter(needsDispatch);
  const { demandByCorridor, supplyByCorridor } = buildCorridorLiveStats(
    dispatchableRequests,
    input.real_time_driver_locations,
  );
  const assignedDrivers = new Set<string>();

  const prioritizedRequests = [...dispatchableRequests].sort((left, right) => {
    const leftCorridor = getCorridorKey(left.pickup, left.dropoff);
    const rightCorridor = getCorridorKey(right.pickup, right.dropoff);
    const leftDemand = demandByCorridor.get(leftCorridor) ?? 0;
    const rightDemand = demandByCorridor.get(rightCorridor) ?? 0;
    const leftRequestedAt = new Date(left.requested_at ?? 0).getTime() || 0;
    const rightRequestedAt = new Date(right.requested_at ?? 0).getTime() || 0;
    if (leftDemand !== rightDemand) {
      return rightDemand - leftDemand;
    }
    return leftRequestedAt - rightRequestedAt;
  });

  const optimizedMatches = prioritizedRequests.map((request) => {
    const corridorKey = getCorridorKey(request.pickup, request.dropoff);
    const candidates = input.real_time_driver_locations
      .filter(driver => driver.availability === 'available' && !assignedDrivers.has(driver.driver_id))
      .map(driver => buildDriverCandidate(driver, request, options.max_pickup_eta_ms))
      .sort((left, right) => right.score - left.score);

    const best = candidates[0];
    if (best?.driver.driver_id) {
      assignedDrivers.add(best.driver.driver_id);
    }

    const fallbackDriverIds = candidates
      .slice(best ? 1 : 0, best ? 4 : 3)
      .map(candidate => candidate.driver.driver_id);

    return {
      request_id: request.request_id,
      driver_id: best?.driver.driver_id ?? null,
      match_score: roundNumber(best?.score ?? 0, 2),
      priority_score: roundNumber(best?.priorityScore ?? 0, 2),
      pickup_eta_ms: best?.pickupEtaMs ?? null,
      trip_eta_ms: best?.tripEtaMs ?? estimateTravelTimeMs(haversineDistanceKm(request.pickup, request.dropoff)),
      route_distance_km: roundNumber(
        best ? best.pickupDistanceKm + best.tripDistanceKm : haversineDistanceKm(request.pickup, request.dropoff),
        2,
      ),
      route_recalculated: Boolean(
        best &&
        request.matched_driver_id &&
        request.matched_driver_id !== best.driver.driver_id,
      ),
      fallback_driver_ids: fallbackDriverIds,
      corridor_key: corridorKey,
      reason: buildMatchReason(best?.driver.driver_id ?? null, best?.pickupEtaMs ?? null, roundNumber(best?.score ?? 0)),
    } satisfies OptimizedMatch;
  });

  const dynamicPrices = input.active_ride_requests.map((request) => {
    const corridorKey = getCorridorKey(request.pickup, request.dropoff);
    return buildPricing(
      request,
      corridorKey,
      demandByCorridor.get(corridorKey) ?? 1,
      supplyByCorridor.get(corridorKey) ?? 0,
      historicalProfiles.get(corridorKey),
    );
  });

  const completedRides = input.active_ride_requests
    .filter(isCompletable)
    .map((request) => ({
      request_id: request.request_id,
      driver_id: request.matched_driver_id,
      status: 'completed',
      payment_status:
        request.payment_status === 'failed' || request.payment_status === 'retry_required'
          ? 'retry_required'
          : 'paid',
      feedback_required: true,
      completed_at: now,
    }) satisfies CompletedRide);

  const systemAlerts = buildSystemAlerts(
    input,
    optimizedMatches,
    completedRides,
    options,
    historicalProfiles,
  );

  return {
    optimized_matches: optimizedMatches,
    dynamic_prices: dynamicPrices,
    system_alerts: systemAlerts,
    completed_rides: completedRides,
  };
}

export const OPTIMIZE_RIDE_FLOW = optimizeRideFlow;
