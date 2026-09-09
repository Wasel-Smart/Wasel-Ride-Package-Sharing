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
  const accessError = ensureRuntimeAdminAccess( request );
  if ( accessError ) return accessError;

  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  if ( !hasPermission( role, 'users:impersonate' ) && !hasPermission( role, 'config:write' ) ) {
    return json( { error: 'Insufficient permissions' }, 403 );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from( 'drivers' )
    .select( 'driver_id, user_id, driver_status, verification_level, sanad_identity_linked, background_check_status, created_at, updated_at' )
    .eq( 'driver_status', 'pending_approval' )
    .order( 'created_at', { ascending: false } );

  if ( error ) return json( { error: error.message }, 500 );
  return json( { drivers: data ?? [] } );
}

async function handleAdminApproveDriver ( request: Request, driverId: string ) {
  const accessError = ensureRuntimeAdminAccess( request );
  if ( accessError ) return accessError;

  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  if ( !hasPermission( role, 'users:impersonate' ) && !hasPermission( role, 'config:write' ) ) {
    return json( { error: 'Insufficient permissions' }, 403 );
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from( 'drivers' )
    .update( { driver_status: 'approved', updated_at: new Date().toISOString() } )
    .eq( 'driver_id', driverId )
    .select( '*' )
    .single();

  if ( error ) return json( { error: error.message }, 500 );
  return json( { driver: data } );
}
