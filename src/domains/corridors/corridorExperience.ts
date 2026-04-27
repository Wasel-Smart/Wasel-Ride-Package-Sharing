import type { CorridorOpportunity } from '../../config/wasel-movement-network';
import type { CorridorTruthSnapshot } from '../../services/corridorTruth';
import type { LiveCorridorSignal } from '../../services/routeDemandIntelligence';

type DemandSource = 'live' | 'planned' | 'none';

export interface CorridorExperienceSnapshot {
  corridorId: string | null;
  corridorLabel: string | null;
  demandScore: number | null;
  demandSource: DemandSource;
  density: CorridorOpportunity['density'] | null;
  pricePressure: LiveCorridorSignal['pricePressure'] | null;
  matchingRideCount: number;
  packageReadyRideCount: number;
  matchingPackageCount: number;
  attachRatePercent: number | null;
  referencePriceJod: number | null;
  quotedPriceJod: number | null;
  quoteSavingsPercent: number | null;
  routeOwnershipScore: number | null;
  recommendedPickupPoint: string | null;
  nextWaveWindow: string | null;
  recommendationReason: string | null;
  liveSearches: number;
  liveBookings: number;
  livePackages: number;
  activeDemandAlerts: number;
  liveProofSummary: string | null;
  pickupSummary: string | null;
}

function buildLiveProofSummary(snapshot: {
  activeDemandAlerts: number;
  liveBookings: number;
  livePackages: number;
  liveSearches: number;
}) {
  if (
    snapshot.activeDemandAlerts <= 0 &&
    snapshot.liveBookings <= 0 &&
    snapshot.livePackages <= 0 &&
    snapshot.liveSearches <= 0
  ) {
    return null;
  }

  return `${snapshot.activeDemandAlerts} alerts | ${snapshot.liveBookings} bookings | ${snapshot.livePackages} packages | ${snapshot.liveSearches} searches`;
}

function buildPickupSummary(args: {
  recommendedPickupPoint: string | null;
  nextWaveWindow: string | null;
}) {
  if (args.recommendedPickupPoint && args.nextWaveWindow) {
    return `Next wave is ${args.nextWaveWindow} from ${args.recommendedPickupPoint}.`;
  }

  if (args.nextWaveWindow) {
    return `Next wave is ${args.nextWaveWindow}.`;
  }

  if (args.recommendedPickupPoint) {
    return `Recommended pickup point: ${args.recommendedPickupPoint}.`;
  }

  return null;
}

export function buildCorridorExperienceSnapshot(
  snapshot: CorridorTruthSnapshot,
): CorridorExperienceSnapshot {
  const corridorId = snapshot.selectedSignal?.id ?? snapshot.corridorPlan?.id ?? null;
  const corridorLabel =
    snapshot.selectedSignal?.label ?? snapshot.corridorPlan?.label ?? null;
  const demandScore =
    snapshot.selectedSignal?.forecastDemandScore ??
    snapshot.corridorPlan?.predictedDemandScore ??
    null;
  const demandSource: DemandSource = snapshot.selectedSignal
    ? 'live'
    : snapshot.corridorPlan
      ? 'planned'
      : 'none';
  const referencePriceJod = snapshot.corridorPlan?.sharedPriceJod ?? null;
  const quotedPriceJod =
    snapshot.selectedPriceQuote?.finalPriceJod ?? referencePriceJod;
  const quoteSavingsPercent =
    snapshot.selectedPriceQuote?.savingsPercent ??
    snapshot.corridorPlan?.savingsPercent ??
    null;
  const liveSearches = snapshot.selectedSignal?.liveSearches ?? 0;
  const liveBookings = snapshot.selectedSignal?.liveBookings ?? 0;
  const livePackages = snapshot.selectedSignal?.livePackages ?? 0;
  const activeDemandAlerts = snapshot.selectedSignal?.activeDemandAlerts ?? 0;
  const recommendedPickupPoint = snapshot.recommendedPickupPoint ?? null;
  const nextWaveWindow = snapshot.nextWaveWindow ?? null;

  return {
    corridorId,
    corridorLabel,
    demandScore,
    demandSource,
    density: snapshot.corridorPlan?.density ?? null,
    pricePressure: snapshot.selectedSignal?.pricePressure ?? null,
    matchingRideCount: snapshot.matchingRideCount,
    packageReadyRideCount: snapshot.packageReadyRideCount,
    matchingPackageCount: snapshot.matchingPackageCount,
    attachRatePercent: snapshot.corridorPlan?.attachRatePercent ?? null,
    referencePriceJod,
    quotedPriceJod,
    quoteSavingsPercent,
    routeOwnershipScore: snapshot.routeOwnershipScore,
    recommendedPickupPoint,
    nextWaveWindow,
    recommendationReason: snapshot.recommendationReason,
    liveSearches,
    liveBookings,
    livePackages,
    activeDemandAlerts,
    liveProofSummary: buildLiveProofSummary({
      activeDemandAlerts,
      liveBookings,
      livePackages,
      liveSearches,
    }),
    pickupSummary: buildPickupSummary({
      recommendedPickupPoint,
      nextWaveWindow,
    }),
  };
}
