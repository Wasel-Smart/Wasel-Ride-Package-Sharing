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

async function handleGetTrustStatus ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const status = await buildTrustStatus( auth );
  return json( { status } );
}

async function handleStartPhoneVerification ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const phoneNumber = normalizePhoneNumber( body.phoneNumber );
  if ( !isValidE164Phone( phoneNumber ) ) {
    return json( { error: 'Enter a valid E.164 phone number such as +962791234567.' }, 400 );
  }

  const { data: existingPhoneOwner, error: phoneOwnerError } = await auth.admin
    .from( 'users' )
    .select( 'id' )
    .eq( 'phone_number', phoneNumber )
    .neq( 'id', auth.canonicalUser.id )
    .maybeSingle();
  if ( phoneOwnerError ) {
    return json( { error: phoneOwnerError.message }, 500 );
  }
  if ( existingPhoneOwner ) {
    return json( { error: PHONE_NUMBER_IN_USE_MESSAGE }, 409 );
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + PHONE_VERIFICATION_TTL_MINUTES * 60 * 1000,
  ).toISOString();
  const useTwilioVerify = hasTwilioVerifyRuntime();
  const code = useTwilioVerify ? null : generateOtpCode();
  const otpHash = useTwilioVerify ? `twilio-verify:${ TWILIO_VERIFY_SERVICE_SID }` : await hashOtpCode( code ?? '' );

  const { error: invalidateError } = await auth.admin
    .from( 'otp_sessions' )
    .update( { consumed_at: now } )
    .eq( 'user_id', auth.canonicalUser.id )
    .eq( 'purpose', 'driver_action' )
    .is( 'consumed_at', null );
  if ( invalidateError ) {
    return json( { error: invalidateError.message }, 500 );
  }

  const { error: userError } = await auth.admin
    .from( 'users' )
    .update( {
      phone_number: phoneNumber,
      phone_verified_at: null,
    } )
    .eq( 'id', auth.canonicalUser.id );
  if ( userError ) {
    if ( isPhoneNumberUniqueViolation( userError ) ) {
      return json( { error: PHONE_NUMBER_IN_USE_MESSAGE }, 409 );
    }

    return json( { error: userError.message }, 500 );
  }

  const { data: otpSession, error: otpError } = await auth.admin
    .from( 'otp_sessions' )
    .insert( {
      user_id: auth.canonicalUser.id,
      phone_number: phoneNumber,
      purpose: 'driver_action',
      otp_hash: otpHash,
      attempts: 0,
      max_attempts: 5,
      expires_at: expiresAt,
    } )
    .select( 'otp_session_id' )
    .single();
  if ( otpError ) {
    return json( { error: otpError.message }, 500 );
  }

  if ( useTwilioVerify ) {
    const verifyResult = await startTwilioPhoneVerification( phoneNumber );
    if ( !verifyResult.ok ) {
      await auth.admin.from( 'otp_sessions' ).delete().eq( 'otp_session_id', otpSession.otp_session_id );
      return json(
        {
          error:
            verifyResult.error ??
            'Phone verification could not be delivered. Check Twilio Verify configuration.',
        },
        502,
      );
    }

    return json(
      {
        started: true,
        phoneNumber,
        expiresAt,
        provider: 'twilio_verify',
      },
      202,
    );
  }

  const message = `Your Wasel verification code is ${ code }. It expires in ${ PHONE_VERIFICATION_TTL_MINUTES } minutes.`;
  const deliveryRow = {
    user_id: auth.canonicalUser.id,
    channel: 'sms',
    delivery_status: 'queued',
    destination: phoneNumber,
    subject: 'Wasel phone verification',
    payload: {
      body: message,
      metadata: {
        category: 'trust_phone_verification',
      },
    },
    provider_name: determineProviderName( 'sms' ),
    queued_at: now,
    updated_at: now,
    idempotency_key: buildIdempotencyKey( {
      deliveryId: `phone-verification-${ otpSession.otp_session_id }`,
      channel: 'sms',
      destination: phoneNumber,
      body: message,
    } ),
  };

  const { data: delivery, error: deliveryError } = await auth.admin
    .from( 'communication_deliveries' )
    .insert( deliveryRow )
    .select( '*' )
    .single();
  if ( deliveryError ) {
    await auth.admin.from( 'otp_sessions' ).delete().eq( 'otp_session_id', otpSession.otp_session_id );
    return json( { error: deliveryError.message }, 500 );
  }

  const deliveryResult = await sendDelivery( auth.admin, delivery, getFunctionBaseUrl( request ) );
  if ( !deliveryResult.ok ) {
    await auth.admin.from( 'otp_sessions' ).delete().eq( 'otp_session_id', otpSession.otp_session_id );
    return json(
      {
        error:
          deliveryResult.error ??
          'Phone verification could not be delivered. Check SMS provider configuration.',
      },
      502,
    );
  }

  return json(
    {
      started: true,
      phoneNumber,
      expiresAt,
      provider: 'twilio_sms',
    },
    202,
  );
}

async function handleConfirmPhoneVerification ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const code = String( body.code ?? '' ).trim();
  if ( !/^\d{6}$/.test( code ) ) {
    return json( { error: 'Enter the 6-digit verification code.' }, 400 );
  }

  const { data: otpSession, error: otpError } = await auth.admin
    .from( 'otp_sessions' )
    .select(
      'otp_session_id, phone_number, otp_hash, attempts, max_attempts, expires_at, consumed_at',
    )
    .eq( 'user_id', auth.canonicalUser.id )
    .eq( 'purpose', 'driver_action' )
    .order( 'created_at', { ascending: false } )
    .limit( 1 )
    .maybeSingle();
  if ( otpError ) {
    return json( { error: otpError.message }, 500 );
  }
  if ( !otpSession || otpSession.consumed_at ) {
    return json( { error: 'Start phone verification before entering a code.' }, 400 );
  }
  if ( isExpired( otpSession.expires_at ) ) {
    return json( { error: 'That verification code expired. Send a new one.' }, 400 );
  }

  const attempts = Number( otpSession.attempts ?? 0 );
  const maxAttempts = Number( otpSession.max_attempts ?? 5 );
  if ( attempts >= maxAttempts ) {
    return json( { error: 'Too many incorrect attempts. Send a new code.' }, 429 );
  }

  const nextAttempts = attempts + 1;
  const usesTwilioVerify = String( otpSession.otp_hash ?? '' ).startsWith( 'twilio-verify:' );
  let isCodeValid = false;
  let verificationError = 'That verification code is incorrect.';
  let verificationErrorStatus = 400;

  if ( usesTwilioVerify ) {
    const verifyResult = await checkTwilioPhoneVerification( otpSession.phone_number, code );
    isCodeValid = verifyResult.ok;
    if ( !verifyResult.ok ) {
      verificationError = verifyResult.error;
      verificationErrorStatus = verifyResult.retryable ? 400 : 502;
    }
  } else {
    const hashedCode = await hashOtpCode( code );
    isCodeValid = constantTimeEqual( hashedCode, String( otpSession.otp_hash ?? '' ) );
  }

  if ( !isCodeValid ) {
    const { error: attemptError } = await auth.admin
      .from( 'otp_sessions' )
      .update( { attempts: nextAttempts } )
      .eq( 'otp_session_id', otpSession.otp_session_id );
    if ( attemptError ) {
      return json( { error: attemptError.message }, 500 );
    }

    return json(
      {
        error:
          nextAttempts >= maxAttempts
            ? 'Too many incorrect attempts. Send a new code.'
            : verificationError,
      },
      verificationErrorStatus,
    );
  }

  const now = new Date().toISOString();
  const { error: consumeError } = await auth.admin
    .from( 'otp_sessions' )
    .update( {
      attempts: nextAttempts,
      consumed_at: now,
    } )
    .eq( 'otp_session_id', otpSession.otp_session_id );
  if ( consumeError ) {
    return json( { error: consumeError.message }, 500 );
  }

  const nextVerificationLevel =
    String( auth.canonicalUser.verification_level ?? 'level_0' ) === 'level_0'
      ? 'level_1'
      : auth.canonicalUser.verification_level;
  const { error: userError } = await auth.admin
    .from( 'users' )
    .update( {
      phone_number: otpSession.phone_number,
      phone_verified_at: now,
      verification_level: nextVerificationLevel,
    } )
    .eq( 'id', auth.canonicalUser.id );
  if ( userError ) {
    if ( isPhoneNumberUniqueViolation( userError ) ) {
      return json( { error: PHONE_NUMBER_IN_USE_MESSAGE }, 409 );
    }

    return json( { error: userError.message }, 500 );
  }

  return json( {
    verified: true,
    phoneNumber: otpSession.phone_number,
  } );
}