/**
 * Health Check System
 * Monitors service health and dependencies
 */

import { logger } from './monitoring';
import { supabase } from './supabase/client';

export enum HealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  UNHEALTHY = 'UNHEALTHY',
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  latencyMs?: number;
  timestamp: number;
}

export interface SystemHealth {
  overall: HealthStatus;
  checks: {
    database: HealthCheckResult;
    authentication: HealthCheckResult;
    storage: HealthCheckResult;
    network: HealthCheckResult;
  };
  timestamp: number;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: 'Supabase client not initialized',
        timestamp: Date.now(),
      };
    }

    const { error } = await supabase.from('users').select('count').limit(1).single();
    
    const latencyMs = Date.now() - startTime;

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" which is OK
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Database error: ${error.message}`,
        latencyMs,
        timestamp: Date.now(),
      };
    }

    return {
      status: latencyMs > 1000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      latencyMs,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      message: error instanceof Error ? error.message : 'Database check failed',
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}

/**
 * Check authentication service
 */
async function checkAuthentication(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: 'Supabase client not initialized',
        timestamp: Date.now(),
      };
    }

    const { error } = await supabase.auth.getSession();
    const latencyMs = Date.now() - startTime;

    if (error) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: `Auth error: ${error.message}`,
        latencyMs,
        timestamp: Date.now(),
      };
    }

    return {
      status: latencyMs > 500 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      latencyMs,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      message: error instanceof Error ? error.message : 'Auth check failed',
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}

/**
 * Check storage availability
 */
async function checkStorage(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Test localStorage
    const testKey = '__wasel_health_check__';
    const testValue = Date.now().toString();
    
    localStorage.setItem(testKey, testValue);
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);

    if (retrieved !== testValue) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: 'localStorage read/write failed',
        latencyMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    // Test sessionStorage
    sessionStorage.setItem(testKey, testValue);
    const sessionRetrieved = sessionStorage.getItem(testKey);
    sessionStorage.removeItem(testKey);

    if (sessionRetrieved !== testValue) {
      return {
        status: HealthStatus.DEGRADED,
        message: 'sessionStorage read/write failed',
        latencyMs: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }

    return {
      status: HealthStatus.HEALTHY,
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      message: error instanceof Error ? error.message : 'Storage check failed',
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}

/**
 * Check network connectivity
 */
async function checkNetwork(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    if (!navigator.onLine) {
      return {
        status: HealthStatus.UNHEALTHY,
        message: 'No network connection',
        timestamp: Date.now(),
      };
    }

    // Simple connectivity check
    const response = await fetch('/favicon.ico', {
      method: 'HEAD',
      cache: 'no-cache',
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      return {
        status: HealthStatus.DEGRADED,
        message: `Network check returned ${response.status}`,
        latencyMs,
        timestamp: Date.now(),
      };
    }

    return {
      status: latencyMs > 2000 ? HealthStatus.DEGRADED : HealthStatus.HEALTHY,
      latencyMs,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      status: HealthStatus.UNHEALTHY,
      message: error instanceof Error ? error.message : 'Network check failed',
      latencyMs: Date.now() - startTime,
      timestamp: Date.now(),
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<SystemHealth> {
  logger.info('Performing system health check');

  const [database, authentication, storage, network] = await Promise.all([
    checkDatabase(),
    checkAuthentication(),
    checkStorage(),
    checkNetwork(),
  ]);

  const checks = { database, authentication, storage, network };

  // Determine overall health
  const statuses = Object.values(checks).map(check => check.status);
  let overall: HealthStatus;

  if (statuses.every(s => s === HealthStatus.HEALTHY)) {
    overall = HealthStatus.HEALTHY;
  } else if (statuses.some(s => s === HealthStatus.UNHEALTHY)) {
    overall = HealthStatus.UNHEALTHY;
  } else {
    overall = HealthStatus.DEGRADED;
  }

  const health: SystemHealth = {
    overall,
    checks,
    timestamp: Date.now(),
  };

  logger.info('Health check completed', {
    overall,
    database: database.status,
    authentication: authentication.status,
    storage: storage.status,
    network: network.status,
  });

  return health;
}

/**
 * Start periodic health checks
 */
export function startHealthMonitoring(intervalMs = 60000): () => void {
  const intervalId = setInterval(async () => {
    const health = await performHealthCheck();
    
    if (health.overall === HealthStatus.UNHEALTHY) {
      logger.error('System health check failed', { health });
    } else if (health.overall === HealthStatus.DEGRADED) {
      logger.warning('System health degraded', { health });
    }
  }, intervalMs);

  return () => clearInterval(intervalId);
}

/**
 * Get health status color for UI
 */
export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case HealthStatus.HEALTHY:
      return 'green';
    case HealthStatus.DEGRADED:
      return 'yellow';
    case HealthStatus.UNHEALTHY:
      return 'red';
  }
}

/**
 * Get health status label
 */
export function getHealthStatusLabel(status: HealthStatus): string {
  switch (status) {
    case HealthStatus.HEALTHY:
      return 'All systems operational';
    case HealthStatus.DEGRADED:
      return 'Some services degraded';
    case HealthStatus.UNHEALTHY:
      return 'System unavailable';
  }
}
