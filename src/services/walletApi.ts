/**
 * Wallet API Service
 * Uses the shared edge-function base when available and falls back to direct
 * Supabase reads/RPCs so the wallet stays connected to persisted backend data.
 */

import { API_URL, supabase } from './core';
import { BackendRequestError, requestEdgeJson } from './backendWorkflow';

const WALLET_API_BASE = API_URL ? `${API_URL}/wallet` : '';
const LOCAL_WALLET_KEY = 'wasel-wallet-local-v1';
const LOCAL_AUTH_USER_KEY = 'wasel_local_user_v2';

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
}

export interface WalletSubscription {
  id: string;
  status: string;
  plan: string;
  stripeCustomerId?: string | null;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
  trialStart?: string | null;
  trialEnd?: string | null;
}

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
  subscription: WalletSubscription | null;
}

export interface WalletCapabilities {
  topUp: boolean;
  rewardClaim: boolean;
  subscription: boolean;
  pin: boolean;
  send: boolean;
  withdraw: boolean;
  autoTopUp: boolean;
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
  return Boolean(WALLET_API_BASE);
}

type LocalWalletRecord = {
  userId: string;
  balance: number;
  pendingBalance: number;
  currency: string;
  autoTopUpEnabled: boolean;
  autoTopUpAmount: number;
  autoTopUpThreshold: number;
  pinSet: boolean;
  paymentMethods: any[];
  transactions: WalletTransaction[];
  createdAt: string;
  updatedAt: string;
};

function canUseLocalWalletStorage(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function getLocalWalletStorageKey(userId: string): string {
  return `${LOCAL_WALLET_KEY}:${userId}`;
}

function readLocalAuthBalance(userId: string): number {
  if (!canUseLocalWalletStorage()) return 0;

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USER_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { id?: string; balance?: number | string };
    if (parsed?.id !== userId) return 0;
    return toNumber(parsed.balance, 0);
  } catch {
    return 0;
  }
}

function syncLocalAuthBalance(userId: string, balance: number): void {
  if (!canUseLocalWalletStorage()) return;

  try {
    const raw = window.localStorage.getItem(LOCAL_AUTH_USER_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.id !== userId) return;
    parsed.balance = Number(balance.toFixed(2));
    window.localStorage.setItem(LOCAL_AUTH_USER_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore local sync failures.
  }
}

function buildDefaultLocalWalletRecord(userId: string): LocalWalletRecord {
  const now = new Date().toISOString();
  const openingBalance = readLocalAuthBalance(userId);

  return {
    userId,
    balance: openingBalance,
    pendingBalance: 0,
    currency: 'JOD',
    autoTopUpEnabled: false,
    autoTopUpAmount: 20,
    autoTopUpThreshold: 5,
    pinSet: false,
    paymentMethods: [],
    transactions:
      openingBalance > 0
        ? [
            {
              id: `local-wallet-opening-${userId}`,
              type: 'add_funds',
              description: 'Opening wallet balance',
              amount: openingBalance,
              createdAt: now,
              status: 'posted',
            },
          ]
        : [],
    createdAt: now,
    updatedAt: now,
  };
}

function normalizeLocalWalletRecord(userId: string, value: unknown): LocalWalletRecord {
  const fallback = buildDefaultLocalWalletRecord(userId);
  if (!value || typeof value !== 'object') {
    return fallback;
  }

  const record = value as Partial<LocalWalletRecord>;
  return {
    userId,
    balance: toNumber(record.balance, fallback.balance),
    pendingBalance: toNumber(record.pendingBalance, 0),
    currency: String(record.currency ?? fallback.currency).trim().toUpperCase() || 'JOD',
    autoTopUpEnabled: Boolean(record.autoTopUpEnabled),
    autoTopUpAmount: toNumber(record.autoTopUpAmount, 20),
    autoTopUpThreshold: toNumber(record.autoTopUpThreshold, 5),
    pinSet: Boolean(record.pinSet),
    paymentMethods: Array.isArray(record.paymentMethods) ? record.paymentMethods : [],
    transactions: Array.isArray(record.transactions)
      ? record.transactions.map(tx => ({
          id: String(tx.id ?? `local-wallet-tx-${Date.now()}`),
          type: String(tx.type ?? 'wallet'),
          description: String(tx.description ?? 'Wallet transaction'),
          amount: toNumber(tx.amount, 0),
          createdAt: String(tx.createdAt ?? fallback.updatedAt),
          status: tx.status ? String(tx.status) : 'posted',
        }))
      : fallback.transactions,
    createdAt: String(record.createdAt ?? fallback.createdAt),
    updatedAt: String(record.updatedAt ?? fallback.updatedAt),
  };
}

function readLocalWalletRecord(userId: string): LocalWalletRecord {
  if (!canUseLocalWalletStorage()) {
    return buildDefaultLocalWalletRecord(userId);
  }

  try {
    const raw = window.localStorage.getItem(getLocalWalletStorageKey(userId));
    if (!raw) {
      return buildDefaultLocalWalletRecord(userId);
    }

    return normalizeLocalWalletRecord(userId, JSON.parse(raw));
  } catch {
    return buildDefaultLocalWalletRecord(userId);
  }
}

function writeLocalWalletRecord(userId: string, record: LocalWalletRecord): LocalWalletRecord {
  const normalized = normalizeLocalWalletRecord(userId, record);
  if (canUseLocalWalletStorage()) {
    window.localStorage.setItem(getLocalWalletStorageKey(userId), JSON.stringify(normalized));
  }
  syncLocalAuthBalance(userId, normalized.balance);
  return normalized;
}

function createLocalWalletTransaction(
  type: string,
  description: string,
  amount: number,
  status = 'posted',
): WalletTransaction {
  return {
    id: `local-wallet-tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    description,
    amount: Number(amount.toFixed(2)),
    createdAt: new Date().toISOString(),
    status,
  };
}

function buildWalletPayloadFromLocal(record: LocalWalletRecord): WalletData {
  const transactions = [...record.transactions].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const totalEarned = transactions
    .filter(tx => tx.amount > 0)
    .reduce((total, tx) => total + tx.amount, 0);
  const totalSpent = transactions
    .filter(tx => tx.amount < 0)
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const totalDeposited = transactions
    .filter(tx => tx.type === 'add_funds' && tx.amount > 0)
    .reduce((total, tx) => total + tx.amount, 0);

  return {
    wallet: {
      id: `local-wallet-${record.userId}`,
      userId: record.userId,
      walletType: 'user',
      status: 'active',
      currency: record.currency,
      autoTopUp: record.autoTopUpEnabled,
      autoTopUpAmount: record.autoTopUpAmount,
      autoTopUpThreshold: record.autoTopUpThreshold,
      paymentMethods: record.paymentMethods,
      createdAt: record.createdAt,
    },
    balance: Number(record.balance.toFixed(2)),
    pendingBalance: Number(record.pendingBalance.toFixed(2)),
    rewardsBalance: 0,
    total_earned: Number(totalEarned.toFixed(2)),
    total_spent: Number(totalSpent.toFixed(2)),
    total_deposited: Number(totalDeposited.toFixed(2)),
    currency: record.currency,
    pinSet: record.pinSet,
    autoTopUp: record.autoTopUpEnabled,
    transactions,
    activeEscrows: [],
    activeRewards: [],
    subscription: null,
  };
}

function updateLocalWalletRecord(
  userId: string,
  updater: (current: LocalWalletRecord) => LocalWalletRecord,
): WalletData {
  const current = readLocalWalletRecord(userId);
  const next = updater(current);
  const persisted = writeLocalWalletRecord(userId, {
    ...next,
    userId,
    updatedAt: new Date().toISOString(),
  });
  return buildWalletPayloadFromLocal(persisted);
}

async function fetchWalletLocal(userId: string): Promise<WalletData> {
  return buildWalletPayloadFromLocal(writeLocalWalletRecord(userId, readLocalWalletRecord(userId)));
}

async function sendMoneyLocal(
  userId: string,
  recipientId: string,
  amount: number,
  note?: string,
): Promise<{ success: true; note?: string; wallet: WalletData }> {
  const wallet = updateLocalWalletRecord(userId, current => {
    if (current.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    return {
      ...current,
      balance: current.balance - amount,
      transactions: [
        createLocalWalletTransaction(
          'transfer_funds',
          note?.trim() || `Wallet transfer sent to ${recipientId}`,
          -Math.abs(amount),
        ),
        ...current.transactions,
      ],
    };
  });

  return {
    success: true,
    note,
    wallet,
  };
}

async function withdrawWalletFundsLocal(
  userId: string,
  amount: number,
  bankAccount: string,
  method: string,
): Promise<WalletData> {
  return updateLocalWalletRecord(userId, current => {
    if (current.balance < amount) {
      throw new Error('Insufficient wallet balance');
    }

    return {
      ...current,
      balance: current.balance - amount,
      transactions: [
        createLocalWalletTransaction(
          'withdrawal',
          `Withdrawal to ${bankAccount} via ${method}`,
          -Math.abs(amount),
        ),
        ...current.transactions,
      ],
    };
  });
}

async function setAutoTopUpLocal(
  userId: string,
  enabled: boolean,
  amount: number,
  threshold: number,
): Promise<WalletData> {
  return updateLocalWalletRecord(userId, current => ({
    ...current,
    autoTopUpEnabled: enabled,
    autoTopUpAmount: amount,
    autoTopUpThreshold: threshold,
  }));
}

async function getPaymentMethodsLocal(userId: string): Promise<{ methods: any[] }> {
  const wallet = readLocalWalletRecord(userId);
  return {
    methods: Array.isArray(wallet.paymentMethods) ? wallet.paymentMethods : [],
  };
}

async function addPaymentMethodLocal(
  userId: string,
  method: { type: string; provider: string; [key: string]: any },
): Promise<any> {
  const nextMethod = {
    ...method,
    id: method.id ?? `local-payment-method-${Date.now()}`,
    type: method.type,
    provider: method.provider,
    is_default: Boolean(method.is_default),
    status: 'active',
  };

  updateLocalWalletRecord(userId, current => ({
    ...current,
    paymentMethods: [
      nextMethod,
      ...current.paymentMethods.filter(item => item?.id !== nextMethod.id),
    ],
  }));

  return nextMethod;
}

async function deletePaymentMethodLocal(userId: string, methodId: string): Promise<{ success: true }> {
  updateLocalWalletRecord(userId, current => ({
    ...current,
    paymentMethods: current.paymentMethods.filter(item => item?.id !== methodId),
  }));

  return { success: true };
}

async function setWalletPinLocal(userId: string): Promise<{ success: true }> {
  updateLocalWalletRecord(userId, current => ({
    ...current,
    pinSet: true,
  }));

  return { success: true };
}

async function verifyWalletPinLocal(userId: string, pin: string): Promise<{ success: boolean }> {
  const wallet = readLocalWalletRecord(userId);
  return { success: wallet.pinSet && /^\d{4}$/.test(pin) };
}

async function getTrustScoreLocal(
  userId: string,
): Promise<{ totalTrips: number; cashRating: number; onTimePayments: number; deposit: number }> {
  const wallet = await fetchWalletLocal(userId);
  return {
    totalTrips: 0,
    cashRating: 5,
    onTimePayments: 98,
    deposit: wallet.balance,
  };
}

export function getWalletCapabilities(): WalletCapabilities {
  const secureEdgeReady = canUseEdgeApi();

  return {
    topUp: secureEdgeReady,
    rewardClaim: secureEdgeReady,
    subscription: secureEdgeReady,
    pin: secureEdgeReady,
    send: true,
    withdraw: true,
    autoTopUp: true,
  };
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
  const code = String(wallet?.currency_code ?? 'JOD')
    .trim()
    .toUpperCase();
  return code || 'JOD';
}

function describeTransaction(row: TransactionRow): string {
  const metadataLabel =
    typeof row.metadata?.description === 'string'
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

  const thisMonth = transactions.filter(tx => tx.createdAt.startsWith(currentMonthKey));
  const lastMonth = transactions.filter(tx => tx.createdAt.startsWith(previousMonthKey));

  const thisMonthSpent = thisMonth
    .filter(tx => tx.amount < 0)
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const lastMonthSpent = lastMonth
    .filter(tx => tx.amount < 0)
    .reduce((total, tx) => total + Math.abs(tx.amount), 0);
  const thisMonthEarned = thisMonth
    .filter(tx => tx.amount > 0)
    .reduce((total, tx) => total + tx.amount, 0);

  const changePercent =
    lastMonthSpent > 0
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
    .filter(row => row.transaction_type === 'add_funds' && isCredit(row))
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

  const { data: byId, error } = await db.from('users').select('id').eq('id', userKey).maybeSingle();

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
  const { data, error } = await db.from('wallets').select('*').eq('user_id', userId).maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WalletRow | null) ?? null;
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
  return wallet.transactions.map(tx => ({
    transaction_id: tx.id,
    amount: Math.abs(tx.amount),
    direction: tx.amount < 0 ? 'debit' : 'credit',
    transaction_type: tx.type,
    transaction_status: tx.status,
    created_at: tx.createdAt,
    metadata: { description: tx.description },
  }));
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

async function withdrawWalletFundsDirect(
  userId: string,
  amount: number,
  bankAccount: string,
  method: string,
) {
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

  const { error } = await db.from('transactions').insert({
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
  let { error } = await db.from('wallets').update(patch).eq('user_id', userId);

  if (error) {
    const canonicalUserId = await resolveCanonicalUserId(userId);
    if (canonicalUserId !== userId) {
      const retry = await db.from('wallets').update(patch).eq('user_id', canonicalUserId);
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
  return {
    methods: Array.isArray(wallet.wallet.paymentMethods) ? wallet.wallet.paymentMethods : [],
  };
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

function getWalletPath(userId: string, suffix = ''): string {
  return `/wallet/${userId}${suffix}`;
}

async function requestWalletJson<T>(
  userId: string,
  suffix: string,
  operation: string,
  init?: {
    method?: string;
    body?: unknown;
    headers?: HeadersInit;
    timeout?: number;
    retries?: number;
  },
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

function isWalletTopUpConnectivityError(error: unknown): boolean {
  if (error instanceof BackendRequestError) {
    return error.status === 404;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Route not found') || message.includes('Wallet request failed: 404');
}

function buildWalletTopUpBackendError(): Error {
  return new Error(
    'Secure wallet top-up is unavailable because the checkout backend is not configured. Deploy the wallet edge function and configure Stripe server secrets before adding funds.',
  );
}

function isWalletSubscriptionConnectivityError(error: unknown): boolean {
  if (error instanceof BackendRequestError) {
    return error.status === 404;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes('Route not found') || message.includes('Wallet request failed: 404');
}

function buildWalletSubscriptionBackendError(): Error {
  return new Error(
    'Secure subscription checkout is unavailable because the billing backend is not configured. Deploy the wallet edge function and configure Stripe Billing before subscribing.',
  );
}

async function fetchSubscriptionViaBackend(userId: string): Promise<WalletSubscription | null> {
  const result = await requestWalletJson<{ subscription?: WalletSubscription | null }>(
    userId,
    '/subscription',
    'Load wallet subscription',
  );
  return result.subscription ?? null;
}

export const walletApi = {
  async getWallet(userId: string): Promise<WalletData> {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson<WalletData>(userId, '', 'Load wallet');
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    let wallet: WalletData;
    try {
      wallet = await fetchWalletDirect(userId);
    } catch (error) {
      if (!canUseLocalWalletStorage()) {
        throw error;
      }

      return fetchWalletLocal(userId);
    }

    if (canUseEdgeApi()) {
      try {
        wallet.subscription = await fetchSubscriptionViaBackend(userId);
      } catch {
        // Keep the direct wallet payload if the subscription route is unavailable.
      }
    }

    return wallet;
  },

  async getTransactions(userId: string, page = 1, limit = 20, type?: string) {
    if (canUseEdgeApi()) {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (type) params.set('type', type);
        return await requestWalletJson(
          userId,
          `/transactions?${params.toString()}`,
          'Load wallet transactions',
        );
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    const wallet = canUseLocalWalletStorage()
      ? await fetchWalletDirect(userId).catch(() => fetchWalletLocal(userId))
      : await fetchWalletDirect(userId);
    const filtered = type
      ? wallet.transactions.filter(tx => tx.type === type)
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
        return await requestWalletJson(userId, '/top-up', 'Create wallet top-up', {
          method: 'POST',
          body: { amount, paymentMethod },
        });
      } catch (error) {
        if (isWalletTopUpConnectivityError(error)) {
          throw buildWalletTopUpBackendError();
        }

        throw error;
      }
    }

    throw buildWalletTopUpBackendError();
  },

  async withdraw(userId: string, amount: number, bankAccount: string, method = 'bank_transfer') {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/withdraw', 'Withdraw wallet funds', {
          method: 'POST',
          body: { amount, bankAccount, method },
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    if (canUseLocalWalletStorage()) {
      try {
        return await withdrawWalletFundsDirect(userId, amount, bankAccount, method);
      } catch {
        return withdrawWalletFundsLocal(userId, amount, bankAccount, method);
      }
    }

    return withdrawWalletFundsDirect(userId, amount, bankAccount, method);
  },

  async sendMoney(userId: string, recipientId: string, amount: number, note?: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/send', 'Send wallet funds', {
          method: 'POST',
          body: { recipientId, amount, note },
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    const wallet = canUseLocalWalletStorage()
      ? await transferWalletFundsDirect(userId, recipientId, amount).catch(() =>
          sendMoneyLocal(userId, recipientId, amount, note).then(result => result.wallet),
        )
      : await transferWalletFundsDirect(userId, recipientId, amount);
    return {
      success: true,
      note,
      wallet,
    };
  },

  async getRewards(userId: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/rewards', 'Load wallet rewards');
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return { rewards: [] };
  },

  async claimReward(userId: string, rewardId: string) {
    if (canUseEdgeApi()) {
      return requestWalletJson(userId, '/rewards/claim', 'Claim wallet reward', {
        method: 'POST',
        body: { rewardId },
      });
    }

    throw new Error('Reward claiming requires the wallet backend.');
  },

  async getSubscription(userId: string): Promise<{ subscription: WalletSubscription | null }> {
    if (canUseEdgeApi()) {
      try {
        return { subscription: await fetchSubscriptionViaBackend(userId) };
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return { subscription: null };
  },

  async subscribe(userId: string, planName: string, price: number) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(
          userId,
          '/subscribe',
          'Create wallet subscription checkout',
          {
            method: 'POST',
            body: { planName, price },
          },
        );
      } catch (error) {
        if (isWalletSubscriptionConnectivityError(error)) {
          throw buildWalletSubscriptionBackendError();
        }

        throw error;
      }
    }

    throw buildWalletSubscriptionBackendError();
  },

  async getInsights(userId: string): Promise<InsightsData> {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson<InsightsData>(userId, '/insights', 'Load wallet insights');
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    let rows: TransactionRow[];
    try {
      rows = await getWalletTransactionRows(userId);
    } catch (error) {
      if (!canUseLocalWalletStorage()) {
        throw error;
      }

      const localWallet = await fetchWalletLocal(userId);
      return buildInsightsFromTransactions(localWallet.transactions);
    }

    return buildInsightsFromTransactions(rows.map(toWalletTransaction));
  },

  async setPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) {
      if (canUseLocalWalletStorage()) {
        return setWalletPinLocal(userId);
      }
      throw new Error('Wallet PIN management requires the wallet backend.');
    }

    return requestWalletJson(userId, '/pin/set', 'Set wallet PIN', {
      method: 'POST',
      body: { pin },
    });
  },

  async verifyPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) {
      if (canUseLocalWalletStorage()) {
        return verifyWalletPinLocal(userId, pin);
      }
      throw new Error('Wallet PIN verification requires the wallet backend.');
    }

    return requestWalletJson(userId, '/pin/verify', 'Verify wallet PIN', {
      method: 'POST',
      body: { pin },
    });
  },

  async setAutoTopUp(userId: string, enabled: boolean, amount: number, threshold: number) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/auto-topup', 'Update wallet auto top-up', {
          method: 'POST',
          body: { enabled, amount, threshold },
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    if (canUseLocalWalletStorage()) {
      try {
        return await updateWalletPreferencesDirect(userId, {
          auto_top_up_enabled: enabled,
          auto_top_up_amount: amount,
          auto_top_up_threshold: threshold,
        });
      } catch {
        return setAutoTopUpLocal(userId, enabled, amount, threshold);
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
        return await requestWalletJson<{ methods: any[] }>(
          userId,
          '/payment-methods',
          'Load wallet payment methods',
        );
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    if (canUseLocalWalletStorage()) {
      try {
        return await getPaymentMethodsDirect(userId);
      } catch {
        return getPaymentMethodsLocal(userId);
      }
    }

    return getPaymentMethodsDirect(userId);
  },

  async addPaymentMethod(
    userId: string,
    method: { type: string; provider: string; [key: string]: any },
  ) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/payment-methods', 'Add wallet payment method', {
          method: 'POST',
          body: method,
        });
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    if (canUseLocalWalletStorage()) {
      try {
        return await addPaymentMethodDirect(userId, method);
      } catch {
        return addPaymentMethodLocal(userId, method);
      }
    }

    return addPaymentMethodDirect(userId, method);
  },

  async deletePaymentMethod(userId: string, methodId: string) {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(
          userId,
          `/payment-methods/${methodId}`,
          'Delete wallet payment method',
          {
            method: 'DELETE',
          },
        );
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    if (canUseLocalWalletStorage()) {
      try {
        return await deletePaymentMethodDirect(userId, methodId);
      } catch {
        return deletePaymentMethodLocal(userId, methodId);
      }
    }

    return deletePaymentMethodDirect(userId, methodId);
  },

  async getTrustScore(
    userId: string,
  ): Promise<{ totalTrips: number; cashRating: number; onTimePayments: number; deposit: number }> {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson(userId, '/trust-score', 'Load wallet trust score');
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    if (canUseLocalWalletStorage()) {
      try {
        return await getTrustScoreDirect(userId);
      } catch {
        return getTrustScoreLocal(userId);
      }
    }

    return getTrustScoreDirect(userId);
  },
};
