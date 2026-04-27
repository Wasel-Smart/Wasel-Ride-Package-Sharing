/**
 * Wasel Audit Log Service
 *
 * Every sensitive operation (payment, wallet change, ride update, RLS access)
 * is logged here. Immutable — only service role can read.
 */

import { supabase } from './directSupabase';

export type AuditAction =
  | 'wallet.balance_change'
  | 'wallet.withdrawal'
  | 'wallet.transfer'
  | 'payment.intent_created'
  | 'payment.captured'
  | 'payment.refunded'
  | 'ride.status_change'
  | 'ride.cancelled'
  | 'user.role_change'
  | 'user.verified'
  | 'rls.access_denied';

export interface AuditEntry {
  actorId?: string;
  actorRole?: string;
  action: AuditAction;
  tableName?: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Write an audit log entry. Never throws — best-effort logging.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      actor_id:   entry.actorId    ?? null,
      actor_role: entry.actorRole  ?? null,
      action:     entry.action,
      table_name: entry.tableName  ?? null,
      record_id:  entry.recordId   ?? null,
      old_values: entry.oldValues  ?? null,
      new_values: entry.newValues  ?? null,
      ip_address: entry.ipAddress  ?? null,
      user_agent: entry.userAgent  ?? null,
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to write audit entry:', entry.action, err);
  }
}

/**
 * Convenience: log a payment event.
 */
export function auditPayment(
  action: Extract<AuditAction, `payment.${string}`>,
  actorId: string,
  paymentIntentId: string,
  amount: number,
  extra?: Record<string, unknown>,
) {
  return writeAuditLog({
    actorId,
    action,
    tableName: 'payment_status',
    recordId:  paymentIntentId,
    newValues: { amount, paymentIntentId, ...extra },
  });
}

/**
 * Convenience: log a wallet change.
 */
export function auditWalletChange(
  actorId: string,
  oldBalance: number,
  newBalance: number,
  reason: string,
) {
  return writeAuditLog({
    actorId,
    action:    'wallet.balance_change',
    tableName: 'profiles',
    recordId:  actorId,
    oldValues: { wallet_balance: oldBalance },
    newValues: { wallet_balance: newBalance, reason },
  });
}
