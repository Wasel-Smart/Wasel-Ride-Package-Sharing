/**
 * Wallet API Service
 * Uses the shared edge-function base when available and falls back to direct
 * Supabase reads/RPCs so the wallet stays connected to persisted backend data.
 */

import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey, supabase } from './core';

const WALLET_API_BASE = API_URL ? `${API_URL}/wallet` : '';

type DbClient = any;

type WalletRow = {
  wallet_id?: string;
  user_id?: string;
  balance?: number | string | null;
  pending_balance?: number | string | null;
  wallet_status?: string | null;
  currency_code?: string | null;
  auto_top_up_enabled?: boolean | null;
  auto_top_up_amount?: number | string | null;
  auto_top_up_threshold?: number | string | null;
  pin_hash?: string | null;
  created_at?: string | null;
};

type TransactionRow = {
  transaction_id?: string;
  amount?: number | string | null;
  direction?: string | null;
  transaction_type?: string | null;
  transaction_status?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PaymentMethodRow = {
  payment_method_id?: string;
  method_type?: string | null;
  provider?: string | null;
  token_reference?: string | null;
  is_default?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type UserRow = {
  id: string;
  auth_user_id?: string | null;
  verification_level?: string | null;
};

export interface WalletSummary {
  id: string | null;
  userId: string | null;
  walletType?: string;
  status: string;
  currency: string;
  autoTopUp: boolean;
  autoTopUpAmount: number;
  autoTopUpThreshold: number;
  paymentMethods: any[];
  createdAt: string | null;
}

type RewardItem = {
  id: string;
  description: string;
  amount: number;
  expirationDate: string;
};

export interface WalletTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  createdAt: string;
  status?: string;
};

export interface WalletData {
  wallet: WalletSummary;
  balance: number;
  pendingBalance: number;
  rewardsBalance: number;
  total_earned: number;
  total_spent: number;
  total_deposited: number;
  currency: string;
  pinSet: boolean;
  autoTopUp: boolean;
  transactions: WalletTransaction[];
  activeEscrows: any[];
  activeRewards: RewardItem[];
  subscription: any | null;
}

export interface InsightsData {
  thisMonthSpent: number;
  lastMonthSpent: number;
  thisMonthEarned: number;
  changePercent: number;
  categoryBreakdown: Record<string, number>;
  monthlyTrend: { month: string; spent: number; earned: number }[];
  totalTransactions: number;
  carbonSaved: number;
}

function getDb(): DbClient {
  if (!supabase) {
    throw new Error('Supabase client is not initialised');
  }

  return supabase as DbClient;
}

function canUseEdgeApi(): boolean {
  return Boolean(WALLET_API_BASE && publicAnonKey);
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePaymentMethod(method: string): string {
  switch (method) {
    case 'card':
      return 'card';
    case 'apple_pay':
      return 'apple_pay';
    case 'google_pay':
      return 'google_pay';
    case 'bank_transfer':
    case 'instant':
      return 'bank_transfer';
    case 'cliq':
      return 'wallet';
    default:
      return 'card';
  }
}

function currencyFromWallet(wallet: WalletRow | null): string {
  const code = String(wallet?.currency_code ?? 'JOD').trim().toUpperCase();
  return code || 'JOD';
}

function describeTransaction(row: TransactionRow): string {
  const metadataLabel = typeof row.metadata?.description === 'string'
    ? row.metadata.description
    : typeof row.metadata?.note === 'string'
      ? row.metadata.note
      : '';

  if (metadataLabel) {
    return metadataLabel;
  }

  switch (row.transaction_type) {
    case 'add_funds':
      return 'Wallet top-up';
    case 'transfer_funds':
      return row.direction === 'credit' ? 'Wallet transfer received' : 'Wallet transfer sent';
    case 'withdrawal':
      return 'Wallet withdrawal';
    case 'driver_earning':
      return 'Driver earnings';
    case 'ride_payment':
      return 'Ride payment';
    case 'package_payment':
      return 'Package payment';
    default:
      return 'Wallet transaction';
  }
}

function toWalletTransaction(row: TransactionRow): WalletTransaction {
  const amount = toNumber(row.amount, 0);
  const signedAmount = row.direction === 'debit' ? -Math.abs(amount) : Math.abs(amount);

  return {
    id: String(row.transaction_id ?? `tx-${Math.random().toString(36).slice(2)}`),
    type: String(row.transaction_type ?? 'wallet'),
    description: describeTransaction(row),
    amount: signedAmount,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    status: row.transaction_status ?? undefined,
  };
}

function isCredit(row: TransactionRow): boolean {
  return row.direction === 'credit';
}

function isDebit(row: TransactionRow): boolean {
  return row.direction === 'debit';
}

function buildInsightsFromTransactions(transactions: WalletTransaction[]): InsightsData {
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousMonthKey = `${previousMonthDate.getUTCFullYear()}-${String(previousMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

  const thisMonth = transactions.filter((tx) => tx.createdAt.startsWith(currentMonthKey));
  const lastMonth = transactions.filter((tx) => tx.createdAt.startsWith(previousMonthKey));

  const thisMonthSpent = thisMonth
    .filter((tx) => tx.amount < 0)
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const lastMonthSpent = lastMonth
    .filter((tx) => tx.amount < 0)
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const thisMonthEarned = thisMonth
    .filter((tx) => tx.amount > 0)
    .reduce((total, tx) => total + tx.amount, 0);

  const changePercent = lastMonthSpent > 0
    ? Number((((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100).toFixed(1))
    : thisMonthSpent > 0
      ? 100
      : 0;

  const categoryBreakdown = transactions.reduce<Record<string, number>>((acc, tx) => {
    const key = tx.type || 'wallet';
    acc[key] = Number(((acc[key] ?? 0) + Math.abs(tx.amount)).toFixed(2));
    return acc;
  }, {});

  const monthlyBuckets = new Map<string, { spent: number; earned: number }>();
  for (const tx of transactions) {
    const date = new Date(tx.createdAt);
    if (Number.isNaN(date.getTime())) continue;
    const label = date.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const existing = monthlyBuckets.get(label) ?? { spent: 0, earned: 0 };
    if (tx.amount < 0) existing.spent += Math.abs(tx.amount);
    if (tx.amount > 0) existing.earned += tx.amount;
    monthlyBuckets.set(label, existing);
  }

  return {
    thisMonthSpent: Number(thisMonthSpent.toFixed(2)),
    lastMonthSpent: Number(lastMonthSpent.toFixed(2)),
    thisMonthEarned: Number(thisMonthEarned.toFixed(2)),
    changePercent,
    categoryBreakdown,
    monthlyTrend: Array.from(monthlyBuckets.entries()).map(([month, bucket]) => ({
      month,
      spent: Number(bucket.spent.toFixed(2)),
      earned: Number(bucket.earned.toFixed(2)),
    })),
    totalTransactions: transactions.length,
    carbonSaved: Math.max(0, Math.round(transactions.length * 1.5)),
  };
}

function buildWalletPayload(
  wallet: WalletRow | null,
  transactions: TransactionRow[],
  paymentMethods: PaymentMethodRow[] = [],
): WalletData {
  const normalizedTransactions = transactions.map(toWalletTransaction);
  const totalEarned = transactions
    .filter(isCredit)
    .reduce((total, row) => total + toNumber(row.amount, 0), 0);
  const totalSpent = transactions
    .filter(isDebit)
    .reduce((total, row) => total + toNumber(row.amount, 0), 0);
  const totalDeposited = transactions
    .filter((row) => row.transaction_type === 'add_funds' && isCredit(row))
    .reduce((total, row) => total + toNumber(row.amount, 0), 0);

  return {
    wallet: {
      id: wallet?.wallet_id ?? null,
      userId: wallet?.user_id ?? null,
      walletType: 'user',
      status: wallet?.wallet_status ?? 'active',
      currency: currencyFromWallet(wallet),
      autoTopUp: Boolean(wallet?.auto_top_up_enabled),
      autoTopUpAmount: toNumber(wallet?.auto_top_up_amount, 20),
      autoTopUpThreshold: toNumber(wallet?.auto_top_up_threshold, 5),
      paymentMethods,
      createdAt: wallet?.created_at ?? null,
    },
    balance: toNumber(wallet?.balance, 0),
    pendingBalance: toNumber(wallet?.pending_balance, 0),
    rewardsBalance: 0,
    total_earned: Number(totalEarned.toFixed(2)),
    total_spent: Number(totalSpent.toFixed(2)),
    total_deposited: Number(totalDeposited.toFixed(2)),
    currency: currencyFromWallet(wallet),
    pinSet: Boolean(wallet?.pin_hash),
    autoTopUp: Boolean(wallet?.auto_top_up_enabled),
    transactions: normalizedTransactions,
    activeEscrows: [],
    activeRewards: [],
    subscription: null,
  };
}

async function resolveCanonicalUserId(userKey: string): Promise<string> {
  const db = getDb();
  const { data: byAuth } = await db
    .from('users')
    .select('id')
    .eq('auth_user_id', userKey)
    .maybeSingle();

  if (byAuth?.id) {
    return String(byAuth.id);
  }

  const { data: byId, error } = await db
    .from('users')
    .select('id')
    .eq('id', userKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (byId?.id) {
    return String(byId.id);
  }

  return userKey;
}

async function findWalletByUserId(userId: string): Promise<WalletRow | null> {
  const db = getDb();
  const { data, error } = await db
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WalletRow | null) ?? null;
}

async function getAuthHeaders() {
  try {
    const { token } = await getAuthDetails();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  } catch {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`,
    };
  }
}

async function fetchWalletDirect(userId: string): Promise<WalletData> {
  const db = getDb();
  let wallet = await findWalletByUserId(userId);
  let walletUserId = userId;

  if (!wallet?.wallet_id) {
    const canonicalUserId = await resolveCanonicalUserId(userId);
    if (canonicalUserId !== userId) {
      wallet = await findWalletByUserId(canonicalUserId);
      walletUserId = canonicalUserId;
    }
  }

  if (!wallet?.wallet_id) {
    throw new Error('Wallet not found');
  }

  const { data: transactions, error: transactionsError } = await db
    .from('transactions')
    .select('*')
    .eq('wallet_id', wallet.wallet_id)
    .order('created_at', { ascending: false });

  if (transactionsError) {
    throw transactionsError;
  }

  const { data: paymentMethods } = await db
    .from('payment_methods')
    .select('*')
    .eq('user_id', walletUserId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  return buildWalletPayload(
    wallet as WalletRow,
    (Array.isArray(transactions) ? transactions.slice(0, 50) : []) as TransactionRow[],
    (Array.isArray(paymentMethods) ? paymentMethods : []) as PaymentMethodRow[],
  );
}

async function getWalletTransactionRows(userId: string): Promise<TransactionRow[]> {
  const wallet = await fetchWalletDirect(userId);
  return wallet.transactions.map((tx) => ({
    transaction_id: tx.id,
    amount: Math.abs(tx.amount),
    direction: tx.amount < 0 ? 'debit' : 'credit',
    transaction_type: tx.type,
    transaction_status: tx.status,
    created_at: tx.createdAt,
    metadata: { description: tx.description },
  }));
}

async function addWalletFundsDirect(userId: string, amount: number, paymentMethod: string) {
  const db = getDb();
  let { error } = await db.rpc('app_add_wallet_funds', {
    p_user_id: userId,
    p_amount: amount,
    p_payment_method: normalizePaymentMethod(paymentMethod),
    p_external_reference: `wallet-topup-${Date.now()}`,
  });

  if (error) {
    const canonicalUserId = await resolveCanonicalUserId(userId);
    if (canonicalUserId !== userId) {
      const retry = await db.rpc('app_add_wallet_funds', {
        p_user_id: canonicalUserId,
        p_amount: amount,
        p_payment_method: normalizePaymentMethod(paymentMethod),
        p_external_reference: `wallet-topup-${Date.now()}`,
      });
      error = retry.error;
    }
  }

  if (error) {
    throw error;
  }

  return fetchWalletDirect(userId);
}

async function transferWalletFundsDirect(userId: string, recipientId: string, amount: number) {
  const db = getDb();
  let { error } = await db.rpc('app_transfer_wallet_funds', {
    p_from_user_id: userId,
    p_to_user_id: recipientId,
    p_amount: amount,
    p_payment_method: 'wallet',
  });

  if (error) {
    const fromCanonicalUserId = await resolveCanonicalUserId(userId);
    const toCanonicalUserId = await resolveCanonicalUserId(recipientId);
    if (fromCanonicalUserId !== userId || toCanonicalUserId !== recipientId) {
      const retry = await db.rpc('app_transfer_wallet_funds', {
        p_from_user_id: fromCanonicalUserId,
        p_to_user_id: toCanonicalUserId,
        p_amount: amount,
        p_payment_method: 'wallet',
      });
      error = retry.error;
    }
  }

  if (error) {
    throw error;
  }

  return fetchWalletDirect(userId);
}

async function withdrawWalletFundsDirect(userId: string, amount: number, bankAccount: string, method: string) {
  const db = getDb();
  let wallet = await findWalletByUserId(userId);
  if (!wallet?.wallet_id) {
    const canonicalUserId = await resolveCanonicalUserId(userId);
    if (canonicalUserId !== userId) {
      wallet = await findWalletByUserId(canonicalUserId);
    }
  }

  if (!wallet?.wallet_id) {
    throw new Error('Wallet not found');
  }

  if (toNumber(wallet.balance, 0) < amount) {
    throw new Error('Insufficient wallet balance');
  }

  const { error } = await db
    .from('transactions')
    .insert({
      wallet_id: wallet.wallet_id,
      amount,
      transaction_type: 'withdrawal',
      payment_method: method === 'instant' ? 'bank_transfer' : normalizePaymentMethod(method),
      transaction_status: 'posted',
      direction: 'debit',
      reference_type: 'bank_account',
      metadata: {
        bank_account: bankAccount,
        requested_via: method,
      },
    });

  if (error) {
    throw error;
  }

  const { error: walletUpdateError } = await db
    .from('wallets')
    .update({ balance: Math.max(toNumber(wallet.balance, 0) - amount, 0) })
    .eq('wallet_id', wallet.wallet_id);

  if (walletUpdateError) {
    throw walletUpdateError;
  }

  return fetchWalletDirect(userId);
}

async function updateWalletPreferencesDirect(
  userId: string,
  patch: Record<string, unknown>,
): Promise<WalletData> {
  const db = getDb();
  let { error } = await db
    .from('wallets')
    .update(patch)
    .eq('user_id', userId);

  if (error) {
    const canonicalUserId = await resolveCanonicalUserId(userId);
    if (canonicalUserId !== userId) {
      const retry = await db
        .from('wallets')
        .update(patch)
        .eq('user_id', canonicalUserId);
      error = retry.error;
    }
  }

  if (error) {
    throw error;
  }

  return fetchWalletDirect(userId);
}

async function getPaymentMethodsDirect(userId: string): Promise<{ methods: any[] }> {
  const wallet = await fetchWalletDirect(userId);
  return { methods: Array.isArray(wallet.wallet.paymentMethods) ? wallet.wallet.paymentMethods : [] };
}

async function addPaymentMethodDirect(
  userId: string,
  method: { type: string; provider: string; [key: string]: any },
) {
  const db = getDb();
  const { data, error } = await db
    .from('payment_methods')
    .insert({
      user_id: userId,
      provider: method.provider,
      method_type: normalizePaymentMethod(method.type),
      token_reference: String(method.token_reference ?? method.last4 ?? `pm-${Date.now()}`),
      is_default: Boolean(method.is_default),
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function deletePaymentMethodDirect(userId: string, methodId: string) {
  const db = getDb();
  let { error } = await db
    .from('payment_methods')
    .delete()
    .eq('payment_method_id', methodId)
    .eq('user_id', userId);

  if (error) {
    const canonicalUserId = await resolveCanonicalUserId(userId);
    if (canonicalUserId !== userId) {
      const retry = await db
        .from('payment_methods')
        .delete()
        .eq('payment_method_id', methodId)
        .eq('user_id', canonicalUserId);
      error = retry.error;
    }
  }

  if (error) {
    throw error;
  }

  return { success: true };
}

async function getTrustScoreDirect(userId: string) {
  const db = getDb();
  const canonicalUserId = await resolveCanonicalUserId(userId);
  const [{ data: user, error: userError }, { data: wallet }, { data: driver }] = await Promise.all([
    db.from('users').select('id, verification_level').eq('id', canonicalUserId).maybeSingle(),
    db.from('wallets').select('balance').eq('user_id', canonicalUserId).maybeSingle(),
    db.from('drivers').select('driver_id').eq('user_id', canonicalUserId).maybeSingle(),
  ]);

  if (userError) {
    throw userError;
  }

  let tripCount = 0;
  if (driver?.driver_id) {
    const { count } = await db
      .from('trips')
      .select('trip_id', { count: 'exact', head: true })
      .eq('driver_id', driver.driver_id);
    tripCount = toNumber(count, 0);
  }

  return {
    totalTrips: tripCount,
    cashRating: 5,
    onTimePayments: user?.verification_level === 'level_0' ? 80 : 98,
    deposit: toNumber(wallet?.balance, 0),
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(path, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Wallet request failed: ${response.status}`);
  }

  return response.json();
}

export const walletApi = {
  async getWallet(userId: string): Promise<WalletData> {
    if (canUseEdgeApi()) {
      try {
        return await requestJson<WalletData>(`${WALLET_API_BASE}/${userId}`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return fetchWalletDirect(userId);
  },

  async getTransactions(userId: string, page = 1, limit = 20, type?: string) {
    if (canUseEdgeApi()) {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (type) params.set('type', type);
        return await requestJson(`${WALLET_API_BASE}/${userId}/transactions?${params.toString()}`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    const wallet = await fetchWalletDirect(userId);
    const filtered = type
      ? wallet.transactions.filter((tx) => tx.type === type)
      : wallet.transactions;
    const start = (page - 1) * limit;
    return {
      transactions: filtered.slice(start, start + limit),
      page,
      limit,
      total: filtered.length,
    };
  },

  async topUp(userId: string, amount: number, paymentMethod: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/top-up`, {
          method: 'POST',
          body: JSON.stringify({ amount, paymentMethod }),
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return addWalletFundsDirect(userId, amount, paymentMethod);
  },

  async withdraw(userId: string, amount: number, bankAccount: string, method = 'bank_transfer') {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/withdraw`, {
          method: 'POST',
          body: JSON.stringify({ amount, bankAccount, method }),
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return withdrawWalletFundsDirect(userId, amount, bankAccount, method);
  },

  async sendMoney(userId: string, recipientId: string, amount: number, note?: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/send`, {
          method: 'POST',
          body: JSON.stringify({ recipientId, amount, note }),
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    const wallet = await transferWalletFundsDirect(userId, recipientId, amount);
    return {
      success: true,
      note,
      wallet,
    };
  },

  async getRewards(userId: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/rewards`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return { rewards: [] };
  },

  async claimReward(userId: string, rewardId: string) {
    if (canUseEdgeApi()) {
      return requestJson(`${WALLET_API_BASE}/${userId}/rewards/claim`, {
        method: 'POST',
        body: JSON.stringify({ rewardId }),
      });
    }

    throw new Error('Reward claiming requires the wallet backend.');
  },

  async getSubscription(userId: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/subscription`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return { subscription: null };
  },

  async subscribe(userId: string, planName: string, price: number) {
    if (canUseEdgeApi()) {
      return requestJson(`${WALLET_API_BASE}/${userId}/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ planName, price }),
      });
    }

    throw new Error('Subscription changes require the wallet backend.');
  },

  async getInsights(userId: string): Promise<InsightsData> {
    if (canUseEdgeApi()) {
      try {
        return await requestJson<InsightsData>(`${WALLET_API_BASE}/${userId}/insights`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    const rows = await getWalletTransactionRows(userId);
    return buildInsightsFromTransactions(rows.map(toWalletTransaction));
  },

  async setPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) {
      throw new Error('Wallet PIN management requires the wallet backend.');
    }

    return requestJson(`${WALLET_API_BASE}/${userId}/pin/set`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  async verifyPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) {
      throw new Error('Wallet PIN verification requires the wallet backend.');
    }

    return requestJson(`${WALLET_API_BASE}/${userId}/pin/verify`, {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  async setAutoTopUp(userId: string, enabled: boolean, amount: number, threshold: number) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/auto-topup`, {
          method: 'POST',
          body: JSON.stringify({ enabled, amount, threshold }),
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return updateWalletPreferencesDirect(userId, {
      auto_top_up_enabled: enabled,
      auto_top_up_amount: amount,
      auto_top_up_threshold: threshold,
    });
  },

  async getPaymentMethods(userId: string): Promise<{ methods: any[] }> {
    if (canUseEdgeApi()) {
      try {
        return await requestJson<{ methods: any[] }>(`${WALLET_API_BASE}/${userId}/payment-methods`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return getPaymentMethodsDirect(userId);
  },

  async addPaymentMethod(userId: string, method: { type: string; provider: string; [key: string]: any }) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/payment-methods`, {
          method: 'POST',
          body: JSON.stringify(method),
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return addPaymentMethodDirect(userId, method);
  },

  async deletePaymentMethod(userId: string, methodId: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/payment-methods/${methodId}`, {
          method: 'DELETE',
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return deletePaymentMethodDirect(userId, methodId);
  },

  async getTrustScore(userId: string): Promise<{ totalTrips: number; cashRating: number; onTimePayments: number; deposit: number }> {
    if (canUseEdgeApi()) {
      try {
        return await requestJson(`${WALLET_API_BASE}/${userId}/trust-score`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return getTrustScoreDirect(userId);
  },
};
