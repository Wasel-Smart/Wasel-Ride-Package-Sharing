import { describe, expect, it } from 'vitest';
import { getMovementPriceQuote as quoteFare } from '@/services/movementPricing';

type QuoteArgs = Parameters<typeof quoteFare>[0];
type Membership = NonNullable<QuoteArgs['membership']>;

// The discount maths is exercised with discounts explicitly enabled. By default no
// client-side discount is applied (see the "server-authoritative" suite below).
const getMovementPriceQuote = (args: QuoteArgs) => quoteFare({ applyDiscounts: true, ...args });

function membership(overrides: Record<string, unknown> = {}): Membership {
  return {
    plusActive: false,
    commuterPassRoute: null,
    movementCredits: 0,
    loyaltyTier: 'bronze',
    ...overrides,
  } as unknown as Membership;
}

describe('movementPricing: server-authoritative default', () => {
  it('applies no discount unless applyDiscounts is set, whatever the local membership says', () => {
    const quote = quoteFare({
      basePriceJod: 10,
      corridorId: 'amman-irbid',
      forecastDemandScore: 100,
      membership: membership({
        plusActive: true,
        commuterPassRoute: { id: 'amman-irbid' },
        movementCredits: 5000,
      }),
    });
    expect(quote.finalPriceJod).toBe(10);
    expect(quote.discountJod).toBe(0);
    expect(quote.totalDiscountPercent).toBe(0);
    expect(quote.explanation).toBe('Standard fare');
  });
});

describe('movementPricing: getMovementPriceQuote', () => {
  it('applies only the minimum loyalty-credit discount with no other perks', () => {
    const quote = getMovementPriceQuote({ basePriceJod: 100, membership: membership() });
    expect(quote.creditDiscountPercent).toBe(1.5);
    expect(quote.totalDiscountPercent).toBe(1.5);
    expect(quote.finalPriceJod).toBe(98.5);
    expect(quote.discountJod).toBe(1.5);
    expect(quote.explanation).toBe('1.5% loyalty-credit pricing');
  });

  it('stacks density, Plus, commuter-pass and credit discounts', () => {
    const quote = getMovementPriceQuote({
      basePriceJod: 100,
      corridorId: 'amman-irbid',
      forecastDemandScore: 95,
      membership: membership({
        plusActive: true,
        commuterPassRoute: { id: 'amman-irbid' },
        movementCredits: 600,
        loyaltyTier: 'gold',
      }),
    });
    expect(quote.densityDiscountPercent).toBe(4);
    expect(quote.plusDiscountPercent).toBe(6);
    expect(quote.commuterDiscountPercent).toBe(8);
    expect(quote.creditDiscountPercent).toBe(5);
    expect(quote.totalDiscountPercent).toBe(23);
    expect(quote.finalPriceJod).toBe(77);
    expect(quote.discountJod).toBe(23);
    expect(quote.loyaltyTier).toBe('gold');
    expect(quote.explanation).toBe(
      '4% route-density discount + 6% Plus discount + 8% commuter-pass discount + 5% loyalty-credit pricing',
    );
  });

  it('caps the combined discount at 24%', () => {
    const quote = getMovementPriceQuote({
      basePriceJod: 100,
      corridorId: 'amman-irbid',
      forecastDemandScore: 100,
      membership: membership({
        plusActive: true,
        commuterPassRoute: { id: 'amman-irbid' },
        movementCredits: 5000,
      }),
    });
    expect(quote.creditDiscountPercent).toBe(10);
    expect(quote.totalDiscountPercent).toBe(24);
    expect(quote.finalPriceJod).toBe(76);
    expect(quote.discountJod).toBe(24);
  });

  it.each([
    [73, 0, 98.5],
    [74, 1.5, 97],
    [84, 3, 95.5],
    [92, 4, 94.5],
  ])('maps demand score %i to a %s%% density discount', (score, density, finalPrice) => {
    const quote = getMovementPriceQuote({
      basePriceJod: 100,
      forecastDemandScore: score,
      membership: membership(),
    });
    expect(quote.densityDiscountPercent).toBe(density);
    expect(quote.finalPriceJod).toBe(finalPrice);
  });

  it('clamps out-of-range demand scores', () => {
    const high = getMovementPriceQuote({
      basePriceJod: 100,
      forecastDemandScore: 500,
      membership: membership(),
    });
    const low = getMovementPriceQuote({
      basePriceJod: 100,
      forecastDemandScore: -40,
      membership: membership(),
    });
    expect(high.densityDiscountPercent).toBe(4);
    expect(low.densityDiscountPercent).toBe(0);
  });

  it('only gives the commuter discount on the matching corridor', () => {
    const pass = membership({ commuterPassRoute: { id: 'amman-irbid' } });
    expect(
      getMovementPriceQuote({ basePriceJod: 100, corridorId: 'amman-aqaba', membership: pass })
        .commuterDiscountPercent,
    ).toBe(0);
    expect(
      getMovementPriceQuote({ basePriceJod: 100, corridorId: null, membership: pass })
        .commuterDiscountPercent,
    ).toBe(0);
    expect(
      getMovementPriceQuote({ basePriceJod: 100, corridorId: 'amman-irbid', membership: pass })
        .commuterDiscountPercent,
    ).toBe(8);
  });

  it('never returns a negative price for a negative base', () => {
    const quote = getMovementPriceQuote({ basePriceJod: -20, membership: membership() });
    expect(quote.basePriceJod).toBe(0);
    expect(quote.finalPriceJod).toBe(0);
    expect(quote.discountJod).toBe(0);
  });
});
