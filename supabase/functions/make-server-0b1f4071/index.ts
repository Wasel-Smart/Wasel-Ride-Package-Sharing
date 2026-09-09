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
} from './_handlers/shared.ts';

import './_handlers/admin.ts';
import './_handlers/bookings.ts';
import './_handlers/chat.ts';
import './_handlers/communications.ts';
import './_handlers/gdpr.ts';
import './_handlers/identity.ts';
import './_handlers/infrastructure.ts';
import './_handlers/mobility.ts';
import './_handlers/moderation.ts';
import './_handlers/packages.ts';
import './_handlers/payments.ts';
import './_handlers/trips.ts';
import './_handlers/trust.ts';
import './_handlers/wallet.ts';
import './_handlers/webhooks.ts';

interface RouteDescriptor {
  id: string;
  methods?: string[];
  test: ( path: string, method: string ) => boolean;
  handle: ( request: Request, path: string ) => Promise<Response | undefined>;
}

const ROUTES: RouteDescriptor[] = [
  {
    id: 'profile',
    test: ( path, method ) =>
      ( method === 'POST' && path === '/profile' ) ||
      ( ( method === 'GET' || method === 'PATCH' ) && /^\/profile\/[^/]+$/.test( path ) ),
    handle: ( request, path ) => handleProfileRequest( request, path ),
  },
  {
    id: 'trips',
    test: ( path ) => path === '/trips' || path.startsWith( '/trips/' ),
    handle: ( request, path ) => handleTripRequest( request, path ),
  },
  {
    id: 'bookings',
    test: ( path ) => path === '/bookings' || path.startsWith( '/bookings/' ),
    handle: ( request, path ) => handleBookingRequest( request, path ),
  },
  {
    id: 'packages',
    test: ( path ) => path === '/packages' || path.startsWith( '/packages/' ),
    handle: ( request, path ) => handlePackageRequest( request, path ),
  },
  {
    id: 'ratings-submit',
    methods: [ 'POST' ],
    test: ( path ) => path === '/ratings',
    handle: ( request ) => handleSubmitRating( request ),
  },
  {
    id: 'ratings-driver',
    methods: [ 'GET' ],
    test: ( path ) => /^\/ratings\/drivers\/[^/]+$/.test( path ),
    handle: ( request, path ) => handleGetDriverRating( request, path ),
  },
  {
    id: 'ratings-eligibility',
    methods: [ 'GET' ],
    test: ( path ) => /^\/ratings\/bookings\/[^/]+\/eligibility$/.test( path ),
    handle: ( request, path ) => handleCanRateBooking( request, path ),
  },
  {
    id: 'reports-submit',
    methods: [ 'POST' ],
    test: ( path ) => path === '/reports',
    handle: ( request ) => handleSubmitReport( request ),
  },
  {
    id: 'cancel-booking',
    methods: [ 'POST' ],
    test: ( path ) => path === '/cancellations/bookings',
    handle: ( request ) => handleCancelBooking( request ),
  },
  {
    id: 'cancel-trip',
    methods: [ 'POST' ],
    test: ( path ) => path === '/cancellations/trips',
    handle: ( request ) => handleCancelTrip( request ),
  },
  {
    id: 'cancel-eligibility',
    methods: [ 'GET' ],
    test: ( path ) => /^\/cancellations\/bookings\/[^/]+\/eligibility$/.test( path ),
    handle: ( request, path ) => handleCanCancelBooking( request, path ),
  },
  {
    id: 'chat-messages-get',
    methods: [ 'GET' ],
    test: ( path ) => /^\/chat\/trips\/[^/]+\/messages$/.test( path ),
    handle: ( request, path ) => handleGetChatMessages( request, path ),
  },
  {
    id: 'chat-messages-post',
    methods: [ 'POST' ],
    test: ( path ) => /^\/chat\/trips\/[^/]+\/messages$/.test( path ),
    handle: ( request, path ) => handleSendChatMessage( request, path ),
  },
  {
    id: 'chat-read',
    methods: [ 'POST' ],
    test: ( path ) => path === '/chat/messages/read',
    handle: ( request ) => handleMarkChatMessagesRead( request ),
  },
  {
    id: 'chat-unread',
    methods: [ 'GET' ],
    test: ( path ) => /^\/chat\/trips\/[^/]+\/unread-count$/.test( path ),
    handle: ( request, path ) => handleGetChatUnreadCount( request, path ),
  },
  {
    id: 'mobility-live-rows',
    methods: [ 'GET' ],
    test: ( path ) => path === '/mobility-os/live-rows',
    handle: ( request ) => handleGetMobilityLiveRows( request ),
  },
  {
    id: 'live-trip',
    methods: [ 'GET' ],
    test: ( path ) => path === '/live-trip',
    handle: ( request ) => handleGetLiveTrip( request ),
  },
  {
    id: 'gdpr-consents-post',
    methods: [ 'POST' ],
    test: ( path ) => path === '/gdpr/consents',
    handle: ( request ) => handleRecordConsent( request ),
  },
  {
    id: 'gdpr-consents-get',
    methods: [ 'GET' ],
    test: ( path ) => /^\/gdpr\/consents\/[^/]+$/.test( path ),
    handle: ( request, path ) => handleGetConsent( request, path ),
  },
  {
    id: 'gdpr-data-exports',
    methods: [ 'POST' ],
    test: ( path ) => path === '/gdpr/data-exports',
    handle: ( request ) => handleRequestDataExport( request ),
  },
  {
    id: 'gdpr-deletions',
    methods: [ 'POST' ],
    test: ( path ) => path === '/gdpr/deletions',
    handle: ( request ) => handleRequestDeletion( request ),
  },
  {
    id: 'gdpr-deletions-cancel',
    methods: [ 'POST' ],
    test: ( path ) => path === '/gdpr/deletions/cancel',
    handle: ( request ) => handleCancelDeletion( request ),
  },
  {
    id: 'mobility-os',
    test: ( path ) => path === '/mobility-os/snapshot' || path === '/mobility-os/booking/create',
    handle: ( request, path ) => handleMobilityOSRequest( request, path ),
  },
  {
    id: 'mobility-os-public',
    methods: [ 'GET' ],
    test: ( path ) => path === '/mobility-os/public-snapshot',
    handle: ( _request, _path ) => handlePublicMobilitySnapshot( _request ),
  },
  {
    id: 'wallet',
    test: ( path ) => parseWalletRoute( path ) !== null,
    handle: ( request, path ) => handleWalletDispatch( request, path ),
  },
  {
    id: 'communications-preferences-get',
    methods: [ 'GET' ],
    test: ( path ) => path === '/communications/preferences',
    handle: ( request ) => handleGetCommunicationPreferences( request ),
  },
  {
    id: 'trust-status',
    methods: [ 'GET' ],
    test: ( path ) => path === '/trust/status',
    handle: ( request ) => handleGetTrustStatus( request ),
  },
  {
    id: 'trust-phone-start',
    methods: [ 'POST' ],
    test: ( path ) => path === '/trust/phone/start',
    handle: ( request ) => handleStartPhoneVerification( request ),
  },
  {
    id: 'trust-phone-confirm',
    methods: [ 'POST' ],
    test: ( path ) => path === '/trust/phone/confirm',
    handle: ( request ) => handleConfirmPhoneVerification( request ),
  },
  {
    id: 'trust-identity-submit',
    methods: [ 'POST' ],
    test: ( path ) => path === '/trust/identity/submit',
    handle: ( request ) => handleSubmitIdentityVerification( request ),
  },
  {
    id: 'trust-driver-mode-enable',
    methods: [ 'POST' ],
    test: ( path ) => path === '/trust/driver-mode/enable',
    handle: ( request ) => handleEnableDriverMode( request ),
  },
  {
    id: 'trust-driver-documents-submit',
    methods: [ 'POST' ],
    test: ( path ) => path === '/trust/driver-documents/submit',
    handle: ( request ) => handleSubmitDriverDocuments( request ),
  },
  {
    id: 'auth-2fa-setup',
    methods: [ 'POST' ],
    test: ( path ) => path === '/auth/2fa/setup',
    handle: ( request ) => handleTwoFactorSetup( request ),
  },
  {
    id: 'auth-2fa-verify',
    methods: [ 'POST' ],
    test: ( path ) => path === '/auth/2fa/verify',
    handle: ( request ) => handleTwoFactorVerify( request ),
  },
  {
    id: 'auth-2fa-disable',
    methods: [ 'POST' ],
    test: ( path ) => path === '/auth/2fa/disable',
    handle: ( request ) => handleTwoFactorDisable( request ),
  },
  {
    id: 'communications-preferences-patch',
    methods: [ 'PATCH' ],
    test: ( path ) => path === '/communications/preferences',
    handle: ( request ) => handlePatchCommunicationPreferences( request ),
  },
  {
    id: 'communications-deliver',
    methods: [ 'POST' ],
    test: ( path ) => path === '/communications/deliver',
    handle: ( request ) => handleQueueCommunicationDeliveries( request ),
  },
  {
    id: 'communications-process',
    methods: [ 'POST' ],
    test: ( path ) => path === '/communications/process',
    handle: ( request ) => handleProcessCommunicationQueue( request ),
  },
  {
    id: 'communications-admin-send-test',
    methods: [ 'POST' ],
    test: ( path ) => path === '/communications/admin/send-test',
    handle: ( request ) => handleSendTestCommunication( request ),
  },
  {
    id: 'communications-admin-provider-diagnostics',
    methods: [ 'GET' ],
    test: ( path ) => path === '/communications/admin/provider-diagnostics',
    handle: ( request ) => handleProviderDiagnostics( request ),
  },
  {
    id: 'communications-admin-apply-migrations',
    methods: [ 'POST' ],
    test: ( path ) => path === '/communications/admin/apply-migrations',
    handle: ( request ) => handleApplyCommunicationMigrations( request ),
  },
  {
    id: 'moderation-admin-apply-migrations',
    methods: [ 'POST' ],
    test: ( path ) => path === '/moderation/admin/apply-migrations',
    handle: ( request ) => handleApplyModerationMigrations( request ),
  },
  {
    id: 'admin-drivers-pending',
    methods: [ 'GET' ],
    test: ( path ) => path === '/admin/drivers/pending',
    handle: ( request ) => handleAdminListPendingDrivers( request ),
  },
  {
    id: 'admin-approve-driver',
    methods: [ 'POST' ],
    test: ( path ) => /^\/admin\/drivers\/[^/]+\/approve$/.test( path ),
    handle: ( request, path ) => handleAdminApproveDriver( request, decodeURIComponent( path.split( '/' )[ 3 ] ) ),
  },
  {
    id: 'payments-webhook-stripe',
    methods: [ 'POST' ],
    test: ( path ) => path === '/payments/webhooks/stripe',
    handle: ( request ) => handleStripeWebhook( request ),
  },
  {
    id: 'payments-webhook-cliq',
    methods: [ 'POST' ],
    test: ( path ) => path === '/payments/webhooks/cliq',
    handle: ( request ) => handleCliqWebhook( request ),
  },
  {
    id: 'trust-webhook-sanad',
    methods: [ 'POST' ],
    test: ( path ) => path === '/trust/webhooks/sanad',
    handle: ( request ) => handleSanadWebhook( request ),
  },
  {
    id: 'communications-webhook-resend',
    methods: [ 'POST' ],
    test: ( path ) => path === '/communications/webhooks/resend',
    handle: ( request ) => handleResendWebhook( request ),
  },
  {
    id: 'payments-webhook-twilio',
    methods: [ 'POST' ],
    test: ( path ) => path === '/communications/webhooks/twilio',
    handle: ( request ) => handleTwilioWebhook( request ),
  },
  {
    id: 'payments-create-intent',
    methods: [ 'POST' ],
    test: ( path ) => path === '/payment/create-intent',
    handle: ( request ) => handlePaymentIntentCreate( request ),
  },
  {
    id: 'payments-create-refund',
    methods: [ 'POST' ],
    test: ( path ) => path === '/payment/refund',
    handle: ( request ) => handlePaymentRefund( request ),
  },
  {
    id: 'booking-payment-status',
    methods: [ 'GET' ],
    test: ( path ) => /^\/booking\/[^/]+\/payment-status$/.test( path ),
    handle: ( request, path ) => {
      const parts = path.split( '/' );
      return handleGetPaymentStatus( request, decodeURIComponent( parts[ 2 ] ) );
    },
  },
];

async function resolveRoute ( request: Request ): Promise<Response> {
  const url = new URL( request.url );
  let path = url.pathname.replace( /^.*make-server-0b1f4071/, '' ) || '/';

  if ( path.startsWith( '/v1' ) ) {
    path = path.slice( 3 ) || '/';
  }

  for ( const route of ROUTES ) {
    if ( route.methods && !route.methods.includes( request.method ) ) continue;
    if ( !route.test( path, request.method ) ) continue;

    const result = await route.handle( request, path );
    if ( result ) return result;
  }

  return json( { error: 'Route not found', path }, 404 );
}

Deno.serve( async ( request: Request ) => {
  let response: Response | undefined;

  if ( !isOriginAllowed( request ) ) {
    response = json( { error: 'Origin not allowed' }, 403 );
    return finalizeResponse( request, response );
  }

  if ( request.method === 'OPTIONS' ) {
    response = noContent();
    return finalizeResponse( request, response );
  }

  try {
    const url = new URL( request.url );
    const path = url.pathname.replace( /^.*make-server-0b1f4071/, '' ) || '/';

    const securityResponse = enforceRequestSecurity( request, path );
    if ( securityResponse ) {
      return finalizeResponse( request, securityResponse );
    }

    if ( request.method === 'GET' && path === '/health' ) {
      response = await handleHealth( request );
      return finalizeResponse( request, response );
    }

    response = await resolveRoute( request );
  } catch ( error ) {
    logUnhandledRouteError( error, request );
    response = sanitizedUnhandledErrorResponse();
  }

  return finalizeResponse( request, response ?? json( { error: 'Route not found' }, 404 ) );
} );
