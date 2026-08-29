import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  type AccessRole,
  type AccessPermission,
  hasPermission,
  resolveAccessRole,
} from '../_shared/rbac.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOW_LOCAL_ORIGINS = Deno.env.get('ALLOW_LOCAL_ORIGINS') === 'true';

const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Cache-Control': 'no-store',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function resolveAllowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const url = new URL(origin);
    if (url.origin === new URL(APP_BASE_URL).origin) return url.origin;
    if (ALLOW_LOCAL_ORIGINS && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.origin;
    const extra = ADDITIONAL_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    if (extra.includes(url.origin)) return url.origin;
  } catch { /* ignore */ }
  return null;
}

function buildResponseHeaders(request: Request): Headers {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
  Object.entries(responseBaseHeaders).forEach(([k, v]) => headers.set(k, v));
  headers.set('Vary', 'Origin');
  if (allowedOrigin) headers.set('Access-Control-Allow-Origin', allowedOrigin);
  return headers;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { error: json({ error: 'Missing bearer token' }, 401) };

  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { error: json({ error: 'Invalid auth token' }, 401) };

  const { data: byAuthUser, error: byAuthError } = await admin
    .from('users')
    .select('id, auth_user_id, email, phone_number, full_name, role, verification_level, sanad_verified_status, phone_verified_at, profile_status, updated_at')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();

  if (byAuthError) return { error: json({ error: byAuthError.message }, 500) };

  let canonicalUser = byAuthUser;
  if (!canonicalUser) {
    const fallback = await admin
      .from('users')
      .select('id, auth_user_id, email, phone_number, full_name, role, verification_level, sanad_verified_status, phone_verified_at, profile_status, updated_at')
      .eq('id', authData.user.id)
      .maybeSingle();
    canonicalUser = fallback.data;
    if (fallback.error) return { error: json({ error: 'Canonical user profile was not found' }, 404) };
  }
  if (!canonicalUser) return { error: json({ error: 'Canonical user profile was not found' }, 404) };

  return { admin, authUser: authData.user, canonicalUser };
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function buildProfilePayload(admin: ReturnType<typeof getAdminClient>, user: Record<string, unknown>) {
  const { data: wallet } = await admin.from('wallets').select('balance, wallet_status').eq('user_id', String(user.id)).maybeSingle();
  const { data: verification } = await admin.from('verification_records').select('sanad_status, verification_level').eq('user_id', String(user.id)).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const { data: driver } = await admin.from('drivers').select('driver_id, rating, sanad_identity_linked, verification_level').eq('user_id', String(user.id)).maybeSingle();

  const verified = verification?.sanad_status === 'verified' || user.sanad_verified_status === 'verified' || driver?.sanad_identity_linked === true;

  return {
    id: String(user.auth_user_id ?? user.id),
    canonical_user_id: String(user.id),
    email: user.email ?? null,
    full_name: user.full_name ?? null,
    role: user.role ?? null,
    phone: user.phone_number ?? null,
    phone_number: user.phone_number ?? null,
    phone_verified: Boolean(user.phone_verified_at),
    wallet_balance: toNumber(wallet?.balance, 0),
    verified,
    rating: toNumber(user.rating, 0),
    rating_as_driver: toNumber(driver?.rating, 0),
    verification_level: verification?.verification_level ?? driver?.verification_level ?? user.verification_level ?? 'level_0',
    wallet_status: wallet?.wallet_status ?? 'active',
    avatar_url: user.avatar_url ?? null,
    two_factor_enabled: Boolean(user.two_factor_enabled),
    created_at: user.created_at ?? null,
  };
}

function parseEntityRoute(path: string, prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^/${escapedPrefix}/([^/]+)(?:/([^/]+))?$`).exec(path);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), action: match[2] ? decodeURIComponent(match[2]) : null };
}

function matchesAuthenticatedUser(auth: Awaited<ReturnType<typeof authenticateRequest>>, requestedUserId: string): boolean {
  if ('error' in auth) return false;
  return requestedUserId === auth.canonicalUser.id || requestedUserId === auth.authUser.id;
}

async function handleProfileRequest(request: Request, path: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  const profileRoute = parseEntityRoute(path, 'profile');
  const body = request.method === 'GET' ? {} : await request.json().catch(() => ({}));
  const user = auth.canonicalUser;
  const requestedUserId = profileRoute?.id ?? String(user.id);

  if (requestedUserId !== String(user.id) && requestedUserId !== String(user.auth_user_id)) {
    return json({ error: 'Profile route is not authorized for this user.' }, 403);
  }

  if (request.method === 'POST') {
    return json(await buildProfilePayload(auth.admin, user));
  }

  if (request.method === 'PATCH') {
    const resolvedRole = resolveAccessRole(user.role);
    const canWriteUsers = hasPermission(resolvedRole, 'users:write');
    const patch: Record<string, unknown> = {};

    if (typeof body.email === 'string') patch.email = body.email.trim();
    if (typeof body.full_name === 'string') patch.full_name = body.full_name.trim();
    if (typeof body.phone_number === 'string') patch.phone_number = body.phone_number.trim();
    if (typeof body.phone === 'string') patch.phone_number = body.phone.trim();
    if (typeof body.avatar_url === 'string') patch.avatar_url = body.avatar_url;

    if (typeof patch.phone_number === 'string' && patch.phone_number !== String(user.phone_number ?? '').trim()) {
      patch.phone_verified_at = null;
    }

    if (canWriteUsers) {
      if (typeof body.role === 'string') {
        const normalizedRole = body.role.toLowerCase();
        if (['passenger', 'driver', 'operator', 'admin'].includes(normalizedRole)) patch.role = normalizedRole;
      }
      if (typeof body.verification_level === 'string') patch.verification_level = body.verification_level;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await auth.admin.from('users').update(patch).eq('id', user.id);
      if (error) return json({ error: error.message }, 500);
    }

    if (canWriteUsers && typeof body.wallet_status === 'string') {
      await auth.admin.from('wallets').update({ wallet_status: body.wallet_status }).eq('user_id', user.id);
    }
  }

  const { data: nextUser, error } = await auth.admin.from('users').select('*').eq('id', user.id).single();
  if (error) return json({ error: error.message }, 500);
  return json(await buildProfilePayload(auth.admin, nextUser));
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*profile-service/, '') || '/';

    let response: Response;

    if (path.startsWith('/profile')) {
      response = await handleProfileRequest(request, path);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'profile-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'profile-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
