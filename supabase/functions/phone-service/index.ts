import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TWILIO_VERIFY_SERVICE_SID = Deno.env.get('TWILIO_VERIFY_SERVICE_SID') ?? '';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOW_LOCAL_ORIGINS = Deno.env.get('ALLOW_LOCAL_ORIGINS') === 'true';

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
  if (!origin) {return null;}
  try {
    const url = new URL(origin);
    if (url.origin === new URL(APP_BASE_URL).origin) {return url.origin;}
    if (ALLOW_LOCAL_ORIGINS && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {return url.origin;}
    const extra = ADDITIONAL_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    if (extra.includes(url.origin)) {return url.origin;}
  } catch { /* ignore */ }
  return null;
}

function buildResponseHeaders(request: Request): Headers {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
  Object.entries(responseBaseHeaders).forEach(([k, v]) => headers.set(k, v));
  headers.set('Vary', 'Origin');
  if (allowedOrigin) {headers.set('Access-Control-Allow-Origin', allowedOrigin);}
  return headers;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {throw new Error('Supabase not configured');}
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function enforcePhoneRateLimit(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  action: 'send' | 'check',
  limit: number,
): Promise<Response | null> {
  try {
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: `phone-verify-${action}:${userId}`,
      p_limit: limit,
      p_window_seconds: 15 * 60,
    });
    if (error) {throw new Error(error.message);}
    const row = Array.isArray(data) ? data[0] : data;
    if (row && row.allowed === false) {
      const retryAfter = Math.max(Number(row.retry_after_seconds ?? 15 * 60), 1);
      return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.', retryAfterSeconds: retryAfter }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfter) },
      });
    }
    return null;
  } catch (error) {
    console.error('Phone verification rate limiter unavailable:', error instanceof Error ? error.message : String(error));
    return json({ error: 'Phone verification is temporarily unavailable. Please try again later.' }, 503);
  }
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {return { error: json({ error: 'Missing bearer token' }, 401) };}
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {return { error: json({ error: 'Invalid auth token' }, 401) };}
  const { data: byAuthUser, error: byAuthError } = await admin.from('users').select('*').eq('auth_user_id', authData.user.id).maybeSingle();
  if (byAuthError) {return { error: json({ error: 'Internal server error' }, 500) };}
  let canonicalUser = byAuthUser;
  if (!canonicalUser) {
    const fallback = await admin.from('users').select('*').eq('id', authData.user.id).maybeSingle();
    canonicalUser = fallback.data;
    if (fallback.error || !canonicalUser) {return { error: json({ error: 'User not found' }, 404) };}
  }
  return { admin, authUser: authData.user, canonicalUser };
}

function _constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {return false;}
  let result = 0;
  for (let i = 0; i < a.length; i++) {result |= a.charCodeAt(i) ^ b.charCodeAt(i);}
  return result === 0;
}

function getTwilioAuthPairs(): Array<{ user: string; password: string }> {
  const pairs: Array<{ user: string; password: string }> = [];
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
  const twilioApiKeySid = Deno.env.get('TWILIO_API_KEY_SID') ?? '';
  const twilioApiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET') ?? '';
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
  if (twilioApiKeySid && twilioApiKeySecret) {
    pairs.push({ user: twilioApiKeySid, password: twilioApiKeySecret });
  }
  if (twilioAccountSid && twilioAuthToken) {
    pairs.push({ user: twilioAccountSid, password: twilioAuthToken });
  }
  return pairs;
}

function hasTwilioVerifyRuntime(): boolean {
  return Boolean(Deno.env.get('TWILIO_ACCOUNT_SID') && TWILIO_VERIFY_SERVICE_SID && getTwilioAuthPairs().length);
}

async function callTwilioVerify(path: string, params: URLSearchParams) {
  const authPairs = getTwilioAuthPairs();
  if (!authPairs.length || !Deno.env.get('TWILIO_ACCOUNT_SID') || !TWILIO_VERIFY_SERVICE_SID) {
    return { ok: false, retryable: false, error: 'Twilio Verify is not configured.' };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    let response: Response | undefined;
    let payload: Record<string, unknown> = {};
    for (const authPair of authPairs) {
      response = await fetch(`https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}${path}`, {
        method: 'POST',
        headers: { Authorization: `Basic ${btoa(`${authPair.user}:${authPair.password}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: controller.signal,
      });
      payload = await response.json().catch(() => ({}));
      // Try account credentials only when API-key credentials are rejected.
      // Never repeat a potentially billable operation for timeouts/provider errors.
      if (response.status !== 401) {break;}
    }
    if (!response) {return { ok: false, retryable: false, error: 'Twilio Verify is not configured.' };}
    return {
      ok: response.ok,
      retryable: response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 403,
      payload,
      error: typeof payload?.message === 'string' ? payload.message : `Twilio Verify request failed (${response.status}).`,
    };
  } catch (error) {
    console.error('Twilio Verify request failed:', error instanceof Error ? error.message : String(error));
    return { ok: false, retryable: false, error: controller.signal.aborted ? 'Twilio Verify timed out. Please try again.' : 'Twilio Verify could not be reached. Please try again.' };
  } finally {
    clearTimeout(timeout);
  }
}

async function startTwilioPhoneVerification(phoneNumber: string) {
  const result = await callTwilioVerify('/Verifications', new URLSearchParams({ To: phoneNumber, Channel: 'sms', Locale: 'ar' }));
  return { ok: result.ok, retryable: result.retryable, error: result.ok ? undefined : result.error };
}

async function checkTwilioPhoneVerification(phoneNumber: string, code: string) {
  const result = await callTwilioVerify('/VerificationCheck', new URLSearchParams({ To: phoneNumber, Code: code }));
  const status = typeof result.payload?.status === 'string' ? result.payload.status : '';
  return { ok: result.ok && status === 'approved', retryable: result.retryable, error: result.ok ? 'That verification code is incorrect.' : result.error };
}

function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {return cleaned;}
  if (cleaned.startsWith('00')) {return '+' + cleaned.slice(2);}
  if (cleaned.startsWith('962')) {return '+' + cleaned;}
  if (cleaned.startsWith('0') && cleaned.length === 10) {return '+962' + cleaned.slice(1);}
  return cleaned;
}

function isValidE164Phone(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

async function handlePhoneVerification(request: Request, path: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) {return auth.error;}
  const admin = auth.admin;
  const body = await request.json().catch(() => ({}));

  if (request.method === 'POST' && path === '/phone/send-code') {
    const phoneNumber = normalizePhoneNumber(String(body.phone ?? ''));
    if (!isValidE164Phone(phoneNumber)) {return json({ error: 'Invalid phone number format.' }, 400);}
    const rateLimited = await enforcePhoneRateLimit(admin, auth.canonicalUser.id, 'send', 3);
    if (rateLimited) {return rateLimited;}

    if (!hasTwilioVerifyRuntime()) {
      return json({ error: 'Phone verification is temporarily unavailable. Please try again later.' }, 503);
    }
    const result = await startTwilioPhoneVerification(phoneNumber);
    if (result.ok) {return json({ success: true, message: 'Verification code sent.' });}
    return json({ error: result.error ?? 'Failed to send verification code.' }, result.retryable ? 400 : 502);
  }

  if (request.method === 'POST' && path === '/phone/verify-code') {
    const phoneNumber = normalizePhoneNumber(String(body.phone ?? ''));
    const code = String(body.code ?? '').trim();
    if (!isValidE164Phone(phoneNumber)) {return json({ error: 'Invalid phone number format.' }, 400);}
    if (!code) {return json({ error: 'Verification code is required.' }, 400);}
    const rateLimited = await enforcePhoneRateLimit(admin, auth.canonicalUser.id, 'check', 5);
    if (rateLimited) {return rateLimited;}

    if (!hasTwilioVerifyRuntime()) {
      return json({ error: 'Phone verification is temporarily unavailable. Please try again later.' }, 503);
    }
    const result = await checkTwilioPhoneVerification(phoneNumber, code);
    if (!result.ok) {
      return json({ error: result.error ?? 'Verification failed.' }, result.retryable ? 400 : 502);
    }
    const { error: updateError } = await admin.from('users')
      .update({ phone_verified_at: new Date().toISOString(), phone_number: phoneNumber })
      .eq('id', auth.canonicalUser.id);
    if (updateError) {return json({ error: 'Phone was verified, but the account could not be updated. Please retry.' }, 500);}
    return json({ success: true, message: 'Phone number verified.' });
  }

  return json({ error: 'Not found' }, 404);
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') {return new Response(null, { status: 204, headers });}

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*phone-service/, '') || '/';
    // The route handlers return undefined when no sub-path matches so the router can
    // decide between a 404 and the next branch.
    let response: Response | undefined;

    if (path.startsWith('/phone')) {
      response = await handlePhoneVerification(request, path);
      if (!response) {response = json({ error: 'Not found', service: 'phone-service' }, 404);}
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'phone-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'phone-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    console.error('Phone service error:', error instanceof Error ? error.message : String(error));
    return json({ error: 'Internal server error' }, 500);
  }
});
