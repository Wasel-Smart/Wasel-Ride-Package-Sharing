/**
 * walletApi
 *
 * Secure wallet operations: balance, transactions, payment intents,
 * payment methods, PIN verification, subscriptions, and transfers.
 *
 * CHANGELOG (refactor)
 * ────────────────────
 * - Network calls now go through `apiGateway` instead of inline
 *   `fetchWithRetry` + manual auth-header construction.
 *   This removes ~40 lines of duplicated auth boilerplate.
 *
 * - localStorage operations are delegated to `WalletStorageAdapter`
 *   (persistWalletSnapshot, readPersistedWalletSnapshot, etc.).
 *   This file no longer contains any raw `localStorage` calls.
 *
 * - The `void userId` pattern has been removed throughout.
 *   Functions that don't use userId no longer accept it as a parameter;
 *   callers that passed it as a convention argument have been updated.
 *
 * - A `withCache` helper is kept local because its TTLs are
 *   wallet-specific (15 s reads, 30 s insights).
 */

import {
  isStepUpPurpose,
  isWalletPaymentMethodType,
  type PaymentIntentView,
  type StepUpPurpose,
  type WalletData,
  type WalletPaymentMethod,
  type WalletPaymentMethodType,
  type WalletStepUpVerification,
  type WalletTransaction,
} from '../../shared/wallet-contracts';
import {
  WALLET_CONTRACT_VERSION,
  paymentIntentConfirmationSchema,
  paymentIntentViewSchema,
  walletDataSchema,
  walletStepUpVerificationSchema,
} from '../contracts/wallet';
import { parseContract } from '../contracts/validation';
import { getConfig } from '../utils/env';
import { apiGateway } from './apiGateway';
import {
  makeReliabilityMeta,
  persistDemoIntent,
  persistWalletSnapshot,
  readDemoIntentStatus,
  readPersistedWalletSnapshot,
  settleDemoIntent,
  type PersistedPaymentIntent,
} from './storage/WalletStorageAdapter';

// ─── Public re-exports ────────────────────────────────────────────────────────

export type { WalletData, WalletPaymentMethod, WalletTransaction };
export type { WalletEscrow, WalletSubscription } from '../../shared/wallet-contracts';

// ─── Reliability metadata (used by callers to show degraded-mode banners) ─────

export interface WalletReliabilityMeta {
  degraded: boolean;
  fetchedAt: string;
  source: 'edge-api' | 'direct-supabase';
}

export interface WalletSnapshot {
  data: WalletData;
  meta: WalletReliabilityMeta;
}

// ─── Insights derived from transaction history ────────────────────────────────

export interface InsightsData {
  avgMonthlySpend: number;
  carbonSaved: number;
  categoryBreakdown: Record<string, number>;
  changePercent: number;
  lastMonthSpent: number;
  monthlyTrend: Array<{ earned: number; month: string; spent: number }>;
  thisMonthEarned: number;
  thisMonthSpent: number;
  totalTransactions: number;
}

export interface WalletInsightsSnapshot {
  data: InsightsData;
  meta: WalletReliabilityMeta;
}

export interface PaymentIntentConfirmationView {
  id: string;
  status: string;
  settled: boolean;
  clientSecret?: string | null;
}

// ─── Payment method input ─────────────────────────────────────────────────────

export interface AddPaymentMethodInput {
  brand?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  isDefault?: boolean;
  label?: string | null;
  last4?: string | null;
  provider: 'stripe' | 'cliq' | 'aman' | 'wallet';
  providerReference: string;
  tokenReference?: string | null;
  type: WalletPaymentMethodType;
}

interface WalletBalanceSummary {
  available: number;
  currency: string;
  pending: number;
}

interface ProcessWalletTransactionInput {
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  type: 'credit' | 'debit';
}

// ─── Fallback eligibility ─────────────────────────────────────────────────────

function allowSnapshotFallback(): boolean {
  const { allowLocalPersistenceFallback, enableDemoAccount, enablePersistedTestAuth } = getConfig();
  return allowLocalPersistenceFallback || enableDemoAccount || enablePersistedTestAuth;
}

function allowPaymentIntentFallback(): boolean {
  return getConfig().enableFakePayments;
}

// ─── In-memory cache (TTL-based) ──────────────────────────────────────────────

interface CacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}

const walletReadCache = new Map<string, CacheEntry<WalletSnapshot>>();
const walletInsightsCache = new Map<string, CacheEntry<WalletInsightsSnapshot>>();
let cachedStepUpVerification: (WalletStepUpVerification & { createdAt: number }) | null = null;

function withCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) return existing.promise;

  const promise = producer().catch(err => {
    cache.delete(key);
    throw err;
  });

  cache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

// ─── Auth-aware user resolution ───────────────────────────────────────────────

async function resolveUserId(preferredUserId?: string): Promise<string> {
  const normalised = preferredUserId?.trim();
  if (normalised) return normalised;

  // Dynamically import to avoid circular deps with core.ts
  const { getAuthDetails } = await import('./core');
  const { userId } = await getAuthDetails();
  return userId;
}

// ─── Step-up verification cache ───────────────────────────────────────────────

function getCachedToken(purpose: StepUpPurpose): string | null {
  if (!cachedStepUpVerification?.verificationToken) return null;
  if (cachedStepUpVerification.purpose !== purpose) return null;
  // Tokens expire after 9 minutes
  if (Date.now() - cachedStepUpVerification.createdAt > 9 * 60_000) return null;
  return cachedStepUpVerification.verificationToken;
}

function requireStepUpToken(purpose: StepUpPurpose): string {
  const token = getCachedToken(purpose);
  if (!token) {
    const purposeLabel =
      purpose === 'payment_method'
        ? 'changing payment methods'
        : purpose === 'withdrawal'
          ? 'withdrawing funds'
          : purpose === 'subscription'
            ? 'managing subscriptions'
            : purpose === 'deposit'
              ? 'funding your wallet'
              : 'sending money';
    throw new Error(
      `Verify your wallet PIN and OTP before ${purposeLabel}.`,
    );
  }
  return token;
}

function parseTopUpArgs(
  amountOrUserId: number | string,
  paymentMethodOrAmount: string | number,
  maybePaymentMethod?: string,
) {
  if (typeof amountOrUserId === 'string') {
    return {
      amount: Number(paymentMethodOrAmount),
      paymentMethod: maybePaymentMethod ?? '',
    };
  }

  return {
    amount: amountOrUserId,
    paymentMethod: String(paymentMethodOrAmount),
  };
}

function parseSendMoneyArgs(
  recipientOrUserId: string,
  amountOrRecipient: number | string,
  noteOrAmount?: string | number,
  maybeNote?: string,
) {
  if (typeof amountOrRecipient === 'string' && typeof noteOrAmount === 'number') {
    return {
      amount: noteOrAmount,
      note: maybeNote,
      recipientUserId: amountOrRecipient,
    };
  }

  return {
    amount: Number(amountOrRecipient),
    note: typeof noteOrAmount === 'string' ? noteOrAmount : undefined,
    recipientUserId: recipientOrUserId,
  };
}

function parseAddPaymentMethodArgs(
  inputOrUserId: AddPaymentMethodInput | string,
  maybeInput?: AddPaymentMethodInput,
): AddPaymentMethodInput {
  return typeof inputOrUserId === 'string' ? (maybeInput as AddPaymentMethodInput) : inputOrUserId;
}

function parseVerifyPinArgs(
  userIdOrPin: string,
  pinOrPurpose: string,
  purposeOrOtpCode?: string,
  otpCodeOrChallengeId?: string,
  maybeChallengeId?: string,
) {
  const isLegacySignature =
    /^\d{4,8}$/.test(pinOrPurpose) &&
    (purposeOrOtpCode === undefined || isStepUpPurpose(purposeOrOtpCode));

  if (isLegacySignature) {
    return {
      challengeId: maybeChallengeId,
      otpCode: otpCodeOrChallengeId,
      pin: pinOrPurpose,
      purpose: purposeOrOtpCode ?? 'transfer',
    };
  }

  return {
    challengeId: maybeChallengeId ?? otpCodeOrChallengeId,
    otpCode: purposeOrOtpCode,
    pin: userIdOrPin,
    purpose: pinOrPurpose || 'transfer',
  };
}

function parseAutoTopUpArgs(
  enabledOrUserId?: boolean | string,
  amountOrEnabled?: number | boolean,
  thresholdOrAmount?: number,
  maybeThreshold?: number,
) {
  if (typeof enabledOrUserId === 'string') {
    return {
      amount: typeof thresholdOrAmount === 'number' ? thresholdOrAmount : undefined,
      enabled: typeof amountOrEnabled === 'boolean' ? amountOrEnabled : undefined,
      threshold: maybeThreshold,
    };
  }

  return {
    amount: typeof amountOrEnabled === 'number' ? amountOrEnabled : undefined,
    enabled: enabledOrUserId,
    threshold: thresholdOrAmount,
  };
}

// ─── Demo payment intent helpers ─────────────────────────────────────────────

function buildDemoIntent(
  userId: string,
  purpose: PaymentIntentView['purpose'],
  amount: number,
  paymentMethodType: WalletPaymentMethodType,
  options?: {
    metadata?: Record<string, unknown>;
    referenceId?: string | null;
    referenceType?: string | null;
  },
): PaymentIntentView {
  const providerMap: Record<WalletPaymentMethodType, PaymentIntentView['provider']> = {
    wallet: 'wallet',
    cliq: 'cliq',
    bank_transfer: 'aman',
    card: 'stripe',
  };

  const intent: PaymentIntentView = {
    id: `pi_demo_${Date.now()}`,
    purpose,
    status: 'requires_confirmation',
    amount,
    currency: 'JOD',
    paymentMethodType,
    provider: providerMap[paymentMethodType] ?? 'stripe',
    clientSecret: `demo_secret_${Date.now()}`,
    redirectUrl: null,
    createdAt: new Date().toISOString(),
    referenceType: options?.referenceType ?? null,
    referenceId: options?.referenceId ?? null,
  };

  const record: PersistedPaymentIntent = {
    intent: { id: intent.id, status: intent.status, clientSecret: intent.clientSecret ?? null },
    settled: false,
    storedAt: Date.now(),
    userId,
  };
  persistDemoIntent(record);

  return intent;
}

// ─── Insights builder ─────────────────────────────────────────────────────────

function buildInsights(wallet: WalletData): InsightsData {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  const inMonth = (tx: WalletTransaction, m: number, y: number) => {
    const d = new Date(tx.createdAt);
    return d.getMonth() === m && d.getFullYear() === y;
  };

  const current = wallet.transactions.filter(tx => inMonth(tx, thisMonth, thisYear));
  const previous = wallet.transactions.filter(tx => inMonth(tx, lastMonth, lastMonthYear));

  const sumAbs = (txs: WalletTransaction[], sign: 'neg' | 'pos') =>
    txs
      .filter(tx => (sign === 'neg' ? tx.amount < 0 : tx.amount > 0))
      .reduce((s, tx) => s + Math.abs(tx.amount), 0);

  const thisMonthSpent = sumAbs(current, 'neg');
  const lastMonthSpent = sumAbs(previous, 'neg');
  const thisMonthEarned = sumAbs(current, 'pos');

  const changePercent =
    lastMonthSpent === 0
      ? thisMonthSpent > 0 ? 100 : 0
      : ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100;

  const categoryBreakdown = current.reduce<Record<string, number>>((acc, tx) => {
    const key = String(tx.type ?? 'payment');
    acc[key] = (acc[key] ?? 0) + Math.abs(tx.amount);
    return acc;
  }, {});

  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('en-US', { month: 'short' });
    const txs = wallet.transactions.filter(tx => inMonth(tx, d.getMonth(), d.getFullYear()));
    return { month: label, spent: sumAbs(txs, 'neg'), earned: sumAbs(txs, 'pos') };
  }).reverse();

  return {
    avgMonthlySpend: monthlyTrend.reduce((s, m) => s + m.spent, 0) / 6,
    carbonSaved: Number((wallet.total_earned * 0.15).toFixed(2)),
    categoryBreakdown,
    changePercent,
    lastMonthSpent,
    monthlyTrend,
    thisMonthEarned,
    thisMonthSpent,
    totalTransactions: wallet.transactions.length,
  };
}

// ─── Fresh snapshot fetch ──────────────────────────────────────────────────────

async function fetchFreshSnapshot(userId: string): Promise<WalletSnapshot> {
  const data = parseContract(
    walletDataSchema,
    await apiGateway.get<unknown>('/wallet'),
    'wallet.snapshot',
    WALLET_CONTRACT_VERSION,
  );
  const snapshot: WalletSnapshot = { data, meta: makeReliabilityMeta(false) };
  persistWalletSnapshot(userId, snapshot);
  return snapshot;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const walletApi = {
  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Returns full wallet data for the current authenticated user.
   * Cached for 15 seconds. Falls back to persisted snapshot when degraded.
   */
  async getWallet(userId?: string): Promise<WalletData> {
    const uid = await resolveUserId(userId);
    return (await walletApi.getWalletSnapshot(uid)).data;
  },

  async getBalance(userId?: string): Promise<WalletBalanceSummary> {
    const wallet = await walletApi.getWallet(userId);
    return { available: wallet.balance, currency: wallet.currency, pending: wallet.pendingBalance };
  },

  async getWalletSnapshot(userId?: string): Promise<WalletSnapshot> {
    const uid = await resolveUserId(userId);
    return withCache(walletReadCache, uid, 15_000, async () => {
      try {
        return await fetchFreshSnapshot(uid);
      } catch {
        const persisted = allowSnapshotFallback() ? readPersistedWalletSnapshot(uid) : null;
        if (persisted) return { data: persisted.data, meta: makeReliabilityMeta(true) };
        throw new Error('Wallet is unavailable and no cached snapshot exists.');
      }
    });
  },

  getPersistedWalletSnapshot(userId: string): WalletSnapshot | null {
    return readPersistedWalletSnapshot(userId);
  },

  async getInsights(userId?: string): Promise<InsightsData> {
    const uid = await resolveUserId(userId);
    return buildInsights(await walletApi.getWallet(uid));
  },

  async getInsightsSnapshot(userId?: string): Promise<WalletInsightsSnapshot> {
    const uid = await resolveUserId(userId);
    return withCache(walletInsightsCache, uid, 30_000, async () => {
      const snapshot = await walletApi.getWalletSnapshot(uid);
      return { data: buildInsights(snapshot.data), meta: snapshot.meta };
    });
  },

  async getTransactions(userId?: string, page = 1, pageSize = 20) {
    const uid = await resolveUserId(userId);
    const wallet = await walletApi.getWallet(uid);
    const start = Math.max(0, (page - 1) * pageSize);
    return {
      page,
      pageSize,
      total: wallet.transactions.length,
      transactions: wallet.transactions.slice(start, start + pageSize),
    };
  },

  async processTransaction(input: ProcessWalletTransactionInput): Promise<WalletTransaction> {
    const uid = await resolveUserId();
    const wallet = await walletApi.getWallet(uid);
    const signedAmount = input.type === 'credit' ? Math.abs(input.amount) : -Math.abs(input.amount);

    const transaction: WalletTransaction = {
      id: input.referenceId ?? `wallet-tx-${Date.now()}`,
      amount: signedAmount,
      createdAt: new Date().toISOString(),
      description: input.description,
      metadata: { referenceId: input.referenceId ?? null, referenceType: input.referenceType ?? null },
      status: 'completed',
      type: input.type === 'credit' ? 'deposit' : 'payment',
    };

    const snapshot = walletApi.getPersistedWalletSnapshot(uid);
    if (snapshot) {
      const nextBalance = Number((wallet.balance + signedAmount).toFixed(2));
      persistWalletSnapshot(uid, {
        ...snapshot,
        data: {
          ...snapshot.data,
          balance: nextBalance,
          transactions: [transaction, ...snapshot.data.transactions],
        },
      });
    }

    return transaction;
  },

  // ── Payment intents ──────────────────────────────────────────────────────────

  /**
   * Creates a payment intent for the given purpose and amount.
   * Falls back to a demo intent when the backend is unavailable and
   * client fallback is allowed.
   */
  async createPaymentIntent(
    purpose: 'deposit' | 'ride_payment' | 'package_payment' | 'subscription' | 'withdrawal',
    amount: number,
    paymentMethodType: WalletPaymentMethodType,
    options?: {
      idempotencyKey?: string | null;
      metadata?: Record<string, unknown>;
      referenceId?: string | null;
      referenceType?: string | null;
    },
  ): Promise<PaymentIntentView> {
    if (!apiGateway.isConfigured()) {
      throw new Error('Wallet actions are unavailable because the backend payment service is not configured.');
    }

    try {
      return parseContract(
        paymentIntentViewSchema,
        await apiGateway.post<unknown>('/payments/create-intent', {
          amount,
          idempotencyKey: options?.idempotencyKey ?? null,
          metadata: options?.metadata ?? {},
          paymentMethodType,
          purpose,
          referenceId: options?.referenceId ?? null,
          referenceType: options?.referenceType ?? null,
        }),
        'wallet.payment-intent.create',
        WALLET_CONTRACT_VERSION,
      );
    } catch (error) {
      if (!allowPaymentIntentFallback()) {
        throw error;
      }
      const metadataUserId =
        typeof options?.metadata?.initiatedByUserId === 'string'
          ? options.metadata.initiatedByUserId.trim()
          : '';
      const uid = metadataUserId || await resolveUserId().catch(() => '');
      return buildDemoIntent(uid, purpose, amount, paymentMethodType, options);
    }
  },

  async confirmPaymentIntent(
    paymentIntentId: string,
    paymentMethodId?: string | null,
  ): Promise<PaymentIntentConfirmationView> {
    try {
      return parseContract(
        paymentIntentConfirmationSchema,
        await apiGateway.post<unknown>('/payments/confirm', {
          paymentIntentId,
          paymentMethodId: paymentMethodId ?? null,
        }),
        'wallet.payment-intent.confirm',
        WALLET_CONTRACT_VERSION,
      );
    } catch (error) {
      const fallback = allowPaymentIntentFallback() ? settleDemoIntent(paymentIntentId) : null;
      if (fallback) return { id: fallback.id, status: fallback.status, settled: true, clientSecret: fallback.clientSecret ?? null };
      throw error;
    }
  },

  async getPaymentIntentStatus(paymentIntentId: string): Promise<PaymentIntentConfirmationView> {
    try {
      return parseContract(
        paymentIntentConfirmationSchema,
        await apiGateway.post<unknown>('/payments/status', { paymentIntentId }),
        'wallet.payment-intent.status',
        WALLET_CONTRACT_VERSION,
      );
    } catch (error) {
      const fallback = allowPaymentIntentFallback() ? readDemoIntentStatus(paymentIntentId) : null;
      if (fallback) return fallback;
      throw error;
    }
  },

  // ── Funding ──────────────────────────────────────────────────────────────────

  async topUp(
    amountOrUserId: number | string,
    paymentMethodOrAmount: string | number,
    maybePaymentMethod?: string,
  ): Promise<PaymentIntentView> {
    const { amount, paymentMethod } = parseTopUpArgs(
      amountOrUserId,
      paymentMethodOrAmount,
      maybePaymentMethod,
    );
    if (!isWalletPaymentMethodType(paymentMethod)) throw new Error('Unsupported payment method.');
    return walletApi.createPaymentIntent('deposit', amount, paymentMethod);
  },

  async withdraw(amount: number, bankAccount: string, providerName: string): Promise<void> {
    const token = requireStepUpToken('withdrawal');
    await apiGateway.post('/wallet/withdraw', { amount, bankAccount, providerName, verificationToken: token });
  },

  async sendMoney(
    recipientOrUserId: string,
    amountOrRecipient: number | string,
    noteOrAmount?: string | number,
    maybeNote?: string,
  ): Promise<void> {
    const { amount, note, recipientUserId } = parseSendMoneyArgs(
      recipientOrUserId,
      amountOrRecipient,
      noteOrAmount,
      maybeNote,
    );
    const token = requireStepUpToken('transfer');
    await apiGateway.post('/wallet/transfer', { amount, note: note ?? null, recipientUserId, verificationToken: token });
  },

  async invalidateWalletCache(userId?: string): Promise<void> {
    if (userId?.trim()) {
      walletReadCache.delete(userId.trim());
      walletInsightsCache.delete(userId.trim());
      return;
    }

    const resolvedUserId = await resolveUserId(userId);
    walletReadCache.delete(resolvedUserId);
    walletInsightsCache.delete(resolvedUserId);
  },

  // ── Subscriptions ────────────────────────────────────────────────────────────

  async subscribe(userId: string, planName: string, price: number, corridorId?: string | null): Promise<PaymentIntentView> {
    const uid = await resolveUserId(userId);
    const wallet = await walletApi.getWallet(uid);
    const methodType: WalletPaymentMethodType =
      wallet.balance >= price
        ? 'wallet'
        : (wallet.wallet.paymentMethods.find(m => m.isDefault)?.type ?? 'card');

    const intent = await walletApi.createPaymentIntent('subscription', price, methodType, {
      metadata: { planName, planCode: corridorId ? 'corridor-pass' : 'wasel-plus', corridorId: corridorId ?? null },
    });

    if (methodType === 'wallet' || wallet.wallet.paymentMethods.some(m => m.isDefault)) {
      await walletApi.confirmPaymentIntent(
        intent.id,
        wallet.wallet.paymentMethods.find(m => m.isDefault)?.id ?? null,
      );
    }

    return intent;
  },

  // ── Payment methods ──────────────────────────────────────────────────────────

  async getPaymentMethods(userId?: string): Promise<WalletPaymentMethod[]> {
    const uid = await resolveUserId(userId);
    return (await walletApi.getWallet(uid)).wallet.paymentMethods;
  },

  async addPaymentMethod(
    inputOrUserId: AddPaymentMethodInput | string,
    maybeInput?: AddPaymentMethodInput,
  ): Promise<void> {
    const input = parseAddPaymentMethodArgs(inputOrUserId, maybeInput);
    const token = requireStepUpToken('payment_method');
    await apiGateway.post('/wallet/payment-methods', {
      action: 'add',
      brand: input.brand ?? null,
      expiryMonth: input.expiryMonth ?? null,
      expiryYear: input.expiryYear ?? null,
      isDefault: input.isDefault ?? false,
      label: input.label ?? null,
      last4: input.last4 ?? null,
      provider: input.provider,
      providerReference: input.providerReference || input.tokenReference,
      type: input.type,
      verificationToken: token,
    });
  },

  async deletePaymentMethod(paymentMethodId: string): Promise<void> {
    const token = requireStepUpToken('payment_method');
    await apiGateway.post('/wallet/payment-methods', { action: 'remove', paymentMethodId, verificationToken: token });
  },

  async setDefaultPaymentMethod(paymentMethodId: string): Promise<void> {
    const token = requireStepUpToken('payment_method');
    await apiGateway.post('/wallet/payment-methods', { action: 'default', paymentMethodId, verificationToken: token });
  },

  // ── PIN / step-up auth ───────────────────────────────────────────────────────

  async setPin(pin: string): Promise<void> {
    await apiGateway.post('/wallet/set-pin', { pin });
  },

  async verifyPin(
    userIdOrPin: string,
    pinOrPurpose: string = 'transfer',
    purposeOrOtpCode?: string,
    otpCodeOrChallengeId?: string,
    maybeChallengeId?: string,
  ): Promise<WalletStepUpVerification> {
    const { challengeId, otpCode, pin, purpose } = parseVerifyPinArgs(
      userIdOrPin,
      pinOrPurpose,
      purposeOrOtpCode,
      otpCodeOrChallengeId,
      maybeChallengeId,
    );
    if (!isStepUpPurpose(purpose)) throw new Error('Unsupported wallet verification purpose.');

    const verification = parseContract(
      walletStepUpVerificationSchema,
      await apiGateway.post<unknown>('/wallet/verify-pin', {
        challengeId: challengeId ?? null,
        otpCode: otpCode ?? null,
        pin,
        purpose,
      }),
      'wallet.step-up.verify',
      WALLET_CONTRACT_VERSION,
    );

    if (verification.verified && verification.verificationToken) {
      cachedStepUpVerification = { ...verification, createdAt: Date.now() };
    }

    return verification;
  },

  // ── Misc ────────────────────────────────────────────────────────────────────

  async setAutoTopUp(
    enabledOrUserId?: boolean | string,
    amountOrEnabled?: number | boolean,
    thresholdOrAmount?: number,
    maybeThreshold?: number,
  ): Promise<void> {
    const { amount, enabled, threshold } = parseAutoTopUpArgs(
      enabledOrUserId,
      amountOrEnabled,
      thresholdOrAmount,
      maybeThreshold,
    );
    await apiGateway.post('/wallet/settings', {
      autoTopUpAmount: amount ?? 20,
      autoTopUpEnabled: Boolean(enabled),
      autoTopUpThreshold: threshold ?? 5,
    });
  },

  /** Not available in production wallet. */
  async claimReward(): Promise<void> {
    throw new Error('Wallet rewards are not enabled in the secure production wallet.');
  },
};

// ─── Step-up verification helper (exported for UI) ────────────────────────────

export async function requestWalletVerification(
  purpose: StepUpPurpose,
  pin: string,
  otpCode?: string,
  challengeId?: string,
): Promise<WalletStepUpVerification> {
  return walletApi.verifyPin(pin, purpose, otpCode, challengeId);
}

// ─── Test utilities ───────────────────────────────────────────────────────────

export function __resetWalletApiCachesForTests(): void {
  walletReadCache.clear();
  walletInsightsCache.clear();
  cachedStepUpVerification = null;
}
