import { describe, expect, it } from 'vitest';
import type { LiveCorridorSignal } from '../../src/services/routeDemandIntelligence';
import {
  buildMobilityPipeline,
  type MobilityDemandRecord,
  type MobilityVehicleRecord,
} from '../../src/services/mobilityPipeline';

function node(label: string, lat: number, lng: number) {
  return { label, lat, lng };
}

function signal(overrides: Partial<LiveCorridorSignal> = {}) {
  return {
    id: 'amman-irbid',
    from: 'Amman',
    to: 'Irbid',
    label: 'Amman -> Irbid',
    liveDemandScore: 82,
    forecastDemandScore: 86,
    activeSupply: 1,
    activeDemandAlerts: 2,
    liveSearches: 8,
    liveBookings: 3,
    livePackages: 1,
    seatUtilizationPercent: 64,
    pricePressure: 'balanced',
    nextWaveWindow: '07:00 - 09:00',
    recommendedPickupPoint: 'Abdali gate',
    routeOwnershipScore: 79,
    recommendedReason: 'Best corridor for the next wave.',
    freshestSignalAt: '2026-04-22T06:00:00.000Z',
    productionSources: ['8 live searches'],
    priceQuote: {} as LiveCorridorSignal['priceQuote'],
    ...overrides,
  } satisfies LiveCorridorSignal;
}

describe('mobilityPipeline', () => {
  it('prefers the exact corridor vehicle during matching', () => {
    const demand: MobilityDemandRecord[] = [
      {
        id: 'd1',
        kind: 'passenger',
        service: 'ride',
        source: 'modeled-signal',
        status: 'pending',
        from: node('Amman', 31.9539, 35.9106),
        to: node('Irbid', 32.5568, 35.8479),
        units: 1,
        createdAt: '2026-04-22T06:00:00.000Z',
        corridorId: 'amman-irbid',
        forecastDemandScore: 88,
        pricePressure: 'balanced',
        note: 'Passenger wave',
      },
    ];

    const vehicles: MobilityVehicleRecord[] = [
      {
        id: 'v-exact',
        source: 'live-ride',
        state: 'idle',
        from: node('Amman', 31.9539, 35.9106),
        to: node('Irbid', 32.5568, 35.8479),
        position: node('Amman', 31.9539, 35.9106),
        corridorId: 'amman-irbid',
        passengerCapacity: 3,
        availablePassengerSeats: 3,
        packageCapacityUnits: 1,
        availablePackageUnits: 1,
        utilizationPercent: 18,
        note: 'Exact fit',
      },
      {
        id: 'v-off-route',
        source: 'live-ride',
        state: 'idle',
        from: node('Amman', 31.9539, 35.9106),
        to: node('Aqaba', 29.5321, 35.0060),
        position: node('Amman', 31.9539, 35.9106),
        corridorId: 'amman-aqaba',
        passengerCapacity: 4,
        availablePassengerSeats: 4,
        packageCapacityUnits: 2,
        availablePackageUnits: 2,
        utilizationPercent: 12,
        note: 'Wrong corridor',
      },
    ];

    const snapshot = buildMobilityPipeline({
      demand,
      vehicles,
      corridorSignals: [
        signal(),
        signal({
          id: 'amman-aqaba',
          to: 'Aqaba',
          label: 'Amman -> Aqaba',
          forecastDemandScore: 74,
        }),
      ],
    });

    expect(snapshot.matches).toHaveLength(1);
    expect(snapshot.matches[0]?.vehicleId).toBe('v-exact');

    const exactScore = snapshot.scoredCandidates.find((candidate) => candidate.vehicleId === 'v-exact');
    const offRouteScore = snapshot.scoredCandidates.find((candidate) => candidate.vehicleId === 'v-off-route');

    expect(exactScore?.score ?? 0).toBeGreaterThan(offRouteScore?.score ?? 0);
  });

  it('creates rebalancing actions toward unmatched hot corridors', () => {
    const demand: MobilityDemandRecord[] = [
      {
        id: 'd-hot',
        kind: 'package',
        service: 'package',
        source: 'modeled-signal',
        status: 'pending',
        from: node('Amman', 31.9539, 35.9106),
        to: node('Zarqa', 32.0728, 36.0880),
        units: 2,
        createdAt: '2026-04-22T06:00:00.000Z',
        corridorId: 'amman-zarqa',
        forecastDemandScore: 94,
        pricePressure: 'surging',
        note: 'Hot package wave',
      },
    ];

    const vehicles: MobilityVehicleRecord[] = [
      {
        id: 'v-idle',
        source: 'live-ride',
        state: 'idle',
        from: node('Aqaba', 29.5321, 35.0060),
        to: node('Amman', 31.9539, 35.9106),
        position: node('Amman', 31.9539, 35.9106),
        corridorId: 'aqaba-amman',
        passengerCapacity: 3,
        availablePassengerSeats: 3,
        packageCapacityUnits: 0,
        availablePackageUnits: 0,
        utilizationPercent: 10,
        note: 'Idle and empty',
      },
    ];

    const snapshot = buildMobilityPipeline({
      demand,
      vehicles,
      corridorSignals: [
        signal({
          id: 'amman-zarqa',
          to: 'Zarqa',
          label: 'Amman -> Zarqa',
          forecastDemandScore: 96,
          pricePressure: 'surging',
          activeSupply: 0,
          activeDemandAlerts: 4,
        }),
      ],
    });

    expect(snapshot.matches).toHaveLength(0);
    expect(snapshot.rebalancing).toHaveLength(1);
    expect(snapshot.rebalancing[0]?.corridorId).toBe('amman-zarqa');
    expect(snapshot.stages.find((stage) => stage.id === 'rebalancing')?.count).toBe(1);
  });
});
