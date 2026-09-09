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

async function handleTripRequest ( request: Request, path: string ) {
  const admin = getAdminClient();
  const url = new URL( request.url );

  if ( request.method === 'GET' && path === '/trips/search' ) {
    let query = admin
      .from( 'trips' )
      .select( 'trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at' )
      .is( 'deleted_at', null );
    const from = url.searchParams.get( 'from' );
    const to = url.searchParams.get( 'to' );
    const date = url.searchParams.get( 'date' );
    const seats = url.searchParams.get( 'seats' );
    if ( from ) query = query.ilike( 'origin_city', `%${ from }%` );
    if ( to ) query = query.ilike( 'destination_city', `%${ to }%` );
    if ( date ) query = query.gte( 'departure_time', `${ date }T00:00:00` ).lt( 'departure_time', `${ date }T23:59:59.999` );
    if ( seats ) query = query.gte( 'available_seats', Number( seats ) );
    const { data, error } = await query.in( 'trip_status', [ 'open', 'booked', 'in_progress' ] ).order( 'departure_time' );
    if ( error ) return json( { error: error.message }, 500 );
    const rows = Array.isArray( data ) ? data : [];
    const profiles = await fetchDriverProfiles( admin, rows.map( ( row: Record<string, unknown> ) => String( row.driver_id ?? '' ) ) );
    return json( rows.map( ( row: Record<string, unknown> ) => mapTripRow( row, profiles[ String( row.driver_id ?? '' ) ] ) ) );
  }

  if ( request.method === 'POST' && path === '/trips/calculate-price' ) {
    const body = await request.json().catch( () => ( {} ) );
    const type = body.type === 'package' ? 'package' : 'passenger';
    return json( calculateDirectPrice( type, body.weight, body.distance_km, body.base_price ) );
  }

  const tripRoute = parseEntityRoute( path, 'trips' );
  if ( request.method === 'GET' && tripRoute?.action === 'bookings' ) {
    return handleBookingCollectionForTrip( request, tripRoute.id );
  }

  if ( request.method === 'GET' && tripRoute?.id === 'user' ) {
    const auth = await authenticateRequest( request );
    if ( 'error' in auth ) return auth.error;
    const requestedUserId = tripRoute.action ?? '';
    if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
      return json( { error: 'Trip route is not authorized for this user.' }, 403 );
    }
    const driver = await ensureDriverForUser( auth.admin, auth.canonicalUser );
    const { data, error } = await auth.admin
      .from( 'trips' )
      .select( 'trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at' )
      .eq( 'driver_id', driver.driver_id )
      .order( 'departure_time', { ascending: false } );
    if ( error ) return json( { error: error.message }, 500 );
    const profile = await buildProfilePayload( auth.admin, auth.canonicalUser );
    return json( ( Array.isArray( data ) ? data : [] ).map( ( row: Record<string, unknown> ) => mapTripRow( row, profile ) ) );
  }

  if ( request.method === 'GET' && tripRoute?.id ) {
    const { data, error } = await admin
      .from( 'trips' )
      .select( 'trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at' )
      .eq( 'trip_id', tripRoute.id )
      .maybeSingle();
    if ( error ) return json( { error: error.message }, 500 );
    if ( !data ) return json( { error: 'Trip not found' }, 404 );
    const profiles = await fetchDriverProfiles( admin, [ String( data.driver_id ?? '' ) ] );
    return json( mapTripRow( data, profiles[ String( data.driver_id ?? '' ) ] ) );
  }

  if ( request.method === 'POST' && path === '/trips' ) {
    const auth = await authenticateRequest( request );
    if ( 'error' in auth ) return auth.error;
    const body = await request.json().catch( () => ( {} ) );
    const driver = await ensureDriverForUser( auth.admin, auth.canonicalUser );
    if ( !isApprovedDriver( auth.canonicalUser, driver, Boolean( auth.authUser.email_confirmed_at ) ) ) {
      return json( { error: 'Driver approval is required before publishing rides' }, 403 );
    }
    const departureTime = new Date( `${ body.date }T${ body.time }:00` ).toISOString();
    const vehicleParts = String( body.carModel ?? '' ).trim().split( /\s+/ ).filter( Boolean );
    const [ vehicleMake = null, ...vehicleRest ] = vehicleParts;
    const { data, error } = await auth.admin
      .from( 'trips' )
      .insert( {
        driver_id: driver.driver_id,
        origin_city: body.from,
        destination_city: body.to,
        departure_time: departureTime,
        departure_date: body.date,
        available_seats: toNumber( body.seats, 1 ),
        price_per_seat: toNumber( body.price, 0 ),
        trip_status: 'open',
        allow_packages: Boolean( body.acceptsPackages ),
        package_capacity: body.packageCapacity === 'large' ? 3 : body.packageCapacity === 'medium' ? 2 : body.packageCapacity === 'small' ? 1 : 0,
        package_slots_remaining: body.packageCapacity === 'large' ? 3 : body.packageCapacity === 'medium' ? 2 : body.packageCapacity === 'small' ? 1 : 0,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleRest.length > 0 ? vehicleRest.join( ' ' ) : body.carModel ?? null,
        notes: body.note ?? null,
      } )
      .select( 'trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at' )
      .single();
    if ( error ) return json( { error: error.message }, 500 );
    return json( mapTripRow( data, await buildProfilePayload( auth.admin, auth.canonicalUser ) ) );
  }

  if ( ( request.method === 'PUT' || request.method === 'DELETE' || ( request.method === 'POST' && tripRoute?.action === 'publish' ) ) && tripRoute?.id ) {
    const auth = await authenticateRequest( request );
    if ( 'error' in auth ) return auth.error;
    // IDOR guard: verify the caller owns the trip or has trip management permission.
    const { data: tripOwner, error: tripOwnerErr } = await auth.admin
      .from( 'trips' )
      .select( 'trip_id, driver_id' )
      .eq( 'trip_id', tripRoute.id )
      .maybeSingle();
    if ( tripOwnerErr ) return json( { error: tripOwnerErr.message }, 500 );
    if ( !tripOwner ) return json( { error: 'Trip not found' }, 404 );
    const driver = await getDriverForUser( auth.admin, auth.canonicalUser.id );
    const isOwner = Boolean( driver?.driver_id ) && String( tripOwner.driver_id ) === String( driver.driver_id );
    const canManageTrips = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'rides:assign' );
    if ( !isOwner && !canManageTrips ) {
      return json( { error: 'Not authorized to modify this trip.' }, 403 );
    }
    if ( isOwner && ( !driver || !isApprovedDriver( auth.canonicalUser, driver, Boolean( auth.authUser.email_confirmed_at ) ) ) ) {
      return json( { error: 'Driver approval is required before publishing rides' }, 403 );
    }
    if ( request.method === 'DELETE' ) {
      const { error } = await auth.admin
        .from( 'trips' )
        .update( { trip_status: 'cancelled', deleted_at: new Date().toISOString() } )
        .eq( 'trip_id', tripRoute.id )
        .eq( 'driver_id', tripOwner.driver_id );
      return error ? json( { error: error.message }, 500 ) : json( { success: true } );
    }
    if ( request.method === 'POST' ) {
      const { error } = await auth.admin
        .from( 'trips' )
        .update( { trip_status: 'open' } )
        .eq( 'trip_id', tripRoute.id )
        .eq( 'driver_id', tripOwner.driver_id );
      return error ? json( { error: error.message }, 500 ) : json( { success: true } );
    }
    const body = await request.json().catch( () => ( {} ) );
    const patch: Record<string, unknown> = {};
    if ( body.from ) patch.origin_city = body.from;
    if ( body.to ) patch.destination_city = body.to;
    if ( body.date || body.time ) patch.departure_time = new Date( `${ body.date ?? new Date().toISOString().slice( 0, 10 ) }T${ body.time ?? '08:00' }:00` ).toISOString();
    if ( body.date ) patch.departure_date = body.date;
    if ( typeof body.seats === 'number' ) patch.available_seats = body.seats;
    if ( typeof body.price === 'number' ) patch.price_per_seat = body.price;
    if ( typeof body.status === 'string' ) patch.trip_status = body.status === 'active' ? 'open' : body.status;
    if ( typeof body.note === 'string' ) patch.notes = body.note;
    const { data, error } = await auth.admin
      .from( 'trips' )
      .update( patch )
      .eq( 'trip_id', tripRoute.id )
      .eq( 'driver_id', tripOwner.driver_id )
      .select( 'trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at' )
      .single();
    if ( error ) return json( { error: error.message }, 500 );
    const profiles = await fetchDriverProfiles( auth.admin, [ String( data.driver_id ?? '' ) ] );
    return json( mapTripRow( data, profiles[ String( data.driver_id ?? '' ) ] ) );
  }

  return undefined;
}

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