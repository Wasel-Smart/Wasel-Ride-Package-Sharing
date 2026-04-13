import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchWithRetry, mockGetAuthDetails } = vi.hoisted(() => ({
  mockFetchWithRetry: vi.fn(),
  mockGetAuthDetails: vi.fn().mockResolvedValue({ token: 'token-123', userId: 'user-123' }),
}));

vi.mock('../../../src/services/core', () => ({
  API_URL: 'https://api.wasel.test',
  publicAnonKey: 'public-key',
  fetchWithRetry: (...args: unknown[]) => mockFetchWithRetry(...args),
  getAuthDetails: (...args: unknown[]) => mockGetAuthDetails(...args),
}));

import { __resetWalletApiCachesForTests, requestWalletVerification, walletApi } from '../../../src/services/walletApi';

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
    userId: 'user-123',
    walletType: 'custodial',
    status: 'active',
    currency: 'JOD',
    autoTopUp: false,
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
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-01T00:00:00.000Z',
      },
    ],
    createdAt: '2026-04-01T00:00:00.000Z',
  },
  balance: 125.5,
  pendingBalance: 18,
  rewardsBalance: 0,
  total_earned: 24,
  total_spent: 30,
  total_deposited: 140,
  currency: 'JOD',
  pinSet: true,
  autoTopUp: false,
  transactions: [
    {
      id: 'tx-1',
      type: 'deposit',
      description: 'Wallet deposit settled',
      amount: 80,
      createdAt: '2026-04-10T10:00:00.000Z',
      status: 'completed',
    },
    {
      id: 'tx-2',
      type: 'escrow_hold',
      description: 'Ride payment held in escrow',
      amount: -18,
      createdAt: '2026-04-11T10:00:00.000Z',
      status: 'processing',
    },
  ],
  activeEscrows: [
    {
      id: 'esc-1',
      type: 'ride',
      amount: 18,
      tripId: 'trip-1',
      status: 'held',
    },
  ],
  activeRewards: [],
  subscription: null,
};

describe('walletApi secure backend flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetWalletApiCachesForTests();
    window.localStorage.clear();
  });

  it('loads wallet data from the secure edge API and persists a snapshot', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse(walletPayload));

    const snapshot = await walletApi.getWalletSnapshot('user-123');
    const persisted = walletApi.getPersistedWalletSnapshot('user-123');

    expect(snapshot.data.balance).toBe(125.5);
    expect(snapshot.meta.source).toBe('edge-api');
    expect(snapshot.meta.degraded).toBe(false);
    expect(persisted?.data.wallet.paymentMethods).toHaveLength(1);
    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/wallet',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('reuses the last persisted backend snapshot when the wallet API is temporarily unavailable', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse(walletPayload));
    await walletApi.getWalletSnapshot('user-123');
    __resetWalletApiCachesForTests();

    mockFetchWithRetry.mockRejectedValueOnce(new Error('network down'));

    const degradedSnapshot = await walletApi.getWalletSnapshot('user-123');

    expect(degradedSnapshot.data.balance).toBe(125.5);
    expect(degradedSnapshot.meta.degraded).toBe(true);
    expect(degradedSnapshot.meta.source).toBe('edge-api');
  });

  it('creates a deposit payment intent instead of mutating wallet balances on the client', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse({
      id: 'pi-1',
      purpose: 'deposit',
      status: 'requires_action',
      amount: 25,
      currency: 'JOD',
      paymentMethodType: 'card',
      provider: 'stripe',
      clientSecret: 'pi_secret_123',
      createdAt: '2026-04-12T10:00:00.000Z',
    }));

    const intent = await walletApi.topUp('user-123', 25, 'card');

    expect(intent.id).toBe('pi-1');
    expect(intent.status).toBe('requires_action');
    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/payments/create-intent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          purpose: 'deposit',
          amount: 25,
          paymentMethodType: 'card',
          referenceType: null,
          referenceId: null,
          metadata: {},
          idempotencyKey: null,
        }),
      }),
    );
  });

  it('requires step-up verification before sending money and forwards the verification token to the backend', async () => {
    mockFetchWithRetry
      .mockResolvedValueOnce(await jsonResponse({
        purpose: 'transfer',
        verified: true,
        otpRequired: true,
        verificationToken: 'step-up-token',
        expiresAt: '2026-04-12T11:00:00.000Z',
      }))
      .mockResolvedValueOnce(await jsonResponse({ ok: true }));

    const verification = await requestWalletVerification('transfer', '1234');
    await walletApi.sendMoney('user-123', 'user-456', 20, 'Ride split');

    expect(verification.verificationToken).toBe('step-up-token');
    expect(mockFetchWithRetry).toHaveBeenLastCalledWith(
      'https://api.wasel.test/wallet/transfer',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          recipientUserId: 'user-456',
          amount: 20,
          note: 'Ride split',
          verificationToken: 'step-up-token',
        }),
      }),
    );
  });

  it('submits a wallet-funded subscription through the payment-intent and confirm flow', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse(walletPayload));
    await walletApi.getWallet('user-123');
    __resetWalletApiCachesForTests();
    mockFetchWithRetry.mockClear();
    mockFetchWithRetry
      .mockResolvedValueOnce(await jsonResponse(walletPayload))
      .mockResolvedValueOnce(await jsonResponse({
        id: 'pi-sub',
        purpose: 'subscription',
        status: 'requires_confirmation',
        amount: 9.99,
        currency: 'JOD',
        paymentMethodType: 'wallet',
        provider: 'wallet',
        createdAt: '2026-04-12T12:00:00.000Z',
      }))
      .mockResolvedValueOnce(await jsonResponse({
        id: 'pi-sub',
        status: 'succeeded',
        settled: true,
      }));

    const intent = await walletApi.subscribe('user-123', 'Wasel Plus', 9.99, null);

    expect(intent.id).toBe('pi-sub');
    expect(mockFetchWithRetry).toHaveBeenNthCalledWith(
      2,
      'https://api.wasel.test/payments/create-intent',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          purpose: 'subscription',
          amount: 9.99,
          paymentMethodType: 'wallet',
          referenceType: null,
          referenceId: null,
          metadata: {
            planName: 'Wasel Plus',
            planCode: 'wasel-plus',
            corridorId: null,
          },
          idempotencyKey: null,
        }),
      }),
    );
    expect(mockFetchWithRetry).toHaveBeenNthCalledWith(
      3,
      'https://api.wasel.test/payments/confirm',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          paymentIntentId: 'pi-sub',
          paymentMethodId: 'pm-1',
        }),
      }),
    );
  });
});
