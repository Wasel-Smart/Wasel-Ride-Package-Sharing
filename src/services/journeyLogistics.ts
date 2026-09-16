import { API_URL, fetchWithRetry, getAuthDetails } from './core';
import { supabase } from '../utils/supabase/client';
import {
  createDirectPackage,
  getDirectPackageByTrackingId,
  updateDirectPackageStatus,
} from './directSupabase';
import { trackGrowthEvent } from './growthEngine';
import { tripsAPI } from './trips';

export interface PostedRide {
  id: string;
  ownerId?: string;
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  gender: string;
  prayer: boolean;
  carModel: string;
  note: string;
  acceptsPackages: boolean;
  packageCapacity: 'small' | 'medium' | 'large';
  packageNote: string;
  createdAt: string;
  status?: 'active' | 'cancelled' | 'completed';
}

export type PackageStatus = 'searching' | 'matched' | 'in_transit' | 'delivered';

export interface PackageVerification {
  senderCodeSharedAt?: string;
  riderPickupConfirmedAt?: string;
  receiverDeliveryConfirmedAt?: string;
}

export interface PackageRequest {
  id: string;
  trackingId: string;
  handoffCode: string;
  from: string;
  to: string;
  weight: string;
  note: string;
  packageType: 'delivery' | 'return';
  recipientName?: string;
  recipientPhone?: string;
  matchedRideId?: string;
  matchedDriver?: string;
  status: PackageStatus;
  createdAt: string;
  verification: PackageVerification;
  timeline: Array<{ label: string; complete: boolean }>;
}

const RIDES_KEY = 'wasel-connected-rides';
const PACKAGES_KEY = 'wasel-connected-packages';
const PACKAGE_LIMIT = 50;
const RIDE_LIMIT = 50;

function readList<T> ( key: string ): T[] {
  if ( typeof window === 'undefined' ) { return []; }
  try {
    const raw = window.localStorage.getItem( key );
    const parsed = raw ? JSON.parse( raw ) : [];
    return Array.isArray( parsed ) ? parsed : [];
  } catch {
    return [];
  }
}

function writeList<T> ( key: string, list: T[] ): void {
  if ( typeof window === 'undefined' ) { return; }
  window.localStorage.setItem( key, JSON.stringify( list ) );
}

function makeId ( prefix: string ): string {
  return `${ prefix }-${ crypto.randomUUID() }`;
}

function generateHandoffCode (): string {
  return `HC-${ crypto.randomUUID().replace( /-/g, '' ).slice( 0, 6 ).toUpperCase() }`;
}

function pickDriverName ( carModel: string ): string {
  if ( !carModel.trim() ) { return 'Wasel Captain'; }
  return `${ carModel.split( ' ' )[ 0 ] } Captain`;
}

function parseWeight ( weight: string ): number {
  const matches = weight.match( /\d+(?:\.\d+)?/g );
  if ( !matches ) { return 0.5; }
  const values = matches.map( Number ).filter( value => Number.isFinite( value ) );
  if ( !values.length ) { return 0.5; }
  return Math.max( ...values );
}

function sanitizeWeight ( weight: string ): string {
  return weight.trim() || '<1 kg';
}

function sanitizePhone ( phone?: string ): string | undefined {
  const sanitized = ( phone ?? '' ).replace( /[^\d+]/g, '' ).trim();
  return sanitized || undefined;
}

function sortByCreatedAtDesc<T extends { createdAt: string }> ( items: T[] ): T[] {
  return [ ...items ].sort( ( a, b ) => {
    const left = new Date( a.createdAt ).getTime();
    const right = new Date( b.createdAt ).getTime();
    return ( Number.isFinite( right ) ? right : 0 ) - ( Number.isFinite( left ) ? left : 0 );
  } );
}

function normalizeStatus ( value: unknown, matchedRideId?: string ): PackageStatus {
  const status = String( value ?? '' ).toLowerCase();
  if ( status === 'delivered' ) { return 'delivered'; }
  if ( status === 'in_transit' || status === 'picked_up' ) { return 'in_transit'; }
  if (
    status === 'searching' ||
    status === 'pending' ||
    status === 'requested' ||
    status === 'queued'
  ) {
    return matchedRideId ? 'matched' : 'searching';
  }
  if ( status === 'matched' || status === 'assigned' || status === 'accepted' ) { return 'matched'; }
  return matchedRideId ? 'matched' : 'searching';
}

function buildTimeline (
  status: PackageStatus,
  matchedRideId?: string,
  verification: PackageVerification = {},
): Array<{ label: string; complete: boolean }> {
  const matched = Boolean( matchedRideId ) || status !== 'searching';
  const senderShared = Boolean( verification.senderCodeSharedAt );
  const inTransit =
    Boolean( verification.riderPickupConfirmedAt ) ||
    status === 'in_transit' ||
    status === 'delivered';
  const delivered = Boolean( verification.receiverDeliveryConfirmedAt ) || status === 'delivered';

  return [
    { label: 'Request received', complete: true },
    {
      label: matched ? 'Matched to a rider trip' : 'Searching for a rider trip',
      complete: matched,
    },
    { label: 'Sender shared OTP handoff code', complete: senderShared },
    { label: 'Rider pickup confirmed', complete: inTransit },
    { label: 'Receiver delivery confirmed', complete: delivered },
  ];
}

function pickString ( values: unknown[], fallback = '' ): string {
  for ( const v of values ) {
    if ( v !== undefined && v !== null && String( v ).trim() !== '' ) {
      return String( v ).trim();
    }
  }
  return fallback;
}

function pickNumber ( values: unknown[], fallback = 0 ): number {
  for ( const v of values ) {
    if ( v !== undefined && v !== null && !Number.isNaN( Number( v ) ) ) {
      return Number( v );
    }
  }
  return fallback;
}

function resolveRideStatus ( status: unknown, fallback?: string ): PostedRide['status'] {
  if ( status === 'cancelled' || status === 'completed' ) {
    return status;
  }
  return ( fallback as PostedRide['status'] ) ?? 'active';
}

function resolvePackageVerification (
  raw: Record<string, unknown>,
  fallback?: PackageVerification,
): PackageVerification {
  const senderCodeSharedAt =
    pickString( [
      raw.sender_code_shared_at,
      raw.senderCodeSharedAt,
      fallback?.senderCodeSharedAt,
    ] ) || undefined;

  const riderPickupConfirmedAt =
    pickString( [
      raw.rider_pickup_confirmed_at,
      raw.riderPickupConfirmedAt,
      fallback?.riderPickupConfirmedAt,
    ] ) || undefined;

  const receiverDeliveryConfirmedAt =
    pickString( [
      raw.receiver_delivery_confirmed_at,
      raw.receiverDeliveryConfirmedAt,
      fallback?.receiverDeliveryConfirmedAt,
    ] ) || undefined;

  return { senderCodeSharedAt, riderPickupConfirmedAt, receiverDeliveryConfirmedAt };
}

function normalizeServerRide ( raw: Record<string, unknown>, fallback: PostedRide ): PostedRide {
  const id = pickString( [ raw.id ], String( fallback.id ) );
  const from = pickString( [ raw.from_location, raw.from ], fallback.from );
  const to = pickString( [ raw.to_location, raw.to ], fallback.to );
  const date = pickString( [ raw.departure_date, raw.date ], fallback.date );
  const time = pickString( [ raw.departure_time, raw.time ], fallback.time );
  const seats = pickNumber( [ raw.available_seats, raw.total_seats, raw.seats ], fallback.seats );
  const price = pickNumber( [ raw.price_per_seat, raw.price ], fallback.price );
  const carModel = pickString( [ raw.vehicle_model, raw.carModel ], fallback.carModel );
  const note = pickString( [ raw.notes, raw.note ], fallback.note );
  const createdAt = pickString( [ raw.created_at ], fallback.createdAt );
  const ownerId =
    pickString( [ raw.owner_id, raw.ownerId ], fallback.ownerId || '' ) || fallback.ownerId;
  const status = resolveRideStatus( raw.status, fallback.status );

  return {
    ...fallback,
    id,
    from,
    to,
    date,
    time,
    seats,
    price,
    carModel,
    note,
    createdAt,
    ownerId,
    status,
  };
}

function normalizeLocalRide ( raw: Partial<PostedRide> ): PostedRide | null {
  const id = String( raw.id ?? '' ).trim();
  const from = String( raw.from ?? '' ).trim();
  const to = String( raw.to ?? '' ).trim();
  if ( !id || !from || !to ) { return null; }

  const packageCapacity =
    raw.packageCapacity === 'large' || raw.packageCapacity === 'small'
      ? raw.packageCapacity
      : 'medium';

  return {
    id,
    from,
    to,
    date: String( raw.date ?? '' ),
    time: String( raw.time ?? '' ),
    seats: Number( raw.seats ?? 1 ) || 1,
    price: Number( raw.price ?? 0 ) || 0,
    gender: String( raw.gender ?? 'any' ),
    prayer: Boolean( raw.prayer ),
    carModel: String( raw.carModel ?? '' ),
    note: String( raw.note ?? '' ),
    acceptsPackages: Boolean( raw.acceptsPackages ),
    packageCapacity,
    packageNote: String( raw.packageNote ?? '' ),
    createdAt: String( raw.createdAt ?? new Date().toISOString() ),
    ownerId: String( raw.ownerId ?? '' ).trim() || undefined,
    status: resolveRideStatus( raw.status, 'active' ),
  };
}

function normalizeServerPackage (
  raw: Record<string, unknown>,
  fallback: PackageRequest,
): PackageRequest {
  const matchedRideId =
    pickString( [ raw.trip_id, raw.matchedRideId, fallback.matchedRideId ] ) || undefined;
  const status = normalizeStatus( raw.status, matchedRideId );
  const handoffCode =
    pickString( [ raw.handoff_code, raw.handoffCode, fallback.handoffCode ] ).toUpperCase() ||
    generateHandoffCode();
  const verification = resolvePackageVerification( raw, fallback.verification );
  const timeline = buildTimeline( status, matchedRideId, verification );

  return {
    ...fallback,
    id: pickString( [ raw.id ], String( fallback.id ) ),
    trackingId: pickString( [
      raw.tracking_code,
      raw.trackingId,
      fallback.trackingId,
    ] ).toUpperCase(),
    handoffCode,
    from: pickString( [ raw.from ], fallback.from ),
    to: pickString( [ raw.to ], fallback.to ),
    weight: sanitizeWeight( pickString( [ raw.weight ], fallback.weight ) ),
    note: pickString( [ raw.description, raw.note ], fallback.note ),
    packageType: raw.packageType === 'return' ? 'return' : fallback.packageType,
    recipientName:
      pickString( [ raw.recipient_name, raw.recipientName, fallback.recipientName ] ) ||
      undefined,
    recipientPhone: sanitizePhone(
      pickString( [ raw.recipient_phone, raw.recipientPhone, fallback.recipientPhone ] ),
    ),
    matchedRideId,
    matchedDriver:
      pickString( [ raw.driver_name, raw.matchedDriver, fallback.matchedDriver ] ) ||
      fallback.matchedDriver,
    status,
    createdAt: pickString( [ raw.created_at ], fallback.createdAt ),
    verification,
    timeline,
  };
}

function normalizeLocalPackage ( raw: Partial<PackageRequest> ): PackageRequest | null {
  const trackingId = String( raw.trackingId ?? '' )
    .trim()
    .toUpperCase();
  const from = String( raw.from ?? '' ).trim();
  const to = String( raw.to ?? '' ).trim();
  if ( !trackingId || !from || !to ) { return null; }

  const matchedRideId = String( raw.matchedRideId ?? '' ).trim() || undefined;
  const status = normalizeStatus( raw.status, matchedRideId );
  const handoffCode =
    String( raw.handoffCode ?? '' )
      .trim()
      .toUpperCase() || generateHandoffCode();

  const verification: PackageVerification = {
    senderCodeSharedAt: String( raw.verification?.senderCodeSharedAt ?? '' ).trim() || undefined,
    riderPickupConfirmedAt:
      String( raw.verification?.riderPickupConfirmedAt ?? '' ).trim() || undefined,
    receiverDeliveryConfirmedAt:
      String( raw.verification?.receiverDeliveryConfirmedAt ?? '' ).trim() || undefined,
  };

  const timeline =
    Array.isArray( raw.timeline ) && raw.timeline.length > 0
      ? raw.timeline.map( step => ( {
        label: String( step.label ?? '' ),
        complete: Boolean( step.complete ),
      } ) )
      : buildTimeline( status, matchedRideId, verification );

  return {
    id: String( raw.id ?? makeId( 'pkg' ) ),
    trackingId,
    handoffCode,
    from,
    to,
    weight: sanitizeWeight( String( raw.weight ?? '<1 kg' ) ),
    note: String( raw.note ?? '' ).trim(),
    packageType: raw.packageType === 'return' ? 'return' : 'delivery',
    recipientName: String( raw.recipientName ?? '' ).trim() || undefined,
    recipientPhone: sanitizePhone( String( raw.recipientPhone ?? '' ) ),
    matchedRideId,
    matchedDriver: String( raw.matchedDriver ?? '' ).trim() || undefined,
    status,
    createdAt: String( raw.createdAt ?? new Date().toISOString() ),
    verification,
    timeline,
  };
}

function mergePackages ( ...lists: PackageRequest[][] ): PackageRequest[] {
  const merged = new Map<string, PackageRequest>();

  for ( const list of lists ) {
    for ( const item of list ) {
      const normalized = normalizeLocalPackage( item );
      if ( !normalized ) { continue; }
      merged.set( normalized.trackingId, normalized );
    }
  }

  return sortByCreatedAtDesc( Array.from( merged.values() ) ).slice( 0, PACKAGE_LIMIT );
}

function mergeRides ( ...lists: PostedRide[][] ): PostedRide[] {
  const merged = new Map<string, PostedRide>();

  for ( const list of lists ) {
    for ( const item of list ) {
      const normalized = normalizeLocalRide( item );
      if ( !normalized ) { continue; }
      merged.set( normalized.id, normalized );
    }
  }

  return sortByCreatedAtDesc( Array.from( merged.values() ) ).slice( 0, RIDE_LIMIT );
}

function savePackages ( ...lists: PackageRequest[][] ): PackageRequest[] {
  const packages = mergePackages( ...lists );
  writeList( PACKAGES_KEY, packages );
  return packages;
}

function saveRides ( ...lists: PostedRide[][] ): PostedRide[] {
  const rides = mergeRides( ...lists );
  writeList( RIDES_KEY, rides );
  return rides;
}

function findBestMatchingRide (
  rides: PostedRide[],
  input: { from: string; to: string; weight: string },
): PostedRide | undefined {
  const requestedWeight = parseWeight( input.weight );
  const capacityRank = { small: 1, medium: 5, large: 10 };

  return sortByCreatedAtDesc( rides )
    .filter( ride => ride.acceptsPackages && ride.from === input.from && ride.to === input.to )
    .find( ride => capacityRank[ ride.packageCapacity ] >= requestedWeight );
}

export function getConnectedRides (): PostedRide[] {
  const rides = mergeRides( readList<PostedRide>( RIDES_KEY ) );
  writeList( RIDES_KEY, rides );
  return rides;
}

export async function createConnectedRide (
  input: Omit<PostedRide, 'id' | 'createdAt'>,
): Promise<PostedRide> {
  const ride: PostedRide = {
    ...input,
    id: makeId( 'ride' ),
    createdAt: new Date().toISOString(),
    status: input.status ?? 'active',
  };

  try {
    const server = await tripsAPI.createTrip( {
      from: input.from,
      to: input.to,
      date: input.date,
      time: input.time,
      seats: input.seats,
      price: input.price,
      gender: input.gender,
      prayer: input.prayer,
      carModel: input.carModel,
      note: input.note,
      acceptsPackages: input.acceptsPackages,
      packageCapacity: input.packageCapacity,
      packageNote: input.packageNote,
    } );

    const created = normalizeServerRide( server as unknown as Record<string, unknown>, ride );
    saveRides( [ created ], getConnectedRides() );
    void trackGrowthEvent( {
      userId: input.ownerId,
      eventName: 'ride_offer_created',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: created.from,
      to: created.to,
      valueJod: created.price,
      metadata: { seats: created.seats, acceptsPackages: created.acceptsPackages },
    } );
    return created;
  } catch ( error ) {
    if ( supabase ) {
      throw error instanceof Error ? error : new Error( 'Ride could not be published.' );
    }
    // No Supabase backend configured (E2E local mode) — persist locally.
    saveRides( [ ride ], getConnectedRides() );
    void trackGrowthEvent( {
      userId: input.ownerId,
      eventName: 'ride_offer_created',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: ride.from,
      to: ride.to,
      valueJod: ride.price,
      metadata: {
        seats: ride.seats,
        acceptsPackages: ride.acceptsPackages,
        source: 'local',
      },
    } );
    return ride;
  }
}

export function updateConnectedRide (
  rideId: string,
  updates: Partial<Pick<PostedRide, 'seats' | 'status' | 'note' | 'date' | 'time'>>,
): PostedRide | null {
  const rides = getConnectedRides();
  const target = rides.find( ride => ride.id === rideId );
  if ( !target ) { return null; }

  const updated: PostedRide = {
    ...target,
    ...updates,
    seats: typeof updates.seats === 'number' ? Math.max( 0, updates.seats ) : target.seats,
  };

  saveRides( rides.map( ride => ( ride.id === rideId ? updated : ride ) ) );
  return updated;
}

export function getConnectedPackages (): PackageRequest[] {
  const packages = mergePackages( readList<PackageRequest>( PACKAGES_KEY ) );
  writeList( PACKAGES_KEY, packages );
  return packages;
}

function buildServerPackagePayload ( pkg: PackageRequest ) {
  return {
    from: pkg.from,
    to: pkg.to,
    weight: parseWeight( pkg.weight ),
    description: pkg.note,
    price: 5,
    handoffCode: pkg.handoffCode,
    ...( pkg.recipientName ? { recipientName: pkg.recipientName } : {} ),
    ...( pkg.recipientPhone ? { recipientPhone: pkg.recipientPhone } : {} ),
    ...( pkg.packageType === 'return' ? { packageType: pkg.packageType } : {} ),
  };
}

export async function createConnectedPackage ( input: {
  from: string;
  to: string;
  weight: string;
  note: string;
  packageType?: 'delivery' | 'return';
  recipientName?: string;
  recipientPhone?: string;
} ): Promise<PackageRequest> {
  const from = input.from.trim();
  const to = input.to.trim();

  if ( !from || !to ) {
    throw new Error( 'Sender and receiver cities are required.' );
  }

  if ( from === to ) {
    throw new Error( 'Sender and receiver cities must be different.' );
  }

  const trackingId = `PKG-${ crypto.randomUUID().replace( /-/g, '' ).slice( 0, 8 ).toUpperCase() }`;

  const pkg: PackageRequest = {
    id: makeId( 'pkg' ),
    trackingId,
    handoffCode: generateHandoffCode(),
    from,
    to,
    weight: sanitizeWeight( input.weight ),
    note: input.note.trim(),
    packageType: input.packageType ?? 'delivery',
    recipientName: input.recipientName?.trim() || undefined,
    recipientPhone: sanitizePhone( input.recipientPhone ),
    matchedRideId: undefined,
    matchedDriver: undefined,
    status: 'searching',
    createdAt: new Date().toISOString(),
    verification: {},
    timeline: buildTimeline( 'searching', undefined, {} ),
  };

  try {
    const { token, userId } = await getAuthDetails();

    if ( API_URL ) {
      const response = await fetchWithRetry( `${ API_URL }/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ token }`,
        },
        body: JSON.stringify( buildServerPackagePayload( pkg ) ),
      } );

      if ( response.ok ) {
        const server = await response.json();
        const created = normalizeServerPackage( server.package as Record<string, unknown>, pkg );
        savePackages( [ created ], getConnectedPackages() );
        void trackGrowthEvent( {
          userId,
          eventName: 'package_request_created',
          funnelStage: created.matchedRideId ? 'selected' : 'searched',
          serviceType: 'package',
          from: created.from,
          to: created.to,
          valueJod: 5,
          metadata: {
            trackingId: created.trackingId,
            packageType: created.packageType,
          },
        } );
        return created;
      }
    } else {
      const createdDirect = await createDirectPackage( {
        userId,
        trackingNumber: pkg.trackingId,
        from: pkg.from,
        to: pkg.to,
        weightKg: parseWeight( pkg.weight ),
        description: pkg.note,
        recipientName: pkg.recipientName,
        recipientPhone: pkg.recipientPhone,
      } );

      const created = normalizeServerPackage( createdDirect as Record<string, unknown>, {
        ...pkg,
        from: String( createdDirect.origin_name ?? pkg.from ),
        to: String( createdDirect.destination_name ?? pkg.to ),
        weight: sanitizeWeight( String( createdDirect.weight_kg ?? pkg.weight ) ),
      } );
      savePackages( [ created ], getConnectedPackages() );
      void trackGrowthEvent( {
        userId,
        eventName: 'package_request_created',
        funnelStage: created.matchedRideId ? 'selected' : 'searched',
        serviceType: 'package',
        from: created.from,
        to: created.to,
        valueJod: 5,
        metadata: {
          trackingId: created.trackingId,
          packageType: created.packageType,
        },
      } );
      return created;
    }
  } catch {
    // Fall back to local storage below.
  }

  const rides = getConnectedRides();
  const matchedRide = findBestMatchingRide( rides, { from, to, weight: input.weight } );
  const fallbackStatus: PackageStatus = matchedRide ? 'matched' : 'searching';
  const fallbackPackage: PackageRequest = {
    ...pkg,
    matchedRideId: matchedRide?.id,
    matchedDriver: matchedRide ? pickDriverName( matchedRide.carModel ) : undefined,
    status: fallbackStatus,
    timeline: buildTimeline( fallbackStatus, matchedRide?.id, pkg.verification ),
  };

  savePackages( [ fallbackPackage ], getConnectedPackages() );
  void trackGrowthEvent( {
    eventName: 'package_request_created',
    funnelStage: fallbackPackage.matchedRideId ? 'selected' : 'searched',
    serviceType: 'package',
    from: fallbackPackage.from,
    to: fallbackPackage.to,
    valueJod: 5,
    metadata: {
      trackingId: fallbackPackage.trackingId,
      packageType: fallbackPackage.packageType,
      source: 'local',
    },
  } );
  return fallbackPackage;
}

async function fetchRemotePackageRecord (
  normalizedTrackingId: string,
): Promise<Record<string, unknown> | null> {
  if ( API_URL ) {
    const response = await fetchWithRetry(
      `${ API_URL }/packages/track/${ encodeURIComponent( normalizedTrackingId ) }`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    if ( !response.ok ) { return null; }
    return ( await response.json() ) as Record<string, unknown>;
  }

  const direct = await getDirectPackageByTrackingId( normalizedTrackingId );
  if ( !direct ) { return null; }
  return {
    ...direct,
    id: direct.id,
    tracking_code: direct.tracking_number,
    from: direct.origin_name ?? direct.origin_location,
    to: direct.destination_name ?? direct.destination_location,
    weight: direct.weight_kg,
    description: direct.description,
    recipient_name: direct.receiver_name,
    recipient_phone: direct.receiver_phone,
  };
}

function buildFallbackPackage (
  server: Record<string, unknown>,
  trackingId: string,
): PackageRequest {
  const tripId = String( server.trip_id ?? '' ).trim() || undefined;
  const status = normalizeStatus( server.status, tripId );

  return {
    id: String( server.id ?? makeId( 'pkg' ) ),
    trackingId,
    handoffCode: generateHandoffCode(),
    from: String( server.from ?? '' ),
    to: String( server.to ?? '' ),
    weight: sanitizeWeight( String( server.weight ?? '<1 kg' ) ),
    note: String( server.description ?? '' ),
    packageType: 'delivery',
    recipientName: String( server.recipient_name ?? '' ).trim() || undefined,
    recipientPhone: sanitizePhone( String( server.recipient_phone ?? '' ) ),
    matchedRideId: tripId,
    matchedDriver: String( server.driver_name ?? '' ).trim() || undefined,
    status,
    createdAt: String( server.created_at ?? new Date().toISOString() ),
    verification: {},
    timeline: buildTimeline( status, tripId, {} ),
  };
}

export async function getPackageByTrackingId ( trackingId: string ): Promise<PackageRequest | null> {
  const normalizedTrackingId = trackingId.trim().toUpperCase();
  if ( !normalizedTrackingId ) { return null; }

  const local =
    getConnectedPackages().find( item => item.trackingId === normalizedTrackingId ) ?? null;
  if ( local ) { return local; }

  try {
    const server = await fetchRemotePackageRecord( normalizedTrackingId );
    if ( !server ) { return null; }

    const fallback = buildFallbackPackage( server, normalizedTrackingId );
    const normalizedPkg = normalizeServerPackage( server, fallback );
    savePackages( [ normalizedPkg ], getConnectedPackages() );
    return normalizedPkg;
  } catch {
    return null;
  }
}

export function getConnectedStats () {
  const rides = getConnectedRides();
  const packages = getConnectedPackages();
  const packageEnabledRides = rides.filter( ride => ride.acceptsPackages ).length;

  return {
    ridesPosted: rides.length,
    packagesCreated: packages.length,
    packageEnabledRides,
    matchedPackages: packages.filter( pkg => Boolean( pkg.matchedRideId ) ).length,
  };
}

export type PackageVerificationAction = 'share_code' | 'confirm_pickup' | 'confirm_delivery';

export function updatePackageVerification (
  trackingId: string,
  action: PackageVerificationAction,
): PackageRequest | null {
  const normalizedTrackingId = trackingId.trim().toUpperCase();
  if ( !normalizedTrackingId ) { return null; }

  const packages = getConnectedPackages();
  const target = packages.find( item => item.trackingId === normalizedTrackingId );
  if ( !target ) { return null; }

  const now = new Date().toISOString();
  const verification: PackageVerification = { ...target.verification };
  let status = target.status;

  if ( action === 'share_code' ) {
    verification.senderCodeSharedAt = verification.senderCodeSharedAt ?? now;
    if ( status === 'searching' && target.matchedRideId ) { status = 'matched'; }
  }

  if ( action === 'confirm_pickup' ) {
    verification.senderCodeSharedAt = verification.senderCodeSharedAt ?? now;
    verification.riderPickupConfirmedAt = verification.riderPickupConfirmedAt ?? now;
    status = 'in_transit';
  }

  if ( action === 'confirm_delivery' ) {
    verification.senderCodeSharedAt = verification.senderCodeSharedAt ?? now;
    verification.riderPickupConfirmedAt = verification.riderPickupConfirmedAt ?? now;
    verification.receiverDeliveryConfirmedAt = verification.receiverDeliveryConfirmedAt ?? now;
    status = 'delivered';
  }

  const updated: PackageRequest = {
    ...target,
    status,
    verification,
    timeline: buildTimeline( status, target.matchedRideId, verification ),
  };

  savePackages( packages.map( item => ( item.trackingId === normalizedTrackingId ? updated : item ) ) );

  void updateDirectPackageStatus(
    normalizedTrackingId,
    status === 'searching' ? 'matched' : status,
  ).catch( () => { } );

  void trackGrowthEvent( {
    eventName: 'package_verification_updated',
    funnelStage:
      status === 'delivered' ? 'completed' : status === 'in_transit' ? 'booked' : 'selected',
    serviceType: 'package',
    from: updated.from,
    to: updated.to,
    metadata: {
      trackingId: updated.trackingId,
      action,
      status,
    },
  } );

  return updated;
}
