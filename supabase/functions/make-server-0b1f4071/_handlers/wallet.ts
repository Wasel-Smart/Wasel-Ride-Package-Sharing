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
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  try {
    return json( await loadWalletPayload( auth.admin, auth.canonicalUser.id ) );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleGetWalletTransactions ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  try {
    const url = new URL( request.url );
    const page = Math.max( 1, Number.parseInt( url.searchParams.get( 'page' ) ?? '1', 10 ) || 1 );
    const limit = Math.min( 100, Math.max( 1, Number.parseInt( url.searchParams.get( 'limit' ) ?? '20', 10 ) || 20 ) );
    const type = url.searchParams.get( 'type' );
    const details = await loadWalletDetails( auth.admin, auth.canonicalUser.id );
    const all = details.transactions.map( toWalletTransaction );
    const filtered = type ? all.filter( tx => tx.type === type ) : all;
    const start = ( page - 1 ) * limit;
    return json( {
      transactions: filtered.slice( start, start + limit ),
      page,
      limit,
      total: filtered.length,
    } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleGetWalletInsights ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  try {
    const details = await loadWalletDetails( auth.admin, auth.canonicalUser.id );
    return json( buildWalletInsights( details.transactions.map( toWalletTransaction ) ) );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleWalletWithdraw ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const amountJod = toMoneyNumber( body.amount );
  const bankAccount = String( body.bankAccount ?? '' ).trim();
  const method = String( body.method ?? 'bank_transfer' ).trim() || 'bank_transfer';
  if ( amountJod <= 0 ) return json( { error: 'Amount must be greater than zero.' }, 400 );
  if ( !bankAccount ) return json( { error: 'Bank account is required.' }, 400 );

  try {
    const wallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    if ( toNumber( wallet.balance, 0 ) < amountJod ) {
      return json( { error: 'Insufficient wallet balance.' }, 400 );
    }
    const { error } = await auth.admin.rpc( 'wallet_post_transaction', {
      p_wallet_id: wallet.wallet_id,
      p_amount: amountJod,
      p_transaction_type: 'withdraw_funds',
      p_payment_method: 'local_gateway',
      p_direction: 'debit',
      p_reference_type: 'bank_account',
      p_reference_id: null,
      p_metadata: {
        bank_account: bankAccount,
        requested_via: method,
        description: 'Wallet withdrawal',
      },
    } );
    if ( error ) throw new Error( error.message );
    return json( await loadWalletPayload( auth.admin, auth.canonicalUser.id ) );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleWalletSend ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const amountJod = toMoneyNumber( body.amount );
  const recipientId = String( body.recipientId ?? '' ).trim();
  const note = String( body.note ?? '' ).trim();
  if ( amountJod <= 0 ) return json( { error: 'Amount must be greater than zero.' }, 400 );

  try {
    const recipientUserId = await resolveWalletRecipient( auth.admin, recipientId );
    if ( !recipientUserId ) return json( { error: 'Recipient wallet was not found.' }, 404 );
    if ( recipientUserId === auth.canonicalUser.id ) {
      return json( { error: 'Cannot send wallet funds to the same account.' }, 400 );
    }

    const { error } = await auth.admin.rpc( 'app_transfer_wallet_funds', {
      p_from_user_id: auth.canonicalUser.id,
      p_to_user_id: recipientUserId,
      p_amount: amountJod,
      p_payment_method: 'wallet_balance',
    } );
    if ( error ) throw new Error( error.message );

    return json( { success: true, note, wallet: await loadWalletPayload( auth.admin, auth.canonicalUser.id ) } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleSetWalletPin ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const pin = String( body.pin ?? '' ).trim();
  if ( !/^\d{4}$/.test( pin ) ) return json( { error: 'Wallet PIN must be four digits.' }, 400 );

  try {
    const pinHash = await hashWalletPin( pin );
    const { error } = await auth.admin
      .from( 'wallets' )
      .update( { pin_hash: pinHash, updated_at: new Date().toISOString() } )
      .eq( 'user_id', auth.canonicalUser.id );
    if ( error ) throw new Error( error.message );
    return json( { success: true, wallet: await loadWalletPayload( auth.admin, auth.canonicalUser.id ) } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleVerifyWalletPin ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const pin = String( body.pin ?? '' ).trim();
  try {
    const wallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    const verified = await verifyWalletPinHash( pin, wallet.pin_hash );
    return json( { verified } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleSetWalletAutoTopUp ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const amount = toMoneyNumber( body.amount );
  const threshold = toMoneyNumber( body.threshold );
  try {
    const { error } = await auth.admin
      .from( 'wallets' )
      .update( {
        auto_top_up_enabled: Boolean( body.enabled ),
        auto_top_up_amount: amount > 0 ? amount : 20,
        auto_top_up_threshold: threshold >= 0 ? threshold : 5,
        updated_at: new Date().toISOString(),
      } )
      .eq( 'user_id', auth.canonicalUser.id );
    if ( error ) throw new Error( error.message );
    return json( await loadWalletPayload( auth.admin, auth.canonicalUser.id ) );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleGetWalletPaymentMethods ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  try {
    const details = await loadWalletDetails( auth.admin, auth.canonicalUser.id );
    return json( { methods: details.paymentMethods } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleAddWalletPaymentMethod ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const provider = String( body.provider ?? 'manual' ).trim() || 'manual';
  try {
    const { data, error } = await auth.admin
      .from( 'payment_methods' )
      .insert( {
        user_id: auth.canonicalUser.id,
        provider,
        method_type: normalizeWalletPaymentMethod( body.type ?? body.method_type ),
        token_reference: String( body.token_reference ?? body.last4 ?? `pm-${ crypto.randomUUID() }` ),
        is_default: Boolean( body.is_default ),
        status: 'active',
      } )
      .select( '*' )
      .single();
    if ( error ) throw new Error( error.message );
    return json( data, 201 );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleDeleteWalletPaymentMethod ( request: Request, requestedUserId: string, methodId: string | null ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;
  if ( !methodId ) return json( { error: 'Payment method id is required.' }, 400 );

  try {
    const { error } = await auth.admin
      .from( 'payment_methods' )
      .delete()
      .eq( 'payment_method_id', methodId )
      .eq( 'user_id', auth.canonicalUser.id );
    if ( error ) throw new Error( error.message );
    return json( { success: true } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleGetWalletTrustScore ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  try {
    const [ { data: wallet }, { data: driver }, { data: user, error: userError } ] = await Promise.all( [
      auth.admin.from( 'wallets' ).select( 'balance' ).eq( 'user_id', auth.canonicalUser.id ).maybeSingle(),
      auth.admin.from( 'drivers' ).select( 'driver_id' ).eq( 'user_id', auth.canonicalUser.id ).maybeSingle(),
      auth.admin.from( 'users' ).select( 'verification_level' ).eq( 'id', auth.canonicalUser.id ).maybeSingle(),
    ] );
    if ( userError ) throw new Error( userError.message );
    let tripCount = 0;
    if ( driver?.driver_id ) {
      const { count } = await auth.admin
        .from( 'trips' )
        .select( 'trip_id', { count: 'exact', head: true } )
        .eq( 'driver_id', driver.driver_id );
      tripCount = toNumber( count, 0 );
    }
    return json( {
      totalTrips: tripCount,
      cashRating: 5,
      onTimePayments: user?.verification_level === 'level_0' ? 80 : 98,
      deposit: toNumber( wallet?.balance, 0 ),
    } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleGetWalletRewards ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;
  return json( { rewards: [] } );
}

async function handleClaimWalletReward ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;
  const body = await request.json().catch( () => ( {} ) );
  const rewardId = String( body.rewardId ?? '' ).trim();
  if ( !rewardId ) return json( { error: 'Reward id is required.' }, 400 );
  return json( { error: 'Reward is not available.' }, 404 );
}

async function handleGetWalletSubscription ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return json( { error: 'Wallet route is not authorized for this user.' }, 403 );
  }

  try {
    const subscription = await getWalletSubscription( auth.admin, auth.canonicalUser.id );
    return json( { subscription } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleWalletTopUp ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return json( { error: 'Wallet route is not authorized for this user.' }, 403 );
  }

  const body = await request.json().catch( () => ( {} ) );
  const amountJod = toMoneyNumber( body.amount );
  const paymentMethod = String( body.paymentMethod ?? 'card' ).trim() || 'card';

  if ( amountJod <= 0 ) {
    return json( { error: 'Amount must be greater than zero.' }, 400 );
  }

  const { data: wallet, error: walletError } = await auth.admin
    .from( 'wallets' )
    .select( 'wallet_id, user_id, currency_code' )
    .eq( 'user_id', auth.canonicalUser.id )
    .maybeSingle();

  if ( walletError ) {
    return json( { error: walletError.message }, 500 );
  }
  if ( !wallet?.wallet_id ) {
    return json( { error: 'Wallet not found.' }, 404 );
  }

  const pending = await createPendingTopUpTransaction(
    auth.admin,
    String( wallet.wallet_id ),
    amountJod,
    paymentMethod,
  );

  if ( paymentMethod === 'cliq' ) {
    if ( !CLIQ_CHECKOUT_URL_TEMPLATE && !( CLIQ_API_BASE_URL && CLIQ_MERCHANT_ID && CLIQ_API_KEY ) ) {
      await markTopUpTransactionFailed(
        auth.admin,
        pending.transactionId,
        null,
        'cliq',
        'CliQ provider is not configured on the server',
        { requested_method: paymentMethod },
      );
      return json( { error: 'CliQ provider is not configured on the server.' }, 503 );
    }

    const cliqSession = await createCliqCheckoutSession( {
      transactionId: pending.transactionId,
      amountJod,
      currency: String( wallet.currency_code ?? 'JOD' ).toUpperCase(),
      request,
    } ).catch( async ( error ) => {
      await markTopUpTransactionFailed(
        auth.admin,
        pending.transactionId,
        null,
        'cliq',
        error instanceof Error ? error.message : String( error ),
        { requested_method: paymentMethod },
      );
      throw error;
    } );

    const checkoutUrl = cliqSession.checkoutUrl || buildCliqCheckoutUrl( CLIQ_CHECKOUT_URL_TEMPLATE, {
      transactionId: pending.transactionId,
      amount: amountJod.toFixed( 3 ),
      currency: String( wallet.currency_code ?? 'JOD' ).toUpperCase(),
      returnUrl: `${ getAppBaseUrl( request ) }/app/wallet?payment=success&tx=${ encodeURIComponent( pending.transactionId ) }`,
    } );

    await updateTopUpTransactionMetadata( auth.admin, pending.transactionId, {
      provider: 'cliq',
      checkout_url: checkoutUrl,
      provider_reference: cliqSession.providerReference,
      provider_status: 'requires_action',
    } );

    return json( {
      payment: {
        transactionId: pending.transactionId,
        provider: 'cliq',
        status: 'requires_action',
        checkoutUrl,
      },
    }, 202 );
  }

  try {
    const session = await createStripeCheckoutSession( {
      amountJod,
      paymentMethod,
      transactionId: pending.transactionId,
      canonicalUserId: auth.canonicalUser.id,
      walletId: String( wallet.wallet_id ),
      request,
    } );

    await updateTopUpTransactionMetadata( auth.admin, pending.transactionId, {
      provider: 'stripe',
      provider_status: 'requires_action',
      checkout_session_id: session.id,
      checkout_url: session.url ?? null,
    } );

    return json( {
      payment: {
        transactionId: pending.transactionId,
        provider: 'stripe',
        status: 'requires_action',
        checkoutUrl: session.url ?? null,
        sessionId: session.id,
      },
    }, 202 );
  } catch ( error ) {
    const message = error instanceof Error ? error.message : String( error );
    await markTopUpTransactionFailed(
      auth.admin,
      pending.transactionId,
      null,
      'stripe',
      message,
      { requested_method: paymentMethod },
    ).catch( () => undefined );
    return json( { error: message }, 502 );
  }
}

async function handleWalletSubscribe ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return json( { error: 'Wallet route is not authorized for this user.' }, 403 );
  }

  const body = await request.json().catch( () => ( {} ) );
  const planName = String( body.planName ?? 'Wasel Plus' ).trim() || 'Wasel Plus';

  try {
    const existingSubscription = await getWalletSubscription( auth.admin, auth.canonicalUser.id );
    if ( existingSubscription && [ 'active', 'trialing', 'past_due' ].includes( existingSubscription.status ) ) {
      return json( {
        subscription: {
          ...existingSubscription,
          provider: 'stripe',
        },
      } );
    }

    const session = await createStripeSubscriptionCheckoutSession( {
      admin: auth.admin,
      canonicalUser: {
        id: auth.canonicalUser.id,
        email: auth.canonicalUser.email ?? auth.authUser.email ?? null,
        full_name: auth.canonicalUser.full_name ?? null,
        phone_number: auth.canonicalUser.phone_number ?? null,
      },
      planName,
      request,
    } );

    return json( {
      subscription: {
        provider: 'stripe',
        status: 'requires_action',
        checkoutUrl: session.url ?? null,
        sessionId: session.id,
        plan: mapSubscriptionPlan( planName ),
      },
    }, 202 );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 502 );
  }
}

async function handleWalletPay ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const amountJod = toMoneyNumber( body.amount );
  const referenceType = String( body.referenceType ?? body.reference_type ?? 'ride_booking' ).trim();
  const referenceId = String( body.referenceId ?? body.reference_id ?? '' ).trim();
  const metadata = body.metadata ?? {};

  if ( amountJod <= 0 ) {
    return json( { error: 'Amount must be greater than zero.' }, 400 );
  }

  const allowedReferenceTypes = [ 'ride_booking', 'package_delivery', 'bus_booking', 'subscription', 'purchase' ];
  if ( !allowedReferenceTypes.includes( referenceType ) ) {
    return json( { error: `Invalid reference type. Must be one of: ${ allowedReferenceTypes.join( ', ' ) }` }, 400 );
  }

  try {
    const wallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    if ( toNumber( wallet.balance, 0 ) < amountJod ) {
      return json( { error: 'Insufficient wallet balance.' }, 400 );
    }

    const transactionType = mapReferenceTypeToTransactionType( referenceType );
    const { error } = await auth.admin.rpc( 'app_pay_with_wallet', {
      p_user_id: auth.canonicalUser.id,
      p_amount: amountJod,
      p_transaction_type: transactionType,
      p_payment_method: 'wallet_balance',
      p_reference_type: referenceType,
      p_reference_id: referenceId || null,
      p_metadata: metadata,
    } );

    if ( error ) {
      throw new Error( String( error.message ?? error ) );
    }

    const updatedWallet = await loadWalletPayload( auth.admin, auth.canonicalUser.id );
    return json( { success: true, wallet: updatedWallet, transactionType, referenceId } );
  } catch ( error ) {
    return json( { error: error instanceof Error ? error.message : String( error ) }, 500 );
  }
}

async function handleWalletDispatch ( request: Request, path: string ): Promise<Response | undefined> {
  const walletRoute = parseWalletRoute( path );
  if ( !walletRoute ) return undefined;

  const method = request.method;
  const { userId, action, resourceId } = walletRoute;

  if ( method === 'GET' && action === '' ) return handleGetWallet( request, userId );
  if ( method === 'GET' && action === 'transactions' ) return handleGetWalletTransactions( request, userId );
  if ( method === 'GET' && action === 'insights' ) return handleGetWalletInsights( request, userId );
  if ( method === 'POST' && action === 'withdraw' ) return handleWalletWithdraw( request, userId );
  if ( method === 'POST' && action === 'send' ) return handleWalletSend( request, userId );
  if ( method === 'POST' && action === 'pin' && resourceId === 'set' ) return handleSetWalletPin( request, userId );
  if ( method === 'POST' && action === 'pin' && resourceId === 'verify' ) return handleVerifyWalletPin( request, userId );
  if ( method === 'POST' && action === 'auto-topup' ) return handleSetWalletAutoTopUp( request, userId );
  if ( method === 'GET' && action === 'payment-methods' ) return handleGetWalletPaymentMethods( request, userId );
  if ( method === 'POST' && action === 'payment-methods' ) return handleAddWalletPaymentMethod( request, userId );
  if ( method === 'DELETE' && action === 'payment-methods' ) return handleDeleteWalletPaymentMethod( request, userId, resourceId );
  if ( method === 'GET' && action === 'trust-score' ) return handleGetWalletTrustScore( request, userId );
  if ( method === 'GET' && action === 'rewards' ) return handleGetWalletRewards( request, userId );
  if ( method === 'POST' && action === 'rewards' && resourceId === 'claim' ) return handleClaimWalletReward( request, userId );
  if ( method === 'GET' && action === 'subscription' ) return handleGetWalletSubscription( request, userId );
  if ( method === 'POST' && action === 'top-up' ) return handleWalletTopUp( request, userId );
  if ( method === 'POST' && action === 'subscribe' ) return handleWalletSubscribe( request, userId );
  if ( method === 'POST' && action === 'pay' ) return handleWalletPay( request, userId );
  return undefined;
}
