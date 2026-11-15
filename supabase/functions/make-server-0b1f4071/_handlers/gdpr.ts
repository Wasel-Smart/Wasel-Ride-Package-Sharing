import {
    json,
    authenticateRequest,
    getAdminClient,
} from './shared.ts';

const ALLOWED_CONSENT_TYPES = new Set( [ 'terms', 'privacy', 'marketing', 'analytics', 'cookies' ] );

async function readJsonObject ( request: Request ): Promise<Record<string, unknown> | null> {
  const value: unknown = await request.json().catch( () => null );
  return value && typeof value === 'object' && !Array.isArray( value )
    ? value as Record<string, unknown>
    : null;
}

export async function handleRecordConsent ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const body = await readJsonObject( request );
  if ( !body ) {return json( { error: 'A valid consent request is required.' }, 400 );}
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) {return json( { error: 'Unauthorized' }, 403 );}
  const consentType = String( body.consentType ?? '' );
  if ( !ALLOWED_CONSENT_TYPES.has( consentType ) || typeof body.granted !== 'boolean' ) {
    return json( { error: 'A supported consent type and boolean decision are required.' }, 400 );
  }

  const { error } = await auth.admin.from( 'user_consents' ).insert( {
    user_id: userId,
    consent_type: consentType,
    granted: body.granted,
    ip_address: null,
    user_agent: request.headers.get( 'user-agent' )?.slice( 0, 500 ) ?? null,
    created_at: new Date().toISOString(),
  } );

  if ( error ) {
    console.error( '[gdpr] consent write failed', { code: error.code ?? 'unknown' } );
    return json( { error: 'Your consent choice could not be saved. Please try again.' }, 500 );
  }
  return json( { ok: true }, 201 );
}

export async function handleGetConsent ( request: Request, path: string ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const url = new URL( request.url );
  const pathUserId = path.split( '/' )[ 3 ] ?? auth.canonicalUser.id;
  const userId = pathUserId || auth.canonicalUser.id;
  if ( userId !== auth.canonicalUser.id ) {return json( { error: 'Unauthorized' }, 403 );}

  const consentType = url.searchParams.get( 'consentType' ) ?? '';
  if ( !ALLOWED_CONSENT_TYPES.has( consentType ) ) {
    return json( { error: 'A supported consent type is required.' }, 400 );
  }
  const { data, error } = await auth.admin
    .from( 'user_consents' )
    .select( 'granted' )
    .eq( 'user_id', userId )
    .eq( 'consent_type', consentType )
    .order( 'created_at', { ascending: false } )
    .limit( 1 )
    .maybeSingle();

  if ( error ) {
    console.error( '[gdpr] consent read failed', { code: error.code ?? 'unknown' } );
    return json( { error: 'Your consent choices could not be loaded. Please try again.' }, 500 );
  }
  return json( { granted: Boolean( data?.granted ) } );
}

export async function handleRequestDataExport ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const body = await readJsonObject( request );
  if ( !body ) {return json( { error: 'A valid export request is required.' }, 400 );}
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) {return json( { error: 'Unauthorized' }, 403 );}

  const requestedAt = Date.now();
  const [ profile, bookings, packages, transactions, consents ] = await Promise.all( [
    auth.admin.from( 'users' ).select( 'id, auth_user_id, email, phone_number, full_name, role, verification_level, phone_verified_at, profile_status, updated_at' ).eq( 'id', userId ).maybeSingle(),
    auth.admin.from( 'ride_bookings' ).select( '*' ).eq( 'passenger_id', userId ),
    auth.admin.from( 'packages' ).select( '*' ).eq( 'sender_id', userId ),
    auth.admin.from( 'wallet_transactions' ).select( '*' ).eq( 'user_id', userId ),
    auth.admin.from( 'user_consents' ).select( '*' ).eq( 'user_id', userId ),
  ] );

  const firstError = [ profile, bookings, packages, transactions, consents ].find( ( result ) => result.error )?.error;
  if ( firstError ) {
    console.error( '[gdpr] export data read failed', { code: firstError.code ?? 'unknown' } );
    return json( { error: 'Your data export could not be prepared. Please try again.' }, 500 );
  }

  const exportData = {
    exportDate: new Date( requestedAt ).toISOString(),
    userId,
    profile: profile.data,
    bookings: bookings.data,
    packages: packages.data,
    transactions: transactions.data,
    consents: consents.data,
  };
  const exportJson = JSON.stringify( exportData );
  // Keep export payloads in the private bucket; persist only the storage path,
  // never the payload or a bearer download URL in the request table.
  const storagePath = `exports/${ userId }/${ requestedAt }.json`;
  const admin = getAdminClient();
  const { error: uploadError } = await admin.storage
    .from( 'gdpr-exports' )
    .upload( storagePath, new Blob( [ exportJson ], { type: 'application/json' } ), {
      upsert: true,
      contentType: 'application/json',
    } );
  if ( uploadError ) {
    console.error( '[gdpr] export upload failed', { code: uploadError.name ?? 'unknown' } );
    return json( { error: 'Your data export could not be stored. Please try again.' }, 503 );
  }
  const { data: signedDownload, error: signedUrlError } = await admin.storage
    .from( 'gdpr-exports' )
    .createSignedUrl( storagePath, 10 * 60 );
  if ( signedUrlError || !signedDownload?.signedUrl ) {
    await admin.storage.from( 'gdpr-exports' ).remove( [ storagePath ] );
    console.error( '[gdpr] export link creation failed', { code: signedUrlError?.name ?? 'unknown' } );
    return json( { error: 'Your export link could not be created. Please try again.' }, 503 );
  }

  const expiresAt = Date.now() + 10 * 60 * 1000;

  const { error } = await auth.admin.from( 'data_export_requests' ).insert( {
    user_id: userId,
    requested_at: new Date( requestedAt ).toISOString(),
    status: 'completed',
    download_url: storagePath,
    completed_at: new Date().toISOString(),
    expires_at: new Date( expiresAt ).toISOString(),
  } );

  if ( error ) {
    await admin.storage.from( 'gdpr-exports' ).remove( [ storagePath ] );
    return json( { error: 'Your export request could not be completed. Please try again.' }, 500 );
  }
  return json( {
    userId,
    requestedAt,
    completedAt: Date.now(),
    downloadUrl: signedDownload.signedUrl,
    expiresAt,
  } );
}

export async function handleRequestDeletion ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const body = await readJsonObject( request );
  if ( !body ) {return json( { error: 'A valid deletion request is required.' }, 400 );}
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) {return json( { error: 'Unauthorized' }, 403 );}

  const requestedAt = Date.now();
  const scheduledFor = requestedAt + 30 * 24 * 60 * 60 * 1000;
  if ( body.reason !== undefined && body.reason !== null && typeof body.reason !== 'string' ) {
    return json( { error: 'The deletion reason must be text.' }, 400 );
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim().slice( 0, 500 ) || null : null;
  const { error } = await auth.admin.from( 'data_deletion_requests' ).insert( {
    user_id: userId,
    requested_at: new Date( requestedAt ).toISOString(),
    scheduled_for: new Date( scheduledFor ).toISOString(),
    reason,
    status: 'pending',
  } );

  if ( error?.code === '23505' ) {
    return json( { error: 'A deletion request is already pending.' }, 409 );
  }
  if ( error ) {return json( { error: 'Your deletion request could not be saved. Please try again.' }, 500 );}
  return json( { userId, requestedAt, scheduledFor, reason } );
}

export async function handleCancelDeletion ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const body = await readJsonObject( request );
  if ( !body ) {return json( { error: 'A valid deletion request is required.' }, 400 );}
  const userId = String( body.userId ?? auth.canonicalUser.id );
  if ( userId !== auth.canonicalUser.id ) {return json( { error: 'Unauthorized' }, 403 );}

  const { error } = await auth.admin
    .from( 'data_deletion_requests' )
    .update( { status: 'cancelled' } )
    .eq( 'user_id', userId )
    .eq( 'status', 'pending' );

  if ( error ) {return json( { error: error.message }, 500 );}
  return json( { ok: true } );
}
