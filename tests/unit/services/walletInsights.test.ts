import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchWithRetry, mockGetAuthDetails } = vi.hoisted(() => ({
  mockFetchWithRetry: vi.fn(),
  mockGetAuthDetails: vi.fn().mockResolvedValue({ token: 'tok', userId: 'u1' }),
}));

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  publicAnonKey: 'public-key',
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
  getAuthDetails: (...args: unknown[]) => mockGetAuthDetails(...args),
}));

import { __resetWalletApiCachesForTests, walletApi } from '../../../src/services/walletApi';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

const walletPayload = {
  wallet: {
    id: 'wallet-1',
    userId: 'u1',
    walletType: 'custodial',
    status: 'active',
    currency: 'JOD',
    autoTopUp: false,
    autoTopUpAmount: 20,
    autoTopUpThreshold: 5,
    paymentMethods: [],
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  balance: 100,
  pendingBalance: 5,
  rewardsBalance: 0,
  total_earned: 30,
  total_spent: 22,
  total_deposited: 120,
  currency: 'JOD',
  pinSet: true,
  autoTopUp: false,
  transactions: [
    {
      id: 'tx-1',
      type: 'deposit',
      description: 'Wallet deposit',
      amount: 40,
      createdAt: '2026-04-01T10:00:00.000Z',
      status: 'completed',
    },
    {
      id: 'tx-2',
      type: 'payment',
      description: 'Subscription payment',
      amount: -10,
      createdAt: '2026-04-02T10:00:00.000Z',
      status: 'completed',
    },
    {
      id: 'tx-3',
      type: 'transfer',
      description: 'Wallet transfer',
      amount: -12,
      createdAt: '2026-04-03T10:00:00.000Z',
      status: 'completed',
    },
    {
      id: 'tx-4',
      type: 'refund',
      description: 'Escrow refund',
      amount: 8,
      createdAt: '2026-03-03T10:00:00.000Z',
      status: 'completed',
    },
  ],
  activeEscrows: [],
  activeRewards: [],
  subscription: null,
};

describe('walletApi insights and payment-method controls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetWalletApiCachesForTests();
    window.localStorage.clear();
  });

  it('derives wallet insights from secure backend transactions', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse(walletPayload));

    const insights = await walletApi.getInsights('u1');

    expect(insights.totalTransactions).toBe(4);
    expect(insights.thisMonthSpent).toBeGreaterThan(0);
    expect(insights.monthlyTrend).toHaveLength(6);
  });

  it('paginates wallet transactions from the secure snapshot cache', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse(walletPayload));

    const page1 = await walletApi.getTransactions('u1', 1, 2);
    const page2 = await walletApi.getTransactions('u1', 2, 2);

    expect(page1.transactions).toHaveLength(2);
    expect(page2.transactions).toHaveLength(2);
    expect(page1.total).toBe(4);
  });

  it('blocks payment-method mutations until a step-up token is present', async () => {
    await expect(walletApi.addPaymentMethod('u1', {
      type: 'card',
      provider: 'stripe',
      providerReference: 'pm_123',
      isDefault: true,
    })).rejects.toThrow('Verify your wallet PIN and OTP before changing payment methods.');
  });

  it('adds a payment method after step-up verification and calls the secure backend endpoint', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(await jsonResponse({
        purpose: 'payment_method',
        verified: true,
        otpRequired: true,
        verificationToken: 'pm-step-up',
        expiresAt: '2026-04-12T11:00:00.000Z',
      }))
      .mockResolvedValueOnce(await jsonResponse({ ok: true, paymentMethodId: 'pm-local-1' }));

    await walletApi.verifyPin('u1', '1234', 'payment_method');
    await walletApi.addPaymentMethod('u1', {
      type: 'card',
      provider: 'stripe',
      providerReference: 'pm_123',
      label: 'Visa',
      last4: '4242',
      isDefault: true,
    });

    expect(mockFetchWithRetry).toHaveBeenLastCalledWith(
      'https://api.wasel.test/wallet/payment-methods',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          action: 'add',
          type: 'card',
          provider: 'stripe',
          providerReference: 'pm_123',
          label: 'Visa',
          brand: null,
          last4: '4242',
          expiryMonth: null,
          expiryYear: null,
          isDefault: true,
          verificationToken: 'pm-step-up',
        }),
      }),
    );
  });

  it('posts auto top-up settings to the secure backend', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse({ ok: true }));

    await walletApi.setAutoTopUp('u1', true, 25, 7);

    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/wallet/settings',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          autoTopUpEnabled: true,
          autoTopUpAmount: 25,
          autoTopUpThreshold: 7,
        }),
      }),
    );
  });
});
