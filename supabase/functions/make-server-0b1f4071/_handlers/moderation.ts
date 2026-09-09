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

async function handleApplyModerationMigrations ( request: Request ) {
  const accessError = ensureRuntimeAdminAccess( request );
  if ( accessError ) return accessError;

  await executeSqlStatements( CONTENT_MODERATION_SQL );

  return json( {
    applied: [
      '20260503010000_content_moderation_runtime.sql',
    ],
  } );
}

async function handleSubmitReport ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const body = await request.json();
  const bookingId = String( body.bookingId ?? '' ).trim();
  const issueType = String( body.issueType ?? '' ).trim();
  const description = typeof body.description === 'string' ? body.description.trim() : '';

  if ( !issueType ) return json( { error: 'issueType is required' }, 400 );

  const { admin, canonicalUser } = auth;

  let bookingIdResolved: string | null = null;
  if ( bookingId ) {
    const { data: booking, error: bookingError } = await admin
      .from( 'bookings' )
      .select( 'id' )
      .eq( 'id', bookingId )
      .maybeSingle();
    if ( bookingError ) return json( { error: bookingError.message }, 500 );
    bookingIdResolved = booking?.id ?? null;
  }

  const { error: insertError } = await admin.from( 'reports' ).insert( {
    reporter_id: canonicalUser.id,
    booking_id: bookingIdResolved,
    issue_type: issueType,
    description: description || null,
    status: 'open',
  } );

  if ( insertError ) return json( { error: insertError.message }, 500 );

  return json( { ok: true }, 201 );
}