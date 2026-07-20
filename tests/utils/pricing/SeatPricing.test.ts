/**
 * tests/utils/pricing/SeatPricing.test.ts
 *
 * Unit tests for src/utils/pricing/SeatPricing.ts (SmartPricingEngine)
 *
 * This is real-money logic (fare-per-seat and school subscription pricing)
 * that previously had zero test coverage. Expected values below were computed
 * by running the actual formula in isolation, not guessed — see the numbers
 * called out per test.
 */

import { describe, it, expect } from 'vitest';
import { SmartPricingEngine } from '@/utils/pricing/SeatPricing';

// ── calculateSharedRidePricing() ──────────────────────────────────────────────

describe('SmartPricingEngine.calculateSharedRidePricing()', () => {
  it('returns one entry per seat, in ascending seat order', () => {
    const result = SmartPricingEngine.calculateSharedRidePricing(20, 4);
    expect(result).toHaveLength(4);
    expect(result.map((r) => r.seatIndex)).toEqual([1, 2, 3, 4]);
  });

  it('computes the documented 10% platform fee split across seats (totalTripCost=20, 4 seats)', () => {
    const result = SmartPricingEngine.calculateSharedRidePricing(20, 4);
    // pricePerPerson = (20 * 1.10) / seatIndex
    expect(result[0].price).toBe(22); // 22 / 1
    expect(result[1].price).toBe(11); // 22 / 2
    expect(result[2].price).toBe(7.33); // 22 / 3, rounded to 2dp
    expect(result[3].price).toBe(5.5); // 22 / 4
  });

  it('a single seat costs the full trip cost plus platform fee', () => {
    const result = SmartPricingEngine.calculateSharedRidePricing(20, 1);
    expect(result).toHaveLength(1);
    expect(result[0].price).toBe(22);
  });

  it('price strictly decreases as more seats are added', () => {
    const result = SmartPricingEngine.calculateSharedRidePricing(50, 5);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].price).toBeLessThan(result[i - 1].price);
    }
  });

  it('savings percentage increases as more seats are filled', () => {
    const result = SmartPricingEngine.calculateSharedRidePricing(20, 4);
    expect(result[0].savings).toBe(4);
    expect(result[1].savings).toBe(52);
    expect(result[2].savings).toBe(68);
    expect(result[3].savings).toBe(76);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].savings).toBeGreaterThan(result[i - 1].savings);
    }
  });

  it('pluralizes the label correctly (singular vs plural)', () => {
    const result = SmartPricingEngine.calculateSharedRidePricing(20, 2);
    expect(result[0].label).toBe('1 Passenger');
    expect(result[1].label).toBe('2 Passengers');
  });

  it('respects a custom baseMargin when computing savings', () => {
    const lowMargin = SmartPricingEngine.calculateSharedRidePricing(20, 1, 0.05);
    const highMargin = SmartPricingEngine.calculateSharedRidePricing(20, 1, 0.5);
    // Higher solo-ride benchmark (margin) means the same seat price looks like a bigger saving
    expect(highMargin[0].savings).toBeGreaterThan(lowMargin[0].savings);
  });
});

// ── calculateSchoolSubscription() ─────────────────────────────────────────────

describe('SmartPricingEngine.calculateSchoolSubscription()', () => {
  it('computes the one-way monthly cost from distance, days/week, and the fixed base fee', () => {
    // baseFee(50) + distanceKm(10) * 2.5 * daysPerWeek(5) * 4 weeks = 50 + 500 = 550
    const result = SmartPricingEngine.calculateSchoolSubscription(10, 5, false);
    expect(result.standard).toBe(550);
  });

  it('premium tier is a 40% markup over standard, rounded up', () => {
    const result = SmartPricingEngine.calculateSchoolSubscription(10, 5, false);
    expect(result.premium).toBe(Math.ceil(result.standard * 1.4));
    expect(result.premium).toBe(770);
  });

  it('round trip applies the 1.8x multiplier documented in the source', () => {
    const oneWay = SmartPricingEngine.calculateSchoolSubscription(10, 5, false);
    const roundTrip = SmartPricingEngine.calculateSchoolSubscription(10, 5, true);
    // NOTE: the source comment says "10% discount on return leg" but the code
    // applies a flat 1.8x multiplier (i.e. a 10% discount off a naive 2x
    // round-trip cost, not off the one-way cost). This test locks in the
    // *current* behavior — flag to product/finance if 1.8x isn't intentional.
    expect(roundTrip.standard).toBe(Math.ceil(oneWay.standard * 1.8));
    expect(roundTrip.standard).toBe(990);
  });

  it('a zero-distance trip still charges the fixed base fee', () => {
    const result = SmartPricingEngine.calculateSchoolSubscription(0, 5, false);
    expect(result.standard).toBe(50);
    expect(result.premium).toBe(70);
  });

  it('cost scales linearly with days per week', () => {
    const threeDays = SmartPricingEngine.calculateSchoolSubscription(10, 3, false);
    const sixDays = SmartPricingEngine.calculateSchoolSubscription(10, 6, false);
    // Doubling days adds the same marginal distance-cost twice; bases stay fixed,
    // so the six-day cost is less than exactly double the three-day cost.
    expect(sixDays.standard).toBeGreaterThan(threeDays.standard);
    expect(sixDays.standard).toBeLessThan(threeDays.standard * 2);
  });
});
