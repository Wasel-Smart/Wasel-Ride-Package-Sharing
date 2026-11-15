import { describe, it, expect } from 'vitest';
import {
  calculateDistanceMeters,
  evaluateGeoStreamUpdate,
  DEFAULT_GEO_STREAM_CONFIG,
  type GeoStreamState,
  type GeoPoint,
} from '@/platform/geo-stream';

// Amman city centre
const AMMAN: GeoPoint = { lat: 31.9539, lng: 35.9106 };
// ~200m north of Amman
const AMMAN_200M_NORTH: GeoPoint = { lat: 31.9557, lng: 35.9106 };
// ~50m north of Amman
const AMMAN_50M_NORTH: GeoPoint = { lat: 31.9543, lng: 35.9106 };

const EMPTY_STATE: GeoStreamState = { lastAcceptedAt: null, lastPoint: null };

describe('calculateDistanceMeters', () => {
  it('returns 0 for identical points', () => {
    expect(calculateDistanceMeters(AMMAN, AMMAN)).toBeCloseTo(0, 1);
  });

  it('calculates ~200m correctly', () => {
    const d = calculateDistanceMeters(AMMAN, AMMAN_200M_NORTH);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(250);
  });

  it('is symmetric', () => {
    const ab = calculateDistanceMeters(AMMAN, AMMAN_200M_NORTH);
    const ba = calculateDistanceMeters(AMMAN_200M_NORTH, AMMAN);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it('calculates known distance between Amman and Baghdad (~800km)', () => {
    const BAGHDAD: GeoPoint = { lat: 33.3152, lng: 44.3661 };
    const d = calculateDistanceMeters(AMMAN, BAGHDAD);
    expect(d).toBeGreaterThan(700_000);
    expect(d).toBeLessThan(900_000);
  });
});

describe('evaluateGeoStreamUpdate — first point', () => {
  it('accepts the first point with reason first_point', () => {
    const result = evaluateGeoStreamUpdate(EMPTY_STATE, AMMAN, Date.now());
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('first_point');
  });

  it('accepts when lastPoint is set but lastAcceptedAt is null', () => {
    const state: GeoStreamState = { lastAcceptedAt: null, lastPoint: AMMAN };
    const result = evaluateGeoStreamUpdate(state, AMMAN_200M_NORTH, Date.now());
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('first_point');
  });
});

describe('evaluateGeoStreamUpdate — distance delta', () => {
  it('accepts when distance exceeds minDistanceMeters regardless of interval', () => {
    const now = Date.now();
    const state: GeoStreamState = { lastAcceptedAt: now - 100, lastPoint: AMMAN };
    const result = evaluateGeoStreamUpdate(state, AMMAN_200M_NORTH, now);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('distance_delta');
  });
});

describe('evaluateGeoStreamUpdate — interval elapsed', () => {
  it('accepts when interval has elapsed even if distance is small', () => {
    const now = Date.now();
    const state: GeoStreamState = {
      lastAcceptedAt: now - DEFAULT_GEO_STREAM_CONFIG.minUpdateIntervalMs - 1,
      lastPoint: AMMAN,
    };
    const result = evaluateGeoStreamUpdate(state, AMMAN_50M_NORTH, now);
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('interval_elapsed');
  });
});

describe('evaluateGeoStreamUpdate — throttled', () => {
  it('throttles when distance is small and interval has not elapsed', () => {
    const now = Date.now();
    const state: GeoStreamState = {
      lastAcceptedAt: now - 1000,
      lastPoint: AMMAN,
    };
    const result = evaluateGeoStreamUpdate(state, AMMAN_50M_NORTH, now);
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe('throttled');
  });
});

describe('evaluateGeoStreamUpdate — custom config', () => {
  it('respects custom minDistanceMeters', () => {
    const now = Date.now();
    const state: GeoStreamState = { lastAcceptedAt: now - 100, lastPoint: AMMAN };
    // 50m is below default 120m but above custom 10m
    const result = evaluateGeoStreamUpdate(
      state,
      AMMAN_50M_NORTH,
      now,
      { minUpdateIntervalMs: 60_000, minDistanceMeters: 10 },
    );
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('distance_delta');
  });

  it('respects custom minUpdateIntervalMs', () => {
    const now = Date.now();
    const state: GeoStreamState = {
      lastAcceptedAt: now - 500,
      lastPoint: AMMAN,
    };
    // 500ms elapsed > custom 100ms interval
    const result = evaluateGeoStreamUpdate(
      state,
      AMMAN_50M_NORTH,
      now,
      { minUpdateIntervalMs: 100, minDistanceMeters: 500 },
    );
    expect(result.accepted).toBe(true);
    expect(result.reason).toBe('interval_elapsed');
  });
});
