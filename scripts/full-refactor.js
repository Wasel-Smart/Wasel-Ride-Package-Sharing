const fs = require('fs');
const path = require('path');

const monolithPath = path.resolve(__dirname, '../supabase/functions/make-server-0b1f4071/index.ts');
const outputDir = path.dirname(monolithPath);
const handlersDir = path.join(outputDir, '_handlers');

const monolith = fs.readFileSync(monolithPath, 'utf8');
const lines = monolith.split('\n');

// ============================================================
// STEP 1: Find all handler and non-handler functions
// ============================================================
const handlerDomains = {
  handleProfileRequest: 'identity',
  handleTripRequest: 'trips',
  handleBookingCollectionForTrip: 'trips',
  handleBookingRequest: 'bookings',
  handlePackageRequest: 'packages',
  handlePublicMobilitySnapshot: 'mobility',
  handleMobilityOSRequest: 'mobility',
  handleGetWallet: 'wallet',
  handleGetWalletTransactions: 'wallet',
  handleGetWalletInsights: 'wallet',
  handleWalletWithdraw: 'wallet',
  handleWalletSend: 'wallet',
  handleSetWalletPin: 'wallet',
  handleVerifyWalletPin: 'wallet',
  handleSetWalletAutoTopUp: 'wallet',
  handleGetWalletPaymentMethods: 'wallet',
  handleAddWalletPaymentMethod: 'wallet',
  handleDeleteWalletPaymentMethod: 'wallet',
  handleGetWalletTrustScore: 'wallet',
  handleGetWalletRewards: 'wallet',
  handleClaimWalletReward: 'wallet',
  handleGetWalletSubscription: 'wallet',
  handleWalletTopUp: 'wallet',
  handleWalletSubscribe: 'wallet',
  handleWalletPay: 'wallet',
  handleHealth: 'infrastructure',
  handleGetCommunicationPreferences: 'communications',
  handleTwoFactorSetup: 'identity',
  handleTwoFactorVerify: 'identity',
  handleTwoFactorDisable: 'identity',
  handleGetTrustStatus: 'trust',
  handleStartPhoneVerification: 'trust',
  handleConfirmPhoneVerification: 'trust',
  handleSubmitIdentityVerification: 'identity',
  handleEnableDriverMode: 'identity',
  handleSubmitDriverDocuments: 'identity',
  handlePatchCommunicationPreferences: 'communications',
  handleQueueCommunicationDeliveries: 'communications',
  handleProcessCommunicationQueue: 'communications',
  handleSendTestCommunication: 'communications',
  handleProviderDiagnostics: 'communications',
  handleApplyCommunicationMigrations: 'communications',
  handleApplyModerationMigrations: 'moderation',
  handleAdminListPendingDrivers: 'admin',
  handleAdminApproveDriver: 'admin',
  handlePaymentIntentCreate: 'payments',
  handlePaymentRefund: 'payments',
  handleGetPaymentStatus: 'payments',
  handleStripeWebhook: 'webhooks',
  handleCliqWebhook: 'webhooks',
  handleSanadWebhook: 'webhooks',
  handleResendWebhook: 'webhooks',
  handleTwilioWebhook: 'webhooks',
  handleSubmitRating: 'bookings',
  handleGetDriverRating: 'bookings',
  handleCanRateBooking: 'bookings',
  handleSubmitReport: 'moderation',
  handleCancelBooking: 'bookings',
  handleCancelTrip: 'trips',
  handleCanCancelBooking: 'bookings',
  handleRecordConsent: 'gdpr',
  handleGetConsent: 'gdpr',
  handleRequestDataExport: 'gdpr',
  handleRequestDeletion: 'gdpr',
  handleCancelDeletion: 'gdpr',
  handleGetChatMessages: 'chat',
  handleSendChatMessage: 'chat',
  handleMarkChatMessagesRead: 'chat',
  handleGetChatUnreadCount: 'chat',
  handleGetMobilityLiveRows: 'mobility',
  handleGetLiveTrip: 'trips',
  handleWalletDispatch: 'wallet',
};

// Find all function definitions with line numbers
const allFunctions = [];
for (let i = 0; i < lines.length; i++) {
  const asyncMatch = lines[i].match(/^async function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  const syncMatch = lines[i].match(/^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
  const name = asyncMatch?.[1] || syncMatch?.[1];
  if (name) {
    allFunctions.push({
      name,
      isAsync: !!asyncMatch,
      startLine: i + 1
    });
  }
}

// Find end of each function
function findEnd(startLine1Based) {
  let depth = 0;
  let started = false;
  let inStr = false;
  let strChar = '';
  let inLineComment = false;
  let inBlockComment = false;
  
  for (let i = startLine1Based - 1; i < lines.length; i++) {
    const line = lines[i];
    inLineComment = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const next = line[j + 1];
      
      if (inBlockComment) {
        if (char === '*' && next === '/') { inBlockComment = false; j++; }
        continue;
      }
      if (inStr) {
        if (char === '\\') { j++; continue; }
        if (char === strChar) inStr = false;
        continue;
      }
      if (char === '/' && next === '/') { inLineComment = true; break; }
      if (char === '/' && next === '*') { inBlockComment = true; j++; continue; }
      if (char === '"' || char === "'" || char === '`') { inStr = true; strChar = char; continue; }
      
      if (char === '{') { depth++; started = true; }
      if (char === '}') { depth--; if (started && depth === 0) return i + 1; }
    }
    
    if (started && depth === 0) break;
  }
  return startLine1Based;
}

// Process each function
const handlers = [];
const utilities = [];

for (const fn of allFunctions) {
  const end = findEnd(fn.startLine);
  const content = lines.slice(fn.startLine - 1, end).join('\n');
  
  if (handlerDomains[fn.name]) {
    handlers.push({
      name: fn.name,
      domain: handlerDomains[fn.name],
      content
    });
  } else {
    utilities.push({
      name: fn.name,
      content
    });
  }
}

console.log(`Found ${handlers.length} handlers and ${utilities.length} utilities`);

// Group handlers by domain
const domains = {};
for (const h of handlers) {
  if (!domains[h.domain]) domains[h.domain] = [];
  domains[h.domain].push(h);
}

// ============================================================
// STEP 2: Append utilities to shared.ts
// ============================================================
let sharedTs = fs.readFileSync(path.join(handlersDir, 'shared.ts'), 'utf8');

// Add utility exports
for (const util of utilities) {
  const prefix = util.content.startsWith('async function') ? 'export async ' : 'export ';
  sharedTs += '\n\n' + prefix + util.content.replace(/^function /, 'function ').replace(/^async function /, 'async function ');
}

fs.writeFileSync(path.join(handlersDir, 'shared.ts'), sharedTs);
console.log('Updated _handlers/shared.ts with utilities');

// ============================================================
// STEP 3: Create domain files with handlers
// ============================================================
const domainImports = `import {
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
`;

for (const [domain, hs] of Object.entries(domains)) {
  const content = hs.map(h => h.content).join('\n\n');
  fs.writeFileSync(path.join(handlersDir, `${domain}.ts`), domainImports + '\n\n' + content);
  console.log(`Created _handlers/${domain}.ts (${hs.length} handlers)`);
}

// ============================================================
// STEP 4: Rebuild index.ts as thin gateway
// ============================================================
const domainImportLines = Object.keys(domains).sort().map(d => `import './_handlers/${d}.ts';`).join('\n');

// Extract route definitions from original
const routeDefs = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const ROUTES:')) {
    let depth = 0;
    let started = false;
    for (let j = i; j < lines.length; j++) {
      for (const char of lines[j]) {
        if (char === '{') { depth++; started = true; }
        if (char === '}') { depth--; if (started && depth === 0) {
          routeDefs.push(lines.slice(i, j + 1).join('\n'));
          i = j;
          break;
        }
      }
      if (started && depth === 0) break;
    }
  }
}

const routesSection = routeDefs[0] || 'const ROUTES = [];';

// Extract resolveRoute function
const resolveRouteMatch = monolith.match(/async function resolveRoute \([\s\S]*?^\}/m);
const resolveRouteSection = resolveRouteMatch ? resolveRouteMatch[0] : '';

const newIndex = `${domainImportLines}

${routesSection}

${resolveRouteSection}

Deno.serve(async (request: Request) => {
  let response: Response | undefined;
  if (!isOriginAllowed(request)) {
    response = json({ error: 'Origin not allowed' }, 403);
    return finalizeResponse(request, response);
  }
  if (request.method === 'OPTIONS') {
    response = noContent();
    return finalizeResponse(request, response);
  }
  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*make-server-0b1f4071/, '') || '/';
    if (request.method === 'GET' && path === '/health') {
      response = await handleHealth(request);
      return finalizeResponse(request, response);
    }
    response = await resolveRoute(request);
  } catch (error) {
    logUnhandledRouteError(error, request);
    response = sanitizedUnhandledErrorResponse();
  }
  return finalizeResponse(request, response ?? json({ error: 'Route not found' }, 404));
});
`;

fs.writeFileSync(monolithPath, newIndex);
console.log('\nRebuilt index.ts');
console.log('New index.ts lines:', newIndex.split('\n').length);
console.log('\nDone!');
