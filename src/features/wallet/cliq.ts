import { requestEdgeJson } from '../../services/backendWorkflow';

export interface CliQPaymentRequest {
  amount: number;
  currency: 'JOD';
  transactionId: string;
  userId?: string;
  description: string;
  returnUrl: string;
  customerPhone?: string;
  customerName?: string;
}

export interface CliQPaymentResult {
  success: boolean;
  transactionId: string;
  checkoutUrl?: string;
  error?: string;
}

export interface CliQReturnParams {
  transactionId: string | null;
  status: string | null;
  cliqRef: string | null;
}

export function isCliQAvailable(): boolean {
  return Boolean(import.meta.env.VITE_EDGE_FUNCTIONS_BASE_URL || import.meta.env.VITE_API_URL);
}

export async function initiateCliQPayment(
  request: CliQPaymentRequest,
): Promise<CliQPaymentResult> {
  try {
    const response = await requestEdgeJson<{
      payment?: { transactionId?: string; checkoutUrl?: string };
      checkoutUrl?: string;
    }>({
      path: `/wallet/${encodeURIComponent(request.userId ?? request.transactionId)}/top-up`,
      method: 'POST',
      authMode: 'required',
      operation: 'CliQ checkout creation',
      body: {
        amount: request.amount,
        paymentMethod: 'cliq',
        currency: request.currency,
        description: request.description,
        returnUrl: request.returnUrl,
        customerPhone: request.customerPhone,
        customerName: request.customerName,
      },
    });

    const checkoutUrl = response.payment?.checkoutUrl ?? response.checkoutUrl;
    if (!checkoutUrl) {
      throw new Error('CliQ checkout response did not include a checkout URL.');
    }

    return {
      success: true,
      transactionId: response.payment?.transactionId ?? request.transactionId,
      checkoutUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown CliQ error';
    console.error('[CliQ] Failed to create checkout:', message);
    return {
      success: false,
      transactionId: request.transactionId,
      error: message,
    };
  }
}

export function parseCliQReturn(searchParams: URLSearchParams): CliQReturnParams {
  return {
    transactionId:
      searchParams.get('transactionId') ?? searchParams.get('tx') ?? searchParams.get('orderId'),
    status: searchParams.get('status') ?? searchParams.get('paymentStatus'),
    cliqRef: searchParams.get('cliqRef') ?? searchParams.get('ref') ?? searchParams.get('paymentId'),
  };
}

export function formatJOD(amount: number, locale: 'ar-JO' | 'en-JO' = 'en-JO'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'JOD',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount);
}

export function redirectToCliQ(checkoutUrl: string): void {
  if (typeof window !== 'undefined') {
    window.location.href = checkoutUrl;
  }
}
