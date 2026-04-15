import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { getConfig } from '../../utils/env';

let cachedPublishableKey = '';
let cachedStripePromise: Promise<Stripe | null> | null = null;

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
    cachedStripePromise = loadStripe(publishableKey);
  }

  return cachedStripePromise;
}
