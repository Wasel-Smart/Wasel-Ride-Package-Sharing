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

async function handleBookingCollectionForTrip ( request: Request, tripId: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;
  const { data, error } = await auth.admin
    .from( 'bookings' )
    .select( '*' )
    .eq( 'trip_id', tripId )
    .order( 'created_at', { ascending: false } );
  if ( error ) return json( { error: error.message }, 500 );
  return json( ( Array.isArray( data ) ? data : [] ).map( mapBookingRow ) );
}

async function handleCancelTrip ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  const canCancelAny = hasPermission( role, 'rides:cancel_any' ) || hasPermission( role, 'packages:cancel_any' );

  const body = await request.json();
  const tripId = String( body.tripId ?? '' );
  const reason = String( body.reason ?? '' ).trim();
  if ( !tripId || !reason ) return json( { error: 'tripId and reason are required' }, 400 );

  const { admin, canonicalUser } = auth;
  const { data: trip, error: fetchError } = await admin
    .from( 'trips' )
    .select( 'id, driver_id, status' )
    .eq( 'id', tripId )
    .maybeSingle();

  if ( fetchError ) return json( { error: fetchError.message }, 500 );
  if ( !trip ) return json( { error: 'Trip not found' }, 404 );
  if ( !canCancelAny && trip.driver_id !== canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );
  if ( trip.status === 'cancelled' ) return json( { error: 'Trip already cancelled' }, 409 );
  if ( trip.status === 'completed' ) return json( { error: 'Cannot cancel completed trip' }, 409 );

  const { data: bookings, error: bookingsError } = await admin
    .from( 'bookings' )
    .select( 'id, user_id, payment_status' )
    .eq( 'trip_id', tripId )
    .in( 'status', [ 'pending', 'confirmed' ] );

  if ( bookingsError ) return json( { error: bookingsError.message }, 500 );

  const { error: tripUpdateError } = await admin
    .from( 'trips' )
    .update( { status: 'cancelled', cancelled_at: new Date().toISOString() } )
    .eq( 'id', tripId );

  if ( tripUpdateError ) return json( { error: tripUpdateError.message }, 500 );

  const activeBookings = bookings ?? [];
  if ( activeBookings.length > 0 ) {
    const bookingIds = activeBookings.map( ( booking: Record<string, unknown> ) => booking.id );
    const { error: bookingUpdateError } = await admin
      .from( 'bookings' )
      .update( {
        status: 'cancelled',
        cancelled_by: canonicalUser.id,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: `Trip cancelled by driver: ${ reason }`,
      } )
      .in( 'id', bookingIds );

    if ( bookingUpdateError ) return json( { error: bookingUpdateError.message }, 500 );

    await admin.from( 'notifications' ).insert(
      activeBookings.map( ( booking: Record<string, unknown> ) => ( {
        user_id: booking.user_id,
        type: 'trip_cancelled',
        title: 'Trip Cancelled',
        body: `Your trip has been cancelled by the driver. Reason: ${ reason }`,
        data: { bookingId: booking.id, tripId },
      } ) ),
    );
  }

  return json( {
    ok: true,
    refundRequired: activeBookings.some( ( booking: Record<string, unknown> ) => booking.payment_status === 'succeeded' ),
  } );
}

async function handleGetLiveTrip ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const { data: booking, error: bookingError } = await auth.admin
    .from( 'bookings' )
    .select( 'id, trip_id, seats_requested, total_price, amount, created_at, status, booking_status' )
    .eq( 'user_id', auth.canonicalUser.id )
    .in( 'status', [ 'confirmed', 'in_progress' ] )
    .order( 'created_at', { ascending: false } )
    .limit( 1 )
    .maybeSingle();

  if ( bookingError ) return json( { error: bookingError.message }, 500 );
  if ( !booking?.trip_id ) return json( { snapshot: null } );

  const [ { data: trip }, { data: presence } ] = await Promise.all( [
    auth.admin
      .from( 'trips' )
      .select( 'trip_id, id, driver_id, origin_city, destination_city, origin_name, destination_name, departure_time, price_per_seat, trip_status' )
      .or( `id.eq.${ booking.trip_id },trip_id.eq.${ booking.trip_id }` )
      .maybeSingle(),
    auth.admin
      .from( 'trip_presence' )
      .select( 'last_location, last_heartbeat_at' )
      .eq( 'trip_id', booking.trip_id )
      .maybeSingle(),
  ] );

  if ( !trip ) return json( { snapshot: null } );

  const { data: driver } = await auth.admin
    .from( 'users' )
    .select( 'id, full_name, phone_number, avatar_url' )
    .eq( 'id', trip.driver_id )
    .maybeSingle();

  const fromCoord = cityCoord( trip.origin_city ?? trip.origin_name );
  const toCoord = cityCoord( trip.destination_city ?? trip.destination_name );
  const driverPosition = presence?.last_location?.lat && ( presence.last_location.lng ?? presence.last_location.lon )
    ? {
      lat: Number( presence.last_location.lat ),
      lng: Number( presence.last_location.lng ?? presence.last_location.lon ),
    }
    : fromCoord;

  return json( {
    snapshot: {
      bookingId: booking.id,
      tripId: booking.trip_id,
      status: trip.trip_status === 'completed' ? 'completed' : 'en_route_to_pickup',
      from: String( trip.origin_name ?? trip.origin_city ?? 'Origin' ),
      fromCoord,
      to: String( trip.destination_name ?? trip.destination_city ?? 'Destination' ),
      toCoord,
      driver: {
        id: String( trip.driver_id ?? '' ),
        name: String( driver?.full_name ?? 'Driver' ),
        rating: 0,
        trips: 0,
        img: String( driver?.avatar_url ?? '' ),
        phone: String( driver?.phone_number ?? '' ),
        initials: String( driver?.full_name ?? 'D' ).slice( 0, 2 ).toUpperCase(),
      },
      vehicle: { model: 'Assigned vehicle', color: '', plate: '', year: new Date().getFullYear() },
      price: Number( booking.total_price ?? booking.amount ?? trip.price_per_seat ?? 0 ),
      startedAt: String( booking.created_at ?? new Date().toISOString() ),
      estimatedArrival: String( trip.departure_time ?? new Date().toISOString() ),
      totalDistanceKm: 0,
      passengers: Number( booking.seats_requested ?? 1 ),
      shareCode: String( booking.id ).slice( 0, 8 ).toUpperCase(),
      progress: 0,
      timeLeftMinutes: 0,
      driverPosition,
      waypoints: [
        { label: String( trip.origin_name ?? trip.origin_city ?? 'Origin' ), coord: fromCoord },
        { label: String( trip.destination_name ?? trip.destination_city ?? 'Destination' ), coord: toCoord },
      ],
      heartbeatAt: presence?.last_heartbeat_at ?? null,
      telemetryFresh: Boolean( presence?.last_heartbeat_at ),
    },
  } );
}
