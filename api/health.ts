type HealthResponse = {
  status: 'ok';
  service: 'wasel-web';
  runtime: 'vercel-serverless';
  timestamp: string;
  traceId: string;
  checks: {
    web: 'ok';
    supabaseConfigured: boolean;
    twilioConfigured: boolean;
    sentryConfigured: boolean;
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

  response.setHeader('Cache-Control', 'no-store, max-age=0');
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('X-Wasel-Trace-Id', traceId);

  response.status(200).json({
    status: 'ok',
    service: 'wasel-web',
    runtime: 'vercel-serverless',
    timestamp: new Date().toISOString(),
    traceId,
    checks: {
      web: 'ok',
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
    },
  });
}
