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

import {
  __resetWalletApiCachesForTests,
  requestWalletVerification,
  walletApi,
} from '../../../src/services/walletApi';

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

function getRequestBody(callIndex: number) {
  const [, options] = mockFetchWithRetry.mock.calls[callIndex] as [string, { body?: string }];
  return JSON.parse(options.body ?? '{}');
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
  ],
  activeEscrows: [],
  activeRewards: [],
  subscription: null,
};

describe('walletApi secure backend flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetWalletApiCachesForTests();
    window.localStorage.clear();
  });

  it('loads wallet data only from the secure edge API', async () => {
    mockFetchWithRetry.mockResolvedValueOnce(await jsonResponse(walletPayload));

    const snapshot = await walletApi.getWalletSnapshot('user-123');

    expect(snapshot.data.balance).toBe(125.5);
    expect(snapshot.meta.source).toBe('edge-api');
    expect(snapshot.meta.degraded).toBe(false);
    expect(mockFetchWithRetry).toHaveBeenCalledWith(
      'https://api.wasel.test/wallet',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('fails closed when the wallet API is temporarily unavailable', async () => {
    mockFetchWithRetry.mockRejectedValueOnce(new Error('network down'));

    await expect(walletApi.getWalletSnapshot('user-123')).rejects.toThrow(
      'Wallet data is unavailable right now. Please try again.',
    );
    expect(window.localStorage.length).toBe(0);
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
      }),
    );
    expect(getRequestBody(0)).toEqual({
      amount: 25,
      idempotencyKey: null,
      metadata: {},
      paymentMethodType: 'card',
      purpose: 'deposit',
      referenceId: null,
      referenceType: null,
    });
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
      }),
    );
    expect(getRequestBody(1)).toEqual({
      amount: 20,
      note: 'Ride split',
      recipientUserId: 'user-456',
      verificationToken: 'step-up-token',
    });
  });
});
