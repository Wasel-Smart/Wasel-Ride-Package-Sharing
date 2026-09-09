import {
  json,
  noContent,
  buildResponseHeaders,
  finalizeResponse,
  isOriginAllowed,
  isWebhookRoute,
  enforceRequestSecurity,
  ensureRuntimeAdminAccess,
  authenticateRequest,
  getAdminClient,
  authenticateAuthUser,
  enforcePermission,
  hasAnyPermission,
  getFunctionBaseUrl,
  executeSqlStatements,
  getAppBaseUrl,
  matchesAuthenticatedUser,
  ensureCanonicalUserForAuth,
  getWalletForUser,
  getVerificationForUser,
  getDriverForUser,
  ensureDriverForUser,
  isApprovedDriver,
  buildProfilePayload,
  mapTripRow,
  mapBookingRow,
  mapPackageRow,
  fetchDriverProfiles,
  authorizeTripOwner,
  buildTrustStatus,
  ensureMobilitySeed,
  handleWalletDispatch,
  resolveRoute,
  logUnhandledRouteError,
  sanitizedUnhandledErrorResponse,
} from './shared.ts';

async function handleStripeWebhook ( request: Request ) {
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

  const event = JSON.parse( rawPayload );
  const admin = getAdminClient();

  if ( event?.type === 'checkout.session.completed' ) {
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

    await finalizeTopUpTransaction( transactionId, String( session?.id ?? '' ), event );
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
    const subscription = event?.data?.object ?? {};
    const synced = await syncStripeSubscriptionRecord( { admin, subscription } );
    return json( { received: true, subscriptionId: String( subscription?.id ?? '' ), synced } );
  }

  if ( event?.type === 'customer.subscription.deleted' ) {
    const subscription = event?.data?.object ?? {};
    const synced = await syncStripeSubscriptionRecord( { admin, subscription } );
    return json( { received: true, subscriptionId: String( subscription?.id ?? '' ), deleted: true, synced } );
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

  return json( { received: true, ignored: true } );
}

async function handleCliqWebhook ( request: Request ) {
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

  const event = JSON.parse( rawPayload );
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
    await finalizeTopUpTransaction( transactionId, providerReference, event, 'cliq' );
    return json( { received: true, transactionId, finalized: true } );
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

async function handleSanadWebhook ( request: Request ) {
  if ( !SANAD_WEBHOOK_SECRET ) {
    return json( { error: 'Sanad webhook secret is not configured.' }, 503 );
  }

  const rawPayload = await request.text();
  const signatureOk = await verifyProviderWebhookSignature( {
    payload: rawPayload,
    secret: SANAD_WEBHOOK_SECRET,
    signature: request.headers.get( 'x-sanad-signature' ) ?? request.headers.get( 'x-merchant-signature' ),
    timestamp: request.headers.get( 'x-sanad-timestamp' ) ?? request.headers.get( 'x-merchant-timestamp' ),
  } );

  if ( !signatureOk ) {
    return json( { error: 'Invalid Sanad signature.' }, 401 );
  }

  const event = JSON.parse( rawPayload );
  const eventObject = ( event?.data && typeof event.data === 'object' )
    ? event.data as Record<string, unknown>
    : event as Record<string, unknown>;
  const providerReference = firstStringValue( eventObject, [ 'providerReference', 'provider_reference', 'reference', 'sessionId', 'session_id', 'id' ] );
  const status = eventObject.status ?? eventObject.verificationStatus ?? eventObject.state ?? event?.type;
  if ( !providerReference ) {
    return json( { received: true, ignored: true, reason: 'missing_provider_reference' } );
  }

  const admin = getAdminClient();
  const verified = isSuccessfulProviderStatus( status );
  const failed = isFailedProviderStatus( status );
  const sanadStatus = verified ? 'verified' : failed ? 'rejected' : 'pending';
  const verificationLevel = verified ? 'level_2' : 'level_1';
  const failureReason = failed
    ? firstStringValue( eventObject, [ 'failureReason', 'failure_reason', 'reason', 'message' ] ) || 'Sanad verification rejected'
    : null;

  const { data: records, error: recordError } = await admin
    .from( 'verification_records' )
    .update( {
      sanad_status: sanadStatus,
      verification_level: verificationLevel,
      failure_reason: failureReason,
      updated_at: new Date().toISOString(),
    } )
    .eq( 'provider_reference', providerReference )
    .select( 'user_id' );

  if ( recordError ) {
    return json( { error: recordError.message }, 500 );
  }

  const userIds = [ ...new Set( ( records ?? [] ).map( ( record: Record<string, unknown> ) => String( record.user_id ) ).filter( Boolean ) ) ];
  for ( const userId of userIds ) {
    await admin
      .from( 'users' )
      .update( {
        sanad_verified_status: sanadStatus,
        verification_level: verificationLevel,
        updated_at: new Date().toISOString(),
      } )
      .eq( 'id', userId );
  }

  return json( { received: true, providerReference, sanadStatus, updatedUsers: userIds.length } );
}

async function handleResendWebhook ( request: Request ) {
  const url = new URL( request.url );
  if ( !hasValidWebhookToken( url, deliveryEnv.communicationWebhookToken ) ) {
    return json( { error: 'Invalid webhook token' }, 401 );
  }

  const payload = await request.json().catch( () => ( {} ) );
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

  if ( error ) return json( { error: error.message }, 500 );
  return json( { received: true, status } );
}

async function handleTwilioWebhook ( request: Request ) {
  const url = new URL( request.url );
  if ( !hasValidWebhookToken( url, deliveryEnv.communicationWebhookToken ) ) {
    return json( { error: 'Invalid webhook token' }, 401 );
  }

  const form = await request.formData();
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

  if ( error ) return json( { error: error.message }, 500 );
  return json( { received: true, status } );
}