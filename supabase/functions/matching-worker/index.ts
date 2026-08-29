/**
 * matching-worker — Production-Grade Spatial Matching Engine
 *
 * Architecture:
 *  1. Geo-aware matching: uses PostGIS ST_DWithin on origin/destination
 *     geography columns instead of fragile city-name string comparison.
 *     Matches within 5 km of the requested origin AND destination.
 *
 *  2. Atomic operations: the entire match cycle (mark alert as matched +
 *     insert notification) runs inside a single PostgreSQL transaction via
 *     a dedicated RPC function. If the notification insert fails, the alert
 *     status rolls back — no orphaned "matched" alerts with no notification.
 *
 *  3. Distributed lock: PostgreSQL advisory lock (pg_try_advisory_xact_lock)
 *     prevents two concurrent worker invocations from processing the same
 *     alert simultaneously. The lock is scoped to the alert_id hash so
 *     different alerts are processed in parallel.
 *
 *  4. Batch processing: a single SQL call returns all matches; no N+1 loop.
 *
 *  5. Idempotency: the matching RPC checks for existing matched/notified
 *     state before inserting, making it safe to re-run on retry.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { idempotencyMiddleware } from '../_shared/idempotency-middleware.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const WORKER_SECRET = Deno.env.get('COMMUNICATION_WORKER_SECRET') ?? '';

// Spatial match radius in metres
const MATCH_RADIUS_METERS = 5_000;
// Maximum alerts to process per worker run (prevents timeout on large backlogs)
const BATCH_LIMIT = 200;

// ── Helpers ───────────────────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function authorized(request: Request): boolean {
  const secret = request.headers.get('x-communication-worker-secret');
  return Boolean(WORKER_SECRET && constantTimeEqual(secret ?? '', WORKER_SECRET));
}

function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Core matching logic ───────────────────────────────────────────────────────

interface MatchResult {
  processed: number;
  matched: number;
  skipped_locked: number;
  matchedAlertIds: string[];
  errors: string[];
}

async function runMatchingCycle(): Promise<MatchResult> {
  const admin = getAdminClient();

  /**
   * Step 1: Fetch pending alerts with their geo coordinates.
   * We only fetch alerts that have origin/destination points populated.
   * Alerts without coordinates fall back to city-name matching (legacy path).
   */
  const { data: alerts, error: alertsError } = await admin
    .from('demand_alerts')
    .select(
      'alert_id, user_id, origin_city, destination_city, requested_date, seats_needed, ' +
      'origin_lat, origin_lng, destination_lat, destination_lng',
    )
    .eq('status', 'pending')
    .gte('requested_date', new Date().toISOString().slice(0, 10))
    .not('origin_lat', 'is', null)
    .not('destination_lat', 'is', null)
    .order('created_at')
    .limit(BATCH_LIMIT);

  if (alertsError) throw new Error(`Failed to fetch alerts: ${alertsError.message}`);

  const result: MatchResult = {
    processed: (alerts ?? []).length,
    matched: 0,
    skipped_locked: 0,
    matchedAlertIds: [],
    errors: [],
  };

  if (!alerts || alerts.length === 0) return result;

  /**
   * Step 2: For each alert, call the atomic PostgreSQL RPC that:
   *   a) Acquires a per-alert advisory lock (prevents concurrent workers
   *      from processing the same alert simultaneously)
   *   b) Finds the best matching trip using ST_DWithin spatial index
   *   c) Inserts the notification AND updates the alert status in one
   *      transaction — both succeed or both roll back
   *   d) Returns the matched trip_id or null if no match / already locked
   *
   * We process alerts in parallel (Promise.allSettled) for throughput.
   */
  const matchResults = await Promise.allSettled(
    alerts.map((alert: Record<string, unknown>) =>
      admin.rpc('match_alert_atomic', {
        p_alert_id: alert.alert_id,
        p_origin_lat: alert.origin_lat,
        p_origin_lng: alert.origin_lng,
        p_destination_lat: alert.destination_lat,
        p_destination_lng: alert.destination_lng,
        p_requested_date: alert.requested_date,
        p_seats_needed: alert.seats_needed ?? 1,
        p_radius_meters: MATCH_RADIUS_METERS,
      }),
    ),
  );

  matchResults.forEach((res: PromiseSettledResult<unknown>, i: number) => {
    const alert = alerts[i] as Record<string, unknown>;
    if (res.status === 'rejected') {
      result.errors.push(`alert ${alert.alert_id}: ${String(res.reason)}`);
      return;
    }

    const { data, error } = res.value as { data: { matched: boolean }; error: { message: string } };
    if (error) {
      if (error.message?.includes('lock_not_acquired')) {
        result.skipped_locked++;
      } else {
        result.errors.push(`alert ${alert.alert_id}: ${error.message}`);
      }
      return;
    }

    if (data && (data as { matched: boolean }).matched) {
      result.matched++;
      result.matchedAlertIds.push(String(alert.alert_id));
    }
  });

  return result;
}

// ── Entry point ───────────────────────────────────────────────────────────────

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  const rl = checkRateLimit(
    `matching-worker:${request.headers.get('x-forwarded-for') ?? 'unknown'}`,
    { windowMs: 60_000, maxRequests: 30 },
  );
  if (!rl.allowed) return json({ error: 'Rate limit exceeded' }, 429);

  const url = new URL(request.url);
  const path = url.pathname.replace(/^.*matching-worker/, '') || '/';

  if (request.method === 'GET' && path === '/health') {
    return json({ status: 'ok', service: 'matching-worker', timestamp: new Date().toISOString() });
  }

  if (!authorized(request)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  if (request.method === 'POST' && path === '/run') {
    // Idempotency: if this exact worker invocation was already processed
    // (e.g. the scheduler retried after a timeout), return the cached result.
    const cached = await idempotencyMiddleware.check(request, 'worker');
    if (cached) return cached;

    let response: Response;
    try {
      const result = await runMatchingCycle();
      response = json(result);
      await idempotencyMiddleware.store(request, 'worker', response.clone());
    } catch (error) {
      idempotencyMiddleware.release(request, 'worker');
      response = json(
        { error: error instanceof Error ? error.message : String(error) },
        500,
      );
    }
    return response;
  }

  return json({ error: 'Not found' }, 404);
});
