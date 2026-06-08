const APP_ORIGIN = (Deno.env.get('APP_ORIGIN') || Deno.env.get('APP_BASE_URL') || 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') || '';

function allowedOrigins(): string[] {
  return [
    APP_ORIGIN,
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...ADDITIONAL_ALLOWED_ORIGINS.split(/[,\s]+/).filter(Boolean),
  ].map(origin => origin.replace(/\/$/, ''));
}

function resolveOrigin(req: Request): string | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;

  try {
    const normalized = new URL(origin).origin;
    return allowedOrigins().includes(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function responseHeaders(req: Request, extra?: HeadersInit): HeadersInit {
  const origin = resolveOrigin(req);
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...(extra ?? {}),
  };
}

type ProviderRoute = {
  targetPath: string;
  requiredMethod: string;
};

const providerRoutes: Record<string, ProviderRoute> = {
  '/stripe': {
    targetPath: '/payments/webhooks/stripe',
    requiredMethod: 'POST',
  },
  '/resend': {
    targetPath: '/communications/webhooks/resend',
    requiredMethod: 'POST',
  },
  '/twilio': {
    targetPath: '/communications/webhooks/twilio',
    requiredMethod: 'POST',
  },
};

function json(req: Request, body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(req, {
      'Content-Type': 'application/json',
    }),
  });
}

function isJwtLikeToken(token: string | undefined): token is string {
  return Boolean(token && token.split('.').length === 3);
}

function getBearerToken() {
  const candidates = [
    Deno.env.get('SUPABASE_ANON_KEY'),
    Deno.env.get('ANON_KEY'),
  ];

  return candidates.find(isJwtLikeToken) ?? '';
}

function buildForwardUrl(requestUrl: URL, route: ProviderRoute) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  if (!supabaseUrl) throw new Error('SUPABASE_URL is not configured');

  const targetUrl = new URL(`${supabaseUrl}/functions/v1/make-server-0b1f4071${route.targetPath}`);
  requestUrl.searchParams.forEach((value, key) => targetUrl.searchParams.set(key, value));
  return targetUrl;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders(request) });
  }

  const origin = request.headers.get('origin');
  if (origin && !resolveOrigin(request)) {
    return json(request, { error: 'Origin not allowed' }, 403);
  }

  const requestUrl = new URL(request.url);
  const routePath = requestUrl.pathname.replace(/^.*provider-webhooks/, '') || '/';
  const route = providerRoutes[routePath];

  if (!route) return json(request, { error: 'Unknown provider webhook route' }, 404);
  if (request.method !== route.requiredMethod) return json(request, { error: 'Method not allowed' }, 405);

  const bearerToken = getBearerToken();
  if (!bearerToken) return json(request, { error: 'Supabase bearer token is not configured' }, 503);

  try {
    const body = await request.text();
    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    const stripeSignature = request.headers.get('stripe-signature');

    headers.set('Authorization', `Bearer ${bearerToken}`);
    headers.set('apikey', bearerToken);
    if (contentType) headers.set('Content-Type', contentType);
    if (stripeSignature) headers.set('stripe-signature', stripeSignature);

    const forwarded = await fetch(buildForwardUrl(requestUrl, route), {
      method: route.requiredMethod,
      headers,
      body,
    });

    const responseBody = await forwarded.text();
    return new Response(responseBody, {
      status: forwarded.status,
      headers: responseHeaders(request, {
        'Content-Type': forwarded.headers.get('content-type') || 'application/json',
      }),
    });
  } catch (error) {
    console.error('provider webhook forwarding failed', error instanceof Error ? error.message : String(error));
    return json(request, { error: 'Webhook forwarding failed' }, 502);
  }
});
