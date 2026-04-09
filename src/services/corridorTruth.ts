import { useMemo } from 'react';
import { getCorridorOpportunity, type CorridorOpportunity } from '../config/wasel-movement-network';
import { getConnectedPackages, getConnectedRides } from './journeyLogistics';
import { getMovementMembershipSnapshot } from './movementMembership';
import { getMovementPriceQuote, type MovementPriceQuote } from './movementPricing';
import {
  buildRouteIntelligenceSnapshot,
  getLiveCorridorSignal,
  useLiveRouteIntelligence,
  type LiveCorridorSignal,
  type RouteIntelligenceSnapshot,
} from './routeDemandIntelligence';
import { routeMatchesLocationPair } from '../utils/jordanLocations';

export interface CorridorTruthSnapshot {
  from: string | null;
  to: string | null;
  corridorPlan: CorridorOpportunity | null;
  selectedSignal: LiveCorridorSignal | null;
  selectedPriceQuote: MovementPriceQuote | null;
  featuredSignals: LiveCorridorSignal[];
  allSignals: LiveCorridorSignal[];
  membership: ReturnType<typeof getMovementMembershipSnapshot>;
  matchingRideCount: number;
  packageReadyRideCount: number;
  matchingPackageCount: number;
  recommendedPickupPoint: string | null;
  nextWaveWindow: string | null;
  routeOwnershipScore: number | null;
  recommendationReason: string | null;
}

function countMatchingRides(from?: string | null, to?: string | null) {
  const rides = getConnectedRides().filter((ride) =>
    routeMatchesLocationPair(ride.from, ride.to, from, to, { allowReverse: false }),
  );

  return {
    matchingRideCount: rides.length,
    packageReadyRideCount: rides.filter((ride) => ride.acceptsPackages).length,
  };
}

function countMatchingPackages(from?: string | null, to?: string | null) {
  return getConnectedPackages().filter((pkg) =>
    routeMatchesLocationPair(pkg.from, pkg.to, from, to, { allowReverse: false }),
  ).length;
}

function buildSelectedPriceQuote(args: {
  corridorPlan: CorridorOpportunity | null;
  selectedSignal: LiveCorridorSignal | null;
  basePriceJod?: number | null;
  membership: ReturnType<typeof getMovementMembershipSnapshot>;
}) {
  if (args.selectedSignal?.priceQuote) {
    return args.selectedSignal.priceQuote;
  }

  if (!args.corridorPlan) {
    return null;
  }

  return getMovementPriceQuote({
    basePriceJod: args.basePriceJod ?? args.corridorPlan.sharedPriceJod,
    corridorId: args.corridorPlan.id,
    forecastDemandScore: args.selectedSignal?.forecastDemandScore ?? args.corridorPlan.predictedDemandScore,
    membership: args.membership,
  });
}

function buildCorridorTruthSnapshot(args: {
  from?: string | null;
  to?: string | null;
  basePriceJod?: number | null;
  featuredLimit?: number;
  routeIntelligence: RouteIntelligenceSnapshot;
}): CorridorTruthSnapshot {
  const corridorPlan = getCorridorOpportunity(args.from, args.to);
  const selectedSignal = args.routeIntelligence.selectedSignal;
  const { matchingRideCount, packageReadyRideCount } = countMatchingRides(args.from, args.to);
  const matchingPackageCount = countMatchingPackages(args.from, args.to);
  const selectedPriceQuote = buildSelectedPriceQuote({
    corridorPlan,
    selectedSignal,
    basePriceJod: args.basePriceJod,
    membership: args.routeIntelligence.membership,
  });

  return {
    from: args.from ?? null,
    to: args.to ?? null,
    corridorPlan,
    selectedSignal,
    selectedPriceQuote,
    featuredSignals: args.routeIntelligence.featuredSignals.slice(0, args.featuredLimit ?? 4),
    allSignals: args.routeIntelligence.allSignals,
    membership: args.routeIntelligence.membership,
    matchingRideCount,
    packageReadyRideCount,
    matchingPackageCount,
    recommendedPickupPoint: selectedSignal?.recommendedPickupPoint ?? corridorPlan?.pickupPoints[0] ?? null,
    nextWaveWindow: selectedSignal?.nextWaveWindow ?? corridorPlan?.autoGroupWindow ?? null,
    routeOwnershipScore: selectedSignal?.routeOwnershipScore ?? null,
    recommendationReason: selectedSignal?.recommendedReason ?? corridorPlan?.routeMoat ?? null,
  };
}

export function getCorridorTruth(args?: {
  from?: string | null;
  to?: string | null;
  basePriceJod?: number | null;
  featuredLimit?: number;
  membership?: ReturnType<typeof getMovementMembershipSnapshot>;
}) {
  const routeIntelligence = buildRouteIntelligenceSnapshot({
    from: args?.from,
    to: args?.to,
    membership: args?.membership,
  });

  return buildCorridorTruthSnapshot({
    ...args,
    routeIntelligence,
  });
}

export function useCorridorTruth(args?: {
  from?: string | null;
  to?: string | null;
  basePriceJod?: number | null;
  featuredLimit?: number;
}) {
  const from = args?.from;
  const to = args?.to;
  const basePriceJod = args?.basePriceJod;
  const featuredLimit = args?.featuredLimit;
  const routeIntelligence = useLiveRouteIntelligence({ from, to });

  return useMemo(
    () =>
      buildCorridorTruthSnapshot({
        from,
        to,
        basePriceJod,
        featuredLimit,
        routeIntelligence,
      }),
    [basePriceJod, featuredLimit, from, routeIntelligence, to],
  );
}

export function getCorridorMovementQuote(args: {
  from?: string | null;
  to?: string | null;
  basePriceJod: number;
  membership?: ReturnType<typeof getMovementMembershipSnapshot>;
  signal?: LiveCorridorSignal | null;
}) {
  const membership = args.membership ?? getMovementMembershipSnapshot();
  const signal = args.signal ?? getLiveCorridorSignal(args.from, args.to, membership);
  const corridorPlan = getCorridorOpportunity(args.from, args.to);
  const corridorId = signal?.id ?? corridorPlan?.id ?? null;
  const forecastDemandScore = signal?.forecastDemandScore ?? corridorPlan?.predictedDemandScore;

  return {
    corridorPlan,
    signal,
    priceQuote: getMovementPriceQuote({
      basePriceJod: args.basePriceJod,
      corridorId,
      forecastDemandScore,
      membership,
    }),
  };
}
