import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const EVENT_BROKER_SECRET = Deno.env.get('EVENT_BROKER_WORKER_SECRET') ?? '';

const OUTBOX_TABLE = 'event_outbox';
const DLQ_TABLE = 'dead_letter_messages';
const POLL_INTERVAL_MS = 5_000;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 5;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type, x-event-broker-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function authorized(request: Request): boolean {
  const secret = request.headers.get('x-event-broker-secret');
  return Boolean(EVENT_BROKER_SECRET && secret === EVENT_BROKER_SECRET);
}

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function handlePublish(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const { id, topic, payload, producer, traceId, occurredAt, attempts } = body as Record<string, unknown>;

  if (!id || !topic || !payload) {
    return json({ error: 'Missing required fields: id, topic, payload' }, 400);
  }

  const admin = getAdminClient();
  const { error } = await admin.from(OUTBOX_TABLE).insert({
    id: id as string,
    topic: topic as string,
    payload: payload as never,
    producer: (producer as string | null) ?? null,
    trace_id: (traceId as string | null) ?? null,
    status: 'pending',
    attempts: (attempts as number | null) ?? 0,
    created_at: (occurredAt as string | null) ?? new Date().toISOString(),
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, id: id as string });
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
    return json({ error: error?.message ?? 'Poll failed' }, 500);
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
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
}

async function handleFail(request: Request): Promise<Response> {
  const body = await request.json().catch(() => ({}));
  const { id, attempts, error: failError } = body as Record<string, unknown>;

  if (!id) {
    return json({ error: 'Missing required field: id' }, 400);
  }

  const nextAttempts = Number(attempts ?? 0) + 1;
  const nextStatus = nextAttempts >= MAX_ATTEMPTS ? 'failed' : 'pending';

  const admin = getAdminClient();
  const { error } = await admin
    .from(OUTBOX_TABLE)
    .update({ attempts: nextAttempts, status: nextStatus })
    .eq('id', id as string)
    .eq('status', 'pending');

  if (error) {
    return json({ error: error.message }, 500);
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
    return json({ error: error.message }, 500);
  }

  return json({ ok: true });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }

  if (!authorized(request)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*event-broker-proxy/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    return json({ status: 'ok', service: 'event-broker-proxy', timestamp: new Date().toISOString() });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
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
      return json({ error: 'Not found' }, 404);
  }
});
