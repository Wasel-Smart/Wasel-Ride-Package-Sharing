import { buildCorridorMarketSnapshot, type CorridorMarketRow } from './corridorMarketData';
import { getCorridorBetaMetricCorridors, type CorridorBetaMetricCorridor } from './corridorBetaMetrics';
import { buildRouteIntelligenceSnapshot, type LiveCorridorSignal } from './routeDemandIntelligence';
import { getRegion, getTier1Routes, type CityRoute } from '../utils/regionConfig';

export type CorridorBetaStage = 'narrow' | 'prove' | 'expand';

export interface CorridorBetaCorridor {
  routeId: string;
  corridor: string;
  from: string;
  to: string;
  path: string;
  stage: CorridorBetaStage;
  proofScore: number;
  weeklyRides: number;
  weeklyRideGoal: number;
  repeatRideRate: number;
  repeatRideGoal: number;
  supplyReliability: number;
  savingsPercent: number;
  reason: string;
  nextAction: string;
}

export interface CorridorBetaPlan {
  regionCode: string;
  regionName: string;
  focusCorridors: CorridorBetaCorridor[];
  expansionDecision: CorridorBetaStage;
  nextExperiment: {
    title: string;
    instruction: string;
    metrics: string[];
  };
  updatedAt: string;
}

export interface ExpansionGateInput {
  weeklyRides: number;
  weeklyRideGoal: number;
  repeatRideRate: number;
  repeatRideGoal: number;
  supplyReliability: number;
  supplyReliabilityGoal: number;
  weeksAtTarget: number;
}

export interface ExpansionGateResult {
  stage: CorridorBetaStage;
  decision: 'narrow' | 'prove' | 'expand';
  blockers: string[];
}

const JO_REGION_CODE = 'JO';
const BETA_FOCUS_LIMIT = 3;
const WEEKLY_RIDE_GOAL = 120;
const REPEAT_RIDE_GOAL = 0.34;
const SUPPLY_RELIABILITY_GOAL = 0.72;
const WEEKS_AT_TARGET_GOAL = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeCity(value: string) {
  return value.trim().toLowerCase();
}

function corridorLabel(route: CityRoute) {
  return `${route.from} to ${route.to}`;
}

function betaPath(route: CityRoute) {
  return `/find-ride?from=${encodeURIComponent(route.from)}&to=${encodeURIComponent(route.to)}&beta=1`;
}

function marketRowForRoute(
  route: CityRoute,
  snapshot: ReturnType<typeof buildCorridorMarketSnapshot>,
): CorridorMarketRow | undefined {
  return snapshot.rows.find(row => row.id === `${JO_REGION_CODE}-${route.id}`);
}

function signalForRoute(
  route: CityRoute,
  snapshot: ReturnType<typeof buildRouteIntelligenceSnapshot>,
): LiveCorridorSignal | undefined {
  return snapshot.allSignals.find(
    signal =>
      normalizeCity(signal.from) === normalizeCity(route.from) &&
      normalizeCity(signal.to) === normalizeCity(route.to),
  );
}

function metricForRoute(
   route: CityRoute,
   metrics: CorridorBetaMetricCorridor[],
): CorridorBetaMetricCorridor | undefined {
  const key = `${normalizeCity(route.from)}|${normalizeCity(route.to)}`;
  return metrics.find(metric => metric.corridorId === key);
}

function getCorridorBetaMetricsData(): CorridorBetaMetricCorridor[] {
  return getCorridorBetaMetricCorridors();
}

function isHabitRoute(route: CityRoute) {
  const label = `${route.useCase} ${route.useCaseAr}`.toLowerCase();
  return (
    label.includes('commuter') ||
    label.includes('daily') ||
    label.includes('university') ||
    label.includes('family') ||
    label.includes('موظف') ||
    label.includes('طلاب') ||
    label.includes('عائلات')
  );
}

function calculateRepeatRideRate(route: CityRoute, signal?: LiveCorridorSignal) {
  const habitBias = isHabitRoute(route) ? 0.14 : 0.04;
  const distanceBias = route.distanceKm <= 90 ? 0.08 : route.distanceKm <= 220 ? 0.04 : 0;
  const demandBias = Math.min(0.18, ((signal?.forecastDemandScore ?? 70) / 100) * 0.16);
  const bookingBias = Math.min(0.12, (signal?.liveBookings ?? 0) * 0.018);

  return Number(clamp(0.12 + habitBias + distanceBias + demandBias + bookingBias, 0.08, 0.62).toFixed(2));
}

function calculateWeeklyRides(signal?: LiveCorridorSignal) {
  return Math.round(
    (signal?.liveBookings ?? 4) * 7 + (signal?.liveSearches ?? 0) * 1.2 + (signal?.livePackages ?? 0) * 2,
  );
}

function calculateSupplyReliability(signal?: LiveCorridorSignal) {
  const activeSupply = Math.min(1, (signal?.activeSupply ?? 1) / 4);
  const utilization = (signal?.seatUtilizationPercent ?? 45) / 100;
  const forecast = (signal?.forecastDemandScore ?? 65) / 100;

  return Number(clamp(activeSupply * 0.3 + utilization * 0.42 + forecast * 0.28, 0.18, 0.96).toFixed(2));
}

function calculateProofScore(args: {
  weeklyRides: number;
  repeatRideRate: number;
  supplyReliability: number;
  savingsPercent: number;
  signal?: LiveCorridorSignal;
}) {
  const weeklyScore = Math.min(25, (args.weeklyRides / WEEKLY_RIDE_GOAL) * 25);
  const repeatScore = Math.min(30, (args.repeatRideRate / REPEAT_RIDE_GOAL) * 30);
  const supplyScore = args.supplyReliability * 20;
  const economicsScore = Math.min(10, (args.savingsPercent / 40) * 10);
  const signalScore = Math.min(15, ((args.signal?.routeOwnershipScore ?? 70) / 100) * 15);

  return Math.round(clamp(weeklyScore + repeatScore + supplyScore + economicsScore + signalScore, 0, 100));
}

function calculateWeeksAtTarget(weeklyRides: number, repeatRideRate: number, proofScore: number) {
  if (weeklyRides < WEEKLY_RIDE_GOAL || repeatRideRate < REPEAT_RIDE_GOAL) return 0;
  return Math.min(WEEKS_AT_TARGET_GOAL, Math.floor(proofScore / 34));
}

export function evaluateCorridorExpansion(input: ExpansionGateInput): ExpansionGateResult {
  const blockers: string[] = [];

  if (input.weeklyRides < input.weeklyRideGoal) blockers.push('weekly rides');
  if (input.repeatRideRate < input.repeatRideGoal) blockers.push('repeat ride rate');
  if (input.supplyReliability < input.supplyReliabilityGoal) blockers.push('supply reliability');
  if (input.weeksAtTarget < WEEKS_AT_TARGET_GOAL) blockers.push('three-week consistency');

  if (blockers.length === 0) {
    return { stage: 'expand', decision: 'expand', blockers };
  }

  if (
    input.weeklyRides >= input.weeklyRideGoal &&
    input.repeatRideRate >= input.repeatRideGoal &&
    input.supplyReliability >= input.supplyReliabilityGoal
  ) {
    return { stage: 'prove', decision: 'prove', blockers };
  }

  return { stage: 'narrow', decision: 'narrow', blockers };
}

function buildBetaCorridor(
  route: CityRoute,
  marketSnapshot: ReturnType<typeof buildCorridorMarketSnapshot>,
  intelligenceSnapshot: ReturnType<typeof buildRouteIntelligenceSnapshot>,
  metrics: CorridorBetaMetricCorridor[],
): CorridorBetaCorridor {
  const marketRow = marketRowForRoute(route, marketSnapshot);
  const signal = signalForRoute(route, intelligenceSnapshot);
  const metric = metricForRoute(route, metrics);
  const weeklyRides = metric?.weeklyRides ?? calculateWeeklyRides(signal);
  const repeatRideRate = metric?.repeatRideRate ?? calculateRepeatRideRate(route, signal);
  const supplyReliability = metric?.supplyReliability ?? calculateSupplyReliability(signal);
  const proofScore = metric?.proofScore ?? calculateProofScore({
    weeklyRides,
    repeatRideRate,
    supplyReliability,
    savingsPercent: marketRow?.savingsPercent ?? route.packageEnabled ? 28 : 22,
    signal,
  });
  const weeksAtTarget = metric?.weeksAtTarget ?? calculateWeeksAtTarget(weeklyRides, repeatRideRate, proofScore);
  const gate = evaluateCorridorExpansion({
    weeklyRides,
    weeklyRideGoal: metric?.weeklyRideGoal ?? WEEKLY_RIDE_GOAL,
    repeatRideRate,
    repeatRideGoal: metric?.repeatRideGoal ?? REPEAT_RIDE_GOAL,
    supplyReliability,
    supplyReliabilityGoal: metric?.supplyReliabilityGoal ?? SUPPLY_RELIABILITY_GOAL,
    weeksAtTarget,
  });
  const reason =
    metric && gate.blockers.length === 0
      ? 'Observed ride data clears the corridor expansion gate.'
      : metric
        ? `Observed data is still narrowing the beta until ${gate.blockers.join(', ')} are stronger.`
        : gate.blockers.length === 0
          ? 'This corridor is ready for controlled expansion because rides, repeat behavior, and supply are all stable.'
          : `Narrow the beta until ${gate.blockers.join(', ')} are stronger.`;
  const nextAction =
    metric && gate.stage === 'expand'
      ? 'Observed rides, repeat behavior, supply, and consistency are strong enough to expand.'
      : gate.stage === 'expand'
        ? 'Open the next corridor only after the same three-week gate passes.'
        : gate.stage === 'prove'
          ? 'Keep supply fixed and push repeat riders until the consistency gate clears.'
          : 'Run one route, one pickup node, and one rider segment until demand concentrates.';

  return {
    routeId: route.id,
    corridor: corridorLabel(route),
    from: route.from,
    to: route.to,
    path: betaPath(route),
    stage: metric?.stage ?? gate.stage,
    proofScore,
    weeklyRides,
    weeklyRideGoal: metric?.weeklyRideGoal ?? WEEKLY_RIDE_GOAL,
    repeatRideRate,
    repeatRideGoal: metric?.repeatRideGoal ?? REPEAT_RIDE_GOAL,
    supplyReliability,
    savingsPercent: marketRow?.savingsPercent ?? 28,
    reason,
    nextAction,
  };
}

export function buildCorridorBetaPlan(args?: { regionCode?: string; limit?: number }): CorridorBetaPlan {
  const regionCode = args?.regionCode ?? JO_REGION_CODE;
  const limit = args?.limit ?? BETA_FOCUS_LIMIT;
  const region = getRegion(regionCode);
  const candidates = getTier1Routes(regionCode as 'JO')
    .slice()
    .sort((left, right) => {
      const leftHabit = isHabitRoute(left) ? 1 : 0;
      const rightHabit = isHabitRoute(right) ? 1 : 0;
      if (leftHabit !== rightHabit) return rightHabit - leftHabit;
      if (left.popular !== right.popular) return Number(right.popular) - Number(left.popular);
      return left.distanceKm - right.distanceKm;
    });
  const marketSnapshot = buildCorridorMarketSnapshot(10);
  const intelligenceSnapshot = buildRouteIntelligenceSnapshot();
  const metrics = getCorridorBetaMetricsData();
  const focusCorridors = candidates.slice(0, limit).map(route =>
    buildBetaCorridor(route, marketSnapshot, intelligenceSnapshot, metrics),
  );
  const expansionDecision =
    focusCorridors.length > 0 && focusCorridors.every(corridor => corridor.stage === 'expand')
      ? 'expand'
      : focusCorridors.some(corridor => corridor.stage === 'prove')
        ? 'prove'
        : 'narrow';
  const leadCorridor = focusCorridors[0];

  return {
    regionCode,
    regionName: region.name,
    focusCorridors,
    expansionDecision,
    nextExperiment: {
      title: leadCorridor
        ? `Prove repeat rides on ${leadCorridor.corridor}`
        : 'Select the first corridor before launch',
      instruction:
        'Narrow the beta to the top three corridors, measure repeat rides for three consecutive weeks, then expand one corridor at a time.',
      metrics: [
        `${WEEKLY_RIDE_GOAL} weekly rides per corridor`,
        `${Math.round(REPEAT_RIDE_GOAL * 100)}% repeat ride rate`,
        `${Math.round(SUPPLY_RELIABILITY_GOAL * 100)}% supply reliability`,
      ],
    },
    updatedAt: new Date().toISOString(),
  };
}
