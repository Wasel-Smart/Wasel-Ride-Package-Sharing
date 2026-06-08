import { authService } from './auth';
import { waselMobileConfig } from '../lib/config';

export type PaymentSheetRequest = {
  amount: number;
  currency?: string;
  bookingId: string;
  metadata?: Record<string, string>;
};

export type PaymentSheetResponse = {
  clientSecret: string;
  paymentIntentId: string;
};

export async function createMobilePaymentSheet(
  request: PaymentSheetRequest,
): Promise<PaymentSheetResponse> {
  if (!waselMobileConfig.supabaseFunctionUrl) {
    throw new Error('Payment API URL is not configured.');
  }

  const session = await authService.getSession();
  const token = session?.access_token;
  if (!token) {
    throw new Error('Sign in before starting a payment.');
  }

  const response = await fetch(`${waselMobileConfig.supabaseFunctionUrl.replace(/\/$/, '')}/payment-sheet`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `mobile-payment:${request.bookingId}:${request.amount}:${request.currency ?? 'jod'}`,
    },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload.error ?? 'Payment request failed.'));
  }

  if (typeof payload.clientSecret !== 'string' || typeof payload.paymentIntentId !== 'string') {
    throw new Error('Payment service returned an invalid response.');
  }

  return {
    clientSecret: payload.clientSecret,
    paymentIntentId: payload.paymentIntentId,
  };
}
