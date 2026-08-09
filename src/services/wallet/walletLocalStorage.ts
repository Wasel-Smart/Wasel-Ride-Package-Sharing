/**
 * Wallet local-storage tier.
 * Acts as a last-resort fallback when both the edge API and direct Supabase
 * are unavailable (e.g. offline, cold-start before auth resolves).
 * Never used as the primary store in production.
 */

import { sanitizeHtml } from '../../utils/sanitization';
import type {
  LocalWalletRecord,
  PaymentMethodInput,
  PaymentMethodRow,
  TransactionRow,
  WalletData,
  WalletTransaction,
} from './walletTypes';

const LOCAL_WALLET_KEY = 'wasel-wallet-local-v1';
const LOCAL_AUTH_USER_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_LOCAL_AUTH_STORAGE_KEY) ||
  'wasel_user_session';

export function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function canUseLocalWalletStorage(): boolean {
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

export function syncLocalAuthBalance(userId: string, balance: number): void {
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

export function buildDefaultLocalWalletRecord(userId: string): LocalWalletRecord {
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

export function normalizeLocalWalletRecord(userId: string, value: unknown): LocalWalletRecord {
  const fallback = buildDefaultLocalWalletRecord(userId);
  if (!value || typeof value !== 'object') return fallback;
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

export function readLocalWalletRecord(userId: string): LocalWalletRecord {
  if (!canUseLocalWalletStorage()) return buildDefaultLocalWalletRecord(userId);
  try {
    const raw = window.localStorage.getItem(getLocalWalletStorageKey(userId));
    if (!raw) return buildDefaultLocalWalletRecord(userId);
    return normalizeLocalWalletRecord(userId, JSON.parse(raw));
  } catch {
    return buildDefaultLocalWalletRecord(userId);
  }
}

export function writeLocalWalletRecord(userId: string, record: LocalWalletRecord): LocalWalletRecord {
  const normalized = normalizeLocalWalletRecord(userId, record);
  if (canUseLocalWalletStorage()) {
    window.localStorage.setItem(getLocalWalletStorageKey(userId), JSON.stringify(normalized));
  }
  syncLocalAuthBalance(userId, normalized.balance);
  return normalized;
}

export function buildWalletPayloadFromLocal(record: LocalWalletRecord): WalletData {
  const transactions = [...record.transactions].sort(
    (l, r) => new Date(r.createdAt).getTime() - new Date(l.createdAt).getTime(),
  );
  const totalEarned = transactions.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);
  const totalSpent = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const totalDeposited = transactions
    .filter(tx => tx.type === 'add_funds' && tx.amount > 0)
    .reduce((s, tx) => s + tx.amount, 0);

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

export function updateLocalWalletRecord(
  userId: string,
  updater: (current: LocalWalletRecord) => LocalWalletRecord,
): WalletData {
  const current = readLocalWalletRecord(userId);
  const next = updater(current);
  const persisted = writeLocalWalletRecord(userId, { ...next, userId, updatedAt: new Date().toISOString() });
  return buildWalletPayloadFromLocal(persisted);
}

export async function fetchWalletLocal(userId: string): Promise<WalletData> {
  return buildWalletPayloadFromLocal(writeLocalWalletRecord(userId, readLocalWalletRecord(userId)));
}

export async function setAutoTopUpLocal(
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

export async function getPaymentMethodsLocal(userId: string): Promise<{ methods: PaymentMethodRow[] }> {
  const wallet = readLocalWalletRecord(userId);
  return { methods: Array.isArray(wallet.paymentMethods) ? wallet.paymentMethods : [] };
}

export async function addPaymentMethodLocal(
  userId: string,
  method: PaymentMethodInput,
): Promise<PaymentMethodInput> {
  const nextMethod = {
    ...method,
    id: method.id ?? `local-pm-${crypto.randomUUID()}`,
    is_default: Boolean(method.is_default),
    status: 'active',
  };
  updateLocalWalletRecord(userId, current => ({
    ...current,
    paymentMethods: [nextMethod, ...current.paymentMethods.filter(item => item?.id !== nextMethod.id)],
  }));
  return nextMethod;
}

export async function deletePaymentMethodLocal(
  userId: string,
  methodId: string,
): Promise<{ success: true }> {
  updateLocalWalletRecord(userId, current => ({
    ...current,
    paymentMethods: current.paymentMethods.filter(item => item?.id !== methodId),
  }));
  return { success: true };
}

export async function getTrustScoreLocal(
  userId: string,
): Promise<{ totalTrips: number; cashRating: number; onTimePayments: number; deposit: number }> {
  const wallet = await fetchWalletLocal(userId);
  return { totalTrips: 0, cashRating: 5, onTimePayments: 98, deposit: wallet.balance };
}

export function describeTransaction(row: TransactionRow): string {
  const rawLabel =
    typeof row.metadata?.description === 'string'
      ? row.metadata.description
      : typeof row.metadata?.note === 'string'
        ? row.metadata.note
        : '';
  if (rawLabel) return sanitizeHtml(rawLabel);
  switch (row.transaction_type) {
    case 'add_funds': return 'Wallet top-up';
    case 'transfer_funds': return row.direction === 'credit' ? 'Wallet transfer received' : 'Wallet transfer sent';
    case 'withdrawal': return 'Wallet withdrawal';
    case 'driver_earning': return 'Driver earnings';
    case 'ride_payment': return 'Ride payment';
    case 'package_payment': return 'Package payment';
    default: return 'Wallet transaction';
  }
}

export function toWalletTransaction(row: TransactionRow): WalletTransaction {
  const amount = toNumber(row.amount, 0);
  const signedAmount = row.direction === 'debit' ? -Math.abs(amount) : Math.abs(amount);
  return {
    id: String(row.transaction_id ?? `tx-${crypto.randomUUID()}`),
    type: String(row.transaction_type ?? 'wallet'),
    description: describeTransaction(row),
    amount: signedAmount,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    status: row.transaction_status ? sanitizeHtml(String(row.transaction_status)) : undefined,
  };
}

export function buildInsightsFromTransactions(transactions: WalletTransaction[]) {
  const now = new Date();
  const currentMonthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const previousMonthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previousMonthKey = `${previousMonthDate.getUTCFullYear()}-${String(previousMonthDate.getUTCMonth() + 1).padStart(2, '0')}`;

  const thisMonth = transactions.filter(tx => tx.createdAt.startsWith(currentMonthKey));
  const lastMonth = transactions.filter(tx => tx.createdAt.startsWith(previousMonthKey));

  const thisMonthSpent = thisMonth.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const lastMonthSpent = lastMonth.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
  const thisMonthEarned = thisMonth.filter(tx => tx.amount > 0).reduce((s, tx) => s + tx.amount, 0);

  const changePercent =
    lastMonthSpent > 0
      ? Number((((thisMonthSpent - lastMonthSpent) / lastMonthSpent) * 100).toFixed(1))
      : thisMonthSpent > 0 ? 100 : 0;

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
