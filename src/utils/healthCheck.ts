import { getEnv } from './env';
import { supabase, isSupabaseConfigured } from './supabase/client';

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

/**
 * Verify Supabase connection
 */
async function checkSupabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Verify edge function availability
 */
async function checkEdgeFunctionHealth(): Promise<boolean> {
  const edgeFunctionName = getEnv('VITE_EDGE_FUNCTION_NAME', 'make-server-0b1f4071');
  const supabaseUrl = getEnv('VITE_SUPABASE_URL');

  if (!supabaseUrl || !edgeFunctionName) {
    return false;
  }

  try {
    const healthUrl = `${supabaseUrl}/functions/v1/${edgeFunctionName}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Verify database connectivity via a simple query
 */
async function checkDatabaseHealth(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) {
    return false;
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(force = false): Promise<HealthCheckResult> {
  // Return cached result if recent and not forced
  if (!force && lastHealthCheck) {
    const age = Date.now() - new Date(lastHealthCheck.timestamp).getTime();
    if (age < 30000) {
      // 30 seconds cache
      return lastHealthCheck;
    }
  }

  // Prevent concurrent health checks
  if (healthCheckInProgress) {
    return (
      lastHealthCheck || {
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
        errors.push(`Supabase: ${err.message}`);
        return false;
      }),
      checkEdgeFunctionHealth().catch(err => {
        errors.push(`Edge Function: ${err.message}`);
        return false;
      }),
      checkDatabaseHealth().catch(err => {
        errors.push(`Database: ${err.message}`);
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

/**
 * Verify backend connection on startup
 */
export async function verifyBackendConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  try {
    const health = await performHealthCheck(true);

    if (health.healthy) {
      return {
        connected: true,
        message: 'Backend services are operational',
      };
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

/**
 * Get last health check result without performing a new check
 */
export function getLastHealthCheck(): HealthCheckResult | null {
  return lastHealthCheck;
}

/**
 * Start periodic health checks
 */
export function startHealthCheckMonitoring(intervalMs = 60000): () => void {
  const intervalId = setInterval(() => {
    void performHealthCheck(false);
  }, intervalMs);

  // Perform initial check
  void performHealthCheck(true);

  // Return cleanup function
  return () => clearInterval(intervalId);
}
