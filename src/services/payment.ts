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

/** Provider/booking statuses that mean the money has been captured. */
const PAYMENT_SUCCESS_STATUSES = new Set( [ 'succeeded', 'paid', 'completed' ] );
/** Statuses that mean the payment will not complete without a new attempt. */
const PAYMENT_FAILURE_STATUSES = new Set( [ 'failed', 'canceled', 'cancelled' ] );

/**
 * Reads the payment status out of the `/booking/:id/payment-status` response.
 *
 * The edge handler answers `{ paymentStatus: '<status>' }`. This client used to
 * treat the whole body as a string, so `status === 'succeeded'` could never be
 * true and `confirmPayment` always polled for the full 30 seconds before
 * reporting "pending". A bare string is still accepted so older mocks and any
 * proxy that unwraps the envelope keep working.
 */
export function extractPaymentStatus ( raw: unknown ): string {
  if ( typeof raw === 'string' ) {
    return raw.trim().toLowerCase() || 'unknown';
  }

  if ( raw && typeof raw === 'object' ) {
    const body = raw as Record<string, unknown>;
    const candidate = body.paymentStatus ?? body.payment_status ?? body.status;
    if ( typeof candidate === 'string' && candidate.trim() ) {
      return candidate.trim().toLowerCase();
    }
  }

  return 'unknown';
}

// One in-flight PaymentIntent request per user/booking/amount. A double tap or a
// re-render returns the same promise instead of firing a second request. The
// edge function is idempotent as well, so this only saves a round trip.
const inFlightPaymentIntents = new Map<string, Promise<PaymentIntentResponse>>();

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

    const currency = request.currency ?? 'jod';
    const amountMinor = toMinorUnits( request.amount, currency );
    if ( !Number.isSafeInteger( amountMinor ) || amountMinor < 50 ) {
      throw new Error( 'Payment amount must be at least 0.50' );
    }

    const flightKey = `${ user.id }:${ request.bookingId }:${ currency.toLowerCase() }:${ amountMinor }`;
    const inFlight = inFlightPaymentIntents.get( flightKey );
    if ( inFlight ) {
      return inFlight;
    }

    const pending = this.requestPaymentIntent( request, user.id, currency, amountMinor ).finally( () => {
      inFlightPaymentIntents.delete( flightKey );
    } );
    inFlightPaymentIntents.set( flightKey, pending );
    return pending;
  }

  private async requestPaymentIntent (
    request: PaymentIntentRequest,
    userId: string,
    currency: string,
    amountMinor: number,
  ): Promise<PaymentIntentResponse> {
    const { token } = await getAuthDetails();

    const data = await requestEdgeJson<{
      clientSecret?: string;
      paymentIntentId?: string;
      client_secret?: string;
    }>( {
      path: '/payment/create-intent',
      operation: 'createPaymentIntent',
      authMode: 'required',
      context: { token, userId },
      method: 'POST',
      body: {
        action: 'create-payment-intent',
        amount: amountMinor,
        currency,
        booking_id: request.bookingId,
        metadata: { ...request.metadata, booking_id: request.bookingId, user_id: userId },
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
  }

  async confirmPayment ( bookingId: string ): Promise<'succeeded' | 'failed' | 'pending'> {
    const { token, userId } = await getAuthDetails();

    const startTime = Date.now();
    while ( Date.now() - startTime < PAYMENT_POLL_MAX_DURATION ) {
      const raw = await requestEdgeJson<unknown>( {
        path: `/booking/${ encodeURIComponent( bookingId ) }/payment-status`,
        operation: 'getPaymentStatus',
        authMode: 'required',
        context: { token, userId },
        method: 'GET',
        timeout: 10_000,
      } );

      const status = extractPaymentStatus( raw );
      if ( PAYMENT_SUCCESS_STATUSES.has( status ) ) {
        return 'succeeded';
      }
      if ( PAYMENT_FAILURE_STATUSES.has( status ) ) {
        return 'failed';
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

    const raw = await requestEdgeJson<unknown>( {
      path: `/booking/${ encodeURIComponent( bookingId ) }/payment-status`,
      operation: 'getPaymentStatus',
      authMode: 'required',
      context: { token, userId },
      method: 'GET',
      timeout: 10_000,
    } );

    return extractPaymentStatus( raw );
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
