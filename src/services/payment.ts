import { supabase, supabaseUrl } from '@/utils/supabase/client';

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

class PaymentService {
  private async callEdgeFunction<T>(
    functionName: string,
    body: unknown,
  ): Promise<T> {
    const functionsBaseUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '';

    if (!functionsBaseUrl) {
      throw new Error('Payments are not configured. Supabase Functions URL is unavailable.');
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${functionsBaseUrl}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Payment request failed');
    }

    return response.json();
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Not authenticated');
    }

    return this.callEdgeFunction<PaymentIntentResponse>('payment-sheet', {
      ...request,
      userId: user.id,
    });
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    return this.callEdgeFunction<RefundResponse>('refund', request);
  }

  async confirmPayment(bookingId: string, paymentIntentId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_intent_id: paymentIntentId,
        payment_status: 'processing',
      })
      .eq('id', bookingId);

    if (error) {
      throw error;
    }
  }

  async getPaymentStatus(bookingId: string): Promise<string> {
    const { data, error } = await supabase
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .single();

    if (error) {
      throw error;
    }

    return data.payment_status;
  }
}

export const paymentService = new PaymentService();
