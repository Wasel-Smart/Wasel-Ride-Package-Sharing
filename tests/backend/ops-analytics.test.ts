import { describe, it, expect } from 'vitest';
import { AnalyticsEngine } from '../../../../backend/services/ops-analytics/service-production.js';
import type { CoordinateInput, RideCompletionInput } from '../../../../backend/services/shared/src/validation/schemas.js';
import { ValidationError } from '../../../../backend/services/shared/src/errors/app-errors.js';

describe('AnalyticsEngine (unit)', () => {
  let engine: AnalyticsEngine;

  beforeEach(() => {
    engine = new AnalyticsEngine();
  });

  describe('validateCoordinate', () => {
    it('rejects latitude > 90', () => {
      expect(() => (engine as any).validateCoordinate({ lat: 91, lng: 0 })).toThrow(ValidationError);
    });
    it('rejects longitude > 180', () => {
      expect(() => (engine as any).validateCoordinate({ lat: 0, lng: 181 })).toThrow(ValidationError);
    });
    it('accepts valid Amman coords', () => {
      expect(() => (engine as any).validateCoordinate({ lat: 31.95, lng: 35.91 })).not.toThrow();
    });
  });

  describe('identifyCorridor', () => {
    it('produces deterministic corridor IDs', () => {
      const origin: CoordinateInput = { lat: 31.95, lng: 35.91 };
      const dest: CoordinateInput = { lat: 32.0, lng: 35.95 };
      expect((engine as any).identifyCorridor(origin, dest)).toBe('corridor_3195_3591_to_3200_3595');
    });
  });

  describe('parsePeriod', () => {
    it('parses current month as default', () => {
      const [start, end] = (engine as any).parsePeriod('current');
      const now = new Date();
      const y = now.getFullYear(), m = now.getMonth();
      expect(new Date(start).getFullYear()).toBe(y);
      expect(new Date(end).getFullYear()).toBe(y);
      expect(new Date(start).getMonth()).toBe(m);
      expect(new Date(end).getMonth()).toBe(m + 1);
    });

    it('parses week-N', () => {
      const [start, end] = (engine as any).parsePeriod('week-1');
      expect(new Date(start).getDate()).toBe(1);
      expect(new Date(end).getDate()).toBe(8);
    });

    it('parses month-3', () => {
      const [start] = (engine as any).parsePeriod('month-3');
      expect(new Date(start).getMonth()).toBe(2);
    });
  });

  describe('generateDriverPayout', () => {
    it('returns zeros when no rides', async () => {
      // Depends on DB - test the path that returns zero-payout
      await expect(engine.generateDriverPayout('test-driver', 'current')).resolves.toEqual({
        driverId: 'test-driver', period: 'current', totalRides: 0, totalEarnings: 0, platformFee: 0, netPayout: 0, status: 'pending',
      });
    });
  });
});
