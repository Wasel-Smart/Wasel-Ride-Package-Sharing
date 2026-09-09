import os
import re

monolith_path = os.path.join(os.path.dirname(__file__), '../supabase/functions/make-server-0b1f4071/index.ts')
output_dir = os.path.dirname(monolith_path)
handlers_dir = os.path.join(output_dir, '_handlers')

os.makedirs(handlers_dir, exist_ok=True)

with open(monolith_path, 'r') as f:
    monolith = f.read()

lines = monolith.split('\n')

# ============================================================
# STEP 1: Find all function definitions
# ============================================================
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

# Find all function definitions
all_functions = []
for i, line in enumerate(lines):
    async_match = re.match(r'^async function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
    sync_match = re.match(r'^function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(', line)
    name = async_match.group(1) if async_match else (sync_match.group(1) if sync_match else None)
    if name:
        all_functions.append({
            'name': name,
            'is_async': bool(async_match),
            'start_line': i + 1
        })

print(f'Found {len(all_functions)} functions')

# Separate handlers and utilities
handlers = []
utilities = []

for fn in all_functions:
    end = find_end(fn['start_line'] - 1)
    content = '\n'.join(lines[fn['start_line'] - 1:end])
    
    if fn['name'] in handler_domains:
        handlers.append({
            'name': fn['name'],
            'domain': handler_domains[fn['name']],
            'content': content
        })
    else:
        utilities.append({
            'name': fn['name'],
            'content': content
        })

print(f'Handlers: {len(handlers)}, Utilities: {len(utilities)}')

# Group handlers by domain
domains = {}
for h in handlers:
    if h['domain'] not in domains:
        domains[h['domain']] = []
    domains[h['domain']].append(h)

# ============================================================
# STEP 2: Append utilities to shared.ts
# ============================================================
shared_path = path.join(handlers_dir, 'shared.ts')
with open(shared_path, 'r') as f:
    shared_ts = f.read()

for util in utilities:
    prefix = 'export async ' if util['content'].startswith('async function') else 'export '
    cleaned = util['content'].replace('function ', '', 1) if not util['content'].startswith('async') else util['content'].replace('async function ', 'async ', 1)
    shared_ts += '\n\n' + prefix + cleaned

with open(shared_path, 'w') as f:
    f.write(shared_ts)

print('Updated _handlers/shared.ts')

# ============================================================
# STEP 3: Create domain files
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
    file_path = path.join(handlers_dir, f'{domain}.ts')
    with open(file_path, 'w') as f:
        f.write(domain_imports + '\n' + content)
    print(f'Created _handlers/{domain}.ts ({len(hs)} handlers)')

# ============================================================
# STEP 4: Rebuild index.ts
# ============================================================
domain_import_lines = '\n'.join(f"import './_handlers/{d}.ts';" for d in sorted(domains.keys()))

# Extract ROUTES array
routes_start = -1
routes_end = -1
for i, line in enumerate(lines):
    if 'const ROUTES:' in line:
        routes_start = i
        break

if routes_start >= 0:
    depth = 0
    started = False
    for j in range(routes_start, len(lines)):
        for char in lines[j]:
            if char == '{':
                depth += 1
                started = True
            if char == '}':
                depth -= 1
                if started and depth == 0:
                    routes_end = j + 1
                    break
        if started and depth == 0:
            break

routes_section = '\n'.join(lines[routes_start:routes_end]) if routes_start >= 0 and routes_end >= 0 else 'const ROUTES = [];'

# Extract resolveRoute
resolve_route_match = re.search(r'async function resolveRoute \([\s\S]*?^\}', monolith, re.MULTILINE)
resolve_route_section = resolve_route_match.group(0) if resolve_route_match else ''

new_index = f"""{domain_import_lines}

{routes_section}

{resolve_route_section}

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

with open(monolith_path, 'w') as f:
    f.write(new_index)

print('\nRebuilt index.ts')
print(f'New index.ts lines: {len(new_index.splitlines())}')
print('\nDone!')
