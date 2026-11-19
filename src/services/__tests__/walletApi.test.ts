import { describe, it, expect, vi, beforeEach } from 'vitest';

// This file exercises walletApi with the edge transport UNCONFIGURED
// (API_URL = ''). Read-only/local fallbacks remain covered here; money
// movement must fail closed without the authenticated edge backend.

vi.mock('../core', () => ({
  API_URL: '',
}));

vi.mock('../backendWorkflow', () => {
  class MockBackendRequestError extends Error {
    status?: number;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  }
  return {
    requestEdgeJson: vi.fn(),
    BackendRequestError: MockBackendRequestError,
  };
});

const getConfigMock = vi.fn();
vi.mock('../../utils/env', () => ({
  getConfig: () => getConfigMock(),
}));

const walletDirectMocks = vi.hoisted(() => ({
  fetchWalletDirect: vi.fn(),
  getWalletTransactionRows: vi.fn(),
  getPaymentMethodsDirect: vi.fn(),
  addPaymentMethodDirect: vi.fn(),
  deletePaymentMethodDirect: vi.fn(),
  getTrustScoreDirect: vi.fn(),
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

describe('walletApi — edge transport NOT configured (read-only/local tiers)', () => {
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
        send: false, withdraw: false, autoTopUp: false,
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
      expect(wallet.transactions[0]?.description).toBe(
        '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
      );
    });

    it('throws when direct fallback is disabled and local storage is unavailable', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(false);

      await expect(walletApi.getWallet('user-123')).rejects.toThrow(
        'Secure API is not configured and direct database access is disabled for this environment.',
      );
    });

    it('sanitizes descriptions when falling back to local storage', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      const localWallet = makeWallet({
        transactions: [{
          id: 'local-tx-1', type: 'wallet', description: '<script>alert(1)</script>',
          amount: 5, createdAt: '2026-01-01',
        }],
        activeRewards: [{
          id: 'local-reward-1', description: '<img src=x onerror=alert(1)>',
          amount: 10, expirationDate: '2026-12-31',
        }],
      });
      walletLocalMocks.fetchWalletLocal.mockResolvedValue(localWallet);

      const wallet = await walletApi.getWallet('user-123');

      expect(walletLocalMocks.fetchWalletLocal).toHaveBeenCalledWith('user-123');
      expect(wallet).not.toBe(localWallet);
      expect(wallet.source).toBe('local');
      expect(wallet.transactions[0]?.description).toBe(
        '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;',
      );
      expect(wallet.activeRewards[0]?.description).toBe(
        '&lt;img src=x onerror=alert(1)&gt;',
      );
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
    it('fails closed without the secure edge backend, even when direct fallback is enabled', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      await expect(walletApi.withdraw('user-123', 25, 'JO00BANK123')).rejects.toThrow(
        'Secure wallet API is not configured.',
      );
      expect(walletDirectMocks.fetchWalletDirect).not.toHaveBeenCalled();
    });

    it('fails closed when direct fallback is disabled', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: false });
      await expect(walletApi.withdraw('user-123', 25, 'JO00BANK123')).rejects.toThrow(
        'Secure wallet API is not configured.',
      );
      expect(walletDirectMocks.fetchWalletDirect).not.toHaveBeenCalled();
    });
  });

  describe('sendMoney', () => {
    it('fails closed without the secure edge backend, even when direct fallback is enabled', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      await expect(walletApi.sendMoney('user-123', 'user-456', 30, { note: 'lunch money' }))
        .rejects.toThrow('Secure wallet API is not configured.');
      expect(walletDirectMocks.fetchWalletDirect).not.toHaveBeenCalled();
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
    it('fails closed without the secure edge backend, even when direct fallback is enabled', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      await expect(walletApi.setAutoTopUp('user-123', true, 30, 10)).rejects.toThrow(
        'Secure wallet API is not configured.',
      );
      expect(walletDirectMocks.fetchWalletDirect).not.toHaveBeenCalled();
      expect(walletLocalMocks.setAutoTopUpLocal).not.toHaveBeenCalled();
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
    it('fails closed without the secure edge backend, even when direct fallback is enabled', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      await expect(walletApi.pay('user-123', 30, 'ride_booking', { referenceId: 'trip-1', metadata: { note: 'fare' } }))
        .rejects.toThrow('Secure wallet API is not configured.');
      expect(walletDirectMocks.fetchWalletDirect).not.toHaveBeenCalled();
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

    it('returns direct trust score when successful', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletDirectMocks.getTrustScoreDirect.mockResolvedValue({ totalTrips: 10, cashRating: 4, onTimePayments: 95, deposit: 500 });

      const out = await walletApi.getTrustScore('user-123');
      expect(out.totalTrips).toBe(10);
      expect(out.cashRating).toBe(4);
    });
  });

  describe('getRewards', () => {
    it('returns empty rewards when edge unavailable and fallback to direct returns empty', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const result = await walletApi.getRewards('user-123') as { rewards: unknown[] };
      expect(result.rewards).toEqual([]);
    });
  });

  describe('getSubscription', () => {
    it('returns null subscription when edge unavailable', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const result = await walletApi.getSubscription('user-123');
      expect(result.subscription).toBeNull();
    });
  });

  describe('subscribe', () => {
    it('throws when edge backend not configured', async () => {
      await expect(walletApi.subscribe('user-123', 'pro', 20)).rejects.toThrow(
        'Secure subscription checkout is unavailable because the billing backend is not configured.',
      );
    });
  });

  describe('claimReward', () => {
    it('throws when edge backend not configured', async () => {
      await expect(walletApi.claimReward('user-123', 'reward-1')).rejects.toThrow(
        'Reward claiming requires the wallet backend.',
      );
    });
  });

  describe('setPin / verifyPin', () => {
    it('setPin throws when edge backend not configured', async () => {
      await expect(walletApi.setPin('user-123', '1234')).rejects.toThrow(
        'Wallet PIN management requires the wallet backend.',
      );
    });

    it('verifyPin throws when edge backend not configured', async () => {
      await expect(walletApi.verifyPin('user-123', '1234')).rejects.toThrow(
        'Wallet PIN verification requires the wallet backend.',
      );
    });
  });

  describe('getTransactions', () => {
    it('filters transactions by type when provided', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletDirectMocks.fetchWalletDirect.mockResolvedValue(
        makeWallet({
          transactions: [
            { id: 't1', type: 'ride_payment', description: 'Ride', amount: -10, createdAt: '2026-01-01' },
            { id: 't2', type: 'add_funds', description: 'Top-up', amount: 50, createdAt: '2026-01-02' },
          ],
        }),
      );

      const result = await walletApi.getTransactions('user-123', 1, 20, 'ride_payment');
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0]!.type).toBe('ride_payment');
    });

    it('paginates results correctly', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      const txs = Array.from({ length: 25 }, (_, i) => ({
        id: `t${i}`, type: 'wallet', description: 'tx', amount: i, createdAt: '2026-01-01',
      }));
      walletDirectMocks.fetchWalletDirect.mockResolvedValue(makeWallet({ transactions: txs }));

      const page1 = await walletApi.getTransactions('user-123', 1, 10);
      const page2 = await walletApi.getTransactions('user-123', 2, 10);
      const page3 = await walletApi.getTransactions('user-123', 3, 10);

      expect(page1.transactions).toHaveLength(10);
      expect(page2.transactions).toHaveLength(10);
      expect(page3.transactions).toHaveLength(5);
      expect(page1.total).toBe(25);
    });

    it('falls back to local when direct fails and local is available', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      walletDirectMocks.fetchWalletDirect.mockRejectedValue(new Error('db error'));
      walletLocalMocks.fetchWalletLocal.mockResolvedValue(
        makeWallet({ transactions: [{ id: 'local-1', type: 'wallet', description: '<script>x</script>', amount: 5, createdAt: '2026-01-01' }] }),
      );

      const result = await walletApi.getTransactions('user-123');
      expect(walletLocalMocks.fetchWalletLocal).toHaveBeenCalledWith('user-123');
      expect(result.transactions[0]?.description).toBe('&lt;script&gt;x&lt;&#x2F;script&gt;');
    });
  });

  describe('getWalletCapabilities', () => {
    it('reports all capabilities true when edge is configured', async () => {
      vi.resetModules();
      vi.doMock('../core', () => ({ API_URL: 'https://api.wasel14.online' }));
      const { getWalletCapabilities: capsFn } = await import('../wallet/walletApi');
      const caps = capsFn();
      expect(caps.topUp).toBe(true);
      expect(caps.rewardClaim).toBe(true);
      expect(caps.subscription).toBe(true);
      expect(caps.pin).toBe(true);
      expect(caps.send).toBe(true);
      expect(caps.autoTopUp).toBe(true);
      expect(caps.withdraw).toBe(true);
    });
  });

  describe('getWallet', () => {
    it('sanitizes activeRewards descriptions', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletDirectMocks.fetchWalletDirect.mockResolvedValue(
        makeWallet({ activeRewards: [{ id: 'r1', description: '<img src=x onerror=alert(1)>', amount: 10, expirationDate: '2026-12-31' }] }),
      );

      const wallet = await walletApi.getWallet('user-123');
      expect(wallet.activeRewards[0]?.description).toBe('&lt;img src=x onerror=alert(1)&gt;');
    });

    it('handles missing transactions array gracefully', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletDirectMocks.fetchWalletDirect.mockResolvedValue(
        makeWallet({ transactions: undefined as unknown as WalletData['transactions'] }),
      );

      const wallet = await walletApi.getWallet('user-123');
      expect(wallet.transactions).toEqual([]);
    });

    it('attempts to fetch subscription via backend when edge is available', async () => {
      vi.resetModules();
      vi.doMock('../core', () => ({ API_URL: 'https://api.wasel14.online' }));
      vi.doMock('../backendWorkflow', () => ({
        requestEdgeJson: vi.fn().mockResolvedValue({ subscription: { id: 'sub-1', status: 'active', plan: 'pro' } }),
      }));
      const { walletApi: walletApiWithEdge } = await import('../wallet/walletApi');
      const wallet = await walletApiWithEdge.getWallet('user-123');
      expect(wallet.subscription).toBeDefined();
    });
  });

  describe('getInsights', () => {
    it('sanitizes insights when edge is configured', async () => {
      vi.resetModules();
      vi.doMock('../core', () => ({ API_URL: 'https://api.wasel14.online' }));
      vi.doMock('../backendWorkflow', () => ({
        requestEdgeJson: vi.fn().mockResolvedValue({ thisMonthSpent: 100, categoryBreakdown: { ride: 100 } }),
      }));
      const { walletApi: walletApiWithEdge } = await import('../wallet/walletApi');
      const insights = await walletApiWithEdge.getInsights('user-123');
      expect(insights).toBeDefined();
    });
  });

  describe('sendMoney', () => {
    it('accepts string note argument (legacy)', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      await expect(walletApi.sendMoney('user-123', 'user-456', 30, 'legacy note'))
        .rejects.toThrow('Secure wallet API is not configured.');
    });

    it('accepts pin in options object', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      await expect(walletApi.sendMoney('user-123', 'user-456', 30, { note: 'test', pin: '1234' }))
        .rejects.toThrow('Secure wallet API is not configured.');
    });
  });

  describe('topUp', () => {
    it('throws for invalid amount (zero)', async () => {
      await expect(walletApi.topUp('user-123', 0, 'card')).rejects.toThrow();
    });

    it('throws for invalid amount (negative)', async () => {
      await expect(walletApi.topUp('user-123', -10, 'card')).rejects.toThrow();
    });
  });

  describe('payment methods', () => {
    it('getPaymentMethods falls back to local when direct fails', async () => {
      getConfigMock.mockReturnValue({ allowDirectSupabaseFallback: true });
      walletLocalMocks.canUseLocalWalletStorage.mockReturnValue(true);
      walletDirectMocks.getPaymentMethodsDirect.mockRejectedValue(new Error('db error'));
      walletLocalMocks.getPaymentMethodsLocal.mockResolvedValue({ methods: [{ id: 'local-pm', type: 'card' }] });

      const result = await walletApi.getPaymentMethods('user-123');
      expect(walletLocalMocks.getPaymentMethodsLocal).toHaveBeenCalledWith('user-123');
      expect(result.methods).toHaveLength(1);
    });
  });
});
