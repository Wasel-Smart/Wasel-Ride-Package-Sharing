import type { RideBookingStatus } from './rideLifecycle';

export type CorridorBetaStage = 'narrow' | 'prove' | 'expand';

export interface CorridorBetaRideBookingSource {
  id: string;
  from: string;
  to: string;
  passengerName?: string;
  ownerId?: string;
  status: RideBookingStatus;
  updatedAt: string;
}

export interface CorridorBetaMetricRecord {
  id: string;
  corridorId: string;
  corridor: string;
  from: string;
  to: string;
  weekStart: string;
  weeklyRides: number;
  uniqueRiders: number;
  repeatRiders: number;
  repeatRideRate: number;
  supplyReliability: number;
  completedRides: number;
  cancelledRides: number;
  proofScore: number;
  stage: CorridorBetaStage;
  weeksAtTarget: number;
  updatedAt: string;
}

export interface CorridorBetaMetricSnapshot {
  updatedAt: string;
  records: CorridorBetaMetricRecord[];
}

export interface CorridorBetaMetricCorridor extends CorridorBetaMetricRecord {
  weeklyRideGoal: number;
  repeatRideGoal: number;
  supplyReliabilityGoal: number;
}

const CORRIDOR_BETA_METRICS_KEY = 'wasel-corridor-beta-metrics';
const WEEKLY_RIDE_GOAL = 120;
const REPEAT_RIDE_GOAL = 0.34;
const SUPPLY_RELIABILITY_GOAL = 0.72;
const WEEKS_AT_TARGET_GOAL = 3;

function normalizeCity(value: string) {
  return value.trim().toLowerCase();
}

function normalizeRider(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === 'passenger') return undefined;
  return normalized;
}

function startOfWeek(referenceDate = Date.now()) {
  const date = new Date(referenceDate);
  const day = date.getDay();
  const mondayOffset = (day + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

function corridorKey(from: string, to: string) {
  return `${normalizeCity(from)}|${normalizeCity(to)}`;
}

function readMetrics(): CorridorBetaMetricRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(CORRIDOR_BETA_METRICS_KEY);
    const parsed = raw ? (JSON.parse(raw) as CorridorBetaMetricRecord[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMetrics(records: CorridorBetaMetricRecord[]): void {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(CORRIDOR_BETA_METRICS_KEY, JSON.stringify(records));
}

function calculateProofScore(record: CorridorBetaMetricRecord) {
  const weeklyScore = Math.min(25, (record.weeklyRides / WEEKLY_RIDE_GOAL) * 25);
  const repeatScore = Math.min(30, (record.repeatRideRate / REPEAT_RIDE_GOAL) * 30);
  const supplyScore = record.supplyReliability * 20;
  const consistencyScore = Math.min(15, (record.weeksAtTarget / WEEKS_AT_TARGET_GOAL) * 15);
  const baseDemandScore = Math.min(10, (record.completedRides / Math.max(1, WEEKLY_RIDE_GOAL)) * 10);

  return Math.round(Math.min(100, weeklyScore + repeatScore + supplyScore + consistencyScore + baseDemandScore));
}

function evaluateStage(record: CorridorBetaMetricRecord): CorridorBetaStage {
  if (
    record.weeklyRides >= WEEKLY_RIDE_GOAL &&
    record.repeatRideRate >= REPEAT_RIDE_GOAL &&
    record.supplyReliability >= SUPPLY_RELIABILITY_GOAL &&
    record.weeksAtTarget >= WEEKS_AT_TARGET_GOAL
  ) {
    return 'expand';
  }

  if (
    record.weeklyRides >= WEEKLY_RIDE_GOAL &&
    record.repeatRideRate >= REPEAT_RIDE_GOAL &&
    record.supplyReliability >= SUPPLY_RELIABILITY_GOAL
  ) {
    return 'prove';
  }

  return 'narrow';
}

function countWeeksAtTarget(
  records: CorridorBetaMetricRecord[],
  corridorId: string,
  current: CorridorBetaMetricRecord,
) {
  const currentMeets =
    current.weeklyRides >= WEEKLY_RIDE_GOAL &&
    current.repeatRideRate >= REPEAT_RIDE_GOAL &&
    current.supplyReliability >= SUPPLY_RELIABILITY_GOAL;
  let weeks = currentMeets ? 1 : 0;

  for (const previous of records
    .filter(record => record.corridorId === corridorId && record.weekStart !== current.weekStart)
    .sort((left, right) => right.weekStart.localeCompare(left.weekStart))) {
    if (
      previous.weeklyRides >= WEEKLY_RIDE_GOAL &&
      previous.repeatRideRate >= REPEAT_RIDE_GOAL &&
      previous.supplyReliability >= SUPPLY_RELIABILITY_GOAL
    ) {
      weeks += 1;
      continue;
    }
    break;
  }

  return Math.min(WEEKS_AT_TARGET_GOAL, weeks);
}

function buildRecord(
  corridorId: string,
  from: string,
  to: string,
  weekStart: string,
  completedBookings: CorridorBetaRideBookingSource[],
  cancelledBookings: CorridorBetaRideBookingSource[],
  existingRecords: CorridorBetaMetricRecord[],
): CorridorBetaMetricRecord {
  const riderCounts = new Map<string, number>();
  for (const booking of completedBookings) {
    const rider = normalizeRider(booking.passengerName ?? booking.ownerId ?? booking.id);
    if (!rider) continue;
    riderCounts.set(rider, (riderCounts.get(rider) ?? 0) + 1);
  }

  const uniqueRiders = riderCounts.size;
  const repeatRiders = Array.from(riderCounts.values()).filter(count => count > 1).length;
  const repeatRideRate = uniqueRiders > 0 ? repeatRiders / uniqueRiders : 0;
  const completedRides = completedBookings.length;
  const cancelledRides = cancelledBookings.length;
  const supplyReliability =
    completedRides + cancelledRides > 0 ? completedRides / (completedRides + cancelledRides) : 0;
  const partial: CorridorBetaMetricRecord = {
    id: `beta-${corridorId}-${weekStart}`,
    corridorId,
    corridor: `${from} to ${to}`,
    from,
    to,
    weekStart,
    weeklyRides: completedRides,
    uniqueRiders,
    repeatRiders,
    repeatRideRate: Number(repeatRideRate.toFixed(2)),
    supplyReliability: Number(supplyReliability.toFixed(2)),
    completedRides,
    cancelledRides,
    proofScore: 0,
    stage: 'narrow',
    weeksAtTarget: 0,
    updatedAt: new Date().toISOString(),
  };
  const weeksAtTarget = countWeeksAtTarget(existingRecords, corridorId, partial);
  const proofScore = calculateProofScore({ ...partial, weeksAtTarget });
  const stage = evaluateStage({ ...partial, weeksAtTarget, proofScore });

  return {
    ...partial,
    weeksAtTarget,
    proofScore,
    stage,
  };
}

export function getCorridorBetaMetricSnapshot(): CorridorBetaMetricSnapshot {
  return {
    updatedAt: new Date().toISOString(),
    records: readMetrics().sort((left, right) => right.weekStart.localeCompare(left.weekStart)),
  };
}

export function recordCorridorBetaMetricsFromBookings(
  bookings: CorridorBetaRideBookingSource[],
): CorridorBetaMetricSnapshot {
  const existingRecords = readMetrics();
  const completed = bookings.filter(booking => booking.status === 'completed');
  const cancelled = bookings.filter(booking => booking.status === 'cancelled');
  const grouped = new Map<
    string,
    {
      key: string;
      corridorId: string;
      from: string;
      to: string;
      weekStart: string;
      completed: CorridorBetaRideBookingSource[];
      cancelled: CorridorBetaRideBookingSource[];
    }
  >();

  for (const booking of [...completed, ...cancelled]) {
    const key = `${corridorKey(booking.from, booking.to)}:${startOfWeek(new Date(booking.updatedAt).getTime())}`;
    const existing = grouped.get(key);
    if (existing) {
      if (booking.status === 'completed') existing.completed.push(booking);
      if (booking.status === 'cancelled') existing.cancelled.push(booking);
      continue;
    }

    grouped.set(key, {
      key,
      corridorId: corridorKey(booking.from, booking.to),
      from: booking.from,
      to: booking.to,
      weekStart: startOfWeek(new Date(booking.updatedAt).getTime()),
      completed: booking.status === 'completed' ? [booking] : [],
      cancelled: booking.status === 'cancelled' ? [booking] : [],
    });
  }

  const recordsByKey = new Map(existingRecords.map(record => [record.id, record]));
  for (const group of grouped.values()) {
    const record = buildRecord(
      group.corridorId,
      group.from,
      group.to,
      group.weekStart,
      group.completed,
      group.cancelled,
      Array.from(recordsByKey.values()),
    );
    recordsByKey.set(record.id, record);
  }

  const records = Array.from(recordsByKey.values()).sort(
    (left, right) => right.weekStart.localeCompare(left.weekStart),
  );
  writeMetrics(records);

  return {
    updatedAt: new Date().toISOString(),
    records,
  };
}

export function getCorridorBetaMetricCorridors(): CorridorBetaMetricCorridor[] {
  return getCorridorBetaMetricSnapshot().records.map(record => ({
    ...record,
    weeklyRideGoal: WEEKLY_RIDE_GOAL,
    repeatRideGoal: REPEAT_RIDE_GOAL,
    supplyReliabilityGoal: SUPPLY_RELIABILITY_GOAL,
  }));
}
