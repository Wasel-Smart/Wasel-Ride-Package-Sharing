/**
 * Pure helper functions extracted from _handlers/shared.ts.
 *
 * Every export here is side-effect-free (no Deno.env, no fetch, no DB).
 * Keeping them in a separate module makes them trivially importable in
 * unit tests without needing to stub the entire Supabase/Stripe runtime.
 *
 * shared.ts re-exports everything from here so existing handler imports
 * are unaffected.
 */

// ── Route parsing ─────────────────────────────────────────────────────────────

export function parseWalletRoute ( path: string ) {
  const match = /^\/wallet\/([^/]+)(?:\/([^/]+))?(?:\/([^/]+))?$/.exec( path );
  if ( !match ) {return null;}
  return {
    userId: decodeURIComponent( match[ 1 ] ),
    action: match[ 2 ] ? decodeURIComponent( match[ 2 ] ) : '',
    resourceId: match[ 3 ] ? decodeURIComponent( match[ 3 ] ) : null,
  };
}

export function parseEntityRoute ( path: string, prefix: string ) {
  const escapedPrefix = prefix.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
  const match = new RegExp( `^/${ escapedPrefix }/([^/]+)(?:/([^/]+))?$` ).exec( path );
  if ( !match ) {return null;}
  return {
    id: decodeURIComponent( match[ 1 ] ),
    action: match[ 2 ] ? decodeURIComponent( match[ 2 ] ) : null,
  };
}

// ── Date / time formatting ────────────────────────────────────────────────────

export function formatDate ( value: unknown, fallback = new Date().toISOString().slice( 0, 10 ) ): string {
  const date = new Date( String( value ?? '' ) );
  if ( Number.isNaN( date.getTime() ) ) {return fallback;}
  return date.toISOString().slice( 0, 10 );
}

export function formatTime ( value: unknown ): string {
  const text = String( value ?? '' );
  if ( /^(?:[01]\d|2[0-3]):[0-5]\d$/.test( text ) ) {return text;}
  const date = new Date( text );
  if ( Number.isNaN( date.getTime() ) ) {return '08:00';}
  return date.toISOString().slice( 11, 16 );
}

export function toIsoFromUnix ( value: unknown ): string | null {
  const seconds = Number( value );
  if ( !Number.isFinite( seconds ) || seconds <= 0 ) {return null;}
  return new Date( seconds * 1000 ).toISOString();
}

// ── Text sanitization ─────────────────────────────────────────────────────────

export function sanitizePlainText ( value: unknown, maxLength = 500 ): string {
  return String( value ?? '' )
    .replace( /<[^>]*>/g, '' )
    .replace( /(javascript:|data:|vbscript:)/gi, '' )
    .replace( /\p{Cc}/gu, ' ' )
    .replace( /\s+/g, ' ' )
    .trim()
    .slice( 0, maxLength );
}

// ── Provider status normalization ─────────────────────────────────────────────

export function normalizeProviderStatus ( value: unknown ): string {
  return String( value ?? '' ).trim().toLowerCase().replace( /[\s_-]+/g, '_' );
}

export function isSuccessfulProviderStatus ( value: unknown ): boolean {
  return [ 'success', 'succeeded', 'paid', 'posted', 'completed', 'complete', 'approved', 'verified' ]
    .includes( normalizeProviderStatus( value ) );
}

export function isFailedProviderStatus ( value: unknown ): boolean {
  return [ 'failed', 'failure', 'rejected', 'declined', 'cancelled', 'canceled', 'expired' ]
    .includes( normalizeProviderStatus( value ) );
}

// ── Row mappers ───────────────────────────────────────────────────────────────

import { toNumber } from './pricing.ts';

export function mapBookingRow ( row: Record<string, unknown> ) {
  const amount = toNumber( row.amount ?? row.total_price, 0 );
  return {
    ...row,
    id: String( row.booking_id ?? row.id ?? '' ),
    booking_id: String( row.booking_id ?? row.id ?? '' ),
    seats_requested: toNumber( row.seats_requested, 1 ),
    price_per_seat: toNumber( row.price_per_seat, amount ),
    total_price: amount,
    amount,
    status: String( row.booking_status ?? row.status ?? 'pending' ),
    booking_status: String( row.booking_status ?? row.status ?? 'pending' ),
    service_type: String( row.service_type ?? 'ride' ),
    schedule_date: row.schedule_date ?? null,
    departure_time: row.departure_time ?? null,
    seat_preference: row.seat_preference ?? null,
    schedule_mode: row.schedule_mode ?? null,
  };
}

export function mapPackageRow ( row: Record<string, unknown> ) {
  // Strip the single-use hand-off codes so they never travel in a list/get/verify
  // response. Only the create endpoint returns them once (to the sender). This
  // stops a carrier from reading the delivery code through the API and faking a
  // hand-off to release escrow.
  const {
    pickup_verification_code: _pickupCode,
    delivery_verification_code: _deliveryCode,
    ...rest
  } = row;
  return {
    ...rest,
    id: String( row.package_id ?? row.id ?? '' ),
    package_id: String( row.package_id ?? row.id ?? '' ),
    tracking_number: String( row.tracking_number ?? '' ),
    tracking_code: String( row.tracking_number ?? '' ),
    status: String( row.status ?? 'posted' ),
    delivery_fee: toNumber( row.delivery_fee ?? row.fee_amount, 0 ),
    fee_amount: toNumber( row.fee_amount ?? row.delivery_fee, 0 ),
    from: String( row.origin_name ?? row.origin_location ?? '' ),
    to: String( row.destination_name ?? row.destination_location ?? '' ),
    weight: toNumber( row.weight_kg, 0 ),
  };
}

// ── Webhook route detection ───────────────────────────────────────────────────

export const WEBHOOK_PATH_PREFIXES = [
  '/stripe/webhook',
  '/cliq/webhook',
  '/communications/webhook',
  '/payments/webhooks/',
  '/trust/webhooks/',
  '/webhooks/',
  '/auth/hooks/',
  '/events',
] as const;

export function isWebhookRoute ( path: string ): boolean {
  const normalized = path.startsWith( '/v1/' ) ? path.slice( 3 ) : path;
  return WEBHOOK_PATH_PREFIXES.some( prefix => normalized.startsWith( prefix ) );
}

// ── Subscription helpers ──────────────────────────────────────────────────────

export function mapSubscriptionPlan ( planName: string ): 'basic' | 'premium' | 'enterprise' {
  const normalized = planName.trim().toLowerCase();
  if ( normalized.includes( 'enterprise' ) ) {return 'enterprise';}
  if ( normalized.includes( 'basic' ) || normalized.includes( 'starter' ) ) {return 'basic';}
  return 'premium';
}

export function buildSubscriptionRecord (
  userId: string,
  subscription: Record<string, unknown>,
  planOverride?: string | null,
) {
  const items = Array.isArray( ( subscription.items as { data?: unknown[] } | undefined )?.data )
    ? ( subscription.items as { data: Array<Record<string, unknown>> } ).data
    : [];
  const firstItem = items[ 0 ] ?? {};
  const price = ( firstItem.price as Record<string, unknown> | undefined ) ?? {};
  const metadata = ( subscription.metadata as Record<string, unknown> | undefined ) ?? {};
  const plan = mapSubscriptionPlan(
    String( planOverride ?? metadata.plan ?? metadata.plan_name ?? 'premium' ),
  );

  return {
    user_id: userId,
    stripe_subscription_id: String( subscription.id ?? '' ),
    stripe_customer_id: String( subscription.customer ?? '' ),
    stripe_price_id: String( price.id ?? '' ),
    stripe_product_id:
      typeof price.product === 'string'
        ? price.product
        : typeof ( price.product as Record<string, unknown> | undefined )?.id === 'string'
          ? String( ( price.product as Record<string, unknown> ).id )
          : null,
    status: String( subscription.status ?? 'incomplete' ),
    plan,
    current_period_start: toIsoFromUnix( subscription.current_period_start ?? firstItem.current_period_start ),
    current_period_end: toIsoFromUnix( subscription.current_period_end ?? firstItem.current_period_end ),
    cancel_at_period_end: Boolean( subscription.cancel_at_period_end ),
    cancelled_at: toIsoFromUnix( subscription.canceled_at ),
    ended_at: toIsoFromUnix( subscription.ended_at ),
    trial_start: toIsoFromUnix( subscription.trial_start ),
    trial_end: toIsoFromUnix( subscription.trial_end ),
    updated_at: new Date().toISOString(),
  };
}

// ── Misc ──────────────────────────────────────────────────────────────────────

export function isPlainObject ( value: unknown ): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray( value );
}

export function firstStringValue ( source: Record<string, unknown>, keys: string[] ): string {
  for ( const key of keys ) {
    const value = source[ key ];
    if ( typeof value === 'string' && value.trim() ) {return value.trim();}
    if ( typeof value === 'number' && Number.isFinite( value ) ) {return String( value );}
  }
  return '';
}

export function isPhoneNumberUniqueViolation ( error: unknown ): boolean {
  if ( !error || typeof error !== 'object' ) {return false;}
  const record = error as { code?: unknown; message?: unknown; details?: unknown };
  const message = String( record.message ?? record.details ?? '' );
  return (
    record.code === '23505' ||
    message.includes( 'users_phone_number_key' ) ||
    message.includes( 'duplicate key value violates unique constraint' )
  );
}

export function isOlderThanHours ( isoValue: string | null | undefined, hours: number ): boolean {
  if ( !isoValue ) {return false;}
  const timestamp = new Date( isoValue ).getTime();
  if ( Number.isNaN( timestamp ) ) {return false;}
  return Date.now() - timestamp >= hours * 60 * 60 * 1000;
}

export function isExpired ( isoValue?: string | null ): boolean {
  if ( !isoValue ) {return false;}
  const expiresAt = new Date( isoValue ).getTime();
  if ( Number.isNaN( expiresAt ) ) {return false;}
  return expiresAt <= Date.now();
}

// ── Distributed tracing (W3C traceparent) ────────────────────────────────────
//
// Every inbound request receives a trace-id so correlated log lines from
// chained edge function calls can be joined in a single query.
//
// Format: W3C traceparent  00-{traceId}-{spanId}-01
//   traceId  = 32 hex chars (128-bit)
//   spanId   = 16 hex chars (64-bit)
//
// Downstream handlers that call another edge function should forward the
// X-Trace-Id header they received. That way a failure in a chained call
// (e.g. booking-service → wallet handler) produces two log entries that share
// the same traceId and can be joined without guessing.

function hex ( length: number ): string {
  const bytes = new Uint8Array( length / 2 );
  crypto.getRandomValues( bytes );
  return Array.from( bytes ).map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceparent: string;
  traceHeader: string; // X-Trace-Id value (traceId only — easier to log)
}

/**
 * Extract the W3C traceparent from an inbound request, or generate a fresh one.
 * Always returns a valid TraceContext — never throws.
 */
export function resolveTraceContext ( request: Request ): TraceContext {
  const inbound = request.headers.get( 'traceparent' ) ?? request.headers.get( 'x-trace-id' );
  let traceId = '';
  let spanId = '';

  if ( inbound ) {
    // Try W3C traceparent: 00-<traceId>-<spanId>-<flags>
    const parts = inbound.split( '-' );
    if ( parts.length >= 4 && parts[ 1 ] && parts[ 1 ].length === 32 ) {
      traceId = parts[ 1 ];
      spanId = hex( 16 ); // new span for this hop
    } else if ( /^[0-9a-f]{32}$/i.test( inbound ) ) {
      // Plain 32-char hex (X-Trace-Id from client)
      traceId = inbound.toLowerCase();
      spanId = hex( 16 );
    }
  }

  if ( !traceId ) {
    traceId = hex( 32 );
    spanId = hex( 16 );
  }

  return {
    traceId,
    spanId,
    traceparent: `00-${ traceId }-${ spanId }-01`,
    traceHeader: traceId,
  };
}

/**
 * Build headers to forward the trace context to a downstream edge function call.
 *
 * Usage:
 *   const downstream = await fetch(url, {
 *     headers: buildDownstreamTraceHeaders(trace),
 *   });
 */
export function buildDownstreamTraceHeaders ( trace: TraceContext ): Record<string, string> {
  return {
    'traceparent': trace.traceparent,
    'x-trace-id': trace.traceHeader,
  };
}
