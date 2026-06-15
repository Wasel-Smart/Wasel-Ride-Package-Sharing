import { describe, expect, it } from 'vitest';
import type {
  CorridorProjection,
  MobilityEventEnvelope,
  MobilitySystemSnapshot,
} from '../../../src/features/mobility-os/model';
import {
  applyMobilityEventToSnapshot,
  buildMobilityMetrics,
  buildMobilitySnapshot,
  normalizeMobilityOutboxRow,
} from '../../../src/features/mobility-os/snapshot';
import { buildSeedCorridors, PricingEngine } from '../../../src/features/mobility-os/runtime';

function buildSnapshotFixture(): MobilitySystemSnapshot {
  const pricing = new PricingEngine();
  const corridors = buildSeedCorridors()
    .slice(0, 2)
    .map((corridor) => pricing.project(corridor));

  return buildMobilitySnapshot({
    corridors,
    updatedAt: '2026-05-03T00:00:00.000Z',
  });
}

describe('Mobility OS snapshot helpers', () => {
  it('computes revenue run rate from booked inventory only', () => {
    const pricing = new PricingEngine();
    const corridor = buildSeedCorridors()[0]!;
    const projection = pricing.project({
      ...corridor,
      seats_booked: 0,
      cargo_booked_kg: 0,
    });

    const metrics = buildMobilityMetrics([projection]);

    expect(metrics.seat_revenue_run_rate).toBe(0);
    expect(metrics.cargo_revenue_run_rate).toBe(0);
  });

  it('projects CorridorUpdated events directly into the snapshot', () => {
    const snapshot = buildSnapshotFixture();
    const nextProjection: CorridorProjection = {
      ...snapshot.corridors[1]!,
      seats_available: 30,
      utilization: 0.22,
      demand_pressure: 1.92,
      dynamic_seat_price: 14.2,
      dynamic_cargo_price: 1.1,
      seat_price_direction: 'up',
      cargo_price_direction: 'up',
      corridor: {
        ...snapshot.corridors[1]!.corridor,
        seats_booked: snapshot.corridors[1]!.corridor.seats_total - 30,
        updated_at: '2026-05-03T09:00:00.000Z',
      },
    };

    const event: MobilityEventEnvelope<'CorridorUpdated'> = {
      id: 'evt-corridor-updated',
      type: 'CorridorUpdated',
      occurred_at: '2026-05-03T09:00:00.000Z',
      trace_id: 'trace-corridor-updated',
      producer: 'RealtimeGateway',
      payload: {
        corridor_id: nextProjection.corridor.id,
        projection: nextProjection,
        updated_at: '2026-05-03T09:00:00.000Z',
      },
    };

    const projected = applyMobilityEventToSnapshot(snapshot, event);

    expect(projected.corridors[0]!.corridor.id).toBe(nextProjection.corridor.id);
    expect(projected.corridors[0]!.dynamic_seat_price).toBe(14.2);
    expect('recent_events' in projected).toBe(false);
    expect(projected.updated_at).toBe('2026-05-03T09:00:00.000Z');
  });

  it('normalizes realtime outbox rows into UI event envelopes', () => {
    const row = {
      id: 'evt-outbox-1',
      aggregate_type: 'corridor',
      aggregate_id: 'amman-irbid',
      event_type: 'PriceRecalculated',
      trace_id: 'trace-outbox-1',
      occurred_at: '2026-05-03T09:00:00.000Z',
      payload: {
        corridor_id: 'amman-irbid',
        dynamic_seat_price: 9.25,
        dynamic_cargo_price: 0.88,
        utilization: 0.61,
        demand_pressure: 1.44,
        updated_at: '2026-05-03T09:00:00.000Z',
      },
    };

    const event = normalizeMobilityOutboxRow(row);

    expect(event?.type).toBe('PriceRecalculated');
    expect(event?.producer).toBe('PricingEngine');
    expect(event?.trace_id).toBe('trace-outbox-1');
  });
});
