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
