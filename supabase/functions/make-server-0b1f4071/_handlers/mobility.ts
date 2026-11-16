import {
    json,
    authenticateRequest,
    getAdminClient,
    ensureMobilitySeed,
    logUnhandledRouteError,
} from './shared.ts';

import {
  type MobilityCorridorRow,
  buildMobilitySnapshot,
} from '../_shared/mobility-os-runtime.ts';


export async function handlePublicMobilitySnapshot ( _request: Request ) {
  try {
    const admin = getAdminClient();
    await ensureMobilitySeed( admin );
    const { data, error } = await admin
      .from( 'mobility_corridors' )
      .select( 'id, origin, destination, base_price_seat, demand_index, seats_total, seats_booked, updated_at' )
      .order( 'demand_index', { ascending: false } )
      .limit( 12 );
    if ( error ) {
      logUnhandledRouteError( error, _request );
      return json(
        {
          error: 'Mobility corridor data is unavailable',
          corridors: [],
          generatedAt: new Date().toISOString(),
        },
        200,
      );
    }

    const corridors = ( Array.isArray( data ) ? data : [] ).map( ( row: Record<string, unknown> ) => ( {
      id: String( row.id ?? '' ),
      from: String( row.origin ?? '' ),
      to: String( row.destination ?? '' ),
      priceJod: Number( row.base_price_seat ?? 0 ),
      demand: Number( row.demand_index ?? 0 ),
      seatsTotal: Number( row.seats_total ?? 0 ),
      seatsBooked: Number( row.seats_booked ?? 0 ),
      updatedAt: String( row.updated_at ?? new Date().toISOString() ),
    } ) );

    return json( { corridors, generatedAt: new Date().toISOString() } );
  } catch ( err ) {
    logUnhandledRouteError( err, _request );
    return json(
      {
        error: 'Mobility corridor data is unavailable',
        corridors: [],
        generatedAt: new Date().toISOString(),
      },
      200,
    );
  }
}

export async function handleMobilityOSRequest ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  // Capacity bookings have no payment authorization/settlement workflow yet.
  // Fail closed until booking creation and payment confirmation can be one
  // server-owned lifecycle. Never return success for an unpaid reservation.
  //
  // The data layer is ready for that: app_create_mobility_booking reserves
  // capacity atomically (locks the corridor, re-checks capacity, increments
  // seats_booked instead of overwriting it, prices from the server clock and
  // rejects fractional seat quantities). Re-enable this route only after a
  // payment confirmation exists; call that RPC instead of any read-then-write.
  if ( request.method === 'POST' && path === '/mobility-os/booking/create' ) {
    return json( {
      error: 'Capacity bookings are paused until payment processing is available.',
      code: 'MOBILITY_BOOKING_PAYMENT_REQUIRED',
    }, 503 );
  }

  await ensureMobilitySeed( auth.admin );

  if ( request.method === 'GET' && path === '/mobility-os/snapshot' ) {
    const { data, error } = await auth.admin.from( 'mobility_corridors' ).select( '*' ).order( 'demand_index', { ascending: false } );
    if ( error ) {return json( { error: error.message }, 500 );}
    return json( buildMobilitySnapshot( ( Array.isArray( data ) ? data : [] ) as MobilityCorridorRow[] ) );
  }

  return undefined;
}

export async function handleGetMobilityLiveRows ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

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
        .select( 'trip_id, seats_requested, booking_status' )
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
