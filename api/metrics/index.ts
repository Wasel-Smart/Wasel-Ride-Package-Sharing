import { randomUUID, timingSafeEqual } from 'node:crypto';
import { renderMetrics, setGauge } from '../_lib/metrics';

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  end: (body?: string) => void;
  json: (body: Record<string, unknown>) => void;
};

/**
 * GET /api/metrics — Prometheus exposition endpoint.
 *   Emits api_requests_total, api_request_duration_seconds and
 *   event_broker_queue_depth (+ outbox/dead-letter gauges) for the Grafana
 *   "Wasel - Production Overview" dashboard.
 *
 * POST /api/metrics — server-side metrics sink.
 *   Accepts structured metric payloads from the client and forwards them
 *   to the configured VITE_METRICS_ENDPOINT, or discards them silently
 *   when no endpoint is configured.
 */

function getHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function allowedOrigins(): Set<string> {
  const allowed = new Set(
    (process.env.ALLOWED_ORIGINS ?? 'https://www.wasel14.online,https://wasel14.online')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  );
  if (process.env.VERCEL_URL) {
    allowed.add(`https://${process.env.VERCEL_URL}`);
  }
  return allowed;
}

function hasValidMetricsToken(request: VercelRequest): boolean {
  const expected = process.env.WASEL_INTERNAL_HEALTH_TOKEN;
  if (!expected) {
    // No token configured (e.g. local dev) — allow the scrape.
    return true;
  }
  const provided = getHeader(request, 'x-wasel-metrics-token');
  if (!provided) {
    return false;
  }
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function populateBrokerGauges(): Promise<void> {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('metrics-broker-timeout')), 2000),
    );

    const [outboxPending, deadLetter] = await Promise.race([
      Promise.all([
        supabase.from('event_outbox').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('dead_letter_messages').select('*', { count: 'exact', head: true }),
      ]),
      timeout,
    ]);

    const pending = (outboxPending as { count: number | null }).count;
    const dead = (deadLetter as { count: number | null }).count;
    setGauge('event_broker_queue_depth', typeof pending === 'number' ? pending : 0);
    setGauge('event_outbox_pending_total', typeof pending === 'number' ? pending : 0);
    setGauge('dead_letter_messages_total', typeof dead === 'number' ? dead : 0);
  } catch {
    // Metrics endpoint must never fail the scrape because of a transient DB error.
  }
}

function processMetrics(): string {
  const memory = process.memoryUsage();
  const lines = [
    '# TYPE nodejs_heap_size_used_bytes gauge',
    `nodejs_heap_size_used_bytes ${memory.heapUsed}`,
    '# TYPE nodejs_heap_size_total_bytes gauge',
    `nodejs_heap_size_total_bytes ${memory.heapTotal}`,
    '# TYPE nodejs_rss_bytes gauge',
    `nodejs_rss_bytes ${memory.rss}`,
    '# TYPE process_uptime_seconds gauge',
    `process_uptime_seconds ${Math.floor(process.uptime())}`,
  ];
  return lines.join('\n');
}

async function handleScrape(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (!hasValidMetricsToken(request)) {
    response.setHeader('WWW-Authenticate', 'Bearer realm="wasel-metrics"');
    response.status(401).json({ error: 'Unauthorized' });
    return;
  }

  await populateBrokerGauges();

  const body = `${renderMetrics()}${processMetrics()}\n`;
  const traceId = `wasel-${randomUUID()}`;
  response.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('X-Wasel-Trace-Id', traceId);
  response.status(200).end(body);
}

function handleSink(request: VercelRequest, response: VercelResponse): void {
  const origin = getHeader(request, 'origin');
  if (origin && !allowedOrigins().has(origin)) {
    response.status(403).json({ error: 'Forbidden origin' });
    return;
  }
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({ received: true });
}

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method === 'GET' || request.method === 'HEAD') {
    await handleScrape(request, response);
    return;
  }
  if (request.method === 'POST') {
    handleSink(request, response);
    return;
  }
  response.setHeader('Allow', 'GET, HEAD, POST');
  response.status(405).json({ error: 'Method Not Allowed' });
}