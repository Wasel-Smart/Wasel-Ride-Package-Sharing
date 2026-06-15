import { describe, expect, it } from 'vitest';
import {
  calculateDistanceMeters,
  evaluateGeoStreamUpdate,
} from '../../../src/platform/geo-stream';

describe('geo stream throttling', () => {
  it('accepts the first update', () => {
    const decision = evaluateGeoStreamUpdate(
      { lastAcceptedAt: null, lastPoint: null },
      { lat: 31.9539, lng: 35.9106 },
      1000,
    );

    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('first_point');
  });

  it('throttles tiny moves inside the interval window', () => {
    const decision = evaluateGeoStreamUpdate(
      {
        lastAcceptedAt: 1_000,
        lastPoint: { lat: 31.9539, lng: 35.9106 },
      },
      { lat: 31.9540, lng: 35.9107 },
      5_000,
    );

    expect(decision.accepted).toBe(false);
    expect(decision.reason).toBe('throttled');
  });

  it('accepts materially moved points', () => {
    const distance = calculateDistanceMeters(
      { lat: 31.9539, lng: 35.9106 },
      { lat: 31.9589, lng: 35.9206 },
    );

    expect(distance).toBeGreaterThan(120);

    const decision = evaluateGeoStreamUpdate(
      {
        lastAcceptedAt: 1_000,
        lastPoint: { lat: 31.9539, lng: 35.9106 },
      },
      { lat: 31.9589, lng: 35.9206 },
      5_000,
    );

    expect(decision.accepted).toBe(true);
    expect(decision.reason).toBe('distance_delta');
  });
});
