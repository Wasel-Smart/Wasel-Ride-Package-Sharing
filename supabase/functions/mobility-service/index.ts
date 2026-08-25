import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const APP_BASE_URL = (Deno.env.get('APP_BASE_URL') ?? 'https://wasel14.online').replace(/\/$/, '');
const ADDITIONAL_ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS') ?? '';
const ALLOW_LOCAL_ORIGINS = Deno.env.get('ALLOW_LOCAL_ORIGINS') === 'true';

const responseBaseHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-csrf-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

type MobilityCorridorRow = {
  id: string; origin_city: string; destination_city: string;
  base_price_seat: number; demand_index: number; seats_total: number; seats_booked: number;
  cargo_capacity_kg?: number; cargo_booked_kg?: number; updated_at: string;
};

function buildMobilitySnapshot(corridors: MobilityCorridorRow[]) {
  return {
    corridors: corridors.map((c) => ({
      id: String(c.id), from: String(c.origin_city ?? ''), to: String(c.destination_city ?? ''),
      base_price_seat: Number(c.base_price_seat ?? 0), demand_index: Number(c.demand_index ?? 0),
      seats_total: Number(c.seats_total ?? 0), seats_booked: Number(c.seats_booked ?? 0),
      seats_available: Math.max(0, Number(c.seats_total ?? 0) - Number(c.seats_booked ?? 0)),
      cargo_capacity_kg: Number(c.cargo_capacity_kg ?? 0), cargo_booked_kg: Number(c.cargo_booked_kg ?? 0),
      cargo_available_kg: Math.max(0, Number(c.cargo_capacity_kg ?? 0) - Number(c.cargo_booked_kg ?? 0)),
      dynamic_seat_price: Number((Number(c.base_price_seat ?? 0) * (1 + Number(c.demand_index ?? 0) * 0.1)).toFixed(2)),
      dynamic_cargo_price: Number((Number(c.base_price_seat ?? 0) * 0.5 * (1 + Number(c.demand_index ?? 0) * 0.1)).toFixed(2)),
      updated_at: String(c.updated_at ?? new Date().toISOString()),
    })),
  };
}

function advanceCorridorAfterBooking(corridor: MobilityCorridorRow, type: 'seat' | 'cargo', quantity: number): MobilityCorridorRow {
  const newSeatsBooked = type === 'seat' ? Number(corridor.seats_booked ?? 0) + quantity : Number(corridor.seats_booked ?? 0);
  const newCargoBookedKg = type === 'cargo' ? Number(corridor.cargo_booked_kg ?? 0) + quantity : Number(corridor.cargo_booked_kg ?? 0);
  const demandIncrease = type === 'seat' ? quantity * 0.05 : quantity * 0.02;
  return { ...corridor, seats_booked: newSeatsBooked, cargo_booked_kg: newCargoBookedKg, demand_index: Number(corridor.demand_index ?? 0) + demandIncrease, updated_at: new Date().toISOString() };
}

async function ensureMobilitySeed(admin: ReturnType<typeof getAdminClient>) {
  const { data } = await admin.from('mobility_corridors').select('id').limit(1);
  if (Array.isArray(data) && data.length > 0) return;
  const seedCorridors = [
    { origin_city: 'Amman', destination_city: 'Irbid', base_price_seat: 3.50, seats_total: 100, seats_booked: 0, cargo_capacity_kg: 500, cargo_booked_kg: 0 },
    { origin_city: 'Amman', destination_city: 'Zarqa', base_price_seat: 2.00, seats_total: 80, seats_booked: 0, cargo_capacity_kg: 400, cargo_booked_kg: 0 },
    { origin_city: 'Amman', destination_city: 'Aqaba', base_price_seat: 8.00, seats_total: 60, seats_booked: 0, cargo_capacity_kg: 300, cargo_booked_kg: 0 },
    { origin_city: 'Amman', destination_city: 'Jerash', base_price_seat: 2.50, seats_total: 50, seats_booked: 0, cargo_capacity_kg: 250, cargo_booked_kg: 0 },
  ];
  await admin.from('mobility_corridors').insert(seedCorridors);
}

async function handleMobilityRequest(request: Request, path: string) {
  const admin = getAdminClient();

  if (request.method === 'GET' && path === '/mobility-os/public/snapshot') {
    try {
      await ensureMobilitySeed(admin);
      const { data, error } = await admin.from('mobility_corridors').select('*').order('demand_index', { ascending: false }).limit(12);
      if (error) return json({ error: error.message }, 500);
      const corridors = (Array.isArray(data) ? data : []) as MobilityCorridorRow[];
      return json({ corridors: buildMobilitySnapshot(corridors).corridors, generatedAt: new Date().toISOString() });
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Snapshot failed' }, 500);
    }
  }

  const auth = await authenticateRequest(request);
  if ('error' in auth) return auth.error;

  await ensureMobilitySeed(auth.admin);

  if (request.method === 'GET' && path === '/mobility-os/snapshot') {
    const { data, error } = await auth.admin.from('mobility_corridors').select('*').order('demand_index', { ascending: false });
    if (error) return json({ error: error.message }, 500);
    return json(buildMobilitySnapshot((Array.isArray(data) ? data : []) as MobilityCorridorRow[]));
  }

  if (request.method === 'POST' && path === '/mobility-os/booking/create') {
    const body = await request.json().catch(() => ({}));
    const corridorId = String(body.corridor_id ?? '');
    const type: 'seat' | 'cargo' = body.type === 'cargo' ? 'cargo' : 'seat';
    const quantity = Math.max(0, toNumber(body.quantity, 0));
    if (!corridorId || quantity <= 0) return json({ error: 'Invalid booking request.' }, 400);

    const { data: corridor, error } = await auth.admin.from('mobility_corridors').select('*').eq('id', corridorId).single();
    if (error) return json({ error: error.message }, 500);

    const snapshot = buildMobilitySnapshot([corridor as MobilityCorridorRow]);
    const projection = snapshot.corridors[0];
    const remaining = type === 'seat' ? projection?.seats_available : projection?.cargo_available_kg;
    if (!projection || quantity > remaining) return json({ error: 'Not enough corridor capacity remains.' }, 409);

    const timestamp = String(body.timestamp ?? new Date().toISOString());
    const traceId = `trace-${crypto.randomUUID()}`;
    const nextCorridor = advanceCorridorAfterBooking(corridor as MobilityCorridorRow, type, quantity);
    const unitPrice = type === 'seat' ? projection.dynamic_seat_price : projection.dynamic_cargo_price;

    const { data: booking, error: bookingError } = await auth.admin.from('mobility_bookings').insert({
      corridor_id: corridorId, user_id: auth.canonicalUser.id, type, quantity,
      unit_price: unitPrice, total_price: Number((unitPrice * quantity).toFixed(2)),
      booking_timestamp: timestamp, trace_id: traceId,
    }).select('booking_id').single();
    if (bookingError) return json({ error: bookingError.message }, 500);

    await auth.admin.from('mobility_corridors').update({
      seats_booked: nextCorridor.seats_booked, cargo_booked_kg: nextCorridor.cargo_booked_kg,
      demand_index: nextCorridor.demand_index, updated_at: nextCorridor.updated_at,
    }).eq('id', corridorId);

    try {
      await auth.admin.from('event_outbox').insert({
        aggregate_type: 'mobility_corridor', aggregate_id: corridorId, event_type: 'BookingCreated',
        trace_id: traceId, payload: { booking_id: booking.booking_id, corridor_id: corridorId, type, quantity, timestamp },
      });
    } catch { /* Outbox write should not fail an already accepted booking */ }

    return json({ booking_id: booking.booking_id, status: 'accepted', trace_id: traceId }, 201);
  }

  return json({ error: 'Not found' }, 404);
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*mobility-service/, '') || '/';
    let response: Response;

    if (path.startsWith('/mobility-os')) {
      response = await handleMobilityRequest(request, path);
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'mobility-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'mobility-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
