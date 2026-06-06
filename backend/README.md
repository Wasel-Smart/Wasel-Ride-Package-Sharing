# Wasel Backend Services

Production-grade microservices architecture for Wasel mobility platform.

## Architecture Overview

This directory contains independent backend services that replace the previous Supabase-direct approximations:

```
backend/
├── services/
│   ├── ride-matching/          # Driver matching and assignment
│   ├── payment-reconciliation/  # Payment capture and settlement
│   └── ops-analytics/           # Operational intelligence
```

## Services

### 1. Ride Matching Service

**Responsibilities**:
- Consume `rides.requested` events
- Execute geospatial driver matching (PostGIS + Redis GEO)
- Publish `rides.assigned` events
- Handle retry logic and circuit breakers

**Technology Stack**:
- Node.js 20 + TypeScript
- PostGIS for geospatial queries
- Redis GEO for location caching
- Redis Streams for event consumption

**API**:
- `GET /health` - Health check
- `GET /ready` - Readiness probe
- `GET /metrics` - Prometheus metrics

**Environment Variables**:
```bash
NODE_ENV=production
REDIS_HOST=redis-cluster.default.svc.cluster.local
REDIS_PORT=6379
REDIS_PASSWORD=<secret>
DATABASE_URL=postgresql://user:pass@postgres:5432/wasel
SENTRY_DSN=<sentry-dsn>
```

**Scaling**:
- Min replicas: 3
- Max replicas: 20
- HPA triggers: CPU 70%, Memory 80%

---

### 2. Payment Reconciliation Service

**Responsibilities**:
- Consume `payments.authorized` events
- Execute payment capture with Stripe
- Handle escrow release and refunds
- Publish `payments.captured` events

**Technology Stack**:
- Node.js 20 + TypeScript
- Stripe SDK
- Redis Streams for event consumption
- Idempotency key management

**API**:
- `GET /health` - Health check
- `GET /ready` - Readiness probe
- `POST /refund` - Manual refund endpoint

**Environment Variables**:
```bash
NODE_ENV=production
STRIPE_SECRET_KEY=<stripe-secret>
REDIS_HOST=redis-cluster.default.svc.cluster.local
DATABASE_URL=postgresql://user:pass@postgres:5432/wasel
```

**Scaling**:
- Min replicas: 2
- Max replicas: 10
- HPA triggers: CPU 70%

---

### 3. Operations Analytics Worker

**Responsibilities**:
- Consume `rides.completed` and `payments.captured` events
- Build corridor intelligence
- Generate driver payout reports
- Produce operational metrics

**Technology Stack**:
- Node.js 20 + TypeScript
- PostgreSQL for aggregates
- Redis Streams for event consumption

**API**:
- `GET /health` - Health check
- `GET /corridors` - Top corridors
- `GET /payouts/:period` - Settlement report

**Environment Variables**:
```bash
NODE_ENV=production
REDIS_HOST=redis-cluster.default.svc.cluster.local
DATABASE_URL=postgresql://user:pass@postgres:5432/wasel
```

**Scaling**:
- Min replicas: 2
- Max replicas: 8
- HPA triggers: CPU 70%

---

## Local Development

### Prerequisites

- Node.js >= 20.0.0
- Docker + Docker Compose
- Redis 7.x
- PostgreSQL 15 + PostGIS

### Setup

```bash
# Install dependencies for all services
cd backend/services/ride-matching && npm install
cd ../payment-reconciliation && npm install
cd ../ops-analytics && npm install

# Start infrastructure
docker-compose -f docker-compose.dev.yml up -d

# Start services
npm run dev:ride-matching
npm run dev:payment
npm run dev:ops
```

### Environment Files

Copy `.env.example` to `.env` in each service directory:

```bash
cp backend/services/ride-matching/.env.example backend/services/ride-matching/.env
cp backend/services/payment-reconciliation/.env.example backend/services/payment-reconciliation/.env
cp backend/services/ops-analytics/.env.example backend/services/ops-analytics/.env
```

---

## Production Deployment

### Build Docker Images

```bash
# Build all images
docker build -t wasel.azurecr.io/ride-matching-service:latest backend/services/ride-matching
docker build -t wasel.azurecr.io/payment-reconciliation-service:latest backend/services/payment-reconciliation
docker build -t wasel.azurecr.io/ops-analytics-worker:latest backend/services/ops-analytics

# Push to registry
docker push wasel.azurecr.io/ride-matching-service:latest
docker push wasel.azurecr.io/payment-reconciliation-service:latest
docker push wasel.azurecr.io/ops-analytics-worker:latest
```

### Deploy to Kubernetes

```bash
# Apply base configuration
kubectl apply -f infra/kubernetes/base/

# Apply worker deployments
kubectl apply -f infra/kubernetes/workers/ride-matching-service.yaml
kubectl apply -f infra/kubernetes/workers/payment-and-ops-services.yaml

# Verify deployments
kubectl get pods -n wasel-production
kubectl get hpa -n wasel-production

# Check logs
kubectl logs -f deployment/ride-matching-service -n wasel-production
```

### Health Checks

```bash
# Ride Matching Service
curl http://ride-matching-service:8080/health

# Payment Reconciliation
curl http://payment-reconciliation-service:8080/health

# Ops Analytics
curl http://ops-analytics-worker:8080/health
```

---

## Monitoring

### Metrics

All services expose Prometheus metrics at `/metrics`:

```bash
# Ride Matching metrics
curl http://ride-matching-service:8080/metrics

# Key metrics:
# - event_published_total
# - event_handler_duration_seconds
# - consumer_lag_seconds
# - matching_latency_seconds
# - matching_success_rate
```

### Dashboards

Grafana dashboards available at:
- `infra/observability/grafana-dashboard-ride-matching.json`
- `infra/observability/grafana-dashboard-payments.json`
- `infra/observability/grafana-dashboard-ops.json`

### Alerts

Prometheus alert rules:
- `MatchingWorkerLag` - Queue lag > 60s
- `PaymentCaptureFailure` - Failure rate > 2%
- `ConsumerGroupDown` - No messages consumed for 5m

---

## Testing

### Unit Tests

```bash
cd backend/services/ride-matching
npm test

cd ../payment-reconciliation
npm test

cd ../ops-analytics
npm test
```

### Integration Tests

```bash
# Start test environment
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:integration
```

### Load Tests

```bash
# Smoke test
k6 run tests/load/k6-smoke.js

# Production load test
k6 run tests/load/k6-production.js
```

---

## Troubleshooting

### Service Not Starting

1. Check logs:
   ```bash
   kubectl logs deployment/ride-matching-service -n wasel-production
   ```

2. Verify environment variables:
   ```bash
   kubectl get configmap wasel-config -n wasel-production -o yaml
   kubectl get secret wasel-secrets -n wasel-production -o yaml
   ```

3. Check Redis connectivity:
   ```bash
   kubectl exec -it deployment/ride-matching-service -n wasel-production -- redis-cli -h $REDIS_HOST ping
   ```

### High Consumer Lag

1. Check HPA status:
   ```bash
   kubectl get hpa -n wasel-production
   ```

2. Scale manually if needed:
   ```bash
   kubectl scale deployment ride-matching-service --replicas=10 -n wasel-production
   ```

3. Check for stuck messages:
   ```bash
   redis-cli XPENDING wasel:events:rides.requested ride-matching-service
   ```

### Payment Failures

1. Check Stripe API status: https://status.stripe.com

2. Verify idempotency keys:
   ```sql
   SELECT payment_id, provider_transaction_id, status 
   FROM payments 
   WHERE status = 'failed' 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

3. Review DLQ:
   ```bash
   redis-cli XRANGE wasel:events:payments.authorized.dlq - + COUNT 10
   ```

---

## Architecture Decisions

### Why Redis Streams?

- **Durability**: Persistent event log with replay capability
- **Consumer Groups**: Load balancing across replicas
- **At-least-once delivery**: No message loss
- **Low latency**: <1ms publish, <5ms consume

### Why Separate Services?

- **Isolation**: Failures don't cascade
- **Scalability**: Independent scaling per workload
- **Maintainability**: Clear ownership boundaries
- **Deployability**: Zero-downtime rolling updates

### Why Kubernetes?

- **Auto-scaling**: HPA based on CPU/memory
- **Self-healing**: Automatic restarts on failure
- **Load balancing**: Built-in service discovery
- **Rollout control**: Gradual deployment with rollback

---

## Performance Benchmarks

| Service | Throughput | Latency (p95) | CPU (avg) | Memory (avg) |
|---------|-----------|---------------|-----------|--------------|
| Ride Matching | 500 req/s | 450ms | 0.8 cores | 1.2 GB |
| Payment Reconciliation | 200 req/s | 280ms | 0.5 cores | 800 MB |
| Ops Analytics | 1000 events/s | N/A | 0.3 cores | 600 MB |

---

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](../../LICENSE) for license information.
