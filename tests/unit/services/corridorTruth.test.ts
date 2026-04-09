import { describe, expect, it } from 'vitest';
import { getCorridorMovementQuote, getCorridorTruth } from '../../../src/services/corridorTruth';

describe('corridorTruth', () => {
  it('builds a shared corridor truth snapshot with pricing and readiness fields', () => {
    const snapshot = getCorridorTruth({ from: 'Amman', to: 'Irbid' });

    expect(snapshot.corridorPlan?.id).toBeTruthy();
    expect(snapshot.selectedPriceQuote?.finalPriceJod).toBeTypeOf('number');
    expect(snapshot.featuredSignals.length).toBeGreaterThan(0);
    expect(snapshot.matchingRideCount).toBeGreaterThanOrEqual(0);
    expect(snapshot.packageReadyRideCount).toBeGreaterThanOrEqual(0);
  });

  it('quotes ad-hoc route movement through the same shared pricing path', () => {
    const quote = getCorridorMovementQuote({
      from: 'Amman',
      to: 'Aqaba',
      basePriceJod: 12,
    });

    expect(quote.priceQuote.basePriceJod).toBe(12);
    expect(quote.priceQuote.finalPriceJod).toBeLessThanOrEqual(12);
    expect(quote.signal?.id ?? quote.corridorPlan?.id).toBeTruthy();
  });
});
