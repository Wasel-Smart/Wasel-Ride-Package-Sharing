import { API_URL, fetchWithRetry, getAuthDetails, publicAnonKey } from './core';
import {
  isWalletPaymentMethodType,
  isStepUpPurpose,
  type PaymentIntentView,
  type StepUpPurpose,
  type WalletData,
  type WalletEscrow,
  type WalletPaymentMethod,
  type WalletPaymentMethodType,
  type WalletStepUpVerification,
  type WalletSubscription,
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

const WALLET_API_BASE = API_URL ? `${API_URL}/wallet` : '';
const PAYMENTS_API_BASE = API_URL ? `${API_URL}/payments` : '';
const WALLET_SNAPSHOT_STORAGE_PREFIX = 'wasel-wallet-snapshot-v2';
const WALLET_SNAPSHOT_MAX_AGE_MS = 2 * 60_000;
const WALLET_READ_ONLY_ERROR =
  'Wallet actions are unavailable until the secure wallet backend is reachable.';

type CacheEntry<T> = {
  expiresAt: number;
  promise: Promise<T>;
};

export interface RewardItem {
  id: string;
  description: string;
  amount: number;
  expirationDate: string;
}

export type {
  WalletData,
  WalletEscrow,
  WalletPaymentMethod,
  WalletSubscription,
  WalletTransaction,
};

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

export interface AddPaymentMethodInput {
  type: WalletPaymentMethodType;
  provider: 'stripe' | 'cliq' | 'aman' | 'wallet';
  providerReference: string;
  label?: string | null;
  brand?: string | null;
  tokenReference?: string | null;
  last4?: string | null;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  isDefault?: boolean;
}

interface WalletBalanceSummary {
  available: number;
  pending: number;
  currency: string;
}

interface ProcessWalletTransactionInput {
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  referenceId?: string;
  referenceType?: string;
}

type PersistedWalletSnapshot = {
  storedAt: number;
  snapshot: WalletSnapshot;
};

const walletReadCache = new Map<string, CacheEntry<WalletSnapshot>>();
const walletInsightsCache = new Map<string, CacheEntry<WalletInsightsSnapshot>>();
let cachedStepUpVerification: (WalletStepUpVerification & { createdAt: number }) | null = null;

function canUseWalletApi(): boolean {
  return Boolean(WALLET_API_BASE && PAYMENTS_API_BASE && publicAnonKey);
}

function requireWalletApi(message = WALLET_READ_ONLY_ERROR): void {
  if (!canUseWalletApi()) {
    throw new Error(message);
  }
}

function createWalletReliabilityMeta(degraded = false): WalletReliabilityMeta {
  return {
    source: 'edge-api',
    degraded,
    fetchedAt: new Date().toISOString(),
  };
}

function walletSnapshotStorageKey(userId: string) {
  return `${WALLET_SNAPSHOT_STORAGE_PREFIX}:${userId}`;
}

function persistWalletSnapshot(userId: string, snapshot: WalletSnapshot): void {
  if (typeof window === 'undefined') {return;}
  const payload: PersistedWalletSnapshot = {
    storedAt: Date.now(),
    snapshot,
  };
  window.localStorage.setItem(walletSnapshotStorageKey(userId), JSON.stringify(payload));
}

function readPersistedWalletSnapshot(userId: string): WalletSnapshot | null {
  if (typeof window === 'undefined') {return null;}
  try {
    const raw = window.localStorage.getItem(walletSnapshotStorageKey(userId));
    if (!raw) {return null;}
    const parsed = JSON.parse(raw) as PersistedWalletSnapshot;
    if (!parsed?.snapshot || typeof parsed.storedAt !== 'number') {return null;}
    if (Date.now() - parsed.storedAt > WALLET_SNAPSHOT_MAX_AGE_MS) {return null;}
    return parsed.snapshot;
  } catch {
    return null;
  }
}

function withCache<T>(
  cache: Map<string, CacheEntry<T>>,
  key: string,
  ttlMs: number,
  producer: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const promise = producer().catch(error => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, { expiresAt: now + ttlMs, promise });
  return promise;
}

async function walletFetch(path: string, init?: RequestInit) {
  requireWalletApi();
  const { token } = await getAuthDetails();
  const response = await fetchWithRetry(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(String((errorPayload as { error?: string }).error ?? 'Wallet request failed.'));
  }

  return response;
}

function buildInsights(wallet: WalletData): InsightsData {
  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonth = lastMonthDate.getMonth();
  const lastMonthYear = lastMonthDate.getFullYear();

  const currentMonth = wallet.transactions.filter(tx => {
    const date = new Date(tx.createdAt);
    return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
  });
  const previousMonth = wallet.transactions.filter(tx => {
    const date = new Date(tx.createdAt);
    return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
  });

  const thisMonthSpent = currentMonth
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const lastMonthSpent = previousMonth
    .filter(tx => tx.amount < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  const thisMonthEarned = currentMonth
    .filter(tx => tx.amount > 0)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const changePercent =
    lastMonthSpent === 0
      ? thisMonthSpent > 0
        ? 100
        : 0
      : ((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100;

  const categoryBreakdown = currentMonth.reduce<Record<string, number>>((acc, tx) => {
    const key = String(tx.type ?? 'payment');
    acc[key] = (acc[key] ?? 0) + Math.abs(tx.amount);
    return acc;
  }, {});

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
    const monthlyTx = wallet.transactions.filter(tx => {
      const txDate = new Date(tx.createdAt);
      return txDate.getMonth() === date.getMonth() && txDate.getFullYear() === date.getFullYear();
    });
    return {
      month: monthLabel,
      spent: monthlyTx
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      earned: monthlyTx.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0),
    };
  }).reverse();

  return {
    thisMonthSpent,
    lastMonthSpent,
    thisMonthEarned,
    changePercent,
    categoryBreakdown,
    monthlyTrend,
    totalTransactions: wallet.transactions.length,
    carbonSaved: Number((wallet.total_earned * 0.15).toFixed(2)),
  };
}

async function getFreshWalletSnapshot(userId: string): Promise<WalletSnapshot> {
  const response = await walletFetch('/wallet');
  const data = parseContract(
    walletDataSchema,
    await response.json(),
    'wallet.snapshot',
    WALLET_CONTRACT_VERSION,
  );
  const snapshot = {
    data,
    meta: createWalletReliabilityMeta(false),
  } satisfies WalletSnapshot;
  persistWalletSnapshot(userId, snapshot);
  return snapshot;
}

async function requireVerifiedToken(
  purpose: StepUpPurpose,
  pin: string,
  otpCode?: string,
  challengeId?: string,
) {
  const verification = await walletApi.verifyPin('', pin, purpose, otpCode, challengeId);
  if (!verification.verified || !verification.verificationToken) {
    return verification;
  }
  cachedStepUpVerification = { ...verification, createdAt: Date.now() };
  return verification;
}

function getCachedVerificationToken(purpose: StepUpPurpose): string | null {
  if (!cachedStepUpVerification?.verificationToken) {return null;}
  if (cachedStepUpVerification.purpose !== purpose) {return null;}
  if (Date.now() - cachedStepUpVerification.createdAt > 9 * 60_000) {return null;}
  return cachedStepUpVerification.verificationToken;
}

/**
 * Wasel Wallet API
 * 
 * Provides secure wallet operations including:
 * - Balance and transaction management
 * - Payment intent creation and confirmation
 * - Payment method management
 * - PIN verification and step-up authentication
 * - Subscriptions and transfers
 * 
 * @remarks
 * All operations require authentication. Sensitive operations (withdrawals, transfers,
 * payment method changes) require PIN + OTP verification via step-up authentication.
 * 
 * @example
 * ```typescript
 * // Get wallet data
 * const wallet = await walletApi.getWallet(userId);
 * 
 * // Create payment intent
 * const intent = await walletApi.createPaymentIntent(
 *   'ride_payment',
 *   25.50,
 *   'card',
 *   { referenceType: 'ride', referenceId: 'ride_123' }
 * );
 * ```
 */
export const walletApi = {
  /**
   * Retrieves the complete wallet data for the authenticated user.
   * 
   * @param userId - User ID (currently unused, uses authenticated user)
   * @returns Promise resolving to wallet data including balance, transactions, and payment methods
   * @throws Error if wallet API is unavailable or authentication fails
   * 
   * @example
   * ```typescript
   * const wallet = await walletApi.getWallet(userId);
   * console.log(`Balance: ${wallet.balance} JOD`);
   * ```
   */
  async getWallet(userId: string): Promise<WalletData> {
    void userId;
    const { userId: authUserId } = await getAuthDetails();
    const snapshot = await walletApi.getWalletSnapshot(authUserId);
    return snapshot.data;
  },

  async getBalance(userId: string): Promise<WalletBalanceSummary> {
    const wallet = await walletApi.getWallet(userId);
    return {
      available: wallet.balance,
      pending: wallet.pendingBalance,
      currency: wallet.currency,
    };
  },

  /**
   * Retrieves wallet snapshot with caching and offline fallback.
   * 
   * @param userId - User ID for wallet lookup
   * @returns Promise resolving to wallet snapshot with reliability metadata
   * @remarks
   * - Cached for 15 seconds to reduce API calls
   * - Falls back to localStorage if API is unavailable
   * - Snapshot includes degradation flag if using fallback data
   */
  async getWalletSnapshot(userId: string): Promise<WalletSnapshot> {
    return withCache(walletReadCache, userId, 15_000, async () => {
      try {
        return await getFreshWalletSnapshot(userId);
      } catch (error) {
        const persisted = readPersistedWalletSnapshot(userId);
        if (persisted) {
          return {
            data: persisted.data,
            meta: createWalletReliabilityMeta(true),
          };
        }
        throw error;
      }
    });
  },

  getPersistedWalletSnapshot(userId: string): WalletSnapshot | null {
    return readPersistedWalletSnapshot(userId);
  },

  async getInsights(userId: string): Promise<InsightsData> {
    void userId;
    const { userId: authUserId } = await getAuthDetails();
    const snapshot = await walletApi.getWalletSnapshot(authUserId);
    return buildInsights(snapshot.data);
  },

  async getInsightsSnapshot(userId: string): Promise<WalletInsightsSnapshot> {
    return withCache(walletInsightsCache, userId, 30_000, async () => {
      const walletSnapshot = await walletApi.getWalletSnapshot(userId);
      return {
        data: buildInsights(walletSnapshot.data),
        meta: walletSnapshot.meta,
      };
    });
  },

  async getTransactions(userId: string, page = 1, pageSize = 20) {
    void userId;
    const { userId: authUserId } = await getAuthDetails();
    const wallet = await walletApi.getWallet(authUserId);
    const start = Math.max(0, (page - 1) * pageSize);
    const end = start + pageSize;
    return {
      transactions: wallet.transactions.slice(start, end),
      total: wallet.transactions.length,
      page,
      pageSize,
    };
  },

  async processTransaction(
    userId: string,
    input: ProcessWalletTransactionInput,
  ): Promise<WalletTransaction> {
    const wallet = await walletApi.getWallet(userId);
    const signedAmount = input.type === 'credit' ? Math.abs(input.amount) : -Math.abs(input.amount);
    const transaction: WalletTransaction = {
      id: input.referenceId ?? `wallet-tx-${Date.now()}`,
      type: input.type === 'credit' ? 'deposit' : 'payment',
      description: input.description,
      amount: signedAmount,
      createdAt: new Date().toISOString(),
      status: 'completed',
      metadata: {
        referenceId: input.referenceId ?? null,
        referenceType: input.referenceType ?? null,
      },
    };

    const snapshot = walletApi.getPersistedWalletSnapshot(userId);
    if (snapshot) {
      const nextBalance = Number((wallet.balance + signedAmount).toFixed(2));
      persistWalletSnapshot(userId, {
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

  /**
   * Creates a payment intent for various wallet operations.
   * 
   * @param purpose - Payment purpose: 'deposit', 'ride_payment', 'package_payment', 'subscription', or 'withdrawal'
   * @param amount - Amount in JOD (Jordanian Dinars)
   * @param paymentMethodType - Payment method: 'card', 'wallet', 'cliq', or 'aman'
   * @param options - Optional configuration
   * @param options.referenceType - Type of reference entity (e.g., 'ride', 'package')
   * @param options.referenceId - ID of reference entity
   * @param options.metadata - Additional metadata for the payment
   * @param options.idempotencyKey - Key to prevent duplicate payments
   * @returns Promise resolving to payment intent with client secret for confirmation
   * @throws Error if wallet API is unavailable or validation fails
   * 
   * @example
   * ```typescript
   * const intent = await walletApi.createPaymentIntent(
   *   'ride_payment',
   *   25.50,
   *   'card',
   *   {
   *     referenceType: 'ride',
   *     referenceId: 'ride_abc123',
   *     idempotencyKey: 'payment_xyz789'
   *   }
   * );
   * ```
   */
  async createPaymentIntent(
    purpose: 'deposit' | 'ride_payment' | 'package_payment' | 'subscription' | 'withdrawal',
    amount: number,
    paymentMethodType: WalletPaymentMethodType,
    options?: {
      referenceType?: string | null;
      referenceId?: string | null;
      metadata?: Record<string, unknown>;
      idempotencyKey?: string | null;
    },
  ): Promise<PaymentIntentView> {
    const response = await walletFetch('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({
        purpose,
        amount,
        paymentMethodType,
        referenceType: options?.referenceType ?? null,
        referenceId: options?.referenceId ?? null,
        metadata: options?.metadata ?? {},
        idempotencyKey: options?.idempotencyKey ?? null,
      }),
    });
    return parseContract(
      paymentIntentViewSchema,
      await response.json(),
      'wallet.payment-intent.create',
      WALLET_CONTRACT_VERSION,
    );
  },

  async confirmPaymentIntent(paymentIntentId: string, paymentMethodId?: string | null) {
    const response = await walletFetch('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
        paymentMethodId: paymentMethodId ?? null,
      }),
    });
    return parseContract(
      paymentIntentConfirmationSchema,
      await response.json(),
      'wallet.payment-intent.confirm',
      WALLET_CONTRACT_VERSION,
    );
  },

  async getPaymentIntentStatus(paymentIntentId: string) {
    const response = await walletFetch('/payments/status', {
      method: 'POST',
      body: JSON.stringify({
        paymentIntentId,
      }),
    });
    return parseContract(
      paymentIntentConfirmationSchema,
      await response.json(),
      'wallet.payment-intent.status',
      WALLET_CONTRACT_VERSION,
    );
  },

  async topUp(userId: string, amount: number, paymentMethod: string) {
    void userId;
    if (!isWalletPaymentMethodType(paymentMethod)) {
      throw new Error('Unsupported payment method.');
    }
    return walletApi.createPaymentIntent('deposit', amount, paymentMethod);
  },

  async withdraw(userId: string, amount: number, bankAccount: string, providerName: string) {
    void userId;
    const token = getCachedVerificationToken('withdrawal');
    if (!token) {
      throw new Error('Verify your wallet PIN and OTP before requesting a withdrawal.');
    }
    await walletFetch('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        bankAccount,
        providerName,
        verificationToken: token,
      }),
    });
  },

  async sendMoney(userId: string, recipientUserId: string, amount: number, note?: string) {
    void userId;
    const token = getCachedVerificationToken('transfer');
    if (!token) {
      throw new Error('Verify your wallet PIN and OTP before sending money.');
    }
    await walletFetch('/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify({
        recipientUserId,
        amount,
        note: note ?? null,
        verificationToken: token,
      }),
    });
  },

  async setPin(userId: string, pin: string) {
    void userId;
    await walletFetch('/wallet/set-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  /**
   * Verifies wallet PIN for step-up authentication.
   * 
   * @param userId - User ID (currently unused, uses authenticated user)
   * @param pin - 4-6 digit wallet PIN
   * @param purpose - Verification purpose: 'transfer', 'withdrawal', or 'payment_method'
   * @param otpCode - Optional OTP code for additional verification
   * @param challengeId - Optional challenge ID from previous verification attempt
   * @returns Promise resolving to verification result with token if successful
   * @throws Error if PIN is invalid or verification fails
   * 
   * @remarks
   * Verification tokens are cached for 9 minutes and must match the purpose.
   * Some operations require both PIN and OTP verification.
   * 
   * @example
   * ```typescript
   * const verification = await walletApi.verifyPin(
   *   userId,
   *   '1234',
   *   'transfer',
   *   '123456' // OTP code
   * );
   * 
   * if (verification.verified) {
   *   // Proceed with sensitive operation
   *   await walletApi.sendMoney(userId, recipientId, 50);
   * }
   * ```
   */
  async verifyPin(
    userId: string,
    pin: string,
    purpose: string = 'transfer',
    otpCode?: string,
    challengeId?: string,
  ): Promise<WalletStepUpVerification> {
    void userId;
    if (!isStepUpPurpose(purpose)) {
      throw new Error('Unsupported wallet verification purpose.');
    }
    const response = await walletFetch('/wallet/verify-pin', {
      method: 'POST',
      body: JSON.stringify({
        pin,
        purpose,
        otpCode: otpCode ?? null,
        challengeId: challengeId ?? null,
      }),
    });
    const verification = parseContract(
      walletStepUpVerificationSchema,
      await response.json(),
      'wallet.step-up.verify',
      WALLET_CONTRACT_VERSION,
    );
    if (verification.verified && verification.verificationToken) {
      cachedStepUpVerification = { ...verification, createdAt: Date.now() };
    }
    return verification;
  },

  async claimReward(userId?: string, rewardId?: string): Promise<void> {
    void userId;
    void rewardId;
    throw new Error('Wallet rewards are not enabled in the secure production wallet.');
  },

  async setAutoTopUp(
    userId?: string,
    enabled?: boolean,
    amount?: number,
    threshold?: number,
  ): Promise<void> {
    void userId;
    await walletFetch('/wallet/settings', {
      method: 'POST',
      body: JSON.stringify({
        autoTopUpEnabled: Boolean(enabled),
        autoTopUpAmount: amount ?? 20,
        autoTopUpThreshold: threshold ?? 5,
      }),
    });
  },

  async subscribe(userId: string, planName: string, price: number, corridorId?: string | null) {
    void userId;
    const { userId: authUserId } = await getAuthDetails();
    const wallet = await walletApi.getWallet(authUserId);
    const paymentMethodType: WalletPaymentMethodType =
      wallet.balance >= price
        ? 'wallet'
        : (wallet.wallet.paymentMethods.find(method => method.isDefault)?.type ?? 'card');

    const intent = await walletApi.createPaymentIntent('subscription', price, paymentMethodType, {
      metadata: {
        planName,
        planCode: corridorId ? 'corridor-pass' : 'wasel-plus',
        corridorId: corridorId ?? null,
      },
    });

    if (
      paymentMethodType === 'wallet' ||
      wallet.wallet.paymentMethods.some(method => method.isDefault)
    ) {
      await walletApi.confirmPaymentIntent(
        intent.id,
        wallet.wallet.paymentMethods.find(method => method.isDefault)?.id ?? null,
      );
    }

    return intent;
  },

  async getPaymentMethods(userId: string): Promise<WalletPaymentMethod[]> {
    void userId;
    const { userId: authUserId } = await getAuthDetails();
    const wallet = await walletApi.getWallet(authUserId);
    return wallet.wallet.paymentMethods;
  },

  async addPaymentMethod(userId: string, input: AddPaymentMethodInput) {
    void userId;
    const token = getCachedVerificationToken('payment_method');
    if (!token) {
      throw new Error('Verify your wallet PIN and OTP before changing payment methods.');
    }
    await walletFetch('/wallet/payment-methods', {
      method: 'POST',
      body: JSON.stringify({
        action: 'add',
        type: input.type,
        provider: input.provider,
        providerReference: input.providerReference || input.tokenReference,
        label: input.label ?? null,
        brand: input.brand ?? null,
        last4: input.last4 ?? null,
        expiryMonth: input.expiryMonth ?? null,
        expiryYear: input.expiryYear ?? null,
        isDefault: input.isDefault ?? false,
        verificationToken: token,
      }),
    });
  },

  async deletePaymentMethod(userId: string, paymentMethodId: string) {
    void userId;
    const token = getCachedVerificationToken('payment_method');
    if (!token) {
      throw new Error('Verify your wallet PIN and OTP before changing payment methods.');
    }
    await walletFetch('/wallet/payment-methods', {
      method: 'POST',
      body: JSON.stringify({
        action: 'remove',
        paymentMethodId,
        verificationToken: token,
      }),
    });
  },

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string) {
    void userId;
    const token = getCachedVerificationToken('payment_method');
    if (!token) {
      throw new Error('Verify your wallet PIN and OTP before changing payment methods.');
    }
    await walletFetch('/wallet/payment-methods', {
      method: 'POST',
      body: JSON.stringify({
        action: 'default',
        paymentMethodId,
        verificationToken: token,
      }),
    });
  },
};

export async function requestWalletVerification(
  purpose: StepUpPurpose,
  pin: string,
  otpCode?: string,
  challengeId?: string,
) {
  return requireVerifiedToken(purpose, pin, otpCode, challengeId);
}

export function __resetWalletApiCachesForTests() {
  walletReadCache.clear();
  walletInsightsCache.clear();
  cachedStepUpVerification = null;
}
