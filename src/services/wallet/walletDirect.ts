/**
 * Wallet direct-Supabase tier.
 * Used when the edge API is unavailable and allowDirectSupabaseFallback is true,
 * or in non-production environments for local development.
 */

import { supabase } from '../core';
import type {
  PaymentMethodInput,
  PaymentMethodRow,
  TransactionRow,
  WalletData,
  WalletRow,
} from './walletTypes';
import {
  toNumber,
  toWalletTransaction,
} from './walletLocalStorage';

function getDb() {
  if (!supabase) throw new Error('Supabase client is not initialised');
  return supabase;
}

function currencyFromWallet(wallet: WalletRow | null): string {
  const code = String(wallet?.currency_code ?? 'JOD').trim().toUpperCase();
  return code || 'JOD';
}

function normalizePaymentMethod(method: string): string {
  switch (method) {
    case 'card': return 'card';
    case 'apple_pay': return 'apple_pay';
    case 'google_pay': return 'google_pay';
    case 'bank_transfer':
    case 'instant': return 'bank_transfer';
    case 'cliq': return 'wallet';
    default: return 'card';
  }
}

function buildWalletPayload(
  wallet: WalletRow | null,
  transactions: TransactionRow[],
  paymentMethods: PaymentMethodRow[] = [],
): WalletData {
  const normalizedTransactions = transactions.map(toWalletTransaction);
  const totalEarned = transactions
    .filter(r => r.direction === 'credit')
    .reduce((s, r) => s + toNumber(r.amount, 0), 0);
  const totalSpent = transactions
    .filter(r => r.direction === 'debit')
    .reduce((s, r) => s + toNumber(r.amount, 0), 0);
  const totalDeposited = transactions
    .filter(r => r.transaction_type === 'add_funds' && r.direction === 'credit')
    .reduce((s, r) => s + toNumber(r.amount, 0), 0);

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

export async function resolveCanonicalUserId(userKey: string): Promise<string> {
  const db = getDb();
  const { data: byAuth } = await db.from('users').select('id').eq('auth_user_id', userKey).maybeSingle();
  if (byAuth?.id) return String(byAuth.id);
  const { data: byId, error } = await db.from('users').select('id').eq('id', userKey).maybeSingle();
  if (error) throw error;
  if (byId?.id) return String(byId.id);
  return userKey;
}

async function findWalletByUserId(userId: string): Promise<WalletRow | null> {
  const db = getDb();
  const { data, error } = await db.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return (data as WalletRow | null) ?? null;
}

export async function fetchWalletDirect(userId: string): Promise<WalletData> {
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

  if (!wallet?.wallet_id) throw new Error('Wallet not found');

  const { data: transactions, error: txError } = await db
    .from('transactions')
    .select('*')
    .eq('wallet_id', wallet.wallet_id)
    .order('created_at', { ascending: false });
  if (txError) throw txError;

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

export async function getWalletTransactionRows(userId: string): Promise<TransactionRow[]> {
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

export async function transferWalletFundsDirect(
  userId: string,
  recipientId: string,
  amount: number,
): Promise<WalletData> {
  const db = getDb();
  let { error } = await db.rpc('app_transfer_wallet_funds', {
    p_from_user_id: userId,
    p_to_user_id: recipientId,
    p_amount: amount,
    p_payment_method: 'wallet',
  });

  if (error) {
    const fromId = await resolveCanonicalUserId(userId);
    const toId = await resolveCanonicalUserId(recipientId);
    if (fromId !== userId || toId !== recipientId) {
      const retry = await db.rpc('app_transfer_wallet_funds', {
        p_from_user_id: fromId,
        p_to_user_id: toId,
        p_amount: amount,
        p_payment_method: 'wallet',
      });
      error = retry.error;
    }
  }

  if (error) throw error;
  return fetchWalletDirect(userId);
}

export async function withdrawWalletFundsDirect(
  userId: string,
  amount: number,
  bankAccount: string,
  method: string,
): Promise<WalletData> {
  const db = getDb();
  const canonicalUserId = await resolveCanonicalUserId(userId);
  const { error } = await db.rpc('app_withdraw_wallet_funds', {
    p_user_id: canonicalUserId,
    p_amount: amount,
    p_bank_account: bankAccount,
    p_method: method,
  });
  if (error) throw error;
  return fetchWalletDirect(canonicalUserId);
}

export async function updateWalletPreferencesDirect(
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
  if (error) throw error;
  return fetchWalletDirect(userId);
}

export async function getPaymentMethodsDirect(userId: string): Promise<{ methods: PaymentMethodRow[] }> {
  const wallet = await fetchWalletDirect(userId);
  return { methods: Array.isArray(wallet.wallet.paymentMethods) ? wallet.wallet.paymentMethods : [] };
}

export async function addPaymentMethodDirect(userId: string, method: PaymentMethodInput) {
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
  if (error) throw error;
  return data;
}

export async function deletePaymentMethodDirect(userId: string, methodId: string) {
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
  if (error) throw error;
  return { success: true };
}

export async function getTrustScoreDirect(userId: string) {
  const db = getDb();
  const canonicalUserId = await resolveCanonicalUserId(userId);
  const [{ data: user, error: userError }, { data: wallet }, { data: driver }] = await Promise.all([
    db.from('users').select('id, verification_level').eq('id', canonicalUserId).maybeSingle(),
    db.from('wallets').select('balance').eq('user_id', canonicalUserId).maybeSingle(),
    db.from('drivers').select('driver_id').eq('user_id', canonicalUserId).maybeSingle(),
  ]);
  if (userError) throw userError;

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

export async function payWithWalletDirect(
  userId: string,
  amount: number,
  referenceType: string,
  referenceId?: string,
  metadata?: Record<string, unknown>,
): Promise<WalletData> {
  const db = getDb();
  const transactionType = mapReferenceTypeToTransactionType(referenceType);
  const { error } = await db.rpc('app_pay_with_wallet', {
    p_user_id: userId,
    p_amount: amount,
    p_transaction_type: transactionType,
    p_payment_method: 'wallet_balance',
    p_reference_type: referenceType,
    p_reference_id: referenceId ?? null,
    p_metadata: metadata ?? {},
  });
  if (error) throw error;
  return fetchWalletDirect(userId);
}

function mapReferenceTypeToTransactionType(referenceType: string): string {
  switch (referenceType) {
    case 'ride_booking': return 'ride_payment';
    case 'package_delivery': return 'package_payment';
    case 'bus_booking': return 'bus_payment';
    case 'subscription': return 'subscription_payment';
    default: return 'purchase';
  }
}
