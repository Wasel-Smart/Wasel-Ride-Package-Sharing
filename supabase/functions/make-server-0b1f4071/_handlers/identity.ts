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
