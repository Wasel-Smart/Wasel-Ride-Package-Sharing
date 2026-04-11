/**
 * Wallet API Service
 * Uses the shared edge-function base when available and falls back to direct
 * Supabase reads/RPCs so the wallet stays connected to persisted backend data.
 */

import {
  API_URL,
  fetchWithRetry,
  getAuthDetails,
  isEdgeFunctionAvailable,
  publicAnonKey,
  supabase,
} from './core';
import {
  activateWaselPlus,
  getMovementMembershipSnapshot,
  startCommuterPass,
} from './movementMembership';

const WALLET_API_BASE = API_URL ? `${API_URL}/wallet` : '';
const WALLET_EDGE_READ_TIMEOUT_MS = 1_200;
const WALLET_PERSISTED_SNAPSHOT_MAX_AGE_MS = 2 * 60_000;
const WALLET_PERSISTED_SNAPSHOT_STORAGE_PREFIX = 'wasel-wallet-snapshot-v1';

// The generated Supabase database types in this repo are still incomplete for
// wallet/runtime tables and RPCs, so this boundary stays intentionally loose.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = any;
type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

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
  paymentMethods: WalletPaymentMethod[];
  createdAt: string | null;
}

export interface RewardItem {
  id: string;
  description: string;
  amount: number;
  expirationDate: string;
}

export interface WalletTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  createdAt: string;
  status?: string;
};

export interface WalletPaymentMethod {
  id: string;
  type: string;
  provider: string;
  tokenReference: string | null;
  isDefault: boolean;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface WalletEscrow {
  id: string;
  type: string;
  amount: number;
  tripId: string | null;
  status: string | null;
}

export interface WalletSubscription {
  id: string;
  planName: string;
  price: number;
  status: string;
  renewalDate: string | null;
  type?: 'plus' | 'commuter-pass';
  corridorId?: string | null;
  corridorLabel?: string | null;
  benefits?: string[];
}

export interface AddPaymentMethodInput {
  type: string;
  provider: string;
  tokenReference?: string | null;
  last4?: string | null;
  isDefault?: boolean;
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
  activeEscrows: WalletEscrow[];
  activeRewards: RewardItem[];
  subscription: WalletSubscription | null;
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

export interface WalletReliabilityMeta {
  source: 'edge-api' | 'direct-supabase';
  degraded: boolean;
  fetchedAt: string;
}

export interface WalletSnapshot {
  data: WalletData;
  meta: WalletReliabilityMeta;
}

export interface WalletInsightsSnapshot {
  data: InsightsData;
  meta: WalletReliabilityMeta;
}

type PersistedWalletSnapshot = {
  storedAt: number;
  snapshot: WalletSnapshot;
};

function getDb(): DbClient {
  if (!supabase) {
    throw new Error('Supabase client is not initialised');
  }

  return supabase as DbClient;
}

const WALLET_READ_CACHE_TTL_MS = 15_000;
const INSIGHTS_CACHE_TTL_MS = 30_000;
const canonicalUserCache = new Map<string, Promise<string>>();
const walletReadCache = new Map<string, CacheEntry<WalletData>>();
const walletInsightsCache = new Map<string, CacheEntry<InsightsData>>();
const walletReadSnapshotCache = new Map<string, CacheEntry<WalletSnapshot>>();
const walletInsightsSnapshotCache = new Map<string, CacheEntry<WalletInsightsSnapshot>>();

function canUseEdgeApi(): boolean {
  return Boolean(WALLET_API_BASE && publicAnonKey);
}

function canUseEdgeApiForReads(): boolean {
  return canUseEdgeApi() && isEdgeFunctionAvailable();
}

function createWalletReliabilityMeta(source: WalletReliabilityMeta['source'], degraded: boolean): WalletReliabilityMeta {
  return {
    source,
    degraded,
    fetchedAt: new Date().toISOString(),
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

function toWalletPaymentMethod(row: PaymentMethodRow): WalletPaymentMethod {
  return {
    id: String(row.payment_method_id ?? `pm-${Date.now()}`),
    type: String(row.method_type ?? 'card'),
    provider: String(row.provider ?? 'unknown'),
    tokenReference:
      row.token_reference === null || row.token_reference === undefined
        ? null
        : String(row.token_reference),
    isDefault: Boolean(row.is_default),
    status: String(row.status ?? 'inactive'),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
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
  const membership = getMovementMembershipSnapshot();
  const normalizedTransactions = transactions.map(toWalletTransaction);
  const normalizedPaymentMethods = paymentMethods.map(toWalletPaymentMethod);
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
      paymentMethods: normalizedPaymentMethods,
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
    subscription: membership.activeSubscription
      ? {
          id: membership.activeSubscription.id,
          planName: membership.activeSubscription.planName,
          price: membership.activeSubscription.priceJod,
          status: 'active',
          renewalDate: membership.activeSubscription.renewalDate,
          type: membership.activeSubscription.type,
          corridorId: membership.activeSubscription.corridorId,
          corridorLabel: membership.activeSubscription.corridorLabel,
          benefits: membership.activeSubscription.benefits,
        }
      : null,
  };
}

async function resolveCanonicalUserId(userKey: string): Promise<string> {
  const cached = canonicalUserCache.get(userKey);
  if (cached) {
    return cached;
  }

  const resolution = (async () => {
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
  })();

  canonicalUserCache.set(userKey, resolution);
  return resolution;
}

function readCached<T>(cache: Map<string, CacheEntry<T>>, key: string): Promise<T> | null {
  const hit = cache.get(key);
  if (!hit) {
    return null;
  }

  if (hit.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return hit.promise;
}

function writeCached<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const promise = producer().catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, {
    expiresAt: Date.now() + ttlMs,
    promise,
  });

  return promise;
}

function getPersistedWalletSnapshotStorageKey(userId: string): string {
  return `${WALLET_PERSISTED_SNAPSHOT_STORAGE_PREFIX}:${userId}`;
}

function getSessionStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function isWalletSnapshot(value: unknown): value is WalletSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  const meta = record.meta as Record<string, unknown> | undefined;
  return Boolean(
    record.data
      && meta
      && typeof meta.source === 'string'
      && typeof meta.degraded === 'boolean'
      && typeof meta.fetchedAt === 'string',
  );
}

function persistWalletSnapshot(userId: string, snapshot: WalletSnapshot): void {
  const storage = getSessionStorage();
  if (!storage || !userId) {
    return;
  }

  try {
    const payload: PersistedWalletSnapshot = {
      storedAt: Date.now(),
      snapshot,
    };
    storage.setItem(getPersistedWalletSnapshotStorageKey(userId), JSON.stringify(payload));
  } catch {
    // Ignore storage write failures.
  }
}

function readPersistedWalletSnapshot(
  userId: string,
  maxAgeMs = WALLET_PERSISTED_SNAPSHOT_MAX_AGE_MS,
): WalletSnapshot | null {
  const storage = getSessionStorage();
  if (!storage || !userId) {
    return null;
  }

  try {
    const raw = storage.getItem(getPersistedWalletSnapshotStorageKey(userId));
    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as PersistedWalletSnapshot | null;
    if (
      !payload
      || typeof payload !== 'object'
      || typeof payload.storedAt !== 'number'
      || payload.storedAt + maxAgeMs <= Date.now()
      || !isWalletSnapshot(payload.snapshot)
    ) {
      storage.removeItem(getPersistedWalletSnapshotStorageKey(userId));
      return null;
    }

    return payload.snapshot;
  } catch {
    storage.removeItem(getPersistedWalletSnapshotStorageKey(userId));
    return null;
  }
}

function invalidateWalletCaches(userId?: string): void {
  if (!userId) {
    walletReadCache.clear();
    walletInsightsCache.clear();
    walletReadSnapshotCache.clear();
    walletInsightsSnapshotCache.clear();
    return;
  }

  walletReadCache.delete(userId);
  walletInsightsCache.delete(userId);
  walletReadSnapshotCache.delete(userId);
  walletInsightsSnapshotCache.delete(userId);
}

export function __resetWalletApiCachesForTests(): void {
  canonicalUserCache.clear();
  invalidateWalletCaches();
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(`${WALLET_PERSISTED_SNAPSHOT_STORAGE_PREFIX}:`)) {
      storage.removeItem(key);
    }
  }
}

async function resolveWalletContext(userId: string): Promise<{ canonicalUserId: string; wallet: WalletRow }> {
  const directWallet = await findWalletByUserId(userId);
  if (directWallet?.wallet_id) {
    return {
      canonicalUserId: userId,
      wallet: directWallet,
    };
  }

  const canonicalUserId = await resolveCanonicalUserId(userId);
  const wallet = canonicalUserId === userId
    ? directWallet
    : await findWalletByUserId(canonicalUserId);

  if (!wallet?.wallet_id) {
    throw new Error('Wallet not found');
  }

  return {
    canonicalUserId,
    wallet,
  };
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
  const { canonicalUserId, wallet } = await resolveWalletContext(userId);
  const [
    { data: transactions, error: transactionsError },
    { data: paymentMethods, error: paymentMethodsError },
  ] = await Promise.all([
    db
      .from('transactions')
      .select('transaction_id, amount, direction, transaction_type, transaction_status, created_at, metadata')
      .eq('wallet_id', wallet.wallet_id)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('payment_methods')
      .select('payment_method_id, method_type, provider, token_reference, is_default, status, created_at, updated_at')
      .eq('user_id', canonicalUserId)
      .order('created_at', { ascending: false }),
  ]);

  if (transactionsError) {
    throw transactionsError;
  }

  if (paymentMethodsError) {
    throw paymentMethodsError;
  }

  return buildWalletPayload(
    wallet as WalletRow,
    (Array.isArray(transactions) ? transactions : []) as TransactionRow[],
    (Array.isArray(paymentMethods) ? [...paymentMethods].sort((left, right) => {
      if (!!left.is_default === !!right.is_default) {
        return 0;
      }
      return left.is_default ? -1 : 1;
    }) : []) as PaymentMethodRow[],
  );
}

async function getWalletTransactionRows(userId: string): Promise<TransactionRow[]> {
  const wallet = await walletApi.getWallet(userId);
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

  invalidateWalletCaches(userId);
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

  invalidateWalletCaches(userId);
  invalidateWalletCaches(recipientId);
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

  invalidateWalletCaches(userId);
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

  invalidateWalletCaches(userId);
  return fetchWalletDirect(userId);
}

async function getPaymentMethodsDirect(userId: string): Promise<{ methods: WalletPaymentMethod[] }> {
  const wallet = await fetchWalletDirect(userId);
  return { methods: Array.isArray(wallet.wallet.paymentMethods) ? wallet.wallet.paymentMethods : [] };
}

async function addPaymentMethodDirect(
  userId: string,
  method: AddPaymentMethodInput,
) {
  const db = getDb();
  const { data, error } = await db
    .from('payment_methods')
    .insert({
      user_id: userId,
      provider: method.provider,
      method_type: normalizePaymentMethod(method.type),
      token_reference: String(method.tokenReference ?? method.last4 ?? `pm-${Date.now()}`),
      is_default: Boolean(method.isDefault),
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  invalidateWalletCaches(userId);
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

  invalidateWalletCaches(userId);
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
  return requestJsonWithPolicy<T>(path, init);
}

async function requestJsonWithPolicy<T>(
  path: string,
  init?: RequestInit,
  {
    backoff = 500,
    retries = 1,
    timeout,
  }: {
    backoff?: number;
    retries?: number;
    timeout?: number;
  } = {},
): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetchWithRetry(path, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers ?? {}),
    },
    timeout,
  }, retries, backoff);

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Wallet request failed: ${response.status}`);
  }

  return response.json();
}

export const walletApi = {
  getPersistedWalletSnapshot(userId: string, maxAgeMs?: number): WalletSnapshot | null {
    return readPersistedWalletSnapshot(userId, maxAgeMs);
  },

  async getWalletSnapshot(userId: string): Promise<WalletSnapshot> {
    return readCached(walletReadSnapshotCache, userId)
      ?? writeCached(walletReadSnapshotCache, userId, WALLET_READ_CACHE_TTL_MS, async () => {
        if (canUseEdgeApiForReads()) {
          try {
            const data = await requestJsonWithPolicy<WalletData>(`${WALLET_API_BASE}/${userId}`, undefined, {
              retries: 0,
              timeout: WALLET_EDGE_READ_TIMEOUT_MS,
            });
            const snapshot = {
              data,
              meta: createWalletReliabilityMeta('edge-api', false),
            };
            persistWalletSnapshot(userId, snapshot);
            return snapshot;
          } catch {
            // Fall back to direct Supabase below.
          }
        }

        const snapshot = {
          data: await fetchWalletDirect(userId),
          meta: createWalletReliabilityMeta('direct-supabase', true),
        };
        persistWalletSnapshot(userId, snapshot);
        return snapshot;
      });
  },

  async getWallet(userId: string): Promise<WalletData> {
    return readCached(walletReadCache, userId)
      ?? writeCached(walletReadCache, userId, WALLET_READ_CACHE_TTL_MS, async () => {
        const snapshot = await walletApi.getWalletSnapshot(userId);
        return snapshot.data;
      });
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

    const wallet = await walletApi.getWallet(userId);
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
        const result = await requestJson(`${WALLET_API_BASE}/${userId}/top-up`, {
          method: 'POST',
          body: JSON.stringify({ amount, paymentMethod }),
        });
        invalidateWalletCaches(userId);
        return result;
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return addWalletFundsDirect(userId, amount, paymentMethod);
  },

  async withdraw(userId: string, amount: number, bankAccount: string, method = 'bank_transfer') {
    if (canUseEdgeApi()) {
      try {
        const result = await requestJson(`${WALLET_API_BASE}/${userId}/withdraw`, {
          method: 'POST',
          body: JSON.stringify({ amount, bankAccount, method }),
        });
        invalidateWalletCaches(userId);
        return result;
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return withdrawWalletFundsDirect(userId, amount, bankAccount, method);
  },

  async sendMoney(userId: string, recipientId: string, amount: number, note?: string) {
    if (canUseEdgeApi()) {
      try {
        const result = await requestJson(`${WALLET_API_BASE}/${userId}/send`, {
          method: 'POST',
          body: JSON.stringify({ recipientId, amount, note }),
        });
        invalidateWalletCaches(userId);
        invalidateWalletCaches(recipientId);
        return result;
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

    const membership = getMovementMembershipSnapshot();
    return {
      subscription: membership.activeSubscription
        ? {
            id: membership.activeSubscription.id,
            planName: membership.activeSubscription.planName,
            price: membership.activeSubscription.priceJod,
            status: 'active',
            renewalDate: membership.activeSubscription.renewalDate,
            type: membership.activeSubscription.type,
            corridorId: membership.activeSubscription.corridorId,
            corridorLabel: membership.activeSubscription.corridorLabel,
            benefits: membership.activeSubscription.benefits,
          }
        : null,
    };
  },

  async subscribe(userId: string, planName: string, price: number, corridorId?: string | null) {
    if (canUseEdgeApi()) {
      const result = await requestJson(`${WALLET_API_BASE}/${userId}/subscribe`, {
        method: 'POST',
        body: JSON.stringify({ planName, price, corridorId }),
      });
      invalidateWalletCaches(userId);
      return result;
    }

    if (corridorId) {
      startCommuterPass(corridorId);
    } else {
      activateWaselPlus(price);
    }
    invalidateWalletCaches(userId);
    return walletApi.getSubscription(userId);
  },

  async getInsights(userId: string): Promise<InsightsData> {
    return readCached(walletInsightsCache, userId)
      ?? writeCached(walletInsightsCache, userId, INSIGHTS_CACHE_TTL_MS, async () => {
        const snapshot = await walletApi.getInsightsSnapshot(userId);
        return snapshot.data;
      });
  },

  async getInsightsSnapshot(userId: string): Promise<WalletInsightsSnapshot> {
    return readCached(walletInsightsSnapshotCache, userId)
      ?? writeCached(walletInsightsSnapshotCache, userId, INSIGHTS_CACHE_TTL_MS, async () => {
        if (canUseEdgeApiForReads()) {
          try {
            const data = await requestJsonWithPolicy<InsightsData>(`${WALLET_API_BASE}/${userId}/insights`, undefined, {
              retries: 0,
              timeout: WALLET_EDGE_READ_TIMEOUT_MS,
            });
            return {
              data,
              meta: createWalletReliabilityMeta('edge-api', false),
            };
          } catch {
            // Fall back to wallet-backed insights below.
          }
        }

        const walletSnapshot = await walletApi.getWalletSnapshot(userId);
        if (walletSnapshot.data.transactions.length > 0) {
          return {
            data: buildInsightsFromTransactions(walletSnapshot.data.transactions),
            meta: {
              ...walletSnapshot.meta,
              degraded: true,
            },
          };
        }

        const rows = await getWalletTransactionRows(userId);
        return {
          data: buildInsightsFromTransactions(rows.map(toWalletTransaction)),
          meta: {
            ...walletSnapshot.meta,
            degraded: true,
          },
        };
      });
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
        const result = await requestJson(`${WALLET_API_BASE}/${userId}/auto-topup`, {
          method: 'POST',
          body: JSON.stringify({ enabled, amount, threshold }),
        });
        invalidateWalletCaches(userId);
        return result;
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

  async getPaymentMethods(userId: string): Promise<{ methods: WalletPaymentMethod[] }> {
    if (canUseEdgeApi()) {
      try {
        return await requestJson<{ methods: WalletPaymentMethod[] }>(`${WALLET_API_BASE}/${userId}/payment-methods`);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return getPaymentMethodsDirect(userId);
  },

  async addPaymentMethod(userId: string, method: AddPaymentMethodInput) {
    if (canUseEdgeApi()) {
      try {
        const result = await requestJson(`${WALLET_API_BASE}/${userId}/payment-methods`, {
          method: 'POST',
          body: JSON.stringify(method),
        });
        invalidateWalletCaches(userId);
        return result;
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    return addPaymentMethodDirect(userId, method);
  },

  async deletePaymentMethod(userId: string, methodId: string) {
    if (canUseEdgeApi()) {
      try {
        const result = await requestJson(`${WALLET_API_BASE}/${userId}/payment-methods/${methodId}`, {
          method: 'DELETE',
        });
        invalidateWalletCaches(userId);
        return result;
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
