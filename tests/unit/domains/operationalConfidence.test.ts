import { describe, expect, it } from 'vitest';
import type { CorridorOpportunity, DriverRoutePlan } from '@/config/wasel-movement-network';
import { buildCorridorExperienceSnapshot } from '@/domains/corridors/corridorExperience';
import {
  getOfferRideConfidenceSummary,
  getPackageConfidenceSummary,
  getWalletConfidenceSummary,
} from '@/domains/trust/operationalConfidence';
import type { PostedRide } from '@/services/journeyLogistics';
import type { MovementPriceQuote } from '@/services/movementPricing';
import type { LiveCorridorSignal } from '@/services/routeDemandIntelligence';
import type { WalletData, WalletReliabilityMeta } from '@/services/walletApi';

const baseCorridor: CorridorOpportunity = {
  id: 'amman-irbid',
  from: 'Amman',
  to: 'Irbid',
  label: 'Amman to Irbid',
  distanceKm: 88,
  durationMin: 70,
  density: 'surging',
  predictedDemandScore: 94,
  sharedPriceJod: 6.5,
  soloReferencePriceJod: 9,
  savingsPercent: 28,
  driverBoostJod: 2.5,
  attachRatePercent: 62,
  fillTargetSeats: 4,
  pickupPoints: ['Abdali gate', 'University stop'],
  autoGroupWindow: '07:00 - 09:00',
  movementLayers: ['commuters', 'packages'],
  businessDemand: ['staff transport'],
  intelligenceSignals: ['repeat demand'],
  routeMoat: 'Dense university and commuter traffic.',
  subscriptionPriceJod: 32,
  priceLadder: [],
};

function createPriceQuote(
  overrides: Partial<MovementPriceQuote> = {},
): MovementPriceQuote {
  return {
    basePriceJod: 6.5,
    finalPriceJod: 5.6,
    discountJod: 0.9,
    totalDiscountPercent: 14,
    densityDiscountPercent: 4,
    plusDiscountPercent: 6,
    commuterDiscountPercent: 0,
    creditDiscountPercent: 4,
    loyaltyTier: 'plus',
    forecastDemandScore: 92,
    pricePressure: 'balanced',
    savingsPercent: 38,
    explanation: 'Route-density and loyalty pricing.',
    ...overrides,
  };
}

function createLiveSignal(
  overrides: Partial<LiveCorridorSignal> = {},
): LiveCorridorSignal {
  return {
    id: 'signal-1',
    from: 'Amman',
    to: 'Irbid',
    label: 'Amman to Irbid',
    liveDemandScore: 90,
    forecastDemandScore: 94,
    activeSupply: 4,
    activeDemandAlerts: 7,
    liveSearches: 19,
    liveBookings: 11,
    livePackages: 5,
    seatUtilizationPercent: 81,
    pricePressure: 'balanced',
    nextWaveWindow: '07:00 - 09:00',
    recommendedPickupPoint: 'Abdali gate',
    routeOwnershipScore: 91,
    recommendedReason: 'Demand is outrunning live supply.',
    freshestSignalAt: '2026-04-23T08:00:00.000Z',
    productionSources: ['19 live searches', '11 live bookings'],
    priceQuote: createPriceQuote(),
    ...overrides,
  };
}

function createDriverPlan(
  overrides: Partial<DriverRoutePlan> = {},
): DriverRoutePlan {
  return {
    corridor: baseCorridor,
    recommendedSeatPriceJod: 5.5,
    grossWhenFullJod: 22,
    emptySeatCostJod: 3,
    packageBonusJod: 4,
    waselBrainNote: 'Fill rate is strong on this corridor.',
    ...overrides,
  };
}

function createPostedRide(overrides: Partial<PostedRide> = {}): PostedRide {
  return {
    id: 'ride-1',
    from: 'Amman',
    to: 'Irbid',
    date: '2026-04-24',
    time: '08:30',
    seats: 3,
    price: 6,
    gender: 'any',
    prayer: false,
    carModel: 'Toyota Camry',
    note: '',
    acceptsPackages: true,
    packageCapacity: 'medium',
    packageNote: '',
    createdAt: '2026-04-23T08:00:00.000Z',
    status: 'active',
    ...overrides,
  };
}

function createWalletData(overrides: Partial<WalletData> = {}): WalletData {
  return {
    wallet: {
      id: 'wallet-1',
      userId: 'user-1',
      walletType: 'custodial',
      status: 'active',
      currency: 'JOD',
      autoTopUp: true,
      autoTopUpAmount: 20,
      autoTopUpThreshold: 5,
      paymentMethods: [
        {
          id: 'pm-1',
          type: 'card',
          provider: 'stripe',
          label: 'Visa ending 4242',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2030,
          isDefault: true,
          status: 'active',
          createdAt: '2026-04-23T08:00:00.000Z',
          updatedAt: '2026-04-23T08:00:00.000Z',
        },
      ],
      createdAt: '2026-04-23T08:00:00.000Z',
      ...(overrides.wallet ?? {}),
    },
    balance: 42.5,
    pendingBalance: 7.5,
    rewardsBalance: 3,
    total_earned: 64,
    total_spent: 21.5,
    total_deposited: 50,
    currency: 'JOD',
    pinSet: true,
    autoTopUp: true,
    transactions: [
      {
        id: 'tx-1',
        type: 'transfer',
        description: 'Sent funds',
        amount: -5,
        createdAt: '2026-04-23T09:00:00.000Z',
        status: 'completed',
      },
    ],
    activeEscrows: [],
    activeRewards: [],
    subscription: null,
    ...overrides,
  };
}

function createCorridorExperience() {
  return buildCorridorExperienceSnapshot({
    from: 'Amman',
    to: 'Irbid',
    corridorPlan: baseCorridor,
    selectedSignal: createLiveSignal(),
    selectedPriceQuote: createPriceQuote(),
    featuredSignals: [],
    allSignals: [],
    membership: {
      userId: null,
      plusActive: true,
      plusRenewalDate: null,
      commuterPassRoute: null,
      movementCredits: 120,
      rewardsBalanceJod: 0,
      loyaltyTier: 'plus',
      activePrograms: [],
    },
    matchingRideCount: 3,
    packageReadyRideCount: 2,
    matchingPackageCount: 1,
    recommendedPickupPoint: 'Abdali gate',
    nextWaveWindow: '07:00 - 09:00',
    routeOwnershipScore: 91,
    recommendationReason: 'Demand is outrunning live supply.',
  });
}

describe('operationalConfidence', () => {
  it('marks a live offer ride lane as publish-ready when route proof is strong', () => {
    const summary = getOfferRideConfidenceSummary({
      corridor: createCorridorExperience(),
      acceptsPackages: true,
      packageCapacity: 'medium',
      draftMessage: 'Draft autosaves on this device.',
      driverPlan: createDriverPlan(),
    });

    expect(summary.score).toBeGreaterThanOrEqual(90);
    expect(summary.headline).toBe('Publish-ready supply lane');
    expect(summary.signals.find((signal) => signal.id === 'route-signal')?.value).toContain(
      'corridor proof',
    );
  });

  it('keeps package handoff confidence visible even before a recipient number is added', () => {
    const summary = getPackageConfidenceSummary({
      corridor: buildCorridorExperienceSnapshot({
        from: 'Amman',
        to: 'Irbid',
        corridorPlan: baseCorridor,
        selectedSignal: null,
        selectedPriceQuote: null,
        featuredSignals: [],
        allSignals: [],
        membership: {
          userId: null,
          plusActive: false,
          plusRenewalDate: null,
          commuterPassRoute: null,
          movementCredits: 30,
          rewardsBalanceJod: 0,
          loyaltyTier: 'starter',
          activePrograms: [],
        },
        matchingRideCount: 0,
        packageReadyRideCount: 0,
        matchingPackageCount: 0,
        recommendedPickupPoint: null,
        nextWaveWindow: null,
        routeOwnershipScore: null,
        recommendationReason: null,
      }),
      preferredRide: createPostedRide(),
      recipientPhone: '',
    });

    expect(summary.headline).toBe('Visible handoff lane');
    expect(
      summary.signals.find((signal) => signal.id === 'coordination-lane')?.value,
    ).toContain('Wasel can keep the WhatsApp handoff lane open');
  });

  it('surfaces degraded wallet posture and missing transfer protection', () => {
    const degradedMeta: WalletReliabilityMeta = {
      degraded: true,
      fetchedAt: '2026-04-23T10:00:00.000Z',
      source: 'direct-supabase',
    };
    const wallet = createWalletData({
      pinSet: false,
      wallet: {
        ...createWalletData().wallet,
        status: 'limited',
        paymentMethods: [],
      },
    });
    const summary = getWalletConfidenceSummary({
      wallet,
      meta: degradedMeta,
      transferChallenge: null,
      totalTransactions: 1,
      defaultPaymentMethodLabel: null,
      formatMoney: (value, currency) => `${value.toFixed(2)} ${currency}`,
    });

    expect(summary.detail).toContain('Set a wallet PIN');
    expect(summary.signals.find((signal) => signal.id === 'source-posture')?.value).toContain(
      'Backup wallet snapshot',
    );
    expect(
      summary.signals.find((signal) => signal.id === 'transfer-protection')?.value,
    ).toContain('Set a wallet PIN');
  });
});
