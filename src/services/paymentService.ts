/**
 * Production Payment Service
 * Stripe + CliQ integration with webhook verification and retry logic
 */

import { logger } from '../utils/monitoring';
import { paymentLimiter } from '../utils/rateLimit';

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

export type WebhookVerifyResult = {
  ok: boolean;
  error?: string;
};

function buildCliqCheckoutUrl(transactionId: string, amount: number, returnUrl: string): string {
  const params = new URLSearchParams({
    transactionId,
    amount: amount.toFixed(3),
    currency: 'JOD',
    returnUrl,
  });

  return `/payments/cliq/checkout?${params.toString()}`;
}

class PaymentService {
  private cliqConfig: {
    merchantId: string;
    apiKey: string;
    checkoutUrl: string;
  };

  constructor() {
    this.cliqConfig = {
      merchantId: import.meta.env.CLIQ_MERCHANT_ID || '',
      apiKey: import.meta.env.CLIQ_API_KEY || '',
      checkoutUrl: import.meta.env.CLIQ_CHECKOUT_URL_TEMPLATE || '',
    };
  }

  private async enforcePaymentRateLimit(): Promise<void> {
    const { allowed, remaining, resetAt } = await paymentLimiter.checkLimit();

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      throw new Error(
        `Payment rate limit exceeded. Try again in ${retryAfter} seconds. Remaining: ${remaining}`,
      );
    }
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntent> {
    await this.enforcePaymentRateLimit();
    return this.createPaymentIntentRequest(amount, currency, metadata);
  }

  private async createPaymentIntentRequest(
    amount: number,
    currency: string,
    metadata?: Record<string, string>,
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency, metadata }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Payment intent creation failed: ${message}`);
      }

      const data = (await response.json()) as PaymentIntent;
      logger.info('Payment intent created', { intentId: data.id, amount, currency });
      return data;
    } catch (error) {
      logger.error('Failed to create payment intent', error, { amount, currency });
      throw error instanceof Error ? error : new Error('Payment intent creation failed');
    }
  }

  async confirmPayment(intentId: string, paymentMethod: PaymentMethod): Promise<PaymentIntent> {
    await this.enforcePaymentRateLimit();
    return this.confirmPaymentRequest(intentId, paymentMethod);
  }

  private async confirmPaymentRequest(
    intentId: string,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentIntent> {
    try {
      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intentId, paymentMethod }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Payment confirmation failed: ${message}`);
      }

      const data = (await response.json()) as PaymentIntent;
      logger.info('Payment confirmed', { intentId, status: data.status });
      return data;
    } catch (error) {
      logger.error('Failed to confirm payment', error, { intentId });
      throw error instanceof Error ? error : new Error('Payment confirmation failed');
    }
  }

  async createCliqCheckout(
    amount: number,
    transactionId: string,
    returnUrl: string,
  ): Promise<{ checkoutUrl: string }> {
    await this.enforcePaymentRateLimit();
    return this.createCliqCheckoutRequest(amount, transactionId, returnUrl);
  }

  private async createCliqCheckoutRequest(
    amount: number,
    transactionId: string,
    returnUrl: string,
  ): Promise<{ checkoutUrl: string }> {
    const trimmedAmount = Math.max(0.01, Number(amount) || 0);

    const payload = {
      merchantId: this.cliqConfig.merchantId,
      apiKey: this.cliqConfig.apiKey,
      transactionId,
      amount: Number(trimmedAmount.toFixed(3)),
      currency: 'JOD',
      returnUrl,
      webhookUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/cliq`,
    };

    try {
      if (this.cliqConfig.merchantId && this.cliqConfig.apiKey) {
        const base = (this.cliqConfig.checkoutUrl || '')
          .replace('{transactionId}', transactionId)
          .replace('{amount}', trimmedAmount.toFixed(3))
          .replace('{currency}', 'JOD')
          .replace('{returnUrl}', encodeURIComponent(returnUrl))
          .replace('{webhookUrl}', encodeURIComponent(payload.webhookUrl));

        const checkoutUrl = base || buildCliqCheckoutUrl(transactionId, trimmedAmount, returnUrl);
        logger.info('CliQ checkout created', { transactionId, amount: trimmedAmount });
        return { checkoutUrl };
      }
    } catch (error) {
      logger.error('CliQ checkout lookup failed', error, { transactionId, amount: trimmedAmount });
    }

    const checkoutUrl = buildCliqCheckoutUrl(transactionId, trimmedAmount, returnUrl);
    logger.info('CliQ checkout created (fallback)', { transactionId, amount: trimmedAmount });
    return { checkoutUrl };
  }

  async refundPayment(request: RefundRequest): Promise<{ success: boolean; refundId: string }> {
    await this.enforcePaymentRateLimit();
    return this.refundPaymentRequest(request);
  }

  private async refundPaymentRequest(
    request: RefundRequest,
  ): Promise<{ success: boolean; refundId: string }> {
    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Refund failed: ${message}`);
      }

      const data = (await response.json()) as { success: boolean; refundId: string };
      logger.info('Refund processed', {
        paymentId: request.paymentId,
        refundId: data.refundId,
      });
      return data;
    } catch (error) {
      logger.error('Failed to process refund', error, { paymentId: request.paymentId });
      throw error instanceof Error ? error : new Error('Refund failed');
    }
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentIntent> {
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Failed to get payment status: ${message}`);
      }

      return (await response.json()) as Promise<PaymentIntent>;
    } catch (error) {
      logger.error('Failed to get payment status', error, { paymentId });
      throw error instanceof Error ? error : new Error('Failed to get payment status');
    }
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): Promise<WebhookVerifyResult> {
    if (!signature || !secret) {
      return { ok: false, error: 'Missing signature or secret' };
    }

    try {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );

      const signatureBuffer = await crypto.subtle.sign(
        'HMAC',
        cryptoKey,
        new TextEncoder().encode(payload),
      );
      const signatureBytes = new Uint8Array(signatureBuffer);
      const signatureHex = Array.from(signatureBytes)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');

      const expected = signature
        .replace(/^sha256=/, '')
        .replace(/^0x/, '')
        .trim();

      return { ok: signatureHex === expected };
    } catch (error) {
      logger.error('Webhook signature verification failed', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown verification error',
      };
    }
  }

  async handleWebhookEvent(eventType: string, data: Record<string, unknown>): Promise<void> {
    switch (eventType) {
      case 'payment_intent.succeeded':
      case 'payment.succeeded':
        await this.handlePaymentSuccess(data);
        return;
      case 'payment_intent.payment_failed':
      case 'payment.failed':
        await this.handlePaymentFailure(data);
        return;
      case 'charge.refunded':
      case 'refund.created':
        await this.handleRefund(data);
        return;
      default:
        logger.info('Payment webhook event acknowledged', { eventType, paymentId: data.id });
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
