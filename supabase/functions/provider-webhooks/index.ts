const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getBearerToken() {
  return (
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
    Deno.env.get('SUPABASE_ANON_KEY') ||
    Deno.env.get('ANON_KEY') ||
    ''
  );
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
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const requestUrl = new URL(request.url);
  const routePath = requestUrl.pathname.replace(/^.*provider-webhooks/, '') || '/';
  const route = providerRoutes[routePath];

  if (!route) return json({ error: 'Unknown provider webhook route' }, 404);
  if (request.method !== route.requiredMethod) return json({ error: 'Method not allowed' }, 405);

  const bearerToken = getBearerToken();
  if (!bearerToken) return json({ error: 'Supabase bearer token is not configured' }, 503);

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
      headers: {
        ...corsHeaders,
        'Content-Type': forwarded.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 502);
  }
});
