import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, getRateLimitKey } from '../_shared/rate-limiter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('VITE_SUPABASE_ANON_KEY') ?? '';

const RATE_LIMITS: Record<string, { windowMs: number; maxRequests: number }> = {
  default:      { windowMs: 60_000, maxRequests: 60 },
  auth:         { windowMs: 60_000, maxRequests: 10 },
  search:       { windowMs: 60_000, maxRequests: 30 },
  write:        { windowMs: 60_000, maxRequests: 20 },
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function resolveRateLimitTier(path: string, method: string): keyof typeof RATE_LIMITS {
  if (path.startsWith('/auth')) return 'auth';
  if (method === 'GET' && path.includes('search')) return 'search';
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'write';
  return 'default';
}

async function authenticateToken(token: string): Promise<{ userId: string } | null> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      },
    });
  }

  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*rate-limited-api/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    return json({ status: 'ok', service: 'rate-limited-api', timestamp: new Date().toISOString() });
  }

  // Authenticate
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return json({ error: 'Missing bearer token' }, 401);

  const authResult = await authenticateToken(token);
  if (!authResult) return json({ error: 'Invalid auth token' }, 401);

  // Rate limit per user + tier
  const tier = resolveRateLimitTier(path, request.method);
  const rateLimitKey = `${authResult.userId}:${tier}`;
  const rl = checkRateLimit(rateLimitKey, RATE_LIMITS[tier]);

  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      },
    });
  }

  // Proxy to main edge function
  const targetUrl = `${SUPABASE_URL}/functions/v1/make-server-0b1f4071${path}${url.search}`;
  const proxyHeaders = new Headers(request.headers);
  proxyHeaders.set('apikey', SUPABASE_ANON_KEY);
  proxyHeaders.set('X-Forwarded-User', authResult.userId);
  proxyHeaders.set('X-RateLimit-Remaining', String(rl.remaining));

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: proxyHeaders,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set('X-RateLimit-Remaining', String(rl.remaining));
    responseHeaders.set('X-RateLimit-Reset', String(Math.ceil((rl.resetAt - Date.now()) / 1000)));

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Upstream request failed' }, 502);
  }
});
