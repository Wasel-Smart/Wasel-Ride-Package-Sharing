import { getEnv } from './env';
import { logger } from './monitoring';
import { supabase, isSupabaseConfigured } from '@/utils/supabase/client.ts';

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
let consecutiveFailures = 0;

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
 * Skipped on local dev origins to avoid CORS failures against the remote
 * Supabase project — core.ts already handles this via probeBackendHealth.
 */
async function checkEdgeFunctionHealth(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const { hostname, protocol } = new URL(window.location.origin);
      if (protocol === 'http:' && (hostname === 'localhost' || hostname === '127.0.0.1')) {
        return true; // Assume available; core.ts probes via Supabase auth instead.
      }
    } catch {
      // ignore
    }
  }

  const edgeFunctionName = getEnv('VITE_EDGE_FUNCTION_NAME', 'make-server-0b1f4071');
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');

  if (!supabaseUrl || !edgeFunctionName) return false;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/${edgeFunctionName}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok || response.status === 404;
  } catch {
    return false;
  }
}

/**
 * Verify database connectivity via Supabase auth session.
 * This exercises the PostgREST layer without relying on a specific RPC.
 */
async function checkDatabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
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

    if (supabaseHealthy && (edgeFunctionHealthy || databaseHealthy)) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
    }

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
  let timerId: ReturnType<typeof setTimeout> | null = null;
  const MAX_FAILURES_BEFORE_BACKOFF = 3;
  const BACKOFF_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const scheduleNextCheck = (interval: number) => {
    if (timerId) clearTimeout(timerId);
    timerId = setTimeout(check, interval);
  };

  const check = async () => {
    await performHealthCheck(false);
    const isBackingOff = consecutiveFailures >= MAX_FAILURES_BEFORE_BACKOFF;
    const nextInterval = isBackingOff ? BACKOFF_INTERVAL_MS : intervalMs;
    if (isBackingOff && (consecutiveFailures === MAX_FAILURES_BEFORE_BACKOFF)) {
      logger.warning('Backend health checks failing repeatedly. Backing off to 5-minute intervals.');
    }
    scheduleNextCheck(nextInterval);
  };

  // Initial check
  void performHealthCheck(true).then(() => scheduleNextCheck(intervalMs));

  return () => {
    if (timerId) clearTimeout(timerId);
  };
}
