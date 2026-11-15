import {
  type AdminClient,
  json,
  authenticateRequest,
  buildTrustStatus,
  PHONE_NUMBER_IN_USE_MESSAGE,
  PHONE_VERIFICATION_TTL_MINUTES,
  TWILIO_VERIFY_SERVICE_SID,
  checkTwilioPhoneVerification,
  constantTimeEqual,
  generateOtpCode,
  hasTwilioVerifyRuntime,
  hashOtpCode,
  isExpired,
  isPhoneNumberUniqueViolation,
  sendTwilioOtpSms,
  startTwilioPhoneVerification,
} from './shared.ts';

import {
  isValidE164Phone,
  normalizePhoneNumber,
} from '../_shared/phone.ts';

const PHONE_ACTION_UNAVAILABLE_MESSAGE =
  'Phone verification is temporarily unavailable. Please try again.';

/**
 * A provider outage, a DNS failure or any other escaped exception must not reach
 * the top-level handler in index.ts: that catch rewrites everything into a 500
 * "Internal server error" with no diagnostic detail, which is what surfaced to
 * the user. Logging the real cause and answering with a typed 502 keeps phone
 * verification failures actionable and keeps the retry semantics correct.
 */
function logPhoneActionFailure ( route: string, error: unknown ): void {
  console.error( '[Edge] phone verification action failed', {
    route,
    message: error instanceof Error ? error.message : String( error ),
  } );
}

function phoneActionUnavailable ( route: string, error: unknown ): Response {
  logPhoneActionFailure( route, error );

  return json( { error: PHONE_ACTION_UNAVAILABLE_MESSAGE }, 502 );
}

/**
 * The number is written to the profile before the code is delivered so the UI can
 * show it. If delivery then fails the pending number must be rolled back,
 * otherwise a failed attempt silently destroys a number the user had already
 * verified.
 */
async function restorePhoneAfterFailedDelivery (
  admin: AdminClient,
  userId: string,
  previousPhoneNumber: string | null,
  previousPhoneVerifiedAt: string | null,
): Promise<void> {
  if ( !previousPhoneNumber ) {return;}

  const { error } = await admin
    .from( 'users' )
    .update({ phone_number: previousPhoneNumber, phone_verified_at: previousPhoneVerifiedAt })
    .eq( 'id', userId );
  if ( error ) {
    console.error( '[Edge] phone rollback after failed delivery', error.message );
  }
}


export async function handleGetTrustStatus ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  try {
    const status = await buildTrustStatus( auth );
    return json( { status } );
  } catch ( error ) {
    logPhoneActionFailure( 'trust/status', error );

    return json( { error: 'Trust Center status is temporarily unavailable.' }, 502 );
  }
}

export async function handleStartPhoneVerification ( request: Request ) {
  try {
    return await startPhoneVerification( request );
  } catch ( error ) {
    return phoneActionUnavailable( 'trust/phone/start', error );
  }
}

async function startPhoneVerification ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const body = await request.json().catch( () => ( {} ) );
  const phoneNumber = normalizePhoneNumber( body.phoneNumber );
  const requestedChannel = body.channel === 'whatsapp' ? 'whatsapp' : 'sms';
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

  const previousPhoneNumber = auth.canonicalUser.phone_number;
  const previousPhoneVerifiedAt = auth.canonicalUser.phone_verified_at;

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
    const verifyResult = await startTwilioPhoneVerification( phoneNumber, requestedChannel );
    if ( !verifyResult.ok ) {
      await auth.admin.from( 'otp_sessions' ).delete().eq( 'otp_session_id', otpSession.otp_session_id );
      await restorePhoneAfterFailedDelivery(
        auth.admin,
        auth.canonicalUser.id,
        previousPhoneNumber,
        previousPhoneVerifiedAt,
      );

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
        channel: requestedChannel,
        provider: 'twilio_verify',
      },
      202,
    );
  }

  const smsResult = await sendTwilioOtpSms( phoneNumber, code ?? '' );
  if ( !smsResult.ok ) {
    await auth.admin.from( 'otp_sessions' ).delete().eq( 'otp_session_id', otpSession.otp_session_id );
    return json(
      {
        error:
          smsResult.error ??
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

// eslint-disable-next-line complexity
export async function handleConfirmPhoneVerification ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

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
  let isCodeValid: boolean;
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
