import { beforeEach, describe, expect, it } from 'vitest';
import { activateWaselPlus } from '../../../src/services/movementMembership';
import { getMovementPriceQuote } from '../../../src/services/movementPricing';

const MEMBERSHIP_KEY = 'wasel-movement-membership';

describe('movementPricing', () => {
  beforeEach(() => {
    window.localStorage.removeItem(MEMBERSHIP_KEY);
  });

  it('includes demand metadata and corridor savings in quotes', () => {
    const quote = getMovementPriceQuote({
      basePriceJod: 12,
      corridorId: 'amman-irbid',
      forecastDemandScore: 91,
      pricePressure: 'surging',
    });

    expect(quote.forecastDemandScore).toBe(91);
    expect(quote.pricePressure).toBe('surging');
    expect(quote.savingsPercent).toBeGreaterThan(0);
    expect(quote.finalPriceJod).toBeLessThanOrEqual(12);
  });

  it('applies membership discounts and derives price pressure when needed', () => {
    activateWaselPlus();

    const quote = getMovementPriceQuote({
      basePriceJod: 10,
      corridorId: 'amman-irbid',
      forecastDemandScore: 68,
    });

    expect(quote.plusDiscountPercent).toBe(6);
    expect(quote.pricePressure).toBe('balanced');
    expect(quote.totalDiscountPercent).toBeGreaterThan(quote.creditDiscountPercent);
  });
});
