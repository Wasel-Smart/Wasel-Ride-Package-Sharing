import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_DB_URL,
  STRIPE_SECRET_KEY,
  stripe,
  STRIPE_WEBHOOK_SECRET,
  STRIPE_API_VERSION,
  TWILIO_VERIFY_SERVICE_SID,
  APP_BASE_URL,
  CLIQ_API_BASE_URL,
  CLIQ_MERCHANT_ID,
  CLIQ_API_KEY,
  CLIQ_WEBHOOK_SECRET,
  CLIQ_CHECKOUT_URL_TEMPLATE,
  CLIQ_CHECKOUT_ENDPOINT,
  SANAD_API_BASE_URL,
  SANAD_CLIENT_ID,
  SANAD_CLIENT_SECRET,
  SANAD_WEBHOOK_SECRET,
  SANAD_VERIFICATION_ENDPOINT,
  STRIPE_WASEL_PLUS_PRICE_ID,
  ADDITIONAL_ALLOWED_ORIGINS,
  ALLOW_LOCAL_ORIGINS,
  RUNTIME_ADMIN_ENABLED,
  SERVICE_NAME,
  responseBaseHeaders,
  deliveryEnv,
  COMMUNICATIONS_RUNTIME_SQL,
  COMMUNICATIONS_OPERATIONS_SQL,
  CONTENT_MODERATION_SQL,
  json,
  addVersionHeader,
  noContent,
  buildResponseHeaders,
  finalizeResponse,
  logUnhandledRouteError,
  sanitizedUnhandledErrorResponse,
  isOriginAllowed,
  WEBHOOK_PATH_PREFIXES,
  isWebhookRoute,
  enforceRequestSecurity,
  getAdminClient,
  authenticateRequest,
  constantTimeEqual,
  getWorkerSecret,
  hasWorkerAccess,
  ensureRuntimeAdminAccess,
  enforcePermission,
  hasAnyPermission,
  getFunctionBaseUrl,
  executeSqlStatements,
  getAppBaseUrl,
  matchesAuthenticatedUser,
  parseWalletRoute,
  parseEntityRoute,
  formatDate,
  formatTime,
  authenticateAuthUser,
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
} from './shared.ts';

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
