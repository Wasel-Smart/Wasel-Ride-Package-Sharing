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
  try {
    const admin = getAdminClient();
    await ensureMobilitySeed( admin );
    const { data, error } = await admin
      .from( 'mobility_corridors' )
      .select( 'id, origin_city, destination_city, base_price_seat, demand_index, seats_total, seats_booked, updated_at' )
      .order( 'demand_index', { ascending: false } )
      .limit( 12 );
    if ( error ) return json( { error: error.message }, 500 );

    const corridors = ( Array.isArray( data ) ? data : [] ).map( ( row: Record<string, unknown> ) => ( {
      id: String( row.id ?? '' ),
      from: String( row.origin_city ?? '' ),
      to: String( row.destination_city ?? '' ),
      priceJod: Number( row.base_price_seat ?? 0 ),
      demand: Number( row.demand_index ?? 0 ),
      seatsTotal: Number( row.seats_total ?? 0 ),
      seatsBooked: Number( row.seats_booked ?? 0 ),
      updatedAt: String( row.updated_at ?? new Date().toISOString() ),
    } ) );

    return json( { corridors, generatedAt: new Date().toISOString() } );
  } catch ( err ) {
    return json( { error: err instanceof Error ? err.message : 'Snapshot failed' }, 500 );
  }
}

async function handleMobilityOSRequest ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  await ensureMobilitySeed( auth.admin );

  if ( request.method === 'GET' && path === '/mobility-os/snapshot' ) {
    const { data, error } = await auth.admin.from( 'mobility_corridors' ).select( '*' ).order( 'demand_index', { ascending: false } );
    if ( error ) return json( { error: error.message }, 500 );
    return json( buildMobilitySnapshot( ( Array.isArray( data ) ? data : [] ) as MobilityCorridorRow[] ) );
  }

  if ( request.method === 'POST' && path === '/mobility-os/booking/create' ) {
    const body = await request.json().catch( () => ( {} ) );
    const corridorId = String( body.corridor_id ?? '' );
    const type: MobilityBookingType = body.type === 'cargo' ? 'cargo' : 'seat';
    const quantity = Math.max( 0, toNumber( body.quantity, 0 ) );
    if ( !corridorId || quantity <= 0 ) return json( { error: 'Invalid booking request.' }, 400 );

    const { data: corridor, error } = await auth.admin
      .from( 'mobility_corridors' )
      .select( '*' )
      .eq( 'id', corridorId )
      .single();
    if ( error ) return json( { error: error.message }, 500 );

    const snapshot = buildMobilitySnapshot( [ corridor as MobilityCorridorRow ] );
    const projection = snapshot.corridors[ 0 ];
    const remaining = type === 'seat' ? projection?.seats_available : projection?.cargo_available_kg;
    if ( !projection || quantity > remaining ) return json( { error: 'Not enough corridor capacity remains.' }, 409 );

    const timestamp = String( body.timestamp ?? new Date().toISOString() );
    const traceId = `trace-${ crypto.randomUUID() }`;
    const nextCorridor = advanceCorridorAfterBooking( {
      corridor: corridor as MobilityCorridorRow,
      type,
      quantity,
      timestamp,
    } );
    const unitPrice = type === 'seat' ? projection.dynamic_seat_price : projection.dynamic_cargo_price;
    const { data: booking, error: bookingError } = await auth.admin
      .from( 'mobility_bookings' )
      .insert( {
        corridor_id: corridorId,
        user_id: auth.canonicalUser.id,
        type,
        quantity,
        unit_price: unitPrice,
        total_price: Number( ( unitPrice * quantity ).toFixed( 2 ) ),
        booking_timestamp: timestamp,
        trace_id: traceId,
      } )
      .select( 'booking_id' )
      .single();
    if ( bookingError ) return json( { error: bookingError.message }, 500 );

    await auth.admin
      .from( 'mobility_corridors' )
      .update( {
        seats_booked: nextCorridor.seats_booked,
        cargo_booked_kg: nextCorridor.cargo_booked_kg,
        demand_index: nextCorridor.demand_index,
        demand_history: nextCorridor.demand_history,
        price_history: nextCorridor.price_history,
        updated_at: nextCorridor.updated_at,
      } )
      .eq( 'id', corridorId );

    try {
      await auth.admin.from( 'event_outbox' ).insert( {
        aggregate_type: 'mobility_corridor',
        aggregate_id: corridorId,
        event_type: 'BookingCreated',
        trace_id: traceId,
        payload: { booking_id: booking.booking_id, corridor_id: corridorId, type, quantity, timestamp },
      } );
    } catch {
      // Outbox write should not fail an already accepted booking.
    }

    return json( { booking_id: booking.booking_id, status: 'accepted', trace_id: traceId }, 201 );
  }

  return undefined;
}

async function handleGetMobilityLiveRows ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const [ { data: trips }, { data: bookings }, { data: packages }, { data: tripPresence } ] =
    await Promise.all( [
      auth.admin
        .from( 'trips' )
        .select(
          'trip_id, origin_city, destination_city, available_seats, total_seats, package_capacity, package_slots_remaining, departure_time, trip_status, allow_packages',
        )
        .is( 'deleted_at', null )
        .in( 'trip_status', [ 'open', 'booked', 'in_progress' ] ),
      auth.admin
        .from( 'bookings' )
        .select( 'trip_id, seats_requested, booking_status, status' )
        .in( 'booking_status', [ 'confirmed', 'pending_driver' ] )
        .order( 'created_at', { ascending: false } ),
      auth.admin
        .from( 'packages' )
        .select( 'trip_id, origin_name, origin_location, destination_name, destination_location, package_status, status' )
        .in( 'package_status', [ 'created', 'assigned', 'in_transit' ] ),
      auth.admin
        .from( 'trip_presence' )
        .select( 'trip_id, active_passengers, active_packages, last_location, last_heartbeat_at' ),
    ] );

  return json( {
    trips: trips ?? [],
    bookings: bookings ?? [],
    packages: packages ?? [],
    tripPresence: tripPresence ?? [],
  } );
}
