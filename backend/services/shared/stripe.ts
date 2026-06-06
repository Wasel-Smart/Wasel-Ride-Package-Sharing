/**
 * Stripe Client Integration
 * Production-grade Stripe payment processing
 */

import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

export interface PaymentIntentResult {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string | null;
}

export interface CaptureResult {
  success: boolean;
  paymentIntent: Stripe.PaymentIntent | null;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refund: Stripe.Refund | null;
  error?: string;
}

export class StripeClient {
  async createPaymentIntent(
    amount: number,
    currency: string = 'usd',
    metadata?: Record<string, string>,
  ): Promise<PaymentIntentResult> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        capture_method: 'manual', // Two-step payment: authorize now, capture later
      });

      return {
        id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        status: paymentIntent.status,
        clientSecret: paymentIntent.client_secret,
      };
    } catch (error) {
      console.error('[Stripe] Create payment intent failed:', error);
      throw error;
    }
  }

  async capturePayment(
    paymentIntentId: string,
    amountToCapture?: number,
    idempotencyKey?: string,
  ): Promise<CaptureResult> {
    try {
      const options: Stripe.RequestOptions = idempotencyKey
        ? { idempotencyKey }
        : {};

      const captureParams: Stripe.PaymentIntentCaptureParams = amountToCapture
        ? { amount_to_capture: Math.round(amountToCapture * 100) }
        : {};

      const paymentIntent = await stripe.paymentIntents.capture(
        paymentIntentId,
        captureParams,
        options,
      );

      return {
        success: paymentIntent.status === 'succeeded',
        paymentIntent,
      };
    } catch (error: any) {
      console.error('[Stripe] Capture payment failed:', error);
      return {
        success: false,
        paymentIntent: null,
        error: error.message || 'Unknown error',
      };
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      return paymentIntent.status === 'canceled';
    } catch (error) {
      console.error('[Stripe] Cancel payment failed:', error);
      return false;
    }
  }

  async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer',
    idempotencyKey?: string,
  ): Promise<RefundResult> {
    try {
      const options: Stripe.RequestOptions = idempotencyKey
        ? { idempotencyKey }
        : {};

      const refundParams: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
        ...(amount && { amount: Math.round(amount * 100) }),
        ...(reason && { reason }),
      };

      const refund = await stripe.refunds.create(refundParams, options);

      return {
        success: refund.status === 'succeeded',
        refund,
      };
    } catch (error: any) {
      console.error('[Stripe] Refund payment failed:', error);
      return {
        success: false,
        refund: null,
        error: error.message || 'Unknown error',
      };
    }
  }

  async getPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  }

  async listPaymentIntents(limit: number = 10): Promise<Stripe.PaymentIntent[]> {
    const response = await stripe.paymentIntents.list({ limit });
    return response.data;
  }
}

export const stripeClient = new StripeClient();
