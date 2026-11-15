import {
    json,
    getAdminClient,
    type AdminClient,
    SUPABASE_AUTH_HOOK_SEND_SMS_SECRET,
    deliveryEnv,
    constantTimeEquals,
    CLIQ_WEBHOOK_SECRET,
    CLIQ_WEBHOOK_AMOUNT_UNIT,
    STRIPE_WEBHOOK_SECRET,
    fetchStripeSubscription,
    finalizeTopUpTransaction,
    finalizeBookingPayment,
    firstStringValue,
    isFailedProviderStatus,
    isSuccessfulProviderStatus,
    markTopUpTransactionFailed,
    normalizeProviderStatus,
    syncStripeSubscriptionRecord,
    updateTopUpTransactionMetadata,
    verifyProviderWebhookSignature,
    verifyResendWebhookSignature,
    verifyStripeWebhookSignature,
    _verifyTwilioWebhookSignature,
} from './shared.ts';

import {
    mapResendEventToStatus,
    mapTwilioStatusToLifecycle,
} from '../_shared/communication-runtime.ts';

// Stripe reports JOD in fils (1 JOD = 1000 fils) while wallets are credited in JOD.
// Convert the provider-reported figure so finalizeTopUpTransaction can refuse to
// credit when the amount or currency actually paid differs from the pending row.
// A non-JOD currency yields amountJod = null with the currency set, which the
// finalizer also refuses.
function stripeReportedPayment ( amountMinor: unknown, currency: unknown ) {
  const reportedCurrency = String( currency ?? '' ).trim().toLowerCase();
  const minor = Number( amountMinor );
  return {
    amountJod: reportedCurrency === 'jod' && Number.isFinite( minor ) ? minor / 1000 : null,
    currency: reportedCurrency || null,
  };
}

export function cliqReportedPayment(amount: unknown, currency: unknown, unit: string) {
  const reportedCurrency = String(currency ?? '').trim().toLowerCase();
  const rawAmount = Number(amount);
  const normalizedUnit = unit.trim().toLowerCase();
  const amountJod = reportedCurrency === 'jod' && Number.isFinite(rawAmount) && rawAmount > 0
    ? normalizedUnit === 'jod'
      ? rawAmount
      : normalizedUnit === 'fils'
        ? rawAmount / 1000
        : null
    : null;

  return { amountJod, currency: reportedCurrency || null };
}

// The signature is checked before this runs, so a body that still fails to parse
// is a provider-side fault, not an attack. Answer 400 (the provider will not retry
// a client error forever) rather than letting JSON.parse throw into the generic 500
// handler, which providers treat as retryable and which pollutes error monitoring.
function parseSignedJson ( rawPayload: string ): ReturnType<typeof JSON.parse> | null {
  try {
    const parsed = JSON.parse( rawPayload );
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}


// Event types this handler acts on. Only these go through the event ledger: for
// anything else there is nothing to protect from a replay, and acknowledging it
// immediately keeps Stripe's endpoint health clean.
const STRIPE_LEDGER_EVENT_TYPES: ReadonlySet<string> = new Set( [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.expired',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'invoice.created',
  'payment_intent.payment_failed',
  'payment_intent.succeeded',
] );

export type StripeEventClaim = 'claimed' | 'duplicate' | 'in_progress';

export interface StripeEventLedger {
  claim: ( event: { id: string; type: string; createdAt: string; livemode: boolean } ) => Promise<StripeEventClaim>;
  complete: ( eventId: string, status: 'processed' | 'failed', error?: string ) => Promise<void>;
}

// Backed by public.app_claim_stripe_event / app_complete_stripe_event, so the claim is
// one atomic database operation shared by every edge isolate.
function createStripeEventLedger ( admin: AdminClient ): StripeEventLedger {
  return {
    async claim ( event ) {
      const { data, error } = await admin.rpc( 'app_claim_stripe_event', {
        p_event_id: event.id,
        p_event_type: event.type,
        p_event_created_at: event.createdAt,
        p_livemode: event.livemode,
      } );
      if ( error ) {throw new Error( error.message );}
      if ( data === 'claimed' || data === 'duplicate' || data === 'in_progress' ) {return data;}
      throw new Error( `Unexpected ledger response: ${ String( data ) }` );
    },
    async complete ( eventId, status, errorMessage ) {
      const { error } = await admin.rpc( 'app_complete_stripe_event', {
        p_event_id: eventId,
        p_status: status,
        p_error: errorMessage ?? null,
      } );
      if ( error ) {throw new Error( error.message );}
    },
  };
}

// eslint-disable-next-line complexity
export async function handleStripeWebhook ( request: Request, ledger?: StripeEventLedger ) {
  if ( !STRIPE_WEBHOOK_SECRET ) {
    return json( { error: 'Stripe webhook secret is not configured.' }, 503 );
  }

  const rawPayload = await request.text();
  const signatureOk = await verifyStripeWebhookSignature(
    rawPayload,
    request.headers.get( 'stripe-signature' ),
  );

  if ( !signatureOk ) {
    return json( { error: 'Invalid Stripe signature.' }, 401 );
  }

  const event = parseSignedJson( rawPayload );
  if ( !event ) {
    return json( { error: 'Invalid request body' }, 400 );
  }
  const admin = getAdminClient();

  // Events this handler does nothing with are acknowledged without touching the ledger.
  const eventType = String( event?.type ?? '' );
  if ( !STRIPE_LEDGER_EVENT_TYPES.has( eventType ) ) {
    return json( { received: true, ignored: true } );
  }

  const eventId = String( event?.id ?? '' ).trim();
  if ( !eventId ) {
    return json( { error: 'Stripe event id is missing.' }, 400 );
  }

  const eventLedger = ledger ?? createStripeEventLedger( admin );
  const createdSeconds = Number( event?.created );
  let claim: StripeEventClaim;
  try {
    claim = await eventLedger.claim( {
      id: eventId,
      type: eventType,
      createdAt: new Date( ( Number.isFinite( createdSeconds ) && createdSeconds > 0 ? createdSeconds : Date.now() / 1000 ) * 1000 ).toISOString(),
      livemode: Boolean( event?.livemode ),
    } );
  } catch ( error ) {
    // Without the ledger we cannot prove this event is not a replay. Refuse so Stripe
    // retries (it keeps retrying for days) instead of processing money unguarded.
    console.error( '[stripe-webhook] event ledger unavailable', { eventId, message: error instanceof Error ? error.message : String( error ) } );
    return json( { error: 'Event ledger unavailable.' }, 503 );
  }

  if ( claim === 'duplicate' ) {
    return json( { received: true, duplicate: true } );
  }
  if ( claim === 'in_progress' ) {
    // A concurrent delivery of the same event is mid-flight. A non-2xx makes Stripe retry later.
    return json( { error: 'Event is already being processed.' }, 409 );
  }

  try {
    const response = await processStripeEvent( event, admin );
    const succeeded = response.status < 400;
    await eventLedger
      .complete( eventId, succeeded ? 'processed' : 'failed', succeeded ? undefined : `HTTP ${ response.status }` )
      .catch( ( error: unknown ) => console.error( '[stripe-webhook] could not record outcome', { eventId, message: error instanceof Error ? error.message : String( error ) } ) );
    return response;
  } catch ( error ) {
    const message = error instanceof Error ? error.message : String( error );
    console.error( '[stripe-webhook] processing failed', { eventId, eventType, message } );
    await eventLedger
      .complete( eventId, 'failed', message )
      .catch( ( completeError: unknown ) => console.error( '[stripe-webhook] could not record failure', { eventId, message: completeError instanceof Error ? completeError.message : String( completeError ) } ) );
    return json( { error: 'Webhook processing failed.' }, 500 );
  }
}

// eslint-disable-next-line complexity
async function processStripeEvent ( event: ReturnType<typeof JSON.parse>, admin: AdminClient ): Promise<Response> {
  if ( event?.type === 'checkout.session.completed' || event?.type === 'checkout.session.async_payment_succeeded' ) {
    const session = event?.data?.object ?? {};
    if ( String( session?.mode ?? '' ) === 'subscription' ) {
      const subscriptionId = String( session?.subscription ?? '' );
      if ( !subscriptionId ) {
        return json( { received: true, ignored: true, reason: 'missing_subscription_id' } );
      }

      const subscription = await fetchStripeSubscription( subscriptionId );
      const synced = await syncStripeSubscriptionRecord( {
        admin,
        subscription,
        planOverride: String( session?.metadata?.plan ?? session?.metadata?.plan_name ?? 'premium' ),
      } );
      return json( { received: true, subscriptionId, synced } );
    }

    const transactionId = String( session?.metadata?.transaction_id ?? session?.client_reference_id ?? '' );
    if ( !transactionId ) {
      return json( { received: true, ignored: true } );
    }

    // `checkout.session.completed` also fires for delayed-notification payment
    // methods while the money is still unpaid. Only credit the wallet once Stripe
    // reports the session as paid; `async_payment_succeeded` covers the late case.
    if ( String( session?.payment_status ?? '' ) !== 'paid' ) {
      return json( { received: true, transactionId, pending: true, paymentStatus: String( session?.payment_status ?? '' ) } );
    }

    await finalizeTopUpTransaction( {
      transactionId,
      externalReference: String( session?.id ?? '' ),
      providerPayload: event,
      provider: 'stripe',
      expected: stripeReportedPayment( session?.amount_total, session?.currency ),
    } );
    return json( { received: true, transactionId, finalized: true } );
  }

  if ( event?.type === 'checkout.session.expired' ) {
    const session = event?.data?.object ?? {};
    if ( String( session?.mode ?? '' ) === 'subscription' ) {
      return json( { received: true, sessionId: String( session?.id ?? '' ), expired: true } );
    }

    const transactionId = String( session?.metadata?.transaction_id ?? session?.client_reference_id ?? '' );
    if ( transactionId ) {
      await markTopUpTransactionFailed(
        admin,
        transactionId,
        String( session?.id ?? '' ),
        'stripe',
        'Checkout session expired',
        event,
      );
    }
    return json( { received: true, transactionId, expired: true } );
  }

  if ( event?.type === 'customer.subscription.created' || event?.type === 'customer.subscription.updated' ) {
    const subscriptionId = String( event?.data?.object?.id ?? '' );
    if ( !subscriptionId ) {
      return json( { received: true, ignored: true, reason: 'missing_subscription_id' } );
    }
    // Stripe does not guarantee delivery order, so a late `updated` event can carry
    // older state than one already applied. Re-read the subscription instead of
    // trusting the payload; a failure throws, the event is marked failed, and Stripe retries.
    const subscription = await fetchStripeSubscription( subscriptionId );
    const synced = await syncStripeSubscriptionRecord( { admin, subscription } );
    return json( { received: true, subscriptionId, synced } );
  }

  if ( event?.type === 'customer.subscription.deleted' ) {
    const eventSubscription = event?.data?.object ?? {};
    const subscriptionId = String( eventSubscription?.id ?? '' );
    // A deleted subscription may no longer be retrievable; its own payload is then the
    // authoritative terminal state.
    const subscription = subscriptionId
      ? await fetchStripeSubscription( subscriptionId ).catch( () => eventSubscription )
      : eventSubscription;
    const synced = await syncStripeSubscriptionRecord( { admin, subscription } );
    return json( { received: true, subscriptionId, deleted: true, synced } );
  }

  if ( event?.type === 'invoice.paid' || event?.type === 'invoice.payment_failed' ) {
    const invoice = event?.data?.object ?? {};
    const subscriptionId = String( invoice?.subscription ?? '' );
    if ( !subscriptionId ) {
      return json( { received: true, ignored: true, reason: 'missing_subscription_id' } );
    }

    const subscription = await fetchStripeSubscription( subscriptionId );
    const synced = await syncStripeSubscriptionRecord( { admin, subscription } );
    return json( {
      received: true,
      subscriptionId,
      invoiceId: String( invoice?.id ?? '' ),
      synced,
      invoiceStatus: String( invoice?.status ?? '' ),
    } );
  }

  if ( event?.type === 'invoice.created' ) {
    return json( { received: true, invoiceId: String( event?.data?.object?.id ?? '' ), acknowledged: true } );
  }

  if ( event?.type === 'payment_intent.payment_failed' ) {
    const intent = event?.data?.object ?? {};
    const transactionId = String( intent?.metadata?.transaction_id ?? '' );
    if ( transactionId ) {
      await markTopUpTransactionFailed(
        admin,
        transactionId,
        String( intent?.id ?? '' ),
        'stripe',
        String( intent?.last_payment_error?.message ?? 'Payment failed' ),
        event,
      );
    }
    return json( { received: true, transactionId, failed: true } );
  }

  // A successful PaymentIntent. `checkout.session.completed` already finalizes
  // wallet top-ups; this branch finalizes *booking* card payments created via
  // `/payment/create-intent`, which previously had no success handler and could
  // therefore collect money with no record (finding P7). The bind is verified and
  // the paid amount/currency are reconciled before any booking state is written.
  if ( event?.type === 'payment_intent.succeeded' ) {
    const intent = event?.data?.object ?? {};
    const intentId = String( intent?.id ?? '' );
    const paidAmount = Number( intent?.amount_received ?? intent?.amount ?? 0 );
    const currency = String( intent?.currency ?? '' ).toLowerCase();
    const metadata = ( ( intent?.metadata ?? {} ) as Record<string, unknown> );
    const transactionId = String( metadata.transaction_id ?? '' );
    const bookingId = String( metadata.booking_id ?? '' );

    if ( transactionId ) {
      const result = await finalizeTopUpTransaction( {
        transactionId,
        externalReference: intentId,
        providerPayload: event,
        provider: 'stripe',
        expected: stripeReportedPayment( intent?.amount_received ?? paidAmount, currency ),
      } );
      return json( { received: true, transactionId, finalized: result.applied } );
    }

    if ( bookingId ) {
      const result = await finalizeBookingPayment( { admin, intentId, _paidAmount: paidAmount, currency } );
      return json( { received: true, bookingId, intentId, finalized: result.applied, reason: result.reason } );
    }

    return json( { received: true, ignored: true, reason: 'missing_booking_or_transaction_reference' } );
  }

  return json( { received: true, ignored: true } );
}

export async function handleCliqWebhook ( request: Request ) {
  if ( !CLIQ_WEBHOOK_SECRET ) {
    return json( { error: 'CliQ webhook secret is not configured.' }, 503 );
  }

  const rawPayload = await request.text();
  const signatureOk = await verifyProviderWebhookSignature( {
    payload: rawPayload,
    secret: CLIQ_WEBHOOK_SECRET,
    signature: request.headers.get( 'x-cliq-signature' ) ?? request.headers.get( 'x-merchant-signature' ),
    timestamp: request.headers.get( 'x-cliq-timestamp' ) ?? request.headers.get( 'x-merchant-timestamp' ),
  } );

  if ( !signatureOk ) {
    return json( { error: 'Invalid CliQ signature.' }, 401 );
  }

  const event = parseSignedJson( rawPayload );
  if ( !event ) {
    return json( { error: 'Invalid request body' }, 400 );
  }
  const eventObject = ( event?.data && typeof event.data === 'object' )
    ? event.data as Record<string, unknown>
    : event as Record<string, unknown>;
  const transactionId = firstStringValue( eventObject, [
    'transactionId',
    'transaction_id',
    'merchantTransactionId',
    'merchant_transaction_id',
    'reference',
    'referenceId',
  ] );
  const providerReference = firstStringValue( eventObject, [ 'paymentId', 'payment_id', 'cliqPaymentId', 'id' ] ) || transactionId;
  const status = eventObject.status ?? eventObject.paymentStatus ?? eventObject.state ?? event?.type;

  if ( !transactionId ) {
    return json( { received: true, ignored: true, reason: 'missing_transaction_id' } );
  }

  if ( isSuccessfulProviderStatus( status ) ) {
    // Reconcile against what the provider says was paid. The checkout URL carries
    // the amount as a plain query parameter, so the signed webhook is the only
    // trustworthy source. If the provider omits the amount, the finalizer now FAILS
    // CLOSED: the row stays pending and is held as `amount_unverified` for manual
    // review rather than being credited on trust. The provider's signed amount
    // scale must be explicitly configured after a sandbox payload confirms it.
    // Unknown/missing units deliberately keep the payment unverified.
    const reportedAmount = firstStringValue( eventObject, [ 'amount', 'paidAmount', 'paid_amount', 'amountPaid' ] );
    const reportedCurrency = firstStringValue( eventObject, [ 'currency', 'currencyCode' ] );
    const expected = cliqReportedPayment(reportedAmount, reportedCurrency, CLIQ_WEBHOOK_AMOUNT_UNIT);
    const result = await finalizeTopUpTransaction( {
      transactionId,
      externalReference: providerReference,
      providerPayload: event,
      provider: 'cliq',
      expected,
    } );
    return json( {
      received: true,
      transactionId,
      finalized: result.applied,
      ...(result.reason ? { reason: result.reason } : {}),
    } );
  }

  if ( isFailedProviderStatus( status ) ) {
    await markTopUpTransactionFailed(
      getAdminClient(),
      transactionId,
      providerReference,
      'cliq',
      firstStringValue( eventObject, [ 'failureReason', 'failure_reason', 'reason', 'message' ] ) || 'CliQ payment failed',
      event,
    );
    return json( { received: true, transactionId, failed: true } );
  }

  await updateTopUpTransactionMetadata( getAdminClient(), transactionId, {
    provider: 'cliq',
    provider_reference: providerReference,
    provider_status: normalizeProviderStatus( status ),
    provider_payload: event,
  } );

  return json( { received: true, transactionId, pending: true } );
}

export async function handleResendWebhook ( request: Request ) {
  const rawPayload = await request.text();
  // Verify the Resend webhook signature (HMAC-SHA256 over `<timestamp>.<body>`)
  // instead of a URL token. Fail closed when the signing secret is not configured.
  if ( !await verifyResendWebhookSignature( rawPayload, request.headers ) ) {
    return json( { error: 'Invalid Resend signature' }, 401 );
  }

  interface ResendWebhookPayload {
    type: string;
    data?: {
      email_id?: string;
      id?: string;
      email?: { id?: string };
    };
  }

  let payload: ResendWebhookPayload;
  try {
    payload = JSON.parse( rawPayload ) as ResendWebhookPayload;
  } catch {
    return json( { error: 'Invalid request body' }, 400 );
  }
  const eventType = String( payload?.type ?? '' );
  const externalReference = String(
    payload?.data?.email_id ??
    payload?.data?.id ??
    payload?.data?.email?.id ??
    '',
  );

  if ( !externalReference ) {
    return json( { received: true, ignored: true } );
  }

  const status = mapResendEventToStatus( eventType );
  const now = new Date().toISOString();
  const admin = getAdminClient();
  const patch = status === 'failed'
    ? { delivery_status: 'failed', failed_at: now, error_message: eventType, provider_response: payload, updated_at: now }
    : status === 'delivered'
      ? { delivery_status: 'delivered', delivered_at: now, provider_response: payload, updated_at: now }
      : { delivery_status: 'sent', provider_response: payload, updated_at: now };

  const { error } = await admin
    .from( 'communication_deliveries' )
    .update( patch )
    .eq( 'external_reference', externalReference )
    .eq( 'provider_name', 'resend' );

  if ( error ) {
    console.error( '[webhooks] resend delivery update failed', error.message );
    return json( { error: 'Delivery update failed' }, 500 );
  }
  return json( { received: true, status } );
}

export async function handleTwilioWebhook ( request: Request ) {
  const form = await request.formData();

  // Twilio signs the callback URL plus every POST parameter (sorted by name) with
  // HMAC-SHA1 and sends the digest in X-Twilio-Signature. Require that signature:
  // query-string credentials can leak through access logs and referrers.
  // Behind a proxy, TWILIO_WEBHOOK_PUBLIC_URL must match Twilio's configured URL.
  const signature = request.headers.get( 'x-twilio-signature' );
  const signingSecretConfigured = Boolean( deliveryEnv.twilioWebhookSigningSecret || deliveryEnv.twilioAuthToken );
  if ( !signingSecretConfigured ) {
    return json( { error: 'Twilio webhook signature verification is not configured.' }, 503 );
  }
  if ( !signature ) {
    return json( { error: 'Missing Twilio webhook signature.' }, 401 );
  }
  const signedParams = [ ...form.entries() ]
    .filter( ( entry ): entry is [ string, string ] => typeof entry[ 1 ] === 'string' )
    .sort( ( left, right ) => ( left[ 0 ] < right[ 0 ] ? -1 : left[ 0 ] > right[ 0 ] ? 1 : 0 ) )
    .map( ( [ key, value ] ) => `${ key }${ value }` )
    .join( '' );
  const authorized = await _verifyTwilioWebhookSignature(
    signedParams,
    signature,
    Deno.env.get( 'TWILIO_WEBHOOK_PUBLIC_URL' ) ?? request.url,
  );
  if ( !authorized ) {
    return json( { error: 'Invalid Twilio webhook signature.' }, 401 );
  }
  const externalReference = String( form.get( 'MessageSid' ) ?? '' );
  const rawStatus = String( form.get( 'MessageStatus' ) ?? '' );

  if ( !externalReference ) {
    return json( { received: true, ignored: true } );
  }

  const status = mapTwilioStatusToLifecycle( rawStatus );
  const now = new Date().toISOString();
  const payload = Object.fromEntries( form.entries() );
  const admin = getAdminClient();
  const patch = status === 'failed'
    ? { delivery_status: 'failed', failed_at: now, error_message: rawStatus, provider_response: payload, updated_at: now }
    : status === 'delivered'
      ? { delivery_status: 'delivered', delivered_at: now, provider_response: payload, updated_at: now }
      : { delivery_status: 'sent', provider_response: payload, updated_at: now };

  const { error } = await admin
    .from( 'communication_deliveries' )
    .update( patch )
    .eq( 'external_reference', externalReference )
    .eq( 'provider_name', 'twilio' );

  if ( error ) {
    console.error( '[webhooks] twilio delivery update failed', error.message );
    return json( { error: 'Delivery update failed' }, 500 );
  }
  return json( { received: true, status } );
}

/**
 * Verifies a Standard Webhooks signature, the scheme Supabase uses to sign HTTPS
 * Auth Hooks. Headers: webhook-id, webhook-timestamp, webhook-signature
 * ("v1,<base64> v1,<base64>"). The dashboard secret looks like "v1,whsec_<base64>".
 * Supabase does NOT send the secret as a Bearer token, so the previous check could
 * never succeed against a real hook call.
 */
async function verifyStandardWebhookSignature ( headers: Headers, rawBody: string, secret: string ): Promise<boolean> {
  const id = headers.get( 'webhook-id' ) ?? '';
  const timestamp = headers.get( 'webhook-timestamp' ) ?? '';
  const signatures = headers.get( 'webhook-signature' ) ?? '';
  if ( !id || !timestamp || !signatures || !secret ) {return false;}

  const issuedAt = Number( timestamp );
  if ( !Number.isFinite( issuedAt ) || Math.abs( Date.now() / 1000 - issuedAt ) > 300 ) {return false;}

  // Supabase supports overlapping hook secrets during rotation, encoded as a
  // pipe-delimited list. Accept each configured key while the dashboard and
  // Edge Function are being updated, then remove the retired key afterward.
  const configuredSecrets = secret.split( '|' ).map( ( value ) => value.trim() ).filter( Boolean );
  const signatureParts = signatures.split( ' ' ).map( ( part ) => part.split( ',' ) );
  let isValid = false;

  for ( const configuredSecret of configuredSecrets ) {
    const base64Secret = configuredSecret.replace( /^v1,/, '' ).replace( /^whsec_/, '' );
    try {
      const keyBytes = Uint8Array.from( atob( base64Secret ), ( char ) => char.charCodeAt( 0 ) );
      const key = await crypto.subtle.importKey(
        'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, [ 'sign' ],
      );
      const mac = await crypto.subtle.sign(
        'HMAC', key, new TextEncoder().encode( `${ id }.${ timestamp }.${ rawBody }` ),
      );
      const expected = btoa( String.fromCharCode( ...new Uint8Array( mac ) ) );
      for ( const [ version, signature ] of signatureParts ) {
        const matches = version === 'v1' && signature !== undefined && constantTimeEquals( signature, expected );
        isValid = matches || isValid;
      }
    } catch {
      // A malformed candidate must not prevent another valid rotation key
      // from being checked.
    }
  }

  return isValid;
}

// eslint-disable-next-line complexity
export async function handleSendSmsHook ( request: Request ): Promise<Response> {
  if ( !SUPABASE_AUTH_HOOK_SEND_SMS_SECRET ) {
    return json( { error: 'SMS hook secret is not configured.' }, 503 );
  }

  // Verify Supabase webhook signature: Authorization: Bearer <whsec_...>
  const rawBody = await request.text();
  const signatureValid = await verifyStandardWebhookSignature( request.headers, rawBody, SUPABASE_AUTH_HOOK_SEND_SMS_SECRET );
  // Signature is verified against the raw body (Standard Webhooks), see above.
  if ( !signatureValid ) {
    return json( { error: 'Invalid webhook signature.' }, 401 );
  }

  let body: unknown;
  try {
    body = JSON.parse( rawBody );
  } catch {
    body = null;
  }
  if ( !body || typeof body !== 'object' ) {
    return json( { error: 'Invalid request body.' }, 400 );
  }

  const phone = String( ( body as Record<string, unknown> ).phone ?? '' ).trim();
  const otp = String( ( body as Record<string, unknown> ).otp ?? '' ).trim();

  if ( !phone || !otp ) {
    return json( { error: 'Missing phone or otp in hook payload.' }, 400 );
  }

  const accountSid = deliveryEnv.twilioAccountSid ?? '';
  const authUser = deliveryEnv.twilioApiKeySid ?? accountSid;
  const authPassword = deliveryEnv.twilioApiKeySecret ?? deliveryEnv.twilioAuthToken ?? '';
  const messagingServiceSid = deliveryEnv.twilioMessagingServiceSid ?? '';
  const smsFrom = deliveryEnv.twilioSmsFrom ?? '';

  if ( !accountSid || !authPassword ) {
    return json( { error: 'Twilio is not configured.' }, 503 );
  }
  if ( !messagingServiceSid && !smsFrom ) {
    return json( { error: 'TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM is required.' }, 503 );
  }

  const smsBody = `Wasel | واصل: Your verification code is ${ otp }. It expires in 10 minutes. Never share this code with anyone.`;
  const params = new URLSearchParams( { To: phone, Body: smsBody } );
  if ( messagingServiceSid ) {
    params.set( 'MessagingServiceSid', messagingServiceSid );
  } else {
    params.set( 'From', smsFrom );
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${ accountSid }/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${ btoa( `${ authUser }:${ authPassword }` ) }`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    },
  );

  if ( !response.ok ) {
    const err = await response.json().catch( () => ( {} ) );
    return json( { error: String( err?.message ?? `Twilio error ${ response.status }` ) }, 502 );
  }

  return json( { success: true } );
}
