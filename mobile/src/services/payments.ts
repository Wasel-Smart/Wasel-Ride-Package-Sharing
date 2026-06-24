import { supabase } from '../lib/config';
import { mobileAuth } from './auth';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export interface PaymentMethod {
  id: string;
  userId: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: string;
}

export interface WalletBalance {
  available: number;
  pending: number;
  total: number;
  currency: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  error?: string;
}

class PaymentService {
  async getWalletBalance(userId: string): Promise<WalletBalance> {
    try {
      const { data, error } = await supabase
        .from('wallet_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      return {
        available: data?.available_balance ?? 0,
        pending: data?.pending_balance ?? 0,
        total: (data?.available_balance ?? 0) + (data?.pending_balance ?? 0),
        currency: data?.currency ?? 'JOD',
      };
    } catch (error) {
      console.error('[PaymentService] Get balance error:', error);
      return { available: 0, pending: 0, total: 0, currency: 'JOD' };
    }
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted_at', null)
        .order('is_default', { ascending: false });

      if (error) throw error;

      return (data ?? []).map(row => ({
        id: row.id,
        userId: row.user_id,
        brand: row.card_brand ?? 'Card',
        last4: row.last_four ?? '****',
        expiryMonth: row.expiry_month ?? 12,
        expiryYear: row.expiry_year ?? new Date().getFullYear(),
        isDefault: row.is_default ?? false,
        createdAt: row.created_at,
      }));
    } catch (error) {
      console.error('[PaymentService] Get payment methods error:', error);
      return [];
    }
  }

  async addFunds(userId: string, amount: number, currency: string): Promise<PaymentResult> {
    try {
      if (amount < 10 || amount > 500) {
        return { success: false, error: 'Amount must be between 10 and 500' };
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('stripe-payments-v2', {
        body: {
          action: 'add_funds',
          userId,
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const { error: rpcError } = await supabase.rpc('increment_balance', {
          user_id: userId,
          amount_cents: Math.round(amount * 100),
        });

        if (rpcError) {
          console.error('[PaymentService] RPC increment_balance failed:', rpcError);
        }

        return { success: true, paymentId: data.paymentId };
      }

      return { success: false, error: data?.error ?? 'Payment failed' };
    } catch (error) {
      console.error('[PaymentService] Add funds error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async withdrawFunds(userId: string, amount: number): Promise<PaymentResult> {
    try {
      const balance = await this.getWalletBalance(userId);
      if (balance.available < amount) {
        return { success: false, error: 'Insufficient balance' };
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke('stripe-payments-v2', {
        body: {
          action: 'withdraw_funds',
          userId,
          amount: Math.round(amount * 100),
        },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) throw error;

      if (data?.success) {
        const { error: decrementError } = await supabase.rpc('decrement_balance', {
          user_id: userId,
          amount_cents: Math.round(amount * 100),
        });

        if (decrementError) {
          console.error('[PaymentService] RPC decrement_balance failed:', decrementError);
        }

        const { error: pendingError } = await supabase.rpc('increment_pending_balance', {
          user_id: userId,
          amount_cents: Math.round(amount * 100),
        });

        if (pendingError) {
          console.error('[PaymentService] RPC increment_pending_balance failed:', pendingError);
        }

        return { success: true, paymentId: data.transferId };
      }

      return { success: false, error: data?.error ?? 'Withdrawal failed' };
    } catch (error) {
      console.error('[PaymentService] Withdraw error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async addPaymentMethod(userId: string, paymentMethodId: string): Promise<PaymentResult> {
    try {
      const { error } = await supabase.from('payment_methods').insert({
        user_id: userId,
        stripe_payment_method_id: paymentMethodId,
        is_default: false,
      });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('[PaymentService] Add payment method error:', error);
      return { success: false, error: getErrorMessage(error) };
    }
  }

  async removePaymentMethod(paymentMethodId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', paymentMethodId);

      return !error;
    } catch (error) {
      console.error('[PaymentService] Remove payment method error:', error);
      return false;
    }
  }

  async setDefaultPaymentMethod(userId: string, paymentMethodId: string): Promise<boolean> {
    try {
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', userId);

      const { error } = await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId);

      return !error;
    } catch (error) {
      console.error('[PaymentService] Set default method error:', error);
      return false;
    }
  }
}

export const paymentService = new PaymentService();

export interface MobilePaymentSheet {
  clientSecret: string;
  paymentIntentId: string;
}

export interface MobilePaymentSheetRequest {
  userId?: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
}

export async function createMobilePaymentSheet(request: MobilePaymentSheetRequest): Promise<MobilePaymentSheet> {
  const userId = request.userId ?? mobileAuth.getUser()?.id ?? '';
  const result = await paymentService.addFunds(
    userId,
    request.amount,
    request.currency,
  );

  if (!result.success) {
    return { clientSecret: '', paymentIntentId: '' };
  }

  return {
    clientSecret: result.paymentId ?? '',
    paymentIntentId: result.paymentId ?? '',
  };
}
