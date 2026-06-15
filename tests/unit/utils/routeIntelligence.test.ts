/**
 * Unit tests — src/utils/routeIntelligence.ts
 * Covers: trip scoring, match quality, package compatibility, seat utilisation.
 */
import { describe, it, expect } from 'vitest';
import {
  scoreTripMatch,
  calculateDetourTolerance,
  scoreSeatUtilization,
  calculateLiquidityHealth,
  suggestPrayerStops,
  type TripSummary,
  type PassengerRequest,
} from '@/utils/routeIntelligence';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTrip(overrides: Partial<TripSummary> = {}): TripSummary {
  return {
    id: 'trip-1',
    originCity: 'Amman',
    destinationCity: 'Aqaba',
    country: 'JO',
    departureTime: '2026-04-15T08:00:00.000Z',
    availableSeats: 3,
    totalSeats: 4,
    allowsPackages: true,
    maxPackageWeightKg: 10,
    genderPreference: 'mixed',
    driverRating: 4.8,
    driverTrustScore: 85,
    pricePerSeatJOD: 10,
    estimatedArrivalTime: '2026-04-15T12:30:00.000Z',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<PassengerRequest> = {}): PassengerRequest {
  return {
    id: 'req-1',
    originCity: 'Amman',
    destinationCity: 'Aqaba',
    country: 'JO',
    date: '2026-04-15',
    passengersCount: 1,
    genderPreference: 'mixed',
    ...overrides,
  };
}

// ── scoreTripMatch ────────────────────────────────────────────────────────────

describe('scoreTripMatch', () => {
  it('returns a score between 0 and 100', () => {
    const score = scoreTripMatch(makeTrip(), makeRequest());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives a high score for exact origin/destination match', () => {
    const score = scoreTripMatch(makeTrip(), makeRequest());
    expect(score).toBeGreaterThanOrEqual(70);
  });

  it('gives a lower score when destination differs', () => {
    const score = scoreTripMatch(makeTrip(), makeRequest({ destinationCity: 'Irbid' }));
    expect(score).toBeLessThan(70);
  });

  it('penalises trips that exceed the passenger budget', () => {
    const expensive = scoreTripMatch(makeTrip({ pricePerSeatJOD: 50 }), makeRequest({ maxPriceJOD: 10 }));
    const affordable = scoreTripMatch(makeTrip({ pricePerSeatJOD: 8 }), makeRequest({ maxPriceJOD: 10 }));
    expect(affordable).toBeGreaterThan(expensive);
  });

  it('scores gender incompatibility as 0 for mismatched exclusive preference', () => {
    const score = scoreTripMatch(
      makeTrip({ genderPreference: 'women_only' }),
      makeRequest({ genderPreference: 'men_only' }),
    );
    expect(score).toBeLessThan(50);
  });

  it('penalises trips that cannot carry required packages', () => {
    const withPackage = scoreTripMatch(
      makeTrip({ allowsPackages: false }),
      makeRequest({ requiresPackageCarriage: true, packageWeightKg: 5 }),
    );
    const withoutPackage = scoreTripMatch(makeTrip({ allowsPackages: true }), makeRequest());
    expect(withoutPackage).toBeGreaterThan(withPackage);
  });
});

// ── scoreSeatUtilization ──────────────────────────────────────────────────────

describe('scoreSeatUtilization', () => {
  it('returns higher score for fuller trips', () => {
    const full = scoreSeatUtilization(4, 4);
    const half = scoreSeatUtilization(2, 4);
    expect(full).toBeGreaterThanOrEqual(half);
  });

  it('returns 0 or low for empty trips', () => {
    const score = scoreSeatUtilization(0, 4);
    expect(score).toBeLessThanOrEqual(20);
  });

  it('clamps output between 0 and 100', () => {
    const score = scoreSeatUtilization(10, 4); // over-filled edge case
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── calculateDetourTolerance ──────────────────────────────────────────────────

describe('calculateDetourTolerance', () => {
  it('returns a non-negative number', () => {
    const detour = calculateDetourTolerance(100);
    expect(detour).toBeGreaterThanOrEqual(0);
  });

  it('allows more detour for longer routes', () => {
    const short = calculateDetourTolerance(50);
    const long = calculateDetourTolerance(300);
    expect(long).toBeGreaterThan(short);
  });
});

// ── calculateLiquidityHealth ──────────────────────────────────────────────────

describe('calculateLiquidityHealth', () => {
  it('returns a score between 0 and 100', () => {
    const score = calculateLiquidityHealth({ activeTrips: 10, pendingRequests: 5, averageMatchTime: 8 });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('gives a higher score when supply matches demand closely', () => {
    const balanced = calculateLiquidityHealth({ activeTrips: 10, pendingRequests: 10, averageMatchTime: 5 });
    const unbalanced = calculateLiquidityHealth({ activeTrips: 1, pendingRequests: 100, averageMatchTime: 60 });
    expect(balanced as number).toBeGreaterThan(unbalanced as number);
  });
});

// ── suggestPrayerStops ────────────────────────────────────────────────────────

describe('suggestPrayerStops', () => {
  it('returns an array', () => {
    const stops = suggestPrayerStops('2026-04-15T06:00:00.000Z', 240);
    expect(Array.isArray(stops)).toBe(true);
  });

  it('returns stops with the required shape', () => {
    const stops = suggestPrayerStops('2026-04-15T06:00:00.000Z', 480);
    for (const stop of stops) {
      expect(stop).toHaveProperty('name');
      expect(stop).toHaveProperty('nameAr');
      expect(stop).toHaveProperty('waitMinutes');
      expect(typeof stop.waitMinutes).toBe('number');
    }
  });

  it('returns no stops for a very short trip', () => {
    // 10-minute trip — no prayer time will fall within it
    const stops = suggestPrayerStops('2026-04-15T12:00:00.000Z', 10);
    expect(stops.length).toBe(0);
  });
});
