import { getAllRegions, type CityRoute, type RegionConfig } from '../utils/regionConfig';
import { getLiveCorridorSignal } from './routeDemandIntelligence';

type CorridorProofMode = 'live-production' | 'launch-model';

export interface MiddleEastCorridorProofRow {
  id: string;
  regionCode: string;
  regionName: string;
  corridor: string;
  launchStatus: RegionConfig['launchStatus'];
  proofMode: CorridorProofMode;
  waselSharedPriceJod: number;
  benchmarkPriceJod: number;
  savingsPercent: number;
  predictedMatchMinutes: number;
  benchmarkMatchMinutes: number;
  ownershipScore: number;
  evidenceLine: string;
  sourceLine: string;
}

export interface MiddleEastCorridorProofSnapshot {
  updatedAt: string;
  rows: MiddleEastCorridorProofRow[];
  liveOwnedCorridors: number;
  averageSavingsPercent: number;
  averageOwnershipScore: number;
}

const MIDDLE_EAST_REGION_CODES = new Set([
  'JO',
  'EG',
  'SA',
  'AE',
  'KW',
  'BH',
  'QA',
  'OM',
  'LB',
  'PS',
  'IQ',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundMoney(value: number) {
  return Math.round(value * 10) / 10;
}

function buildBenchmarkPrice(route: CityRoute, region: RegionConfig) {
  const fuelCostJod =
    (route.distanceKm / 100) * region.fuel.efficiencyLper100km * region.fuel.priceInJOD;
  const tollAllowanceJod = route.hasTolls ? Math.max(0.8, route.tollCostLocal * 0.08) : 0;
  return roundMoney(Math.max(5.5, fuelCostJod * 1.95 + (route.distanceKm * 0.05) + tollAllowanceJod + 2.4));
}

function buildModeledRow(route: CityRoute, region: RegionConfig): MiddleEastCorridorProofRow {
  const benchmarkPriceJod = buildBenchmarkPrice(route, region);
  const tierBoost = route.tier === 1 ? 8 : route.tier === 2 ? 4 : 0;
  const launchBoost = region.launchStatus === 'active'
    ? 12
    : region.launchStatus === 'beta'
      ? 9
      : region.launchStatus === 'coming_soon'
        ? 5
        : 2;
  const popularityBoost = route.popular ? 8 : 3;
  const packageBoost = route.packageEnabled ? 5 : 0;
  const ownershipScore = clamp(46 + tierBoost + launchBoost + popularityBoost + packageBoost, 38, 86);
  const waselSharedPriceJod = roundMoney(benchmarkPriceJod * (route.packageEnabled ? 0.68 : 0.73));
  const savingsPercent = clamp(
    Math.round((1 - (waselSharedPriceJod / benchmarkPriceJod)) * 100),
    18,
    38,
  );
  const predictedMatchMinutes = clamp(
    Math.round(44 - tierBoost - launchBoost - popularityBoost * 0.7),
    11,
    48,
  );
  const benchmarkMatchMinutes = clamp(predictedMatchMinutes + 18, 28, 72);

  return {
    id: `${region.iso}-${route.id}`,
    regionCode: region.iso,
    regionName: region.name,
    corridor: `${route.from} to ${route.to}`,
    launchStatus: region.launchStatus,
    proofMode: 'launch-model',
    waselSharedPriceJod,
    benchmarkPriceJod,
    savingsPercent,
    predictedMatchMinutes,
    benchmarkMatchMinutes,
    ownershipScore,
    evidenceLine: `Tier ${route.tier} corridor with ${route.packageEnabled ? 'people plus goods' : 'people-first'} demand and ${route.popular ? 'high' : 'developing'} regional pull.`,
    sourceLine: 'Launch model from route distance, regional fuel costs, corridor tier, and market status.',
  };
}

function buildLiveRow(route: CityRoute, region: RegionConfig): MiddleEastCorridorProofRow | null {
  const signal = getLiveCorridorSignal(route.from, route.to);
  if (!signal) return null;

  const benchmarkPriceJod = roundMoney(Math.max(signal.priceQuote.basePriceJod, buildBenchmarkPrice(route, region)));
  const predictedMatchMinutes = clamp(
    Math.round(36 - (signal.forecastDemandScore * 0.18) - (signal.activeSupply * 1.2)),
    6,
    34,
  );
  const benchmarkMatchMinutes = clamp(predictedMatchMinutes + 16, 20, 56);

  return {
    id: `${region.iso}-${route.id}`,
    regionCode: region.iso,
    regionName: region.name,
    corridor: signal.label.replace(' -> ', ' to '),
    launchStatus: region.launchStatus,
    proofMode: 'live-production',
    waselSharedPriceJod: signal.priceQuote.finalPriceJod,
    benchmarkPriceJod,
    savingsPercent: clamp(
      Math.round((1 - (signal.priceQuote.finalPriceJod / benchmarkPriceJod)) * 100),
      12,
      48,
    ),
    predictedMatchMinutes,
    benchmarkMatchMinutes,
    ownershipScore: signal.routeOwnershipScore,
    evidenceLine: `${signal.productionSources[0]}, ${signal.productionSources[1]}, ${signal.productionSources[2]}.`,
    sourceLine: 'Live production signals from rides, bookings, packages, alerts, and growth events.',
  };
}

function pickKeyRoutes(region: RegionConfig) {
  return region.routes
    .filter((route) => route.tier === 1)
    .sort((left, right) => Number(right.popular) - Number(left.popular))
    .slice(0, 2);
}

export function buildMiddleEastCorridorProof(limit = 10): MiddleEastCorridorProofSnapshot {
  const rows = getAllRegions()
    .filter((region) => MIDDLE_EAST_REGION_CODES.has(region.iso))
    .flatMap((region) => pickKeyRoutes(region).map((route) => (
      region.iso === 'JO'
        ? buildLiveRow(route, region) ?? buildModeledRow(route, region)
        : buildModeledRow(route, region)
    )))
    .sort((left, right) => {
      if (left.proofMode !== right.proofMode) {
        return left.proofMode === 'live-production' ? -1 : 1;
      }
      return (right.ownershipScore + right.savingsPercent) - (left.ownershipScore + left.savingsPercent);
    })
    .slice(0, limit);

  const liveOwnedCorridors = rows.filter((row) => row.proofMode === 'live-production').length;
  const averageSavingsPercent = rows.length > 0
    ? Math.round(rows.reduce((sum, row) => sum + row.savingsPercent, 0) / rows.length)
    : 0;
  const averageOwnershipScore = rows.length > 0
    ? Math.round(rows.reduce((sum, row) => sum + row.ownershipScore, 0) / rows.length)
    : 0;

  return {
    updatedAt: new Date().toISOString(),
    rows,
    liveOwnedCorridors,
    averageSavingsPercent,
    averageOwnershipScore,
  };
}
