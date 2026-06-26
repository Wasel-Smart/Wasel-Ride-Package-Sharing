import { logger } from '../logging/logger';

export interface CliQConfig {
  apiBaseUrl: string;
  merchantId: string;
  apiKey: string;
  secretKey: string;
  webhookSecret: string;
  checkoutUrlTemplate: string;
  checkoutEndpoint: string;
}

export interface CliQPaymentRequest {
  amount: number; // JOD
  merchantReference: string;
  customerPhone?: string;
  customerEmail?: string;
  customerName?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CliQPaymentResponse {
  success: boolean;
  paymentId?: string;
  checkoutUrl?: string;
  error?: string;
}

export interface CliQWebhookPayload {
  paymentId: string;
  merchantReference: string;
  status: 'success' | 'failed' | 'cancelled' | 'expired';
  amount: number;
  currency: string;
  customerPhone?: string;
  processedAt: string;
}

export class CliQClient {
  private config: CliQConfig;

  constructor(config: CliQConfig) {
    this.config = config;
    if (!config.merchantId || !config.apiKey) {
      logger.warn('CliQ payment client initialized without required credentials');
    }
  }

  async createPayment(request: CliQPaymentRequest): Promise<CliQPaymentResponse> {
    try {
      const checkoutUrl = this.buildCheckoutUrl({
        amount: request.amount,
        orderId: request.merchantReference,
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
      });

      logger.info({ amount: request.amount, merchantReference: request.merchantReference }, 'CliQ payment created');

      return {
        success: true,
        paymentId: `cliq-${Date.now()}`,
        checkoutUrl,
      };
    } catch (error) {
      logger.error({ error, amount: request.amount }, 'CliQ payment creation failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createCustomerPayment(request: CliQPaymentRequest): Promise<CliQPaymentResponse> {
    const body = {
      merchant_id: this.config.merchantId,
      amount: request.amount,
      currency: 'JOD',
      merchant_reference: request.merchantReference,
      customer_phone: request.customerPhone,
      customer_email: request.customerEmail,
      customer_name: request.customerName,
      return_url: request.returnUrl,
      cancel_url: request.cancelUrl,
    };

    try {
      const response = await fetch(`${this.config.apiBaseUrl}${this.config.checkoutEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Merchant-ID': this.config.merchantId,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CliQ API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();

      return {
        success: true,
        paymentId: data.payment_id ?? data.id,
        checkoutUrl: data.checkout_url ?? data.redirect_url,
      };
    } catch (error) {
      logger.error({ error, amount: request.amount }, 'CliQ customer payment creation failed');
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async verifyWebhookSignature(payload: string, signature: string, timestamp: string): Promise<boolean> {
    if (!this.config.webhookSecret) {
      logger.warn('CliQ webhook secret not configured');
      return true;
    }

    const expectedSignature = await this.generateSignature(payload, timestamp);
    return this.timingSafeEqual(signature, expectedSignature);
  }

  async handleWebhook(
    payload: CliQWebhookPayload,
    signature: string,
    timestamp: string,
  ): Promise<{ valid: boolean; status: string }> {
    const signatureValid = await this.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
      timestamp,
    );

    if (!signatureValid) {
      return { valid: false, status: 'invalid_signature' };
    }

    return {
      valid: true,
      status: payload.status,
    };
  }

  private buildCheckoutUrl(params: {
    amount: number;
    orderId: string;
    returnUrl?: string;
    cancelUrl?: string;
  }): string {
    if (!this.config.checkoutUrlTemplate) {
      return `${this.config.apiBaseUrl}/checkout?amount=${params.amount}&ref=${params.orderId}`;
    }

    return this.config.checkoutUrlTemplate
      .replace('{amount}', params.amount.toString())
      .replace('{order_id}', params.orderId)
      .replace('{merchant_id}', this.config.merchantId);
  }

  private async generateSignature(payload: string, timestamp: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.config.webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signedPayload = timestamp ? `${timestamp}.${payload}` : payload;
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

export function createCliQClient(env: Record<string, string> = process.env as Record<string, string>): CliQClient {
  return new CliQClient({
    apiBaseUrl: env.CLIQ_API_BASE_URL ?? env.JOPACC_API_BASE_URL ?? '',
    merchantId: env.CLIQ_MERCHANT_ID ?? env.JOPACC_MERCHANT_ID ?? '',
    apiKey: env.CLIQ_API_KEY ?? env.JOPACC_API_KEY ?? '',
    secretKey: env.CLIQ_SECRET_KEY ?? env.JOPACC_SECRET_KEY ?? '',
    webhookSecret: env.CLIQ_WEBHOOK_SECRET ?? env.JOPACC_WEBHOOK_SECRET ?? '',
    checkoutUrlTemplate: env.CLIQ_CHECKOUT_URL_TEMPLATE ?? env.JOPACC_CHECKOUT_URL_TEMPLATE ?? '',
    checkoutEndpoint: env.CLIQ_CHECKOUT_ENDPOINT ?? '/payments',
  });
}