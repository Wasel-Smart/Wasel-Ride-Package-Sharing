import { supabase, supabaseUrl } from '@/utils/supabase/client';
import { addCSRFHeader } from '@/utils/csrf';

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
  private async callEdgeFunction<T>(functionName: string, body: unknown): Promise<T> {
    const client = requireSupabaseClient();

    const functionsBaseUrl = supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/functions/v1` : '';

    if (!functionsBaseUrl) {
      throw new Error('Payments are not configured. Supabase Functions URL is unavailable.');
    }

    const {
      data: { session },
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAYMENT_TIMEOUT_MS);

    try {
      const response = await fetch(`${functionsBaseUrl}/${functionName}`, {
        method: 'POST',
        headers: addCSRFHeader({
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        }),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Payment request failed' }));
        throw new Error(
          typeof error.error === 'string'
            ? error.error
            : `Payment request failed (${response.status})`,
        );
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timer);
    }
  }

  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const client = requireSupabaseClient();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
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
    const client = requireSupabaseClient();

    const { error } = await client
      .from('bookings')
      .update({
        payment_intent_id: paymentIntentId,
        payment_status: 'processing',
      })
      .eq('id', bookingId);

    if (error) throw error;
  }

  async getPaymentStatus(bookingId: string): Promise<string> {
    const client = requireSupabaseClient();

    const { data, error } = await client
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .single();

    if (error) throw error;
    return data.payment_status as string;
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const raw = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(raw))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expected.length !== signature.length) return false;
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return mismatch === 0;
  }
}

export const paymentService = new PaymentService();
