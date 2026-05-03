import {
  cloneCorridor,
  roundTo,
  type CorridorProjection,
  type MobilityEventEnvelope,
  type MobilityEventPayloadMap,
  type MobilityEventType,
  type MobilitySystemSnapshot,
} from './model';

export type MobilityOutboxRow = {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  trace_id: string;
  payload: unknown;
  occurred_at: string;
  published_at?: string | null;
};

const EVENT_PRODUCER_BY_TYPE: Record<MobilityEventType, string> = {
  BookingCreated: 'BookingService',
  CapacityUpdated: 'CorridorService',
  DemandUpdated: 'DemandEngine',
  PriceRecalculated: 'PricingEngine',
  CorridorUpdated: 'RealtimeGateway',
};

export const MOBILITY_OS_NARRATIVE: MobilitySystemSnapshot['narrative'] = {
  platform_statement:
    'Mobility OS is a capacity exchange where corridors are market instruments and every screen is a projection of backend state.',
  business_model: [
    'Monetize both seats and kilos on the same corridor instead of running separate ride and parcel products.',
    'Use demand-indexed pricing to capture upside when utilization compresses available capacity.',
    'Compound the moat with recurring enterprise volume, corridor histories, and realtime control of supply allocation.',
  ],
};

function isMobilityEventType(value: string): value is MobilityEventType {
  return (
    value === 'BookingCreated' ||
    value === 'CapacityUpdated' ||
    value === 'DemandUpdated' ||
    value === 'PriceRecalculated' ||
    value === 'CorridorUpdated'
  );
}

export function cloneProjection(projection: CorridorProjection): CorridorProjection {
  return {
    ...projection,
    corridor: cloneCorridor(projection.corridor),
  };
}

export function sortCorridorProjections(corridors: CorridorProjection[]): CorridorProjection[] {
  return [...corridors].sort((left, right) => right.demand_pressure - left.demand_pressure);
}

export function buildMobilityMetrics(
  corridors: CorridorProjection[],
): MobilitySystemSnapshot['metrics'] {
  const ranked = sortCorridorProjections(corridors);
  const hottest = ranked[0];

  return {
    total_seats_available: ranked.reduce((sum, item) => sum + item.seats_available, 0),
    total_cargo_available_kg: ranked.reduce((sum, item) => sum + item.cargo_available_kg, 0),
    average_utilization:
      ranked.reduce((sum, item) => sum + item.utilization, 0) / Math.max(ranked.length, 1),
    hottest_corridor: hottest
      ? `${hottest.corridor.origin} -> ${hottest.corridor.destination}`
      : '',
    seat_revenue_run_rate: roundTo(
      ranked.reduce(
        (sum, item) => sum + item.dynamic_seat_price * item.corridor.seats_booked,
        0,
      ),
      2,
    ),
    cargo_revenue_run_rate: roundTo(
      ranked.reduce(
        (sum, item) => sum + item.dynamic_cargo_price * item.corridor.cargo_booked_kg,
        0,
      ),
      2,
    ),
    event_latency_target_ms: 200,
  };
}

export function buildMobilitySnapshot(input: {
  corridors: CorridorProjection[];
  recentEvents: MobilityEventEnvelope[];
  updatedAt?: string;
  narrative?: MobilitySystemSnapshot['narrative'];
}): MobilitySystemSnapshot {
  const corridors = sortCorridorProjections(input.corridors).map(cloneProjection);

  return {
    corridors,
    metrics: buildMobilityMetrics(corridors),
    recent_events: [...input.recentEvents],
    narrative: input.narrative ?? MOBILITY_OS_NARRATIVE,
    updated_at: input.updatedAt ?? new Date().toISOString(),
  };
}

function isProjectionPayload(
  payload: unknown,
): payload is MobilityEventPayloadMap['CorridorUpdated'] {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const data = payload as Record<string, unknown>;
  return (
    typeof data.corridor_id === 'string' &&
    typeof data.updated_at === 'string' &&
    typeof data.projection === 'object' &&
    data.projection !== null
  );
}

export function normalizeMobilityOutboxRow(
  row: MobilityOutboxRow,
): MobilityEventEnvelope | null {
  if (!isMobilityEventType(row.event_type) || !row.payload || typeof row.payload !== 'object') {
    return null;
  }

  if (row.event_type === 'CorridorUpdated' && !isProjectionPayload(row.payload)) {
    return null;
  }

  return {
    id: row.id,
    type: row.event_type,
    occurred_at: row.occurred_at,
    trace_id: row.trace_id,
    producer: EVENT_PRODUCER_BY_TYPE[row.event_type],
    payload: row.payload as MobilityEventPayloadMap[typeof row.event_type],
  };
}

export function applyMobilityEventToSnapshot(
  snapshot: MobilitySystemSnapshot,
  event: MobilityEventEnvelope,
): MobilitySystemSnapshot {
  const recentEvents = [
    event,
    ...snapshot.recent_events.filter((current) => current.id !== event.id),
  ].slice(0, 60);

  if (event.type !== 'CorridorUpdated') {
    return {
      ...snapshot,
      recent_events: recentEvents,
      updated_at: event.occurred_at,
    };
  }

  const corridorEvent = event as MobilityEventEnvelope<'CorridorUpdated'>;
  const incomingProjection = cloneProjection(corridorEvent.payload.projection);
  const corridors = sortCorridorProjections([
    incomingProjection,
    ...snapshot.corridors.filter(
      (current) => current.corridor.id !== incomingProjection.corridor.id,
    ),
  ]);

  return {
    ...snapshot,
    corridors,
    metrics: buildMobilityMetrics(corridors),
    recent_events: recentEvents,
    updated_at: corridorEvent.payload.updated_at,
  };
}
