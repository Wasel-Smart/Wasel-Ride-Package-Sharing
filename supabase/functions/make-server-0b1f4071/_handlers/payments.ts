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
  if ( !stripe ) {
    return json( { error: 'Stripe is not configured' }, 503 );
  }

  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const {
    action,
    amount,
    currency = 'usd',
    customer_id,
    metadata,
    idempotency_key,
  } = body as {
    action?: string;
    amount?: unknown;
    currency?: string;
    customer_id?: string;
    metadata?: Record<string, string>;
    idempotency_key?: string;
  };

  if ( action && action !== 'create-payment-intent' ) {
    return json( { error: 'Unsupported payment action' }, 400 );
  }

  const normalizedAmount = normalizePaymentAmount( amount );
  const normalizedCurrency = String( currency ).toLowerCase();
  if ( !normalizedAmount ) {
    return json( { error: 'Invalid amount' }, 400 );
  }
  if ( !ALLOWED_PAYMENT_CURRENCIES.has( normalizedCurrency ) ) {
    return json( { error: 'Invalid currency' }, 400 );
  }

  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: normalizedAmount,
        currency: normalizedCurrency,
        customer: customer_id || undefined,
        metadata: {
          ...( metadata || {} ),
          user_id: auth.authUser.id,
        },
      },
      idempotency_key ? { idempotencyKey: idempotency_key } : undefined,
    );

    return json( {
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      client_secret: pi.client_secret,
    } );
  } catch ( error ) {
    const message = error instanceof Error ? error.message : String( error );
    return json( { error: `Payment intent creation failed: ${ message }` }, 502 );
  }
}

async function handlePaymentRefund ( request: Request ): Promise<Response> {
  if ( !stripe ) {
    return json( { error: 'Stripe is not configured' }, 503 );
  }

  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const { payment_intent_id, booking_id, amount, reason } = body as {
    payment_intent_id?: string;
    booking_id?: string;
    amount?: number;
    reason?: string;
  };

  let resolvedPaymentIntentId = payment_intent_id;

  if ( !resolvedPaymentIntentId && booking_id ) {
    const admin = auth.admin;
    const { data: paymentRecord, error: lookupError } = await admin
      .from( 'payments' )
      .select( 'id' )
      .eq( 'booking_id', booking_id )
      .eq( 'user_id', auth.authUser.id )
      .order( 'created_at', { ascending: false } )
      .limit( 1 )
      .maybeSingle();

    if ( lookupError ) {
      return json( { error: `Payment lookup failed: ${ lookupError.message }` }, 500 );
    }

    resolvedPaymentIntentId = paymentRecord?.id;
  }

  if ( !resolvedPaymentIntentId ) {
    return json( { error: 'payment_intent_id or booking_id is required' }, 400 );
  }

  try {
    const params: Stripe.RefundCreateParams = {
      payment_intent: resolvedPaymentIntentId,
      reason: ( reason as Stripe.RefundCreateParams['reason'] ) ?? 'requested_by_customer',
    };
    if ( amount ) {
      params.amount = amount;
    }
    const refund = await stripe.refunds.create( params );
    return json( {
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    } );
  } catch ( error ) {
    const message = error instanceof Error ? error.message : String( error );
    return json( { error: `Refund failed: ${ message }` }, 502 );
  }
}

async function handleGetPaymentStatus ( request: Request, bookingId: string ): Promise<Response> {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const admin = auth.admin;
  const { data, error } = await admin
    .from( 'bookings' )
    .select( 'payment_status' )
    .eq( 'id', bookingId )
    .eq( 'passenger_id', auth.authUser.id )
    .maybeSingle();

  if ( error ) {
    return json( { error: error.message }, error.code === 'PGRST116' ? 404 : 500 );
  }

  return json( { paymentStatus: data?.payment_status ?? 'unknown' } );
}
