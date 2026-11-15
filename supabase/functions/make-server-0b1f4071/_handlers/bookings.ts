import {
    json,
    authenticateRequest,
    consumeRateLimit,
    matchesAuthenticatedUser,
    mapBookingRow,
    parseEntityRoute,
} from './shared.ts';

import { hasPermission, resolveAccessRole } from '../_shared/rbac.ts';
import { isTerminalBookingStatus, canTransitionBookingStatus } from '../_shared/booking-workflow.ts';
import {
  toNumber,
} from '../_shared/pricing.ts';


type BookingAuth = Extract<Awaited<ReturnType<typeof authenticateRequest>>, { admin: unknown }>;

// A passenger's own booking list is bounded so one heavy account cannot return an
// unbounded payload; the app only renders recent bookings.
const MAX_PASSENGER_BOOKINGS = 200;

/**
 * Logs the database/RPC detail server-side and returns an opaque error with a request id.
 * Raw PostgREST/Postgres messages name tables, columns and constraints, so they are never
 * echoed to the client.
 */
function bookingServerError ( scope: string, error: unknown ): Response {
  const requestId = crypto.randomUUID();
  const detail = error && typeof error === 'object' && 'message' in error
    ? String( ( error as { message?: unknown } ).message ?? '' )
    : String( error );
  console.error( `[bookings] ${ scope } failed`, { requestId, detail } );
  return json( { error: 'Something went wrong. Please try again.', code: 'internal_error', requestId }, 500 );
}

export async function handleBookingRequest ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  if ( request.method === 'POST' && path === '/bookings' ) {
    return createBooking( request, auth );
  }

  const bookingRoute = parseEntityRoute( path, 'bookings' );
  if ( request.method === 'GET' && bookingRoute?.id === 'user' ) {
    return listPassengerBookings( auth, bookingRoute.action ?? '' );
  }

  if ( request.method === 'PUT' && bookingRoute?.id ) {
    return updateBooking( request, auth, bookingRoute.id );
  }

  return undefined;
}

async function createBooking ( request: Request, auth: BookingAuth ): Promise<Response> {
  const parsedBody: unknown = await request.json().catch( () => null );
  if ( !parsedBody || typeof parsedBody !== 'object' || Array.isArray( parsedBody ) ) {
    return json( { error: 'A valid booking request is required.', code: 'invalid_request' }, 400 );
  }
  const body = parsedBody as Record<string, unknown>;
  const tripId = String( body.trip_id ?? '' ).trim();
  const seatsRequested = toNumber( body.seats_requested, 1 );
  if ( !tripId || !Number.isInteger( seatsRequested ) || seatsRequested < 1 || seatsRequested > 8 ) {
    return json( { error: 'A trip ID and an integer seat count from 1 to 8 are required.' }, 400 );
  }
  const pickup = typeof body.pickup_stop === 'string' ? body.pickup_stop.trim().slice( 0, 200 ) : null;
  const dropoff = typeof body.dropoff_stop === 'string' ? body.dropoff_stop.trim().slice( 0, 200 ) : null;
  const limited = await consumeRateLimit( auth.admin, `booking-create:${ auth.canonicalUser.id }`, 5, {
    windowSeconds: 3600,
    failClosed: true,
  } );
  if ( limited ) {return limited;}
  // Booking state is server-owned; every new ride request awaits driver review.
  const status = 'pending_driver';

  // Booking creation runs inside app_create_ride_booking so the trip row is
  // locked for the whole operation. The previous read-then-write sequence let
  // two concurrent requests both observe the last seat and both confirm it.
  const { data: created, error: createError } = await auth.admin.rpc( 'app_create_ride_booking', {
    p_trip_id: tripId,
    p_passenger_id: auth.canonicalUser.id,
    p_seats_requested: seatsRequested,
    p_pickup: pickup,
    p_dropoff: dropoff,
    p_booking_status: status,
    // Ignored by the function, which derives the fare from the locked trip
    // row. The argument is retained only to keep the signature stable.
    p_total_price: 0,
  } );

  if ( createError ) {
    const message = createError.message.toLowerCase();
    const expectedFailures: Array<{ match: string; status: number; code: string; error: string }> = [
      { match: 'invalid booking request', status: 400, code: 'invalid_request', error: 'Check the trip and seat count, then try again.' },
      { match: 'verified phone number', status: 403, code: 'phone_verification_required', error: 'Verify your phone number before booking.' },
      { match: 'wallet standing needs review', status: 403, code: 'wallet_review_required', error: 'Your account needs a quick review before you can book.' },
      { match: 'trip not found', status: 404, code: 'trip_not_found', error: 'This trip is no longer available.' },
      { match: 'trip is not available', status: 409, code: 'trip_unavailable', error: 'This trip is no longer available for booking.' },
      { match: 'not enough seats', status: 409, code: 'seats_unavailable', error: 'There are not enough seats left for this trip.' },
      { match: 'no contiguous seats', status: 409, code: 'seats_unavailable', error: 'There are not enough seats left together for this trip.' },
      { match: 'drivers cannot book their own trip', status: 403, code: 'self_booking_not_allowed', error: 'You cannot book your own trip.' },
      { match: 'active booking already exists', status: 409, code: 'booking_already_exists', error: 'You already have an active booking for this trip.' },
    ];
    const expected = expectedFailures.find( failure => message.includes( failure.match ) );
    if ( expected ) {
      return json( { error: expected.error, code: expected.code }, expected.status );
    }

    const requestId = crypto.randomUUID();
    console.error( '[bookings] Atomic reservation failed', {
      requestId,
      code: createError.code ?? 'unknown',
    } );
    return json( {
      error: 'We could not reserve those seats. Please try again.',
      code: 'booking_unavailable',
      requestId,
    }, 500 );
  }

  const data = ( Array.isArray( created ) ? created[ 0 ] : created );
  if ( !data ) {return json( { error: 'Booking could not be created' }, 500 );}

  return json( { booking: mapBookingRow( data ) } );
}

async function listPassengerBookings ( auth: BookingAuth, requestedUserId: string ): Promise<Response> {
  if ( !matchesAuthenticatedUser( auth, requestedUserId ) ) {
    return json( { error: 'Booking route is not authorized for this user.' }, 403 );
  }
  const { data, error } = await auth.admin
    .from( 'bookings' )
    .select( '*' )
    .eq( 'passenger_id', auth.canonicalUser.id )
    .order( 'created_at', { ascending: false } )
    .limit( MAX_PASSENGER_BOOKINGS );
  if ( error ) {return bookingServerError( 'list-passenger-bookings', error );}
  return json( ( Array.isArray( data ) ? data : [] ).map( mapBookingRow ) );
}

async function isTripDriver (
  auth: BookingAuth,
  tripId: string | null | undefined,
  userId: string,
): Promise<boolean> {
  if ( !tripId ) {return false;}
  const { data: tripRow } = await auth.admin
    .from( 'trips' )
    .select( 'driver_id' )
    .eq( 'trip_id', tripId )
    .maybeSingle();
  if ( !tripRow?.driver_id ) {return false;}
  // trips.driver_id is a drivers.driver_id, not a users.id, so resolve the caller's
  // driver record before comparing.
  const { data: driverRow } = await auth.admin
    .from( 'drivers' )
    .select( 'driver_id' )
    .eq( 'user_id', userId )
    .maybeSingle();
  return Boolean( driverRow?.driver_id ) && driverRow?.driver_id === tripRow.driver_id;
}

function normalizeBookingStatusUpdate ( rawStatus: unknown ): string {
  if ( rawStatus === 'accepted' ) {return 'confirmed';}
  if ( rawStatus === 'rejected' ) {return 'cancelled';}
  return String( rawStatus ?? 'cancelled' );
}

async function updateBooking ( request: Request, auth: BookingAuth, bookingId: string ): Promise<Response> {
  const body = await request.json().catch( () => ( {} ) );
  // IDOR guard: verify the caller is the passenger or the trip's driver.
  const { data: bookingRow, error: bookingErr } = await auth.admin
    .from( 'bookings' )
    .select( 'booking_id, passenger_id, trip_id, booking_status' )
    .eq( 'booking_id', bookingId )
    .maybeSingle();
  if ( bookingErr ) {return bookingServerError( 'update-booking-lookup', bookingErr );}
  if ( !bookingRow ) {return json( { error: 'Booking not found' }, 404 );}
  const isPassenger = bookingRow.passenger_id === auth.canonicalUser.id;
  const isDriver = await isTripDriver( auth, bookingRow.trip_id, auth.canonicalUser.id );
  const canManage = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'rides:assign' );
  if ( !isPassenger && !isDriver && !canManage ) {
    return json( { error: 'Not authorized to update this booking.' }, 403 );
  }
  const status = normalizeBookingStatusUpdate( body.status );
  // A passenger may only cancel their own booking. Confirming, starting or
  // completing a ride is for the trip's driver (or staff with rides:assign).
  const currentStatus = String( bookingRow.booking_status ?? '' );
  if ( isTerminalBookingStatus( currentStatus ) ) {
    return json( { error: 'This booking is already in a terminal state.' }, 409 );
  }
  if ( !canTransitionBookingStatus( currentStatus, status, isDriver || canManage ) ) {
    return json( { error: 'This status change is not permitted for your account.' }, 403 );
  }
  if ( status === 'cancelled' ) {
    const reason = typeof body.reason === 'string' && body.reason.trim().length >= 2
      ? body.reason.trim().slice( 0, 500 )
      : 'Cancelled by booking participant';
    const { data: cancellation, error: cancellationError } = await auth.admin.rpc( 'app_cancel_trip_booking', {
      p_booking_id: bookingId,
      p_actor_id: auth.canonicalUser.id,
      p_reason: reason,
      // The caller has already passed passenger/driver/admin authorization above.
      p_can_cancel_any: isDriver || canManage,
    } );
    if ( cancellationError ) {return bookingServerError( 'update-booking-cancel', cancellationError );}
    const result = ( Array.isArray( cancellation ) ? cancellation[ 0 ] : cancellation ) as Record<string, unknown> | null;
    if ( !result?.ok ) {
      const code = String( result?.code ?? 'unknown' );
      return json( { error: code === 'too_late' ? 'Cancellation requires at least one hour before departure.' : 'Booking cancellation was rejected.', code }, code === 'too_late' || code === 'terminal_state' ? 409 : 400 );
    }
    return json( { booking_id: bookingId, trip_id: result.trip_id, booking_status: 'cancelled', status: 'cancelled', refundRequired: Boolean( result.refund_required ) } );
  }
  // Use only columns and enum values in booking_status_v2. Including convenience
  // aliases such as `status`, `confirmed_by_driver`, or `in_progress` makes this
  // write fail against the canonical production bookings table. The current-state
  // predicate also prevents a concurrent update from replaying a stale transition.
  const { data, error } = await auth.admin
    .from( 'bookings' )
    .update( { booking_status: status } )
    .eq( 'booking_id', bookingId )
    .eq( 'booking_status', currentStatus )
    .select( '*' )
    .maybeSingle();
  if ( error ) {return bookingServerError( 'update-booking-status', error );}
  if ( !data ) {return json( { error: 'Booking status changed; reload and try again.' }, 409 );}
  return json( mapBookingRow( data ) );
}

export async function handleSubmitRating ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const parsedBody: unknown = await request.json().catch( () => null );
  if ( !parsedBody || typeof parsedBody !== 'object' || Array.isArray( parsedBody ) ) {
    return json( { error: 'A valid rating request is required.' }, 400 );
  }
  const body = parsedBody as Record<string, unknown>;
  const role = resolveAccessRole( auth.canonicalUser.role );
  const canModerateRatings = hasPermission( role, 'trust:moderate' );

  const rating = Number( body.rating );
  if ( !Number.isFinite( rating ) || rating < 1 || rating > 5 ) {
    return json( { error: 'Rating must be between 1 and 5' }, 400 );
  }

  const { admin, canonicalUser } = auth;
  const bookingId = String( body.bookingId ?? '' );
  if ( !bookingId || bookingId.length > 128 ) {
    return json( { error: 'A valid booking ID is required.' }, 400 );
  }
  const { data: booking, error: bookingError } = await admin
    .from( 'bookings' )
    .select( 'booking_id, passenger_id, booking_status, trip_id, trips(driver_id)' )
    .eq( 'booking_id', bookingId )
    .maybeSingle();

  if ( bookingError ) {return bookingServerError( 'rating-booking-lookup', bookingError );}
  if ( !booking ) {return json( { error: 'Booking not found' }, 404 );}
  if ( !canModerateRatings && booking.passenger_id !== canonicalUser.id ) {return json( { error: 'Unauthorized' }, 403 );}
  if ( booking.booking_status !== 'completed' ) {return json( { error: 'Can only rate completed trips' }, 409 );}

  const tripId = String( booking.trip_id ?? '' );
  const bookingRow = booking as unknown as { trips?: { driver_id: string | null } | { driver_id: string | null }[] | null };
  const driverId = String(
    ( Array.isArray( bookingRow.trips ) ? bookingRow.trips[0]?.driver_id : bookingRow.trips?.driver_id ) ?? ''
  );
  if ( !tripId || !driverId ) {return json( { error: 'Unable to resolve trip or driver for rating' }, 400 );}
  const { data: driver, error: driverError } = await admin
    .from( 'drivers' )
    .select( 'user_id' )
    .eq( 'driver_id', driverId )
    .maybeSingle();
  if ( driverError ) {return bookingServerError( 'rating-driver-lookup', driverError );}
  if ( !driver?.user_id ) {return json( { error: 'Unable to resolve driver account for rating' }, 409 );}

  const { data: existingRating, error: existingError } = await admin
    .from( 'ratings' )
    .select( 'id' )
    .eq( 'booking_id', bookingId )
    .eq( 'rider_id', canonicalUser.id )
    .maybeSingle();

  if ( existingError ) {return bookingServerError( 'rating-existing-lookup', existingError );}
  if ( existingRating ) {return json( { error: 'You have already rated this trip' }, 409 );}

  const allowedTags = new Set( [ 'punctual', 'clean_car', 'friendly', 'safe_driving', 'good_communication', 'professional' ] );
  const tags = Array.isArray( body.tags )
    ? Array.from( new Set( body.tags.filter( ( tag ): tag is string => typeof tag === 'string' && allowedTags.has( tag ) ) ) ).slice( 0, 6 )
    : [];
  const review = typeof body.review === 'string' ? body.review.trim().slice( 0, 1000 ) : '';

  const { error: insertError } = await admin
    .from( 'ratings' )
    .insert( {
      booking_id: bookingId,
      trip_id: tripId,
      rider_id: canonicalUser.id,
      driver_id: driverId,
      rating,
      review: review || null,
      tags,
    } );

  if ( insertError ) {
    // The read above improves the user-facing duplicate response, while this
    // unique constraint handles two concurrent submissions safely.
    if ( insertError.code === '23505' ) {return json( { error: 'You have already rated this trip' }, 409 );}
    console.error( '[ratings] rating insert failed', { code: insertError.code ?? 'unknown' } );
    return json( { error: 'Rating could not be submitted. Please try again.' }, 500 );
  }

  // The rating is already stored; a failed notification must not turn a successful
  // submission into an error, but it should not vanish silently either.
  const { error: notifyError } = await admin.from( 'notifications' ).insert( {
    user_id: driver.user_id,
    type: 'rating_received',
    title: 'New Rating',
    body: `You received a ${ rating }-star rating`,
    data: { bookingId, tripId, rating },
  } );
  if ( notifyError ) {
    console.warn( '[ratings] driver notification failed', { code: notifyError.code ?? 'unknown' } );
  }

  return json( { ok: true }, 201 );
}

export async function handleGetDriverRating ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const driverId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  if ( !driverId ) {return json( { error: 'Driver ID is required' }, 400 );}
  const { data, error } = await auth.admin.rpc( 'app_get_driver_rating', { p_driver_id: driverId } );
  if ( error ) {return bookingServerError( 'driver-rating', error );}
  const summary = ( Array.isArray( data ) ? data[ 0 ] : data ) as Record<string, unknown> | null;
  const reviews = Array.isArray( summary?.recentReviews ) ? summary.recentReviews : [];
  return json( {
    averageRating: Number( summary?.averageRating ?? 0 ),
    totalRatings: Number( summary?.totalRatings ?? 0 ),
    recentReviews: reviews.map( ( value: unknown ) => {
      const review = value && typeof value === 'object' ? value as Record<string, unknown> : {};
      return {
        rating: Number( review.rating ?? 0 ),
        review: String( review.review ?? '' ),
        tags: Array.isArray( review.tags ) ? review.tags : [],
        createdAt: String( review.created_at ?? '' ),
      };
    } ),
  } );
}

export async function handleCanRateBooking ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const bookingId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  const { admin, canonicalUser } = auth;

  const { data: booking, error } = await admin
    .from( 'bookings' )
    .select( 'booking_id, passenger_id, booking_status' )
    .eq( 'booking_id', bookingId )
    .maybeSingle();

  if ( error ) {return bookingServerError( 'can-rate-lookup', error );}
  if ( !booking ) {return json( { canRate: false, reason: 'Booking not found' } );}
  if ( booking.passenger_id !== canonicalUser.id ) {return json( { canRate: false, reason: 'Not your booking' } );}
  if ( booking.booking_status !== 'completed' ) {return json( { canRate: false, reason: 'Trip not completed' } );}

  const { data: existingRating, error: ratingError } = await admin
    .from( 'ratings' )
    .select( 'id' )
    .eq( 'booking_id', bookingId )
    .eq( 'rider_id', canonicalUser.id )
    .maybeSingle();

  if ( ratingError ) {return bookingServerError( 'can-rate-existing', ratingError );}
  if ( existingRating ) {return json( { canRate: false, reason: 'Already rated' } );}

  return json( { canRate: true } );
}

export async function handleCancelBooking ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const canCancelAny = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'rides:cancel_any' );
  const limited = await consumeRateLimit( auth.admin, `booking-cancel:${ auth.canonicalUser.id }`, 10, {
    windowSeconds: 3600,
    failClosed: true,
  } );
  if ( limited ) {return limited;}
  const body = await request.json().catch( () => ( {} ) );
  const bookingId = String( body.bookingId ?? '' ).trim();
  const reason = String( body.reason ?? '' ).trim();
  if ( !bookingId || reason.length < 2 || reason.length > 500 ) {
    return json( { error: 'A booking ID and a cancellation reason (2 to 500 characters) are required.' }, 400 );
  }

  const { data, error } = await auth.admin.rpc( 'app_cancel_trip_booking', {
    p_booking_id: bookingId,
    p_actor_id: auth.canonicalUser.id,
    p_reason: reason,
    p_can_cancel_any: canCancelAny,
  } );
  if ( error ) {return bookingServerError( 'cancel-booking', error );}
  const result = ( Array.isArray( data ) ? data[ 0 ] : data ) as Record<string, unknown> | null;
  if ( !result?.ok ) {
    const code = String( result?.code ?? 'unknown' );
    const status = code === 'not_found' || code === 'trip_not_found' ? 404
      : code === 'forbidden' ? 403
        : code === 'too_late' || code === 'terminal_state' ? 409 : 400;
    return json( { error: code === 'too_late'
      ? 'Bookings can only be cancelled at least one hour before departure.'
      : code === 'terminal_state' ? 'This booking can no longer be cancelled.'
        : code === 'not_found' ? 'Booking not found.' : 'Booking cancellation was rejected.', code }, status );
  }

  const driverId = String( result.driver_id ?? '' );
  if ( driverId ) {
    const { data: driver } = await auth.admin.from( 'drivers' )
      .select( 'user_id' ).eq( 'driver_id', driverId ).maybeSingle();
    if ( driver?.user_id ) {
      // The cancellation is already committed; a failed notification is logged, not surfaced.
      const { error: notifyError } = await auth.admin.from( 'notifications' ).insert( {
        user_id: driver.user_id,
        type: 'booking_cancelled',
        title: 'Booking Cancelled',
        body: 'A passenger cancelled their booking.',
        data: { bookingId, tripId: result.trip_id },
      } );
      if ( notifyError ) {
        console.warn( '[bookings] cancellation notification failed', { code: notifyError.code ?? 'unknown' } );
      }
    }
  }

  return json( { ok: true, refundRequired: Boolean( result.refund_required ) } );
}

export async function handleCanCancelBooking ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const canCancelAny = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'rides:cancel_any' );
  const bookingId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  if ( !bookingId ) {return json( { canCancel: false, reason: 'Booking ID is required' }, 400 );}
  const { data: booking, error } = await auth.admin
    .from( 'bookings' )
    .select( 'booking_id, passenger_id, booking_status, trips(departure_time)' )
    .eq( 'booking_id', bookingId )
    .maybeSingle();

  if ( error ) {return bookingServerError( 'can-cancel-lookup', error );}
  if ( !booking ) {return json( { canCancel: false, reason: 'Booking not found' } );}
  if ( !canCancelAny && booking.passenger_id !== auth.canonicalUser.id ) {
    return json( { canCancel: false, reason: 'Not your booking' } );
  }
  if ( [ 'cancelled', 'completed', 'refunded' ].includes( String( booking.booking_status ) ) ) {
    return json( { canCancel: false, reason: 'Booking is no longer active' } );
  }

  const trip = Array.isArray( booking.trips ) ? booking.trips[ 0 ] : booking.trips;
  const departureTime = new Date( trip?.departure_time ?? 0 );
  const hoursUntilDeparture = ( departureTime.getTime() - Date.now() ) / ( 1000 * 60 * 60 );
  if ( !Number.isFinite( hoursUntilDeparture ) || hoursUntilDeparture < 1 ) {
    return json( { canCancel: false, reason: 'Cancellations require at least one hour before departure' } );
  }

  return json( { canCancel: true } );
}
