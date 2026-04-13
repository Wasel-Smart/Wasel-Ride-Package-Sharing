import { beforeEach, describe, expect, it } from 'vitest';
import {
  __resetMovementMembershipForTests,
  getMovementMembershipSnapshot,
  hydrateMovementMembershipFromWallet,
  recordMovementActivity,
} from '../../../src/services/movementMembership';

describe('movementMembership', () => {
  beforeEach(() => {
    __resetMovementMembershipForTests();
  });

  it('hydrates Wasel Plus state from the backend wallet subscription', () => {
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

    const snapshot = getMovementMembershipSnapshot();

    expect(snapshot.plusActive).toBe(true);
    expect(snapshot.plusRenewalDate).toBe('2026-05-01T00:00:00.000Z');
    expect(snapshot.activeSubscription?.type).toBe('plus');
    expect(snapshot.activeSubscription?.planName).toBe('Wasel Plus');
  });

  it('hydrates commuter pass state from the backend wallet subscription', () => {
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
        id: 'sub-2',
        planName: 'Amman-Irbid Pass',
        price: 14.5,
        status: 'active',
        renewalDate: '2026-05-15T00:00:00.000Z',
        type: 'commuter-pass',
        corridorId: 'amman-irbid',
        corridorLabel: 'Amman to Irbid',
      },
    });

    const snapshot = getMovementMembershipSnapshot();

    expect(snapshot.commuterPassRouteId).toBe('amman-irbid');
    expect(snapshot.activeSubscription?.type).toBe('commuter-pass');
    expect(snapshot.activeSubscription?.corridorId).toBe('amman-irbid');
  });

  it('tracks movement credits in memory without localStorage persistence', () => {
    recordMovementActivity('ride_booked', 'amman-irbid');
    const snapshot = getMovementMembershipSnapshot();

    expect(snapshot.movementCredits).toBeGreaterThan(0);
    expect(snapshot.dailyRouteId).toBe('amman-irbid');
    expect(snapshot.loyaltyTier).toBe('starter');
  });
});
