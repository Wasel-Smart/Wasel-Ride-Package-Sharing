export type Corridor = {
  id: string;

  origin: string;
  destination: string;

  distance_km: number;
  travel_time_min: number;

  seats_total: number;
  seats_booked: number;

  cargo_total_kg: number;
  cargo_booked_kg: number;

  base_price_seat: number;
  base_price_kg: number;

  demand_index: number;

  demand_history: number[];
  price_history: number[];

  updated_at: string;
};

export type BookingType = 'seat' | 'cargo';
export type PriceDirection = 'up' | 'down' | 'flat';

export type BookingRequest = {
  corridor_id: string;
  type: BookingType;
  quantity: number;
  timestamp: string;
};

export type MobilityEventType =
  | 'BookingCreated'
  | 'CapacityUpdated'
  | 'DemandUpdated'
  | 'PriceRecalculated'
  | 'CorridorUpdated';

export interface CorridorProjection {
  corridor: Corridor;
  seats_available: number;
  cargo_available_kg: number;
  utilization: number;
  demand_pressure: number;
  dynamic_seat_price: number;
  dynamic_cargo_price: number;
  seat_price_direction: PriceDirection;
  cargo_price_direction: PriceDirection;
}

export interface MobilityEventPayloadMap {
  BookingCreated: {
    booking_id: string;
    corridor_id: string;
    type: BookingType;
    quantity: number;
    timestamp: string;
  };
  CapacityUpdated: {
    corridor_id: string;
    type: BookingType;
    quantity: number;
    corridor: Corridor;
    updated_at: string;
  };
  DemandUpdated: {
    corridor_id: string;
    previous_demand_index: number;
    demand_index: number;
    signal_weight: number;
    corridor: Corridor;
    updated_at: string;
  };
  PriceRecalculated: {
    corridor_id: string;
    dynamic_seat_price: number;
    dynamic_cargo_price: number;
    utilization: number;
    demand_pressure: number;
    updated_at: string;
  };
  CorridorUpdated: {
    corridor_id: string;
    projection: CorridorProjection;
    updated_at: string;
  };
}

export type MobilityEventEnvelope<TType extends MobilityEventType = MobilityEventType> =
  TType extends MobilityEventType
    ? {
        id: string;
        type: TType;
        occurred_at: string;
        trace_id: string;
        producer: string;
        payload: MobilityEventPayloadMap[TType];
      }
    : never;

export interface MobilitySystemMetrics {
  total_seats_available: number;
  total_cargo_available_kg: number;
  average_utilization: number;
  hottest_corridor: string;
  seat_revenue_run_rate: number;
  cargo_revenue_run_rate: number;
  event_latency_target_ms: number;
}

export interface MobilityNarrative {
  platform_statement: string;
  business_model: string[];
}

export interface MobilitySystemSnapshot {
  corridors: CorridorProjection[];
  metrics: MobilitySystemMetrics;
  updated_at: string;
}

export interface MobilityInternalSystemSnapshot extends MobilitySystemSnapshot {
  recent_events: MobilityEventEnvelope[];
  narrative: MobilityNarrative;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundTo(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function trimHistory(values: number[], limit = 12): number[] {
  return values.slice(Math.max(values.length - limit, 0));
}

export function cloneCorridor(corridor: Corridor): Corridor {
  return {
    ...corridor,
    demand_history: [...corridor.demand_history],
    price_history: [...corridor.price_history],
  };
}

export function getPriceDirection(
  current: number,
  previous: number | null | undefined,
): PriceDirection {
  if (previous === null || previous === undefined || Number.isNaN(previous)) return 'flat';
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'flat';
}
