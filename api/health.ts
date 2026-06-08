type HealthResponse = {
  status: 'ok' | 'degraded';
  service: 'wasel-web';
  runtime: 'vercel-serverless';
  timestamp: string;
  traceId: string;
  ready: boolean;
  checks: {
    web: 'ok';
    supabaseConfigured: boolean;
    twilioConfigured: boolean;
    sentryConfigured: boolean;
    stripeConfigured: boolean;
  };
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  setHeader: (key: string, value: string) => void;
  json: (body: HealthResponse) => void;
};

function getEnv(name: string): string | undefined {
  return process.env[name];
}

function hasAnyEnv(names: string[]): boolean {
  return names.some(name => Boolean(getEnv(name)));
}

function createTraceId(): string {
  return `wasel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function handler(_request: unknown, response: VercelResponse) {
  const traceId = createTraceId();
  const checks = {
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
  const ready = checks.supabaseConfigured && checks.stripeConfigured;

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
  });
}
