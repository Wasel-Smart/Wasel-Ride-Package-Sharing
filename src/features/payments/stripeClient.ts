import { loadStripe, type Stripe, type StripeCardElement } from '@stripe/stripe-js';
import { getConfig } from '../../utils/env';

let cachedPublishableKey = '';
let cachedStripePromise: Promise<Stripe | null> | null = null;

interface StripePaymentIntentCreateParams {
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
  description?: string;
  receipt_email?: string;
}

interface StripeRefundCreateParams {
  payment_intent: string;
  amount?: number;
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}

export function getStripePublishableKey(): string {
  return getConfig().stripePublishableKey;
}

export function hasStripeClientPaymentsEnabled(): boolean {
  return getConfig().stripeEnabled;
}

export function getStripeReturnUrl(origin?: string): string {
  const baseOrigin =
    typeof origin === 'string' && origin.trim().length > 0
      ? origin.trim()
      : typeof window !== 'undefined'
        ? window.location.origin
        : getConfig().appUrl;

  return new URL('/app/payments', baseOrigin).toString();
}

export function getStripeClient(): Promise<Stripe | null> {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    return Promise.resolve(null);
  }

  if (!cachedStripePromise || cachedPublishableKey !== publishableKey) {
    cachedPublishableKey = publishableKey;
    cachedStripePromise = loadStripe(publishableKey, {
      apiVersion: '2023-10-16',
      locale: 'en'
    });
  }

  return cachedStripePromise;
}

class StripeClientService {
  async initialize(): Promise<Stripe | null> {
    return getStripeClient();
  }

  async createPaymentIntent(params: StripePaymentIntentCreateParams) {
    // This would typically be done on the backend
    // For now, we'll simulate the response structure
    const paymentIntentId = `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: paymentIntentId,
      client_secret: `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`,
      amount: params.amount,
      currency: params.currency,
      status: 'requires_payment_method' as const,
      metadata: params.metadata || {}
    };
  }

  async retrievePaymentIntent(paymentIntentId: string) {
    // This would typically call Stripe's API
    // For now, we'll simulate based on the ID pattern
    const isSucceeded = paymentIntentId.includes('succeeded') || Math.random() > 0.3;
    
    return {
      id: paymentIntentId,
      client_secret: `${paymentIntentId}_secret_${Math.random().toString(36).substr(2, 16)}`,
      status: isSucceeded ? 'succeeded' : 'processing' as const,
      amount: 1000, // Default amount in cents
      currency: 'jod'
    };
  }

  async retrievePaymentMethod(paymentMethodId: string) {
    // This would typically call Stripe's API
    // For now, we'll simulate a card payment method
    return {
      id: paymentMethodId,
      type: 'card' as const,
      card: {
        brand: 'visa' as const,
        last4: '4242',
        exp_month: 12,
        exp_year: 2025,
        funding: 'credit' as const
      }
    };
  }

  async createRefund(params: StripeRefundCreateParams) {
    // This would typically call Stripe's API
    const refundId = `re_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: refundId,
      payment_intent: params.payment_intent,
      amount: params.amount,
      currency: 'jod',
      status: 'succeeded' as const,
      reason: params.reason || 'requested_by_customer'
    };
  }

  async confirmPayment(
    clientSecret: string,
    paymentMethodData: {
      type: 'card';
      card: StripeCardElement;
      billing_details?: {
        name?: string;
        email?: string;
        phone?: string;
      };
    }
  ) {
    const stripe = await this.initialize();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    return stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethodData
    });
  }

  async createPaymentMethod(
    cardElement: StripeCardElement,
    billingDetails?: {
      name?: string;
      email?: string;
      phone?: string;
    }
  ) {
    const stripe = await this.initialize();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    return stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: billingDetails
    });
  }

  async createElement(
    type: 'card' | 'cardNumber' | 'cardExpiry' | 'cardCvc',
    options?: Record<string, unknown>,
  ) {
    const stripe = await this.initialize();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const elements = stripe.elements();
    const createElement = elements.create as unknown as (
      elementType: 'card' | 'cardNumber' | 'cardExpiry' | 'cardCvc',
      elementOptions: Record<string, unknown>,
    ) => unknown;

    return createElement(type, {
      style: {
        base: {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: 'transparent',
          '::placeholder': {
            color: '#9ca3af',
          },
        },
        invalid: {
          color: '#ef4444',
        },
      },
      ...options
    });
  }

  async createElements(options?: { clientSecret?: string }) {
    const stripe = await this.initialize();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    return stripe.elements({
      appearance: {
        theme: 'night',
        variables: {
          colorPrimary: '#47B7E6',
          colorBackground: '#0B2135',
          colorText: '#ffffff',
          colorDanger: '#ef4444',
          fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
          spacingUnit: '4px',
          borderRadius: '12px'
        }
      },
      ...options
    });
  }

  isAvailable(): boolean {
    return hasStripeClientPaymentsEnabled();
  }

  getPublishableKey(): string {
    return getStripePublishableKey();
  }
}

export const stripeClient = new StripeClientService();

// Initialize Stripe on module load
if (typeof window !== 'undefined') {
  stripeClient.initialize().catch(console.error);
}
