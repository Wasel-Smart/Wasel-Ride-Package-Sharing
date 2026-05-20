/**
 * Wallet API Service
 * Uses the shared edge-function base when available and falls back to direct
 * Supabase reads/RPCs so the wallet stays connected to persisted backend data.
 */

import { API_URL, supabase } from './core';
import { BackendRequestError, requestEdgeJson } from './backendWorkflow';
import type { DbClient, PaymentMethodRow, WalletRow } from './directSupabase';
import { safeStorageGetItem, safeStorageSetItem } from '../utils/browserStorage';
import { readRuntimeState, writeRuntimeState } from '../utils/runtimeStore';

const WALLET_API_BASE = API_URL ? `${API_URL}/wallet` : '';
// Must match STORAGE_KEY in src/contexts/LocalAuth.tsx so balance reads stay in sync
const LOCAL_AUTH_USER_KEY = 'wasel_user_session';
const WALLET_RUNTIME_CACHE_KEY = 'wallet-runtime-cache';
const WALLET_INSIGHTS_CACHE_KEY = 'wallet-insights-cache';
const WALLET_PAYMENT_METHODS_CACHE_KEY = 'wallet-payment-methods-cache';
const WALLET_TRUST_SCORE_CACHE_KEY = 'wallet-trust-score-cache';

type WalletTransactionSource = {
  transaction_id?: string;
  amount?: number | string | null;
  direction?: string | null;
  transaction_type?: string | null;
  transaction_status?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export interface WalletPaymentMethod {
  id: string;
  provider: string;
  type: string;
  tokenReference: string | null;
  isDefault: boolean;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

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
  activeEscrows: WalletEscrow[];
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

export interface WalletEscrow {
  id: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string | null;
}

export interface WalletTrustScore {
  totalTrips: number;
  cashRating: number;
  onTimePayments: number;
  deposit: number;
}

export interface WalletPaymentMethodsResponse {
  methods: WalletPaymentMethod[];
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
  page: number;
  limit: number;
  total: number;
}

export interface WalletCheckoutSession {
  checkoutUrl?: string | null;
  provider?: string;
  sessionId?: string | null;
  plan?: string | null;
  status?: string | null;
}

export interface WalletTopUpResponse {
  payment?: WalletCheckoutSession | null;
  subscription?: WalletCheckoutSession | null;
  wallet?: WalletData | null;
}

export interface WalletSubscribeResponse {
  subscription?: WalletCheckoutSession | null;
  payment?: WalletCheckoutSession | null;
}

export interface WalletSendMoneyResult {
  success: boolean;
  note?: string;
  wallet: WalletData;
}

export interface WalletPaymentMethodInput {
  type: string;
  provider: string;
  token_reference?: string;
  last4?: string;
  is_default?: boolean;
  [key: string]: unknown;
}

function getDb(): DbClient {
  if (!supabase) {
    throw new Error('Supabase client is not initialised');
  }

  return supabase as DbClient;
}

function getWalletRuntimeCacheKey(prefix: string, userId: string): string {
  return `${prefix}:${userId}`;
}

function readWalletCache(userId: string): WalletData | null {
  return readRuntimeState<WalletData | null>(
    getWalletRuntimeCacheKey(WALLET_RUNTIME_CACHE_KEY, userId),
    null,
  );
}

function writeWalletCache(userId: string, wallet: WalletData): WalletData {
  const normalizedWallet = normalizeWalletDataContract(wallet);
  writeRuntimeState(getWalletRuntimeCacheKey(WALLET_RUNTIME_CACHE_KEY, userId), normalizedWallet);
  syncLocalAuthBalance(userId, normalizedWallet.balance);
  if (Array.isArray(normalizedWallet.wallet.paymentMethods)) {
    writePaymentMethodsCache(userId, normalizedWallet.wallet.paymentMethods);
  }
  return normalizedWallet;
}

function readInsightsCache(userId: string): InsightsData | null {
  return readRuntimeState<InsightsData | null>(
    getWalletRuntimeCacheKey(WALLET_INSIGHTS_CACHE_KEY, userId),
    null,
  );
}

function writeInsightsCache(userId: string, insights: InsightsData): InsightsData {
  writeRuntimeState(getWalletRuntimeCacheKey(WALLET_INSIGHTS_CACHE_KEY, userId), insights);
  return insights;
}

function readPaymentMethodsCache(userId: string): WalletPaymentMethodsResponse | null {
  const cached = readRuntimeState<WalletPaymentMethodsResponse | null>(
    getWalletRuntimeCacheKey(WALLET_PAYMENT_METHODS_CACHE_KEY, userId),
    null,
  );
  return cached ? { methods: normalizeWalletPaymentMethods(cached.methods) } : null;
}

function writePaymentMethodsCache(
  userId: string,
  methods: WalletPaymentMethod[],
): WalletPaymentMethodsResponse {
  const payload = { methods: normalizeWalletPaymentMethods(methods) };
  writeRuntimeState(getWalletRuntimeCacheKey(WALLET_PAYMENT_METHODS_CACHE_KEY, userId), payload);
  return payload;
}

function readTrustScoreCache(userId: string): WalletTrustScore | null {
  return readRuntimeState<WalletTrustScore | null>(
    getWalletRuntimeCacheKey(WALLET_TRUST_SCORE_CACHE_KEY, userId),
    null,
  );
}

function writeTrustScoreCache(userId: string, trustScore: WalletTrustScore): WalletTrustScore {
  writeRuntimeState(
    getWalletRuntimeCacheKey(WALLET_TRUST_SCORE_CACHE_KEY, userId),
    trustScore,
  );
  return trustScore;
}

function canUseEdgeApi(): boolean {
  return Boolean(WALLET_API_BASE);
}

function syncLocalAuthBalance(userId: string, balance: number): void {
  try {
    const raw = safeStorageGetItem('sessionStorage', LOCAL_AUTH_USER_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed?.id !== userId) return;
    parsed.balance = Number(balance.toFixed(2));
    safeStorageSetItem('sessionStorage', LOCAL_AUTH_USER_KEY, JSON.stringify(parsed));
  } catch {
    // Ignore local sync failures.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toOptionalString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return null;
}

function normalizeWalletPaymentMethodType(method: unknown): string {
  switch (String(method ?? '').trim()) {
    case 'card_payment':
      return 'card';
    case 'wallet_balance':
      return 'wallet';
    case 'local_gateway':
      return 'bank_transfer';
    case 'government_api':
      return 'government_api';
    case 'apple_pay':
    case 'google_pay':
    case 'bank_transfer':
    case 'wallet':
    case 'card':
      return String(method);
    default:
      return 'card';
  }
}

function normalizeWalletPaymentMethod(raw: unknown): WalletPaymentMethod {
  const row = isRecord(raw) ? raw : {};
  const id =
    toOptionalString(row.id) ??
    toOptionalString(row.payment_method_id) ??
    `pm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    provider: toOptionalString(row.provider) ?? 'wallet',
    type: normalizeWalletPaymentMethodType(row.type ?? row.method_type),
    tokenReference: toOptionalString(row.tokenReference ?? row.token_reference ?? row.last4),
    isDefault: row.isDefault === true || row.is_default === true,
    status: toOptionalString(row.status) ?? 'active',
    createdAt: toOptionalString(row.createdAt ?? row.created_at),
    updatedAt: toOptionalString(row.updatedAt ?? row.updated_at),
  };
}

function normalizeWalletPaymentMethods(methods: unknown): WalletPaymentMethod[] {
  return Array.isArray(methods) ? methods.map(normalizeWalletPaymentMethod) : [];
}

function normalizeWalletDataContract(wallet: WalletData): WalletData {
  return {
    ...wallet,
    wallet: {
      ...wallet.wallet,
      paymentMethods: normalizeWalletPaymentMethods(wallet.wallet.paymentMethods),
    },
    activeEscrows: Array.isArray(wallet.activeEscrows) ? wallet.activeEscrows : [],
    activeRewards: Array.isArray(wallet.activeRewards) ? wallet.activeRewards : [],
    transactions: Array.isArray(wallet.transactions) ? wallet.transactions : [],
  };
}

function normalizeWalletCheckoutSession(raw: unknown): WalletCheckoutSession | null {
  if (!isRecord(raw)) {
    return null;
  }

  return {
    checkoutUrl: toOptionalString(raw.checkoutUrl),
    provider: toOptionalString(raw.provider) ?? undefined,
    sessionId: toOptionalString(raw.sessionId),
    plan: toOptionalString(raw.plan),
    status: toOptionalString(raw.status),
  };
}

function isWalletDataLike(value: unknown): value is WalletData {
  return (
    isRecord(value) &&
    isRecord(value.wallet) &&
    typeof value.balance === 'number' &&
    typeof value.pendingBalance === 'number' &&
    Array.isArray(value.transactions)
  );
}

function normalizeWalletTopUpResponse(payload: unknown): WalletTopUpResponse {
  if (isWalletDataLike(payload)) {
    return { wallet: normalizeWalletDataContract(payload) };
  }

  const row = isRecord(payload) ? payload : {};
  return {
    payment: normalizeWalletCheckoutSession(row.payment),
    wallet: isWalletDataLike(row.wallet) ? normalizeWalletDataContract(row.wallet) : null,
  };
}

function normalizeWalletSubscribeResponse(payload: unknown): WalletSubscribeResponse {
  const row = isRecord(payload) ? payload : {};
  return {
    subscription: normalizeWalletCheckoutSession(row.subscription),
    payment: normalizeWalletCheckoutSession(row.payment),
  };
}

export function getWalletCheckoutUrl(
  result: WalletTopUpResponse | WalletSubscribeResponse,
): string | null {
  return result.subscription?.checkoutUrl ?? result.payment?.checkoutUrl ?? null;
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

function toWalletPaymentMethod(row: PaymentMethodRow): WalletPaymentMethod {
  return normalizeWalletPaymentMethod(row);
}

function describeTransaction(row: WalletTransactionSource): string {
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

function toWalletTransaction(row: WalletTransactionSource): WalletTransaction {
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

function isCredit(row: WalletTransactionSource): boolean {
  return row.direction === 'credit';
}

function isDebit(row: WalletTransactionSource): boolean {
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
  transactions: WalletTransactionSource[],
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
      paymentMethods: paymentMethods.map(toWalletPaymentMethod),
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

  return writeWalletCache(
    userId,
    buildWalletPayload(
      wallet,
      (Array.isArray(transactions) ? transactions.slice(0, 50) : []) as WalletTransactionSource[],
      (Array.isArray(paymentMethods) ? paymentMethods : []) as PaymentMethodRow[],
    ),
  );
}

async function getWalletTransactionRows(userId: string): Promise<WalletTransactionSource[]> {
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

async function getPaymentMethodsDirect(userId: string): Promise<WalletPaymentMethodsResponse> {
  const wallet = await fetchWalletDirect(userId);
  return {
    methods: normalizeWalletPaymentMethods(wallet.wallet.paymentMethods),
  };
}

async function addPaymentMethodDirect(
  userId: string,
  method: WalletPaymentMethodInput,
): Promise<WalletPaymentMethod> {
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

  return toWalletPaymentMethod(data as PaymentMethodRow);
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

async function getTrustScoreDirect(userId: string): Promise<WalletTrustScore> {
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
        return writeWalletCache(
          userId,
          normalizeWalletDataContract(await requestWalletJson<WalletData>(userId, '', 'Load wallet')),
        );
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    let wallet: WalletData | null = null;
    try {
      wallet = await fetchWalletDirect(userId);
    } catch (error) {
      const cachedWallet = readWalletCache(userId);
      if (cachedWallet) {
        return cachedWallet;
      }

      throw error;
    }

    if (canUseEdgeApi()) {
      try {
        wallet.subscription = await fetchSubscriptionViaBackend(userId);
      } catch {
        // Keep the direct wallet payload if the subscription route is unavailable.
      }
    }

    return writeWalletCache(userId, wallet);
  },

  async getTransactions(
    userId: string,
    page = 1,
    limit = 20,
    type?: string,
  ): Promise<WalletTransactionsResponse> {
    if (canUseEdgeApi()) {
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        if (type) params.set('type', type);
        return await requestWalletJson<WalletTransactionsResponse>(
          userId,
          `/transactions?${params.toString()}`,
          'Load wallet transactions',
        );
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    let wallet: WalletData;
    try {
      wallet = await fetchWalletDirect(userId);
    } catch (error) {
      const cachedWallet = readWalletCache(userId);
      if (!cachedWallet) {
        throw error;
      }

      wallet = cachedWallet;
    }
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

  async topUp(userId: string, amount: number, paymentMethod: string): Promise<WalletTopUpResponse> {
    if (canUseEdgeApi()) {
      try {
        return normalizeWalletTopUpResponse(
          await requestWalletJson(userId, '/top-up', 'Create wallet top-up', {
            method: 'POST',
            body: { amount, paymentMethod },
          }),
        );
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

    return withdrawWalletFundsDirect(userId, amount, bankAccount, method);
  },

  async sendMoney(
    userId: string,
    recipientId: string,
    amount: number,
    note?: string,
  ): Promise<WalletSendMoneyResult> {
    if (canUseEdgeApi()) {
      try {
        return await requestWalletJson<WalletSendMoneyResult>(userId, '/send', 'Send wallet funds', {
          method: 'POST',
          body: { recipientId, amount, note },
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

  async subscribe(
    userId: string,
    planName: string,
    price: number,
  ): Promise<WalletSubscribeResponse> {
    if (canUseEdgeApi()) {
      try {
        return normalizeWalletSubscribeResponse(
          await requestWalletJson(
            userId,
            '/subscribe',
            'Create wallet subscription checkout',
            {
              method: 'POST',
              body: { planName, price },
            },
          ),
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

    let rows: WalletTransactionSource[];
    try {
      rows = await getWalletTransactionRows(userId);
    } catch (error) {
      const cachedInsights = readInsightsCache(userId);
      if (cachedInsights) {
        return cachedInsights;
      }

      const cachedWallet = readWalletCache(userId);
      if (cachedWallet) {
        return writeInsightsCache(userId, buildInsightsFromTransactions(cachedWallet.transactions));
      }

      throw error;
    }

    return writeInsightsCache(
      userId,
      buildInsightsFromTransactions(rows.map(toWalletTransaction)),
    );
  },

  async setPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) {
      throw new Error('Wallet PIN management requires the wallet backend.');
    }

    return requestWalletJson(userId, '/pin/set', 'Set wallet PIN', {
      method: 'POST',
      body: { pin },
    });
  },

  async verifyPin(userId: string, pin: string) {
    if (!canUseEdgeApi()) {
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

    return updateWalletPreferencesDirect(userId, {
      auto_top_up_enabled: enabled,
      auto_top_up_amount: amount,
      auto_top_up_threshold: threshold,
    });
  },

  async getPaymentMethods(userId: string): Promise<WalletPaymentMethodsResponse> {
    if (canUseEdgeApi()) {
      try {
        const response = await requestWalletJson<WalletPaymentMethodsResponse>(
          userId,
          '/payment-methods',
          'Load wallet payment methods',
        );
        return writePaymentMethodsCache(userId, response.methods);
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    try {
      const methods = await getPaymentMethodsDirect(userId);
      return writePaymentMethodsCache(userId, methods.methods);
    } catch (error) {
      const cachedMethods = readPaymentMethodsCache(userId);
      if (cachedMethods) {
        return cachedMethods;
      }

      const cachedWallet = readWalletCache(userId);
      if (cachedWallet?.wallet.paymentMethods) {
        return writePaymentMethodsCache(userId, cachedWallet.wallet.paymentMethods);
      }

      throw error;
    }
  },

  async addPaymentMethod(
    userId: string,
    method: WalletPaymentMethodInput,
  ): Promise<WalletPaymentMethod> {
    if (canUseEdgeApi()) {
      try {
        return normalizeWalletPaymentMethod(
          await requestWalletJson(userId, '/payment-methods', 'Add wallet payment method', {
            method: 'POST',
            body: method,
          }),
        );
      } catch {
        // Fall back to direct Supabase below.
      }
    }

    const createdMethod = await addPaymentMethodDirect(userId, method);
    const cachedMethods = readPaymentMethodsCache(userId)?.methods ?? [];
    writePaymentMethodsCache(
      userId,
      [createdMethod, ...cachedMethods.filter(item => item.id !== createdMethod.id)],
    );
    return createdMethod;
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

    const result = await deletePaymentMethodDirect(userId, methodId);
    const cachedMethods = readPaymentMethodsCache(userId)?.methods ?? [];
    writePaymentMethodsCache(
      userId,
      cachedMethods.filter(item => item.id !== methodId),
    );
    return result;
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

    try {
      return writeTrustScoreCache(userId, await getTrustScoreDirect(userId));
    } catch (error) {
      const cachedTrustScore = readTrustScoreCache(userId);
      if (cachedTrustScore) {
        return cachedTrustScore;
      }

      throw error;
    }
  },
};
