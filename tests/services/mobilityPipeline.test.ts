import { describe, expect, it } from 'vitest';
import {
  buildMobilityPipeline,
  scoreVehicleForDemand,
  selectBestMatches,
  type MobilityDemandRecord,
  type MobilityVehicleRecord,
} from '../../src/services/mobilityPipeline';
import { getMovementPriceQuote } from '../../src/services/movementPricing';
import type { LiveCorridorSignal } from '../../src/services/routeDemandIntelligence';

function buildNode(label: string, lat: number, lng: number) {
  return { label, lat, lng };
}

function buildDemand(
  overrides: Partial<MobilityDemandRecord> & Pick<MobilityDemandRecord, 'id' | 'from' | 'to'>,
): MobilityDemandRecord {
  return {
    id: overrides.id,
    kind: 'passenger',
    service: 'ride',
    source: 'demand-alert',
    status: 'pending',
    from: overrides.from,
    to: overrides.to,
    units: 1,
    createdAt: '2026-04-22T08:00:00.000Z',
    corridorId: 'amman-aqaba',
    forecastDemandScore: 88,
    pricePressure: 'balanced',
    note: 'Test demand',
    ...overrides,
  };
}

function buildVehicle(
  overrides: Partial<MobilityVehicleRecord> & Pick<MobilityVehicleRecord, 'id' | 'from' | 'to' | 'position'>,
): MobilityVehicleRecord {
  return {
    id: overrides.id,
    source: 'live-ride',
    state: 'idle',
    from: overrides.from,
    to: overrides.to,
    position: overrides.position,
    corridorId: 'amman-aqaba',
    passengerCapacity: 3,
    availablePassengerSeats: 3,
    packageCapacityUnits: 1,
    availablePackageUnits: 1,
    utilizationPercent: 20,
    note: 'Test vehicle',
    ...overrides,
  };
}

function buildSignal(
  overrides: Partial<LiveCorridorSignal> & Pick<LiveCorridorSignal, 'id' | 'from' | 'to'>,
): LiveCorridorSignal {
  const forecastDemandScore = overrides.forecastDemandScore ?? 86;
  const pricePressure = overrides.pricePressure ?? 'balanced';

  return {
    id: overrides.id,
    from: overrides.from,
    to: overrides.to,
    label: `${overrides.from} -> ${overrides.to}`,
    liveDemandScore: overrides.liveDemandScore ?? forecastDemandScore,
    forecastDemandScore,
    activeSupply: overrides.activeSupply ?? 1,
    activeDemandAlerts: overrides.activeDemandAlerts ?? 2,
    liveSearches: overrides.liveSearches ?? 12,
    liveBookings: overrides.liveBookings ?? 3,
    livePackages: overrides.livePackages ?? 1,
    seatUtilizationPercent: overrides.seatUtilizationPercent ?? 72,
    pricePressure,
    nextWaveWindow: overrides.nextWaveWindow ?? '07:00 - 09:00',
    recommendedPickupPoint: overrides.recommendedPickupPoint ?? `${overrides.from} Central`,
    routeOwnershipScore: overrides.routeOwnershipScore ?? 82,
    recommendedReason: overrides.recommendedReason ?? 'Test signal',
    freshestSignalAt: overrides.freshestSignalAt ?? '2026-04-22T08:00:00.000Z',
    productionSources: overrides.productionSources ?? ['test'],
    priceQuote:
      overrides.priceQuote ??
      getMovementPriceQuote({
        basePriceJod: 4.2,
        corridorId: overrides.id,
        forecastDemandScore,
        pricePressure,
      }),
  };
}

const amman = buildNode('Amman', 31.9454, 35.9284);
const aqaba = buildNode('Aqaba', 29.532, 35.0063);
const irbid = buildNode('Irbid', 32.5556, 35.85);
const zarqa = buildNode('Zarqa', 32.0728, 36.088);
const STAGE_IDS = [
  'demand',
  'candidate-vehicles',
  'scoring',
  'matching',
  'assignment',
  'rebalancing',
];

describe('mobilityPipeline', () => {
  it('builds the six-stage operating model with thresholds and drilldowns', () => {
    const demand = [
      buildDemand({
        id: 'd-1',
        from: amman,
        to: aqaba,
        corridorId: 'amman-aqaba',
        forecastDemandScore: 91,
        pricePressure: 'surging',
      }),
    ];
    const vehicles = [
      buildVehicle({
        id: 'v-1',
        from: amman,
        to: aqaba,
        position: amman,
        corridorId: 'amman-aqaba',
        availablePassengerSeats: 2,
        availablePackageUnits: 0,
      }),
    ];
    const corridorSignals = [
      buildSignal({
        id: 'amman-aqaba',
        from: 'Amman',
        to: 'Aqaba',
        forecastDemandScore: 91,
        pricePressure: 'surging',
      }),
    ];

    const snapshot = buildMobilityPipeline({
      updatedAt: '2026-04-22T08:00:00.000Z',
      demand,
      vehicles,
      corridorSignals,
    });

    expect(snapshot.thresholds).toEqual({
      viableCandidateScore: 40,
      dispatchMatchScore: 52,
    });
    expect(snapshot.stages.map((stage) => stage.id)).toEqual(STAGE_IDS);
    expect(snapshot.stageDrilldowns.map((stage) => stage.id)).toEqual(STAGE_IDS);
    expect(snapshot.matches).toHaveLength(1);
    expect(snapshot.assignments).toHaveLength(1);
    expect(snapshot.stageDrilldowns.find((stage) => stage.id === 'matching')?.items[0]?.metric).toBe(
      `${snapshot.matches[0]?.score}`,
    );
    expect(snapshot.stageDrilldowns.find((stage) => stage.id === 'assignment')?.items[0]?.metric).toBe(
      'PLANNED',
    );
  });

  it('does not over-assign a vehicle beyond its available passenger seats', () => {
    const signal = buildSignal({
      id: 'amman-aqaba',
      from: 'Amman',
      to: 'Aqaba',
      forecastDemandScore: 84,
    });
    const vehicle = buildVehicle({
      id: 'v-seat-limited',
      from: amman,
      to: aqaba,
      position: amman,
      corridorId: 'amman-aqaba',
      availablePassengerSeats: 1,
      availablePackageUnits: 0,
    });
    const demand = [
      buildDemand({ id: 'd-seat-1', from: amman, to: aqaba, corridorId: 'amman-aqaba' }),
      buildDemand({
        id: 'd-seat-2',
        from: amman,
        to: aqaba,
        corridorId: 'amman-aqaba',
        createdAt: '2026-04-22T08:05:00.000Z',
      }),
    ];
    const scoredCandidates = demand.map((item) =>
      scoreVehicleForDemand(item, vehicle, signal),
    );

    const matches = selectBestMatches(demand, [vehicle], scoredCandidates);

    expect(matches).toHaveLength(1);
    expect(matches[0]?.vehicleId).toBe('v-seat-limited');
  });

  it('creates a rebalance move when demand is stranded on a hot corridor', () => {
    const demand = [
      buildDemand({
        id: 'd-package-hot',
        kind: 'package',
        service: 'package',
        from: irbid,
        to: zarqa,
        corridorId: 'irbid-zarqa',
        units: 2,
        forecastDemandScore: 94,
        pricePressure: 'surging',
      }),
    ];
    const vehicles = [
      buildVehicle({
        id: 'v-standby',
        from: amman,
        to: aqaba,
        position: amman,
        corridorId: 'amman-aqaba',
        availablePassengerSeats: 2,
        availablePackageUnits: 0,
      }),
    ];
    const corridorSignals = [
      buildSignal({
        id: 'irbid-zarqa',
        from: 'Irbid',
        to: 'Zarqa',
        forecastDemandScore: 94,
        pricePressure: 'surging',
        activeSupply: 0,
      }),
    ];

    const snapshot = buildMobilityPipeline({
      updatedAt: '2026-04-22T08:00:00.000Z',
      demand,
      vehicles,
      corridorSignals,
    });

    expect(snapshot.matches).toHaveLength(0);
    expect(snapshot.rebalancing).toHaveLength(1);
    expect(snapshot.rebalancing[0]?.corridorId).toBe('irbid-zarqa');
    expect(snapshot.stageDrilldowns.find((stage) => stage.id === 'rebalancing')?.items[0]?.title).toBe(
      'Irbid -> Zarqa',
    );
  });
});
