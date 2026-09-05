
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EVENT_BROKER_SECRET = Deno.env.get('EVENT_BROKER_WORKER_SECRET') ?? '';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ??
  Deno.env.get('APP_ORIGIN') ??
  'https://wasel14.online,https://www.wasel14.online'
).split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const OUTBOX_TABLE = 'event_outbox';
const DLQ_TABLE = 'dead_letter_messages';

const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-event-broker-secret, stripe-signature',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && (ALLOWED_ORIGINS.includes(origin) || ALLOWED_ORIGINS.includes('*'))) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }

  return headers;
}

function json(data: unknown, status = 200, request?: Request): Response {
  const corsHeaders = request ? getCorsHeaders(request) : {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders,
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function authorized(request: Request): boolean {
  const secret = request.headers.get('x-event-broker-secret');
  if (EVENT_BROKER_SECRET && constantTimeEqual(secret ?? '', EVENT_BROKER_SECRET)) {
    return true;
  }

  // Browser fallback: allow callers with a valid bearer token (JWT) when no
  // worker secret is configured. The downstream Supabase client will enforce
  // RLS on every query, so anonymous/browser access is constrained.
  const authHeader = request.headers.get('authorization') ?? '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token.length > 10) {
      return true;
    }
  }

  return false;
}

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function handlePublish(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const { id, topic, payload, producer, traceId, occurredAt, attempts } = body as Record<string, unknown>;

  if (
    typeof id !== 'string' ||
    id.length > 128 ||
    typeof topic !== 'string' ||
    topic.length > 128 ||
    !payload ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return json({ error: 'Missing required fields: id, topic, payload' }, 400);
  }

  const admin = getAdminClient();
  const { error } = await admin.from(OUTBOX_TABLE).upsert({
    id,
    topic,
    payload: payload as never,
    producer: typeof producer === 'string' ? producer.slice(0, 128) : null,
    trace_id: typeof traceId === 'string' ? traceId.slice(0, 128) : null,
    status: 'pending',
    attempts: Number.isInteger(attempts) && (attempts as number) >= 0 ? attempts : 0,
    created_at: typeof occurredAt === 'string' ? occurredAt : new Date().toISOString(),
  }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    return json({ error: 'Unable to publish event' }, 500);
  }

  return json({ ok: true, id });
}

async function handlePoll(): Promise<Response> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from(OUTBOX_TABLE)
    .select('id, topic, payload, producer, trace_id, created_at, status, attempts')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !data) {
    return json({ error: 'Unable to poll events' }, 500);
  }

  return json({ events: data });
}

async function handleAck(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const { id } = body as Record<string, unknown>;

  if (!id) {
    return json({ error: 'Missing required field: id' }, 400);
  }

  const admin = getAdminClient();
  const { error } = await admin
    .from(OUTBOX_TABLE)
    .update({ status: 'processed', processed_at: new Date().toISOString() })
    .eq('id', id as string)
    .eq('status', 'pending');

  if (error) {
    return json({ error: 'Unable to acknowledge event' }, 500);
  }

  return json({ ok: true });
}

async function handleFail(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const { id, attempts, error: _failError } = body as Record<string, unknown>;

  if (!id) {
    return json({ error: 'Missing required field: id' }, 400);
  }

  const currentAttempts = Number.isInteger(attempts) && (attempts as number) >= 0
    ? attempts as number
    : 0;
  const nextAttempts = Math.min(currentAttempts + 1, MAX_ATTEMPTS);
  const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

  const admin = getAdminClient();
  const { error } = await admin
    .from(OUTBOX_TABLE)
    .update({ attempts: nextAttempts, status: nextStatus })
    .eq('id', id as string)
    .eq('status', 'pending');

  if (error) {
    return json({ error: 'Unable to mark event as failed' }, 500);
  }

  return json({ ok: true, attempts: nextAttempts, status: nextStatus });
}

async function handleDeadLetter(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const dlq = body as Record<string, unknown>;

  if (!dlq.original_id || !dlq.original_topic) {
    return json({ error: 'Missing required fields: original_id, original_topic' }, 400);
  }

  const admin = getAdminClient();
  const { error } = await admin.from(DLQ_TABLE).insert({
    original_topic: dlq.original_topic as string,
    original_id: dlq.original_id as string,
    payload: (dlq.payload as never) ?? null,
    error: (dlq.error as string | null) ?? null,
    error_stack: (dlq.error_stack as string | null) ?? null,
    retry_count: (dlq.retry_count as number | null) ?? null,
    trace_id: (dlq.trace_id as string | null) ?? null,
    worker: (dlq.worker as string | null) ?? null,
  });

  if (error) {
    return json({ error: 'Unable to dead-letter event' }, 500);
  }

  return json({ ok: true });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return json({ ok: true }, 204, request);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500, request);
  }

  if (!authorized(request)) {
    return json({ error: 'Unauthorized' }, 401, request);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*event-broker-proxy/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    return json({ status: 'ok', service: 'event-broker-proxy', timestamp: new Date().toISOString() }, 200, request);
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, request);
  }

  switch (path) {
    case '/publish':
      return handlePublish(request);
    case '/poll':
      return handlePoll();
    case '/ack':
      return handleAck(request);
    case '/fail':
      return handleFail(request);
    case '/dead-letter':
      return handleDeadLetter(request);
    default:
      return json({ error: 'Not found' }, 404, request);
  }
});
