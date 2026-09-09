import { supabase } from '@/utils/supabase/client';
import { toMinorUnits } from '../shared/currency/currency';
import { requestEdgeJson, BackendRequestError } from './backendWorkflow';
import { getAuthDetails } from './core';
import { generateJordanCliqDeeplink, generateJordanCliqQrPayload } from '../domain/payments/cliq';

export interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  bookingId: string;
  metadata?: Record<string, string>;
}

export interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export interface RefundRequest {
  bookingId: string;
  amount?: number;
  amountMinor?: number;
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  refundId: string;
  amount: number;
  amountMinor: number;
  status: string;
}

const PAYMENT_TIMEOUT_MS = 15_000;
const PAYMENT_POLL_INTERVAL = 2_000;
const PAYMENT_POLL_MAX_DURATION = 30_000;

interface PendingPaymentRequest {
  controller: AbortController;
  timestamp: number;
}

const pendingPaymentRequests = new Map<string, PendingPaymentRequest>();

class PaymentService {
  async createPaymentIntent ( request: PaymentIntentRequest ): Promise<PaymentIntentResponse> {
    const client = supabase ?? ( () => { throw new Error( 'Payments unavailable: Supabase client not configured' ); } )();

    const {
      data: { user },
      error: userError,
    } = await client.auth.getUser();

    if ( userError || !user ) {
      throw new BackendRequestError( 'Not authenticated', { status: 401, recoverable: true } );
    }

    const existing = pendingPaymentRequests.get( request.bookingId );
    if ( existing ) {
      const age = Date.now() - existing.timestamp;
      if ( age < 10_000 ) {
        existing.controller.abort();
      }
    }

    const controller = new AbortController();
    pendingPaymentRequests.set( request.bookingId, { controller, timestamp: Date.now() } );

    const amountMinor = toMinorUnits( request.amount, request.currency ?? 'jod' );
    if ( !Number.isSafeInteger( amountMinor ) || amountMinor < 50 ) {
      throw new Error( 'Payment amount must be at least 0.50' );
    }

    try {
      const { token } = await getAuthDetails();

      const data = await requestEdgeJson<{
        clientSecret?: string;
        paymentIntentId?: string;
        client_secret?: string;
      }>( {
        path: '/payment/create-intent',
        operation: 'createPaymentIntent',
        authMode: 'required',
        context: { token, userId: user.id },
        method: 'POST',
        body: {
          action: 'create-payment-intent',
          amount: amountMinor,
          currency: request.currency ?? 'jod',
          booking_id: request.bookingId,
          metadata: { ...request.metadata, booking_id: request.bookingId, user_id: user.id },
          idempotency_key: `booking:${ request.bookingId }`,
        },
        timeout: PAYMENT_TIMEOUT_MS,
        retries: 1,
      } );

      const clientSecret = data.clientSecret ?? data.client_secret;
      if ( !clientSecret || !data.paymentIntentId ) {
        throw new BackendRequestError( 'Invalid payment response', { status: 502 } );
      }

      return { clientSecret, paymentIntentId: data.paymentIntentId };
    } finally {
      pendingPaymentRequests.delete( request.bookingId );
    }
  }

  async confirmPayment ( bookingId: string ): Promise<'succeeded' | 'failed' | 'pending'> {
    const { token, userId } = await getAuthDetails();

    const startTime = Date.now();
    while ( Date.now() - startTime < PAYMENT_POLL_MAX_DURATION ) {
      const status = await requestEdgeJson<string>( {
        path: `/booking/${ encodeURIComponent( bookingId ) }/payment-status`,
        operation: 'getPaymentStatus',
        authMode: 'required',
        context: { token, userId },
        method: 'GET',
        timeout: 10_000,
      } );

      if ( status === 'succeeded' || status === 'failed' ) {
        return status;
      }

      await new Promise( ( resolve ) => setTimeout( resolve, PAYMENT_POLL_INTERVAL ) );
    }

    return 'pending';
  }

  async processRefund ( request: RefundRequest ): Promise<RefundResponse> {
    const { token, userId } = await getAuthDetails();
    const amountMinor = request.amountMinor ??
      ( request.amount !== undefined && request.amount !== null
        ? toMinorUnits( request.amount, 'jod' )
        : undefined );

    const data = await requestEdgeJson<{
      refundId?: string;
      amount?: number;
      status?: string;
    }>( {
      path: '/payment/refund',
      operation: 'processRefund',
      authMode: 'required',
      context: { token, userId },
      method: 'POST',
      body: {
        action: 'create-refund',
        booking_id: request.bookingId,
        amount: amountMinor,
        reason: request.reason,
      },
      timeout: PAYMENT_TIMEOUT_MS,
      retries: 1,
    } );

    if ( !data.refundId ) {
      throw new BackendRequestError( 'Invalid refund response', { status: 502 } );
    }

    return {
      success: true,
      refundId: data.refundId,
      amount: data.amount ?? request.amount ?? 0,
      amountMinor: data.amount ?? amountMinor ?? 0,
      status: data.status ?? 'succeeded',
    };
  }

  async getPaymentStatus ( bookingId: string ): Promise<string> {
    const { token, userId } = await getAuthDetails();

    const status = await requestEdgeJson<string>( {
      path: `/booking/${ encodeURIComponent( bookingId ) }/payment-status`,
      operation: 'getPaymentStatus',
      authMode: 'required',
      context: { token, userId },
      method: 'GET',
      timeout: 10_000,
    } );

    return status;
  }

  /**
   * Generates a Jordanian CliQ instant payment payload (JoPACC) with deep link and QR string.
   */
  generateCliqPaymentDetails ( bookingId: string, amountJod: number, alias: string = 'WASELSMART' ) {
    const req = {
      identifierType: 'alias' as const,
      identifierValue: alias,
      amountJod,
      orderOrBookingId: bookingId,
    };
    return {
      deeplink: generateJordanCliqDeeplink( req ),
      qrPayload: generateJordanCliqQrPayload( req ),
    };
  }
}

export const paymentService = new PaymentService();
