const fs = require('fs');
const path = require('path');

const monolithPath = path.resolve(__dirname, '../supabase/functions/make-server-0b1f4071/index.ts');
const outputDir = path.dirname(monolithPath);
const handlersDir = path.join(outputDir, '_handlers');

fs.mkdirSync(handlersDir, { recursive: true });

const monolith = fs.readFileSync(monolithPath, 'utf8');
const lines = monolith.split('\n');

// Extract lines 1-843 (shared utilities)
const sharedLines = lines.slice(0, 843);
let sharedTs = sharedLines.join('\n');

// Add export keywords to key declarations
sharedTs = sharedTs
  .replace(/^const (SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|SUPABASE_DB_URL|STRIPE_SECRET_KEY|stripe|STRIPE_WEBHOOK_SECRET|STRIPE_API_VERSION|TWILIO_VERIFY_SERVICE_SID|APP_BASE_URL|CLIQ_API_BASE_URL|CLIQ_MERCHANT_ID|CLIQ_API_KEY|CLIQ_WEBHOOK_SECRET|CLIQ_CHECKOUT_URL_TEMPLATE|CLIQ_CHECKOUT_ENDPOINT|SANAD_API_BASE_URL|SANAD_CLIENT_ID|SANAD_CLIENT_SECRET|SANAD_WEBHOOK_SECRET|SANAD_VERIFICATION_ENDPOINT|STRIPE_WASEL_PLUS_PRICE_ID|ADDITIONAL_ALLOWED_ORIGINS|ALLOW_LOCAL_ORIGINS|RUNTIME_ADMIN_ENABLED|SERVICE_NAME|responseBaseHeaders|deliveryEnv|COMMUNICATIONS_RUNTIME_SQL|COMMUNICATIONS_OPERATIONS_SQL|CONTENT_MODERATION_SQL|WEBHOOK_PATH_PREFIXES)/gm, 'export const $1')
  .replace(/^function (json|addVersionHeader|noContent|buildResponseHeaders|finalizeResponse|logUnhandledRouteError|sanitizedUnhandledErrorResponse|isOriginAllowed|isWebhookRoute|enforceRequestSecurity|getAdminClient|authenticateRequest|authenticateAuthUser|constantTimeEqual|getWorkerSecret|hasWorkerAccess|ensureRuntimeAdminAccess|enforcePermission|hasAnyPermission|getFunctionBaseUrl|executeSqlStatements|getAppBaseUrl|matchesAuthenticatedUser|parseWalletRoute|parseEntityRoute|formatDate|formatTime|ensureCanonicalUserForAuth|getWalletForUser|getVerificationForUser|getDriverForUser|ensureDriverForUser|isApprovedDriver|buildProfilePayload|mapTripRow|mapBookingRow|mapPackageRow|fetchDriverProfiles|authorizeTripOwner|stripeApiRequest|getExistingStripeCustomerId|ensureStripeCustomer|fetchStripeSubscription|buildSubscriptionRecord|mapSubscriptionPlan|toIsoFromUnix|mapWalletPaymentMethod|toMoneyNumber|toStripeMinorAmount|buildCliqCheckoutUrl|joinProviderUrl|normalizeProviderStatus|isSuccessfulProviderStatus|isFailedProviderStatus|firstStringValue|ensureMobilitySeed|isPhoneNumberUniqueViolation|generateOtpCode|getTwilioAuthPair|hasTwilioVerifyRuntime|callTwilioVerify|startTwilioPhoneVerification|checkTwilioPhoneVerification|hashOtpCode|isExpired|isOlderThanHours|computeTrustStepSummary|buildTrustStep|buildTrustStatus)/gm, 'export function $1')
  .replace(/^async function (authenticateRequest|authenticateAuthUser|ensureCanonicalUserForAuth|getWalletForUser|getVerificationForUser|getDriverForUser|ensureDriverForUser|buildProfilePayload|fetchDriverProfiles|executeSqlStatements|callTwilioVerify|startTwilioPhoneVerification|checkTwilioPhoneVerification|hashOtpCode|buildTrustStatus|ensureStripeCustomer|fetchStripeSubscription|stripeApiRequest)/gm, 'export async function $1');

fs.writeFileSync(path.join(handlersDir, 'shared.ts'), sharedTs);
console.log('Created _handlers/shared.ts');

// Update index.ts: remove shared utilities (lines 1-843) and add imports
const handlerLines = lines.slice(843);
const handlerContent = handlerLines.join('\n');

const newIndex = `import {
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

${handlerContent}
`;

fs.writeFileSync(monolithPath, newIndex);
console.log('Updated index.ts');
console.log('New index.ts lines:', newIndex.split('\n').length);
console.log('Original:', lines.length, 'lines');
console.log('Reduction:', Math.round((1 - newIndex.split('\n').length / lines.length) * 100) + '%');
