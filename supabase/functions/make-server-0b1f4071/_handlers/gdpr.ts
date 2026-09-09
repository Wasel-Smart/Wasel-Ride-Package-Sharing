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
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const body = await request.json();
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );

  const { error } = await auth.admin.from( 'user_consents' ).insert( {
    user_id: userId,
    consent_type: String( body.consentType ?? '' ),
    granted: Boolean( body.granted ),
    ip_address: typeof body.ipAddress === 'string' ? body.ipAddress : null,
    user_agent: typeof body.userAgent === 'string' ? body.userAgent : request.headers.get( 'user-agent' ),
    created_at: new Date( Number( body.timestamp ?? Date.now() ) ).toISOString(),
  } );

  if ( error ) return json( { error: error.message }, 500 );
  return json( { ok: true }, 201 );
}

async function handleGetConsent ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const url = new URL( request.url );
  const userId = url.searchParams.get( 'userId' ) ?? auth.canonicalUser.id;
  if ( userId !== auth.canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );

  const consentType = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  const { data, error } = await auth.admin
    .from( 'user_consents' )
    .select( 'granted' )
    .eq( 'user_id', userId )
    .eq( 'consent_type', consentType )
    .order( 'created_at', { ascending: false } )
    .limit( 1 )
    .maybeSingle();

  if ( error ) return json( { error: error.message }, 500 );
  return json( { granted: Boolean( data?.granted ) } );
}

async function handleRequestDataExport ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const body = await request.json();
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );

  const requestedAt = Date.now();
  const [ profile, bookings, packages, transactions, consents ] = await Promise.all( [
    auth.admin.from( 'users' ).select( '*' ).eq( 'id', userId ).maybeSingle(),
    auth.admin.from( 'ride_bookings' ).select( '*' ).eq( 'passenger_id', userId ),
    auth.admin.from( 'packages' ).select( '*' ).eq( 'sender_id', userId ),
    auth.admin.from( 'wallet_transactions' ).select( '*' ).eq( 'user_id', userId ),
    auth.admin.from( 'user_consents' ).select( '*' ).eq( 'user_id', userId ),
  ] );

  const firstError = [ profile, bookings, packages, transactions, consents ].find( ( result ) => result.error )?.error;
  if ( firstError ) return json( { error: firstError.message }, 500 );

  const exportData = {
    exportDate: new Date( requestedAt ).toISOString(),
    userId,
    profile: profile.data,
    bookings: bookings.data,
    packages: packages.data,
    transactions: transactions.data,
    consents: consents.data,
  };
  const exportJson = JSON.stringify( exportData );
  // Store the export payload in Supabase Storage and return a storage path.
  // The client must request a signed URL separately — never embed data: URIs in the DB.
  const storagePath = `exports/${ userId }/${ requestedAt }.json`;
  const admin = getAdminClient();
  await admin.storage
    .from( 'gdpr-exports' )
    .upload( storagePath, new Blob( [ exportJson ], { type: 'application/json' } ), {
      upsert: true,
      contentType: 'application/json',
    } );
  const downloadUrl = storagePath;

  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

  const { error } = await auth.admin.from( 'data_export_requests' ).insert( {
    user_id: userId,
    requested_at: new Date( requestedAt ).toISOString(),
    status: 'completed',
    download_url: downloadUrl,
    completed_at: new Date().toISOString(),
    expires_at: new Date( expiresAt ).toISOString(),
  } );

  if ( error ) return json( { error: error.message }, 500 );
  return json( { userId, requestedAt, completedAt: Date.now(), downloadUrl, expiresAt } );
}

async function handleRequestDeletion ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const body = await request.json();
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );

  const requestedAt = Date.now();
  const scheduledFor = requestedAt + 30 * 24 * 60 * 60 * 1000;
  const reason = typeof body.reason === 'string' ? body.reason : null;
  const { error } = await auth.admin.from( 'data_deletion_requests' ).insert( {
    user_id: userId,
    requested_at: new Date( requestedAt ).toISOString(),
    scheduled_for: new Date( scheduledFor ).toISOString(),
    reason,
    status: 'pending',
  } );

  if ( error ) return json( { error: error.message }, 500 );
  return json( { userId, requestedAt, scheduledFor, reason } );
}

async function handleCancelDeletion ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const body = await request.json();
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );

  const { error } = await auth.admin
    .from( 'data_deletion_requests' )
    .update( { status: 'cancelled' } )
    .eq( 'user_id', userId )
    .eq( 'status', 'pending' );

  if ( error ) return json( { error: error.message }, 500 );
  return json( { ok: true } );
}
