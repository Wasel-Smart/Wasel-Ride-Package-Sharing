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
  if ( 'error' in auth ) return auth.error;

  if ( request.method === 'POST' && path === '/packages' ) {
    const body = await request.json().catch( () => ( {} ) );
    const trackingNumber = `WSL-PKG-${ crypto.randomUUID().split( '-' )[ 0 ].slice( 0, 8 ).toUpperCase() }`;
    const { data, error } = await auth.admin
      .from( 'packages' )
      .insert( {
        tracking_number: trackingNumber,
        qr_code: trackingNumber,
        sender_id: auth.canonicalUser.id,
        receiver_name: String( body.receiver_name ?? '' ),
        receiver_phone: String( body.receiver_phone ?? '' ),
        origin_name: String( body.origin_name ?? body.from ?? '' ),
        origin_location: body.origin_coords ? `SRID=4326;POINT(${ body.origin_coords.lng } ${ body.origin_coords.lat })` : null,
        destination_name: String( body.destination_name ?? body.to ?? '' ),
        destination_location: body.destination_coords ? `SRID=4326;POINT(${ body.destination_coords.lng } ${ body.destination_coords.lat })` : null,
        size: String( body.size ?? 'medium' ),
        weight_kg: toNumber( body.weight, 0 ),
        description: String( body.description ?? '' ),
        declared_value: toNumber( body.declared_value, 0 ),
        fragile: Boolean( body.fragile ),
        delivery_fee: calculateDirectPrice( 'package', toNumber( body.weight, 0 ), 0, toNumber( body.base_price, 5 ) ).breakdown.base,
        status: 'posted',
      } )
      .select( '*' )
      .single();
    if ( error ) return json( { error: error.message }, 500 );

    const packageId = String( data.package_id ?? data.id ?? '' );
    const { data: trip } = await auth.admin
      .from( 'trips' )
      .select( 'trip_id, driver_id, available_seats, package_slots_remaining, trip_status' )
      .eq( 'allow_packages', true )
      .eq( 'trip_status', 'open' )
      .gt( 'package_slots_remaining', 0 )
      .limit( 1 )
      .maybeSingle();

    if ( trip ) {
      await auth.admin
        .from( 'packages' )
        .update( {
          trip_id: trip.trip_id,
          carrier_id: trip.driver_id,
          status: 'assigned',
        } )
        .eq( 'package_id', packageId );

      await auth.admin
        .from( 'trips' )
        .update( {
          package_slots_remaining: Math.max( 0, toNumber( trip.package_slots_remaining, 0 ) - 1 ),
        } )
        .eq( 'trip_id', trip.trip_id );

      await auth.admin.from( 'package_events' ).insert( {
        package_id: packageId,
        event_type: 'assignment',
        event_status: 'assigned',
        notes: JSON.stringify( { trip_id: trip.trip_id, driver_id: trip.driver_id } ),
      } );
    }

    return json( { package: mapPackageRow( data ) } );
  }

  const packageRoute = parseEntityRoute( path, 'packages' );
  if ( request.method === 'GET' && packageRoute?.id ) {
    const { data, error } = await auth.admin
      .from( 'packages' )
      .select( '*' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( error ) return json( { error: error.message }, 500 );
    if ( !data ) return json( { error: 'Package not found' }, 404 );
    const isOwner = data.sender_id === auth.canonicalUser.id || data.carrier_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:read' );
    if ( !isOwner && !isStaff ) {
      return json( { error: 'Not authorized to view this package.' }, 403 );
    }
    return json( mapPackageRow( data ) );
  }

  if ( request.method === 'GET' && path.startsWith( '/packages/sender/' ) ) {
    const userId = path.split( '/packages/sender/' )[ 1 ]?.split( '/' )[ 0 ];
    if ( !userId ) return json( { error: 'User ID required' }, 400 );
    // IDOR guard: only the sender themselves (or admin) may list their packages.
    if ( !matchesAuthenticatedUser( auth, userId ) && !hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:assign' ) ) {
      return json( { error: 'Not authorized to view these packages.' }, 403 );
    }
    const { data, error } = await auth.admin
      .from( 'packages' )
      .select( '*' )
      .eq( 'sender_id', userId )
      .order( 'created_at', { ascending: false } );
    if ( error ) return json( { error: error.message }, 500 );
    return json( ( Array.isArray( data ) ? data : [] ).map( mapPackageRow ) );
  }

  if ( request.method === 'POST' && packageRoute?.id && packageRoute.action === 'deliver' ) {
    const { data: pkg, error: pkgErr } = await auth.admin
      .from( 'packages' )
      .select( 'package_id, sender_id, carrier_id' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( pkgErr ) return json( { error: pkgErr.message }, 500 );
    if ( !pkg ) return json( { error: 'Package not found' }, 404 );
    const isCarrier = pkg.carrier_id === auth.canonicalUser.id;
    const isSender = pkg.sender_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:write' );
    if ( !isCarrier && !isSender && !isStaff ) {
      return json( { error: 'Not authorized to deliver this package.' }, 403 );
    }
    const { data, error } = await auth.admin
      .from( 'packages' )
      .update( { status: 'delivered', delivered_at: new Date().toISOString() } )
      .eq( 'package_id', packageRoute.id )
      .select( '*' )
      .single();
    if ( error ) return json( { error: error.message }, 500 );
    return json( mapPackageRow( data ) );
  }

  return undefined;
}
