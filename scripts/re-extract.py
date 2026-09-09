import os
import re

# Use the monolith from the wasel-env-10-of-10 branch
monolith_path = '/tmp/monolith.ts'
output_dir = os.path.join(os.path.dirname(__file__), '../supabase/functions/make-server-0b1f4071')
handlers_dir = os.path.join(output_dir, '_handlers')

# Clean up old handlers
for f in os.listdir(handlers_dir):
    if f.endswith('.ts'):
        os.remove(os.path.join(handlers_dir, f))

with open(monolith_path, 'r') as f:
    monolith = f.read()

lines = monolith.split('\n')

# ============================================================
# Find all handler functions using regex
# ============================================================
handler_pattern = re.compile(r'^async function (handle[A-Z][a-zA-Z0-9]*)\s*\(', re.MULTILINE)

handler_domains = {
    'handleProfileRequest': 'identity',
    'handleTripRequest': 'trips',
    'handleBookingCollectionForTrip': 'trips',
    'handleBookingRequest': 'bookings',
    'handlePackageRequest': 'packages',
    'handlePublicMobilitySnapshot': 'mobility',
    'handleMobilityOSRequest': 'mobility',
    'handleGetWallet': 'wallet',
    'handleGetWalletTransactions': 'wallet',
    'handleGetWalletInsights': 'wallet',
    'handleWalletWithdraw': 'wallet',
    'handleWalletSend': 'wallet',
    'handleSetWalletPin': 'wallet',
    'handleVerifyWalletPin': 'wallet',
    'handleSetWalletAutoTopUp': 'wallet',
    'handleGetWalletPaymentMethods': 'wallet',
    'handleAddWalletPaymentMethod': 'wallet',
    'handleDeleteWalletPaymentMethod': 'wallet',
    'handleGetWalletTrustScore': 'wallet',
    'handleGetWalletRewards': 'wallet',
    'handleClaimWalletReward': 'wallet',
    'handleGetWalletSubscription': 'wallet',
    'handleWalletTopUp': 'wallet',
    'handleWalletSubscribe': 'wallet',
    'handleWalletPay': 'wallet',
    'handleHealth': 'infrastructure',
    'handleGetCommunicationPreferences': 'communications',
    'handleTwoFactorSetup': 'identity',
    'handleTwoFactorVerify': 'identity',
    'handleTwoFactorDisable': 'identity',
    'handleGetTrustStatus': 'trust',
    'handleStartPhoneVerification': 'trust',
    'handleConfirmPhoneVerification': 'trust',
    'handleSubmitIdentityVerification': 'identity',
    'handleEnableDriverMode': 'identity',
    'handleSubmitDriverDocuments': 'identity',
    'handlePatchCommunicationPreferences': 'communications',
    'handleQueueCommunicationDeliveries': 'communications',
    'handleProcessCommunicationQueue': 'communications',
    'handleSendTestCommunication': 'communications',
    'handleProviderDiagnostics': 'communications',
    'handleApplyCommunicationMigrations': 'communications',
    'handleApplyModerationMigrations': 'moderation',
    'handleAdminListPendingDrivers': 'admin',
    'handleAdminApproveDriver': 'admin',
    'handlePaymentIntentCreate': 'payments',
    'handlePaymentRefund': 'payments',
    'handleGetPaymentStatus': 'payments',
    'handleStripeWebhook': 'webhooks',
    'handleCliqWebhook': 'webhooks',
    'handleSanadWebhook': 'webhooks',
    'handleResendWebhook': 'webhooks',
    'handleTwilioWebhook': 'webhooks',
    'handleSubmitRating': 'bookings',
    'handleGetDriverRating': 'bookings',
    'handleCanRateBooking': 'bookings',
    'handleSubmitReport': 'moderation',
    'handleCancelBooking': 'bookings',
    'handleCancelTrip': 'trips',
    'handleCanCancelBooking': 'bookings',
    'handleRecordConsent': 'gdpr',
    'handleGetConsent': 'gdpr',
    'handleRequestDataExport': 'gdpr',
    'handleRequestDeletion': 'gdpr',
    'handleCancelDeletion': 'gdpr',
    'handleGetChatMessages': 'chat',
    'handleSendChatMessage': 'chat',
    'handleMarkChatMessagesRead': 'chat',
    'handleGetChatUnreadCount': 'chat',
    'handleGetMobilityLiveRows': 'mobility',
    'handleGetLiveTrip': 'trips',
    'handleWalletDispatch': 'wallet',
}

# Find all handler start lines
handler_starts = []
for match in handler_pattern.finditer(monolith):
    name = match.group(1)
    if name in handler_domains:
        # Find the line number (1-indexed)
        line_start = monolith[:match.start()].count('\n') + 1
        handler_starts.append((name, line_start))

print(f'Found {len(handler_starts)} handler functions')

# Find end of each function using brace counting
def find_end(start_line_0idx):
    depth = 0
    started = False
    in_str = False
    str_char = ''
    in_line_comment = False
    in_block_comment = False
    
    for i in range(start_line_0idx, len(lines)):
        line = lines[i]
        in_line_comment = False
        
        j = 0
        while j < len(line):
            char = line[j]
            next_char = line[j + 1] if j + 1 < len(line) else ''
            
            if in_block_comment:
                if char == '*' and next_char == '/':
                    in_block_comment = False
                    j += 2
                    continue
                j += 1
                continue
            if in_str:
                if char == '\\':
                    j += 2
                    continue
                if char == str_char:
                    in_str = False
                j += 1
                continue
            if char == '/' and next_char == '/':
                in_line_comment = True
                break
            if char == '/' and next_char == '*':
                in_block_comment = True
                j += 2
                continue
            if char == '"' or char == "'" or char == '`':
                in_str = True
                str_char = char
                j += 1
                continue
            
            if char == '{':
                depth += 1
                started = True
            if char == '}':
                depth -= 1
                if started and depth == 0:
                    return i + 1
            
            j += 1
        
        if started and depth == 0:
            break
    
    return start_line_0idx + 1

# Extract handlers
handlers = []
for name, start_line in handler_starts:
    end_line = find_end(start_line - 1)
    content = '\n'.join(lines[start_line - 1:end_line])
    handlers.append({
        'name': name,
        'domain': handler_domains[name],
        'content': content
    })

print(f'Extracted {len(handlers)} handlers')

# Group by domain
domains = {}
for h in handlers:
    if h['domain'] not in domains:
        domains[h['domain']] = []
    domains[h['domain']].append(h)

# Verify all handlers found
expected_handlers = set(handler_domains.keys())
found_handlers = set(h['name'] for h in handlers)
missing = expected_handlers - found_handlers
if missing:
    print(f'WARNING: Missing handlers: {missing}')
else:
    print('All handlers found!')

# ============================================================
# Extract shared utilities (non-handler functions)
# ============================================================
# Find all top-level functions that are NOT handlers
all_functions = []
for match in re.finditer(r'^(async )?function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', monolith, re.MULTILINE):
    name = match.group(2)
    line_start = monolith[:match.start()].count('\n') + 1
    all_functions.append((name, line_start))

print(f'Found {len(all_functions)} total functions')

utilities = []
for name, start_line in all_functions:
    if name not in handler_domains:
        end_line = find_end(start_line - 1)
        content = '\n'.join(lines[start_line - 1:end_line])
        utilities.append({
            'name': name,
            'content': content
        })

print(f'Found {len(utilities)} utility functions')

# ============================================================
# Extract shared constants and imports
# ============================================================
# The shared section is everything before the first handler
first_handler_line = min(h['start_line'] for h in handlers) if handlers else len(lines)
shared_section = '\n'.join(lines[:first_handler_line - 1])

# Add export keywords to shared section
export_constants = [
    'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_DB_URL', 'STRIPE_SECRET_KEY', 'stripe',
    'STRIPE_WEBHOOK_SECRET', 'STRIPE_API_VERSION', 'TWILIO_VERIFY_SERVICE_SID', 'APP_BASE_URL',
    'CLIQ_API_BASE_URL', 'CLIQ_MERCHANT_ID', 'CLIQ_API_KEY', 'CLIQ_WEBHOOK_SECRET',
    'CLIQ_CHECKOUT_URL_TEMPLATE', 'CLIQ_CHECKOUT_ENDPOINT', 'SANAD_API_BASE_URL',
    'SANAD_CLIENT_ID', 'SANAD_CLIENT_SECRET', 'SANAD_WEBHOOK_SECRET', 'SANAD_VERIFICATION_ENDPOINT',
    'STRIPE_WASEL_PLUS_PRICE_ID', 'ADDITIONAL_ALLOWED_ORIGINS', 'ALLOW_LOCAL_ORIGINS',
    'RUNTIME_ADMIN_ENABLED', 'SERVICE_NAME', 'responseBaseHeaders', 'deliveryEnv',
    'COMMUNICATIONS_RUNTIME_SQL', 'COMMUNICATIONS_OPERATIONS_SQL', 'CONTENT_MODERATION_SQL',
    'WEBHOOK_PATH_PREFIXES'
]

export_functions = [
    'json', 'addVersionHeader', 'noContent', 'buildResponseHeaders', 'finalizeResponse',
    'logUnhandledRouteError', 'sanitizedUnhandledErrorResponse', 'isOriginAllowed',
    'isWebhookRoute', 'enforceRequestSecurity', 'getAdminClient', 'authenticateRequest',
    'constantTimeEqual', 'getWorkerSecret', 'hasWorkerAccess', 'ensureRuntimeAdminAccess',
    'enforcePermission', 'hasAnyPermission', 'getFunctionBaseUrl', 'executeSqlStatements',
    'getAppBaseUrl', 'matchesAuthenticatedUser', 'parseWalletRoute', 'parseEntityRoute',
    'formatDate', 'formatTime', 'authenticateAuthUser', 'ensureCanonicalUserForAuth',
    'getWalletForUser', 'getVerificationForUser', 'getDriverForUser', 'ensureDriverForUser',
    'isApprovedDriver', 'buildProfilePayload', 'mapTripRow', 'mapBookingRow', 'mapPackageRow',
    'fetchDriverProfiles', 'authorizeTripOwner', 'stripeApiRequest', 'getExistingStripeCustomerId',
    'ensureStripeCustomer', 'fetchStripeSubscription', 'buildSubscriptionRecord',
    'mapSubscriptionPlan', 'toIsoFromUnix', 'mapWalletPaymentMethod', 'toMoneyNumber',
    'toStripeMinorAmount', 'buildCliqCheckoutUrl', 'joinProviderUrl', 'normalizeProviderStatus',
    'isSuccessfulProviderStatus', 'isFailedProviderStatus', 'firstStringValue',
    'ensureMobilitySeed', 'isPhoneNumberUniqueViolation', 'generateOtpCode',
    'getTwilioAuthPair', 'hasTwilioVerifyRuntime', 'callTwilioVerify',
    'startTwilioPhoneVerification', 'checkTwilioPhoneVerification', 'hashOtpCode',
    'isExpired', 'isOlderThanHours', 'computeTrustStepSummary', 'buildTrustStep',
    'buildTrustStatus'
]

export_async_functions = [
    'authenticateRequest', 'authenticateAuthUser', 'ensureCanonicalUserForAuth',
    'getWalletForUser', 'getVerificationForUser', 'getDriverForUser', 'ensureDriverForUser',
    'buildProfilePayload', 'fetchDriverProfiles', 'executeSqlStatements', 'callTwilioVerify',
    'startTwilioPhoneVerification', 'checkTwilioPhoneVerification', 'hashOtpCode',
    'buildTrustStatus', 'ensureStripeCustomer', 'fetchStripeSubscription', 'stripeApiRequest'
]

# Apply exports to shared section
for name in export_constants:
    shared_section = re.sub(r'^const ' + re.escape(name) + r'\b', 'export const ' + name, shared_section, count=1, flags=re.MULTILINE)

for name in export_functions:
    if name in export_async_functions:
        shared_section = re.sub(r'^async function ' + re.escape(name) + r'\b', 'export async function ' + name, shared_section, count=1, flags=re.MULTILINE)
    else:
        shared_section = re.sub(r'^function ' + re.escape(name) + r'\b', 'export function ' + name, shared_section, count=1, flags=re.MULTILINE)

# Write shared.ts
with open(os.path.join(handlers_dir, 'shared.ts'), 'w') as f:
    f.write(shared_section)
    f.write('\n\n')
    for util in utilities:
        if util['content'].startswith('async function'):
            f.write('export async ' + util['content'] + '\n\n')
        else:
            f.write('export ' + util['content'] + '\n\n')

print(f'Created _handlers/shared.ts')

# ============================================================
# Create domain files
# ============================================================
domain_imports = """import {
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
"""

for domain, hs in sorted(domains.items()):
    content = '\n\n'.join(h['content'] for h in hs)
    with open(os.path.join(handlers_dir, f'{domain}.ts'), 'w') as f:
        f.write(domain_imports + '\n' + content)
    print(f'Created _handlers/{domain}.ts ({len(hs)} handlers)')

# ============================================================
# Rebuild index.ts
# ============================================================
# Extract ROUTES array
routes_match = re.search(r'const ROUTES:.*?^\]', monolith, re.MULTILINE | re.DOTALL)
routes_section = routes_match.group(0) if routes_match else 'const ROUTES = [];'

# Extract resolveRoute
resolve_match = re.search(r'async function resolveRoute \([\s\S]*?^\}', monolith, re.MULTILINE)
resolve_section = resolve_match.group(0) if resolve_match else ''

# Extract RouteDescriptor interface
interface_match = re.search(r'interface RouteDescriptor \{[\s\S]*?\}', monolith)
interface_section = interface_match.group(0) if interface_match else ''

# Build domain imports
domain_import_lines = '\n'.join(f"import './_handlers/{d}.ts';" for d in sorted(domains.keys()))

new_index = f"""{domain_import_lines}

{interface_section}

{routes_section}

{resolve_section}

Deno.serve(async (request: Request) => {{
  let response: Response | undefined;
  if (!isOriginAllowed(request)) {{
    response = json({{ error: 'Origin not allowed' }}, 403);
    return finalizeResponse(request, response);
  }}
  if (request.method === 'OPTIONS') {{
    response = noContent();
    return finalizeResponse(request, response);
  }}
  try {{
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*make-server-0b1f4071/, '') || '/';
    if (request.method === 'GET' && path === '/health') {{
      response = await handleHealth(request);
      return finalizeResponse(request, response);
    }}
    response = await resolveRoute(request);
  }} catch (error) {{
    logUnhandledRouteError(error, request);
    response = sanitizedUnhandledErrorResponse();
  }}
  return finalizeResponse(request, response ?? json({{ error: 'Route not found' }}, 404));
}});
"""

with open(os.path.join(output_dir, 'index.ts'), 'w') as f:
    f.write(new_index)

print(f'\nRebuilt index.ts ({len(new_index.splitlines())} lines)')
print('\nDone!')
