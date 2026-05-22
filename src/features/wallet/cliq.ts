/**
 * GAP #4 FIX: CliQ Payment Integration — Jordan Market
 *
 * CliQ is Jordan's national instant payment platform (JoPACC).
 * This is a CRITICAL gap blocking the Jordan market launch.
 *
 * SETUP REQUIRED:
 *   1. Register as a CliQ merchant at https://www.jopacc.com
 *   2. Get your CLIQ_MERCHANT_ID and checkout URL template
 *   3. Set CLIQ_CHECKOUT_URL_TEMPLATE in your .env (see .env.production.template)
 *   4. Configure CLIQ_WEBHOOK_SECRET for webhook signature verification
 *   5. Deploy supabase/functions/cliq-webhook/ edge function
 *
 * HOW TO USE:
 *   import { initiateCliQPayment, isCliQAvailable } from '@/features/payments/cliq';
 */

export interface CliQPaymentRequest {
  /** Amount in JOD — Jordanian Dinar uses 3 decimal places */
  amount: number;
  currency: 'JOD';
  /** Your internal transaction reference (stored in DB) */
  transactionId: string;
  description: string;
  /** Where to redirect the user after CliQ payment completes */
  returnUrl: string;
  customerPhone?: string;
  customerName?: string;
}

export interface CliQPaymentResult {
  success: boolean;
  transactionId: string;
  /** Redirect the user to this URL to complete the CliQ payment */
  checkoutUrl?: string;
  error?: string;
}

export interface CliQReturnParams {
  transactionId: string | null;
  status: string | null;
  cliqRef: string | null;
}

/**
 * Check whether CliQ payments are configured and available.
 * Use this to conditionally show CliQ as a payment option.
 */
export function isCliQAvailable(): boolean {
  const template = import.meta.env.CLIQ_CHECKOUT_URL_TEMPLATE as string | undefined;
  return Boolean(template && template.trim().length > 0 && !template.includes('{'));
}

/**
 * Initiate a CliQ payment — returns a checkout URL to redirect the user to.
 *
 * @example
 * const result = await initiateCliQPayment({
 *   amount: 15.500,
 *   currency: 'JOD',
 *   transactionId: 'booking_abc123',
 *   description: 'Wasel ride — Amman to Zarqa',
 *   returnUrl: `${window.location.origin}/app/payment/callback`,
 * });
 * if (result.success && result.checkoutUrl) {
 *   window.location.href = result.checkoutUrl;
 * }
 */
export async function initiateCliQPayment(
  request: CliQPaymentRequest,
): Promise<CliQPaymentResult> {
  const templateUrl = import.meta.env.CLIQ_CHECKOUT_URL_TEMPLATE as string | undefined;

  if (!templateUrl || templateUrl.trim() === '') {
    console.warn('[CliQ] CLIQ_CHECKOUT_URL_TEMPLATE is not set — CliQ payments are unavailable');
    return {
      success: false,
      transactionId: request.transactionId,
      error: 'CliQ payments are not configured. Please contact support.',
    };
  }

  try {
    const checkoutUrl = templateUrl
      .replace('{transactionId}', encodeURIComponent(request.transactionId))
      .replace('{amount}', request.amount.toFixed(3)) // JOD: 3 decimal places
      .replace('{currency}', request.currency)
      .replace('{returnUrl}', encodeURIComponent(request.returnUrl));

    return {
      success: true,
      transactionId: request.transactionId,
      checkoutUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown CliQ error';
    console.error('[CliQ] Failed to build checkout URL:', message);
    return {
      success: false,
      transactionId: request.transactionId,
      error: message,
    };
  }
}

/**
 * Parse the URL search params when CliQ redirects the user back to your app.
 * Call on your payment callback/return page.
 */
export function parseCliQReturn(searchParams: URLSearchParams): CliQReturnParams {
  return {
    transactionId:
      searchParams.get('transactionId') ?? searchParams.get('tx') ?? searchParams.get('orderId'),
    status: searchParams.get('status') ?? searchParams.get('paymentStatus'),
    cliqRef: searchParams.get('cliqRef') ?? searchParams.get('ref') ?? searchParams.get('paymentId'),
  };
}

/**
 * Format a JOD amount for display in Arabic or English.
 * JOD uses 3 decimal places (fils).
 */
export function formatJOD(amount: number, locale: 'ar-JO' | 'en-JO' = 'en-JO'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

/**
 * Redirect the user to complete payment in the CliQ app / gateway.
 * Call after initiateCliQPayment returns a checkoutUrl.
 */
export function redirectToCliQ(checkoutUrl: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = checkoutUrl;
  }
}
