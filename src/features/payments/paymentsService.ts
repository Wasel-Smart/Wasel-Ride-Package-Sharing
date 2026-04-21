import {
  isPaymentTransactionKind,
  type PaymentTransaction,
  type PaymentTransactionKind,
} from '../../../shared/domain-contracts';
import {
  isWalletPaymentMethodType,
  isWalletProviderName,
  type PaymentIntentView,
  type WalletData,
  type WalletPaymentMethod,
  type WalletPaymentMethodType,
  type WalletTransaction,
} from '../../../shared/wallet-contracts';
import { walletApi } from '../../services/walletApi';
import type {
  PaymentConfirmationResult,
  PaymentIntentSession,
  PaymentsDashboardData,
  PaymentRequestDraft,
  PaymentsSummary,
} from './paymentsTypes';

const PAYMENT_RELEVANT_TRANSACTION_TYPES = new Set([
  'deposit',
  'withdrawal',
  'transfer',
  'payment',
  'refund',
]);

const COMPLETED_STATUSES = new Set(['completed', 'posted', 'succeeded', 'refunded']);
const FINAL_PAYMENT_STATUSES = new Set(['succeeded', 'failed', 'cancelled']);

function createAttemptNonce(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeIdempotencySegment(value: string | number | null | undefined): string {
  return String(value ?? 'none')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'none';
}

export function createPaymentAttemptIdempotencyKey(
  userId: string,
  draft: Pick<
    PaymentRequestDraft,
    'purpose' | 'amount' | 'paymentMethodType' | 'referenceType' | 'referenceId'
  >,
  nonce = createAttemptNonce(),
): string {
  return [
    'wasel',
    normalizeIdempotencySegment(userId),
    normalizeIdempotencySegment(draft.purpose),
    normalizeIdempotencySegment(draft.paymentMethodType),
    normalizeIdempotencySegment(Number(draft.amount).toFixed(2)),
    normalizeIdempotencySegment(draft.referenceType),
    normalizeIdempotencySegment(draft.referenceId),
    normalizeIdempotencySegment(nonce),
  ].join(':');
}

type PaymentRelevantWalletTransaction = WalletTransaction & {
  type: 'deposit' | 'withdrawal' | 'transfer' | 'payment' | 'refund';
};

function normalizeMeta(meta: unknown): Record<string, unknown> {
  return meta && typeof meta === 'object' && !Array.isArray(meta)
    ? { ...(meta as Record<string, unknown>) }
    : {};
}

function isPaymentRelevantTransaction(
  transaction: WalletTransaction,
): transaction is PaymentRelevantWalletTransaction {
  return PAYMENT_RELEVANT_TRANSACTION_TYPES.has(transaction.type);
}

function inferPaymentKind(transaction: PaymentRelevantWalletTransaction): PaymentTransactionKind {
  if (transaction.type !== 'payment') {
    return transaction.type;
  }

  const meta = normalizeMeta(transaction.metadata);
  const explicitKind = meta.purpose ?? meta.referenceType ?? meta.kind;

  if (isPaymentTransactionKind(explicitKind)) {
    return explicitKind;
  }

  const description = transaction.description.toLowerCase();

  if (description.includes('package') || description.includes('parcel')) {
    return 'package_payment';
  }

  if (description.includes('subscription') || description.includes('plus')) {
    return 'subscription';
  }

  return 'ride_payment';
}

function inferPaymentMethodType(
  transaction: PaymentRelevantWalletTransaction,
  paymentMethods: WalletPaymentMethod[],
): WalletPaymentMethodType {
  const meta = normalizeMeta(transaction.metadata);
  const explicitType = meta.paymentMethodType ?? meta.methodType;
  if (isWalletPaymentMethodType(explicitType)) {
    return explicitType;
  }

  const matchedMethod = paymentMethods.find((method) => method.id === transaction.paymentIntentId);
  if (matchedMethod) {
    return matchedMethod.type;
  }

  return transaction.amount >= 0 ? 'card' : 'wallet';
}

function inferProvider(
  transaction: PaymentRelevantWalletTransaction,
  paymentMethods: WalletPaymentMethod[],
  paymentMethodType: WalletPaymentMethodType,
) {
  const meta = normalizeMeta(transaction.metadata);
  const explicitProvider = meta.provider ?? meta.processor;
  if (isWalletProviderName(explicitProvider)) {
    return explicitProvider;
  }

  const matchedMethod = paymentMethods.find((method) => method.type === paymentMethodType && method.isDefault);
  return matchedMethod?.provider ?? (paymentMethodType === 'wallet' ? 'wallet' : 'stripe');
}

function toPaymentTransaction(
  transaction: PaymentRelevantWalletTransaction,
  wallet: WalletData,
): PaymentTransaction {
  const paymentMethodType = inferPaymentMethodType(transaction, wallet.wallet.paymentMethods);
  const provider = inferProvider(transaction, wallet.wallet.paymentMethods, paymentMethodType);
  const meta = normalizeMeta(transaction.metadata);

  return {
    id: transaction.id,
    kind: inferPaymentKind(transaction),
    status: transaction.status,
    amount: Math.abs(transaction.amount),
    currency: wallet.currency,
    description: transaction.description,
    direction: transaction.amount >= 0 ? 'credit' : 'debit',
    paymentMethodType,
    provider,
    referenceType: typeof meta.referenceType === 'string' ? meta.referenceType : null,
    referenceId: typeof meta.referenceId === 'string' ? meta.referenceId : transaction.paymentIntentId ?? null,
    createdAt: transaction.createdAt,
    meta,
  };
}

function toPaymentTransactionFromIntent(
  intent: PaymentIntentView,
  description?: string,
  meta?: Record<string, unknown>,
): PaymentTransaction {
  const normalizedMeta = normalizeMeta(meta);

  return {
    id: intent.id,
    kind: intent.purpose === 'ride_payment'
      ? 'ride_payment'
      : intent.purpose === 'package_payment'
        ? 'package_payment'
        : intent.purpose,
    status: intent.status,
    amount: intent.amount,
    currency: intent.currency,
    description: description ?? `Payment intent for ${intent.purpose.replace('_', ' ')}`,
    direction: intent.purpose === 'deposit' ? 'credit' : 'debit',
    paymentMethodType: intent.paymentMethodType,
    provider: intent.provider,
    referenceType: intent.referenceType ?? null,
    referenceId: intent.referenceId ?? null,
    createdAt: intent.createdAt,
    meta: normalizedMeta,
  };
}

function buildSummary(wallet: WalletData, recentPayments: PaymentTransaction[]): PaymentsSummary {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const pendingTransactions = recentPayments.filter((payment) => !COMPLETED_STATUSES.has(payment.status));
  const settledThisMonth = recentPayments
    .filter((payment) => payment.direction === 'debit')
    .filter((payment) => COMPLETED_STATUSES.has(payment.status))
    .filter((payment) => new Date(payment.createdAt) >= startOfMonth)
    .reduce((sum, payment) => sum + payment.amount, 0);

  return {
    availableBalance: wallet.balance,
    paymentMethodsCount: wallet.wallet.paymentMethods.length,
    defaultMethodLabel: wallet.wallet.paymentMethods.find((method) => method.isDefault)?.label ?? 'Wallet balance',
    pendingCount: pendingTransactions.length,
    pendingAmount: pendingTransactions.reduce((sum, payment) => sum + payment.amount, 0),
    settledThisMonth,
  };
}

export const paymentsService = {
  async getDashboard(userId: string): Promise<PaymentsDashboardData> {
    const wallet = await walletApi.getWallet(userId);
    const recentPayments = wallet.transactions
      .filter(isPaymentRelevantTransaction)
      .map((transaction) => toPaymentTransaction(transaction, wallet));

    return {
      wallet,
      paymentMethods: wallet.wallet.paymentMethods,
      recentPayments,
      summary: buildSummary(wallet, recentPayments),
    };
  },

  async initiatePayment(userId: string, draft: PaymentRequestDraft): Promise<PaymentIntentSession> {
    const metadata = {
      ...(draft.metadata ?? {}),
      originDomain: 'payments',
      initiatedByUserId: userId,
    };

    const intent = await walletApi.createPaymentIntent(
      draft.purpose,
      draft.amount,
      draft.paymentMethodType,
      {
        referenceType: draft.referenceType ?? null,
        referenceId: draft.referenceId ?? null,
        metadata,
        idempotencyKey: draft.idempotencyKey ?? null,
      },
    );

    return {
      transaction: toPaymentTransactionFromIntent(intent, draft.description, metadata),
      clientSecret: intent.clientSecret ?? null,
      redirectUrl: intent.redirectUrl ?? null,
    };
  },

  async confirmPayment(paymentIntentId: string, paymentMethodId?: string | null): Promise<PaymentConfirmationResult> {
    const result = await walletApi.confirmPaymentIntent(paymentIntentId, paymentMethodId);
    return {
      id: String(result.id ?? paymentIntentId),
      status: String(result.status ?? 'processing'),
      settled: Boolean(result.settled),
      clientSecret: result.clientSecret ?? null,
    };
  },

  async syncPayment(paymentIntentId: string): Promise<PaymentConfirmationResult> {
    const result = await walletApi.getPaymentIntentStatus(paymentIntentId);
    return {
      id: String(result.id ?? paymentIntentId),
      status: String(result.status ?? 'processing'),
      settled: Boolean(result.settled),
      clientSecret: result.clientSecret ?? null,
    };
  },

  async awaitPaymentSettlement(
    paymentIntentId: string,
    options: {
      attempts?: number;
      delayMs?: number;
    } = {},
  ): Promise<PaymentConfirmationResult> {
    const attempts = Math.max(1, options.attempts ?? 8);
    const delayMs = Math.max(250, options.delayMs ?? 1_500);

    let latest = await paymentsService.syncPayment(paymentIntentId);
    for (let attempt = 1; attempt < attempts; attempt += 1) {
      if (latest.settled || FINAL_PAYMENT_STATUSES.has(String(latest.status))) {
        return latest;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      latest = await paymentsService.syncPayment(paymentIntentId);
    }

    return latest;
  },
};

export function resolveDefaultPaymentMethodType(
  paymentMethods: WalletPaymentMethod[],
  preferredAmount: number,
  walletBalance: number,
): WalletPaymentMethodType {
  if (walletBalance >= preferredAmount) {
    return 'wallet';
  }

  return paymentMethods.find((method) => method.isDefault)?.type ?? 'card';
}
