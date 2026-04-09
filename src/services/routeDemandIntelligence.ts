import { useEffect, useMemo, useState } from 'react';
import {
  getAllCorridorOpportunities,
  getCorridorOpportunity,
  type CorridorOpportunity,
} from '../config/wasel-movement-network';
import { getDemandAlerts } from './demandCapture';
import { getGrowthEventFeed } from './growthEngine';
import { getConnectedPackages, getConnectedRides } from './journeyLogistics';
import { getMovementMembershipSnapshot } from './movementMembership';
import { getMovementPriceQuote, type MovementPriceQuote } from './movementPricing';
import { getRideBookings } from './rideLifecycle';
import { routeMatchesLocationPair } from '../utils/jordanLocations';

const REFRESH_MS = 15_000;
const DAY_MS = 86_400_000;
const LOOKBACK_MS = 14 * DAY_MS;

export interface LiveCorridorSignal {
  id: string;
  from: string;
  to: string;
  label: string;
  liveDemandScore: number;
  forecastDemandScore: number;
  activeSupply: number;
  activeDemandAlerts: number;
  liveSearches: number;
  liveBookings: number;
  livePackages: number;
  seatUtilizationPercent: number;
  pricePressure: 'surging' | 'balanced' | 'value-window';
  nextWaveWindow: string;
  recommendedPickupPoint: string;
  routeOwnershipScore: number;
  recommendedReason: string;
  freshestSignalAt: string | null;
  productionSources: string[];
  priceQuote: MovementPriceQuote;
}

export interface RouteIntelligenceSnapshot {
  updatedAt: string;
  selectedSignal: LiveCorridorSignal | null;
  featuredSignals: LiveCorridorSignal[];
  allSignals: LiveCorridorSignal[];
  membership: ReturnType<typeof getMovementMembershipSnapshot>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Math.round(value * 10) / 10;
}

function corridorMatches(corridor: CorridorOpportunity, from?: string | null, to?: string | null) {
  return routeMatchesLocationPair(corridor.from, corridor.to, from, to);
}

function recencyWeight(timestamp: string, now = Date.now()) {
  const createdAt = new Date(timestamp).getTime();
  if (!Number.isFinite(createdAt)) return 0;
  const ageMs = Math.max(0, now - createdAt);
  if (ageMs > LOOKBACK_MS) return 0;
  const ageDays = ageMs / DAY_MS;
  return Math.max(0.12, 1.15 - (ageDays * 0.08));
}

function inferWaveWindow(hours: number[], density: CorridorOpportunity['density']) {
  if (hours.length === 0) {
    if (density === 'surging') return '07:00 - 09:00 and 16:30 - 18:30';
    if (density === 'high-frequency') return '08:00 - 10:00 and 17:00 - 19:00';
    return 'Next 60-90 minutes once demand clusters';
  }

  const averageHour = hours.reduce((sum, hour) => sum + hour, 0) / hours.length;
  if (averageHour < 11) return '07:00 - 09:30';
  if (averageHour < 15) return '12:00 - 14:30';
  if (averageHour < 20) return '16:30 - 19:00';
  return '20:00 - 22:00';
}

function summarizeProductionSources(args: {
  searches: number;
  bookings: number;
  packages: number;
  alerts: number;
  supply: number;
}) {
  return [
    `${args.searches} live searches`,
    `${args.bookings} live bookings`,
    `${args.packages} package moves`,
    `${args.alerts} active demand alerts`,
    `${args.supply} active route posts`,
  ];
}

function buildRecommendedReason(args: {
  alerts: number;
  supply: number;
  seatUtilizationPercent: number;
  forecastDemandScore: number;
}) {
  if (args.alerts > args.supply) {
    return 'Demand alerts are outrunning live supply, so Wasel should suggest this route before riders search again.';
  }
  if (args.seatUtilizationPercent >= 78) {
    return 'This corridor is already filling well, which makes it ideal for automatic grouping and recurring suggestions.';
  }
  if (args.forecastDemandScore >= 85) {
    return 'Real searches, bookings, and package flow are reinforcing this route enough to treat it like a priority lane.';
  }
  return 'The corridor is building repeat demand and should be nudged with reminders, credits, and suggested departures.';
}

function computeSignal(corridor: CorridorOpportunity, membership = getMovementMembershipSnapshot()): LiveCorridorSignal {
  const now = Date.now();
  const rides = getConnectedRides().filter((ride) => corridorMatches(corridor, ride.from, ride.to) && ride.status !== 'cancelled');
  const bookings = getRideBookings().filter((booking) => corridorMatches(corridor, booking.from, booking.to) && booking.status !== 'rejected' && booking.status !== 'cancelled');
  const packages = getConnectedPackages().filter((item) => corridorMatches(corridor, item.from, item.to));
  const alerts = getDemandAlerts().filter((alert) => corridorMatches(corridor, alert.from, alert.to) && alert.status === 'active');
  const events = getGrowthEventFeed().filter((event) => corridorMatches(corridor, event.from, event.to));

  let weightedSearches = 0;
  let weightedBookings = 0;
  let weightedPackages = 0;
  const signalHours: number[] = [];
  let freshestSignalAt: string | null = null;

  for (const event of events) {
    const weight = recencyWeight(event.createdAt, now);
    if (weight <= 0) continue;
    const eventTime = new Date(event.createdAt);
    signalHours.push(eventTime.getHours());
    freshestSignalAt = !freshestSignalAt || new Date(event.createdAt).getTime() > new Date(freshestSignalAt).getTime()
      ? event.createdAt
      : freshestSignalAt;

    if (event.serviceType === 'ride' && event.funnelStage === 'searched') {
      weightedSearches += weight;
    }
    if (event.serviceType === 'ride' && (event.funnelStage === 'booked' || event.funnelStage === 'completed')) {
      weightedBookings += weight;
    }
    if (event.serviceType === 'package') {
      weightedPackages += weight;
    }
  }

  const liveSearches = Math.round(weightedSearches);
  const liveBookings = Math.max(
    Math.round(weightedBookings),
    bookings.reduce((sum, booking) => sum + Math.max(1, booking.seatsRequested || 1), 0),
  );
  const livePackages = Math.max(
    Math.round(weightedPackages),
    packages.filter((item) => item.status !== 'delivered').length,
  );
  const activeSupply = rides.length;
  const activeDemandAlerts = alerts.length;
  const totalSeats = rides.reduce((sum, ride) => sum + Math.max(1, ride.seats), 0);
  const bookedSeats = Math.max(
    0,
    bookings.reduce((sum, booking) => sum + Math.max(1, booking.seatsRequested || 1), 0),
  );
  const seatUtilizationPercent = totalSeats > 0
    ? clamp(Math.round((bookedSeats / totalSeats) * 100), 0, 100)
    : corridor.fillTargetSeats * 18;

  const demandWeight = (liveSearches * 1.4) + (activeDemandAlerts * 2.2) + (liveBookings * 2.8) + (livePackages * 1.6);
  const supplyWeight = Math.max(1, (activeSupply * 1.9) + (totalSeats * 0.35));
  const pressureRatio = demandWeight / supplyWeight;
  const liveDemandScore = clamp(
    Math.round((corridor.predictedDemandScore * 0.56) + (demandWeight * 3.4) + (pressureRatio * 12)),
    38,
    99,
  );

  const hour = new Date().getHours();
  const timePulse = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)
    ? 6
    : (hour >= 11 && hour <= 14 ? 3 : 0);
  const forecastDemandScore = clamp(
    Math.round((liveDemandScore * 0.72) + (seatUtilizationPercent * 0.12) + timePulse),
    40,
    99,
  );

  const pricePressure = pressureRatio > 1.15
    ? 'surging'
    : pressureRatio >= 0.82
      ? 'balanced'
      : 'value-window';
  const recommendedSharedPriceJod = roundMoney(
    corridor.sharedPriceJod
      * (pricePressure === 'surging' ? 1.04 : pricePressure === 'balanced' ? 1 : 0.96),
  );
  const priceQuote = getMovementPriceQuote({
    basePriceJod: recommendedSharedPriceJod,
    corridorId: corridor.id,
    forecastDemandScore,
    membership,
  });
  const routeOwnershipScore = clamp(
    Math.round((forecastDemandScore * 0.48) + (seatUtilizationPercent * 0.24) + (Math.min(100, demandWeight * 6.2) * 0.28)),
    32,
    99,
  );

  return {
    id: corridor.id,
    from: corridor.from,
    to: corridor.to,
    label: corridor.label,
    liveDemandScore,
    forecastDemandScore,
    activeSupply,
    activeDemandAlerts,
    liveSearches,
    liveBookings,
    livePackages,
    seatUtilizationPercent,
    pricePressure,
    nextWaveWindow: inferWaveWindow(signalHours, corridor.density),
    recommendedPickupPoint: corridor.pickupPoints[0] ?? 'Trusted corridor node',
    routeOwnershipScore,
    recommendedReason: buildRecommendedReason({
      alerts: activeDemandAlerts,
      supply: activeSupply,
      seatUtilizationPercent,
      forecastDemandScore,
    }),
    freshestSignalAt,
    productionSources: summarizeProductionSources({
      searches: liveSearches,
      bookings: liveBookings,
      packages: livePackages,
      alerts: activeDemandAlerts,
      supply: activeSupply,
    }),
    priceQuote,
  };
}

export function buildRouteIntelligenceSnapshot(args?: {
  from?: string | null;
  to?: string | null;
  membership?: ReturnType<typeof getMovementMembershipSnapshot>;
}) {
  const membership = args?.membership ?? getMovementMembershipSnapshot();
  const allSignals = getAllCorridorOpportunities()
    .map((corridor) => computeSignal(corridor, membership))
    .sort((left, right) => {
      const leftScore = left.forecastDemandScore + left.routeOwnershipScore;
      const rightScore = right.forecastDemandScore + right.routeOwnershipScore;
      return rightScore - leftScore;
    });

  const selectedCorridor = args?.from && args?.to
    ? getCorridorOpportunity(args.from, args.to)
    : membership.dailyRoute;
  const selectedSignal = selectedCorridor
    ? allSignals.find((signal) => signal.id === selectedCorridor.id) ?? null
    : null;

  return {
    updatedAt: new Date().toISOString(),
    selectedSignal,
    featuredSignals: allSignals.slice(0, 6),
    allSignals,
    membership,
  } satisfies RouteIntelligenceSnapshot;
}

export function getLiveCorridorSignal(
  from?: string | null,
  to?: string | null,
  membership?: ReturnType<typeof getMovementMembershipSnapshot>,
) {
  return buildRouteIntelligenceSnapshot({ from, to, membership }).selectedSignal;
}

export function useLiveRouteIntelligence(args?: { from?: string | null; to?: string | null }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const refresh = () => setTick((value) => value + 1);
    const interval = window.setInterval(refresh, REFRESH_MS);
    window.addEventListener('storage', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return useMemo(
    () => {
      void tick;
      return buildRouteIntelligenceSnapshot(args);
    },
    [args, tick],
  );
}
