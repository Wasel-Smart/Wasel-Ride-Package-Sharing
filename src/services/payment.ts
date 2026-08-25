import { supabase } from '@/utils/supabase/client';
import { toMinorUnits } from '../shared/currency/currency';

export interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  bookingId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface RefundRequest {
  bookingId: string;
  amount?: number;
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
}

const PAYMENT_TIMEOUT_MS = 15_000;

function requireSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Payments are not available: Supabase client is not configured. ' +
        'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
    );
  }
  return supabase;
}

class PaymentService {
  private async callPaymentsFunction<T>(body: Record<string, unknown>): Promise<T> {
    const client = requireSupabaseClient();
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Payment request timed out')), PAYMENT_TIMEOUT_MS),
    );

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Not authenticated');
    }

    const invocation = client.functions.invoke('stripe-payments-v2', {
      body,
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const { data, error } = await Promise.race([invocation, timeout]);
    if (error) throw error;
    return data as T;
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const client = requireSupabaseClient();

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();
    if (sessionError || !session?.user) {
      throw new Error('Not authenticated');
    }

    const user = session.user;
    const amountMinor = toMinorUnits(request.amount, request.currency ?? 'jod');
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 50) {
      throw new Error('Payment amount must be at least 0.50');
    }
    const data = await this.callPaymentsFunction<{ clientSecret?: string; paymentIntentId?: string }>({
      action: 'create-payment-intent',
      amount: amountMinor,
      currency: request.currency ?? 'jod',
      metadata: { ...request.metadata, booking_id: request.bookingId, user_id: user.id },
      idempotency_key: `booking:${request.bookingId}`,
    });
    if (!data.clientSecret || !data.paymentIntentId) throw new Error('Invalid payment response');
    return { clientSecret: data.clientSecret, paymentIntentId: data.paymentIntentId };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    const data = await this.callPaymentsFunction<{ refundId?: string; amount?: number }>({
      action: 'create-refund',
      booking_id: request.bookingId,
      amount: request.amount !== null && request.amount !== undefined
        ? toMinorUnits(request.amount, 'jod')
        : undefined,
      reason: request.reason,
    });
    if (!data.refundId) throw new Error('Invalid refund response');
    return {
      success: true,
      refundId: data.refundId,
      amount: data.amount ?? request.amount ?? 0,
    };
  }

  async confirmPayment(bookingId: string, paymentIntentId: string): Promise<void> {
    void bookingId;
    void paymentIntentId;
    // Stripe webhooks are the sole authority for booking payment state.
  }

  async getPaymentStatus(bookingId: string): Promise<string> {
    const client = requireSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      throw new Error('Not authenticated');
    }

    const { data, error } = await client
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .eq('passenger_id', user.id)
      .single();

    if (error) throw error;
    return data.payment_status as string;
  }
}

export const paymentService = new PaymentService();
