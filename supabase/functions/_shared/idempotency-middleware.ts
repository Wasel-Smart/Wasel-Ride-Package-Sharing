/**
 * Idempotency Middleware — Supabase Edge Function shared utility
 *
 * Architecture:
 *  - Reads X-Idempotency-Key from every mutating request (POST/PATCH/PUT/DELETE)
 *  - On first request: processes normally, stores the serialised response in the
 *    in-process cache (or Redis when REDIS_URL is configured) with a 24-hour TTL
 *  - On retry with the same key: returns the cached response immediately without
 *    touching the database — prevents duplicate bookings, double charges, etc.
 *  - Keys are scoped per authenticated user (auth.uid + idempotency key) so one
 *    user cannot replay another user's transaction
 *  - 409 Conflict is returned when a key is currently being processed (in-flight
 *    dedup) to prevent concurrent duplicate submissions
 *
 * Usage in an Edge Function:
 *
 *   import { idempotencyMiddleware } from '../_shared/idempotency-middleware.ts';
 *
 *   Deno.serve(async (req) => {
 *     const userId = getUserIdFromJwt(req);
 *     const cached = await idempotencyMiddleware.check(req, userId);
 *     if (cached) return cached;                    // replay cached response
 *
 *     const result = await doActualWork();
 *     const response = json(result);
 *     await idempotencyMiddleware.store(req, userId, response.clone());
 *     return response;
 *   });
 */

// ── In-process cache (Deno isolate-scoped) ────────────────────────────────────
// Each Edge Function invocation runs in a Deno isolate. The in-process cache
// is shared within a single warm isolate. For cross-isolate dedup (production
// at scale), set REDIS_URL and the middleware will use Redis instead.

interface CacheEntry {
  status: number;
  headers: Record<string, string>;
  body: string;
  storedAt: number;
}

const IN_PROCESS_CACHE = new Map<string, CacheEntry | 'in_flight'>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Redis client (optional — used when REDIS_URL is set) ─────────────────────

async function redisGet(key: string): Promise<string | null> {
  const redisUrl = Deno.env.get('REDIS_URL');
  if (!redisUrl) return null;
  try {
    const res = await fetch(`${redisUrl}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${Deno.env.get('REDIS_TOKEN') ?? ''}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: string | null };
    return data.result ?? null;
  } catch { return null; }
}

async function redisSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  const redisUrl = Deno.env.get('REDIS_URL');
  if (!redisUrl) return;
  try {
    await fetch(`${redisUrl}/set/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('REDIS_TOKEN') ?? ''}`,
      },
      body: JSON.stringify({ value, ex: ttlSeconds }),
    });
  } catch { /* non-fatal — fall through to in-process cache */ }
}

// ── Middleware ────────────────────────────────────────────────────────────────

function buildCacheKey(userId: string, idempotencyKey: string): string {
  // Scope key per user so cross-user replay is impossible
  return `idempotency:${userId}:${idempotencyKey}`;
}

function isMutatingMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

export const idempotencyMiddleware = {
  /**
   * Check if this request has already been processed.
   * Returns the cached Response if found, or null if this is a fresh request.
   * Returns a 409 Response if the same key is currently in-flight.
   */
  async check(request: Request, userId: string | null): Promise<Response | null> {
    if (!isMutatingMethod(request.method)) return null;

    const key = request.headers.get('X-Idempotency-Key');
    if (!key || !userId) return null;

    // Validate key format: must be a non-empty string ≤ 128 chars, alphanumeric + hyphens
    if (!/^[a-zA-Z0-9_\-]{1,128}$/.test(key)) {
      return new Response(
        JSON.stringify({ error: 'Invalid X-Idempotency-Key format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const cacheKey = buildCacheKey(userId, key);

    // Check Redis first (cross-isolate)
    const redisRaw = await redisGet(cacheKey);
    if (redisRaw) {
      try {
        const entry = JSON.parse(redisRaw) as CacheEntry;
        return replayResponse(entry, key, 'redis');
      } catch { /* corrupted entry — treat as miss */ }
    }

    // Check in-process cache
    const inProcess = IN_PROCESS_CACHE.get(cacheKey);
    if (inProcess === 'in_flight') {
      return new Response(
        JSON.stringify({ error: 'Request with this idempotency key is already being processed' }),
        {
          status: 409,
          headers: {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': key,
            'Retry-After': '2',
          },
        },
      );
    }
    if (inProcess) {
      return replayResponse(inProcess, key, 'memory');
    }

    // Mark as in-flight to block concurrent duplicates
    IN_PROCESS_CACHE.set(cacheKey, 'in_flight');
    return null;
  },

  /**
   * Store the response for future replays.
   * Must be called after a successful response is produced.
   * Pass response.clone() so the original can still be returned to the caller.
   */
  async store(request: Request, userId: string | null, response: Response): Promise<void> {
    if (!isMutatingMethod(request.method)) return;

    const key = request.headers.get('X-Idempotency-Key');
    if (!key || !userId) return;

    // Only cache successful responses (2xx)
    if (response.status < 200 || response.status >= 300) {
      const cacheKey = buildCacheKey(userId, key);
      IN_PROCESS_CACHE.delete(cacheKey); // release in-flight lock on failure
      return;
    }

    const cacheKey = buildCacheKey(userId, key);
    const headers: Record<string, string> = {};
    response.headers.forEach((v, k) => { headers[k] = v; });

    let body = '';
    try { body = await response.text(); } catch { /* empty body */ }

    const entry: CacheEntry = {
      status: response.status,
      headers,
      body,
      storedAt: Date.now(),
    };

    // Store in both caches
    IN_PROCESS_CACHE.set(cacheKey, entry);
    await redisSet(cacheKey, JSON.stringify(entry), Math.floor(CACHE_TTL_MS / 1000));

    // Evict expired in-process entries periodically
    evictExpired();
  },

  /**
   * Explicitly release an in-flight lock (call on unhandled errors).
   */
  release(request: Request, userId: string | null): void {
    const key = request.headers.get('X-Idempotency-Key');
    if (!key || !userId) return;
    const cacheKey = buildCacheKey(userId, key);
    if (IN_PROCESS_CACHE.get(cacheKey) === 'in_flight') {
      IN_PROCESS_CACHE.delete(cacheKey);
    }
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function replayResponse(entry: CacheEntry, key: string, source: string): Response {
  const headers = new Headers(entry.headers);
  headers.set('X-Idempotency-Key', key);
  headers.set('X-Idempotency-Replayed', 'true');
  headers.set('X-Idempotency-Source', source);
  return new Response(entry.body, { status: entry.status, headers });
}

function evictExpired(): void {
  const now = Date.now();
  for (const [k, v] of IN_PROCESS_CACHE.entries()) {
    if (v !== 'in_flight' && now - v.storedAt > CACHE_TTL_MS) {
      IN_PROCESS_CACHE.delete(k);
    }
  }
}
