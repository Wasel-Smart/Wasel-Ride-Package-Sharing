import { getEnv, hasBackendRuntimeConfig } from './env';
import { supabase, isSupabaseConfigured } from './supabase/client';
import { publicAnonKey } from './supabase/info';

export interface HealthCheckResult {
  healthy: boolean;
  services: {
    supabase: boolean;
    edgeFunction: boolean;
    database: boolean;
  };
  timestamp: string;
  errors: string[];
}

let lastHealthCheck: HealthCheckResult | null = null;
let healthCheckInProgress = false;

type SupabaseRpcError = {
  code?: string;
};

type SupabaseRpcInvoker = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ error: SupabaseRpcError | null }>;

/** Verify Supabase auth service is reachable. */
async function checkSupabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Verify edge function availability.
 * Sends the anon key so the function can respond with 200/404 instead of 401.
 */
async function checkEdgeFunctionHealth(): Promise<boolean> {
  const edgeFunctionName = getEnv('VITE_EDGE_FUNCTION_NAME', 'make-server-0b1f4071');
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');

  if (!supabaseUrl || !edgeFunctionName) return false;

  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (publicAnonKey) {
      (headers as Record<string, string>)['apikey'] = publicAnonKey;
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${edgeFunctionName}/health`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    // 200 = healthy; 404 means the function exists but has no /health route —
    // still counts as the edge runtime being reachable.
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Verify database connectivity via a lightweight RPC ping.
 *
 * We use `supabase.rpc('version')` (PostgreSQL built-in) rather than
 * reading a table — this avoids RLS false negatives when the user is
 * unauthenticated and means we don't need a dummy row to exist.
 * If the RPC isn't exposed, we fall back to the auth session check which
 * already exercises the PostgREST layer.
 */
async function checkDatabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    // `pg_catalog.version()` is always accessible to the anon role.
    const rpc = supabase.rpc as unknown as SupabaseRpcInvoker;
    const { error } = await rpc('version');
    // `error.code === 'PGRST202'` means the RPC doesn't exist in the
    // public schema — the database is still reachable, treat as healthy.
    if (!error || error.code === 'PGRST202') return true;
    return false;
  } catch {
    // Last resort: confirm auth endpoint works (covers PostgREST proxy)
    return checkSupabaseHealth();
  }
}

/** Perform comprehensive health check, caching the result for 30 s. */
export async function performHealthCheck(force = false): Promise<HealthCheckResult> {
  if (!force && lastHealthCheck) {
    const age = Date.now() - new Date(lastHealthCheck.timestamp).getTime();
    if (age < 30_000) return lastHealthCheck;
  }

  if (healthCheckInProgress) {
    return (
      lastHealthCheck ?? {
        healthy: false,
        services: { supabase: false, edgeFunction: false, database: false },
        timestamp: new Date().toISOString(),
        errors: ['Health check already in progress'],
      }
    );
  }

  healthCheckInProgress = true;
  const errors: string[] = [];

  try {
    const [supabaseHealthy, edgeFunctionHealthy, databaseHealthy] = await Promise.all([
      checkSupabaseHealth().catch(err => {
        errors.push(`Supabase: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }),
      checkEdgeFunctionHealth().catch(err => {
        errors.push(`Edge Function: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }),
      checkDatabaseHealth().catch(err => {
        errors.push(`Database: ${err instanceof Error ? err.message : String(err)}`);
        return false;
      }),
    ]);

    const result: HealthCheckResult = {
      healthy: supabaseHealthy && (edgeFunctionHealthy || databaseHealthy),
      services: {
        supabase: supabaseHealthy,
        edgeFunction: edgeFunctionHealthy,
        database: databaseHealthy,
      },
      timestamp: new Date().toISOString(),
      errors,
    };

    lastHealthCheck = result;
    return result;
  } finally {
    healthCheckInProgress = false;
  }
}

/** Verify backend connection on startup. */
export async function verifyBackendConnection(): Promise<{ connected: boolean; message: string }> {
  if (!hasBackendRuntimeConfig()) {
    return {
      connected: false,
      message: 'Backend checks skipped because runtime API credentials are not configured.',
    };
  }

  try {
    const health = await performHealthCheck(true);

    if (health.healthy) {
      return { connected: true, message: 'Backend services are operational' };
    }

    const failedServices = Object.entries(health.services)
      .filter(([, status]) => !status)
      .map(([service]) => service);

    return {
      connected: false,
      message: `Backend services unavailable: ${failedServices.join(', ')}`,
    };
  } catch (error) {
    return {
      connected: false,
      message: error instanceof Error ? error.message : 'Backend connection failed',
    };
  }
}

/** Return the most recent health result without triggering a new probe. */
export function getLastHealthCheck(): HealthCheckResult | null {
  return lastHealthCheck;
}

/** Start periodic health checks. Returns a cleanup function. */
export function startHealthCheckMonitoring(intervalMs = 60_000): () => void {
  if (!hasBackendRuntimeConfig()) {
    return () => undefined;
  }

  void performHealthCheck(true);
  const id = setInterval(() => void performHealthCheck(false), intervalMs);
  return () => clearInterval(id);
}
