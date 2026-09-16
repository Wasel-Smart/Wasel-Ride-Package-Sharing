import { describe, it, expect, vi, beforeEach } from 'vitest';

// This file exercises walletApi with the edge transport UNCONFIGURED
// (API_URL = ''), which is how the module resolves canUseEdgeApi() at
// import time. It covers the direct-Supabase and local-storage fallback
// tiers. See walletApi.edge.test.ts for the edge-transport-available tier.

vi.mock('../core', () => ({
  API_URL: '',
}));

class MockBackendRequestError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

vi.mock('../backendWorkflow', () => ({
  requestEdgeJson: vi.fn(),
  BackendRequestError: MockBackendRequestError,
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
  canUseLocalWalletStorage: vi.fn(),
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

describe('walletApi — edge transport NOT configured (direct/local tiers)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
    walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
  });

  describe('getWalletCapabilities', () => {
    it('reports edge-gated capabilities as false, always-available ones as true', () => {
      const caps = getWalletCapabilities();
      expect(caps).toEqual({
        topUp: false, rewardClaim: false, subscription: false, pin: false,
        send: true, withdraw: true, autoTopUp: true,
      });
    });
  });

  describe('getWallet', () => {
    it('falls back to direct Supabase when allowed, and sanitizes the result', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletDirectMocks.fetchWalletDirect.mockResolvedValue(
        makeWallet({ transactions: [{ id: 't1', type: 'wallet', description: '<script>alert(1)</script>', amount: 5, createdAt: '2026-01-01' }] }),
      );

      const wallet = await walletApi.getWallet('user-123');

      expect(walletDirectMocks.fetchWalletDirect).toHaveBeenCalledWith('user-123');
      expect(wallet.transactions[0].description).toBe(
        '&lt;script&gt;alert(1)&lt;/script&gt;',
      );
    });

    it('throws when direct fallback is disabled and local storage is unavailable', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(false);

      await expect(walletApi.getWallet('user-123')).rejects.toThrow(
        'Secure API is not configured and direct database access is disabled for this environment.',
      );
    });

    it('falls back to local storage as a last resort, but does NOT re-run sanitization on it', async () => {
      // NOTE: this documents current behavior, not a spec — see chat summary.
      // getWallet()'s catch-branch returns fetchWalletLocal(userId) directly,
      // bypassing the sanitizeWalletData() call that the edge/direct tiers get.
      // walletLocalStorage's own describeTransaction() does call sanitizeHtml
      // on user-supplied labels, so this isn't a raw XSS hole — but it means
      // the two tiers are sanitized through two different code paths.
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      const localWallet = makeWallet();
      walletLocalMocks.fetchWalletLocal.mockResolvedValue(localWallet);

      const wallet = await walletApi.getWallet('user-123');

      expect(walletLocalMocks.fetchWalletLocal).toHaveBeenCalledWith('user-123');
      expect(wallet).toBe(localWallet);
    });
  });

  describe('topUp', () => {
    it('always throws a clear, actionable error when the edge backend is not configured', async () => {
      await expect(walletApi.topUp('user-123', 25, 'card')).rejects.toThrow(
        'Secure wallet top-up is unavailable because the checkout backend is not configured. Deploy the wallet edge function and configure Stripe server secrets before adding funds.',
      );
    });
  });

  describe('setPin / verifyPin / claimReward', () => {
    it('setPin throws when the edge backend is not configured', async () => {
      await expect(walletApi.setPin('user-123', '1234')).rejects.toThrow(
        'Wallet PIN management requires the wallet backend.',
      );
    });

    it('verifyPin throws when the edge backend is not configured', async () => {
      await expect(walletApi.verifyPin('user-123', '1234')).rejects.toThrow(
        'Wallet PIN verification requires the wallet backend.',
      );
    });

    it('claimReward throws when the edge backend is not configured', async () => {
      await expect(walletApi.claimReward('user-123', 'reward-1')).rejects.toThrow(
        'Reward claiming requires the wallet backend.',
      );
    });
  });

  describe('withdraw', () => {
    it('routes to direct Supabase when fallback is allowed', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const result = makeWallet({ balance: 75 });
      walletDirectMocks.withdrawWalletFundsDirect.mockResolvedValue(result);

      const out = await walletApi.withdraw('user-123', 25, 'JO00BANK123', 'bank_transfer');

      expect(walletDirectMocks.withdrawWalletFundsDirect).toHaveBeenCalledWith(
        'user-123', 25, 'JO00BANK123', 'bank_transfer',
      );
      expect(out).toBe(result);
    });

    it('throws when direct fallback is disabled', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
      await expect(walletApi.withdraw('user-123', 25, 'JO00BANK123')).rejects.toThrow(
        'Secure API is not configured and direct database access is disabled for this environment.',
      );
      expect(walletDirectMocks.withdrawWalletFundsDirect).not.toHaveBeenCalled();
    });
  });

  describe('sendMoney', () => {
    it('wraps the direct transfer result in the expected { success, note, wallet } shape', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const updatedWallet = makeWallet({ balance: 50 });
      walletDirectMocks.transferWalletFundsDirect.mockResolvedValue(updatedWallet);

      const out = await walletApi.sendMoney('user-123', 'user-456', 30, 'lunch money');

      expect(walletDirectMocks.transferWalletFundsDirect).toHaveBeenCalledWith('user-123', 'user-456', 30);
      expect(out).toEqual({ success: true, note: 'lunch money', wallet: updatedWallet });
    });
  });

  describe('getInsights', () => {
    it('builds insights from direct transaction rows when the edge backend is unavailable', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const rows = [{ transaction_id: 't1', amount: 10, direction: 'debit' }];
      walletDirectMocks.getWalletTransactionRows.mockResolvedValue(rows);
      walletLocalMocks.buildInsightsFromTransactions.mockReturnValue({ totalTransactions: 1 });

      const insights = await walletApi.getInsights('user-123');

      expect(walletDirectMocks.getWalletTransactionRows).toHaveBeenCalledWith('user-123');
      expect(walletLocalMocks.buildInsightsFromTransactions).toHaveBeenCalledWith(rows);
      expect(insights).toEqual({ totalTransactions: 1 });
    });

    it('falls all the way through to local transactions if the direct query itself fails', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      walletDirectMocks.getWalletTransactionRows.mockRejectedValue(new Error('db unreachable'));
      const localWallet = makeWallet({ transactions: [{ id: 'l1', type: 'wallet', description: 'x', amount: 1, createdAt: '2026-01-01' }] });
      walletLocalMocks.fetchWalletLocal.mockResolvedValue(localWallet);
      walletLocalMocks.buildInsightsFromTransactions.mockReturnValue({ totalTransactions: 1 });

      const insights = await walletApi.getInsights('user-123');

      expect(walletLocalMocks.fetchWalletLocal).toHaveBeenCalledWith('user-123');
      expect(walletLocalMocks.buildInsightsFromTransactions).toHaveBeenCalledWith(localWallet.transactions);
      expect(insights).toEqual({ totalTransactions: 1 });
    });

    it('propagates the error if the direct query fails and local storage is unavailable', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(false);
      walletDirectMocks.getWalletTransactionRows.mockRejectedValue(new Error('db unreachable'));

      await expect(walletApi.getInsights('user-123')).rejects.toThrow('db unreachable');
    });
  });

  describe('setAutoTopUp', () => {
    it('falls back to local storage when the direct update fails', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      walletDirectMocks.updateWalletPreferencesDirect.mockRejectedValue(new Error('rls denied'));
      const localResult = makeWallet({ autoTopUp: true });
      walletLocalMocks.setAutoTopUpLocal.mockResolvedValue(localResult);

      const out = await walletApi.setAutoTopUp('user-123', true, 30, 10);

      expect(walletLocalMocks.setAutoTopUpLocal).toHaveBeenCalledWith('user-123', true, 30, 10);
      expect(out).toBe(localResult);
    });

    it('propagates the direct error when local storage is unavailable (no silent swallow)', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(false);
      walletDirectMocks.updateWalletPreferencesDirect.mockRejectedValue(new Error('rls denied'));

      await expect(walletApi.setAutoTopUp('user-123', true, 30, 10)).rejects.toThrow('rls denied');
    });
  });

  describe('payment methods', () => {
    it('addPaymentMethod falls back to local storage when the direct insert fails', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      walletDirectMocks.addPaymentMethodDirect.mockRejectedValue(new Error('insert failed'));
      const localMethod = { id: 'local-pm-1', type: 'card', provider: 'stripe' };
      walletLocalMocks.addPaymentMethodLocal.mockResolvedValue(localMethod);

      const out = await walletApi.addPaymentMethod('user-123', { type: 'card', provider: 'stripe' });

      expect(walletLocalMocks.addPaymentMethodLocal).toHaveBeenCalled();
      expect(out).toBe(localMethod);
    });

    it('deletePaymentMethod calls direct deletion when fallback is allowed', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletDirectMocks.deletePaymentMethodDirect.mockResolvedValue({ success: true });

      const out = await walletApi.deletePaymentMethod('user-123', 'pm-1');

      expect(walletDirectMocks.deletePaymentMethodDirect).toHaveBeenCalledWith('user-123', 'pm-1');
      expect(out).toEqual({ success: true });
    });
  });

  describe('pay', () => {
    it('routes checkout payment through the direct wallet-payment RPC wrapper', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const paidWallet = makeWallet({ balance: 70 });
      walletDirectMocks.payWithWalletDirect.mockResolvedValue(paidWallet);

      const out = await walletApi.pay('user-123', 30, 'ride_booking', 'trip-1', { note: 'fare' });

      expect(walletDirectMocks.payWithWalletDirect).toHaveBeenCalledWith({
        userId: 'user-123', amount: 30, referenceType: 'ride_booking', referenceId: 'trip-1', metadata: { note: 'fare' },
      });
      expect(out).toBe(paidWallet);
    });
  });

  describe('getTrustScore', () => {
    it('falls back to the local trust score when the direct query fails', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      walletDirectMocks.getTrustScoreDirect.mockRejectedValue(new Error('unreachable'));
      const localScore = { totalTrips: 0, cashRating: 5, onTimePayments: 98, deposit: 100 };
      walletLocalMocks.getTrustScoreLocal.mockResolvedValue(localScore);

      const out = await walletApi.getTrustScore('user-123');

      expect(out).toBe(localScore);
    });
  });
});
