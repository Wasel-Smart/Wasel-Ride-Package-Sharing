import {
    json,
    authenticateRequest,
    consumeRateLimit,
    matchesAuthenticatedUser,
    mapPackageRow,
    parseEntityRoute,
} from './shared.ts';

import { hasPermission, resolveAccessRole } from '../_shared/rbac.ts';
import { toNumber } from '../_shared/pricing.ts';
import { calculatePackageDeliveryFee } from '../_shared/package-pricing.ts';


/** Single-use 6-digit hand-off code. Rejection sampling avoids modulo bias. */
function randomVerificationCode (): string {
  const span = 900000; // maps to 100000..999999 inclusive
  const limit = Math.floor( 0x100000000 / span ) * span;
  const buf = new Uint32Array( 1 );
  let v = 0;
  do {
    crypto.getRandomValues( buf );
    v = buf[ 0 ] ?? 0;
  } while ( v >= limit );
  return String( 100000 + ( v % span ) );
}

/** SHA-256 hex digest of a verification code for safe storage in the DB.
 * The plain code is sent to the user; only the hash is persisted so a full
 * DB read cannot expose a live hand-off secret. */
async function hashCode ( plain: string ): Promise<string> {
  const bytes = new TextEncoder().encode( plain );
  const digest = await crypto.subtle.digest( 'SHA-256', bytes );
  return Array.from( new Uint8Array( digest ) ).map( b => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

/** Constant-time string compare so a wrong code leaks no per-position timing
 * signal. Both inputs are already trimmed; the code length is fixed and not a secret. */
function constantTimeEquals ( a: string, b: string ): boolean {
  if ( a.length !== b.length ) {return false;}
  let diff = 0;
  for ( let i = 0; i < a.length; i += 1 ) {
    diff |= a.charCodeAt( i ) ^ b.charCodeAt( i );
  }
  return diff === 0;
}

export async function handlePackageRequest ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  if ( request.method === 'POST' && path === '/packages' ) {
    const body = await request.json().catch( () => ( {} ) );
    const packageFee = calculatePackageDeliveryFee( body.weight );
    const trackingNumber = `PKG-${ crypto.randomUUID().replace( /-/g, '' ).slice( 0, 8 ).toUpperCase() }`;
    const pickupCode = randomVerificationCode();
    const deliveryCode = randomVerificationCode();
    const [ pickupHash, deliveryHash ] = await Promise.all( [ hashCode( pickupCode ), hashCode( deliveryCode ) ] );
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
        delivery_fee: packageFee,
        fee_amount: packageFee,
        status: 'posted',
        pickup_verification_code: pickupHash,
        delivery_verification_code: deliveryHash,
        escrow_status: 'pending',
      } )
      .select( '*' )
      .single();
    if ( error ) {return json( { error: error.message }, 500 );}

    const packageId = String( data.package_id ?? data.id ?? '' );
    const originName = String( body.origin_name ?? body.from ?? '' ).trim();
    const destName = String( body.destination_name ?? body.to ?? '' ).trim();

    // Route-matched carrier search. Priority: exact origin+destination, then
    // destination-only, then any open trip that accepts packages. Each attempt is
    // a fresh query so filters never bleed between lookups. This stops the old
    // "first open trip" choice from handing an Amman->Aqaba package to a trip
    // going the opposite direction.
    const findOpenTrips = () =>
      auth.admin
        .from( 'trips' )
        .select( 'trip_id, driver_id, package_slots_remaining, trip_status, origin_city, destination_city' )
        .eq( 'allow_packages', true )
        .eq( 'trip_status', 'open' )
        .gt( 'package_slots_remaining', 0 );

    type CarrierCandidate = { trip_id: string; driver_id: string; package_slots_remaining: number };
    let candidate: CarrierCandidate | null = null;
    if ( originName && destName ) {
      const { data: exact } = await findOpenTrips()
        .ilike( 'origin_city', `%${ originName }%` )
        .ilike( 'destination_city', `%${ destName }%` )
        .limit( 1 )
        .maybeSingle();
      candidate = ( exact as CarrierCandidate | null ) ?? null;
    }
    if ( !candidate && destName ) {
      const { data: dest } = await findOpenTrips()
        .ilike( 'destination_city', `%${ destName }%` )
        .limit( 1 )
        .maybeSingle();
      candidate = ( dest as CarrierCandidate | null ) ?? null;
    }
    if ( !candidate ) {
      const { data: anyTrip } = await findOpenTrips()
        .limit( 1 )
        .maybeSingle();
      candidate = ( anyTrip as CarrierCandidate | null ) ?? null;
    }

    if ( candidate ) {
      // Optimistic-lock the slot: only decrement if no concurrent request changed
      // it between read and write. Two concurrent requests can never both claim
      // the last slot; the CHECK constraint (>= 0) is the backstop.
      const remaining = toNumber( candidate.package_slots_remaining, 0 );
      const { data: claimed, error: claimError } = await auth.admin
        .from( 'trips' )
        .update( { package_slots_remaining: Math.max( 0, remaining - 1 ) } )
        .eq( 'trip_id', candidate.trip_id )
        .eq( 'package_slots_remaining', remaining )
        .select( 'trip_id, driver_id' )
        .maybeSingle();

      if ( claimed && !claimError ) {
        await auth.admin
          .from( 'packages' )
          .update( {
            trip_id: claimed.trip_id,
            carrier_id: claimed.driver_id,
            status: 'assigned',
          } )
          .eq( 'package_id', packageId );

        await auth.admin.from( 'package_events' ).insert( {
          package_id: packageId,
          event_type: 'assignment',
          event_status: 'assigned',
          notes: JSON.stringify( { trip_id: claimed.trip_id, driver_id: claimed.driver_id } ),
        } );
      }
      // If `claimed` is null the slot was taken by a concurrent request; the
      // package stays 'posted' and the matching worker retries — never assigned
      // to a trip with no free slot.
    }

    // Return the single-use hand-off codes once, at creation, so the sender can
    // share the delivery code with the receiver out of band. They are never sent
    // again — list/get responses strip them (see mapPackageRow) so the carrier
    // cannot read the delivery code and fake a hand-off.
    return json( {
      package: mapPackageRow( data ),
      pickup_verification_code: pickupCode,
      delivery_verification_code: deliveryCode,
    } );
  }

  // Track by tracking_number — called by the frontend's getPackageByTrackingId.
  if ( request.method === 'GET' && path.startsWith( '/packages/track/' ) ) {
    const trackingNumber = decodeURIComponent( path.split( '/packages/track/' )[ 1 ]?.split( '/' )[ 0 ] ?? '' ).toUpperCase();
    if ( !trackingNumber ) { return json( { error: 'Tracking number required' }, 400 ); }
    const { data, error } = await auth.admin
      .from( 'packages' )
      .select( '*' )
      .eq( 'tracking_number', trackingNumber )
      .maybeSingle();
    if ( error ) { return json( { error: error.message }, 500 ); }
    if ( !data ) { return json( { error: 'Package not found' }, 404 ); }
    const isOwner = data.sender_id === auth.canonicalUser.id || data.carrier_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:read' );
    if ( !isOwner && !isStaff ) {
      return json( { error: 'Not authorized to view this package.' }, 403 );
    }
    return json( mapPackageRow( data ) );
  }

  const packageRoute = parseEntityRoute( path, 'packages' );
  if ( request.method === 'GET' && packageRoute?.id ) {
    const { data, error } = await auth.admin
      .from( 'packages' )
      .select( '*' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( error ) {return json( { error: error.message }, 500 );}
    if ( !data ) {return json( { error: 'Package not found' }, 404 );}
    const isOwner = data.sender_id === auth.canonicalUser.id || data.carrier_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:read' );
    if ( !isOwner && !isStaff ) {
      return json( { error: 'Not authorized to view this package.' }, 403 );
    }
    return json( mapPackageRow( data ) );
  }

  if ( request.method === 'GET' && path.startsWith( '/packages/sender/' ) ) {
    const userId = path.split( '/packages/sender/' )[ 1 ]?.split( '/' )[ 0 ];
    if ( !userId ) {return json( { error: 'User ID required' }, 400 );}
    // IDOR guard: only the sender themselves (or admin) may list their packages.
    if ( !matchesAuthenticatedUser( auth, userId ) && !hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:assign' ) ) {
      return json( { error: 'Not authorized to view these packages.' }, 403 );
    }
    const { data, error } = await auth.admin
      .from( 'packages' )
      .select( '*' )
      .eq( 'sender_id', userId )
      .order( 'created_at', { ascending: false } );
    if ( error ) {return json( { error: error.message }, 500 );}
    return json( ( Array.isArray( data ) ? data : [] ).map( mapPackageRow ) );
  }

  if ( request.method === 'POST' && packageRoute?.id && packageRoute.action === 'deliver' ) {
    const { data: pkg, error: pkgErr } = await auth.admin
      .from( 'packages' )
      .select( 'package_id, sender_id, carrier_id' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( pkgErr ) {return json( { error: pkgErr.message }, 500 );}
    if ( !pkg ) {return json( { error: 'Package not found' }, 404 );}
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
    if ( error ) {return json( { error: error.message }, 500 );}
    return json( mapPackageRow( data ) );
  }

  if ( request.method === 'POST' && packageRoute?.id && packageRoute.action === 'status' ) {
    const { data: pkg, error: pkgErr } = await auth.admin
      .from( 'packages' )
      .select( 'package_id, sender_id, carrier_id, status' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( pkgErr ) {return json( { error: pkgErr.message }, 500 );}
    if ( !pkg ) {return json( { error: 'Package not found' }, 404 );}
    const isCarrier = pkg.carrier_id === auth.canonicalUser.id;
    const isSender = pkg.sender_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:write' );
    if ( !isCarrier && !isSender && !isStaff ) {
      return json( { error: 'Not authorized to update this package.' }, 403 );
    }
    const body = await request.json().catch( () => ( {} ) );
    const newStatus = String( body.status ?? '' ).trim();
    const carrierId = body.carrierId ? String( body.carrierId ).trim() : null;
    const validStatuses = [ 'posted', 'assigned', 'in_transit', 'out_for_delivery', 'delivered', 'returned', 'cancelled' ];
    if ( !validStatuses.includes( newStatus ) ) {
      return json( { error: 'Invalid package status.' }, 400 );
    }
    const updateData: Record<string, unknown> = { status: newStatus };
    if ( newStatus === 'delivered' ) {updateData.delivered_at = new Date().toISOString();}
    if ( carrierId ) {updateData.carrier_id = carrierId;}
    const { data, error } = await auth.admin
      .from( 'packages' )
      .update( updateData )
      .eq( 'package_id', packageRoute.id )
      .select( '*' )
      .single();
    if ( error ) {return json( { error: error.message }, 500 );}
    await auth.admin.from( 'package_events' ).insert( {
      package_id: packageRoute.id,
      event_type: 'status_change',
      event_status: newStatus,
      notes: JSON.stringify( { carrierId } ),
    } );
    return json( mapPackageRow( data ) );
  }

  if ( request.method === 'POST' && packageRoute?.id && packageRoute.action === 'assign-to-trip' ) {
    const { data: pkg, error: pkgErr } = await auth.admin
      .from( 'packages' )
      .select( 'package_id, sender_id, carrier_id, status, trip_id' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( pkgErr ) {return json( { error: pkgErr.message }, 500 );}
    if ( !pkg ) {return json( { error: 'Package not found' }, 404 );}
    const isCarrier = pkg.carrier_id === auth.canonicalUser.id;
    const isSender = pkg.sender_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:assign' );
    if ( !isCarrier && !isSender && !isStaff ) {
      return json( { error: 'Not authorized to assign this package.' }, 403 );
    }
    const body = await request.json().catch( () => ( {} ) );
    const tripId = String( body.tripId ?? '' ).trim();
    if ( !tripId ) {return json( { error: 'tripId is required' }, 400 );}
    const { data: trip, error: tripErr } = await auth.admin
      .from( 'trips' )
      .select( 'trip_id, driver_id, available_seats, package_slots_remaining, trip_status, allow_packages' )
      .eq( 'trip_id', tripId )
      .maybeSingle();
    if ( tripErr ) {return json( { error: tripErr.message }, 500 );}
    if ( !trip ) {return json( { error: 'Trip not found' }, 404 );}
    if ( !trip.allow_packages ) {return json( { error: 'Trip does not accept packages' }, 400 );}
    if ( trip.trip_status !== 'open' ) {return json( { error: 'Trip is not open for packages' }, 400 );}
    if ( toNumber( trip.package_slots_remaining, 0 ) <= 0 ) {return json( { error: 'No package slots remaining on this trip' }, 400 );}

    // Atomically claim the slot with optimistic locking: only decrement if the
    // row still holds the value we read. A concurrent assignment that took the
    // last slot makes this update affect zero rows, so we refuse (409) instead
    // of overbooking. The CHECK constraint (package_slots_remaining >= 0) is the
    // database backstop.
    const remaining = toNumber( trip.package_slots_remaining, 0 );
    const { data: claimed, error: claimError } = await auth.admin
      .from( 'trips' )
      .update( { package_slots_remaining: Math.max( 0, remaining - 1 ) } )
      .eq( 'trip_id', tripId )
      .eq( 'package_slots_remaining', remaining )
      .select( 'trip_id, driver_id' )
      .maybeSingle();
    if ( claimError ) {return json( { error: claimError.message }, 500 );}
    if ( !claimed ) {return json( { error: 'No package slots remaining on this trip.' }, 409 );}

    const { data, error } = await auth.admin
      .from( 'packages' )
      .update( {
        trip_id: claimed.trip_id,
        carrier_id: claimed.driver_id,
        status: 'assigned',
      } )
      .eq( 'package_id', packageRoute.id )
      .select( '*' )
      .single();
    if ( error ) {
      // Restore the slot we optimistically claimed so a package-row failure does
      // not leak capacity.
      await auth.admin
        .from( 'trips' )
        .update( { package_slots_remaining: remaining } )
        .eq( 'trip_id', tripId )
        .eq( 'package_slots_remaining', Math.max( 0, remaining - 1 ) );
      return json( { error: error.message }, 500 );
    }
    await auth.admin.from( 'package_events' ).insert( {
      package_id: packageRoute.id,
      event_type: 'assignment',
      event_status: 'assigned',
      notes: JSON.stringify( { trip_id: claimed.trip_id, driver_id: claimed.driver_id } ),
    } );
    return json( mapPackageRow( data ) );
  }

  if ( request.method === 'POST' && packageRoute?.id && packageRoute.action === 'verify-pickup' ) {
    const { data: pkg, error: pkgErr } = await auth.admin
      .from( 'packages' )
      .select( 'package_id, sender_id, carrier_id, status, pickup_verification_code, pickup_verified' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( pkgErr ) {return json( { error: pkgErr.message }, 500 );}
    if ( !pkg ) {return json( { error: 'Package not found' }, 404 );}
    // The assigned carrier (driver) or staff confirm collection from the sender.
    const isCarrier = pkg.carrier_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:write' );
    if ( !isCarrier && !isStaff ) {
      return json( { error: 'Not authorized to verify pickup for this package.' }, 403 );
    }
    if ( pkg.pickup_verified ) {
      return json( { error: 'Pickup was already verified.' }, 409 );
    }
    if ( pkg.status !== 'assigned' ) {
      return json( { error: 'Package must be assigned to a carrier before pickup.' }, 409 );
    }
    const body = await request.json().catch( () => ( {} ) );
    const code = String( body.code ?? '' ).trim();
    if ( !code ) {return json( { error: 'A verification code is required.' }, 400 );}
    // Rate-limit per package so the 6-digit code cannot be brute-forced. Fails
    // closed: if the limiter is down, refuse rather than guess unguarded.
    const limited = await consumeRateLimit(
      auth.admin,
      `package-verify-pickup:${ packageRoute.id }`,
      10,
      { windowSeconds: 600, failClosed: true },
    );
    if ( limited ) {return limited;}
    if ( !pkg.pickup_verification_code || !constantTimeEquals( code, pkg.pickup_verification_code ) ) {
      return json( { error: 'Incorrect pickup code.' }, 403 );
    }
      .eq( 'package_id', packageRoute.id )
      .select( '*' )
      .single();
    if ( error ) {return json( { error: error.message }, 500 );}
    await auth.admin.from( 'package_events' ).insert( {
      package_id: packageRoute.id,
      event_type: 'pickup_verified',
      event_status: 'in_transit',
      notes: JSON.stringify( { photo: Boolean( photo ) } ),
    } );
    return json( mapPackageRow( data ) );
  }

  if ( request.method === 'POST' && packageRoute?.id && packageRoute.action === 'verify-delivery' ) {
    const { data: pkg, error: pkgErr } = await auth.admin
      .from( 'packages' )
      .select( 'package_id, sender_id, carrier_id, status, delivery_verification_code, delivery_verified' )
      .eq( 'package_id', packageRoute.id )
      .maybeSingle();
    if ( pkgErr ) {return json( { error: pkgErr.message }, 500 );}
    if ( !pkg ) {return json( { error: 'Package not found' }, 404 );}
    // The receiver is not always an app user, so the assigned carrier (who matches
    // the code the receiver physically presents) or the sender may confirm
    // delivery; staff may also confirm. The delivery code is NOT readable by the
    // carrier through the API, so a carrier can only confirm with the code the
    // receiver shows in person.
    const isCarrier = pkg.carrier_id === auth.canonicalUser.id;
    const isSender = pkg.sender_id === auth.canonicalUser.id;
    const isStaff = hasPermission( resolveAccessRole( auth.canonicalUser.role ), 'packages:write' );
    if ( !isCarrier && !isSender && !isStaff ) {
      return json( { error: 'Not authorized to verify delivery for this package.' }, 403 );
    }
    if ( pkg.delivery_verified ) {
      return json( { error: 'Delivery was already verified.' }, 409 );
    }
    if ( pkg.status !== 'in_transit' ) {
      return json( { error: 'Package must be in transit before delivery.' }, 409 );
    }
    const body = await request.json().catch( () => ( {} ) );
    const code = String( body.code ?? '' ).trim();
    if ( !code ) {return json( { error: 'A verification code is required.' }, 400 );}
    // Rate-limit per package so the delivery code cannot be brute-forced. The main
    // threat is a carrier guessing the receiver's code to fake a hand-off.
    const limited = await consumeRateLimit(
      auth.admin,
      `package-verify-delivery:${ packageRoute.id }`,
      10,
      { windowSeconds: 600, failClosed: true },
    );
    if ( limited ) {return limited;}
    if ( !pkg.delivery_verification_code || !constantTimeEquals( code, pkg.delivery_verification_code ) ) {
      return json( { error: 'Incorrect delivery code.' }, 403 );
    }
    const photo = typeof body.photo === 'string' ? body.photo.slice( 0, 1000 ) : null;
    const { data, error } = await auth.admin
      .from( 'packages' )
      .update( {
        delivery_verified: true,
        delivery_verified_at: new Date().toISOString(),
        delivery_photo: photo,
        status: 'delivered',
        delivered_at: new Date().toISOString(),
      } )
      .eq( 'package_id', packageRoute.id )
      .select( '*' )
      .single();
    if ( error ) {return json( { error: error.message }, 500 );}
    await auth.admin.from( 'package_events' ).insert( {
      package_id: packageRoute.id,
      event_type: 'delivery_verified',
      event_status: 'delivered',
      notes: JSON.stringify( { photo: Boolean( photo ) } ),
    } );
    return json( mapPackageRow( data ) );
  }

  return undefined;
}
