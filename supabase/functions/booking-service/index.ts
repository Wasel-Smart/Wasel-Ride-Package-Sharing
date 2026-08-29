import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOW_LOCAL_ORIGINS = Deno.env.get('ALLOW_LOCAL_ORIGINS') === 'true';

const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function mapBookingRow(row: Record<string, unknown>) {
  const amount = toNumber(row.amount ?? row.total_price, 0);
  return {
    ...row,
    id: String(row.booking_id ?? row.id ?? ''),
    booking_id: String(row.booking_id ?? row.id ?? ''),
    seats_requested: toNumber(row.seats_requested, 1),
    price_per_seat: toNumber(row.price_per_seat, amount),
    total_price: amount,
    amount,
    status: String(row.booking_status ?? row.status ?? 'pending'),
    booking_status: String(row.booking_status ?? row.status ?? 'pending'),
  };
}

function parseEntityRoute(path: string, prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^/${escapedPrefix}/([^/]+)(?:/([^/]+))?$`).exec(path);
  if (!match) return null;
  return { id: decodeURIComponent(match[1]), action: match[2] ? decodeURIComponent(match[2]) : null };
}

async function handleBookingCollectionForTrip(request: Request, tripId: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;
  const { data, error } = await auth.admin.from('bookings').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json((Array.isArray(data) ? data : []).map(mapBookingRow));
}

async function handleBookingRequest(request: Request, path: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  if (request.method === 'POST' && path === '/bookings') {
    const body = await request.json().catch(() => ({}));
    const tripId = String(body.trip_id ?? '');
    const seatsRequested = Math.max(1, toNumber(body.seats_requested, 1));
    const { data: trip, error: tripError } = await auth.admin.from('trips').select('trip_id, available_seats, price_per_seat, trip_status').eq('trip_id', tripId).single();
    if (tripError) return json({ error: tripError.message }, 500);
    const availableSeats = toNumber(trip.available_seats, 0);
    if (availableSeats < seatsRequested) return json({ error: 'Not enough seats available' }, 409);

    const totalPrice = toNumber(body.total_price, toNumber(trip.price_per_seat, 0) * seatsRequested);
    const status = String(body.status ?? body.booking_status ?? 'confirmed');
    const { data, error } = await auth.admin.from('bookings').insert({
      trip_id: tripId, passenger_id: auth.canonicalUser.id,
      seats_requested: seatsRequested, seat_number: toNumber(body.seat_number, 1),
      pickup_location: body.pickup_stop ?? body.pickup_location ?? null,
      dropoff_location: body.dropoff_stop ?? body.dropoff_location ?? null,
      booking_status: status, status, confirmed_by_driver: status !== 'pending_driver',
      amount: totalPrice, price_per_seat: toNumber(trip.price_per_seat, 0), total_price: totalPrice,
    }).select('*').single();
    if (error) return json({ error: error.message }, 500);
    if (status !== 'pending_driver') {
      await auth.admin.from('trips').update({
        available_seats: Math.max(availableSeats - seatsRequested, 0),
        trip_status: availableSeats - seatsRequested <= 0 ? 'booked' : trip.trip_status ?? 'open',
      }).eq('trip_id', tripId);
    }
    return json({ booking: mapBookingRow(data) });
  }

  const bookingRoute = parseEntityRoute(path, 'bookings');
  if (request.method === 'GET' && bookingRoute?.id === 'user') {
    const { data, error } = await auth.admin.from('bookings').select('*').eq('passenger_id', auth.canonicalUser.id).order('created_at', { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json((Array.isArray(data) ? data : []).map(mapBookingRow));
  }

  if (request.method === 'GET' && bookingRoute?.action === 'trip' && bookingRoute?.id) {
    return handleBookingCollectionForTrip(request, bookingRoute.id);
  }

  if (request.method === 'PUT' && bookingRoute?.id) {
    const body = await request.json().catch(() => ({}));
    const status = body.status === 'accepted' ? 'confirmed' : body.status === 'rejected' ? 'cancelled' : String(body.status ?? 'cancelled');
    const { data, error } = await auth.admin.from('bookings').update({
      booking_status: status, status, confirmed_by_driver: status === 'confirmed',
    }).eq('booking_id', bookingRoute.id).select('*').single();
    if (error) return json({ error: error.message }, 500);
    return json(mapBookingRow(data));
  }

  return undefined;
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*booking-service/, '') || '/';
    let response: Response;

    if (path.startsWith('/bookings')) {
      response = await handleBookingRequest(request, path);
      if (!response) response = json({ error: 'Not found' }, 404);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'booking-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'booking-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
