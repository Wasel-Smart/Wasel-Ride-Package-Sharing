/**
 * Wallet API — public facade.
 *
 * Strategy (edge → direct → local):
 *  1. Edge Function (production, authenticated)
 *  2. Direct Supabase (dev / fallback when allowDirectSupabaseFallback=true)
 *  3. localStorage (offline / cold-start last resort)
 */

import { API_URL } from '../core';
import { BackendRequestError, requestEdgeJson } from '../backendWorkflow';
import { getConfig } from '../../utils/env';
import {
  canUseLocalWalletStorage,
  fetchWalletLocal,
  setAutoTopUpLocal,
  getPaymentMethodsLocal,
  addPaymentMethodLocal,
  deletePaymentMethodLocal,
  getTrustScoreLocal,
  buildInsightsFromTransactions,
  toWalletTransaction,
} from './walletLocalStorage';
import {
  fetchWalletDirect,
  getWalletTransactionRows,
  transferWalletFundsDirect,
  withdrawWalletFundsDirect,
  updateWalletPreferencesDirect,
  getPaymentMethodsDirect,
  addPaymentMethodDirect,
  deletePaymentMethodDirect,
  getTrustScoreDirect,
  payWithWalletDirect,
} from './walletDirect';
import type {
  InsightsData,
  PaymentMethodInput,
  PaymentMethodRow,
  WalletCapabilities,
  WalletData,
  WalletSubscription,
} from './walletTypes';

// Re-export types so existing import sites keep working.
export type {
  InsightsData,
  PaymentMethodInput,
  PaymentMethodRow,
  WalletCapabilities,
  WalletData,
  WalletEscrow,
  WalletSubscription,
  WalletSummary,
  WalletTransaction,
  RewardItem,
} from './walletTypes';

const WALLET_API_BASE = API_URL ? `${API_URL}/wallet` : '';

function canUseEdgeApi(): boolean {
  return Boolean(WALLET_API_BASE);
}

async function tryEdgeThenDirect<T>(edgeFn: () => Promise<T>, directFn: () => Promise<T>): Promise<T> {
  const { allowDirectSupabaseFallback } = getConfig();

  if (canUseEdgeApi()) {
    try {
      return await edgeFn();
    } catch (edgeError) {
      if (!allowDirectSupabaseFallback) throw edgeError;
    }
  }

  if (allowDirectSupabaseFallback) return directFn();

  throw new Error('Secure API is not configured and direct database access is disabled for this environment.');
}

function getWalletPath(userId: string, suffix = ''): string {
  return `/wallet/${userId}${suffix}`;
}

async function requestWalletJson<T>(
  userId: string,
  suffix: string,
  operation: string,
  init?: { method?: string; body?: unknown; headers?: HeadersInit; timeout?: number; retries?: number },
): Promise<T> {
  return requestEdgeJson<T>({
    path: getWalletPath(userId, suffix),
    operation,
    authMode: 'required',
    method: init?.method,
    body: init?.body,
    headers: init?.headers,
    timeout: init?.timeout,
    retries: init?.retries,
  });
}

function isConnectivityError(error: unknown): boolean {
  if (error instanceof BackendRequestError) return error.status === 404;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Route not found') || message.includes('request failed: 404');
}

async function fetchSubscriptionViaBackend(userId: string): Promise<WalletSubscription | null> {
  const result = await requestWalletJson<{ subscription?: WalletSubscription | null }>(
    userId, '/subscription', 'Load wallet subscription',
  );
  return result.subscription ?? null;
}

export function getWalletCapabilities(): WalletCapabilities {
  const secureEdgeReady = canUseEdgeApi();
  return { topUp: secureEdgeReady, rewardClaim: secureEdgeReady, subscription: secureEdgeReady, pin: secureEdgeReady, send: true, withdraw: true, autoTopUp: true };
}

export const walletApi = {
  async getWallet(userId: string): Promise<WalletData> {
    let wallet: WalletData;
    try {
      wallet = await tryEdgeThenDirect(
        () => requestWalletJson<WalletData>(userId, '', 'Load wallet'),
        () => fetchWalletDirect(userId),
      );
    } catch (error) {
      if (!canUseLocalWalletStorage()) throw error;
      return fetchWalletLocal(userId);
    }

    if (canUseEdgeApi()) {
      try { wallet.subscription = await fetchSubscriptionViaBackend(userId); } catch { /* keep direct payload */ }
    }
    return wallet;
  },

  async getTransactions(userId: string, page = 1, limit = 20, type?: string) {
    const edgeFn = () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (type) params.set('type', type);
      return requestWalletJson(userId, `/transactions?${params.toString()}`, 'Load wallet transactions');
    };
    const directFn = async () => {
      const wallet = canUseLocalWalletStorage()
        ? await fetchWalletDirect(userId).catch(() => fetchWalletLocal(userId))
        : await fetchWalletDirect(userId);
      const filtered = type ? wallet.transactions.filter(tx => tx.type === type) : wallet.transactions;
      const start = (page - 1) * limit;
      return { transactions: filtered.slice(start, start + limit), page, limit, total: filtered.length };
    };
    return tryEdgeThenDirect(edgeFn, directFn);
  },

  async topUp(userId: string, amount: number, paymentMethod: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/top-up', 'Create wallet top-up', { method: 'POST', body: { amount, paymentMethod } });
      } catch (error) {
        if (isConnectivityError(error)) throw new Error('Secure wallet top-up is unavailable because the checkout backend is not configured. Deploy the wallet edge function and configure Stripe server secrets before adding funds.');
        throw error;
      }
    }
    throw new Error('Secure wallet top-up is unavailable because the checkout backend is not configured. Deploy the wallet edge function and configure Stripe server secrets before adding funds.');
  },

  async withdraw(userId: string, amount: number, bankAccount: string, method = 'bank_transfer') {
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/withdraw', 'Withdraw wallet funds', { method: 'POST', body: { amount, bankAccount, method } }),
      () => withdrawWalletFundsDirect(userId, amount, bankAccount, method),
    );
  },

  async sendMoney(userId: string, recipientId: string, amount: number, note?: string) {
    return tryEdgeThenDirect(
      () => requestWalletJson<{ success: boolean; note?: string; wallet: WalletData }>(userId, '/send', 'Send wallet funds', { method: 'POST', body: { recipientId, amount, note } }),
      async () => ({ success: true, note, wallet: await transferWalletFundsDirect(userId, recipientId, amount) }),
    );
  },

  async getRewards(userId: string) {
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/rewards', 'Load wallet rewards'),
      async () => ({ rewards: [] }),
    );
  },

  async claimReward(userId: string, rewardId: string) {
    if (canUseEdgeApi()) return requestWalletJson(userId, '/rewards/claim', 'Claim wallet reward', { method: 'POST', body: { rewardId } });
    throw new Error('Reward claiming requires the wallet backend.');
  },

  async getSubscription(userId: string): Promise<{ subscription: WalletSubscription | null }> {
    return tryEdgeThenDirect(
      async () => ({ subscription: await fetchSubscriptionViaBackend(userId) }),
      async () => ({ subscription: null }),
    );
  },

  async subscribe(userId: string, planName: string, price: number) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/subscribe', 'Create wallet subscription checkout', { method: 'POST', body: { planName, price } });
      } catch (error) {
        if (isConnectivityError(error)) throw new Error('Secure subscription checkout is unavailable because the billing backend is not configured. Deploy the wallet edge function and configure Stripe Billing before subscribing.');
        throw error;
      }
    }
    throw new Error('Secure subscription checkout is unavailable because the billing backend is not configured. Deploy the wallet edge function and configure Stripe Billing before subscribing.');
  },

  async getInsights(userId: string): Promise<InsightsData> {
    const directFn = async () => {
      let rows;
      try {
        rows = await getWalletTransactionRows(userId);
      } catch (error) {
        if (!canUseLocalWalletStorage()) throw error;
        const localWallet = await fetchWalletLocal(userId);
        return buildInsightsFromTransactions(localWallet.transactions);
      }
      return buildInsightsFromTransactions(rows.map(toWalletTransaction));
    };
    return tryEdgeThenDirect(
      () => requestWalletJson<InsightsData>(userId, '/insights', 'Load wallet insights'),
      directFn,
    );
  },

  async setPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) throw new Error('Wallet PIN management requires the wallet backend.');
    return requestWalletJson(userId, '/pin/set', 'Set wallet PIN', { method: 'POST', body: { pin } });
  },

  async verifyPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) throw new Error('Wallet PIN verification requires the wallet backend.');
    return requestWalletJson(userId, '/pin/verify', 'Verify wallet PIN', { method: 'POST', body: { pin } });
  },

  async setAutoTopUp(userId: string, enabled: boolean, amount: number, threshold: number) {
    const patch = { auto_top_up_enabled: enabled, auto_top_up_amount: amount, auto_top_up_threshold: threshold };
    const directFn = async () => {
      if (canUseLocalWalletStorage()) {
        try { return await updateWalletPreferencesDirect(userId, patch); } catch { return setAutoTopUpLocal(userId, enabled, amount, threshold); }
      }
      return updateWalletPreferencesDirect(userId, patch);
    };
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/auto-topup', 'Update wallet auto top-up', { method: 'POST', body: { enabled, amount, threshold } }),
      directFn,
    );
  },

  async getPaymentMethods(userId: string): Promise<{ methods: PaymentMethodRow[] }> {
    const directFn = async () => {
      if (canUseLocalWalletStorage()) {
        try { return await getPaymentMethodsDirect(userId); } catch { return getPaymentMethodsLocal(userId); }
      }
      return getPaymentMethodsDirect(userId);
    };
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/payment-methods', 'Load wallet payment methods'),
      directFn,
    );
  },

  async addPaymentMethod(userId: string, method: PaymentMethodInput) {
    const directFn = async () => {
      if (canUseLocalWalletStorage()) {
        try { return await addPaymentMethodDirect(userId, method); } catch { return addPaymentMethodLocal(userId, method); }
      }
      return addPaymentMethodDirect(userId, method);
    };
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/payment-methods', 'Add wallet payment method', { method: 'POST', body: method }),
      directFn,
    );
  },

  async deletePaymentMethod(userId: string, methodId: string) {
    const directFn = async () => {
      if (canUseLocalWalletStorage()) {
        try { return await deletePaymentMethodDirect(userId, methodId); } catch { return deletePaymentMethodLocal(userId, methodId); }
      }
      return deletePaymentMethodDirect(userId, methodId);
    };
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, `/payment-methods/${methodId}`, 'Delete wallet payment method', { method: 'DELETE' }),
      directFn,
    );
  },

  async pay(userId: string, amount: number, referenceType: string, referenceId?: string, metadata?: Record<string, unknown>) {
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/pay', 'Wallet checkout payment', { method: 'POST', body: { amount, referenceType, referenceId, metadata } }),
      () => payWithWalletDirect(userId, amount, referenceType, referenceId, metadata),
    );
  },

  async getTrustScore(userId: string): Promise<{ totalTrips: number; cashRating: number; onTimePayments: number; deposit: number }> {
    const directFn = async () => {
      if (canUseLocalWalletStorage()) {
        try { return await getTrustScoreDirect(userId); } catch { return getTrustScoreLocal(userId); }
      }
      return getTrustScoreDirect(userId);
    };
    return tryEdgeThenDirect(
      () => requestWalletJson(userId, '/trust-score', 'Load wallet trust score'),
      directFn,
    );
  },
};
