import { randomUUID, timingSafeEqual } from 'node:crypto';

type HealthResponse = {
  status: 'ok' | 'degraded';
  service: 'wasel-web';
  runtime: 'vercel-serverless';
  timestamp: string;
  traceId: string;
  ready: boolean;
  checks: {
    web: 'ok';
    supabaseConfigured?: boolean;
    twilioConfigured?: boolean;
    sentryConfigured?: boolean;
    stripeConfigured?: boolean;
  };
  broker?: {
    kind: 'memory' | 'supabase';
    outboxPending: number;
    deadLetterCount: number;
    outboxFailed: number;
  };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: HealthResponse) => void;
};

type VercelRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

function hasAnyEnv(names: string[]): boolean {
  return names.some(name => Boolean(getEnv(name)));
}

function createTraceId(): string {
  return `wasel-${randomUUID()}`;
}

function getRequestHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function hasInternalHealthAccess(request: VercelRequest): boolean {
  const expected = getEnv('WASEL_INTERNAL_HEALTH_TOKEN');
  const provided = getRequestHeader(request, 'x-wasel-health-token');
  if (!expected || !provided) return false;

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

async function querySupabaseMetrics(): Promise<HealthResponse['broker']> {
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) {
    return undefined;
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('health-check-timeout')), 2000),
    );

    const [{ count: outboxPending }, { count: deadLetterCount }, { count: outboxFailed }] =
      await Promise.race([
        Promise.all([
          supabase
            .from('event_outbox')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),
          supabase
            .from('dead_letter_messages')
            .select('*', { count: 'exact', head: true }),
          supabase
            .from('event_outbox')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'failed'),
        ]),
        timeout,
      ]).catch(() => [{ count: -1 }, { count: -1 }, { count: -1 }]);

    return {
      kind: getEnv('VITE_EVENT_BROKER') === 'memory' ? 'memory' : 'supabase',
      outboxPending: outboxPending ?? 0,
      deadLetterCount: deadLetterCount ?? 0,
      outboxFailed: outboxFailed ?? 0,
    };
  } catch {
    return undefined;
  }
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method && request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    response.status(405).json({
      status: 'degraded',
      service: 'wasel-web',
      runtime: 'vercel-serverless',
      timestamp: new Date().toISOString(),
      traceId: createTraceId(),
      ready: false,
      checks: { web: 'ok' },
    });
    return;
  }

  const traceId = createTraceId();
  const isInternal = hasInternalHealthAccess(request);
  const internalChecks = {
    web: 'ok' as const,
    supabaseConfigured: hasAnyEnv([
      'VITE_SUPABASE_URL',
      'SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
    ]),
    twilioConfigured: hasAnyEnv([
      'TWILIO_ACCOUNT_SID',
      'TWILIO_API_KEY_SID',
      'TWILIO_VERIFY_SERVICE_SID',
    ]),
    sentryConfigured: hasAnyEnv(['VITE_SENTRY_DSN', 'SENTRY_DSN']),
    stripeConfigured: hasAnyEnv(['STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLISHABLE_KEY']),
  };
  const ready = internalChecks.supabaseConfigured && internalChecks.stripeConfigured;

  // Queue depths and provider configuration are operational data. Public
  // probes retain a small readiness contract; trusted monitors can opt into
  // diagnostics with a dedicated, constant-time-checked token.
  const broker = isInternal && internalChecks.supabaseConfigured
    ? await querySupabaseMetrics()
    : undefined;
  const checks = isInternal ? internalChecks : { web: 'ok' as const };

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Wasel-Trace-Id', traceId);
  response.setHeader('X-Wasel-Ready', ready ? 'true' : 'false');

  response.status(ready ? 200 : 503).json({
    status: ready ? 'ok' : 'degraded',
    service: 'wasel-web',
    runtime: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    traceId,
    ready,
    checks,
    ...(broker ? { broker } : {}),
  });
}
