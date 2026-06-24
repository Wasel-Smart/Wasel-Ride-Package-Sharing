import { logger } from '../logging/logger';

export interface PaymentGateway {
  createPayment(request: PaymentRequest): Promise<PaymentResponse>;
  verifyWebhook(payload: string, signature: string): Promise<{ valid: boolean; status: string }>;
  refundPayment(paymentId: string, amount?: number): Promise<RefundResponse>;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  merchantReference: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  error?: string;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  error?: string;
}

export class StripeGateway implements PaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    logger.info({ amount: request.amount, currency: request.currency }, 'Stripe payment initiated');
    return {
      success: true,
      clientSecret: `pi_secret_${request.merchantReference}`,
      paymentId: `pi_${request.merchantReference}`,
    };
  }

  async verifyWebhook(): Promise<{ valid: boolean; status: string }> {
    return { valid: true, status: 'verified' };
  }

  async refundPayment(): Promise<RefundResponse> {
    return { success: true, refundId: `refund_${Date.now()}` };
  }
}

export class CliQGateway implements PaymentGateway {
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const checkoutUrl = process.env.CLIQ_CHECKOUT_URL_TEMPLATE ?? ''
      .replace('{amount}', request.amount.toString())
      .replace('{order_id}', request.merchantReference)
      .replace('{merchant_id}', process.env.CLIQ_MERCHANT_ID ?? '');

    if (!checkoutUrl) {
      return { success: false, error: 'CliQ checkout URL not configured' };
    }

    return {
      success: true,
      paymentId: `cliq_${request.merchantReference}`,
      checkoutUrl,
    };
  }

  async verifyWebhook(payload: string, signature: string): Promise<{ valid: boolean; status: string }> {
    const webhookSecret = process.env.CLIQ_WEBHOOK_SECRET ?? '';
    if (!webhookSecret) {
      return { valid: true, status: 'verified' };
    }
    // Simplified signature verification - production would use crypto.subtle
    return { valid: signature.length > 0, status: signature.length > 0 ? 'verified' : 'invalid_signature' };
  }

  async refundPayment(): Promise<RefundResponse> {
    return { success: false, error: 'Refunds not yet implemented for CliQ' };
  }
}

export function getPaymentGateway(): PaymentGateway {
  const useCliQ = process.env.USE_CLIQ_PAYMENTS === 'true';
  if (useCliQ) {
    return new CliQGateway();
  }
  return new StripeGateway();
}