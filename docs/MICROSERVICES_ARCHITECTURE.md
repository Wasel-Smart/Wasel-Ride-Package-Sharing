# Microservices Architecture Guide

## Overview

Wasel platform is designed with a microservices-ready architecture that can operate in two modes:

1. **Monolith Mode** (Development): All services route through a single API gateway
2. **Microservices Mode** (Production): Services are independently deployed and scaled

## Architecture

### Service Registry

All services are registered in `src/platform/microservices/serviceRegistry.ts`:

- **auth-service**: Authentication and authorization
- **wallet-service**: Financial transactions and balance management
- **trips-service**: Ride creation, search, and management
- **bookings-service**: Booking requests and confirmations
- **packages-service**: Package delivery coordination
- **notifications-service**: Push notifications and alerts
- **analytics-service**: Business intelligence and reporting
- **payments-service**: Payment processing with Stripe

### Circuit Breaker Pattern

Each service has circuit breaker protection to prevent cascading failures:

```typescript
{
  threshold: 5,        // Open circuit after 5 failures
  resetTimeout: 30000  // Try again after 30 seconds
}
```

### API Gateway Client

Unified client with:
- Automatic retries with exponential backoff
- Request timeout protection
- Distributed tracing (X-Trace-Id headers)
- Circuit breaker integration

## Configuration

### Environment Variables

```bash
# Enable microservices mode
VITE_MICROSERVICES_ENABLED=true

# Service endpoints
VITE_SERVICE_AUTH_URL=https://auth.wasel.jo
VITE_SERVICE_WALLET_URL=https://wallet.wasel.jo
VITE_SERVICE_TRIPS_URL=https://trips.wasel.jo
VITE_SERVICE_BOOKINGS_URL=https://bookings.wasel.jo
VITE_SERVICE_PACKAGES_URL=https://packages.wasel.jo
VITE_SERVICE_NOTIFICATIONS_URL=https://notifications.wasel.jo
VITE_SERVICE_ANALYTICS_URL=https://analytics.wasel.jo
VITE_SERVICE_PAYMENTS_URL=https://payments.wasel.jo
```

### Fallback Behavior

If service URLs are not configured, the system falls back to monolith API routes:
- `/api/auth`
- `/api/wallet`
- `/api/trips`
- etc.

## Usage

### Making API Calls

```typescript
import { apiGateway } from '@/platform/microservices';

// GET request
const response = await apiGateway.get('trips', '/search', {
  timeout: 5000,
  retries: 2,
});

// POST request
const booking = await apiGateway.post('bookings', '/create', {
  tripId: '123',
  seats: 2,
});

// Health check
const isHealthy = await apiGateway.healthCheck('wallet');
```

### Health Monitoring

```typescript
import { serviceHealthMonitor } from '@/platform/microservices';

// Start continuous monitoring
serviceHealthMonitor.startMonitoring();

// Check specific service
const health = serviceHealthMonitor.getHealthStatus('auth');
console.log(health.status); // 'healthy' | 'degraded' | 'down'

// Get all services status
const report = serviceHealthMonitor.getAllHealthStatus();
```

## Deployment Strategy

### Phase 1: Monolith (Current)
- All services in single deployment
- Shared database
- Simple deployment pipeline

### Phase 2: Service Extraction
1. Extract auth-service (stateless, high priority)
2. Extract wallet-service (financial isolation)
3. Extract trips-service (high traffic)
4. Extract remaining services

### Phase 3: Full Microservices
- Independent deployments
- Service mesh (Istio/Linkerd)
- Distributed tracing (Jaeger)
- Centralized logging (ELK stack)

## Service Contracts

Each service exposes:
- `GET /health` - Health check endpoint
- `GET /metrics` - Prometheus metrics
- OpenAPI specification at `/openapi.json`

## Monitoring

### Metrics Collected
- Request count per service
- Response time (avg, p50, p95, p99)
- Error rate
- Circuit breaker state
- Service health status

### Dashboards
Access performance dashboard:
```typescript
import { performanceMonitor } from '@/platform/observability';

const dashboard = performanceMonitor.generateDashboard();
console.log(dashboard);
```

## Best Practices

1. **Always use apiGateway** for service communication
2. **Handle circuit breaker errors** gracefully
3. **Set appropriate timeouts** based on operation criticality
4. **Monitor service health** in production
5. **Use distributed tracing** for debugging
6. **Implement retry logic** for transient failures
7. **Cache responses** when appropriate

## Troubleshooting

### Circuit Breaker Open
```typescript
import { resetAllCircuitBreakers } from '@/platform/microservices';

// Reset all circuit breakers (use with caution)
resetAllCircuitBreakers();
```

### Service Down
1. Check service health: `serviceHealthMonitor.getHealthStatus('service-name')`
2. Verify environment variables
3. Check network connectivity
4. Review service logs
5. Verify circuit breaker state

### High Latency
1. Check network conditions
2. Review service metrics
3. Verify database performance
4. Check for N+1 queries
5. Review caching strategy

## Migration Checklist

- [ ] Configure service URLs in environment
- [ ] Deploy services independently
- [ ] Set up service mesh
- [ ] Configure distributed tracing
- [ ] Set up centralized logging
- [ ] Configure monitoring dashboards
- [ ] Test circuit breaker behavior
- [ ] Load test each service
- [ ] Document service contracts
- [ ] Train team on microservices patterns
