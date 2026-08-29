import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
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
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return { error: json({ error: 'Missing bearer token' }, 401) };
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { error: json({ error: 'Invalid auth token' }, 401) };
  const { data: byAuthUser, error: byAuthError } = await admin.from('users').select('*').eq('auth_user_id', authData.user.id).maybeSingle();
  if (byAuthError) return { error: json({ error: byAuthError.message }, 500) };
  let canonicalUser = byAuthUser;
  if (!canonicalUser) {
    const fallback = await admin.from('users').select('*').eq('id', authData.user.id).maybeSingle();
    canonicalUser = fallback.data;
    if (fallback.error || !canonicalUser) return { error: json({ error: 'User not found' }, 404) };
  }
  return { admin, authUser: authData.user, canonicalUser };
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapPackageRow(row: Record<string, unknown>) {
  return {
    ...row,
    id: String(row.package_id ?? row.id ?? ''),
    package_id: String(row.package_id ?? row.id ?? ''),
    tracking_number: String(row.tracking_number ?? ''),
    status: String(row.status ?? 'posted'),
    delivery_fee: toNumber(row.delivery_fee, 0),
  };
}

function calculateDirectPrice(type: string, weight?: number, distanceKm?: number, basePrice = 5): { total: number; breakdown: { base: number } } {
  return { total: basePrice, breakdown: { base: basePrice } };
}

function parseEntityRoute(path: string, prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^/${escapedPrefix}/([^/]+)(?:/([^/]+))?$`).exec(path);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), action: match[2] ? decodeURIComponent(match[2]) : null };
}

async function handlePackageRequest(request: Request, path: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  if (request.method === 'POST' && path === '/packages') {
    const body = await request.json().catch(() => ({}));
    const trackingNumber = `WSL-PKG-${crypto.randomUUID().split('-')[0].slice(0, 8).toUpperCase()}`;
    const { data, error } = await auth.admin.from('packages').insert({
      tracking_number: trackingNumber, qr_code: trackingNumber,
      sender_id: auth.canonicalUser.id,
      receiver_name: String(body.receiver_name ?? ''),
      receiver_phone: String(body.receiver_phone ?? ''),
      origin_name: String(body.origin_name ?? body.from ?? ''),
      origin_location: body.origin_coords ? `SRID=4326;POINT(${body.origin_coords.lng} ${body.origin_coords.lat})` : null,
      destination_name: String(body.destination_name ?? body.to ?? ''),
      destination_location: body.destination_coords ? `SRID=4326;POINT(${body.destination_coords.lng} ${body.destination_coords.lat})` : null,
      size: String(body.size ?? 'medium'), weight_kg: toNumber(body.weight, 0),
      description: String(body.description ?? ''),
      declared_value: toNumber(body.declared_value, 0),
      fragile: Boolean(body.fragile),
      delivery_fee: calculateDirectPrice('package', toNumber(body.weight, 0), 0, toNumber(body.base_price, 5)).breakdown.base,
      status: 'posted',
    }).select('*').single();
    if (error) return json({ error: error.message }, 500);

    const packageId = String(data.package_id ?? data.id ?? '');
    const { data: trip } = await auth.admin.from('trips').select('trip_id, driver_id, available_seats, package_slots_remaining, trip_status').eq('allow_packages', true).eq('trip_status', 'open').gt('package_slots_remaining', 0).limit(1).maybeSingle();

    if (trip) {
      await auth.admin.from('packages').update({ trip_id: trip.trip_id, carrier_id: trip.driver_id, status: 'assigned' }).eq('package_id', packageId);
      await auth.admin.from('trips').update({ package_slots_remaining: Math.max(0, toNumber(trip.package_slots_remaining, 0) - 1) }).eq('trip_id', trip.trip_id);
      await auth.admin.from('package_events').insert({
        package_id: packageId, event_type: 'assignment', event_status: 'assigned',
        notes: JSON.stringify({ trip_id: trip.trip_id, driver_id: trip.driver_id }),
      });
    }

    return json({ package: mapPackageRow(data) });
  }

  const packageRoute = parseEntityRoute(path, 'packages');
  if (request.method === 'GET' && packageRoute?.id) {
    const { data, error } = await auth.admin.from('packages').select('*').eq('package_id', packageRoute.id).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: 'Package not found' }, 404);
    return json(mapPackageRow(data));
  }

  if (request.method === 'GET' && path.startsWith('/packages/sender/')) {
    const userId = path.split('/packages/sender/')[1]?.split('/')[0];
    if (!userId) return json({ error: 'User ID required' }, 400);
    const { data, error } = await auth.admin.from('packages').select('*').eq('sender_id', userId).order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json((Array.isArray(data) ? data : []).map(mapPackageRow));
  }

  if (request.method === 'POST' && packageRoute?.id && packageRoute.action === 'deliver') {
    const { data, error } = await auth.admin.from('packages').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('package_id', packageRoute.id).select('*').single();
    if (error) return json({ error: error.message }, 500);
    return json(mapPackageRow(data));
  }

  return undefined;
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*package-service/, '') || '/';
    let response: Response;

    if (path.startsWith('/packages')) {
      response = await handlePackageRequest(request, path);
      if (!response) response = json({ error: 'Not found' }, 404);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'package-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'package-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
