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

async function handleAdminListPendingDrivers ( request: Request ) {
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