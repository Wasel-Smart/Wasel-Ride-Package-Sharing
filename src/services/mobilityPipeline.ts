import { useEffect, useMemo, useState } from 'react';
import { getDemandAlerts, type DemandAlert } from './demandCapture';
import { getConnectedPackages, getConnectedRides, type PackageRequest, type PostedRide } from './journeyLogistics';
import { getRideBookings, type RideBookingRecord } from './rideLifecycle';
import { buildRouteIntelligenceSnapshot, type LiveCorridorSignal } from './routeDemandIntelligence';
import { allowSyntheticData } from './runtimePolicy';
import {
  normalizeJordanLocation,
  resolveJordanLocationCoord,
  routeMatchesLocationPair,
} from '../utils/jordanLocations';

const REFRESH_MS = 15_000;
const MATCH_THRESHOLD = 52;
const MIN_VIABLE_SCORE = 40;
const MAX_MODELED_CORRIDORS = 4;
const MAX_STAGE_ITEMS = 3;

export const MOBILITY_PIPELINE_THRESHOLDS = {
  viableCandidateScore: MIN_VIABLE_SCORE,
  dispatchMatchScore: MATCH_THRESHOLD,
} as const;

export type MobilityDemandKind = 'passenger' | 'package';
export type MobilityDemandStatus = 'pending' | 'assigned' | 'completed';
export type MobilityDemandSource =
  | 'demand-alert'
  | 'ride-booking'
  | 'package-request'
  | 'modeled-signal';
export type MobilityVehicleState = 'idle' | 'committed' | 'in_trip' | 'rebalancing';
export type MobilityVehicleSource = 'live-ride' | 'modeled-supply';
export type MobilityPipelineSource = 'live' | 'hybrid' | 'modeled';
export type MobilityStageId =
  | 'demand'
  | 'candidate-vehicles'
  | 'scoring'
  | 'matching'
  | 'assignment'
  | 'rebalancing';

export interface MobilityNode {
  label: string;
  lat: number;
  lng: number;
}

export interface MobilityDemandRecord {
  id: string;
  kind: MobilityDemandKind;
  service: 'ride' | 'bus' | 'package';
  source: MobilityDemandSource;
  status: MobilityDemandStatus;
  from: MobilityNode;
  to: MobilityNode;
  units: number;
  createdAt: string;
  corridorId: string | null;
  forecastDemandScore: number;
  pricePressure: LiveCorridorSignal['pricePressure'];
  assignedVehicleId?: string;
  note: string;
}

export interface MobilityVehicleRecord {
  id: string;
  source: MobilityVehicleSource;
  state: MobilityVehicleState;
  from: MobilityNode;
  to: MobilityNode;
  position: MobilityNode;
  corridorId: string | null;
  passengerCapacity: number;
  availablePassengerSeats: number;
  packageCapacityUnits: number;
  availablePackageUnits: number;
  utilizationPercent: number;
  note: string;
}

export interface MobilityVehicleCandidate {
  demandId: string;
  vehicleId: string;
  corridorId: string | null;
  routeFit: number;
  capacityFit: number;
  serviceFit: number;
  proximityFit: number;
  demandPriority: number;
  congestionPenalty: number;
  score: number;
  rationale: string[];
}

export interface MobilityMatch {
  demandId: string;
  vehicleId: string;
  corridorId: string | null;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
}

export interface MobilityAssignment {
  id: string;
  demandId: string;
  vehicleId: string;
  corridorId: string | null;
  source: 'live' | 'planned';
  status: 'planned' | 'active' | 'in_trip';
  summary: string;
}

export interface MobilityRebalancingAction {
  vehicleId: string;
  corridorId: string;
  from: string;
  to: string;
  score: number;
  reason: string;
}

export interface MobilityPipelineStageSummary {
  id: MobilityStageId;
  label: string;
  count: number;
  summary: string;
}

export type MobilityPipelineStageTone = 'neutral' | 'positive' | 'attention';

export interface MobilityPipelineStageItem {
  id: string;
  title: string;
  detail: string;
  metric: string;
  tone: MobilityPipelineStageTone;
}

export interface MobilityPipelineStageDrilldown {
  id: MobilityStageId;
  label: string;
  headline: string;
  explanation: string;
  items: MobilityPipelineStageItem[];
}

export interface MobilityPipelineMetrics {
  totalDemand: number;
  pendingDemand: number;
  assignedDemand: number;
  completedDemand: number;
  activeAssignments: number;
  dispatchableVehicles: number;
  averageMatchScore: number;
  viableCandidatePairs: number;
  matchRatePercent: number;
  rebalancingCount: number;
}

export interface MobilityPipelineSnapshot {
  updatedAt: string;
  source: MobilityPipelineSource;
  thresholds: typeof MOBILITY_PIPELINE_THRESHOLDS;
  demand: MobilityDemandRecord[];
  vehicles: MobilityVehicleRecord[];
  scoredCandidates: MobilityVehicleCandidate[];
  matches: MobilityMatch[];
  assignments: MobilityAssignment[];
  rebalancing: MobilityRebalancingAction[];
  stages: MobilityPipelineStageSummary[];
  stageDrilldowns: MobilityPipelineStageDrilldown[];
  metrics: MobilityPipelineMetrics;
  featuredCorridors: LiveCorridorSignal[];
}

export interface MobilityPipelineInputs {
  updatedAt?: string;
  demand: MobilityDemandRecord[];
  vehicles: MobilityVehicleRecord[];
  corridorSignals: LiveCorridorSignal[];
}

type CapacityLedger = {
  passenger: number;
  package: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals = 2) {
  const precision = 10 ** decimals;
  return Math.round(value * precision) / precision;
}

function buildNode(label: string): MobilityNode {
  const normalized = normalizeJordanLocation(label, label || 'Amman');
  const coords = resolveJordanLocationCoord(normalized);
  return {
    label: normalized,
    lat: coords.lat,
    lng: coords.lng,
  };
}

function interpolateNode(from: MobilityNode, to: MobilityNode, progress: number): MobilityNode {
  const safeProgress = clamp(progress, 0, 1);
  return {
    label: safeProgress >= 0.55 ? to.label : from.label,
    lat: from.lat + ((to.lat - from.lat) * safeProgress),
    lng: from.lng + ((to.lng - from.lng) * safeProgress),
  };
}

function distanceKm(from: MobilityNode, to: MobilityNode) {
  const earthRadiusKm = 6371;
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isRideBookingActive(booking: RideBookingRecord) {
  return booking.status !== 'rejected' && booking.status !== 'cancelled' && booking.status !== 'completed';
}

function isRideBookingAssigned(booking: RideBookingRecord) {
  return booking.status === 'pending_driver' || booking.status === 'confirmed';
}

function isPackageAssigned(pkg: PackageRequest) {
  return pkg.status === 'matched' || pkg.status === 'in_transit';
}

function getPackageUnits(pkg: PackageRequest) {
  return Math.max(1, Math.min(3, Math.ceil(pkg.weight.match(/\d+(?:\.\d+)?/) ? Number(pkg.weight.match(/\d+(?:\.\d+)?/)?.[0] ?? 1) : 1)));
}

function getRidePackageCapacityUnits(ride: PostedRide) {
  if (!ride.acceptsPackages) {return 0;}
  if (ride.packageCapacity === 'large') {return 3;}
  if (ride.packageCapacity === 'medium') {return 2;}
  return 1;
}

function getSignalForRoute(
  signals: LiveCorridorSignal[],
  from?: string | null,
  to?: string | null,
) {
  return (
    signals.find(signal =>
      routeMatchesLocationPair(signal.from, signal.to, from, to, { allowReverse: false }),
    ) ??
    signals.find(signal => routeMatchesLocationPair(signal.from, signal.to, from, to)) ??
    null
  );
}

function toDemandKind(service: DemandAlert['service'] | RideBookingRecord['routeMode'] | PackageRequest['packageType'] | 'package') {
  return service === 'package' ? 'package' : 'passenger';
}

function buildDemandFromAlert(
  alert: DemandAlert,
  signals: LiveCorridorSignal[],
): MobilityDemandRecord {
  const signal = getSignalForRoute(signals, alert.from, alert.to);
  return {
    id: alert.id,
    kind: toDemandKind(alert.service),
    service: alert.service,
    source: 'demand-alert',
    status: alert.status === 'matched' ? 'assigned' : alert.status === 'expired' ? 'completed' : 'pending',
    from: buildNode(alert.from),
    to: buildNode(alert.to),
    units: Math.max(1, alert.seatsOrSlots),
    createdAt: alert.createdAt,
    corridorId: signal?.id ?? null,
    forecastDemandScore: signal?.forecastDemandScore ?? 68,
    pricePressure: signal?.pricePressure ?? 'balanced',
    note: `Demand alert for ${alert.service} on ${alert.from} -> ${alert.to}.`,
  };
}

function buildDemandFromBooking(
  booking: RideBookingRecord,
  signals: LiveCorridorSignal[],
): MobilityDemandRecord {
  const signal = getSignalForRoute(signals, booking.from, booking.to);
  const status: MobilityDemandStatus =
    booking.status === 'completed'
      ? 'completed'
      : isRideBookingAssigned(booking)
        ? 'assigned'
        : 'pending';

  return {
    id: booking.id,
    kind: 'passenger',
    service: 'ride',
    source: 'ride-booking',
    status,
    from: buildNode(booking.from),
    to: buildNode(booking.to),
    units: Math.max(1, booking.seatsRequested),
    createdAt: booking.createdAt,
    corridorId: signal?.id ?? null,
    forecastDemandScore: signal?.forecastDemandScore ?? 72,
    pricePressure: signal?.pricePressure ?? 'balanced',
    assignedVehicleId: status === 'assigned' || status === 'completed' ? booking.rideId : undefined,
    note:
      status === 'assigned'
        ? `Passenger booking is already attached to ride ${booking.rideId}.`
        : 'Passenger booking is waiting to clear assignment or confirmation.',
  };
}

function buildDemandFromPackage(
  pkg: PackageRequest,
  signals: LiveCorridorSignal[],
): MobilityDemandRecord {
  const signal = getSignalForRoute(signals, pkg.from, pkg.to);
  const status: MobilityDemandStatus =
    pkg.status === 'delivered'
      ? 'completed'
      : isPackageAssigned(pkg)
        ? 'assigned'
        : 'pending';

  return {
    id: pkg.id,
    kind: 'package',
    service: 'package',
    source: 'package-request',
    status,
    from: buildNode(pkg.from),
    to: buildNode(pkg.to),
    units: getPackageUnits(pkg),
    createdAt: pkg.createdAt,
    corridorId: signal?.id ?? null,
    forecastDemandScore: signal?.forecastDemandScore ?? 70,
    pricePressure: signal?.pricePressure ?? 'balanced',
    assignedVehicleId: status === 'assigned' || status === 'completed' ? pkg.matchedRideId : undefined,
    note:
      status === 'assigned'
        ? `Package request is already riding on ${pkg.matchedRideId ?? 'an active route'}.`
        : 'Package request is waiting for a corridor-compatible ride.',
  };
}

function buildModeledDemand(
  signals: LiveCorridorSignal[],
  liveDemand: MobilityDemandRecord[],
): MobilityDemandRecord[] {
  if (!allowSyntheticData()) {
    return [];
  }

  const pendingCorridors = new Set(
    liveDemand
      .filter(item => item.status === 'pending')
      .map(item => item.corridorId)
      .filter(Boolean),
  );

  return signals
    .filter(signal => signal.forecastDemandScore >= 72 && !pendingCorridors.has(signal.id))
    .slice(0, MAX_MODELED_CORRIDORS)
    .map((signal, index) => {
      const packageHeavy = signal.livePackages > signal.liveBookings;
      const units = packageHeavy
        ? Math.max(1, Math.min(3, signal.livePackages || 1))
        : Math.max(1, Math.min(2, signal.activeDemandAlerts || 1));

      return {
        id: `modeled-demand-${signal.id}-${index}`,
        kind: packageHeavy ? 'package' : 'passenger',
        service: packageHeavy ? 'package' : 'ride',
        source: 'modeled-signal',
        status: 'pending',
        from: buildNode(signal.from),
        to: buildNode(signal.to),
        units,
        createdAt: new Date().toISOString(),
        corridorId: signal.id,
        forecastDemandScore: signal.forecastDemandScore,
        pricePressure: signal.pricePressure,
        note: `Modeled corridor wave derived from ${signal.liveSearches} searches and ${signal.activeDemandAlerts} alerts.`,
      } satisfies MobilityDemandRecord;
    });
}

function resolveRideState(
  ride: PostedRide,
  activeBookings: RideBookingRecord[],
  matchedPackages: PackageRequest[],
  now: number,
) {
  const tripTimestamp = new Date(`${ride.date}T${ride.time || '00:00'}`).getTime();
  const hasActiveLoad = activeBookings.length > 0 || matchedPackages.length > 0;

  if (!hasActiveLoad) {
    return {
      state: 'idle' as const,
      progress: 0,
    };
  }

  if (!Number.isFinite(tripTimestamp) || tripTimestamp > now) {
    return {
      state: 'committed' as const,
      progress: 0.18,
    };
  }

  return {
    state: 'in_trip' as const,
    progress: 0.58,
  };
}

function buildVehicleFromRide(
  ride: PostedRide,
  bookings: RideBookingRecord[],
  packages: PackageRequest[],
  signals: LiveCorridorSignal[],
  now: number,
): MobilityVehicleRecord {
  const signal = getSignalForRoute(signals, ride.from, ride.to);
  const activeBookings = bookings.filter(
    booking => booking.rideId === ride.id && isRideBookingActive(booking),
  );
  const matchedPackages = packages.filter(
    pkg => pkg.matchedRideId === ride.id && pkg.status !== 'delivered',
  );
  const bookedSeats = activeBookings.reduce(
    (sum, booking) => sum + Math.max(1, booking.seatsRequested),
    0,
  );
  const packageCapacityUnits = getRidePackageCapacityUnits(ride);
  const packageLoadUnits = matchedPackages.reduce((sum, pkg) => sum + getPackageUnits(pkg), 0);
  const availablePassengerSeats = Math.max(0, ride.seats - bookedSeats);
  const availablePackageUnits = Math.max(0, packageCapacityUnits - packageLoadUnits);
  const from = buildNode(ride.from);
  const to = buildNode(ride.to);
  const rideState = resolveRideState(ride, activeBookings, matchedPackages, now);
  const position = interpolateNode(from, to, rideState.progress);
  const totalCapacity = Math.max(ride.seats + packageCapacityUnits, 1);
  const usedCapacity = bookedSeats + packageLoadUnits;

  return {
    id: ride.id,
    source: 'live-ride',
    state: rideState.state,
    from,
    to,
    position,
    corridorId: signal?.id ?? null,
    passengerCapacity: ride.seats,
    availablePassengerSeats,
    packageCapacityUnits,
    availablePackageUnits,
    utilizationPercent: clamp(Math.round((usedCapacity / totalCapacity) * 100), 0, 100),
    note:
      rideState.state === 'idle'
        ? 'Posted ride has spare capacity and can absorb new demand.'
        : 'Posted ride is already committed on a live corridor.',
  };
}

function buildModeledVehicles(
  signals: LiveCorridorSignal[],
  liveVehicles: MobilityVehicleRecord[],
): MobilityVehicleRecord[] {
  if (!allowSyntheticData()) {
    return [];
  }

  const coveredCorridors = new Set(
    liveVehicles
      .map(vehicle => vehicle.corridorId)
      .filter(Boolean),
  );

  return signals
    .filter(signal => signal.forecastDemandScore >= 74 && !coveredCorridors.has(signal.id))
    .slice(0, MAX_MODELED_CORRIDORS)
    .map((signal, index) => {
      const from = buildNode(signal.from);
      const to = buildNode(signal.to);
      const utilizationPercent = clamp(signal.seatUtilizationPercent, 28, 82);
      const passengerCapacity = Math.max(3, Math.min(5, signal.activeSupply > 0 ? 4 : 3));
      const packageCapacityUnits = signal.livePackages > 0 ? 2 : 1;
      const bookedPassengerSeats = Math.max(
        0,
        Math.round((utilizationPercent / 100) * passengerCapacity) - 1,
      );
      const activePackageUnits = signal.livePackages > 0 ? 1 : 0;

      return {
        id: `modeled-vehicle-${signal.id}-${index}`,
        source: 'modeled-supply',
        state: signal.pricePressure === 'surging' ? 'rebalancing' : 'idle',
        from,
        to,
        position: interpolateNode(from, to, signal.pricePressure === 'surging' ? 0.22 : 0.08),
        corridorId: signal.id,
        passengerCapacity,
        availablePassengerSeats: Math.max(1, passengerCapacity - bookedPassengerSeats),
        packageCapacityUnits,
        availablePackageUnits: Math.max(0, packageCapacityUnits - activePackageUnits),
        utilizationPercent,
        note:
          signal.pricePressure === 'surging'
            ? 'Modeled standby vehicle is nudging toward a hot corridor.'
            : 'Modeled standby vehicle keeps baseline corridor coverage visible.',
      } satisfies MobilityVehicleRecord;
    });
}

function getRouteFit(demand: MobilityDemandRecord, vehicle: MobilityVehicleRecord) {
  if (
    routeMatchesLocationPair(
      vehicle.from.label,
      vehicle.to.label,
      demand.from.label,
      demand.to.label,
      { allowReverse: false },
    )
  ) {
    return 1;
  }

  if (routeMatchesLocationPair(vehicle.from.label, vehicle.to.label, demand.from.label, demand.to.label)) {
    return 0.58;
  }

  if (
    vehicle.from.label === demand.from.label ||
    vehicle.to.label === demand.to.label ||
    vehicle.from.label === demand.to.label ||
    vehicle.to.label === demand.from.label
  ) {
    return 0.38;
  }

  return 0.18;
}

function getCapacityFit(demand: MobilityDemandRecord, vehicle: MobilityVehicleRecord) {
  if (demand.kind === 'package') {
    if (vehicle.availablePackageUnits < demand.units) {return 0;}
    return clamp(vehicle.availablePackageUnits / Math.max(demand.units, 1), 0, 1);
  }

  if (vehicle.availablePassengerSeats < demand.units) {return 0;}
  return clamp(vehicle.availablePassengerSeats / Math.max(demand.units, 1), 0, 1);
}

function getServiceFit(demand: MobilityDemandRecord, vehicle: MobilityVehicleRecord) {
  if (demand.kind === 'package') {
    return vehicle.packageCapacityUnits > 0 ? 1 : 0;
  }

  return vehicle.passengerCapacity > 0 ? 1 : 0;
}

function getDemandPriority(demand: MobilityDemandRecord) {
  return clamp(demand.forecastDemandScore / 100, 0.42, 1);
}

function getCongestionPenalty(signal: LiveCorridorSignal | null, vehicle: MobilityVehicleRecord) {
  const pressurePenalty =
    signal?.pricePressure === 'surging'
      ? 0.07
      : signal?.pricePressure === 'balanced'
        ? 0.035
        : 0.015;

  return pressurePenalty + Math.max(0, vehicle.utilizationPercent - 88) / 260;
}

export function scoreVehicleForDemand(
  demand: MobilityDemandRecord,
  vehicle: MobilityVehicleRecord,
  signal: LiveCorridorSignal | null = null,
): MobilityVehicleCandidate {
  const routeFit = getRouteFit(demand, vehicle);
  const capacityFit = getCapacityFit(demand, vehicle);
  const serviceFit = getServiceFit(demand, vehicle);
  const proximityFit = clamp(1 - (distanceKm(vehicle.position, demand.from) / 350), 0.08, 1);
  const demandPriority = getDemandPriority(demand);
  const congestionPenalty = getCongestionPenalty(signal, vehicle);
  const score = Math.round(
    clamp(
      (routeFit * 0.4) +
        (capacityFit * 0.22) +
        (serviceFit * 0.16) +
        (proximityFit * 0.14) +
        (demandPriority * 0.08) -
        congestionPenalty,
      0,
      1,
    ) * 100,
  );

  const rationale = [
    routeFit >= 0.9 ? 'Exact corridor match.' : routeFit >= 0.5 ? 'Reverse corridor still viable.' : 'Route fit is weak.',
    capacityFit > 0 ? `Capacity clears ${demand.units} unit(s).` : 'Capacity is insufficient.',
    serviceFit > 0 ? 'Vehicle can serve this demand type.' : 'Vehicle cannot serve this demand type.',
  ];

  return {
    demandId: demand.id,
    vehicleId: vehicle.id,
    corridorId: signal?.id ?? vehicle.corridorId,
    routeFit: round(routeFit),
    capacityFit: round(capacityFit),
    serviceFit: round(serviceFit),
    proximityFit: round(proximityFit),
    demandPriority: round(demandPriority),
    congestionPenalty: round(congestionPenalty),
    score,
    rationale,
  };
}

function buildCandidateLedger(vehicles: MobilityVehicleRecord[]) {
  return new Map<string, CapacityLedger>(
    vehicles.map(vehicle => [
      vehicle.id,
      {
        passenger: vehicle.availablePassengerSeats,
        package: vehicle.availablePackageUnits,
      },
    ]),
  );
}

function hasDispatchableCapacity(vehicle: MobilityVehicleRecord) {
  return vehicle.availablePassengerSeats > 0 || vehicle.availablePackageUnits > 0;
}

export function selectBestMatches(
  demand: MobilityDemandRecord[],
  vehicles: MobilityVehicleRecord[],
  scoredCandidates: MobilityVehicleCandidate[],
): MobilityMatch[] {
  const pendingDemand = demand
    .filter(item => item.status === 'pending')
    .sort((left, right) => {
      const scoreDelta = right.forecastDemandScore - left.forecastDemandScore;
      if (scoreDelta !== 0) {return scoreDelta;}
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });

  const capacityLedger = buildCandidateLedger(vehicles);
  const matches: MobilityMatch[] = [];

  for (const item of pendingDemand) {
    const bestCandidate = scoredCandidates
      .filter(candidate => candidate.demandId === item.id && candidate.score >= MATCH_THRESHOLD)
      .sort((left, right) => right.score - left.score)
      .find(candidate => {
        const remaining = capacityLedger.get(candidate.vehicleId);
        if (!remaining) {return false;}
        return item.kind === 'package'
          ? remaining.package >= item.units
          : remaining.passenger >= item.units;
      });

    if (!bestCandidate) {
      continue;
    }

    const remaining = capacityLedger.get(bestCandidate.vehicleId);
    if (!remaining) {
      continue;
    }

    if (item.kind === 'package') {
      remaining.package -= item.units;
    } else {
      remaining.passenger -= item.units;
    }

    matches.push({
      demandId: item.id,
      vehicleId: bestCandidate.vehicleId,
      corridorId: bestCandidate.corridorId,
      score: bestCandidate.score,
      confidence:
        bestCandidate.score >= 82 ? 'high' : bestCandidate.score >= 66 ? 'medium' : 'low',
      reason: bestCandidate.rationale.join(' '),
    });
  }

  return matches;
}

function buildAssignments(
  demand: MobilityDemandRecord[],
  vehicles: MobilityVehicleRecord[],
  matches: MobilityMatch[],
): MobilityAssignment[] {
  const vehiclesById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
  const liveAssignments = demand
    .filter(item => item.status === 'assigned' && item.assignedVehicleId)
    .map(item => {
      const vehicle = vehiclesById.get(item.assignedVehicleId ?? '');
      return {
        id: `live-${item.id}`,
        demandId: item.id,
        vehicleId: item.assignedVehicleId ?? 'unknown',
        corridorId: item.corridorId,
        source: 'live' as const,
        status: vehicle?.state === 'in_trip' ? 'in_trip' as const : 'active' as const,
        summary: `${item.kind === 'package' ? 'Package' : 'Passenger'} demand is already riding on ${vehicle?.from.label ?? 'a live vehicle'} -> ${vehicle?.to.label ?? 'active corridor'}.`,
      };
    });

  const plannedAssignments = matches.map(match => {
    const vehicle = vehiclesById.get(match.vehicleId);
    const item = demand.find(entry => entry.id === match.demandId);
    return {
      id: `planned-${match.demandId}-${match.vehicleId}`,
      demandId: match.demandId,
      vehicleId: match.vehicleId,
      corridorId: match.corridorId,
      source: 'planned' as const,
      status: 'planned' as const,
      summary: `${item?.from.label ?? 'Demand'} -> ${item?.to.label ?? 'destination'} clears dispatch threshold on ${vehicle?.from.label ?? 'route'} -> ${vehicle?.to.label ?? 'route'} at score ${match.score}.`,
    };
  });

  return [...liveAssignments, ...plannedAssignments];
}

function formatDemandUnits(demand: MobilityDemandRecord) {
  if (demand.kind === 'package') {
    return `${demand.units} parcel unit${demand.units === 1 ? '' : 's'}`;
  }

  return `${demand.units} seat${demand.units === 1 ? '' : 's'}`;
}

function formatVehicleCapacity(vehicle: MobilityVehicleRecord) {
  return `${vehicle.availablePassengerSeats} seats / ${vehicle.availablePackageUnits} parcel units`;
}

function formatAssignmentStatus(assignment: MobilityAssignment) {
  if (assignment.status === 'in_trip') {
    return 'IN TRIP';
  }

  if (assignment.status === 'active') {
    return 'LIVE';
  }

  return 'PLANNED';
}

function buildStageDrilldowns(args: {
  demand: MobilityDemandRecord[];
  vehicles: MobilityVehicleRecord[];
  scoredCandidates: MobilityVehicleCandidate[];
  matches: MobilityMatch[];
  assignments: MobilityAssignment[];
  rebalancing: MobilityRebalancingAction[];
}): MobilityPipelineStageDrilldown[] {
  const demandById = new Map(args.demand.map(item => [item.id, item]));
  const vehicleById = new Map(args.vehicles.map(vehicle => [vehicle.id, vehicle]));
  const pendingDemand = args.demand
    .filter(item => item.status === 'pending')
    .sort((left, right) => {
      const scoreDelta = right.forecastDemandScore - left.forecastDemandScore;
      if (scoreDelta !== 0) {return scoreDelta;}
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
  const dispatchableVehicles = args.vehicles
    .filter(hasDispatchableCapacity)
    .sort((left, right) => {
      const rightCapacity =
        right.availablePassengerSeats + right.availablePackageUnits;
      const leftCapacity =
        left.availablePassengerSeats + left.availablePackageUnits;
      const capacityDelta = rightCapacity - leftCapacity;
      if (capacityDelta !== 0) {return capacityDelta;}
      return left.utilizationPercent - right.utilizationPercent;
    });
  const viableCandidates = args.scoredCandidates
    .filter(candidate => candidate.score >= MIN_VIABLE_SCORE)
    .sort((left, right) => right.score - left.score);
  const matchedDemandIds = new Set(args.matches.map(match => match.demandId));
  const unmatchedPending = pendingDemand.filter(item => !matchedDemandIds.has(item.id));
  const liveAssignments = args.assignments.filter(assignment => assignment.source === 'live').length;
  const plannedAssignments = args.assignments.length - liveAssignments;

  return [
    {
      id: 'demand',
      label: 'Demand',
      headline: `${pendingDemand.length} open requests are entering the dispatch pipeline.`,
      explanation:
        unmatchedPending.length > 0
          ? `${unmatchedPending.length} requests are still waiting for a vehicle with enough route fit and capacity.`
          : 'Every open request already has enough supply pressure behind it to keep the pipeline moving.',
      items: pendingDemand.slice(0, MAX_STAGE_ITEMS).map(item => ({
        id: item.id,
        title: `${item.from.label} -> ${item.to.label}`,
        detail: `${item.kind === 'package' ? 'Package' : 'Passenger'} demand / ${formatDemandUnits(item)} / ${item.pricePressure} price pressure`,
        metric: `${item.forecastDemandScore}`,
        tone: item.pricePressure === 'surging' ? 'attention' : 'neutral',
      })),
    },
    {
      id: 'candidate-vehicles',
      label: 'Candidate Vehicles',
      headline: `${dispatchableVehicles.length} vehicles still have usable seat or parcel capacity.`,
      explanation: `${args.vehicles.filter(vehicle => vehicle.state === 'idle').length} idle vehicles and ${args.vehicles.filter(vehicle => vehicle.state !== 'idle' && hasDispatchableCapacity(vehicle)).length} moving vehicles can still absorb work.`,
      items: dispatchableVehicles.slice(0, MAX_STAGE_ITEMS).map(vehicle => ({
        id: vehicle.id,
        title: `${vehicle.from.label} -> ${vehicle.to.label}`,
        detail: `${vehicle.state} / ${formatVehicleCapacity(vehicle)} / ${vehicle.source}`,
        metric: `${vehicle.availablePassengerSeats + vehicle.availablePackageUnits} open`,
        tone: vehicle.state === 'idle' ? 'positive' : 'neutral',
      })),
    },
    {
      id: 'scoring',
      label: 'Scoring',
      headline: `${viableCandidates.length} demand-vehicle pairs clear the ${MIN_VIABLE_SCORE}+ viable score band.`,
      explanation: `${args.scoredCandidates.filter(candidate => candidate.score >= MATCH_THRESHOLD).length} pairs already clear the ${MATCH_THRESHOLD}+ dispatch threshold.`,
      items: viableCandidates.slice(0, MAX_STAGE_ITEMS).map(candidate => {
        const demand = demandById.get(candidate.demandId);
        const vehicle = vehicleById.get(candidate.vehicleId);
        return {
          id: `${candidate.demandId}-${candidate.vehicleId}`,
          title: `${demand?.from.label ?? 'Origin'} -> ${demand?.to.label ?? 'Destination'}`,
          detail: `${vehicle?.from.label ?? 'Vehicle'} -> ${vehicle?.to.label ?? 'Route'} / ${candidate.rationale.slice(0, 2).join(' ')}`,
          metric: `${candidate.score}`,
          tone: candidate.score >= MATCH_THRESHOLD ? 'positive' : 'neutral',
        } satisfies MobilityPipelineStageItem;
      }),
    },
    {
      id: 'matching',
      label: 'Matching',
      headline: `${args.matches.length} requests clear dispatch right now.`,
      explanation:
        unmatchedPending.length > 0
          ? `${unmatchedPending.length} pending requests still need a better corridor fit, more capacity, or less congestion.`
          : 'All open requests currently have a dispatch-ready match candidate.',
      items: args.matches.slice(0, MAX_STAGE_ITEMS).map(match => {
        const demand = demandById.get(match.demandId);
        const vehicle = vehicleById.get(match.vehicleId);
        return {
          id: `${match.demandId}-${match.vehicleId}`,
          title: `${demand?.from.label ?? 'Origin'} -> ${demand?.to.label ?? 'Destination'}`,
          detail: `${match.confidence} confidence on ${vehicle?.from.label ?? 'route'} -> ${vehicle?.to.label ?? 'route'}`,
          metric: `${match.score}`,
          tone: match.confidence === 'high' ? 'positive' : match.confidence === 'low' ? 'attention' : 'neutral',
        } satisfies MobilityPipelineStageItem;
      }),
    },
    {
      id: 'assignment',
      label: 'Assignment',
      headline: `${args.assignments.length} live or planned assignments are visible to operators.`,
      explanation: `${liveAssignments} live assignments and ${plannedAssignments} planned dispatches are sitting in the same operating stack.`,
      items: args.assignments.slice(0, MAX_STAGE_ITEMS).map(assignment => ({
        id: assignment.id,
        title: assignment.summary,
        detail: `Demand ${assignment.demandId} / vehicle ${assignment.vehicleId} / ${assignment.source}`,
        metric: formatAssignmentStatus(assignment),
        tone: assignment.status === 'planned' ? 'neutral' : 'positive',
      })),
    },
    {
      id: 'rebalancing',
      label: 'Rebalancing',
      headline: `${args.rebalancing.length} idle vehicles should shift toward pressure corridors.`,
      explanation:
        args.rebalancing.length > 0
          ? 'Standby vehicles should move toward corridors where unmatched demand is building.'
          : 'Idle supply is already close enough to demand, so the system can stay put for this cycle.',
      items: args.rebalancing.slice(0, MAX_STAGE_ITEMS).map(action => ({
        id: `${action.vehicleId}-${action.corridorId}`,
        title: `${action.from} -> ${action.to}`,
        detail: `Vehicle ${action.vehicleId} / ${action.reason}`,
        metric: `${action.score}`,
        tone: 'attention',
      })),
    },
  ];
}

export function buildRebalancingActions(args: {
  demand: MobilityDemandRecord[];
  vehicles: MobilityVehicleRecord[];
  matches: MobilityMatch[];
  corridorSignals: LiveCorridorSignal[];
}): MobilityRebalancingAction[] {
  const matchedDemandIds = new Set(args.matches.map(match => match.demandId));
  const idleVehicles = args.vehicles
    .filter(vehicle => vehicle.state === 'idle' && vehicle.availablePassengerSeats + vehicle.availablePackageUnits > 0)
    .sort((left, right) => left.utilizationPercent - right.utilizationPercent);

  const unmatchedPending = args.demand.filter(
    item => item.status === 'pending' && !matchedDemandIds.has(item.id),
  );

  const pressureByCorridor = new Map<string, { signal: LiveCorridorSignal; score: number }>();
  for (const signal of args.corridorSignals) {
    const pendingUnits = unmatchedPending
      .filter(item => item.corridorId === signal.id)
      .reduce((sum, item) => sum + item.units, 0);
    const pressureScore =
      (pendingUnits * 18) +
      signal.forecastDemandScore +
      (signal.pricePressure === 'surging' ? 18 : signal.pricePressure === 'balanced' ? 8 : 0) -
      (signal.activeSupply * 9);

    pressureByCorridor.set(signal.id, {
      signal,
      score: pressureScore,
    });
  }

  const targets = [...pressureByCorridor.values()]
    .filter(entry => entry.score >= 72)
    .sort((left, right) => right.score - left.score);

  const actions: MobilityRebalancingAction[] = [];
  const reservedVehicles = new Set<string>();

  for (const target of targets) {
    const candidate = idleVehicles.find(vehicle => {
      if (reservedVehicles.has(vehicle.id)) {return false;}
      return vehicle.corridorId !== target.signal.id;
    });

    if (!candidate) {
      continue;
    }

    reservedVehicles.add(candidate.id);
    actions.push({
      vehicleId: candidate.id,
      corridorId: target.signal.id,
      from: target.signal.from,
      to: target.signal.to,
      score: Math.round(target.score),
      reason: `${target.signal.label} has unmet demand pressure and should absorb idle capacity before the next wave window ${target.signal.nextWaveWindow}.`,
    });
  }

  return actions;
}

function resolvePipelineSource(
  demand: MobilityDemandRecord[],
  vehicles: MobilityVehicleRecord[],
): MobilityPipelineSource {
  const hasLiveDemand = demand.some(item => item.source !== 'modeled-signal');
  const hasModeledDemand = demand.some(item => item.source === 'modeled-signal');
  const hasLiveVehicles = vehicles.some(item => item.source === 'live-ride');
  const hasModeledVehicles = vehicles.some(item => item.source === 'modeled-supply');

  if ((hasLiveDemand || hasLiveVehicles) && (hasModeledDemand || hasModeledVehicles)) {
    return 'hybrid';
  }

  if (hasLiveDemand || hasLiveVehicles) {
    return 'live';
  }

  return 'modeled';
}

export function buildMobilityPipeline(
  inputs: MobilityPipelineInputs,
): MobilityPipelineSnapshot {
  const signalsById = new Map(inputs.corridorSignals.map(signal => [signal.id, signal]));
  const scoredCandidates = inputs.demand
    .filter(item => item.status === 'pending')
    .flatMap(item =>
      inputs.vehicles.map(vehicle =>
        scoreVehicleForDemand(item, vehicle, signalsById.get(item.corridorId ?? '') ?? null),
      ),
    )
    .sort((left, right) => right.score - left.score);

  const matches = selectBestMatches(inputs.demand, inputs.vehicles, scoredCandidates);
  const assignments = buildAssignments(inputs.demand, inputs.vehicles, matches);
  const rebalancing = buildRebalancingActions({
    demand: inputs.demand,
    vehicles: inputs.vehicles,
    matches,
    corridorSignals: inputs.corridorSignals,
  });

  const pendingDemand = inputs.demand.filter(item => item.status === 'pending').length;
  const viableCandidatePairs = scoredCandidates.filter(candidate => candidate.score >= MIN_VIABLE_SCORE).length;
  const dispatchableVehicles = inputs.vehicles.filter(hasDispatchableCapacity).length;
  const averageMatchScore =
    matches.length > 0
      ? Math.round(matches.reduce((sum, match) => sum + match.score, 0) / matches.length)
      : 0;
  const matchRatePercent = pendingDemand > 0
    ? Math.round((matches.length / pendingDemand) * 100)
    : 100;

  const metrics: MobilityPipelineMetrics = {
    totalDemand: inputs.demand.length,
    pendingDemand,
    assignedDemand: inputs.demand.filter(item => item.status === 'assigned').length,
    completedDemand: inputs.demand.filter(item => item.status === 'completed').length,
    activeAssignments: assignments.length,
    dispatchableVehicles,
    averageMatchScore,
    viableCandidatePairs,
    matchRatePercent,
    rebalancingCount: rebalancing.length,
  };

  const stages: MobilityPipelineStageSummary[] = [
    {
      id: 'demand',
      label: 'Demand',
      count: metrics.pendingDemand,
      summary: `${metrics.pendingDemand} open ride or package requests are still waiting for supply.`,
    },
    {
      id: 'candidate-vehicles',
      label: 'Candidate Vehicles',
      count: metrics.dispatchableVehicles,
      summary: `${metrics.dispatchableVehicles} vehicles still have usable seat or parcel capacity.`,
    },
    {
      id: 'scoring',
      label: 'Scoring',
      count: metrics.viableCandidatePairs,
      summary: `${metrics.viableCandidatePairs} demand-vehicle pairs currently clear a viable score band.`,
    },
    {
      id: 'matching',
      label: 'Matching',
      count: matches.length,
      summary: `${matches.length} new matches clear the dispatch threshold this cycle.`,
    },
    {
      id: 'assignment',
      label: 'Assignment',
      count: metrics.activeAssignments,
      summary: `${metrics.activeAssignments} live or planned assignments are now visible to operations.`,
    },
    {
      id: 'rebalancing',
      label: 'Rebalancing',
      count: metrics.rebalancingCount,
      summary: `${metrics.rebalancingCount} idle vehicles should shift toward pressure corridors.`,
    },
  ];

  const stageDrilldowns = buildStageDrilldowns({
    demand: inputs.demand,
    vehicles: inputs.vehicles,
    scoredCandidates,
    matches,
    assignments,
    rebalancing,
  });

  return {
    updatedAt: inputs.updatedAt ?? new Date().toISOString(),
    source: resolvePipelineSource(inputs.demand, inputs.vehicles),
    thresholds: MOBILITY_PIPELINE_THRESHOLDS,
    demand: inputs.demand,
    vehicles: inputs.vehicles,
    scoredCandidates,
    matches,
    assignments,
    rebalancing,
    stages,
    stageDrilldowns,
    metrics,
    featuredCorridors: inputs.corridorSignals.slice(0, 6),
  };
}

export function buildMobilityPipelineSnapshot(now = Date.now()): MobilityPipelineSnapshot {
  const intelligence = buildRouteIntelligenceSnapshot();
  const alerts = getDemandAlerts().map(alert => buildDemandFromAlert(alert, intelligence.allSignals));
  const bookings = getRideBookings();
  const bookingDemand = bookings.map(booking => buildDemandFromBooking(booking, intelligence.allSignals));
  const packages = getConnectedPackages();
  const packageDemand = packages.map(pkg => buildDemandFromPackage(pkg, intelligence.allSignals));
  const liveDemand = [...alerts, ...bookingDemand, ...packageDemand].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const modeledDemand = buildModeledDemand(intelligence.featuredSignals, liveDemand);

  const rides = getConnectedRides().filter(ride => ride.status !== 'cancelled' && ride.status !== 'completed');
  const liveVehicles = rides.map(ride =>
    buildVehicleFromRide(ride, bookings, packages, intelligence.allSignals, now),
  );
  const modeledVehicles = buildModeledVehicles(intelligence.featuredSignals, liveVehicles);

  return buildMobilityPipeline({
    updatedAt: intelligence.updatedAt,
    demand: [...liveDemand, ...modeledDemand],
    vehicles: [...liveVehicles, ...modeledVehicles],
    corridorSignals: intelligence.allSignals,
  });
}

export function useMobilityPipeline() {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {return undefined;}

    const refresh = () => setTick(value => value + 1);
    const interval = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener('storage', refresh);
    window.addEventListener('wasel:ride-bookings-changed', refresh as EventListener);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('wasel:ride-bookings-changed', refresh as EventListener);
    };
  }, []);

  return useMemo(() => {
    void tick;
    return buildMobilityPipelineSnapshot();
  }, [tick]);
}
