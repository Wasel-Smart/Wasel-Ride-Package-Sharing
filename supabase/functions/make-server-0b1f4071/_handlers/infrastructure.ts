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

async function handleHealth ( request: Request ) {
  const publicPayload = buildPublicHealthPayload( SERVICE_NAME );

  if ( !RUNTIME_ADMIN_ENABLED || !hasWorkerAccess( request ) ) {
    return json( publicPayload );
  }

  return json( {
    ...publicPayload,
    runtimeAdminEnabled: true,
    twoFactor: {
      enabled: true,
      serverVerified: true,
    },
    communications: {
      resendConfigured: Boolean( deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail ),
      sendgridConfigured: Boolean( deliveryEnv.sendgridApiKey && deliveryEnv.sendgridFromEmail ),
      twilioConfigured: Boolean(
        deliveryEnv.twilioAccountSid &&
        ( deliveryEnv.twilioAuthToken ||
          ( deliveryEnv.twilioApiKeySid && deliveryEnv.twilioApiKeySecret ) ) &&
        ( deliveryEnv.twilioMessagingServiceSid || deliveryEnv.twilioSmsFrom || deliveryEnv.twilioWhatsappFrom ),
      ),
      twilioVerifyConfigured: hasTwilioVerifyRuntime(),
      workerSecretConfigured: Boolean( getWorkerSecret() ),
      webhookTokenConfigured: Boolean( deliveryEnv.communicationWebhookToken ),
    },
    payments: {
      stripeConfigured: Boolean( STRIPE_SECRET_KEY ),
      stripeWebhookConfigured: Boolean( STRIPE_WEBHOOK_SECRET ),
      cliqConfigured: Boolean( CLIQ_CHECKOUT_URL_TEMPLATE ),
      waselPlusPriceConfigured: Boolean( STRIPE_WASEL_PLUS_PRICE_ID ),
    },
  } );
}