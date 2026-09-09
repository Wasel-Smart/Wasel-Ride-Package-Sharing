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

async function handleProfileRequest ( request: Request, path: string ) {
  const auth = await authenticateAuthUser( request );
  if ( 'error' in auth ) return auth.error;

  const profileRoute = parseEntityRoute( path, 'profile' );
  const body = request.method === 'GET' ? {} : await request.json().catch( () => ( {} ) );
  const user = await ensureCanonicalUserForAuth(
    auth.admin,
    auth.authUser as unknown as Record<string, unknown>,
    body,
  );
  const requestedUserId = profileRoute?.id ?? String( user.id );

  if ( requestedUserId !== String( user.id ) && requestedUserId !== String( user.auth_user_id ) ) {
    return json( { error: 'Profile route is not authorized for this user.' }, 403 );
  }

  if ( request.method === 'POST' ) {
    return json( await buildProfilePayload( auth.admin, user ) );
  }

  if ( request.method === 'PATCH' ) {
    // Only the authenticated user's own, non-privileged profile fields may be
    // updated here. Privileged fields (role, verification_level) and wallet
    // mutations require an admin caller and are enforced server-side — a normal
    // user can NEVER escalate privileges or credit their own wallet.
    const resolvedRole = resolveAccessRole( user.role );
    const canWriteUsers = hasPermission( resolvedRole, 'users:write' );

    const patch: Record<string, unknown> = {};
    if ( typeof body.email === 'string' ) patch.email = body.email.trim();
    if ( typeof body.full_name === 'string' ) patch.full_name = body.full_name.trim();
    if ( typeof body.phone_number === 'string' ) patch.phone_number = body.phone_number.trim();
    if ( typeof body.phone === 'string' ) patch.phone_number = body.phone.trim();
    if ( typeof body.avatar_url === 'string' ) patch.avatar_url = body.avatar_url;

    // Changing a number must never retain verification from the old number.
    // The verification workflow is the only route that can set this timestamp.
    if (
      typeof patch.phone_number === 'string' &&
      patch.phone_number !== String( user.phone_number ?? '' ).trim()
    ) {
      patch.phone_verified_at = null;
    }

    if ( canWriteUsers ) {
      if ( typeof body.role === 'string' ) {
        const normalizedRole = body.role.toLowerCase();
        if ( [ 'passenger', 'driver', 'operator', 'admin' ].includes( normalizedRole ) ) {
          patch.role = normalizedRole;
        }
      }
      if ( typeof body.verification_level === 'string' ) {
        patch.verification_level = body.verification_level;
      }
    }

    if ( Object.keys( patch ).length > 0 ) {
      const { error } = await auth.admin.from( 'users' ).update( patch ).eq( 'id', user.id );
      if ( error ) return json( { error: error.message }, 500 );
    }

    // Wallet balance is NEVER mutated through this endpoint. Balance changes
    // must originate from verified payment webhooks / atomic wallet RPCs only.
    // An admin may adjust wallet_status; no raw balance writes are accepted.
    if ( canWriteUsers && typeof body.wallet_status === 'string' ) {
      const walletPatch: Record<string, unknown> = { wallet_status: body.wallet_status };
      await auth.admin.from( 'wallets' ).update( walletPatch ).eq( 'user_id', user.id );
    }
  }

  const { data: nextUser, error } = await auth.admin.from( 'users' ).select( '*' ).eq( 'id', user.id ).single();
  if ( error ) return json( { error: error.message }, 500 );
  return json( await buildProfilePayload( auth.admin, nextUser ) );
}

async function handleTwoFactorSetup ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const label = auth.canonicalUser.email || auth.authUser.email || auth.canonicalUser.id;
  const secret = generateTOTPSecret();
  const backupCodes = generateBackupCodes( 10 );
  const backupCodeHashes = await hashBackupCodes( backupCodes );

  const { error } = await auth.admin
    .from( 'users' )
    .update( {
      two_factor_enabled: false,
      two_factor_secret: secret,
      two_factor_backup_codes: backupCodeHashes,
    } )
    .eq( 'id', auth.canonicalUser.id );

  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  return json( {
    setup: {
      secret,
      qrCode: generateQRCode( secret, label ),
      backupCodes,
    },
    pendingVerification: true,
  } );
}

async function handleTwoFactorVerify ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const code = typeof body.code === 'string' ? body.code : '';
  if ( !code.trim() ) {
    return json( { error: 'Verification code is required' }, 400 );
  }

  const { data: userRow, error } = await auth.admin
    .from( 'users' )
    .select( 'two_factor_secret, two_factor_backup_codes, two_factor_enabled' )
    .eq( 'id', auth.canonicalUser.id )
    .single();

  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  const result = await verifyTwoFactorChallenge( {
    secret: userRow.two_factor_secret,
    code,
    backupCodeHashes: userRow.two_factor_backup_codes,
    allowBackupCode: false,
  } );

  if ( !result.ok ) {
    return json( { valid: false }, 401 );
  }

  const normalizedCodeHash = result.usedBackupCode ? await hashBackupCode( code ) : null;
  const nextBackupCodes = result.usedBackupCode
    ? ( userRow.two_factor_backup_codes ?? [] ).filter( ( hashed: string ) => hashed !== normalizedCodeHash )
    : userRow.two_factor_backup_codes;

  const { error: updateError } = await auth.admin
    .from( 'users' )
    .update( {
      two_factor_enabled: true,
      two_factor_backup_codes: nextBackupCodes,
    } )
    .eq( 'id', auth.canonicalUser.id );

  if ( updateError ) {
    return json( { error: updateError.message }, 500 );
  }

  return json( {
    valid: true,
    enabled: true,
    usedBackupCode: result.usedBackupCode,
  } );
}

async function handleTwoFactorDisable ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const code = typeof body.code === 'string' ? body.code : '';
  if ( !code.trim() ) {
    return json( { error: 'Verification code is required' }, 400 );
  }

  const { data: userRow, error } = await auth.admin
    .from( 'users' )
    .select( 'two_factor_secret, two_factor_backup_codes' )
    .eq( 'id', auth.canonicalUser.id )
    .single();

  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  const result = await verifyTwoFactorChallenge( {
    secret: userRow.two_factor_secret,
    code,
    backupCodeHashes: userRow.two_factor_backup_codes,
    allowBackupCode: true,
  } );

  if ( !result.ok ) {
    return json( { valid: false }, 401 );
  }

  const { error: updateError } = await auth.admin
    .from( 'users' )
    .update( {
      two_factor_enabled: false,
      two_factor_secret: null,
      two_factor_backup_codes: null,
    } )
    .eq( 'id', auth.canonicalUser.id );

  if ( updateError ) {
    return json( { error: updateError.message }, 500 );
  }

  return json( { disabled: true } );
}

async function handleSubmitIdentityVerification ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const providerReference = String( body.providerReference ?? '' ).trim();
  const documentReference = String( body.documentReference ?? '' ).trim() || null;
  if ( providerReference.length < 4 ) {
    return json( { error: 'Enter the Sanad reference before submitting verification.' }, 400 );
  }

  const latestStatus = await buildTrustStatus( auth );
  if ( latestStatus?.steps.identity.state === 'in_progress' ) {
    return json( { error: 'Identity verification is already under review.' }, 409 );
  }

  const { data, error } = await auth.admin.rpc( 'app_submit_sanad_verification', {
    p_user_id: auth.canonicalUser.id,
    p_provider_reference: providerReference,
    p_document_reference: documentReference,
  } );
  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  let providerSubmission: Awaited<ReturnType<typeof submitSanadVerificationRequest>>;
  try {
    providerSubmission = await submitSanadVerificationRequest( {
      userId: auth.canonicalUser.id,
      providerReference,
      documentReference,
    } );
  } catch ( submissionError ) {
    return json( { error: submissionError instanceof Error ? submissionError.message : String( submissionError ) }, 502 );
  }

  return json(
    {
      submitted: true,
      verificationId: String( data ?? '' ),
      providerSubmitted: providerSubmission.submittedToProvider,
    },
    202,
  );
}

async function handleEnableDriverMode ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const { error } = await auth.admin
    .from( 'users' )
    .update( {
      role: 'driver',
    } )
    .eq( 'id', auth.canonicalUser.id );
  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  return json( {
    enabled: true,
    role: 'driver',
  } );
}

async function handleSubmitDriverDocuments ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  if ( String( auth.canonicalUser.role ?? 'passenger' ) !== 'driver' ) {
    return json( { error: 'Enable Driver mode before submitting driver documents.' }, 400 );
  }

  const body = await request.json().catch( () => ( {} ) );
  const licenseNumber = String( body.licenseNumber ?? '' ).trim();
  const documentReference = String( body.documentReference ?? '' ).trim() || null;
  if ( licenseNumber.length < 4 ) {
    return json( { error: 'Enter the driver license number before submitting.' }, 400 );
  }

  const { data: existingDriver, error: driverLookupError } = await auth.admin
    .from( 'drivers' )
    .select( 'driver_id, verification_level' )
    .eq( 'user_id', auth.canonicalUser.id )
    .maybeSingle();
  if ( driverLookupError ) {
    return json( { error: driverLookupError.message }, 500 );
  }

  const baseDriverPatch = {
    license_number: licenseNumber,
    driver_status: 'pending_approval',
    background_check_status: 'pending',
    verification_level: String( auth.canonicalUser.verification_level ?? 'level_0' ),
    sanad_identity_linked:
      String( auth.canonicalUser.verification_level ?? 'level_0' ) === 'level_2' ||
      String( auth.canonicalUser.verification_level ?? 'level_0' ) === 'level_3' ||
      String( auth.canonicalUser.sanad_verified_status ?? 'unverified' ) === 'verified',
  };

  let driverId = String( existingDriver?.driver_id ?? '' );
  if ( existingDriver?.driver_id ) {
    const { error: updateDriverError } = await auth.admin
      .from( 'drivers' )
      .update( baseDriverPatch )
      .eq( 'driver_id', existingDriver.driver_id );
    if ( updateDriverError ) {
      return json( { error: updateDriverError.message }, 500 );
    }
  } else {
    const { data: insertedDriver, error: insertDriverError } = await auth.admin
      .from( 'drivers' )
      .insert( {
        user_id: auth.canonicalUser.id,
        ...baseDriverPatch,
      } )
      .select( 'driver_id' )
      .single();
    if ( insertDriverError ) {
      return json( { error: insertDriverError.message }, 500 );
    }
    driverId = String( insertedDriver.driver_id ?? '' );
  }

  const sanadStatus = String( auth.canonicalUser.sanad_verified_status ?? 'unverified' );
  const { error: verificationError } = await auth.admin.from( 'verification_records' ).insert( {
    user_id: auth.canonicalUser.id,
    sanad_status:
      sanadStatus === 'verified' ||
        sanadStatus === 'pending' ||
        sanadStatus === 'rejected' ||
        sanadStatus === 'expired'
        ? sanadStatus
        : 'unverified',
    document_status: 'pending',
    verification_level: String( auth.canonicalUser.verification_level ?? 'level_0' ),
    provider_reference: 'driver_documents',
    document_reference: documentReference,
    failure_reason: null,
  } );
  if ( verificationError ) {
    return json( { error: verificationError.message }, 500 );
  }

  return json(
    {
      submitted: true,
      driverId,
    },
    202,
  );
}