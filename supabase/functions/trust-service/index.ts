import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOW_LOCAL_ORIGINS = Deno.env.get('ALLOW_LOCAL_ORIGINS') === 'true';
const IDENTITY_PENDING_TIMEOUT_HOURS = 24;
const DRIVER_DOCUMENT_TIMEOUT_HOURS = 72;

const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.origin === new URL(APP_BASE_URL).origin) return url.origin;
    if (ALLOW_LOCAL_ORIGINS && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.origin;
    const extra = ADDITIONAL_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    if (extra.includes(url.origin)) return url.origin;
  } catch { /* ignore */ }
  return null;
}

function buildResponseHeaders(request: Request): Headers {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
  Object.entries(responseBaseHeaders).forEach(([k, v]) => headers.set(k, v));
  headers.set('Vary', 'Origin');
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  return headers;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { error: json({ error: 'Missing bearer token' }, 401) };
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { error: json({ error: 'Invalid auth token' }, 401) };
  const { data: byAuthUser, error: byAuthError } = await admin.from('users').select('*').eq('auth_user_id', authData.user.id).maybeSingle();
  if (byAuthError) return { error: json({ error: byAuthError.message }, 500) };
  let canonicalUser = byAuthUser;
  if (!canonicalUser) {
    const fallback = await admin.from('users').select('*').eq('id', authData.user.id).maybeSingle();
    canonicalUser = fallback.data;
    if (fallback.error || !canonicalUser) return { error: json({ error: 'User not found' }, 404) };
  }
  return { admin, authUser: authData.user, canonicalUser };
}

function isExpired(isoValue?: string | null): boolean {
  if (!isoValue) return false;
  const expiresAt = new Date(isoValue).getTime();
  if (Number.isNaN(expiresAt)) return false;
  return expiresAt <= Date.now();
}

function isOlderThanHours(isoValue: string | null | undefined, hours: number): boolean {
  if (!isoValue) return false;
  const timestamp = new Date(isoValue).getTime();
  if (Number.isNaN(timestamp)) return false;
  return Date.now() - timestamp >= hours * 60 * 60 * 1000;
}

function computeTrustStepSummary(steps: Record<string, { id: string; state: string }>) {
  const orderedSteps = [steps.phone, steps.email, steps.identity, steps.driverDocuments, steps.walletStanding];
  const completedSteps = orderedSteps.filter((step) => step.state === 'completed').length;
  return {
    completedSteps, totalSteps: orderedSteps.length,
    nextStepId: orderedSteps.find((step) => step.state !== 'completed')?.id ?? null,
    blockedSteps: orderedSteps.filter((step) => step.state === 'failed').map((step) => step.id),
  };
}

function buildTrustStep(id: string, state: string, detail: string, meta: Record<string, unknown>, options?: { failureReason?: string | null; updatedAt?: string | null }) {
  return { id, state, detail, failureReason: options?.failureReason ?? null, updatedAt: options?.updatedAt ?? null, meta };
}

async function buildTrustStatus(auth: Awaited<ReturnType<typeof authenticateRequest>>) {
  if ('error' in auth) return null;

  const [verificationResult, driverResult, walletResult, otpResult] = await Promise.all([
    auth.admin.from('verification_records').select('verification_id, sanad_status, document_status, verification_level, verification_timestamp, provider_reference, document_reference, failure_reason, updated_at').eq('user_id', auth.canonicalUser.id).order('verification_timestamp', { ascending: false }).limit(1).maybeSingle(),
    auth.admin.from('drivers').select('driver_id, license_number, driver_status, verification_level, sanad_identity_linked, background_check_status, created_at, updated_at').eq('user_id', auth.canonicalUser.id).maybeSingle(),
    auth.admin.from('wallets').select('wallet_id, wallet_status, updated_at').eq('user_id', auth.canonicalUser.id).maybeSingle(),
    auth.admin.from('otp_sessions').select('otp_session_id, phone_number, attempts, max_attempts, expires_at, consumed_at, created_at').eq('user_id', auth.canonicalUser.id).eq('purpose', 'driver_action').order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (verificationResult.error) throw new Error(verificationResult.error.message);
  if (driverResult.error) throw new Error(driverResult.error.message);
  if (walletResult.error) throw new Error(walletResult.error.message);
  if (otpResult.error) throw new Error(otpResult.error.message);

  const verification = verificationResult.data;
  const driver = driverResult.data;
  const wallet = walletResult.data;
  const otpSession = otpResult.data;
  const verificationLevel = String(verification?.verification_level ?? auth.canonicalUser.verification_level ?? 'level_0');
  const canonicalRole = String(auth.canonicalUser.role ?? 'passenger');
  const emailAddress = auth.authUser.email ?? auth.canonicalUser.email ?? null;
  const emailVerified = Boolean(auth.authUser.email_confirmed_at);
  const phoneVerified = Boolean(auth.canonicalUser.phone_verified_at);

  const identityUpdatedAt = String(verification?.updated_at ?? verification?.verification_timestamp ?? auth.canonicalUser.updated_at ?? '') || null;
  const staleIdentity = verification?.sanad_status === 'pending' && isOlderThanHours(identityUpdatedAt, IDENTITY_PENDING_TIMEOUT_HOURS);
  const identityFailureReason = staleIdentity ? 'Sanad verification timed out. Submit the request again.' : verification?.failure_reason ?? null;

  const identity = verification?.sanad_status === 'verified' || verificationLevel === 'level_2' || verificationLevel === 'level_3'
    ? buildTrustStep('identity', 'completed', 'Identity verification is complete.', { providerReference: verification?.provider_reference ?? null, documentReference: verification?.document_reference ?? null }, { updatedAt: identityUpdatedAt })
    : verification?.sanad_status === 'rejected' || verification?.sanad_status === 'expired' || staleIdentity
      ? buildTrustStep('identity', 'failed', 'Identity verification did not complete.', { providerReference: verification?.provider_reference ?? null, documentReference: verification?.document_reference ?? null }, { failureReason: identityFailureReason ?? 'Sanad verification was rejected. Review the reason and try again.', updatedAt: identityUpdatedAt })
      : verification?.sanad_status === 'pending'
        ? buildTrustStep('identity', 'in_progress', 'Sanad verification is under review.', { providerReference: verification?.provider_reference ?? null, documentReference: verification?.document_reference ?? null }, { updatedAt: identityUpdatedAt })
        : buildTrustStep('identity', 'not_started', 'Submit Sanad verification to continue.', { providerReference: null, documentReference: null });

  const email = buildTrustStep('email', emailVerified ? 'completed' : emailAddress ? 'in_progress' : 'not_started',
    emailVerified ? 'Email is verified.' : emailAddress ? 'Email confirmation is still required.' : 'Add an email address to continue.', { email: emailAddress });

  const phoneFailureReason = otpSession && !otpSession.consumed_at && isExpired(otpSession.expires_at) ? 'The verification code expired. Send a new code.' : otpSession && Number(otpSession.attempts ?? 0) >= Number(otpSession.max_attempts ?? 5) ? 'Too many incorrect verification attempts. Send a new code.' : null;
  const phoneState = phoneVerified ? 'completed' : phoneFailureReason ? 'failed' : otpSession && !otpSession.consumed_at && !isExpired(otpSession.expires_at) ? 'in_progress' : auth.canonicalUser.phone_number ? 'not_started' : 'not_started';
  const phone = buildTrustStep('phone', phoneState,
    phoneVerified ? 'Phone number is verified.' : otpSession && !otpSession.consumed_at && !isExpired(otpSession.expires_at) ? 'Enter the latest code sent to your phone.' : auth.canonicalUser.phone_number ? 'Send a verification code to confirm this phone number.' : 'Add a phone number to receive a verification code.',
    { phone: otpSession?.phone_number ?? auth.canonicalUser.phone_number ?? null, expiresAt: otpSession && !otpSession.consumed_at && !isExpired(otpSession.expires_at) ? otpSession.expires_at : null },
    { failureReason: phoneFailureReason, updatedAt: otpSession?.created_at ?? auth.canonicalUser.phone_verified_at ?? null });

  const driverReviewUpdatedAt = String(driver?.updated_at ?? verification?.updated_at ?? verification?.verification_timestamp ?? '') || null;
  const staleDriverReview = (driver?.background_check_status === 'pending' || verification?.document_status === 'pending' || driver?.driver_status === 'pending_approval') && isOlderThanHours(driverReviewUpdatedAt, DRIVER_DOCUMENT_TIMEOUT_HOURS);
  const driverFailureReason = staleDriverReview ? 'Driver document review timed out. Resubmit the documents.' : driver?.background_check_status === 'rejected' || driver?.driver_status === 'rejected' ? 'Driver documents were rejected. Review the failed items and resubmit.' : driver?.background_check_status === 'expired' ? 'Driver documents expired and must be submitted again.' : driver?.driver_status === 'suspended' ? 'Driver account is suspended and cannot be approved until reviewed.' : verification?.document_status === 'rejected' ? verification?.failure_reason ?? 'Driver documents were rejected.' : null;

  const driverDocuments = canonicalRole !== 'driver'
    ? buildTrustStep('driver_documents', 'not_started', 'Enable Driver mode before submitting driver documents.', { role: canonicalRole === 'admin' ? 'driver' : 'rider', licenseNumber: driver?.license_number ?? null })
    : (driver?.background_check_status === 'verified' && ['approved', 'offline', 'online', 'busy'].includes(String(driver?.driver_status))) || verificationLevel === 'level_3'
      ? buildTrustStep('driver_documents', 'completed', 'Driver documents are approved.', { role: 'driver', licenseNumber: driver?.license_number ?? null }, { updatedAt: driverReviewUpdatedAt })
      : driverFailureReason
        ? buildTrustStep('driver_documents', 'failed', 'Driver documents need attention before approval can continue.', { role: 'driver', licenseNumber: driver?.license_number ?? null }, { failureReason: driverFailureReason, updatedAt: driverReviewUpdatedAt })
        : driver?.background_check_status === 'pending' || verification?.document_status === 'pending' || driver?.driver_status === 'pending_approval'
          ? buildTrustStep('driver_documents', 'in_progress', 'Driver documents are under review.', { role: 'driver', licenseNumber: driver?.license_number ?? null }, { updatedAt: driverReviewUpdatedAt })
          : buildTrustStep('driver_documents', 'not_started', 'Submit driver license and compliance documents.', { role: 'driver', licenseNumber: driver?.license_number ?? null });

  const walletStatus = String(wallet?.wallet_status ?? 'unavailable');
  const walletStanding = walletStatus === 'active'
    ? buildTrustStep('wallet_standing', 'completed', 'Wallet standing is healthy.', { walletStatus: 'active' }, { updatedAt: wallet?.updated_at ?? null })
    : walletStatus === 'limited'
      ? buildTrustStep('wallet_standing', 'in_progress', 'Wallet standing is limited and may block some actions.', { walletStatus: 'limited' }, { updatedAt: wallet?.updated_at ?? null })
      : buildTrustStep('wallet_standing', 'failed', walletStatus === 'unavailable' ? 'Wallet is not provisioned yet.' : `Wallet standing is ${walletStatus}.`, { walletStatus: walletStatus === 'frozen' || walletStatus === 'closed' ? walletStatus : 'unavailable' }, { failureReason: walletStatus === 'closed' ? 'Wallet is closed and must be restored before payouts can continue.' : walletStatus === 'frozen' ? 'Wallet is frozen and needs review before payouts can continue.' : 'Wallet provisioning is missing for this account.', updatedAt: wallet?.updated_at ?? null });

  const steps = { identity, email, phone, driverDocuments, walletStanding };
  const summary = computeTrustStepSummary(steps);

  return { fetchedAt: new Date().toISOString(), verificationLevel, ...summary, steps };
}

async function handleTrustRequest(request: Request, path: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  if (request.method === 'GET' && (path === '/trust/status' || path === '/trust')) {
    try {
      const status = await buildTrustStatus(auth);
      if (!status) return json({ error: 'Unable to load trust status' }, 500);
      return json(status);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  }

  return json({ error: 'Not found' }, 404);
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*trust-service/, '') || '/';
    let response: Response;

    if (path.startsWith('/trust')) {
      response = await handleTrustRequest(request, path);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'trust-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'trust-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
