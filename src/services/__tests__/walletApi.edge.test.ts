import { describe, it, expect, vi, beforeEach } from 'vitest';

// Companion to walletApi.test.ts, but with the edge transport CONFIGURED
// (API_URL truthy), since canUseEdgeApi()'s result is fixed at module
// import time via the top-level `WALLET_API_BASE` constant. This file
// covers the edge-first behavior: success paths, sanitization of
// edge-returned data, and the connectivity-error → friendly-message
// conversion used by topUp/subscribe.

vi.mock('../core', () => ({
  API_URL: 'https://api.wasel14.online',
}));

const backendWorkflowMocks = vi.hoisted(() => {
  class MockBackendRequestError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    requestEdgeJson: vi.fn(),
    MockBackendRequestError,
  };
});
vi.mock('../backendWorkflow', () => ({
  requestEdgeJson: (...args: unknown[]) => backendWorkflowMocks.requestEdgeJson(...args),
  BackendRequestError: backendWorkflowMocks.MockBackendRequestError,
}));

const getConfigMock = vi.fn();
vi.mock('../../utils/env', () => ({
  getConfig: () => getConfigMock(),
}));

const walletDirectMocks = vi.hoisted(() => ({
  fetchWalletDirect: vi.fn(),
  getWalletTransactionRows: vi.fn(),
  transferWalletFundsDirect: vi.fn(),
  withdrawWalletFundsDirect: vi.fn(),
  updateWalletPreferencesDirect: vi.fn(),
  getPaymentMethodsDirect: vi.fn(),
  addPaymentMethodDirect: vi.fn(),
  deletePaymentMethodDirect: vi.fn(),
  getTrustScoreDirect: vi.fn(),
  payWithWalletDirect: vi.fn(),
}));
vi.mock('../wallet/walletDirect', () => walletDirectMocks);

const walletLocalMocks = vi.hoisted(() => ({
  canUseLocalWalletStorage: vi.fn(() => false),
  fetchWalletLocal: vi.fn(),
  setAutoTopUpLocal: vi.fn(),
  getPaymentMethodsLocal: vi.fn(),
  addPaymentMethodLocal: vi.fn(),
  deletePaymentMethodLocal: vi.fn(),
  getTrustScoreLocal: vi.fn(),
  buildInsightsFromTransactions: vi.fn(),
  toWalletTransaction: vi.fn((row: unknown) => row),
}));
vi.mock('../wallet/walletLocalStorage', () => walletLocalMocks);

import { walletApi, getWalletCapabilities } from '../wallet/walletApi';
import type { WalletData } from '../wallet/walletTypes';

function makeWallet(overrides: Partial<WalletData> = {}): WalletData {
  return {
    wallet: {
      id: 'w1', userId: 'user-123', status: 'active', currency: 'JOD',
      autoTopUp: false, autoTopUpAmount: 20, autoTopUpThreshold: 5,
      paymentMethods: [], createdAt: null,
    },
    balance: 100, pendingBalance: 0, rewardsBalance: 0,
    total_earned: 0, total_spent: 0, total_deposited: 0,
    currency: 'JOD', pinSet: false, autoTopUp: false,
    transactions: [], activeEscrows: [], activeRewards: [],
    subscription: null,
    ...overrides,
  };
}

describe('walletApi — edge transport configured', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
  });

  describe('getWalletCapabilities', () => {
    it('reports all capabilities as true when the edge backend is ready', () => {
      expect(getWalletCapabilities()).toEqual({
        topUp: true, rewardClaim: true, subscription: true, pin: true,
        send: true, withdraw: true, autoTopUp: true,
      });
    });
  });

  describe('getWallet', () => {
    it('sanitizes transaction and reward descriptions coming back from the edge', async () => {
      requestEdgeJsonMock
        .mockResolvedValueOnce(makeWallet({
          transactions: [{ id: 't1', type: 'wallet', description: '<img src=x onerror=alert(1)>', amount: 5, createdAt: '2026-01-01' }],
          activeRewards: [{ id: 'r1', description: '<b>bonus</b>', amount: 5, expirationDate: '2026-02-01' }],
        }))
        .mockResolvedValueOnce({ subscription: null }); // subscription lookup

      const wallet = await walletApi.getWallet('user-123');

      expect(wallet.transactions[0]!.description).toBe('&lt;img src=x onerror=alert(1)&gt;');
      expect(wallet.activeRewards[0]!.description).toBe('&lt;b&gt;bonus&lt;/b&gt;');
    });

    it('keeps the base wallet payload if the subscription lookup fails', async () => {
      requestEdgeJsonMock
        .mockResolvedValueOnce(makeWallet({ subscription: { id: 'sub1', status: 'active', plan: 'plus' } }))
        .mockRejectedValueOnce(new Error('subscription endpoint down'));

      const wallet = await walletApi.getWallet('user-123');

      expect(wallet.subscription).toEqual({ id: 'sub1', status: 'active', plan: 'plus' });
    });

    it('falls back to direct Supabase when the edge call fails and fallback is allowed', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      requestEdgeJsonMock.mockRejectedValueOnce(new MockBackendRequestError('edge down', 500));
      walletDirectMocks.fetchWalletDirect.mockResolvedValue(makeWallet({ balance: 42 }));

      const wallet = await walletApi.getWallet('user-123');

      expect(walletDirectMocks.fetchWalletDirect).toHaveBeenCalledWith('user-123');
      expect(wallet.balance).toBe(42);
    });
  });

  describe('topUp', () => {
    it('returns the edge result on success', async () => {
      requestEdgeJsonMock.mockResolvedValue({ payment: { checkoutUrl: 'https://checkout.stripe.com/xyz' } });

      const out = await walletApi.topUp('user-123', 25, 'card');

      expect(requestEdgeJsonMock).toHaveBeenCalledWith(expect.objectContaining({
        path: '/v1/wallet/user-123/top-up',
        method: 'POST',
        body: { amount: 25, paymentMethod: 'card' },
      }));
      expect(out).toEqual({ payment: { checkoutUrl: 'https://checkout.stripe.com/xyz' } });
    });

    it('converts a 404 (route-not-found) error into a friendly configuration message', async () => {
      requestEdgeJsonMock.mockRejectedValue(new MockBackendRequestError('not found', 404));

      await expect(walletApi.topUp('user-123', 25, 'card')).rejects.toThrow(
        'Secure wallet top-up is unavailable because the checkout backend is not configured. Deploy the wallet edge function and configure Stripe server secrets before adding funds.',
      );
    });

    it('rethrows non-connectivity errors unchanged (e.g. validation failures)', async () => {
      requestEdgeJsonMock.mockRejectedValue(new Error('Amount exceeds daily limit'));

      await expect(walletApi.topUp('user-123', 5000, 'card')).rejects.toThrow('Amount exceeds daily limit');
    });
  });

  describe('subscribe', () => {
    it('converts a connectivity error into a friendly billing-configuration message', async () => {
      requestEdgeJsonMock.mockRejectedValue(new MockBackendRequestError('not found', 404));

      await expect(walletApi.subscribe('user-123', 'Wasel Plus', 9.99)).rejects.toThrow(
        'Secure subscription checkout is unavailable because the billing backend is not configured. Deploy the wallet edge function and configure Stripe Billing before subscribing.',
      );
    });

    it('rethrows non-connectivity errors unchanged', async () => {
      requestEdgeJsonMock.mockRejectedValue(new Error('Card declined'));
      await expect(walletApi.subscribe('user-123', 'Wasel Plus', 9.99)).rejects.toThrow('Card declined');
    });
  });

  describe('withdraw / sendMoney / pin / reward — edge success paths', () => {
    it('withdraw posts to the edge withdraw endpoint and does not touch direct fallback', async () => {
      requestEdgeJsonMock.mockResolvedValue({ success: true });
      await walletApi.withdraw('user-123', 25, 'JO00BANK123', 'bank_transfer');

      expect(requestEdgeJsonMock).toHaveBeenCalledWith(expect.objectContaining({
        path: '/v1/wallet/user-123/withdraw',
        method: 'POST',
        body: { amount: 25, bankAccount: 'JO00BANK123', method: 'bank_transfer' },
      }));
      expect(walletDirectMocks.withdrawWalletFundsDirect).not.toHaveBeenCalled();
    });

    it('sendMoney returns the edge response as-is (no re-wrapping)', async () => {
      const edgeResult = { success: true, note: 'lunch', wallet: makeWallet({ balance: 70 }) };
      requestEdgeJsonMock.mockResolvedValue(edgeResult);

      const out = await walletApi.sendMoney('user-123', 'user-456', 30, 'lunch');
      expect(out).toBe(edgeResult);
    });

    it('setPin posts the pin to the edge endpoint', async () => {
      requestEdgeJsonMock.mockResolvedValue({ success: true });
      await walletApi.setPin('user-123', '4321');

      expect(requestEdgeJsonMock).toHaveBeenCalledWith(expect.objectContaining({
        path: '/v1/wallet/user-123/pin/set',
        method: 'POST',
        body: { pin: '4321' },
      }));
    });

    it('claimReward posts to the edge rewards/claim endpoint', async () => {
      requestEdgeJsonMock.mockResolvedValue({ success: true });
      await walletApi.claimReward('user-123', 'reward-1');

      expect(requestEdgeJsonMock).toHaveBeenCalledWith(expect.objectContaining({
        path: '/v1/wallet/user-123/rewards/claim',
        method: 'POST',
        body: { rewardId: 'reward-1' },
      }));
    });
  });

  describe('getInsights', () => {
    it('calls the edge insights endpoint directly without touching direct/local tiers', async () => {
      requestEdgeJsonMock.mockResolvedValue({ totalTransactions: 3 });

      const out = await walletApi.getInsights('user-123');

      expect(requestEdgeJsonMock).toHaveBeenCalledWith(expect.objectContaining({ path: '/v1/wallet/user-123/insights' }));
      expect(walletDirectMocks.getWalletTransactionRows).not.toHaveBeenCalled();
      expect(out).toEqual({ totalTransactions: 3 });
    });
  });
});
