/**
 * Wasel phone verification via Twilio Verify.
 *
 * OTP generation, delivery, expiry, and verification are delegated to
 * Twilio Verify. No OTP is stored in Wasel's database or application logs.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

function readKeySet(name: string): string | null {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const value = parsed.default;
    return typeof value === 'string' && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

const SUPABASE_PUBLISHABLE_KEY =
  readKeySet('SUPABASE_PUBLISHABLE_KEYS') ??
  Deno.env.get('SUPABASE_ANON_KEY') ??
  '';
const SUPABASE_SECRET_KEY =
  readKeySet('SUPABASE_SECRET_KEYS') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  '';

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID') ?? '';
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN') ?? '';
const TWILIO_API_KEY_SID = Deno.env.get('TWILIO_API_KEY_SID') ?? '';
const TWILIO_API_KEY_SECRET = Deno.env.get('TWILIO_API_KEY_SECRET') ?? '';
const TWILIO_VERIFY_SERVICE_SID =
  Deno.env.get('TWILIO_VERIFY_SERVICE_SID') ??
  Deno.env.get('TWILIO_VERIFY_SID') ??
  '';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://wasel14.online',
  'https://www.wasel14.online',
  'https://wasel.wasel14.online',
  'https://waseljo.wasel14.online',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

const configuredOrigins = (Deno.env.get('WASEL_ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...configuredOrigins,
]);

function corsHeaders(origin: string | null): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

function normalizeE164(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const phone = value.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return null;
  return phone;
}

function isConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_PUBLISHABLE_KEY &&
    SUPABASE_SECRET_KEY &&
    ((TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET) ||
      (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN)) &&
    /^VA[0-9a-f]{32}$/i.test(TWILIO_VERIFY_SERVICE_SID)
  );
}

async function callSupabaseRpc(
  functionName: string,
  args: Record<string, unknown>,
): Promise<{ data: unknown; error: { code?: string } | null }> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/${functionName}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SECRET_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    let code = String(response.status);
    try {
      const payload = await response.json() as { code?: string };
      if (payload.code) code = payload.code;
    } catch {
      // Keep only the HTTP status; never log or return upstream details.
    }
    return { data: null, error: { code } };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    return { data: null, error: { code: 'INVALID_RPC_RESPONSE' } };
  }
  return { data, error: null };
}

async function supabaseAdminRateLimit(
  userId: string,
  phoneNumber: string,
  action: 'send' | 'verify',
  limit: number,
): Promise<{ data: unknown; error: { code?: string } | null }> {
  return await callSupabaseRpc('consume_phone_verification_rate_limit', {
    p_user_id: userId,
    p_phone_number: phoneNumber,
    p_action: action,
    p_limit: limit,
  });
}

function twilioAuthHeader(): string {
  const useApiKey = Boolean(TWILIO_API_KEY_SID && TWILIO_API_KEY_SECRET);
  const username = useApiKey ? TWILIO_API_KEY_SID : TWILIO_ACCOUNT_SID;
  const password = useApiKey ? TWILIO_API_KEY_SECRET : TWILIO_AUTH_TOKEN;
  return `Basic ${btoa(`${username}:${password}`)}`;
}

async function callTwilioVerify(
  endpoint: 'Verifications' | 'VerificationCheck',
  values: URLSearchParams,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  const url =
    `https://verify.twilio.com/v2/Services/${TWILIO_VERIFY_SERVICE_SID}/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: twilioAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: values,
    signal: AbortSignal.timeout(10_000),
  });

  let data: Record<string, unknown> = {};
  try {
    data = await response.json() as Record<string, unknown>;
  } catch {
    // Do not surface provider response bodies to clients.
  }
  return { ok: response.ok, status: response.status, data };
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ error: 'Origin not allowed' }, 403, headers);
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, headers);
  }

  if (!isConfigured()) {
    console.error('Phone verification configuration is incomplete');
    return jsonResponse({ error: 'Phone verification is temporarily unavailable' }, 503, headers);
  }

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401, headers);
    }

    const accessToken = authorization.slice('Bearer '.length).trim();
    if (!accessToken) {
      return jsonResponse({ error: 'Unauthorized' }, 401, headers);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401, headers);
    }

    const url = new URL(req.url);
    const route = url.pathname.replace(/\/+$/, '').split('/').pop();
    if (route !== 'send-code' && route !== 'verify-code') {
      return jsonResponse({ error: 'Not found' }, 404, headers);
    }

    const rawBody = await req.text();
    if (rawBody.length > 2048) {
      return jsonResponse({ error: 'Request too large' }, 413, headers);
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, headers);
    }

    const phoneNumber = normalizeE164(body.phone_number);
    if (!phoneNumber) {
      return jsonResponse({ error: 'A valid E.164 phone number is required' }, 400, headers);
    }

    if (route === 'send-code') {
      const { data: allowed, error: limitError } = await supabaseAdminRateLimit(
        user.id, phoneNumber, 'send', 3,
      );
      if (limitError) {
        console.error('Phone verification send rate-limit check failed', { code: limitError.code });
        return jsonResponse({ error: 'Phone verification is temporarily unavailable' }, 503, headers);
      }
      if (allowed !== true) {
        return jsonResponse({ error: 'Too many verification requests. Please wait before trying again.' }, 429, headers);
      }
      const userAllowed = await supabaseAdminRateLimit(user.id, '*', 'send', 5);
      if (userAllowed.error) {
        console.error('Phone verification user rate-limit check failed', { code: userAllowed.error.code });
        return jsonResponse({ error: 'Phone verification is temporarily unavailable' }, 503, headers);
      }
      if (userAllowed.data !== true) {
        return jsonResponse({ error: 'Too many verification requests. Please wait before trying again.' }, 429, headers);
      }
      const values = new URLSearchParams({ To: phoneNumber, Channel: 'sms' });
      const result = await callTwilioVerify('Verifications', values);

      if (!result.ok) {
        if (result.status === 429 || result.data.code === 60203 || result.data.code === 60212 || result.data.code === 60238 || result.data.code === 60245) {
          return jsonResponse({ error: 'Too many verification requests. Please wait before trying again.' }, 429, headers);
        }
        console.error('Twilio Verify send failed', { status: result.status, code: result.data.code });
        return jsonResponse({ error: 'Unable to send a verification code. Please try again later.' }, 502, headers);
      }

      return jsonResponse({ success: true, message: 'Verification code sent' }, 200, headers);
    }

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    if (!/^\d{4,10}$/.test(code)) {
      return jsonResponse({ error: 'A valid verification code is required' }, 400, headers);
    }

    const { data: allowed, error: limitError } = await supabaseAdminRateLimit(
      user.id, phoneNumber, 'verify', 5,
    );
    if (limitError) {
      console.error('Phone verification attempt rate-limit check failed', { code: limitError.code });
      return jsonResponse({ error: 'Phone verification is temporarily unavailable' }, 503, headers);
    }
    if (allowed !== true) {
      return jsonResponse({ error: 'Too many verification attempts. Please try again later.' }, 429, headers);
    }
    const userAllowed = await supabaseAdminRateLimit(user.id, '*', 'verify', 10);
    if (userAllowed.error) {
      console.error('Phone verification user attempt rate-limit check failed', { code: userAllowed.error.code });
      return jsonResponse({ error: 'Phone verification is temporarily unavailable' }, 503, headers);
    }
    if (userAllowed.data !== true) {
      return jsonResponse({ error: 'Too many verification attempts. Please try again later.' }, 429, headers);
    }

    const values = new URLSearchParams({ To: phoneNumber, Code: code });
    const result = await callTwilioVerify('VerificationCheck', values);

    if (!result.ok) {
      if (result.status === 429 || result.data.code === 60202 || result.data.code === 60203 || result.data.code === 60212) {
        return jsonResponse({ error: 'Too many verification attempts. Please try again later.' }, 429, headers);
      }
      if (result.status === 404 || result.data.code === 20404 || result.data.code === 60431) {
        return jsonResponse({ error: 'Invalid or expired verification code' }, 400, headers);
      }
      console.error('Twilio Verify check failed', { status: result.status, code: result.data.code });
      return jsonResponse({ error: 'Unable to verify this code. Please request a new one.' }, 502, headers);
    }

    if (result.data.status !== 'approved') {
      return jsonResponse({ error: 'Invalid or expired verification code' }, 400, headers);
    }

    const { error: confirmationError } = await callSupabaseRpc('confirm_phone_verification', {
      p_user_id: user.id,
      p_phone_number: phoneNumber,
    });

    if (confirmationError) {
      console.error('Phone verification database confirmation failed', {
        code: confirmationError.code,
      });
      return jsonResponse({ error: 'Verification succeeded but account update failed. Please contact support.' }, 500, headers);
    }

    return jsonResponse({ success: true, message: 'Phone verified successfully' }, 200, headers);
  } catch (error) {
    console.error('Phone verification request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
    });
    return jsonResponse({ error: 'Phone verification is temporarily unavailable' }, 500, headers);
  }
});
