import {
    json,
    authenticateRequest,
    enforcePermission,
    consumeRateLimit,
    ALLOWED_PAYMENT_CURRENCIES,
    MAX_PAYMENT_AMOUNT_MINOR,
    normalizePaymentAmount,
    stripe,
    toNumber,
    toStripeMinorUnits,
    type getAdminClient,
} from './shared.ts';

// Metadata keys the server owns. A client must never be able to set these:
// `transaction_id` / `client_reference_id` drive wallet top-up finalization and
// failure handling in the Stripe webhook, `user_id` / `plan*` drive ownership and
// subscription sync, and `booking_id` binds the intent to a payable record we
// load and price server-side.
const RESERVED_METADATA_KEYS = new Set( [
  'user_id',
  'transaction_id',
  'client_reference_id',
  'plan',
  'plan_name',
  'wallet_id',
  'booking_id',
  'booking_id_verified',
] );

// A partially refunded booking was still paid for: offering it for payment again would charge the
// passenger twice for one trip.
const BOOKING_PREPAID_STATUSES = new Set( [ 'succeeded', 'completed', 'paid', 'refunded', 'partially_refunded' ] );
const BOOKING_PAYMENT_COLUMNS =
  'booking_id, passenger_id, amount, price_per_seat, seats_requested, currency, payment_status, stripe_payment_intent_id';
const LEGACY_BOOKING_PAYMENT_COLUMNS =
  'booking_id, user_id, amount, price_per_seat, seats_requested, currency, payment_status, stripe_payment_intent_id';

function isMissingColumnError ( error: unknown ): boolean {
  if ( !error || typeof error !== 'object' ) {return false;}
  const candidate = error as { code?: unknown; message?: unknown; details?: unknown };
  const code = String( candidate.code ?? '' );
  const text = `${ String( candidate.message ?? '' ) } ${ String( candidate.details ?? '' ) }`;
  return code === '42703' || code === 'PGRST204' || /column .* does not exist|could not find .* column/i.test( text );
}

function deriveBookingAmountMinor ( booking: Record< string, unknown >, currencyLower: string ): number | null {
  // The payable amount is owned by the server. Prefer the per-seat breakdown
  // (price_per_seat * seats_requested, mirroring `resolvePayableAmount` in
  // wallet.ts), then fall back to the booking's stored totals. Reading several
  // candidate columns keeps this working across checkout-schema migrations that
  // rename the price field.
  const perSeat = toNumber( booking?.price_per_seat ?? 0, 2 );
  const seats = toNumber( booking?.seats_requested ?? 0, 0 );
  const major = perSeat > 0 && seats > 0
    ? perSeat * seats
    : toNumber( booking?.total_price ?? booking?.fare ?? booking?.amount ?? 0, 2 );

  if ( !Number.isFinite( major ) || major <= 0 ) {return null;}
  return toStripeMinorUnits( major, currencyLower );
}

const MAX_METADATA_ENTRIES = 10;
const MAX_METADATA_VALUE_LENGTH = 200;
const REFUND_REASONS = new Set( [ 'requested_by_customer', 'duplicate', 'fraudulent' ] );

function sanitizeClientMetadata ( input: unknown ): Record<string, string> {
  const out: Record<string, string> = {};
  if ( !input || typeof input !== 'object' || Array.isArray( input ) ) {return out;}

  for ( const [ rawKey, rawValue ] of Object.entries( input as Record<string, unknown> ) ) {
    if ( Object.keys( out ).length >= MAX_METADATA_ENTRIES ) {break;}
    const key = rawKey.trim().slice( 0, 40 );
    if ( !key || RESERVED_METADATA_KEYS.has( key.toLowerCase() ) ) {continue;}
    if ( typeof rawValue !== 'string' && typeof rawValue !== 'number' && typeof rawValue !== 'boolean' ) {continue;}
    out[ key ] = String( rawValue ).slice( 0, MAX_METADATA_VALUE_LENGTH );
  }
  return out;
}

// Returns the canonical minor-unit amount for a booking, or null if the
// booking is not in a payable state / has no computable fare.
export async function computeBookingAmountMinor (
  admin: ReturnType<typeof getAdminClient>,
  bookingId: string,
  authUser: { id: string },
): Promise<
  | { amountMinor: number; currency: string; booking: Record<string, unknown> }
  | null
> {
  const bookingIdTrim = String( bookingId ?? '' ).trim();
  if ( !bookingIdTrim ) {return null;}

  const modernLookup = await admin
    .from( 'bookings' )
    .select( BOOKING_PAYMENT_COLUMNS )
    .eq( 'booking_id', bookingIdTrim )
    .maybeSingle();
  let booking: Record<string, unknown> | null = modernLookup.data as Record<string, unknown> | null;
  let bookingError = modernLookup.error;

  // Older deployments use `user_id` for the booking owner. Retry only when the
  // modern ownership column is absent; unrelated lookup errors still fail closed.
  if ( bookingError && isMissingColumnError( bookingError ) ) {
    const legacyLookup = await admin
      .from( 'bookings' )
      .select( LEGACY_BOOKING_PAYMENT_COLUMNS )
      .eq( 'booking_id', bookingIdTrim )
      .maybeSingle();
    booking = legacyLookup.data as Record<string, unknown> | null;
    bookingError = legacyLookup.error;
  }

  if ( bookingError ) {
    console.error( '[payments] booking lookup failed', bookingError.message );
    return null;
  }
  if ( !booking ) {return null;}

  const isOwnedByCaller = String( booking.passenger_id ?? booking.user_id ?? '' ) === authUser.id;
  if ( !isOwnedByCaller ) {return null;}

  if ( BOOKING_PREPAID_STATUSES.has( String( booking.payment_status ?? '' ).toLowerCase() ) ) {
    return null;
  }

  const currency = String( booking.currency ?? 'jod' ).toLowerCase();
  if ( !ALLOWED_PAYMENT_CURRENCIES.has( currency ) ) {return null;}

  const amountMinor = deriveBookingAmountMinor( booking as Record<string, unknown>, currency );
  if ( !amountMinor || amountMinor < 50 || amountMinor > MAX_PAYMENT_AMOUNT_MINOR ) {
    return null;
  }

  return { amountMinor, currency, booking: booking as Record<string, unknown> };
}

// Prove a Stripe PaymentIntent id belongs to one of the platform's payment
// records before it is refunded. A card intent is bound to a booking; a
// top-up/checkout intent is referenced by a `payments` ledger row. The
// `payments` table shape varies across checkout revisions, so a missing
// table/columns are tolerated rather than crashing an admin refund.
export async function verifyPaymentIntentOwnership (
  admin: ReturnType<typeof getAdminClient>,
  intentId: string,
): Promise<{ owned: boolean; booking: Record<string, unknown> | null; amountMinor: number | null }> {
  const bookingColumns = BOOKING_PAYMENT_COLUMNS;

  const modernLookup = await admin
    .from( 'bookings' )
    .select( bookingColumns )
    .eq( 'stripe_payment_intent_id', intentId )
    .maybeSingle();
  let booking = modernLookup.data as Record<string, unknown> | null;
  let bookingError = modernLookup.error;

  if ( bookingError && isMissingColumnError( bookingError ) ) {
    const legacyLookup = await admin
      .from( 'bookings' )
      .select( LEGACY_BOOKING_PAYMENT_COLUMNS )
      .eq( 'stripe_payment_intent_id', intentId )
      .maybeSingle();
    booking = legacyLookup.data as Record<string, unknown> | null;
    bookingError = legacyLookup.error;
  }

  if ( !bookingError && booking ) {
    const row = booking as Record<string, unknown>;
    const currency = String( row.currency ?? 'jod' ).toLowerCase();
    return { owned: true, booking: row, amountMinor: deriveBookingAmountMinor( row, currency ) };
  }

  try {
    const { data: paymentRow, error: paymentError } = await admin
      .from( 'payments' )
      .select( 'id, booking_id, amount, currency, status' )
      .eq( 'id', intentId )
      .maybeSingle();
    if ( !paymentError && paymentRow && String( paymentRow.id ) === intentId ) {
      const minor = Number.isFinite( toNumber( paymentRow.amount ) ) ? toNumber( paymentRow.amount ) : null;
      return { owned: true, booking: null, amountMinor: minor };
    }
  } catch {
    // `payments` table/columns may differ this revision; the booking lookup above
    // is the authoritative check for card payments.
  }

  return { owned: false, booking: null, amountMinor: null };
}

// `handlePaymentIntentCreate` is the card-payment entry point for paying a
// booking (NOT a generic amount-accepting endpoint). The amount and currency are
// derived from the payable booking record server-side — a client-supplied
// amount is only accepted if it matches, so a caller cannot inflate or alter
// the fare they are being charged for. The created PaymentIntent is bound to the
// booking record (bookings.stripe_payment_intent_id) so the success webhook and
// refund flow can verify it belongs to the platform.
export async function handlePaymentIntentCreate ( request: Request ): Promise<Response> {
  if ( !stripe ) {
    return json( { error: 'Stripe is not configured' }, 503 );
  }

  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const {
    action,
    amount,
    currency: clientCurrency,
    booking_id,
    metadata,
    idempotency_key,
  } = body as {
    action?: string;
    amount?: unknown;
    currency?: string;
    booking_id?: string;
    metadata?: unknown;
    idempotency_key?: string;
  };

  if ( action && action !== 'create-payment-intent' ) {
    return json( { error: 'Unsupported payment action' }, 400 );
  }

  // Card-testing / fee-abuse guard: each call creates a live PaymentIntent on
  // the platform's Stripe account. Fail closed - a money path must not run
  // unthrottled just because the limiter is down.
  const limited = await consumeRateLimit( auth.admin, `payment-intent:${ auth.authUser.id }`, 10, { windowSeconds: 3600, failClosed: true } );
  if ( limited ) {return limited;}

  const bookingId = String( booking_id ?? '' ).trim();
  if ( !bookingId ) {
    return json( { error: 'booking_id is required to create a payment intent' }, 400 );
  }

  const booking = await computeBookingAmountMinor( auth.admin, bookingId, auth.canonicalUser );
  // Never disclose whether a booking exists for another user; a 403 covers both
  // "not found" and "not yours" to avoid leaking booking identifiers.
  if ( !booking ) {
    return json( { error: 'Booking not found or not payable by this user' }, 403 );
  }

  const { amountMinor, currency, booking: bookingRow } = booking;

  // Defense in depth: if the caller asserts an amount/currency it must match the
  // server-derived payable exactly. Mismatch = refused, not "corrected".
  const clientAmount = normalizePaymentAmount( amount );
  if ( clientAmount !== null && clientAmount !== amountMinor ) {
    console.warn( '[payments] create-intent amount mismatch', {
      bookingId,
      user: auth.authUser.id,
      clientAmount,
      serverAmount: amountMinor,
    } );
    return json( { error: 'Amount does not match the booking total' }, 409 );
  }
  if ( clientCurrency && String( clientCurrency ).toLowerCase() !== currency ) {
    return json( { error: 'Currency does not match the booking' }, 409 );
  }

  // A PaymentIntent already bound to this booking is returned idempotently so a
  // retried client call cannot mint duplicate intents.
  const existingIntentId = String( bookingRow.stripe_payment_intent_id ?? '' );
  if ( existingIntentId.startsWith( 'pi_' ) ) {
    try {
      const existing = await stripe.paymentIntents.retrieve( existingIntentId );
      if ( Number( existing.amount ) === amountMinor && String( existing.currency ?? '' ).toLowerCase() === currency ) {
        return json( {
          clientSecret: existing.client_secret,
          paymentIntentId: existing.id,
          client_secret: existing.client_secret,
        } );
      }
      // Bound intent does not match the current fare; fall through and create a
      // fresh one so a price change is never charged at a stale amount.
    } catch ( error ) {
      console.error( '[payments] existing-intent lookup failed', error instanceof Error ? error.message : String( error ) );
    }
  }

  const scopedIdempotencyKey =
    typeof idempotency_key === 'string' && idempotency_key.trim().length > 0
      ? `${ auth.authUser.id }:${ idempotency_key.trim().slice( 0, 120 ) }`
      : `payment-intent:${ auth.authUser.id }:booking:${ bookingId }`;

  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: amountMinor,
        currency,
        metadata: {
          ...sanitizeClientMetadata( metadata ),
          user_id: auth.authUser.id,
          booking_id: bookingId,
        },
      },
      { idempotencyKey: scopedIdempotencyKey },
    );

    // Bind the PaymentIntent to the payable record. prepaid bookings are rejected
    // upstream, and the idempotency key above guarantees the same key yields the
    // same Stripe intent, so this update is safe to overwrite on retry.
    const { error: bindError } = await auth.admin
      .from( 'bookings' )
      .update( { stripe_payment_intent_id: pi.id, updated_at: new Date().toISOString() } )
      .eq( 'booking_id', bookingId );

    if ( bindError ) {
      console.error( '[payments] intent binding failed', bindError.message );
      // An intent that is not bound to the booking can never be matched by the success
      // webhook or passed the refund ownership check, so never hand it to the client.
      try {
        await stripe.paymentIntents.cancel( pi.id );
      } catch ( cancelError ) {
        console.error( '[payments] could not cancel unbound intent', cancelError instanceof Error ? cancelError.message : String( cancelError ) );
      }
      return json( { error: 'Payment intent creation failed' }, 502 );
    }

    return json( {
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      client_secret: pi.client_secret,
    } );
  } catch ( error ) {
    console.error( '[payments] create-intent failed', error instanceof Error ? error.message : String( error ) );
    return json( { error: 'Payment intent creation failed' }, 502 );
  }
}

// eslint-disable-next-line complexity
export async function handlePaymentRefund ( request: Request ): Promise<Response> {
  if ( !stripe ) {
    return json( { error: 'Stripe is not configured' }, 503 );
  }

  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  // Refunds move money out of the platform. Only roles holding the canonical
  // `payments:refund` permission (admin, finance) may issue them. Passenger
  // refunds must go through the cancellation flow, which applies policy.
  const denied = enforcePermission( auth, 'payments:refund' );
  if ( denied ) {return denied;}

  const body = await request.json().catch( () => ( {} ) );
  const { payment_intent_id, booking_id, amount, reason, refund_key } = body as {
    payment_intent_id?: string;
    booking_id?: string;
    amount?: unknown;
    reason?: string;
    refund_key?: string;
  };

  let resolvedPaymentIntentId: string | undefined;
  let bookingRow: Record< string, unknown > | null;
  let expectedAmountMinor: number | null;

  if ( typeof payment_intent_id === 'string' && payment_intent_id.startsWith( 'pi_' ) ) {
    resolvedPaymentIntentId = payment_intent_id;
    // Verify the intent belongs to one of the platform's payment records before
    // touching it. A card PaymentIntent is bound to a booking; top-up/checkout
    // intents are referenced from a payments row. Anything else is refused so an
    // operator cannot refund an arbitrary Stripe payment_intent_id.
    const ownership = await verifyPaymentIntentOwnership( auth.admin, resolvedPaymentIntentId );
    if ( !ownership.owned ) {
      return json( { error: 'This payment intent does not belong to the platform' }, 403 );
    }
    bookingRow = ownership.booking;
    expectedAmountMinor = ownership.amountMinor;
  } else if ( typeof booking_id === 'string' && booking_id.trim() ) {
    const bookingIdTrim = booking_id.trim();
    const { data, error: lookupError } = await auth.admin
      .from( 'bookings' )
      .select( 'booking_id, passenger_id, amount, price_per_seat, seats_requested, currency, payment_status, stripe_payment_intent_id' )
      .eq( 'booking_id', bookingIdTrim )
      .maybeSingle();

    if ( lookupError ) {
      console.error( '[payments] refund booking lookup failed', lookupError.message );
      return json( { error: 'Payment lookup failed' }, 500 );
    }

    if ( !data ) {
      return json( { error: 'Booking not found' }, 404 );
    }

    bookingRow = data as Record< string, unknown >;
    const boundIntent = String( bookingRow.stripe_payment_intent_id ?? '' );
    // Only a Stripe PaymentIntent id can be refunded; a bare DB uuid cannot, and
    // a booking with no recorded card payment cannot be refunded here.
    if ( !boundIntent.startsWith( 'pi_' ) ) {
      return json( { error: 'No card payment is recorded for this booking' }, 409 );
    }
    resolvedPaymentIntentId = boundIntent;
    expectedAmountMinor = deriveBookingAmountMinor( bookingRow, String( bookingRow.currency ?? 'jod' ).toLowerCase() );
  } else {
    return json( { error: 'A payment_intent_id (pi_…) or booking_id is required' }, 400 );
  }

  if ( !resolvedPaymentIntentId ) {
    return json( { error: 'A valid payment_intent_id (pi_…) or a booking with a card payment is required' }, 400 );
  }

  // Amount guard: a client-supplied refund amount must not exceed the original
  // charge. The ceiling is derived server-side from the payable record; it is not
  // trusted from the request. Omitting `amount` => full refund.
  let refundAmount: number | undefined;
  if ( amount !== undefined && amount !== null ) {
    const parsed = normalizePaymentAmount( amount );
    if ( parsed === null ) {
      return json( { error: 'Refund amount must be a positive integer in minor units' }, 400 );
    }
    if ( expectedAmountMinor !== null && parsed > expectedAmountMinor ) {
      return json( { error: 'Refund amount exceeds the original charge' }, 409 );
    }
    refundAmount = parsed;
  }

  const normalizedReason = REFUND_REASONS.has( String( reason ) )
    ? ( reason as 'requested_by_customer' | 'duplicate' | 'fraudulent' )
    : 'requested_by_customer';

  try {
    // Declared locally rather than as `Stripe.RefundCreateParams`: the Stripe
    // SDK is loaded as a remote ESM module, which exports the class but not the
    // `Stripe` namespace, so the namespace type is not reachable here. This is
    // the subset of refund parameters this handler actually sends.
    const params: {
      payment_intent: string;
      amount?: number;
      reason: 'requested_by_customer' | 'duplicate' | 'fraudulent';
      metadata: Record<string, string>;
    } = {
      payment_intent: resolvedPaymentIntentId,
      reason: normalizedReason,
      metadata: { refunded_by: auth.authUser.id },
    };
    if ( refundAmount ) {
      params.amount = refundAmount;
    }

    // Deterministic key: a retried request for the same intent/amount cannot
    // issue a second refund. A caller that genuinely needs a second refund of the
    // same amount (two equal partial refunds) must send a distinct `refund_key`;
    // without it Stripe returns the first refund instead of creating another.
    const clientRefundKey = typeof refund_key === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test( refund_key.trim() )
      ? `:${ refund_key.trim() }`
      : '';
    const idempotencyKey = `refund:${ resolvedPaymentIntentId }:${ refundAmount ?? 'full' }${ clientRefundKey }`;
    const refund = await stripe.refunds.create( params, { idempotencyKey } );

    // Reflect the refund on the bound booking. A partial refund must not mark the booking
    // fully refunded, and the status only ever moves forward (succeeded ->
    // partially_refunded -> refunded), so a retry or the later `charge.refunded` webhook
    // can never move it backwards. A failure to persist state is not fatal to the Stripe
    // refund itself, which is the source of truth; the webhook reconciles it.
    if ( bookingRow && String( bookingRow.booking_id ?? '' ) ) {
      const isFullRefund = refundAmount === undefined
        || ( expectedAmountMinor !== null && refundAmount >= expectedAmountMinor );
      const { error: stateError } = await auth.admin
        .from( 'bookings' )
        .update( { payment_status: isFullRefund ? 'refunded' : 'partially_refunded', updated_at: new Date().toISOString() } )
        .eq( 'stripe_payment_intent_id', resolvedPaymentIntentId )
        .in( 'payment_status', isFullRefund
          ? [ 'succeeded', 'completed', 'paid', 'partially_refunded' ]
          : [ 'succeeded', 'completed', 'paid' ] );
      if ( stateError ) {
        console.warn( '[payments] refund state update skipped', stateError.message );
      }
    }

    console.info( '[payments] refund issued', {
      refundId: refund.id,
      paymentIntent: resolvedPaymentIntentId,
      actor: auth.authUser.id,
    } );

    return json( {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    } );
  } catch ( error ) {
    console.error( '[payments] refund failed', error instanceof Error ? error.message : String( error ) );
    return json( { error: 'Refund failed' }, 502 );
  }
}

export async function handleGetPaymentStatus ( request: Request, bookingId: string ): Promise<Response> {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const admin = auth.admin;
  const { data, error } = await admin
    .from( 'bookings' )
    .select( 'payment_status' )
    .eq( 'booking_id', bookingId )
    .eq( 'passenger_id', auth.canonicalUser.id )
    .maybeSingle();

  if ( error ) {
    console.error( '[payments] status lookup failed', error.message );
    return json( { error: 'Payment status lookup failed' }, error.code === 'PGRST116' ? 404 : 500 );
  }

  return json( { paymentStatus: data?.payment_status ?? 'unknown' } );
}
