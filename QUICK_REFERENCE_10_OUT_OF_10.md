# Wasel 10/10 Quick Reference

## One-Command Deploy

```bash
# Deploy everything to reach 10/10
./scripts/deploy-to-10.sh
```

## Step-by-Step Deploy

### 1. Backend Services (15 minutes)

```bash
# Set environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/wasel"
export REDIS_URL="redis://host:6379"
export STRIPE_SECRET_KEY="sk_live_..."

# Deploy services
./scripts/deploy-backend-services.sh

# Verify
kubectl get pods -n wasel-backend
kubectl logs -f deployment/ride-matching -n wasel-backend
```

### 2. Mobile Apps (30 minutes)

```bash
cd mobile

# Install dependencies
npm install
cd ios && pod install && cd ..

# iOS build
npm run build:ios
# Upload to App Store Connect

# Android build
npm run build:android
# Upload to Google Play Console
```

### 3. Monitoring (10 minutes)

```bash
# Set Grafana password
export GRAFANA_ADMIN_PASSWORD="secure-password-here"

# Deploy stack
./scripts/deploy-monitoring.sh

# Access Grafana
# http://localhost:3000
# Username: admin
# Password: $GRAFANA_ADMIN_PASSWORD
```

## Validation

```bash
# Run comprehensive validation
./scripts/validate-10-out-of-10.sh

# Expected output: "🎉 Wasel is 10/10 production-ready!"
```

## Service Endpoints

### Backend Services

| Service | Port | Endpoints |
|---------|------|-----------|
| Ride Matching | 8081 | /health, /ready, /metrics |
| Payment Reconciliation | 8082 | /health, /ready, /metrics |
| Ops Analytics | 8083 | /health, /ready, /metrics |

### Monitoring Stack

| Component | Port | URL |
|-----------|------|-----|
| Grafana | 3000 | http://localhost:3000 |
| Prometheus | 9090 | http://localhost:9090 |
| Loki | 3100 | http://localhost:3100 |
| OTel Collector | 4318 | http://localhost:4318 |

## Health Checks

```bash
# Backend services
curl http://ride-matching-service:8081/health
curl http://payment-reconciliation-service:8082/health
curl http://ops-analytics-worker:8083/health

# Monitoring
curl http://prometheus:9090/-/healthy
curl http://grafana:3000/api/health
curl http://loki:3100/ready
```

## Common Commands

### Backend

```bash
# View logs
kubectl logs -f deployment/ride-matching -n wasel-backend

# Restart service
kubectl rollout restart deployment/ride-matching -n wasel-backend

# Scale service
kubectl scale deployment/ride-matching --replicas=5 -n wasel-backend

# Shell into pod
kubectl exec -it <pod-name> -n wasel-backend -- /bin/sh
```

### Mobile

```bash
# Run locally
npm start
npm run ios
npm run android

# Run tests
npm test
npm run detox:test:ios

# Clean build
cd ios && rm -rf build Pods && pod install && cd ..
cd android && ./gradlew clean && cd ..
```

### Monitoring

```bash
# Port forward Grafana
kubectl port-forward -n wasel-observability svc/grafana 3000:3000

# View Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query metrics
curl 'http://localhost:9090/api/v1/query?query=up'

# Import dashboard
curl -X POST http://localhost:3000/api/dashboards/db \
  -u admin:$GRAFANA_ADMIN_PASSWORD \
  -H "Content-Type: application/json" \
  -d @infra/observability/grafana-dashboard-wasel-overview.json
```

## Troubleshooting

### Backend Services Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n wasel-backend

# Check logs
kubectl logs <pod-name> -n wasel-backend

# Check secrets
kubectl get secret wasel-backend-secrets -n wasel-backend -o yaml

# Verify database connection
kubectl exec -it <pod-name> -n wasel-backend -- \
  node -e "const postgres=require('postgres'); \
  const sql=postgres(process.env.DATABASE_URL); \
  sql\`SELECT NOW()\`.then(console.log).catch(console.error);"
```

### Mobile Build Failing

```bash
# iOS
cd ios
rm -rf build Pods Podfile.lock
pod deintegrate
pod install
cd ..

# Android
cd android
./gradlew clean
./gradlew cleanBuildCache
rm -rf .gradle build
cd ..
```

### Monitoring Not Collecting Metrics

```bash
# Check Prometheus targets
kubectl port-forward -n wasel-observability svc/prometheus 9090:9090
# Visit http://localhost:9090/targets

# Check OTel Collector logs
kubectl logs -f deployment/otel-collector -n wasel-observability

# Verify service annotations
kubectl get pods -n wasel-backend -o yaml | grep prometheus.io
```

## Performance Metrics

### Backend Services

- Ride matching latency: < 3s (target: < 2s)
- Payment capture time: < 5s (target: < 3s)
- Analytics processing: < 1s (target: < 500ms)

### Mobile Apps

- App launch time: < 2s
- Screen transition: < 300ms
- API response: < 500ms

### Monitoring

- Metrics scrape interval: 15s
- Log retention: 30 days
- Dashboard refresh: 5s

## Key Files

### Backend
- `backend/services/ride-matching/service-production.ts`
- `backend/services/payment-reconciliation/service-production.ts`
- `backend/services/ops-analytics/service-production.ts`
- `backend/services/shared/database.ts`

### Mobile
- `mobile/src/screens/` - All 18 screens
- `mobile/src/services/` - Auth, location, rides
- `mobile/app.json` - Configuration

### Infrastructure
- `infra/kubernetes/workers/*.yaml` - Service deployments
- `infra/kubernetes/observability-stack.yaml` - Monitoring
- `infra/observability/*.yaml` - Configs

### Scripts
- `scripts/deploy-backend-services.sh` - Deploy backend
- `scripts/deploy-monitoring.sh` - Deploy monitoring
- `scripts/validate-10-out-of-10.sh` - Validation

## Next Steps After 10/10

1. Load testing (k6)
2. Security audit (penetration testing)
3. Multi-region deployment
4. Advanced features (ML, AR)
5. Performance optimization

## Support

- Documentation: `UPGRADE_TO_10_IMPLEMENTATION.md`
- Architecture: `docs/architecture.md`
- Issues: GitHub Issues
- Slack: #wasel-engineering

---

**Version**: 10.0.0  
**Last Updated**: 2024-01-20  
**Status**: Production Ready ✅
