# Quick Reference: Production Features

Fast reference for using Wasel's production-grade infrastructure.

## Telemetry

```typescript
import { telemetry, initWebVitals, trackPageView, trackUserAction } from '@/platform/telemetry';

// Initialize Web Vitals tracking (call once in main.tsx)
initWebVitals();

// Track page views
trackPageView('/rides/find');

// Track user actions
trackUserAction('ride_requested', { origin: 'Amman', destination: 'Irbid' });

// Track API calls
telemetry.recordAPICall('/api/rides', 'POST', 200, 145);

// Track SLO compliance
telemetry.recordSLO('ride-matching', 'request', 145, true);

// Start/end distributed traces
const spanId = telemetry.startSpan('payment.authorize', { amount: 5000 });
// ... do work
telemetry.endSpan(spanId, 'ok');
```

## Workers

```typescript
import { createWorker, workerRegistry } from '@/platform/worker-framework';

// Create a worker
const myWorker = createWorker({
  name: 'my-worker',
  topics: ['my.topic'],
  concurrency: 10,
  retryPolicy: { maxRetries: 3, backoffMs: 1000 },
  circuitBreaker: { failureThreshold: 5, resetTimeoutMs: 60000 }
}, async (message) => {
  // Process message
  console.log('Processing:', message.payload);
});

// Register and start
workerRegistry.register(myWorker);
await workerRegistry.startAll();

// Stop all workers
await workerRegistry.stopAll();
```

## Geo-Streaming

```typescript
import { geoStream, useGeoStream } from '@/platform/geo-stream-realtime';

// Subscribe to area (drivers within radius)
const unsubscribe = geoStream.subscribeToArea(
  31.9539, // lat
  35.9106, // lng
  5,       // radius km
  (drivers) => {
    console.log('Nearby drivers:', drivers);
  }
);

// Subscribe to specific driver
geoStream.subscribeToDriver('driver-123', (location) => {
  console.log('Driver at:', location.lat, location.lng);
});

// Publish location (driver app)
geoStream.publishLocation({
  driverId: 'driver-123',
  vehicleId: 'vehicle-456',
  lat: 31.9539,
  lng: 35.9106,
  status: 'available',
  timestamp: Date.now(),
});

// React hook
function LiveMap() {
  const { subscribeToArea } = useGeoStream();
  
  useEffect(() => {
    return subscribeToArea(lat, lng, radius, updateDrivers);
  }, [lat, lng, radius]);
}
```

## Observability Dashboard

Access: `http://localhost:5173/ops/observability`

Production: `https://wasel.jo/ops/observability`

Shows:
- API latency (p50, p95, p99)
- Error rates
- Active users
- Queue health
- Worker status
- SLO compliance per service

## NPM Scripts

```bash
# Development
npm run dev                          # Start dev server
npm run workers:start                # Start worker framework
npm run observability:dashboard      # Open observability dashboard

# Testing
npm run test:unit                    # Unit tests
npm run test:e2e                     # E2E tests
npm run test:load:production         # Production load tests

# Quality
npm run type-check                   # TypeScript validation
npm run lint                         # ESLint
npm run verify:contracts             # Contract validation
npm run verify                       # Full quality gate

# Build
npm run build                        # Production build
npm run preview                      # Preview build

# Deployment
git tag v2.0.0                       # Tag triggers production deploy
npm run health:check:production      # Check production health
```

## Load Testing

```bash
# Smoke test (quick)
npm run test:load:smoke

# Production scenarios (comprehensive)
npm run test:load:production

# With custom environment
API_URL=https://staging.wasel.jo AUTH_TOKEN=xxx k6 run tests/load/k6-production.js
```

## CI/CD Pipeline

Triggered by:
- Push to `main` → Deploy to staging
- Tag `v*` → Deploy to production

Stages:
1. Quality gate (type check, lint, tests)
2. Build
3. E2E tests
4. Load tests
5. Deploy staging
6. Deploy production (tag only)
7. Performance monitoring

Auto-rollback on:
- Failed health checks
- Post-deployment errors
- SLO breaches

## Incident Response

1. Check observability dashboard: `/ops/observability`
2. Check Sentry: https://sentry.io
3. Follow runbook: `docs/PRODUCTION_RUNBOOK.md`
4. Escalate per on-call schedule

## Health Checks

```bash
# Local
curl http://localhost:5173/health

# Production
curl https://wasel.jo/health
npm run health:check:production
```

## Common Tasks

### Add new metric
```typescript
telemetry.recordMetric('my_metric', value, 'unit', { tag: 'value' });
```

### Add new worker
```typescript
const worker = createWorker(config, processor);
workerRegistry.register(worker);
```

### Subscribe to geo updates
```typescript
const unsub = geoStream.subscribeToArea(lat, lng, radius, callback);
```

### Check SLO compliance
Navigate to `/ops/observability` and view SLO table.

### Trigger deployment
```bash
git tag v2.0.1
git push origin v2.0.1
```

### Rollback deployment
```bash
vercel rollback --prod
```

## Environment Variables

Required for production:
```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEO_STREAM_URL=wss://api.wasel.jo/geo
VITE_TELEMETRY_ENDPOINT=/api/telemetry
SENTRY_DSN=
```

## Documentation

- [Architecture](./architecture.md)
- [API Contract](./api-contract.md)
- [Production Runbook](./PRODUCTION_RUNBOOK.md)
- [10/10 Achievement](./10_OUT_OF_10_COMPLETE.md)
- [Implementation Status](./implementation-status.md)
- [Observability](./observability.md)
- [Workers & Queues](./workers-and-queues.md)
