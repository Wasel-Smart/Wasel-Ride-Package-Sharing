import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockWalletApi } = vi.hoisted(() => ({
  mockWalletApi: {
    getWallet: vi.fn(),
    createPaymentIntent: vi.fn(),
    confirmPaymentIntent: vi.fn(),
  },
}));

vi.mock('../../../src/services/walletApi', () => ({
  walletApi: mockWalletApi,
}));

import { paymentsService, resolveDefaultPaymentMethodType } from '../../../src/features/payments/paymentsService';

const walletPayload = {
  wallet: {
    id: 'wallet-1',
    userId: 'user-123',
    walletType: 'custodial',
    status: 'active',
    currency: 'JOD',
    autoTopUp: false,
    autoTopUpAmount: 20,
    autoTopUpThreshold: 5,
    paymentMethods: [
      {
        id: 'pm-card',
        type: 'card',
        provider: 'stripe',
        label: 'Visa ending 4242',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2030,
        isDefault: true,
        status: 'active',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  balance: 48,
  pendingBalance: 12,
  rewardsBalance: 0,
  total_earned: 10,
  total_spent: 22,
  total_deposited: 70,
  currency: 'JOD',
  pinSet: true,
  autoTopUp: false,
  transactions: [
    {
      id: 'tx-deposit',
      type: 'deposit',
      description: 'Card top-up settled',
      amount: 30,
      createdAt: '2026-04-10T10:00:00.000Z',
      status: 'completed',
      metadata: { paymentMethodType: 'card', provider: 'stripe' },
    },
    {
      id: 'tx-package',
      type: 'payment',
      description: 'Package delivery payment',
      amount: -12,
      createdAt: '2026-04-11T10:00:00.000Z',
      status: 'processing',
      paymentIntentId: 'pi-package',
      metadata: {
        purpose: 'package_payment',
        paymentMethodType: 'wallet',
        provider: 'wallet',
        referenceType: 'package',
        referenceId: 'pkg-1',
      },
    },
    {
      id: 'tx-ignore',
      type: 'escrow_hold',
      description: 'Escrow hold',
      amount: -5,
      createdAt: '2026-04-11T11:00:00.000Z',
      status: 'processing',
    },
  ],
  activeEscrows: [],
  activeRewards: [],
  subscription: null,
};

describe('paymentsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds a payments dashboard from wallet movements only', async () => {
    mockWalletApi.getWallet.mockResolvedValue(walletPayload);

    const dashboard = await paymentsService.getDashboard('user-123');

    expect(mockWalletApi.getWallet).toHaveBeenCalledWith('user-123');
    expect(dashboard.recentPayments).toHaveLength(2);
    expect(dashboard.recentPayments[0]).toMatchObject({
      id: 'tx-deposit',
      kind: 'deposit',
      direction: 'credit',
      paymentMethodType: 'card',
    });
    expect(dashboard.recentPayments[1]).toMatchObject({
      id: 'tx-package',
      kind: 'package_payment',
      direction: 'debit',
      provider: 'wallet',
      referenceId: 'pkg-1',
    });
    expect(dashboard.summary).toMatchObject({
      availableBalance: 48,
      paymentMethodsCount: 1,
      defaultMethodLabel: 'Visa ending 4242',
      pendingCount: 1,
      pendingAmount: 12,
    });
  });

  it('creates payment intents through the payments domain contract', async () => {
    mockWalletApi.createPaymentIntent.mockResolvedValue({
      id: 'pi-ride',
      purpose: 'ride_payment',
      status: 'requires_action',
      amount: 14,
      currency: 'JOD',
      paymentMethodType: 'card',
      provider: 'stripe',
      createdAt: '2026-04-12T10:00:00.000Z',
      referenceType: 'trip',
      referenceId: 'trip-1',
    });

    const transaction = await paymentsService.initiatePayment('user-123', {
      purpose: 'ride_payment',
      amount: 14,
      paymentMethodType: 'card',
      referenceType: 'trip',
      referenceId: 'trip-1',
      description: 'Ride checkout',
      metadata: { corridor: 'amman-irbid' },
    });

    expect(mockWalletApi.createPaymentIntent).toHaveBeenCalledWith(
      'ride_payment',
      14,
      'card',
      expect.objectContaining({
        referenceType: 'trip',
        referenceId: 'trip-1',
        metadata: expect.objectContaining({
          corridor: 'amman-irbid',
          originDomain: 'payments',
          initiatedByUserId: 'user-123',
        }),
      }),
    );
    expect(transaction).toMatchObject({
      id: 'pi-ride',
      kind: 'ride_payment',
      status: 'requires_action',
      amount: 14,
      description: 'Ride checkout',
    });
  });

  it('confirms payment intents without leaking wallet-specific response shape', async () => {
    mockWalletApi.confirmPaymentIntent.mockResolvedValue({
      id: 'pi-ride',
      status: 'succeeded',
      settled: true,
    });

    await expect(paymentsService.confirmPayment('pi-ride')).resolves.toEqual({
      id: 'pi-ride',
      status: 'succeeded',
      settled: true,
    });
  });

  it('prefers wallet balance when it can fully fund the payment', () => {
    expect(resolveDefaultPaymentMethodType(walletPayload.wallet.paymentMethods, 15, 48)).toBe('wallet');
    expect(resolveDefaultPaymentMethodType(walletPayload.wallet.paymentMethods, 80, 48)).toBe('card');
  });
});
