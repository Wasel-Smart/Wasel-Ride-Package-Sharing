import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetMovementMembershipForTests,
  hydrateMovementMembershipFromWallet,
} from '../../../src/services/movementMembership';
import { getMovementPriceQuote } from '../../../src/services/movementPricing';

describe('movementPricing', () => {
  beforeEach(() => {
    __resetMovementMembershipForTests();
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

  it('applies backend plan discounts when a membership is active', () => {
    hydrateMovementMembershipFromWallet({
      wallet: {
        id: 'wallet-1',
        userId: 'user-1',
        walletType: 'custodial',
        status: 'active',
        currency: 'JOD',
        autoTopUp: false,
        autoTopUpAmount: 20,
        autoTopUpThreshold: 5,
        paymentMethods: [],
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      balance: 0,
      pendingBalance: 0,
      rewardsBalance: 0,
      total_earned: 0,
      total_spent: 0,
      total_deposited: 0,
      currency: 'JOD',
      pinSet: false,
      autoTopUp: false,
      transactions: [],
      activeEscrows: [],
      activeRewards: [],
      subscription: {
        id: 'sub-1',
        planName: 'Wasel Plus',
        price: 9.99,
        status: 'active',
        renewalDate: '2026-05-01T00:00:00.000Z',
        type: 'plus',
      },
    });

    const quote = getMovementPriceQuote({
      basePriceJod: 10,
      corridorId: 'amman-irbid',
      forecastDemandScore: 68,
    });

    expect(quote.planDiscountPercent).toBe(6);
    expect(quote.pricePressure).toBe('balanced');
    expect(quote.totalDiscountPercent).toBeGreaterThan(quote.creditDiscountPercent);
  });
});
