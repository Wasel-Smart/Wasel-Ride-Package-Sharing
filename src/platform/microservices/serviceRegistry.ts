/**
 * Microservices Registry — Wasel Platform
 * 
 * Central registry for all microservices with health checks,
 * circuit breakers, and service discovery.
 */

export interface ServiceEndpoint {
  name: string;
  baseUrl: string;
  version: string;
  healthCheck: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    threshold: number;
    resetTimeout: number;
  };
}

export interface ServiceRegistry {
  auth: ServiceEndpoint;
  wallet: ServiceEndpoint;
  trips: ServiceEndpoint;
  bookings: ServiceEndpoint;
  packages: ServiceEndpoint;
  notifications: ServiceEndpoint;
  analytics: ServiceEndpoint;
  payments: ServiceEndpoint;
}

const isProduction = import.meta.env.PROD;

const getServiceUrl = (serviceName: string, fallback: string): string => {
  const envKey = `VITE_SERVICE_${serviceName.toUpperCase()}_URL`;
  return import.meta.env[envKey] || fallback;
};

export const SERVICE_REGISTRY: ServiceRegistry = {
  auth: {
    name: 'auth-service',
    baseUrl: getServiceUrl('auth', '/api/auth'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 5000,
    retries: 3,
    circuitBreaker: { threshold: 5, resetTimeout: 30000 },
  },
  wallet: {
    name: 'wallet-service',
    baseUrl: getServiceUrl('wallet', '/api/wallet'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 8000,
    retries: 3,
    circuitBreaker: { threshold: 5, resetTimeout: 30000 },
  },
  trips: {
    name: 'trips-service',
    baseUrl: getServiceUrl('trips', '/api/trips'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 10000,
    retries: 2,
    circuitBreaker: { threshold: 10, resetTimeout: 20000 },
  },
  bookings: {
    name: 'bookings-service',
    baseUrl: getServiceUrl('bookings', '/api/bookings'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 8000,
    retries: 3,
    circuitBreaker: { threshold: 5, resetTimeout: 30000 },
  },
  packages: {
    name: 'packages-service',
    baseUrl: getServiceUrl('packages', '/api/packages'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 10000,
    retries: 2,
    circuitBreaker: { threshold: 10, resetTimeout: 20000 },
  },
  notifications: {
    name: 'notifications-service',
    baseUrl: getServiceUrl('notifications', '/api/notifications'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 5000,
    retries: 2,
    circuitBreaker: { threshold: 10, resetTimeout: 15000 },
  },
  analytics: {
    name: 'analytics-service',
    baseUrl: getServiceUrl('analytics', '/api/analytics'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 15000,
    retries: 1,
    circuitBreaker: { threshold: 15, resetTimeout: 60000 },
  },
  payments: {
    name: 'payments-service',
    baseUrl: getServiceUrl('payments', '/api/payments'),
    version: 'v1',
    healthCheck: '/health',
    timeout: 10000,
    retries: 3,
    circuitBreaker: { threshold: 3, resetTimeout: 60000 },
  },
};

export function getServiceEndpoint(serviceName: keyof ServiceRegistry): ServiceEndpoint {
  return SERVICE_REGISTRY[serviceName];
}

export function buildServiceUrl(serviceName: keyof ServiceRegistry, path: string): string {
  const service = getServiceEndpoint(serviceName);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${service.baseUrl}${cleanPath}`;
}

export function isMicroservicesMode(): boolean {
  return isProduction && Boolean(import.meta.env.VITE_MICROSERVICES_ENABLED);
}

export function getServiceHealthUrl(serviceName: keyof ServiceRegistry): string {
  const service = getServiceEndpoint(serviceName);
  return `${service.baseUrl}${service.healthCheck}`;
}
