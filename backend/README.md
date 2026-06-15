# Wasel Backend Services

Production microservices for the Wasel mobility platform.

## Services

### Ride Matching Service
Real-time geospatial matching using PostGIS and Redis GEO for driver-rider pairing.

- **File:** `services/ride-matching/service-production.ts`
- **Dockerfile:** `services/ride-matching/Dockerfile`

### Payment Reconciliation Service
Stripe integration with idempotency and retry logic for payment capture and refunds.

- **File:** `services/payment-reconciliation/service-production.ts`
- **Dockerfile:** `services/payment-reconciliation/Dockerfile`

### Ops Analytics Worker
Event consumption and metrics aggregation for operational insights.

- **File:** `services/ops-analytics/service-production.ts`
- **Dockerfile:** `services/ops-analytics/Dockerfile`

## Shared Infrastructure

### Runtime Health Server
Health check endpoints for Kubernetes liveness/readiness probes.

- **File:** `services/runtime/http-health.ts`

### Event Broker
Redis Streams implementation for event-driven architecture.

- **File:** `src/platform/event-broker-redis-production.ts`

## Building

```bash
# Build all services
docker-compose -f docker-compose.production.yml build

# Or build individual services
docker build -t wasel/ride-matching-service -f backend/services/ride-matching/Dockerfile .
```

## Running

```bash
# Start all services locally
docker-compose -f docker-compose.production.yml up

# Run individual service
tsx backend/services/ride-matching/service-production.ts
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_HOST` | Redis server hostname | Yes |
| `REDIS_PORT` | Redis server port | Yes |
| `REDIS_PASSWORD` | Redis authentication | No |
| `STRIPE_SECRET_KEY` | Stripe API key | For Payment Service |

## Deployment

```bash
# Deploy to Kubernetes
npm run k8s:deploy
```

See [Production Deployment Guide](../docs/PRODUCTION_DEPLOYMENT_GUIDE.md) for details.