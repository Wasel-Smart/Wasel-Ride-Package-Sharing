import { supabase } from '@/utils/supabase/client';
import { toMinorUnits } from '../shared/currency/currency';
import { requestEdgeJson, BackendRequestError } from './backendWorkflow';
import { getAuthDetails } from './core';

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
  amountMinor?: number;
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  amountMinor: number;
  status: string;
}

const PAYMENT_TIMEOUT_MS = 15_000;
const PAYMENT_POLL_INTERVAL = 2_000;
const PAYMENT_POLL_MAX_DURATION = 30_000;

interface PendingPaymentRequest {
  controller: AbortController;
  timestamp: number;
}

const pendingPaymentRequests = new Map<string, PendingPaymentRequest>();

class PaymentService {
  async createPaymentIntent(request: PaymentIntentRequest): Promise<PaymentIntentResponse> {
    const client = supabase ?? (() => { throw new Error('Payments unavailable: Supabase client not configured'); })();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      throw new BackendRequestError('Not authenticated', { status: 401, recoverable: true });
    }

    const amountMinor = toMinorUnits(request.amount, request.currency ?? 'jod');
    if (!Number.isSafeInteger(amountMinor) || amountMinor < 50) {
      throw new Error('Payment amount must be at least 0.50');
    }

    const { token } = await getAuthDetails();

    const data = await requestEdgeJson<{
      clientSecret?: string;
      paymentIntentId?: string;
      client_secret?: string;
    }>({
      path: '/payment/create-intent',
      operation: 'createPaymentIntent',
      authMode: 'required',
      context: { token, userId: user.id },
      method: 'POST',
      body: {
        action: 'create-payment-intent',
        amount: amountMinor,
        currency: request.currency ?? 'jod',
        metadata: { ...request.metadata, booking_id: request.bookingId, user_id: user.id },
        idempotency_key: `booking:${request.bookingId}`,
      },
      timeout: PAYMENT_TIMEOUT_MS,
    });

    const clientSecret = data.clientSecret ?? data.client_secret;
    if (!clientSecret || !data.paymentIntentId) {
      throw new BackendRequestError('Invalid payment response', { status: 502 });
    }

    return { clientSecret, paymentIntentId: data.paymentIntentId };
  }

  async processRefund(request: RefundRequest): Promise<RefundResponse> {
    const { token, userId } = await getAuthDetails();

    const data = await requestEdgeJson<{ refundId?: string; amount?: number }>({
      path: '/payment/refund',
      operation: 'processRefund',
      authMode: 'required',
      context: { token, userId },
      method: 'POST',
      body: {
        action: 'create-refund',
        booking_id: request.bookingId,
        amount: request.amount !== null && request.amount !== undefined
          ? toMinorUnits(request.amount, 'jod')
          : undefined,
        reason: request.reason,
      },
      timeout: PAYMENT_TIMEOUT_MS,
    });

    if (!data.refundId) {
      throw new BackendRequestError('Invalid refund response', { status: 502 });
    }

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
    const client = supabase ?? (() => { throw new Error('Payments unavailable: Supabase client not configured'); })();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if (userError || !user) {
      throw new BackendRequestError('Not authenticated', { status: 401, recoverable: true });
    }

    const { data, error } = await client
      .from('bookings')
      .select('payment_status')
      .eq('id', bookingId)
      .eq('passenger_id', user.id)
      .single();

    if (error) {
      throw error;
    }
    return data.payment_status as string;
  }
}

export const paymentService = new PaymentService();
