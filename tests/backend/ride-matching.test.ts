import { describe, it, expect } from 'vitest';
import { MatchingEngine } from '../../../../backend/services/ride-matching/service-production.js';
import type { CoordinateInput } from '../../../../backend/services/shared/src/validation/schemas.js';
import { ValidationError } from '../../../../backend/services/shared/src/errors/app-errors.js';

describe('MatchingEngine (unit)', () => {
  let engine: MatchingEngine;

  beforeEach(() => {
    engine = new MatchingEngine();
  });

  describe('validateOrigin', () => {
    it('rejects lat > 90', () => {
      expect(() => (engine as any).validateOrigin({ lat: 91, lng: 0 })).toThrow(ValidationError);
    });
    it('rejects lng > 180', () => {
      expect(() => (engine as any).validateOrigin({ lat: 0, lng: 181 })).toThrow(ValidationError);
    });
    it('rejects NaN', () => {
      expect(() => (engine as any).validateOrigin({ lat: NaN, lng: 0 })).toThrow();
    });
    it('accepts valid coords', () => {
      expect(() => (engine as any).validateOrigin({ lat: 31.95, lng: 35.91 })).not.toThrow();
    });
  });

  describe('distanceKm', () => {
    it('is ~0 for identical points', () => {
      const p: CoordinateInput = { lat: 0, lng: 0 };
      expect((engine as any).distanceKm(p, p)).toBeCloseTo(0, 5);
    });

    it('approximates Amman-Irbid (~90 km)', () => {
      const amman: CoordinateInput = { lat: 31.9539, lng: 35.9106 };
      const irbid: CoordinateInput = { lat: 32.5556, lng: 35.8500 };
      expect((engine as any).distanceKm(amman, irbid)).toBeGreaterThan(80);
      expect((engine as any).distanceKm(amman, irbid)).toBeLessThan(100);
    });
  });

  describe('scoreDrivers', () => {
    const origin: CoordinateInput = { lat: 31.95, lng: 35.91 };
    const drivers = [
      { driverId: 'a', vehicleId: 'v1', location: { lat: 31.95, lng: 35.91 } as CoordinateInput, rating: 5, status: 'available', availableSeats: 2, score: 0 },
      { driverId: 'b', vehicleId: 'v2', location: { lat: 32.5, lng: 35.9 } as CoordinateInput, rating: 3, status: 'available', availableSeats: 2, score: 0 },
    ];
    it('ranks closer/higher-rated driver first', () => {
      const scored = engine.scoreDrivers(drivers as any, { origin });
      expect(scored[0].driverId).toBe('a');
      expect(scored[0].score).toBeGreaterThan(scored[1].score);
    });
  });
});
