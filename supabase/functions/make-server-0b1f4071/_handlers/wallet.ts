import {
    type getAdminClient,
    json,
    authenticateRequest,
    getAppBaseUrl,
    matchesAuthenticatedUser,
    consumeRateLimit,
    resetRateLimit,
    CLIQ_API_BASE_URL,
    CLIQ_API_KEY,
    CLIQ_CHECKOUT_URL_TEMPLATE,
    CLIQ_MERCHANT_ID,
    authenticateWalletRequest,
    buildCliqCheckoutUrl,
    buildWalletInsights,
    createCliqCheckoutSession,
    createPendingTopUpTransaction,
    createStripeCheckoutSession,
    createStripeSubscriptionCheckoutSession,
    ensureWalletForUser,
    getWalletSubscription,
    hashWalletPin,
    loadWalletDetails,
    loadWalletPayload,
    mapReferenceTypeToTransactionType,
    mapSubscriptionPlan,
    markTopUpTransactionFailed,
    normalizeWalletPaymentMethod,
    parseWalletRoute,
    resolveWalletRecipient,
    toMoneyNumber,
    toWalletTransaction,
    updateTopUpTransactionMetadata,
    verifyWalletPinHash,
} from './shared.ts';

import {
  toNumber,
} from '../_shared/pricing.ts';


export async function handleGetWallet ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  try {
    return json( await loadWalletPayload( auth.admin, auth.canonicalUser.id ) );
  } catch ( error ) {
    return walletOperationFailed( 'get-wallet', error );
  }
}

export async function handleGetWalletTransactions ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  try {
    const url = new URL( request.url );
    const page = Math.max( 1, Number.parseInt( url.searchParams.get( 'page' ) ?? '1', 10 ) || 1 );
    const limit = Math.min( 100, Math.max( 1, Number.parseInt( url.searchParams.get( 'limit' ) ?? '20', 10 ) || 20 ) );
    const type = url.searchParams.get( 'type' );
    const wallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    const start = ( page - 1 ) * limit;
    // Paginate in the database. This used to slice the newest 50 rows in memory, so
    // page 2+ came back empty and anything older than the 50th transaction was unreachable.
    let query = auth.admin
      .from( 'transactions' )
      .select( '*', { count: 'exact' } )
      .eq( 'wallet_id', wallet.wallet_id );
    if ( type ) {query = query.eq( 'transaction_type', type );}
    const { data, error, count } = await query
      .order( 'created_at', { ascending: false } )
      .range( start, start + limit - 1 );
    if ( error ) {throw new Error( error.message );}
    return json( {
      transactions: ( Array.isArray( data ) ? data : [] ).map( toWalletTransaction ),
      page,
      limit,
      total: count ?? 0,
    } );
  } catch ( error ) {
    return walletOperationFailed( 'get-transactions', error );
  }
}

export async function handleGetWalletInsights ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  try {
    const wallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    // Insights aggregate over all settled transactions, not just the newest 50.
    // loadWalletDetails() hard-limits to 50 rows, so users with more history got
    // incorrect monthly totals. Fetch all rows here without a limit.
    const { data, error } = await auth.admin
      .from( 'transactions' )
      .select( '*' )
      .eq( 'wallet_id', wallet.wallet_id )
      .order( 'created_at', { ascending: false } );
    if ( error ) {throw new Error( error.message );}
    return json( buildWalletInsights( ( Array.isArray( data ) ? data : [] ).map( toWalletTransaction ) ) );
  } catch ( error ) {
    return walletOperationFailed( 'get-insights', error );
  }
}

// Per-operation ceilings (JOD). Anything larger must go through support/KYC.
const MAX_WALLET_SEND_JOD = 1000;
const MAX_WALLET_TOPUP_JOD = 2000;
const MAX_WALLET_AUTO_TOPUP_THRESHOLD_JOD = 1000;
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCKOUT_SECONDS = 15 * 60;
// A wallet with no PIN has no second factor on money-out. Until a PIN is set, a
// stolen session may move only a small amount per request; larger transfers and
// withdrawals require the owner to set a PIN first.
const MAX_NO_PIN_MONEY_OUT_JOD = 25;
// New and existing PINs may be 4 or 6 digits. Existing 4-digit PINs keep working;
// 6 digits raises the guess space 100x for users who opt in.
const PIN_PATTERN = /^\d{4}(?:\d{2})?$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const PAYMENT_PROVIDER_PATTERN = /^[a-z0-9_-]{2,32}$/i;
const PAYMENT_TOKEN_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function pinAttemptKey ( userId: string ): string {
  return `wallet-pin:${ userId }`;
}

export type IdempotencyKeyResult =
  | { ok: true; key: string | null }
  | { ok: false; response: Response };

/**
 * Reads the client's idempotency key for a money-out request.
 *
 * The key travels in the JSON body (not a header) so it needs no CORS allow-list
 * change. A missing key is tolerated until WALLET_REQUIRE_IDEMPOTENCY_KEY=true is
 * set, which lets older clients keep working while the rollout completes; a
 * malformed key is always rejected.
 */
export function parseWalletIdempotencyKey ( raw: unknown, required = false ): IdempotencyKeyResult {
  if ( raw === undefined || raw === null || raw === '' ) {
    return required
      ? { ok: false, response: json( { error: 'An idempotency key is required for this request.', code: 'IDEMPOTENCY_KEY_REQUIRED' }, 400 ) }
      : { ok: true, key: null };
  }
  const key = typeof raw === 'string' ? raw.trim() : '';
  if ( !IDEMPOTENCY_KEY_PATTERN.test( key ) ) {
    return { ok: false, response: json( { error: 'The idempotency key is malformed.', code: 'IDEMPOTENCY_KEY_INVALID' }, 400 ) };
  }
  return { ok: true, key };
}

/**
 * Legacy PINs were stored as a single unsalted SHA-256. verifyWalletPinHash still
 * accepts them, so once a correct PIN has been presented, re-hash it with PBKDF2.
 * Best effort: an upgrade failure must never fail the operation that triggered it.
 */
async function upgradeLegacyPinHash (
  admin: Parameters<typeof consumeRateLimit>[ 0 ],
  userId: string,
  storedHash: string | null | undefined,
  pin: string,
): Promise<void> {
  if ( !storedHash || String( storedHash ).startsWith( 'pbkdf2_sha256$' ) ) {return;}
  try {
    await admin
      .from( 'wallets' )
      .update( { pin_hash: await hashWalletPin( pin ), updated_at: new Date().toISOString() } )
      .eq( 'user_id', userId );
  } catch ( error ) {
    console.warn( '[wallet] legacy PIN hash upgrade skipped', error instanceof Error ? error.message : String( error ) );
  }
}

function walletOperationFailed ( scope: string, error: unknown ): Response {
  // Log the detail server-side; never echo raw database/RPC text to the client.
  console.error( `[wallet] ${ scope } failed`, error instanceof Error ? error.message : String( error ) );
  return json( { error: 'Wallet operation failed. Please try again.' }, 500 );
}

/**
 * Server-side wallet PIN gate for money-out operations.
 *
 * A wallet with a PIN set must present it on every withdrawal/transfer; before
 * this, the PIN was only ever checked by a client-called /pin/verify endpoint,
 * so anyone holding a session could skip it by calling /withdraw directly.
 * Wrong attempts are counted in Postgres and lock the wallet for 15 minutes
 * after 5 failures (fail-closed if the limiter is unavailable).
 *
 * Returns null when the operation may proceed.
 */
export async function enforceWalletPin (
  admin: Parameters<typeof consumeRateLimit>[ 0 ],
  userId: string,
  wallet: { pin_hash?: string | null },
  rawPin: unknown,
  amountJod = 0,
): Promise<Response | null> {
  if ( !wallet.pin_hash ) {
    if ( amountJod > MAX_NO_PIN_MONEY_OUT_JOD ) {
      return json(
        {
          error: `Set a wallet PIN to move more than JOD ${ MAX_NO_PIN_MONEY_OUT_JOD } at a time.`,
          code: 'PIN_SETUP_REQUIRED',
        },
        403,
      );
    }
    return null;
  }

  const pin = typeof rawPin === 'string' ? rawPin.trim() : '';
  if ( !PIN_PATTERN.test( pin ) ) {
    return json( { error: 'Wallet PIN is required.', code: 'PIN_REQUIRED' }, 403 );
  }

  const limited = await consumeRateLimit(
    admin,
    pinAttemptKey( userId ),
    PIN_MAX_ATTEMPTS,
    { windowSeconds: PIN_LOCKOUT_SECONDS, failClosed: true },
  );
  if ( limited ) {return limited;}

  const verified = await verifyWalletPinHash( pin, wallet.pin_hash );
  if ( !verified ) {
    return json( { error: 'Incorrect wallet PIN.', code: 'PIN_INVALID' }, 403 );
  }

  await resetRateLimit( admin, pinAttemptKey( userId ) );
  await upgradeLegacyPinHash( admin, userId, wallet.pin_hash, pin );
  return null;
}

export async function handleWalletWithdraw ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}
  // Do not debit the wallet until a real payout provider is configured and the
  // provider's result can be reconciled. The previous path only wrote a ledger
  // debit, then presented it to the client as a completed withdrawal.
  return json(
    { error: 'Withdrawals are temporarily unavailable until a payout provider is configured.', code: 'PAYOUT_UNAVAILABLE' },
    503,
  );
}

export async function handleWalletSend ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const amountJod = toMoneyNumber( body.amount );
  const recipientId = String( body.recipientId ?? '' ).trim();
  const note = String( body.note ?? '' ).trim().slice( 0, 200 );
  if ( amountJod <= 0 ) {return json( { error: 'Amount must be greater than zero.' }, 400 );}
  if ( amountJod > MAX_WALLET_SEND_JOD ) {
    return json( { error: `Transfers are limited to JOD ${ MAX_WALLET_SEND_JOD } per request.` }, 400 );
  }
  const idempotency = parseWalletIdempotencyKey(
    body.idempotencyKey,
    Deno.env.get( 'WALLET_REQUIRE_IDEMPOTENCY_KEY' ) === 'true',
  );
  if ( !idempotency.ok ) {return idempotency.response;}

  const throttled = await consumeRateLimit( auth.admin, `wallet-send:${ auth.canonicalUser.id }`, 20, { windowSeconds: 3600, failClosed: true } );
  if ( throttled ) {return throttled;}

  try {
    const senderWallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    const pinDenied = await enforceWalletPin( auth.admin, auth.canonicalUser.id, senderWallet, body.pin, amountJod );
    if ( pinDenied ) {return pinDenied;}

    const recipientUserId = await resolveWalletRecipient( auth.admin, recipientId );
    if ( !recipientUserId ) {return json( { error: 'Recipient wallet was not found.' }, 404 );}
    if ( recipientUserId === auth.canonicalUser.id ) {
      return json( { error: 'Cannot send wallet funds to the same account.' }, 400 );
    }

    let replayed = false;
    if ( idempotency.key ) {
      // Claim and transfer commit together in one database transaction, so a retried
      // request either replays the first outcome or is rejected; it can never move
      // the money twice.
      const { data, error } = await auth.admin.rpc( 'app_transfer_wallet_funds_idempotent', {
        p_from_user_id: auth.canonicalUser.id,
        p_to_user_id: recipientUserId,
        p_amount: amountJod,
        p_payment_method: 'wallet_balance',
        p_idempotency_key: idempotency.key,
        p_fingerprint: `${ recipientUserId }|${ amountJod.toFixed( 3 ) }`,
      } );
      if ( error ) {
        if ( String( error.message ?? '' ).toLowerCase().includes( 'reused with a different request' ) ) {
          return json( { error: 'This idempotency key was already used for a different transfer.', code: 'IDEMPOTENCY_KEY_REUSED' }, 422 );
        }
        throw new Error( error.message );
      }
      const row = Array.isArray( data ) ? data[ 0 ] : data;
      replayed = Boolean( row?.replayed );
    } else {
      const { error } = await auth.admin.rpc( 'app_transfer_wallet_funds', {
        p_from_user_id: auth.canonicalUser.id,
        p_to_user_id: recipientUserId,
        p_amount: amountJod,
        p_payment_method: 'wallet_balance',
      } );
      if ( error ) {throw new Error( error.message );}
    }

    return json( { success: true, replayed, note, wallet: await loadWalletPayload( auth.admin, auth.canonicalUser.id ) } );
  } catch ( error ) {
    return walletOperationFailed( 'send', error );
  }
}

export async function handleSetWalletPin ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const pin = String( body.pin ?? '' ).trim();
  if ( !PIN_PATTERN.test( pin ) ) {return json( { error: 'Wallet PIN must be four or six digits.' }, 400 );}

  try {
    // Replacing an existing PIN must prove knowledge of the current one (same
    // lockout bucket as withdraw/send). Without this, anyone holding a stolen
    // session could set their own PIN and then pass the PIN gate on withdrawals.
    const existingWallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    const pinDenied = await enforceWalletPin( auth.admin, auth.canonicalUser.id, existingWallet, body.currentPin );
    if ( pinDenied ) {return pinDenied;}
    const pinHash = await hashWalletPin( pin );
    const { error } = await auth.admin
      .from( 'wallets' )
      .update( { pin_hash: pinHash, updated_at: new Date().toISOString() } )
      .eq( 'user_id', auth.canonicalUser.id );
    if ( error ) {throw new Error( error.message );}
    return json( { success: true, wallet: await loadWalletPayload( auth.admin, auth.canonicalUser.id ) } );
  } catch ( error ) {
    return walletOperationFailed( 'set-pin', error );
  }
}

export async function handleVerifyWalletPin ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const pin = String( body.pin ?? '' ).trim();
  try {
    const wallet = await ensureWalletForUser( auth.admin, auth.canonicalUser.id );
    if ( !wallet.pin_hash ) {return json( { verified: false } );}

    // Same lockout bucket as withdraw/send, so /pin/verify cannot be used as an
    // unthrottled oracle to brute-force the 4-digit space.
    const limited = await consumeRateLimit(
      auth.admin,
      pinAttemptKey( auth.canonicalUser.id ),
      PIN_MAX_ATTEMPTS,
      { windowSeconds: PIN_LOCKOUT_SECONDS, failClosed: true },
    );
    if ( limited ) {return limited;}

    const verified = await verifyWalletPinHash( pin, wallet.pin_hash );
    if ( verified ) {
      await resetRateLimit( auth.admin, pinAttemptKey( auth.canonicalUser.id ) );
      await upgradeLegacyPinHash( auth.admin, auth.canonicalUser.id, wallet.pin_hash, pin );
    }
    return json( { verified } );
  } catch ( error ) {
    return walletOperationFailed( 'verify-pin', error );
  }
}

export async function handleSetWalletAutoTopUp ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const amount = toMoneyNumber( body.amount );
  const threshold = toMoneyNumber( body.threshold );
  try {
    const { error } = await auth.admin
      .from( 'wallets' )
      .update( {
        auto_top_up_enabled: Boolean( body.enabled ),
        auto_top_up_amount: amount > 0 ? Math.min( amount, MAX_WALLET_TOPUP_JOD ) : 20,
        auto_top_up_threshold: threshold >= 0 ? Math.min( threshold, MAX_WALLET_AUTO_TOPUP_THRESHOLD_JOD ) : 5,
        updated_at: new Date().toISOString(),
      } )
      .eq( 'user_id', auth.canonicalUser.id );
    if ( error ) {throw new Error( error.message );}
    return json( await loadWalletPayload( auth.admin, auth.canonicalUser.id ) );
  } catch ( error ) {
    return walletOperationFailed( 'auto-topup', error );
  }
}

export async function handleGetWalletPaymentMethods ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  try {
    const details = await loadWalletDetails( auth.admin, auth.canonicalUser.id );
    return json( { methods: details.paymentMethods } );
  } catch ( error ) {
    return walletOperationFailed( 'get-payment-methods', error );
  }
}

export async function handleAddWalletPaymentMethod ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const provider = String( body.provider ?? 'manual' ).trim() || 'manual';
  const tokenReference = String( body.token_reference ?? body.last4 ?? `pm-${ crypto.randomUUID() }` ).trim();
  // Client-supplied strings are stored verbatim, so constrain their shape.
  if ( !PAYMENT_PROVIDER_PATTERN.test( provider ) ) {
    return json( { error: 'Payment provider is invalid.' }, 400 );
  }
  if ( !PAYMENT_TOKEN_PATTERN.test( tokenReference ) ) {
    return json( { error: 'Payment method reference is invalid.' }, 400 );
  }
  try {
    const { data, error } = await auth.admin
      .from( 'payment_methods' )
      .insert( {
        user_id: auth.canonicalUser.id,
        provider,
        method_type: normalizeWalletPaymentMethod( body.type ?? body.method_type ),
        token_reference: tokenReference,
        is_default: Boolean( body.is_default ),
        status: 'active',
      } )
      .select( '*' )
      .single();
    if ( error ) {throw new Error( error.message );}
    return json( data, 201 );
  } catch ( error ) {
    return walletOperationFailed( 'add-payment-method', error );
  }
}

export async function handleDeleteWalletPaymentMethod ( request: Request, requestedUserId: string, methodId: string | null ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}
  if ( !methodId ) {return json( { error: 'Payment method id is required.' }, 400 );}

  try {
    const { error } = await auth.admin
      .from( 'payment_methods' )
      .delete()
      .eq( 'payment_method_id', methodId )
      .eq( 'user_id', auth.canonicalUser.id );
    if ( error ) {throw new Error( error.message );}
    return json( { success: true } );
  } catch ( error ) {
    return walletOperationFailed( 'delete-payment-method', error );
  }
}

export async function handleSetDefaultPaymentMethod ( request: Request, requestedUserId: string, methodId: string | null ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}
  if ( !methodId ) {return json( { error: 'Payment method id is required.' }, 400 );}

  try {
    // Confirm the target exists *before* clearing the current default; a bad id used to
    // leave the user with no default payment method at all.
    const { data: target, error: targetError } = await auth.admin
      .from( 'payment_methods' )
      .select( 'payment_method_id' )
      .eq( 'user_id', auth.canonicalUser.id )
      .eq( 'payment_method_id', methodId )
      .maybeSingle();
    if ( targetError ) {throw new Error( targetError.message );}
    if ( !target ) {return json( { error: 'Payment method not found' }, 404 );}

    const { error: clearError } = await auth.admin
      .from( 'payment_methods' )
      .update( { is_default: false, updated_at: new Date().toISOString() } )
      .eq( 'user_id', auth.canonicalUser.id )
      .eq( 'is_default', true );

    if ( clearError ) {throw new Error( clearError.message );}

    const { data, error } = await auth.admin
      .from( 'payment_methods' )
      .update( { is_default: true, updated_at: new Date().toISOString() } )
      .eq( 'user_id', auth.canonicalUser.id )
      .eq( 'payment_method_id', methodId )
      .select( '*' )
      .maybeSingle();

    if ( error ) {return walletOperationFailed( 'set-default-payment-method', error );}
    if ( !data ) {return json( { error: 'Payment method not found' }, 404 );}

    // Was `normalizeWalletPaymentMethod( data )`, which stringifies the row to
    // "[object Object]" and always answered with the literal 'card_payment'.
    return json( { success: true, method: data } );
  } catch ( error ) {
    return walletOperationFailed( 'set-default-payment-method', error );
  }
}

export async function handleGetWalletTrustScore ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  try {
    const [ { data: wallet }, { data: driver }, { error: userError } ] = await Promise.all( [
      auth.admin.from( 'wallets' ).select( 'balance' ).eq( 'user_id', auth.canonicalUser.id ).maybeSingle(),
      auth.admin.from( 'drivers' ).select( 'driver_id' ).eq( 'user_id', auth.canonicalUser.id ).maybeSingle(),
      auth.admin.from( 'users' ).select( 'verification_level' ).eq( 'id', auth.canonicalUser.id ).maybeSingle(),
    ] );
    if ( userError ) {throw new Error( userError.message );}
    let tripCount = 0;
    if ( driver?.driver_id ) {
      const { count } = await auth.admin
        .from( 'trips' )
        .select( 'trip_id', { count: 'exact', head: true } )
        .eq( 'driver_id', driver.driver_id );
      tripCount = toNumber( count, 0 );
    }
    // cashRating and onTimePayments are not tracked anywhere yet. Report them as null
    // (unknown) instead of inventing numbers that users would read as a real trust signal.
    return json( {
      totalTrips: tripCount,
      cashRating: null,
      onTimePayments: null,
      deposit: toNumber( wallet?.balance, 0 ),
    } );
  } catch ( error ) {
    return walletOperationFailed( 'trust-score', error );
  }
}

export async function handleGetWalletRewards ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}
  return json( { rewards: [] } );
}

export async function handleClaimWalletReward ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}
  const body = await request.json().catch( () => ( {} ) );
  const rewardId = String( body.rewardId ?? '' ).trim();
  if ( !rewardId ) {return json( { error: 'Reward id is required.' }, 400 );}
  return json( { error: 'Reward is not available.' }, 404 );
}

export async function handleGetWalletSubscription ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return json( { error: 'Wallet route is not authorized for this user.' }, 403 );
  }

  try {
    const subscription = await getWalletSubscription( auth.admin, auth.canonicalUser.id );
    return json( { subscription } );
  } catch ( error ) {
    return walletOperationFailed( 'get-subscription', error );
  }
}

// eslint-disable-next-line complexity
export async function handleWalletTopUp ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return json( { error: 'Wallet route is not authorized for this user.' }, 403 );
  }

  const body = await request.json().catch( () => ( {} ) );
  // Card and CliQ settle in whole 0.01 JOD steps (Stripe rejects JOD amounts that are not a
  // multiple of 10 fils). Quantising here keeps the amount credited to the wallet identical to
  // the amount actually charged; before, 5.124 was charged as 5.120 but credited as 5.124.
  const amountJod = Math.round( toMoneyNumber( body.amount ) * 100 ) / 100;
  const paymentMethod = String( body.paymentMethod ?? 'card' ).trim() || 'card';

  if ( amountJod <= 0 ) {
    return json( { error: 'Amount must be greater than zero.' }, 400 );
  }
  if ( amountJod > MAX_WALLET_TOPUP_JOD ) {
    return json( { error: `Top-ups are limited to JOD ${ MAX_WALLET_TOPUP_JOD } per request.` }, 400 );
  }

  // Each call creates a pending transaction row and a provider checkout session.
  const throttled = await consumeRateLimit( auth.admin, `wallet-topup:${ auth.canonicalUser.id }`, 10, { windowSeconds: 3600, failClosed: true } );
  if ( throttled ) {return throttled;}

  const { data: wallet, error: walletError } = await auth.admin
    .from( 'wallets' )
    .select( 'wallet_id, user_id, currency_code' )
    .eq( 'user_id', auth.canonicalUser.id )
    .maybeSingle();

  if ( walletError ) {
    console.error( '[wallet] top-up wallet lookup failed', walletError.message );
    return json( { error: 'Wallet lookup failed. Please try again.' }, 500 );
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
    } ).catch( async ( error: unknown ) => {
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
    // Log the provider detail server-side; never echo raw Stripe text to the client.
    console.error( '[wallet] stripe checkout creation failed', message );
    return json( { error: 'Could not start checkout. Please try again.' }, 502 );
  }
}

export async function handleWalletSubscribe ( request: Request, requestedUserId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}
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
    console.error( '[wallet] subscribe failed', error instanceof Error ? error.message : String( error ) );
    return json( { error: 'Could not start subscription checkout. Please try again.' }, 502 );
  }
}

// Package and bus records carry a single `status`; none of these may be settled again.
const NON_PAYABLE_STATUSES = new Set( [ 'paid', 'completed', 'settled', 'cancelled', 'canceled', 'rejected', 'refunded' ] );

type PayableAmount =
  | { amountJod: number; metadata: Record<string, unknown> }
  | { error: Response };

/**
 * Derive the authoritative amount for a wallet payment from the referenced
 * record, and confirm the caller actually owns it.
 *
 * The browser computes fares (see `getMovementPriceQuote` in FindRidePage and
 * `usePayment`), so accepting `amount` from the request body would let any
 * caller settle a booking for an arbitrary sum. The amount is therefore always
 * read back from the server-side record and the owner is checked before money
 * moves.
 */
// eslint-disable-next-line complexity
export async function resolvePayableAmount (
  admin: ReturnType<typeof getAdminClient>,
  referenceType: string,
  referenceId: string,
  callerUserId: string,
): Promise<PayableAmount> {
  if ( referenceType === 'ride_booking' ) {
    const { data, error } = await admin
      .from( 'bookings' )
      .select( 'booking_id, trip_id, amount, price_per_seat, seats_requested, passenger_id, booking_status, payment_status' )
      .eq( 'booking_id', referenceId )
      .maybeSingle();

    if ( error ) {return { error: walletOperationFailed( 'pay', error ) };}
    if ( !data ) {return { error: json( { error: 'Booking not found.' }, 404 ) };}
    if ( !isOwnedByCaller( data, callerUserId ) ) {
      return { error: json( { error: 'This booking does not belong to you.' }, 403 ) };
    }
    // `payment_status` was selected but never consulted, so a double-tap (or a replayed
    // request) could settle the same booking twice, and a cancelled booking could be paid.
    if ( [ 'cancelled', 'canceled', 'rejected' ].includes( String( data.booking_status ?? '' ).toLowerCase() ) ) {
      return { error: json( { error: 'This booking is cancelled and cannot be paid.' }, 409 ) };
    }
    if ( [ 'paid', 'completed', 'settled' ].includes( String( data.payment_status ?? '' ).toLowerCase() ) ) {
      return { error: json( { error: 'This booking has already been paid.' }, 409 ) };
    }

    // Prefer the recomputed fare so a tampered stored total cannot be settled.
    const perSeat = toMoneyNumber( data.price_per_seat );
    const seats = toNumber( data.seats_requested, 1 );
    const computed = perSeat > 0 && seats > 0 ? toMoneyNumber( perSeat * seats ) : 0;
    const amountJod = computed > 0 ? computed : toMoneyNumber( data.amount );

    if ( amountJod <= 0 ) {
      return { error: json( { error: 'This booking has no payable amount.' }, 409 ) };
    }

    return {
      amountJod,
      metadata: { trip_id: data.trip_id ?? null, booking_id: data.booking_id },
    };
  }

  if ( referenceType === 'package_delivery' ) {
    const { data, error } = await admin
      .from( 'packages' )
      .select( '*' )
      .eq( 'id', referenceId )
      .maybeSingle();

    if ( error ) {return { error: walletOperationFailed( 'pay', error ) };}
    if ( !data ) {return { error: json( { error: 'Package not found.' }, 404 ) };}
    if ( data.sender_id !== callerUserId ) {
      return { error: json( { error: 'This package does not belong to you.' }, 403 ) };
    }
    const packageStatuses = [ data.status, data.package_status ]
      .map( status => String( status ?? '' ).toLowerCase() );
    if ( packageStatuses.some( status =>
      NON_PAYABLE_STATUSES.has( status ) || [ 'in_transit', 'delivered', 'disputed' ].includes( status ),
    ) ) {
      return { error: json( { error: 'This package is not payable (already paid or cancelled).' }, 409 ) };
    }

    const amountJod = toMoneyNumber( data.fee_amount ?? data.delivery_fee );
    if ( amountJod <= 0 ) {
      return { error: json( { error: 'This package has no payable amount.' }, 409 ) };
    }

    return { amountJod, metadata: { package_id: data.id } };
  }

  if ( referenceType === 'bus_booking' ) {
    const { data, error } = await admin
      .from( 'bus_bookings' )
      .select( 'id, total_price, user_id, status' )
      .eq( 'id', referenceId )
      .maybeSingle();

    if ( error ) {return { error: walletOperationFailed( 'pay', error ) };}
    if ( !data ) {return { error: json( { error: 'Bus booking not found.' }, 404 ) };}
    if ( data.user_id !== callerUserId ) {
      return { error: json( { error: 'This booking does not belong to you.' }, 403 ) };
    }
    if ( NON_PAYABLE_STATUSES.has( String( data.status ?? '' ).toLowerCase() ) ) {
      return { error: json( { error: 'This booking is not payable (already paid or cancelled).' }, 409 ) };
    }

    const amountJod = toMoneyNumber( data.total_price );
    if ( amountJod <= 0 ) {
      return { error: json( { error: 'This booking has no payable amount.' }, 409 ) };
    }

    return { amountJod, metadata: { bus_booking_id: data.id } };
  }

  // Subscriptions and one-off purchases are priced by the server from the
  // configured plan, so there is no client-referenced record to re-derive.
  if ( referenceType === 'subscription' ) {
    return { error: json( { error: 'Subscriptions are billed by the payment provider, not the wallet.' }, 400 ) };
  }

  return { error: json( { error: 'Invalid reference type.' }, 400 ) };
}

/** Booking ownership spans several schema generations, so check every owner column. */
function isOwnedByCaller ( row: Record<string, unknown>, callerUserId: string ): boolean {
  const ownerColumns = [ 'passenger_id', 'rider_id', 'sender_id' ];
  return ownerColumns.some( column => row[ column ] === callerUserId );
}

export async function handleWalletPay ( request: Request, requestedUserId: string ) {
  const auth = await authenticateWalletRequest( request, requestedUserId );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const referenceType = String( body.referenceType ?? body.reference_type ?? 'ride_booking' ).trim();
  const referenceId = String( body.referenceId ?? body.reference_id ?? '' ).trim();

  if ( !referenceId ) {
    return json( { error: 'A reference id is required.' }, 400 );
  }

  const allowedReferenceTypes = [ 'ride_booking', 'package_delivery', 'bus_booking', 'subscription', 'purchase' ];
  if ( !allowedReferenceTypes.includes( referenceType ) ) {
    return json( { error: `Invalid reference type. Must be one of: ${ allowedReferenceTypes.join( ', ' ) }` }, 400 );
  }

  try {
    // The fare is always re-derived from the referenced record. A client-supplied
    // amount is never trusted: the browser computes the quote, so accepting it
    // would let a caller settle any booking for an arbitrary sum.
    const authoritativeAmountJod = await resolvePayableAmount( auth.admin, referenceType, referenceId, auth.canonicalUser.id );
    if ( 'error' in authoritativeAmountJod ) {return authoritativeAmountJod.error;}

    const { amountJod, metadata } = authoritativeAmountJod;
    if ( amountJod <= 0 ) {
      return json( { error: 'Amount must be greater than zero.' }, 400 );
    }

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
      p_reference_id: referenceId,
      p_metadata: metadata,
    } );

    if ( error ) {
      return walletOperationFailed( 'pay', error );
    }

    const updatedWallet = await loadWalletPayload( auth.admin, auth.canonicalUser.id );
    return json( { success: true, wallet: updatedWallet, transactionType, referenceId } );
  } catch ( error ) {
    return walletOperationFailed( 'pay', error );
  }
}

/* eslint-disable complexity */
// Each branch delegates to a handler that returns its own promise, so the
// dispatcher stays synchronous on paper while callers keep awaiting it.
// deno-lint-ignore require-await
export async function handleWalletDispatch ( request: Request, path: string ): Promise<Response | undefined> {
  const walletRoute = parseWalletRoute( path );
  if ( !walletRoute ) {return undefined;}

  const method = request.method;
  const { userId, action, resourceId } = walletRoute;

  if ( method === 'GET' && action === '' ) {return handleGetWallet( request, userId );}
  if ( method === 'GET' && action === 'transactions' ) {return handleGetWalletTransactions( request, userId );}
  if ( method === 'GET' && action === 'insights' ) {return handleGetWalletInsights( request, userId );}
  if ( method === 'POST' && action === 'withdraw' ) {return handleWalletWithdraw( request, userId );}
  if ( method === 'POST' && action === 'send' ) {return handleWalletSend( request, userId );}
  if ( method === 'POST' && action === 'pin' && resourceId === 'set' ) {return handleSetWalletPin( request, userId );}
  if ( method === 'POST' && action === 'pin' && resourceId === 'verify' ) {return handleVerifyWalletPin( request, userId );}
  if ( method === 'POST' && action === 'auto-topup' ) {return handleSetWalletAutoTopUp( request, userId );}
  if ( method === 'GET' && action === 'payment-methods' ) {return handleGetWalletPaymentMethods( request, userId );}
  if ( method === 'POST' && action === 'payment-methods' ) {return handleAddWalletPaymentMethod( request, userId );}
   if ( method === 'DELETE' && action === 'payment-methods' ) {return handleDeleteWalletPaymentMethod( request, userId, resourceId );}
   if ( method === 'PATCH' && action === 'payment-methods' && resourceId ) {return handleSetDefaultPaymentMethod( request, userId, resourceId );}
  if ( method === 'GET' && action === 'trust-score' ) {return handleGetWalletTrustScore( request, userId );}
  if ( method === 'GET' && action === 'rewards' ) {return handleGetWalletRewards( request, userId );}
  if ( method === 'POST' && action === 'rewards' && resourceId === 'claim' ) {return handleClaimWalletReward( request, userId );}
  if ( method === 'GET' && action === 'subscription' ) {return handleGetWalletSubscription( request, userId );}
  if ( method === 'POST' && action === 'top-up' ) {return handleWalletTopUp( request, userId );}
  if ( method === 'POST' && action === 'subscribe' ) {return handleWalletSubscribe( request, userId );}
  if ( method === 'POST' && action === 'pay' ) {return handleWalletPay( request, userId );}
  return undefined;
}
/* eslint-enable complexity */
