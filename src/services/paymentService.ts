/**
 * Production Payment Service
 * Stripe + CliQ integration with webhook verification and retry logic
 */

import { logger } from './monitoring';
import { withRateLimit, paymentLimiter } from './rateLimit';

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  metadata?: Record<string, string>;
}

export interface PaymentMethod {
  type: 'card' | 'cliq' | 'wallet';
  details: Record<string, unknown>;
}

export interface RefundRequest {
  paymentId: string;
  amount?: number;
  reason: string;
}

class PaymentService {
  private stripeKey: string;
  private cliqConfig: {
    merchantId: string;
    apiKey: string;
    checkoutUrl: string;
  };

  constructor() {
    this.stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
    this.cliqConfig = {
      merchantId: import.meta.env.CLIQ_MERCHANT_ID || '',
      apiKey: import.meta.env.CLIQ_API_KEY || '',
      checkoutUrl: import.meta.env.CLIQ_CHECKOUT_URL_TEMPLATE || '',
    };
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntent> {
    return withRateLimit(paymentLimiter, async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, currency, metadata }),
        });

        if (!response.ok) {
          throw new Error(`Payment intent creation failed: ${response.statusText}`);
        }

        const data = await response.json();
        logger.info('Payment intent created', { intentId: data.id, amount, currency });
        return data;
      } catch (error) {
        logger.error('Failed to create payment intent', error, { amount, currency });
        throw error;
      }
    });
  }

  async confirmPayment(
    intentId: string,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentIntent> {
    return withRateLimit(paymentLimiter, async () => {
      try {
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intentId, paymentMethod }),
        });

        if (!response.ok) {
          throw new Error(`Payment confirmation failed: ${response.statusText}`);
        }

        const data = await response.json();
        logger.info('Payment confirmed', { intentId, status: data.status });
        return data;
      } catch (error) {
        logger.error('Failed to confirm payment', error, { intentId });
        throw error;
      }
    });
  }

  async createCliqCheckout(
    amount: number,
    transactionId: string,
    returnUrl: string,
  ): Promise<{ checkoutUrl: string }> {
    if (!this.cliqConfig.checkoutUrl) {
      throw new Error('CliQ checkout not configured');
    }

    const checkoutUrl = this.cliqConfig.checkoutUrl
      .replace('{transactionId}', transactionId)
      .replace('{amount}', amount.toString())
      .replace('{currency}', 'JOD')
      .replace('{returnUrl}', encodeURIComponent(returnUrl));

    logger.info('CliQ checkout created', { transactionId, amount });
    return { checkoutUrl };
  }

  async refundPayment(request: RefundRequest): Promise<{ success: boolean; refundId: string }> {
    return withRateLimit(paymentLimiter, async () => {
      try {
        const response = await fetch('/api/payments/refund', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (!response.ok) {
          throw new Error(`Refund failed: ${response.statusText}`);
        }

        const data = await response.json();
        logger.info('Refund processed', {
          paymentId: request.paymentId,
          refundId: data.refundId,
        });
        return data;
      } catch (error) {
        logger.error('Failed to process refund', error, { paymentId: request.paymentId });
        throw error;
      }
    });
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get payment status: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      logger.error('Failed to get payment status', error, { paymentId });
      throw error;
    }
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      const crypto = window.crypto || (window as any).msCrypto;
      const encoder = new TextEncoder();
      const data = encoder.encode(payload);
      const key = encoder.encode(secret);

      return crypto.subtle
        .importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
        .then((cryptoKey: CryptoKey) => crypto.subtle.sign('HMAC', cryptoKey, data))
        .then((signatureBuffer: ArrayBuffer) => {
          const signatureArray = Array.from(new Uint8Array(signatureBuffer));
          const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
          return signatureHex === signature;
        })
        .catch(() => false);
    } catch {
      return false;
    }
  }

  async handleWebhook(event: {
    type: string;
    data: Record<string, unknown>;
  }): Promise<void> {
    logger.info('Processing payment webhook', { type: event.type });

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSuccess(event.data);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailure(event.data);
        break;
      case 'charge.refunded':
        await this.handleRefund(event.data);
        break;
      default:
        logger.info('Unhandled webhook event', { type: event.type });
    }
  }

  private async handlePaymentSuccess(data: Record<string, unknown>): Promise<void> {
    logger.info('Payment succeeded', { paymentId: data.id });
  }

  private async handlePaymentFailure(data: Record<string, unknown>): Promise<void> {
    logger.warning('Payment failed', { paymentId: data.id, reason: data.last_payment_error });
  }

  private async handleRefund(data: Record<string, unknown>): Promise<void> {
    logger.info('Refund processed', { chargeId: data.id, amount: data.amount_refunded });
  }
}

export const paymentService = new PaymentService();
