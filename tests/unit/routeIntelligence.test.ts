import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/utils/supabase/client.ts', () => ({
  supabase: null,
}));

describe('routeIntelligence.test.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('ranks trips for passenger with multiple results', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');

    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        availableSeats: 3,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'mixed' as const,
        driverRating: 4.5,
        driverTrustScore: 90,
        pricePerSeatJOD: 8,
        departureTime: '2026-08-10T08:00:00Z',
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
      {
        id: 't2',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        availableSeats: 1,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'mixed' as const,
        driverRating: 3.0,
        driverTrustScore: 70,
        pricePerSeatJOD: 20,
        departureTime: '2026-08-10T09:00:00Z',
        estimatedArrivalTime: '2026-08-10T13:00:00Z',
      },
    ];

    const request = {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO' as const,
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'mixed' as const,
      maxPriceJOD: 15,
      minDriverRating: 3.0,
    };

    const results = rankTripsForPassenger(trips, request);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].trip.id).toBe('t1');
    expect(results[0].score.overall).toBeGreaterThan(results[1].score.overall);
  });

  it('filters out trips with score <= 30', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');

    const trips = [
      {
        id: 't1',
        originCity: 'Irbid',
        destinationCity: 'Aqaba',
        availableSeats: 0,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'men_only' as const,
        driverRating: 2.0,
        driverTrustScore: 30,
        pricePerSeatJOD: 50,
        departureTime: '2026-08-10T08:00:00Z',
        estimatedArrivalTime: '2026-08-10T10:00:00Z',
      },
    ];

    const request = {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO' as const,
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'women_only' as const,
      maxPriceJOD: 10,
      minDriverRating: 4.0,
    };

    const results = rankTripsForPassenger(trips, request);
    expect(results).toHaveLength(0);
  });

  it('ranks trips for package with compatible results', async () => {
    const { rankTripsForPackage } = await import('@/utils/routeIntelligence');

    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        allowsPackages: true,
        maxPackageWeightKg: 30,
        genderPreference: 'mixed' as const,
        driverTrustScore: 80,
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
      {
        id: 't2',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        allowsPackages: false,
        maxPackageWeightKg: 30,
        genderPreference: 'mixed' as const,
        driverTrustScore: 80,
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
    ];

    const pkg = {
      id: 'p1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO' as const,
      weightKg: 5,
      neededBy: '2026-08-10T14:00:00Z',
      category: 'document',
      fragile: false,
      declaredValueJOD: 50,
    };

    const results = rankTripsForPackage(trips, pkg);
    expect(results).toHaveLength(1);
    expect(results[0].trip.id).toBe('t1');
    expect(results[0].result.compatible).toBe(true);
  });

  it('returns empty array for package with no compatible trips', async () => {
    const { rankTripsForPackage } = await import('@/utils/routeIntelligence');

    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Irbid',
        allowsPackages: true,
        maxPackageWeightKg: 30,
        genderPreference: 'mixed' as const,
        driverTrustScore: 80,
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
    ];

    const pkg = {
      id: 'p1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO' as const,
      weightKg: 5,
      neededBy: '2026-08-10T14:00:00Z',
      category: 'document',
      fragile: false,
      declaredValueJOD: 50,
    };

    const results = rankTripsForPackage(trips, pkg);
    expect(results).toHaveLength(0);
  });

  it('calculates prayer stops along a route', async () => {
    const { calculatePrayerStops } = await import('@/utils/routeIntelligence');

    const departure = '2026-08-10T04:00:00Z';
    const stops = calculatePrayerStops(departure, 240, 'JO');

    expect(stops.length).toBeGreaterThan(0);
    const names = stops.map(s => s.name);
    expect(names).toContain('Fajr');
  });

  it('returns no prayer stops for short duration', async () => {
    const { calculatePrayerStops } = await import('@/utils/routeIntelligence');

    const departure = '2026-08-10T10:00:00Z';
    const stops = calculatePrayerStops(departure, 30, 'JO');
    expect(stops).toHaveLength(0);
  });

  it('calculates liquidity health with numeric input', async () => {
    const { calculateLiquidityHealth } = await import('@/utils/routeIntelligence');

    const result = calculateLiquidityHealth(15, 100, 80);
    expect(typeof result).toBe('object');
    expect(result.healthScore).toBeGreaterThan(0);
  });

  it('calculates liquidity health with object input', async () => {
    const { calculateLiquidityHealth } = await import('@/utils/routeIntelligence');

    const result = calculateLiquidityHealth({
      activeTrips: 20,
      pendingRequests: 10,
      averageMatchTime: 5,
    });
    expect(typeof result).toBe('number');
    expect(result).toBeGreaterThan(0);
  });

  it('returns full metrics object for numeric input with totalSeats', async () => {
    const { calculateLiquidityHealth } = await import('@/utils/routeIntelligence');

    const result = calculateLiquidityHealth(15, 100, 80);
    expect(typeof result).toBe('object');
    expect(result.healthScore).toBeGreaterThan(0);
  });

  it('handles empty results in rankTripsForPassenger', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');
    const results = rankTripsForPassenger([], {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO',
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'mixed',
    });
    expect(results).toHaveLength(0);
  });

  it('handles single trip result', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');
    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        availableSeats: 3,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'mixed' as const,
        driverRating: 4.5,
        driverTrustScore: 90,
        pricePerSeatJOD: 8,
        departureTime: '2026-08-10T08:00:00Z',
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
    ];
    const results = rankTripsForPassenger(trips, {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO',
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'mixed',
    });
    expect(results).toHaveLength(1);
    expect(results[0].trip.id).toBe('t1');
  });

  it('scores trip with waypoints', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');
    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Irbid',
        availableSeats: 3,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'mixed' as const,
        driverRating: 4.5,
        driverTrustScore: 90,
        pricePerSeatJOD: 5,
        departureTime: '2026-08-10T08:00:00Z',
        estimatedArrivalTime: '2026-08-10T10:00:00Z',
        waypoints: ['Aqaba'],
      },
    ];
    const request = {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO',
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'mixed',
    };
    const results = rankTripsForPassenger(trips, request);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].score.routeEfficiency).toBeGreaterThanOrEqual(0);
  });

  it('scores trip for passengers with package carriage', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');
    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        availableSeats: 3,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'mixed' as const,
        driverRating: 4.5,
        driverTrustScore: 90,
        pricePerSeatJOD: 8,
        departureTime: '2026-08-10T08:00:00Z',
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
    ];
    const request = {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO',
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'mixed',
      requiresPackageCarriage: true,
      packageWeightKg: 5,
    };
    const results = rankTripsForPassenger(trips, request);
    expect(results).toHaveLength(1);
    expect(results[0].score.packageCompatibility).toBe(100);
  });

  it('scores trip without price budget', async () => {
    const { rankTripsForPassenger } = await import('@/utils/routeIntelligence');
    const trips = [
      {
        id: 't1',
        originCity: 'Amman',
        destinationCity: 'Aqaba',
        availableSeats: 3,
        totalSeats: 4,
        allowsPackages: true,
        maxPackageWeightKg: 20,
        genderPreference: 'mixed' as const,
        driverRating: 4.5,
        driverTrustScore: 90,
        pricePerSeatJOD: 100,
        departureTime: '2026-08-10T08:00:00Z',
        estimatedArrivalTime: '2026-08-10T12:00:00Z',
      },
    ];
    const request = {
      id: 'r1',
      originCity: 'Amman',
      destinationCity: 'Aqaba',
      country: 'JO',
      date: '2026-08-10',
      passengersCount: 1,
      genderPreference: 'mixed',
    };
    const results = rankTripsForPassenger(trips, request);
    expect(results).toHaveLength(1);
  });
});
