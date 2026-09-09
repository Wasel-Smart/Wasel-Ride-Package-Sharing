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

async function handleBookingRequest ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  if ( request.method === 'POST' && path === '/bookings' ) {
    const body = await request.json().catch( () => ( {} ) );
    const tripId = String( body.trip_id ?? '' );
    const seatsRequested = Math.max( 1, toNumber( body.seats_requested, 1 ) );
    const { data: trip, error: tripError } = await auth.admin
      .from( 'trips' )
      .select( 'trip_id, available_seats, price_per_seat, trip_status' )
      .eq( 'trip_id', tripId )
      .single();
    if ( tripError ) return json( { error: tripError.message }, 500 );
    const availableSeats = toNumber( trip.available_seats, 0 );
    if ( availableSeats < seatsRequested ) return json( { error: 'Not enough seats available' }, 409 );

    const totalPrice = toNumber( body.total_price, toNumber( trip.price_per_seat, 0 ) * seatsRequested );
    const status = String( body.status ?? body.booking_status ?? 'confirmed' );
    const { data, error } = await auth.admin
      .from( 'bookings' )
      .insert( {
        trip_id: tripId,
        passenger_id: auth.canonicalUser.id,
        seats_requested: seatsRequested,
        seat_number: toNumber( body.seat_number, 1 ),
        pickup_location: body.pickup_stop ?? body.pickup_location ?? null,
        dropoff_location: body.dropoff_stop ?? body.dropoff_location ?? null,
        booking_status: status,
        status,
        confirmed_by_driver: status !== 'pending_driver',
        amount: totalPrice,
        price_per_seat: toNumber( trip.price_per_seat, 0 ),
        total_price: totalPrice,
      } )
      .select( '*' )
      .single();
    if ( error ) return json( { error: error.message }, 500 );
    if ( status !== 'pending_driver' ) {
      await auth.admin
        .from( 'trips' )
        .update( {
          available_seats: Math.max( availableSeats - seatsRequested, 0 ),
          trip_status: availableSeats - seatsRequested <= 0 ? 'booked' : trip.trip_status ?? 'open',
        } )
        .eq( 'trip_id', tripId );
    }

    const { data: driver } = await auth.admin
      .from( 'drivers' )
      .select( 'driver_id, user_id' )
      .in( 'driver_status', [ 'online', 'approved', 'busy' ] )
      .limit( 1 )
      .maybeSingle();

    if ( driver && status !== 'pending_driver' ) {
      await auth.admin
        .from( 'trips' )
        .update( { driver_id: driver.driver_id, trip_status: 'booked' } )
        .eq( 'trip_id', tripId );

      await auth.admin
        .from( 'bookings' )
        .update( { driver_id: driver.driver_id, confirmed_by_driver: true } )
        .eq( 'booking_id', data.booking_id );
    }

    return json( { booking: mapBookingRow( data ) } );
  }

  const bookingRoute = parseEntityRoute( path, 'bookings' );
  if ( request.method === 'GET' && bookingRoute?.id === 'user' ) {
    const requestedUserId = bookingRoute.action ?? '';
    if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
      return json( { error: 'Booking route is not authorized for this user.' }, 403 );
    }
    const { data, error } = await auth.admin
      .from( 'bookings' )
      .select( '*' )
      .eq( 'passenger_id', auth.canonicalUser.id )
      .order( 'created_at', { ascending: false } );
    if ( error ) return json( { error: error.message }, 500 );
    return json( ( Array.isArray( data ) ? data : [] ).map( mapBookingRow ) );
  }

  if ( request.method === 'PUT' && bookingRoute?.id ) {
    const body = await request.json().catch( () => ( {} ) );
    // IDOR guard: verify the caller is the passenger or the trip's driver.
    const { data: bookingRow, error: bookingErr } = await auth.admin
      .from( 'bookings' )
      .select( 'booking_id, passenger_id, trip_id' )
      .eq( 'booking_id', bookingRoute.id )
      .maybeSingle();
    if ( bookingErr ) return json( { error: bookingErr.message }, 500 );
    if ( !bookingRow ) return json( { error: 'Booking not found' }, 404 );
    const isPassenger = bookingRow.passenger_id === auth.canonicalUser.id;
    let isDriver = false;
    if ( bookingRow.trip_id ) {
      const { data: tripRow } = await auth.admin
        .from( 'trips' )
        .select( 'driver_id' )
        .eq( 'trip_id', bookingRow.trip_id )
        .maybeSingle();
      isDriver = tripRow?.driver_id === auth.canonicalUser.id;
    }
    const canManage = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'rides:assign' );
    if ( !isPassenger && !isDriver && !canManage ) {
      return json( { error: 'Not authorized to update this booking.' }, 403 );
    }
    const status = body.status === 'accepted' ? 'confirmed' : body.status === 'rejected' ? 'cancelled' : String( body.status ?? 'cancelled' );
    const { data, error } = await auth.admin
      .from( 'bookings' )
      .update( {
        booking_status: status,
        status,
        confirmed_by_driver: status === 'confirmed',
      } )
      .eq( 'booking_id', bookingRoute.id )
      .select( '*' )
      .single();
    if ( error ) return json( { error: error.message }, 500 );
    return json( mapBookingRow( data ) );
  }

  return undefined;
}

async function handleSubmitRating ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  const canModerateRatings = hasPermission( role, 'trust:moderate' );

  const body = await request.json();
  const rating = Number( body.rating );
  if ( !Number.isFinite( rating ) || rating < 1 || rating > 5 ) {
    return json( { error: 'Rating must be between 1 and 5' }, 400 );
  }

  const { admin, canonicalUser } = auth;
  const bookingId = String( body.bookingId ?? '' );
  const tripId = String( body.tripId ?? '' );
  const driverId = String( body.driverId ?? '' );

  const { data: booking, error: bookingError } = await admin
    .from( 'bookings' )
    .select( 'id, user_id, status' )
    .eq( 'id', bookingId )
    .maybeSingle();

  if ( bookingError ) return json( { error: bookingError.message }, 500 );
  if ( !booking ) return json( { error: 'Booking not found' }, 404 );
  if ( !canModerateRatings && booking.user_id !== canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );
  if ( booking.status !== 'completed' ) return json( { error: 'Can only rate completed trips' }, 409 );

  const { data: existingRating, error: existingError } = await admin
    .from( 'ratings' )
    .select( 'id' )
    .eq( 'booking_id', bookingId )
    .eq( 'rider_id', canonicalUser.id )
    .maybeSingle();

  if ( existingError ) return json( { error: existingError.message }, 500 );
  if ( existingRating ) return json( { error: 'You have already rated this trip' }, 409 );

  const { error: insertError } = await admin
    .from( 'ratings' )
    .insert( {
      booking_id: bookingId,
      trip_id: tripId,
      rider_id: canonicalUser.id,
      driver_id: driverId,
      rating,
      review: typeof body.review === 'string' ? body.review : null,
      tags: Array.isArray( body.tags ) ? body.tags : [],
    } );

  if ( insertError ) return json( { error: insertError.message }, 500 );

  await admin.from( 'notifications' ).insert( {
    user_id: driverId,
    type: 'rating_received',
    title: 'New Rating',
    body: `You received a ${ rating }-star rating`,
    data: { bookingId, tripId, rating },
  } );

  return json( { ok: true }, 201 );
}

async function handleGetDriverRating ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const driverId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  const { admin } = auth;

  const { data: profile, error: profileError } = await admin
    .from( 'profiles' )
    .select( 'average_rating, total_ratings' )
    .eq( 'id', driverId )
    .maybeSingle();

  if ( profileError ) return json( { error: profileError.message }, 500 );

  const { data: recentReviews, error: reviewsError } = await admin
    .from( 'ratings' )
    .select( 'rating, review, tags, created_at' )
    .eq( 'driver_id', driverId )
    .not( 'review', 'is', null )
    .order( 'created_at', { ascending: false } )
    .limit( 10 );

  if ( reviewsError ) return json( { error: reviewsError.message }, 500 );

  return json( {
    averageRating: Number( profile?.average_rating ?? 0 ),
    totalRatings: Number( profile?.total_ratings ?? 0 ),
    recentReviews: ( recentReviews ?? [] ).map( ( review: Record<string, unknown> ) => ( {
      rating: Number( review.rating ?? 0 ),
      review: String( review.review ?? '' ),
      tags: Array.isArray( review.tags ) ? review.tags : [],
      createdAt: String( review.created_at ),
    } ) ),
  } );
}

async function handleCanRateBooking ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const bookingId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  const { admin, canonicalUser } = auth;

  const { data: booking, error } = await admin
    .from( 'bookings' )
    .select( 'id, user_id, status' )
    .eq( 'id', bookingId )
    .maybeSingle();

  if ( error ) return json( { error: error.message }, 500 );
  if ( !booking ) return json( { canRate: false, reason: 'Booking not found' } );
  if ( booking.user_id !== canonicalUser.id ) return json( { canRate: false, reason: 'Not your booking' } );
  if ( booking.status !== 'completed' ) return json( { canRate: false, reason: 'Trip not completed' } );

  const { data: existingRating, error: ratingError } = await admin
    .from( 'ratings' )
    .select( 'id' )
    .eq( 'booking_id', bookingId )
    .eq( 'rider_id', canonicalUser.id )
    .maybeSingle();

  if ( ratingError ) return json( { error: ratingError.message }, 500 );
  if ( existingRating ) return json( { canRate: false, reason: 'Already rated' } );

  return json( { canRate: true } );
}

async function handleCancelBooking ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  const canCancelAny = hasPermission( role, 'rides:cancel_any' ) || hasPermission( role, 'packages:cancel_any' );

  const body = await request.json();
  const bookingId = String( body.bookingId ?? '' );
  const reason = String( body.reason ?? '' ).trim();
  if ( !bookingId || !reason ) return json( { error: 'bookingId and reason are required' }, 400 );

  const { admin, canonicalUser } = auth;
  const { data: booking, error: fetchError } = await admin
    .from( 'bookings' )
    .select( 'id, user_id, status, payment_status, trip_id, trips(driver_id)' )
    .eq( 'id', bookingId )
    .maybeSingle();

  if ( fetchError ) return json( { error: fetchError.message }, 500 );
  if ( !booking ) return json( { error: 'Booking not found' }, 404 );
  if ( !canCancelAny && booking.user_id !== canonicalUser.id ) return json( { error: 'Unauthorized' }, 403 );
  if ( booking.status === 'cancelled' ) return json( { error: 'Booking already cancelled' }, 409 );
  if ( booking.status === 'completed' ) return json( { error: 'Cannot cancel completed booking' }, 409 );

  const { error: updateError } = await admin
    .from( 'bookings' )
    .update( {
      status: 'cancelled',
      cancelled_by: canonicalUser.id,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
    } )
    .eq( 'id', bookingId );

  if ( updateError ) return json( { error: updateError.message }, 500 );

  const driverId = Array.isArray( booking.trips )
    ? booking.trips[ 0 ]?.driver_id
    : booking.trips?.driver_id;
  if ( driverId ) {
    await admin.from( 'notifications' ).insert( {
      user_id: driverId,
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      body: `A passenger cancelled their booking. Reason: ${ reason }`,
      data: { bookingId, tripId: booking.trip_id },
    } );
  }

  return json( {
    ok: true,
    refundRequired: Boolean( body.refundRequested !== false && booking.payment_status === 'succeeded' ),
  } );
}

async function handleCanCancelBooking ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const role = resolveAccessRole( auth.canonicalUser.role );
  const canCancelAny = hasPermission( role, 'rides:cancel_any' ) || hasPermission( role, 'packages:cancel_any' );

  const bookingId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  const { admin, canonicalUser } = auth;
  const { data: booking, error } = await admin
    .from( 'bookings' )
    .select( 'id, user_id, status, trips(departure_time)' )
    .eq( 'id', bookingId )
    .maybeSingle();

  if ( error ) return json( { error: error.message }, 500 );
  if ( !booking ) return json( { canCancel: false, reason: 'Booking not found' } );
  if ( !canCancelAny && booking.user_id !== canonicalUser.id ) return json( { canCancel: false, reason: 'Not your booking' } );
  if ( booking.status === 'cancelled' ) return json( { canCancel: false, reason: 'Already cancelled' } );
  if ( booking.status === 'completed' ) return json( { canCancel: false, reason: 'Trip completed' } );

  const trip = Array.isArray( booking.trips ) ? booking.trips[ 0 ] : booking.trips;
  const departureTime = new Date( trip?.departure_time ?? 0 );
  const hoursUntilDeparture = ( departureTime.getTime() - Date.now() ) / ( 1000 * 60 * 60 );
  if ( Number.isFinite( hoursUntilDeparture ) && hoursUntilDeparture < 1 ) {
    return json( { canCancel: false, reason: 'Too close to departure time' } );
  }

  return json( { canCancel: true } );
}