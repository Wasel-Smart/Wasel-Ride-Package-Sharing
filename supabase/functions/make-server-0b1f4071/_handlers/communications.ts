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

async function handleGetCommunicationPreferences ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const { data, error } = await auth.admin
    .from( 'communication_preferences' )
    .select( '*' )
    .eq( 'user_id', auth.canonicalUser.id )
    .maybeSingle();

  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  return json( { preferences: data ?? null } );
}

async function handlePatchCommunicationPreferences ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const patch = {
    user_id: auth.canonicalUser.id,
    in_app_enabled: body.inApp,
    push_enabled: body.push,
    email_enabled: body.email,
    sms_enabled: body.sms,
    whatsapp_enabled: body.whatsapp,
    trip_updates_enabled: body.tripUpdates,
    booking_requests_enabled: body.bookingRequests,
    messages_enabled: body.messages,
    promotions_enabled: body.promotions,
    prayer_reminders_enabled: body.prayerReminders,
    critical_alerts_enabled: body.criticalAlerts,
    preferred_language: body.preferredLanguage === 'ar' ? 'ar' : 'en',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await auth.admin
    .from( 'communication_preferences' )
    .upsert( patch, { onConflict: 'user_id' } )
    .select( '*' )
    .single();

  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  return json( { preferences: data } );
}

async function handleQueueCommunicationDeliveries ( request: Request ) {
  const auth = await authenticateRequest( request );
  if ( 'error' in auth ) return auth.error;

  const body = await request.json().catch( () => ( {} ) );
  const deliveries = Array.isArray( body.deliveries ) ? body.deliveries : [];
  const now = new Date().toISOString();

  if ( deliveries.length === 0 ) {
    return json( { queued: 0 } );
  }

  const rows = deliveries.map( ( delivery: Record<string, unknown>, index: number ) => {
    const payloadBody = String( delivery.body ?? '' ).replace( /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g, '' );
    return {
      user_id: auth.canonicalUser.id,
      notification_id: typeof body.notificationId === 'string' ? body.notificationId : null,
      channel: String( delivery.channel ?? 'email' ),
      delivery_status: 'queued',
      destination: typeof delivery.destination === 'string' ? delivery.destination : null,
      subject: typeof delivery.subject === 'string' ? delivery.subject : null,
      payload: {
        body: payloadBody,
        metadata: delivery.metadata ?? null,
      },
      provider_name: determineProviderName( String( delivery.channel ?? 'email' ) ),
      queued_at: now,
      updated_at: now,
      idempotency_key:
        typeof delivery.idempotencyKey === 'string' && delivery.idempotencyKey
          ? delivery.idempotencyKey
          : buildIdempotencyKey( {
            deliveryId: `${ body.notificationId ?? 'direct' }-${ index }`,
            channel: String( delivery.channel ?? 'email' ),
            destination: typeof delivery.destination === 'string' ? delivery.destination : null,
            body: payloadBody,
          } ),
    };
  } );

  const { data, error } = await auth.admin
    .from( 'communication_deliveries' )
    .upsert( rows, { onConflict: 'idempotency_key', ignoreDuplicates: true } )
    .select( '*' );

  if ( error ) {
    return json( { error: error.message }, 500 );
  }

  if ( Deno.env.get( 'COMMUNICATION_PROCESS_INLINE' ) === 'true' && hasWorkerAccess( request ) ) {
    await processQueuedDeliveries( auth.admin, getFunctionBaseUrl( request ) );
  }

  return json( { queued: Array.isArray( data ) ? data.length : rows.length, deliveries: data ?? [] }, 202 );
}

async function handleProcessCommunicationQueue ( request: Request ) {
  if ( !hasWorkerAccess( request ) ) {
    return json( { error: 'Missing worker secret' }, 401 );
  }

  const admin = getAdminClient();
  const result = await processQueuedDeliveries( admin, getFunctionBaseUrl( request ) );
  return json( result );
}

async function handleSendTestCommunication ( request: Request ) {
  const accessError = ensureRuntimeAdminAccess( request );
  if ( accessError ) return accessError;

  const body = await request.json().catch( () => ( {} ) );
  const channel = String( body.channel ?? 'email' );

  if ( channel !== 'email' ) {
    return json( { error: 'Only email test sends are enabled in the current live configuration.' }, 400 );
  }

  const destination =
    typeof body.destination === 'string' && body.destination.trim()
      ? body.destination.trim()
      : deliveryEnv.sendgridFromEmail || deliveryEnv.resendFromEmail || null;

  if ( !destination ) {
    return json( { error: 'No destination was provided and no email sender address is configured.' }, 400 );
  }

  const delivery: CommunicationDeliveryRecord = {
    delivery_id: crypto.randomUUID(),
    channel: 'email',
    destination,
    subject: typeof body.subject === 'string' && body.subject.trim()
      ? body.subject.trim()
      : 'Wasel live communications test',
    payload: {
      body:
        typeof body.message === 'string' && body.message.trim()
          ? body.message.trim()
          : `Live communications test from Wasel at ${ new Date().toISOString() }`,
    },
    provider_name: deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail ? 'resend' : 'sendgrid',
    external_reference: null,
    attempts_count: 0,
  };

  try {
    const providerRequest = deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail
      ? buildResendPayload( delivery, deliveryEnv )
      : buildSendgridPayload( delivery, deliveryEnv );

    const response = await fetch( providerRequest.url, providerRequest.init );
    const responseBody = await response.json().catch( () => ( {} ) );

    if ( !response.ok ) {
      return json( {
        success: false,
        channel,
        destination,
        provider: delivery.provider_name,
        error:
          typeof responseBody?.message === 'string'
            ? responseBody.message
            : typeof responseBody?.error === 'string'
              ? responseBody.error
              : `Provider returned HTTP ${ response.status }`,
        response: responseBody,
      }, 502 );
    }

    return json( {
      success: true,
      channel,
      destination,
      provider: delivery.provider_name,
      response: responseBody,
    } );
  } catch ( error ) {
    return json( {
      success: false,
      channel,
      destination,
      provider: delivery.provider_name,
      error: error instanceof Error ? error.message : String( error ),
    }, 500 );
  }
}

async function handleProviderDiagnostics ( request: Request ) {
  const accessError = ensureRuntimeAdminAccess( request );
  if ( accessError ) return accessError;

  const diagnostics: Record<string, unknown> = {
    resend: {
      configured: Boolean( deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail ),
    },
    sendgrid: {
      configured: Boolean( deliveryEnv.sendgridApiKey && deliveryEnv.sendgridFromEmail ),
    },
    twilio: {
      configured: Boolean( deliveryEnv.twilioAccountSid && getTwilioAuthPair() ),
      messagingServiceConfigured: Boolean( deliveryEnv.twilioMessagingServiceSid ),
      smsFromConfigured: Boolean( deliveryEnv.twilioSmsFrom ),
      whatsappFromConfigured: Boolean( deliveryEnv.twilioWhatsappFrom ),
      verifyConfigured: hasTwilioVerifyRuntime(),
    },
  };

  if ( deliveryEnv.sendgridApiKey ) {
    try {
      const response = await fetch( 'https://api.sendgrid.com/v3/user/account', {
        headers: {
          Authorization: `Bearer ${ deliveryEnv.sendgridApiKey }`,
        },
      } );
      diagnostics.sendgrid = {
        ...( diagnostics.sendgrid as Record<string, unknown> ),
        authOk: response.ok,
        status: response.status,
        response: await response.json().catch( () => null ),
      };
    } catch ( error ) {
      diagnostics.sendgrid = {
        ...( diagnostics.sendgrid as Record<string, unknown> ),
        authOk: false,
        error: error instanceof Error ? error.message : String( error ),
      };
    }
  }

  if ( deliveryEnv.twilioAccountSid && deliveryEnv.twilioAuthToken ) {
    const authHeader = `Basic ${ btoa( `${ deliveryEnv.twilioAccountSid }:${ deliveryEnv.twilioAuthToken }` ) }`;
    try {
      const accountResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ deliveryEnv.twilioAccountSid }.json`,
        { headers: { Authorization: authHeader } },
      );

      const numbersResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${ deliveryEnv.twilioAccountSid }/IncomingPhoneNumbers.json?PageSize=20`,
        { headers: { Authorization: authHeader } },
      );

      const messagingServicesResponse = await fetch(
        `https://messaging.twilio.com/v1/Services?PageSize=20`,
        { headers: { Authorization: authHeader } },
      );

      diagnostics.twilio = {
        ...( diagnostics.twilio as Record<string, unknown> ),
        authOk: accountResponse.ok,
        accountStatus: accountResponse.status,
        incomingNumbersStatus: numbersResponse.status,
        messagingServicesStatus: messagingServicesResponse.status,
        incomingNumbers: numbersResponse.ok
          ? ( ( await numbersResponse.json().catch( () => ( {} ) ) )?.incoming_phone_numbers ?? [] )
            .map( ( item: Record<string, unknown> ) => ( {
              phone_number: item.phone_number,
              sms_url: item.sms_url,
              capabilities: item.capabilities,
            } ) )
          : [],
        messagingServices: messagingServicesResponse.ok
          ? ( ( await messagingServicesResponse.json().catch( () => ( {} ) ) )?.services ?? [] )
            .map( ( item: Record<string, unknown> ) => ( {
              sid: item.sid,
              friendly_name: item.friendly_name,
            } ) )
          : [],
      };
    } catch ( error ) {
      diagnostics.twilio = {
        ...( diagnostics.twilio as Record<string, unknown> ),
        authOk: false,
        error: error instanceof Error ? error.message : String( error ),
      };
    }
  }

  return json( diagnostics );
}

async function handleApplyCommunicationMigrations ( request: Request ) {
  const accessError = ensureRuntimeAdminAccess( request );
  if ( accessError ) return accessError;

  await executeSqlStatements( COMMUNICATIONS_RUNTIME_SQL );
  await executeSqlStatements( COMMUNICATIONS_OPERATIONS_SQL );

  return json( {
    applied: [
      '20260401223000_communications_runtime_contract.sql',
      '20260401233000_communication_delivery_operations.sql',
    ],
  } );
}