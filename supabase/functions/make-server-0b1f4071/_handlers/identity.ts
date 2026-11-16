import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
    json,
    authenticateRequest,
    authenticateAuthUser,
    ensureCanonicalUserForAuth,
    buildProfilePayload,
    parseEntityRoute,
} from './shared.ts';

import { isHighPrivilegeRole, resolveAccessRole } from '../_shared/rbac.ts';
import { satisfiesRequiredAal } from '../_shared/auth-assurance.ts';

import {
  generateBackupCodes,
  generateQRCode,
  generateTOTPSecret,
  hashBackupCode,
  hashBackupCodes,
  verifyTwoFactorChallenge,
} from '../_shared/two-factor-runtime.ts';


export async function handleProfileRequest ( request: Request, path: string ) {
  const auth = await authenticateAuthUser( request );
  if ( 'error' in auth ) {return auth.error;}

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
    if (isHighPrivilegeRole(resolvedRole)) {
      const { data: claimsData, error: claimsError } = await auth.admin.auth.getClaims(auth.token);
      if (claimsError) {
        console.error('[auth] privileged assurance verification failed', claimsError.message);
        return json(
          { error: 'Unable to verify privileged authentication. Please try again.' },
          503,
        );
      }
      if (!satisfiesRequiredAal(true, claimsData?.claims.aal)) {
        return json(
          { error: 'Multi-factor authentication is required', code: 'AAL2_REQUIRED' },
          403,
        );
      }
    }
    const isAdmin = resolvedRole === 'admin';

    const patch: Record<string, unknown> = {};
    if ( typeof body.email === 'string' ) {patch.email = body.email.trim();}
    if ( typeof body.full_name === 'string' ) {patch.full_name = body.full_name.trim();}
    if ( typeof body.phone_number === 'string' ) {patch.phone_number = body.phone_number.trim();}
    if ( typeof body.phone === 'string' ) {patch.phone_number = body.phone.trim();}
    if ( typeof body.avatar_url === 'string' ) {patch.avatar_url = body.avatar_url;}

    // Changing a number must never retain verification from the old number.
    // The verification workflow is the only route that can set this timestamp.
    if (
      typeof patch.phone_number === 'string' &&
      patch.phone_number !== String( user.phone_number ?? '' ).trim()
    ) {
      patch.phone_verified_at = null;
    }

    if ( isAdmin ) {
      if ( typeof body.role === 'string' ) {
        const normalizedRole = body.role.toLowerCase();
        if ( [ 'passenger', 'driver', 'operator', 'admin', 'support', 'finance', 'trust' ].includes( normalizedRole ) ) {
          patch.role = normalizedRole;
        }
      }
      if ( typeof body.verification_level === 'string' ) {
        patch.verification_level = body.verification_level;
      }
    }

    if ( Object.keys( patch ).length > 0 ) {
      const { error } = await auth.admin.from( 'users' ).update( patch ).eq( 'id', user.id );
      if ( error ) {return json( { error: error.message }, 500 );}
    }

    // Wallet balance is NEVER mutated through this endpoint. Balance changes
    // must originate from verified payment webhooks / atomic wallet RPCs only.
    // An admin may adjust wallet_status; no raw balance writes are accepted.
    if ( isAdmin && typeof body.wallet_status === 'string' ) {
      const walletPatch: Record<string, unknown> = { wallet_status: body.wallet_status };
      await auth.admin.from( 'wallets' ).update( walletPatch ).eq( 'user_id', user.id );
    }
  }

  const { data: nextUser, error } = await auth.admin
    .from( 'users' )
    .select( 'id, auth_user_id, email, phone_number, full_name, role, verification_level, phone_verified_at, profile_status, updated_at, avatar_url, created_at' )
    .eq( 'id', user.id )
    .single();
  if ( error ) {return json( { error: error.message }, 500 );}
  return json( await buildProfilePayload( auth.admin, nextUser ) );
}

export async function handleTwoFactorSetup ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

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

export async function handleTwoFactorVerify ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

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

export async function handleTwoFactorDisable ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

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

export async function handleEnableDriverMode ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const currentRole = String( auth.canonicalUser.role ?? 'passenger' ).toLowerCase();

  // Idempotent: a second tap (or a 'both' account) must not rewrite the role.
  if ( currentRole === 'driver' || currentRole === 'both' ) {
    return json( { enabled: true, role: currentRole } );
  }

  // This endpoint must not demote any staff role into a driver account.
  if ( [ 'admin', 'support', 'operator', 'finance', 'trust' ].includes( currentRole ) ) {
    return json(
      { error: 'Staff accounts cannot switch to Driver mode. Use a separate rider account to drive.' },
      409,
    );
  }

  const supabaseUrl = Deno.env.get( 'SUPABASE_URL' ) ?? '';
  const anonKey = Deno.env.get( 'SUPABASE_ANON_KEY' ) ?? '';
  const bearerToken = request.headers.get( 'Authorization' ) ?? '';
  if ( !supabaseUrl || !anonKey || !bearerToken.startsWith( 'Bearer ' ) ) {
    return json( { error: 'Driver mode activation is temporarily unavailable.' }, 503 );
  }

  // Invoke the caller-bound RPC with the user's JWT so auth.uid() and RLS apply.
  // The service-role client is used only for token validation and role checks.
  const userClient = createClient( supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: bearerToken } },
  } );
  const { data: activation, error } = await userClient.rpc( 'app_enable_driver_mode' );
  if ( error ) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 404 : 500;
    return json( { error: error.message }, status );
  }
  if ( !activation || activation.enabled !== true || activation.role !== 'driver' ) {
    return json( { error: 'Driver mode could not be enabled.' }, 500 );
  }

  return json( activation );
}

export async function handleSubmitDriverDocuments ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) {return auth.error;}

  const submitterRole = String( auth.canonicalUser.role ?? 'passenger' ).toLowerCase();
  if ( submitterRole !== 'driver' && submitterRole !== 'both' ) {
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

  // Submitting documents moves the account to level_2 ("under review"). Only an
  // operator approval reaches level_3, and a resubmission never downgrades an
  // account that is already level_3.
  const currentLevel = String( auth.canonicalUser.verification_level ?? 'level_0' );
  const nextLevel = currentLevel === 'level_3' ? 'level_3' : 'level_2';

  const baseDriverPatch = {
    license_number: licenseNumber,
    driver_status: 'pending_approval',
    background_check_status: 'pending',
    verification_level: nextLevel,
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

  if ( nextLevel !== currentLevel ) {
    const { error: levelError } = await auth.admin
      .from( 'users' )
      .update( { verification_level: nextLevel, updated_at: new Date().toISOString() } )
      .eq( 'id', auth.canonicalUser.id );
    if ( levelError ) {
      return json( { error: levelError.message }, 500 );
    }
  }

  const { error: verificationError } = await auth.admin.from( 'verification_records' ).insert( {
    user_id: auth.canonicalUser.id,
    document_status: 'pending',
    verification_level: nextLevel,
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
