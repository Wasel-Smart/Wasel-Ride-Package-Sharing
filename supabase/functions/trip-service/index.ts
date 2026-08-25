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

function formatDate(value: unknown, fallback = new Date().toISOString().slice(0, 10)): string {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().slice(0, 10);
}

function formatTime(value: unknown): string {
  const date = new Date(String(value ?? ''));
  if (Number.isNaN(date.getTime())) return String(value ?? '').slice(0, 5) || '08:00';
  return date.toISOString().slice(11, 16);
}

function mapTripRow(row: Record<string, unknown>, driverProfile?: Record<string, unknown> | null) {
  const createdAt = String(row.created_at ?? new Date().toISOString());
  return {
    id: String(row.trip_id ?? ''),
    from: String(row.origin_city ?? ''),
    to: String(row.destination_city ?? ''),
    date: formatDate(row.departure_time, createdAt.slice(0, 10)),
    time: formatTime(row.departure_time),
    seats: toNumber(row.available_seats, 0),
    price: toNumber(row.price_per_seat, 0),
    driver: {
      id: String(driverProfile?.id ?? row.driver_id ?? 'driver'),
      name: String(driverProfile?.full_name ?? driverProfile?.email ?? 'Wasel Driver'),
      rating: toNumber(driverProfile?.rating, 0),
      verified: Boolean(driverProfile?.verified ?? driverProfile?.sanad_verified ?? false),
    },
  };
}

async function fetchDriverProfiles(admin: ReturnType<typeof getAdminClient>, driverIds: string[]): Promise<Record<string, Record<string, unknown>>> {
  const uniqueIds = Array.from(new Set(driverIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};
  const { data: drivers } = await admin.from('drivers').select('*').in('driver_id', uniqueIds);
  const driverRows = Array.isArray(drivers) ? drivers : [];
  const userIds = driverRows.map((d: Record<string, unknown>) => String(d.user_id ?? ''));
  if (userIds.length === 0) return {};
  const { data: users } = await admin.from('users').select('*').in('id', userIds);
  const usersById = new Map<string, Record<string, unknown>>();
  (Array.isArray(users) ? users : []).forEach((u: Record<string, unknown>) => usersById.set(String(u.id), u));
  const result: Record<string, Record<string, unknown>> = {};
  for (const driver of driverRows) {
    const user = usersById.get(String(driver.user_id ?? ''));
    if (user) {
      const { data: wallet } = await admin.from('wallets').select('balance').eq('user_id', String(user.id)).maybeSingle();
      result[String(driver.driver_id)] = {
        id: String(user.auth_user_id ?? user.id),
        full_name: user.full_name ?? null,
        email: user.email ?? null,
        rating: toNumber(user.rating, 0),
        verified: Boolean(user.sanad_verified_status === 'verified'),
        wallet_balance: toNumber(wallet?.balance, 0),
      };
    }
  }
  return result;
}

function parseEntityRoute(path: string, prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^/${escapedPrefix}/([^/]+)(?:/([^/]+))?$`).exec(path);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), action: match[2] ? decodeURIComponent(match[2]) : null };
}

async function ensureDriverForUser(admin: ReturnType<typeof getAdminClient>, user: Record<string, unknown>) {
  const { data: existing } = await admin.from('drivers').select('*').eq('user_id', String(user.id)).maybeSingle();
  if (existing) return existing;
  const { data, error } = await admin.from('drivers').insert({
    user_id: user.id,
    driver_status: 'pending_approval',
    verification_level: user.verification_level ?? 'level_0',
    sanad_identity_linked: false,
  }).select('*').single();
  if (error) throw error;
  return data;
}

function calculateDirectPrice(type: string, weight?: number, distanceKm?: number, basePrice = 5): { total: number; breakdown: { base: number; distance: number; weight: number } } {
  const distance = distanceKm ?? 0;
  const w = weight ?? 0;
  const distanceFee = distance * 0.5;
  const weightFee = w * 0.2;
  const total = Number((basePrice + distanceFee + weightFee).toFixed(2));
  return { total, breakdown: { base: basePrice, distance: Number(distanceFee.toFixed(2)), weight: Number(weightFee.toFixed(2)) } };
}

async function handleTripRequest(request: Request, path: string) {
  const admin = getAdminClient();
  const url = new URL(request.url);

  if (request.method === 'GET' && path === '/trips/search') {
    let query = admin.from('trips').select('trip_id, driver_id, origin_city, destination_city, departure_time, available_seats, price_per_seat, trip_status, allow_packages, package_capacity, vehicle_make, vehicle_model, notes, created_at').is('deleted_at', null);
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');
    const date = url.searchParams.get('date');
    const seats = url.searchParams.get('seats');
    if (from) query = query.ilike('origin_city', `%${from}%`);
    if (to) query = query.ilike('destination_city', `%${to}%`);
    if (date) query = query.gte('departure_time', `${date}T00:00:00`).lt('departure_time', `${date}T23:59:59.999`);
    if (seats) query = query.gte('available_seats', Number(seats));
    const { data, error } = await query.in('trip_status', ['open', 'booked', 'in_progress']).order('departure_time');
    if (error) return json({ error: error.message }, 500);
    const rows = Array.isArray(data) ? data : [];
    const profiles = await fetchDriverProfiles(admin, rows.map((r: Record<string, unknown>) => String(r.driver_id ?? '')));
    return json(rows.map((r: Record<string, unknown>) => mapTripRow(r, profiles[String(r.driver_id ?? '')])));
  }

  if (request.method === 'POST' && path === '/trips/calculate-price') {
    const body = await request.json().catch(() => ({}));
    const type = body.type === 'package' ? 'package' : 'passenger';
    return json(calculateDirectPrice(type, body.weight, body.distance_km, body.base_price));
  }

  const tripRoute = parseEntityRoute(path, 'trips');
  if (request.method === 'GET' && tripRoute?.id === 'user') {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;
    const driver = await ensureDriverForUser(auth.admin, auth.canonicalUser);
    const { data, error } = await auth.admin.from('trips').select('*').eq('driver_id', driver.driver_id).order('departure_time', { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json((Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => mapTripRow(r, null)));
  }

  if (request.method === 'GET' && tripRoute?.id) {
    const { data, error } = await admin.from('trips').select('*').eq('trip_id', tripRoute.id).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!data) return json({ error: 'Trip not found' }, 404);
    const profiles = await fetchDriverProfiles(admin, [String(data.driver_id ?? '')]);
    return json(mapTripRow(data, profiles[String(data.driver_id ?? '')]));
  }

  if (request.method === 'POST' && path === '/trips') {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;
    const body = await request.json().catch(() => ({}));
    const driver = await ensureDriverForUser(auth.admin, auth.canonicalUser);
    const departureTime = new Date(`${body.date}T${body.time}:00`).toISOString();
    const vehicleParts = String(body.carModel ?? '').trim().split(/\s+/).filter(Boolean);
    const [vehicleMake = null, ...vehicleRest] = vehicleParts;
    const { data, error } = await auth.admin.from('trips').insert({
      driver_id: driver.driver_id, origin_city: body.from, destination_city: body.to,
      departure_time: departureTime, departure_date: body.date,
      available_seats: toNumber(body.seats, 1), price_per_seat: toNumber(body.price, 0),
      trip_status: 'open', allow_packages: Boolean(body.acceptsPackages),
      package_capacity: body.packageCapacity === 'large' ? 3 : body.packageCapacity === 'medium' ? 2 : body.packageCapacity === 'small' ? 1 : 0,
      package_slots_remaining: body.packageCapacity === 'large' ? 3 : body.packageCapacity === 'medium' ? 2 : body.packageCapacity === 'small' ? 1 : 0,
      vehicle_make: vehicleMake, vehicle_model: vehicleRest.length > 0 ? vehicleRest.join(' ') : body.carModel ?? null,
      notes: body.note ?? null,
    }).select('*').single();
    if (error) return json({ error: error.message }, 500);
    return json(mapTripRow(data, await (async () => {
      const p = await fetchDriverProfiles(auth.admin, [String(data.driver_id ?? '')]);
      return p[String(data.driver_id ?? '')];
    })()));
  }

  if ((request.method === 'PUT' || request.method === 'DELETE' || (request.method === 'POST' && tripRoute?.action === 'publish')) && tripRoute?.id) {
    const auth = await authenticateRequest(request);
    if ('error' in auth) return auth.error;
    if (request.method === 'DELETE') {
      const { error } = await auth.admin.from('trips').update({ trip_status: 'cancelled', deleted_at: new Date().toISOString() }).eq('trip_id', tripRoute.id);
      return error ? json({ error: error.message }, 500) : json({ success: true });
    }
    if (request.method === 'POST') {
      const { error } = await auth.admin.from('trips').update({ trip_status: 'open' }).eq('trip_id', tripRoute.id);
      return error ? json({ error: error.message }, 500) : json({ success: true });
    }
    const body = await request.json().catch(() => ({}));
    const patch: Record<string, unknown> = {};
    if (body.from) patch.origin_city = body.from;
    if (body.to) patch.destination_city = body.to;
    if (body.date || body.time) patch.departure_time = new Date(`${body.date ?? new Date().toISOString().slice(0, 10)}T${body.time ?? '08:00'}:00`).toISOString();
    if (body.date) patch.departure_date = body.date;
    if (typeof body.seats === 'number') patch.available_seats = body.seats;
    if (typeof body.price === 'number') patch.price_per_seat = body.price;
    if (typeof body.status === 'string') patch.trip_status = body.status === 'active' ? 'open' : body.status;
    if (typeof body.note === 'string') patch.notes = body.note;
    const { data, error } = await auth.admin.from('trips').update(patch).eq('trip_id', tripRoute.id).select('*').single();
    if (error) return json({ error: error.message }, 500);
    const profiles = await fetchDriverProfiles(auth.admin, [String(data.driver_id ?? '')]);
    return json(mapTripRow(data, profiles[String(data.driver_id ?? '')]));
  }

  return undefined;
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*trip-service/, '') || '/';
    let response: Response;

    if (path.startsWith('/trips')) {
      response = await handleTripRequest(request, path);
      if (!response) response = json({ error: 'Not found' }, 404);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'trip-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'trip-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
