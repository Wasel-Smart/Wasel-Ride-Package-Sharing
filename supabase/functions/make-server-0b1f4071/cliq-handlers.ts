/**
 * CliQ / JoPACC handlers for the Wasel Edge Function.
 *
 * JoPACC API base: https://api.jopacc.com/cliq/v2
 * OAuth2 token:    https://api.jopacc.com/oauth/token
 *
 * Required Supabase secrets (set via `supabase secrets set`):
 *   CLIQ_CLIENT_ID
 *   CLIQ_CLIENT_SECRET
 *   CLIQ_MERCHANT_ALIAS
 *   CLIQ_WEBHOOK_SECRET
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Config ───────────────────────────────────────────────────────────────────

const JOPACC_TOKEN_URL = 'https://api.jopacc.com/oauth/token';
const JOPACC_API_BASE = 'https://api.jopacc.com/cliq/v2';
const CLIQ_CURRENCY = 'JOD';

// ─── Types ────────────────────────────────────────────────────────────────────

type CliQPaymentStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'REFUNDED';

interface CliQTokenCache {
  value: string;
  expiresAt: number;
}

interface JoPACCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

// ─── OAuth token management ───────────────────────────────────────────────────

let _tokenCache: CliQTokenCache | null = null;

async function getJoPACCToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt > now + 30_000) {
    return _tokenCache.value;
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(JOPACC_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'payments qr refunds',
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`JoPACC token fetch failed (${res.status}): ${text}`);
  }

  const data = await res.json() as JoPACCTokenResponse;
  _tokenCache = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return _tokenCache.value;
}

// ─── JoPACC API client ────────────────────────────────────────────────────────

function getRoundedJOD(amount: number): string {
  return (Math.round(amount * 1000) / 1000).toFixed(3);
}

async function joPACCPost<T>(
  path: string,
  body: unknown,
  merchantAlias: string,
  token: string,
): Promise<T> {
  const res = await fetch(`${JOPACC_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Merchant-Alias': merchantAlias,
      'X-Request-ID': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`JoPACC API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

async function joPACCGet<T>(
  path: string,
  merchantAlias: string,
  token: string,
): Promise<T> {
  const res = await fetch(`${JOPACC_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Merchant-Alias': merchantAlias,
      'X-Request-ID': crypto.randomUUID(),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`JoPACC API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ─── Webhook signature verification ──────────────────────────────────────────

async function verifyJoPACCSignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBytes = Uint8Array.from(
      signature.replace(/^sha256=/, ''),
      (c) => parseInt(c, 16),
    );
    const msgBytes = new TextEncoder().encode(payload);

    return crypto.subtle.verify('HMAC', key, sigBytes, msgBytes);
  } catch {
    return false;
  }
}

// ─── Handler factory ──────────────────────────────────────────────────────────

export function createCliQHandlers() {
  const clientId = Deno.env.get('CLIQ_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('CLIQ_CLIENT_SECRET') ?? '';
  const merchantAlias = Deno.env.get('CLIQ_MERCHANT_ALIAS') ?? 'wasel';
  const webhookSecret = Deno.env.get('CLIQ_WEBHOOK_SECRET') ?? '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  const isConfigured = Boolean(clientId && clientSecret);

  function json(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  function notConfigured(): Response {
    return json(
      {
        error: 'CliQ is not configured on this environment. Set CLIQ_CLIENT_ID and CLIQ_CLIENT_SECRET.',
        code: 'CLIQ_NOT_CONFIGURED',
      },
      503,
    );
  }

  async function readJson(req: Request): Promise<Record<string, unknown>> {
    return req.json()
      .then((v) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}))
      .catch(() => ({}));
  }

  async function ensureAuth(req: Request): Promise<{ userId: string } | Response> {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return json({ error: 'Unauthorized' }, 401);

    return { userId: user.id };
  }

  // ── POST /cliq/payments ─────────────────────────────────────────────────────
  async function handleInitiatePayment(req: Request): Promise<Response> {
    if (!isConfigured) return notConfigured();

    const auth = await ensureAuth(req);
    if (auth instanceof Response) return auth;

    const body = await readJson(req);
    const { recipientAlias, aliasType, amount, description, merchantReference, redirectUrl } = body;

    if (!recipientAlias || !aliasType || typeof amount !== 'number' || !description || !merchantReference) {
      return json({ error: 'recipientAlias, aliasType, amount, description, and merchantReference are required.' }, 400);
    }

    if (!Number.isFinite(amount as number) || (amount as number) <= 0) {
      return json({ error: 'amount must be a positive finite number in JOD.' }, 400);
    }

    try {
      const token = await getJoPACCToken(clientId, clientSecret);
      const result = await joPACCPost(
        '/payments',
        {
          merchantAlias,
          recipientAlias,
          aliasType,
          amount: { value: getRoundedJOD(amount as number), currency: CLIQ_CURRENCY },
          description: String(description).slice(0, 140),
          merchantReference,
          ...(redirectUrl ? { redirectUrl } : {}),
        },
        merchantAlias,
        token,
      );

      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('payment_intents').insert({
        id: crypto.randomUUID(),
        user_id: auth.userId,
        provider: 'cliq',
        status: 'processing',
        amount: Math.round((amount as number) * 1000),
        currency: CLIQ_CURRENCY,
        merchant_reference: merchantReference,
        provider_payment_id: (result as Record<string, unknown>).paymentId,
        metadata: { aliasType, recipientAlias },
        created_at: new Date().toISOString(),
      }).catch(() => undefined);

      return json(result, 201);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'CliQ payment initiation failed.' }, 502);
    }
  }

  // ── GET /cliq/payments/:id/status ──────────────────────────────────────────
  async function handleGetPaymentStatus(req: Request, paymentId: string): Promise<Response> {
    if (!isConfigured) return notConfigured();

    const auth = await ensureAuth(req);
    if (auth instanceof Response) return auth;

    try {
      const token = await getJoPACCToken(clientId, clientSecret);
      const result = await joPACCGet(`/payments/${encodeURIComponent(paymentId)}`, merchantAlias, token);

      const status = ((result as Record<string, unknown>).status as CliQPaymentStatus | undefined) ?? 'PENDING';

      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('payment_intents')
        .update({
          status: status === 'COMPLETED' ? 'succeeded' : status === 'FAILED' ? 'failed' : 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_payment_id', paymentId)
        .catch(() => undefined);

      return json(result);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'CliQ status check failed.' }, 502);
    }
  }

  // ── POST /cliq/qr ─────────────────────────────────────────────────────────
  async function handleGenerateQR(req: Request): Promise<Response> {
    if (!isConfigured) return notConfigured();

    const auth = await ensureAuth(req);
    if (auth instanceof Response) return auth;

    const body = await readJson(req);
    const { amount, description, merchantReference, expiresInSeconds } = body;

    if (!merchantReference) {
      return json({ error: 'merchantReference is required.' }, 400);
    }

    try {
      const token = await getJoPACCToken(clientId, clientSecret);
      const result = await joPACCPost(
        '/qr-payments',
        {
          merchantAlias,
          ...(typeof amount === 'number' && Number.isFinite(amount) && amount > 0
            ? { amount: { value: getRoundedJOD(amount), currency: CLIQ_CURRENCY } }
            : {}),
          ...(description ? { description: String(description).slice(0, 140) } : {}),
          merchantReference,
          expiresInSeconds: typeof expiresInSeconds === 'number' ? expiresInSeconds : 600,
        },
        merchantAlias,
        token,
      );

      return json(result, 201);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'CliQ QR generation failed.' }, 502);
    }
  }

  // ── POST /cliq/refunds ─────────────────────────────────────────────────────
  async function handleRefund(req: Request): Promise<Response> {
    if (!isConfigured) return notConfigured();

    const auth = await ensureAuth(req);
    if (auth instanceof Response) return auth;

    const body = await readJson(req);
    const { paymentId, amount, reason, merchantReference } = body;

    if (!paymentId || typeof amount !== 'number' || !reason || !merchantReference) {
      return json({ error: 'paymentId, amount, reason, and merchantReference are required.' }, 400);
    }

    try {
      const token = await getJoPACCToken(clientId, clientSecret);
      const result = await joPACCPost(
        '/refunds',
        {
          paymentId,
          amount: { value: getRoundedJOD(amount as number), currency: CLIQ_CURRENCY },
          reason,
          merchantReference,
        },
        merchantAlias,
        token,
      );

      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('payment_intents')
        .update({
          status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_payment_id', paymentId)
        .catch(() => undefined);

      return json(result, 201);
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'CliQ refund failed.' }, 502);
    }
  }

  // ── POST /cliq/webhook ─────────────────────────────────────────────────────
  async function handleWebhook(req: Request): Promise<Response> {
    const payload = await req.text();
    const signature = req.headers.get('x-jopacc-signature') ?? '';

    if (webhookSecret) {
      const valid = await verifyJoPACCSignature(payload, signature, webhookSecret);
      if (!valid) {
        return json({ error: 'Invalid webhook signature.' }, 401);
      }
    }

    let event: Record<string, unknown>;
    try {
      event = JSON.parse(payload) as Record<string, unknown>;
    } catch {
      return json({ error: 'Invalid JSON payload.' }, 400);
    }

    const eventType = String(event.eventType ?? event.type ?? '');
    const paymentId = String(event.paymentId ?? '');
    const status = String(event.status ?? '') as CliQPaymentStatus;

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (paymentId && status) {
      const mappedStatus =
        status === 'COMPLETED' ? 'succeeded' :
        status === 'FAILED' || status === 'EXPIRED' ? 'failed' :
        status === 'CANCELLED' ? 'cancelled' :
        status === 'REFUNDED' ? 'refunded' :
        'processing';

      await supabase
        .from('payment_intents')
        .update({
          status: mappedStatus,
          updated_at: new Date().toISOString(),
          metadata: { cliq_event: event, processed_at: new Date().toISOString() },
        })
        .eq('provider_payment_id', paymentId)
        .catch(() => undefined);

      await supabase.from('audit_logs').insert({
        actor_id: null,
        actor_role: 'cliq_webhook',
        action: `cliq.${eventType || 'payment_status_update'}`,
        table_name: 'payment_intents',
        record_id: paymentId,
        new_values: { status, cliq_event_type: eventType },
        ip_address: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
        user_agent: req.headers.get('user-agent'),
        created_at: new Date().toISOString(),
      }).catch(() => undefined);
    }

    return json({ received: true, paymentId, status });
  }

  return {
    handleInitiatePayment,
    handleGetPaymentStatus,
    handleGenerateQR,
    handleRefund,
    handleWebhook,
  };
}
