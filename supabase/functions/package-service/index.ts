import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.119.0';
import { calculatePackageDeliveryFee } from './_shared/package-pricing.ts';

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
  if (!origin) {return null;}
  try {
    const url = new URL(origin);
    if (url.origin === new URL(APP_BASE_URL).origin) {return url.origin;}
    if (ALLOW_LOCAL_ORIGINS && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {return url.origin;}
    const extra = ADDITIONAL_ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
    if (extra.includes(url.origin)) {return url.origin;}
  } catch { /* ignore */ }
  return null;
}

function buildResponseHeaders(request: Request): Headers {
  const headers = new Headers();
  const allowedOrigin = resolveAllowedOrigin(request.headers.get('origin'));
  Object.entries(responseBaseHeaders).forEach(([k, v]) => headers.set(k, v));
  headers.set('Vary', 'Origin');
  if (allowedOrigin) {headers.set('Access-Control-Allow-Origin', allowedOrigin);}
  return headers;
}

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {throw new Error('Supabase not configured');}
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {return false;}
  let result = 0;
  for (let i = 0; i < a.length; i++) {result |= a.charCodeAt(i) ^ b.charCodeAt(i);}
  return result === 0;
}

/**
 * outbox-worker authenticates with `Authorization: Bearer <service role key>`.
 * The key is compared rather than merely decoded so an ordinary user JWT cannot
 * reach the event sink and mutate packages without a user session.
 */
function isServiceRoleRequest(request: Request): boolean {
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) {return false;}
  if (!SUPABASE_SERVICE_ROLE_KEY) {return false;}
  return constantTimeEqual(authorization.slice(7), SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * `POST /events` — the fan-out target for `packages.created` and
 * `packages.location-updated`.
 *
 * This path did not exist, so both topics were answered 404 by this function,
 * retried five times and dead-lettered. Package assignment therefore only ever
 * ran on the `POST /packages` request path.
 *
 * `packages.created` mirrors that assignment step: claim a package slot on an
 * open trip that accepts packages. The slot update is conditional on the slot
 * still being available, so two concurrent events cannot oversubscribe a trip.
 */
async function assignPackageToOpenTrip(admin: ReturnType<typeof getAdminClient>, packageId: string): Promise<Record<string, unknown>> {
  const { data: existing, error: lookupError } = await admin
    .from('packages')
    .select('trip_id, carrier_id, status')
    .eq('package_id', packageId)
    .maybeSingle();
  if (lookupError) {throw new Error(lookupError.message);}

  // Idempotency: an already-assigned package must not consume a second slot.
  if (existing?.trip_id || existing?.carrier_id) {
    return { assigned: true, skipped: 'already_assigned' };
  }

  const { data: trip, error: tripError } = await admin
    .from('trips')
    .select('trip_id, driver_id, package_slots_remaining')
    .eq('allow_packages', true)
    .eq('trip_status', 'open')
    .gt('package_slots_remaining', 0)
    .limit(1)
    .maybeSingle();
  if (tripError) {throw new Error(tripError.message);}

  if (!trip) {return { assigned: false, reason: 'no_open_trip' };}

  // Conditional decrement: if another event took the last slot first, the
  // update matches zero rows and the package is left unassigned rather than
  // oversubscribing the vehicle.
  const { data: claimed, error: claimError } = await admin
    .from('trips')
    .update({ package_slots_remaining: toNumber(trip.package_slots_remaining, 0) - 1 })
    .eq('trip_id', trip.trip_id)
    .gt('package_slots_remaining', 0)
    .select('trip_id');
  if (claimError) {throw new Error(claimError.message);}
  if (!claimed || claimed.length === 0) {
    return { assigned: false, reason: 'slot_taken' };
  }

  const { error: assignError } = await admin
    .from('packages')
    .update({ trip_id: trip.trip_id, carrier_id: trip.driver_id, status: 'assigned' })
    .eq('package_id', packageId);
  if (assignError) {throw new Error(assignError.message);}

  await admin.from('package_events').insert({
    package_id: packageId,
    event_type: 'assignment',
    event_status: 'assigned',
    notes: JSON.stringify({ trip_id: trip.trip_id, driver_id: trip.driver_id, source: 'outbox' }),
  });

  return { assigned: true, tripId: trip.trip_id };
}

function parsePackageEvent(body: Record<string, unknown>): { eventId: string; topic: string; packageId: string; payload: Record<string, unknown> } | { error: string } {
  const eventId = typeof body.id === 'string' ? body.id.trim() : '';
  if (!eventId || eventId.length > 128) {return { error: 'Missing required field: id' };}

  const topic = typeof body.topic === 'string' ? body.topic.trim() : '';
  if (!topic) {return { error: 'Missing required field: topic' };}
  if (topic !== 'packages.created' && topic !== 'packages.location-updated') {
    return { error: `Unsupported topic: ${ topic }` };
  }

  const payload = (body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload))
    ? body.payload as Record<string, unknown>
    : null;
  if (!payload) {return { error: 'Missing required field: payload' };}

  const packageId = typeof payload.packageId === 'string' ? payload.packageId.trim() : '';
  if (!packageId) {return { error: 'Missing required field: payload.packageId' };}

  return { eventId, topic, packageId, payload };
}

async function handleEventRequest(request: Request): Promise<Response> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {return json({ error: 'Server misconfigured' }, 500);}
  if (!isServiceRoleRequest(request)) {return json({ error: 'Unauthorized' }, 401);}

  const parsed = parsePackageEvent(await request.json().catch(() => ({})) as Record<string, unknown>);
  if ('error' in parsed) {return json({ error: parsed.error }, 400);}

  const { eventId, topic, packageId, payload } = parsed;

  const admin = getAdminClient();

  try {
    if (topic === 'packages.location-updated') {
      const location = typeof payload.location === 'string' ? payload.location.slice(0, 500) : null;
      const { error } = await admin.from('packages').update({ current_location: location, updated_at: new Date().toISOString() }).eq('package_id', packageId);
      if (error) {throw new Error(error.message);}
      return json({ ok: true, topic, packageId });
    }

    const result = await assignPackageToOpenTrip(admin, packageId);
    return json({ ok: true, topic, packageId, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(JSON.stringify({ level: 'error', service: 'package-service', message: 'event handler failed', eventId, topic, detail: message }));
    // 500 makes outbox-worker increment attempts and retry.
    return json({ error: 'Event handler failed' }, 500);
  }
}

async function authenticateRequest(request: Request) {
  const authorization = request.headers.get('Authorization') ?? '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) {return { error: json({ error: 'Missing bearer token' }, 401) };}
  const admin = getAdminClient();
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) {return { error: json({ error: 'Invalid auth token' }, 401) };}
  const { data: byAuthUser, error: byAuthError } = await admin.from('users').select('*').eq('auth_user_id', authData.user.id).maybeSingle();
  if (byAuthError) {return { error: json({ error: byAuthError.message }, 500) };}
  let canonicalUser = byAuthUser;
  if (!canonicalUser) {
    const fallback = await admin.from('users').select('*').eq('id', authData.user.id).maybeSingle();
    canonicalUser = fallback.data;
    if (fallback.error || !canonicalUser) {return { error: json({ error: 'User not found' }, 404) };}
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
    delivery_fee: toNumber(row.delivery_fee ?? row.fee_amount, 0),
    fee_amount: toNumber(row.fee_amount ?? row.delivery_fee, 0),
  };
}

function parseEntityRoute(path: string, prefix: string) {
  const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`^/${escapedPrefix}/([^/]+)(?:/([^/]+))?$`).exec(path);
  if (!match) {return null;}
  return { id: decodeURIComponent(match[1]), action: match[2] ? decodeURIComponent(match[2]) : null };
}

// eslint-disable-next-line complexity
async function handlePackageRequest(request: Request, path: string) {
  const auth = await authenticateRequest(request);
  if ('error' in auth) {return auth.error;}

  if (request.method === 'POST' && path === '/packages') {
    const body = await request.json().catch(() => ({}));
    const packageFee = calculatePackageDeliveryFee(body.weight);
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
      delivery_fee: packageFee,
      fee_amount: packageFee,
      status: 'posted',
    }).select('*').single();
    if (error) {return json({ error: error.message }, 500);}

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
    if (error) {return json({ error: error.message }, 500);}
    if (!data) {return json({ error: 'Package not found' }, 404);}
    const isOwner = data.sender_id === auth.canonicalUser.id || data.carrier_id === auth.canonicalUser.id;
    if (!isOwner) {return json({ error: 'Not authorized to view this package.' }, 403);}
    return json(mapPackageRow(data));
  }

  if (request.method === 'GET' && path.startsWith('/packages/sender/')) {
    const userId = path.split('/packages/sender/')[1]?.split('/')[0];
    if (!userId) {return json({ error: 'User ID required' }, 400);}
    if (userId !== auth.canonicalUser.id && userId !== auth.authUser.id) {
      return json({ error: 'Not authorized to view these packages.' }, 403);
    }
    const { data, error } = await auth.admin.from('packages').select('*').eq('sender_id', auth.canonicalUser.id).order('created_at', { ascending: false });
    if (error) {return json({ error: error.message }, 500);}
    return json((Array.isArray(data) ? data : []).map(mapPackageRow));
  }

  if (request.method === 'POST' && packageRoute?.id && packageRoute.action === 'deliver') {
    const { data: pkg, error: pkgErr } = await auth.admin.from('packages').select('package_id, sender_id, carrier_id').eq('package_id', packageRoute.id).maybeSingle();
    if (pkgErr) {return json({ error: pkgErr.message }, 500);}
    if (!pkg) {return json({ error: 'Package not found' }, 404);}
    const isCarrier = pkg.carrier_id === auth.canonicalUser.id;
    const isSender = pkg.sender_id === auth.canonicalUser.id;
    if (!isCarrier && !isSender) {return json({ error: 'Not authorized to deliver this package.' }, 403);}
    const { data, error } = await auth.admin.from('packages').update({ status: 'delivered', delivered_at: new Date().toISOString() }).eq('package_id', packageRoute.id).select('*').single();
    if (error) {return json({ error: error.message }, 500);}
    return json(mapPackageRow(data));
  }

  return undefined;
}

Deno.serve(async (request: Request) => {
  const headers = buildResponseHeaders(request);
  headers.set('X-Api-Version', 'v1');
  if (request.method === 'OPTIONS') {return new Response(null, { status: 204, headers });}

  try {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^.*package-service/, '') || '/';
    // The route handler returns undefined when no sub-path matches, so the router
  // falls through to the 404 below.
  let response: Response | undefined;

    if (path === '/events') {
      response = await handleEventRequest(request);
    } else if (path.startsWith('/packages')) {
      response = await handlePackageRequest(request, path);
      if (!response) {response = json({ error: 'Not found' }, 404);}
    } else if (path === '/health') {
      response = json({ status: 'ok', service: 'package-service', timestamp: new Date().toISOString() });
    } else {
      response = json({ error: 'Not found', service: 'package-service' }, 404);
    }

    const finalHeaders = new Headers(response.headers);
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(response.body, { status: response.status, headers: finalHeaders });
  } catch {
    const finalHeaders = new Headers({ 'Content-Type': 'application/json' });
    headers.forEach((value, key) => finalHeaders.set(key, value));
    return new Response(JSON.stringify({ error: 'Internal server error', requestId: crypto.randomUUID() }), { status: 500, headers: finalHeaders });
  }
});
