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

async function handleGetChatMessages ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const tripId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  if ( !( await assertTripParticipant( auth.admin, tripId, auth.canonicalUser.id ) ) ) {
    return json( { error: 'Not authorized to read messages in this trip' }, 403 );
  }

  const limit = Math.min( Number( new URL( request.url ).searchParams.get( 'limit' ) ?? 50 ), 100 );
  const { data, error } = await auth.admin
    .from( 'messages' )
    .select( 'id, trip_id, sender_id, content, type, metadata, read_by, created_at, sender:profiles(id, full_name, avatar_url)' )
    .eq( 'trip_id', tripId )
    .order( 'created_at', { ascending: false } )
    .limit( limit );

  if ( error ) return json( { error: error.message }, 500 );
  return json( { messages: ( data ?? [] ).reverse() } );
}

async function handleSendChatMessage ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const tripId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  if ( !( await assertTripParticipant( auth.admin, tripId, auth.canonicalUser.id ) ) ) {
    return json( { error: 'Not authorized to send messages in this trip' }, 403 );
  }

  const body = await request.json();
  const content = String( body.content ?? '' ).trim();
  if ( !content ) return json( { error: 'Message content is required' }, 400 );

  const { data, error } = await auth.admin
    .from( 'messages' )
    .insert( {
      trip_id: tripId,
      sender_id: auth.canonicalUser.id,
      content,
      type: body.type === 'location' || body.type === 'system' ? body.type : 'text',
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
      read_by: [ auth.canonicalUser.id ],
    } )
    .select( 'id, trip_id, sender_id, content, type, metadata, read_by, created_at, sender:profiles(id, full_name, avatar_url)' )
    .single();

  if ( error ) return json( { error: error.message }, 500 );
  return json( { message: data }, 201 );
}

async function handleMarkChatMessagesRead ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const body = await request.json();
  const messageIds = Array.isArray( body.messageIds ) ? body.messageIds.map( String ).filter( Boolean ) : [];
  if ( messageIds.length === 0 ) return json( { ok: true } );

  const { data: messages, error } = await auth.admin
    .from( 'messages' )
    .select( 'id, read_by' )
    .in( 'id', messageIds );

  if ( error ) return json( { error: error.message }, 500 );

  for ( const message of messages ?? [] ) {
    const readBy = Array.isArray( message.read_by ) ? message.read_by : [];
    if ( readBy.includes( auth.canonicalUser.id ) ) continue;
    const { error: updateError } = await auth.admin
      .from( 'messages' )
      .update( { read_by: [ ...readBy, auth.canonicalUser.id ] } )
      .eq( 'id', message.id );
    if ( updateError ) return json( { error: updateError.message }, 500 );
  }

  return json( { ok: true } );
}

async function handleGetChatUnreadCount ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( auth.error ) return auth.error;

  const tripId = decodeURIComponent( path.split( '/' )[ 3 ] ?? '' );
  if ( !( await assertTripParticipant( auth.admin, tripId, auth.canonicalUser.id ) ) ) {
    return json( { count: 0 } );
  }

  const { data, error } = await auth.admin
    .from( 'messages' )
    .select( 'id, read_by' )
    .eq( 'trip_id', tripId );

  if ( error ) return json( { error: error.message }, 500 );

  const count = ( data ?? [] ).filter( ( message: Record<string, unknown> ) => {
    const readBy = Array.isArray( message.read_by ) ? message.read_by : [];
    return !readBy.includes( auth.canonicalUser.id );
  } ).length;

  return json( { count } );
}