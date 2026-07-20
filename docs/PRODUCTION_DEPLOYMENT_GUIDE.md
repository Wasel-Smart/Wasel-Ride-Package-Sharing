# 🚀 WASEL 10/10 PRODUCTION DEPLOYMENT GUIDE

Complete step-by-step guide for deploying Wasel's distributed microservices architecture to production.

---

## Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster**: v1.27+ with at least 6 nodes
- **Redis Cluster**: 3-node Redis 7.x cluster (managed or self-hosted)
- **PostgreSQL + PostGIS**: 15.x with PostGIS extension
- **Container Registry**: Azure Container Registry, Docker Hub, or similar
- **DNS**: Custom domain configured
- **TLS Certificates**: SSL certificates for HTTPS

### Required Accounts

- Supabase Project (production tier)
- Stripe Account (live keys)
- Sentry Account (error tracking)
- Vercel Account (web deployment)
- Apple Developer Account (iOS)
- Google Play Console (Android)

### Local Tools

```bash
# Required
kubectl v1.27+
docker v24.0+
node v20.0+
npm v10.0+

# Optional but recommended
helm v3.12+
k9s (Kubernetes CLI UI)
```

---

## Phase 1: Infrastructure Setup

### 1.1 Kubernetes Cluster

```bash
# Create namespace
kubectl create namespace wasel-production

# Create service account
kubectl create serviceaccount wasel-worker -n wasel-production

# Apply RBAC
kubectl apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: wasel-worker-role
  namespace: wasel-production
rules:
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: wasel-worker-binding
  namespace: wasel-production
subjects:
  - kind: ServiceAccount
    name: wasel-worker
    namespace: wasel-production
roleRef:
  kind: Role
  name: wasel-worker-role
  apiGroup: rbac.authorization.k8s.io
EOF
```

### 1.2 Redis Streams Cluster

```bash
# Option A: Managed (Azure Cache for Redis)
# Create via Azure Portal or CLI
az redis create \
  --name wasel-redis \
  --resource-group wasel-prod \
  --location eastus \
  --sku Premium \
  --vm-size P1 \
  --enable-non-ssl-port false

# Option B: Self-hosted on Kubernetes
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install redis bitnami/redis \
  --namespace wasel-production \
  --set auth.enabled=true \
  --set auth.password=<strong-password> \
  --set replica.replicaCount=2 \
  --set master.persistence.size=10Gi
```

### 1.3 PostgreSQL + PostGIS

```bash
# Verify Supabase production project
# Or use managed PostgreSQL

# Create PostGIS extension (if not using Supabase)
psql -h <db-host> -U postgres -d wasel_production -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### 1.4 Secrets Management

```bash
# Create Kubernetes secrets
kubectl create secret generic wasel-secrets \
  --from-literal=redis.password=<redis-password> \
  --from-literal=database.url=postgresql://user:pass@host:5432/wasel \
  --from-literal=stripe.secret.key=sk_live_xxx \
  --from-literal=sentry.dsn=https://xxx@sentry.io/xxx \
  --from-literal=supabase.service.role.key=<service-role-key> \
  -n wasel-production

# Create ConfigMap
kubectl create configmap wasel-config \
  --from-literal=redis.host=redis-master.wasel-production.svc.cluster.local \
  --from-literal=redis.port=6379 \
  --from-literal=api.url=https://api.wasel.jo \
  -n wasel-production
```

---

## Phase 2: Build and Push Container Images

### 2.1 Build Backend Services

```bash
# Navigate to project root
cd /path/to/Wdoubleme

# Set registry URL
export REGISTRY=wasel.azurecr.io
export VERSION=1.0.0

# Login to registry
docker login $REGISTRY

# Build Ride Matching Service
docker build \
  -t $REGISTRY/ride-matching-service:$VERSION \
  -t $REGISTRY/ride-matching-service:latest \
  -f backend/services/ride-matching/Dockerfile \
  .

# Build Payment Reconciliation Service
docker build \
  -t $REGISTRY/payment-reconciliation-service:$VERSION \
  -t $REGISTRY/payment-reconciliation-service:latest \
  -f backend/services/payment-reconciliation/Dockerfile \
  .

# Build Ops Analytics Worker
docker build \
  -t $REGISTRY/ops-analytics-worker:$VERSION \
  -t $REGISTRY/ops-analytics-worker:latest \
  -f backend/services/ops-analytics/Dockerfile \
  .

# Push all images
docker push $REGISTRY/ride-matching-service:$VERSION
docker push $REGISTRY/ride-matching-service:latest
docker push $REGISTRY/payment-reconciliation-service:$VERSION
docker push $REGISTRY/payment-reconciliation-service:latest
docker push $REGISTRY/ops-analytics-worker:$VERSION
docker push $REGISTRY/ops-analytics-worker:latest
```

### 2.2 Update Kubernetes Manifests

```bash
# Update image references in manifests
sed -i "s|wasel.azurecr.io/ride-matching-service:latest|$REGISTRY/ride-matching-service:$VERSION|g" \
  infra/kubernetes/workers/ride-matching-service.yaml

sed -i "s|wasel.azurecr.io/payment-reconciliation-service:latest|$REGISTRY/payment-reconciliation-service:$VERSION|g" \
  infra/kubernetes/workers/payment-and-ops-services.yaml

sed -i "s|wasel.azurecr.io/ops-analytics-worker:latest|$REGISTRY/ops-analytics-worker:$VERSION|g" \
  infra/kubernetes/workers/payment-and-ops-services.yaml
```

---

## Phase 3: Deploy Backend Services

### 3.1 Deploy Ride Matching Service

```bash
kubectl apply -f infra/kubernetes/workers/ride-matching-service.yaml -n wasel-production

# Verify deployment
kubectl get pods -n wasel-production -l app=ride-matching-service
kubectl get hpa -n wasel-production ride-matching-service-hpa

# Check logs
kubectl logs -f deployment/ride-matching-service -n wasel-production

# Wait for ready state
kubectl wait --for=condition=available --timeout=300s \
  deployment/ride-matching-service -n wasel-production
```

### 3.2 Deploy Payment and Ops Services

```bash
kubectl apply -f infra/kubernetes/workers/payment-and-ops-services.yaml -n wasel-production

# Verify deployments
kubectl get pods -n wasel-production -l component=worker
kubectl get hpa -n wasel-production

# Check logs
kubectl logs -f deployment/payment-reconciliation-service -n wasel-production
kubectl logs -f deployment/ops-analytics-worker -n wasel-production
```

### 3.3 Verify Service Health

```bash
# Port-forward to check health endpoints
kubectl port-forward deployment/ride-matching-service 8080:8080 -n wasel-production

# In another terminal
curl http://localhost:8080/health
# Expected: {"status":"healthy","service":"ride-matching-service"}

curl http://localhost:8080/ready
# Expected: {"status":"ready"}
```

---

## Phase 4: Deploy Web Application

### 4.1 Configure Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
vercel link

# Set environment variables
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_REDIS_HOST production
vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
```

### 4.2 Deploy Web Client

```bash
# Build and deploy
npm run build
vercel --prod

# Or via GitHub integration (automatic)
git tag v1.0.0
git push origin v1.0.0
# CI/CD pipeline will deploy automatically
```

### 4.3 Verify Web Deployment

```bash
# Check deployment
curl https://wasel.jo/health

# Test critical paths
curl https://wasel.jo/api/v1/health
curl https://wasel.jo/ops/observability
```

---

## Phase 5: Deploy Mobile Applications

### 5.1 iOS Deployment

```bash
cd mobile

# Install dependencies
npm install
cd ios && pod install && cd ..

# Update version
npm version 1.0.0

# Build for production
npm run build:ios

# Or manually
cd ios
xcodebuild -workspace Wasel.xcworkspace \
  -scheme Wasel \
  -configuration Release \
  -archivePath ./build/Wasel.xcarchive \
  archive

# Upload to App Store Connect
xcodebuild -exportArchive \
  -archivePath ./build/Wasel.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist
```

**App Store Connect Steps**:
1. Upload IPA via Transporter or Xcode
2. Fill app metadata (screenshots, description, keywords)
3. Submit for review
4. Monitor review status

### 5.2 Android Deployment

```bash
cd mobile

# Build release AAB
cd android
./gradlew bundleRelease

# Sign AAB (if not using Play App Signing)
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore my-release-key.keystore \
  app/build/outputs/bundle/release/app-release.aab \
  my-key-alias

# Verify signature
jarsigner -verify -verbose -certs \
  app/build/outputs/bundle/release/app-release.aab
```

**Google Play Console Steps**:
1. Create new release in Production track
2. Upload AAB
3. Fill release notes
4. Review and rollout

---

## Phase 6: Monitoring and Observability

### 6.1 Deploy Prometheus

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace wasel-production \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

### 6.2 Deploy Grafana Dashboards

```bash
# Import dashboards
kubectl create configmap wasel-dashboards \
  --from-file=infra/observability/grafana-dashboard-wasel-overview.json \
  -n wasel-production

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n wasel-production
# Open http://localhost:3000 (admin/prom-operator)
```

### 6.3 Configure Sentry

```bash
# Sentry is configured via environment variables
# Already set in Kubernetes secrets

# Verify Sentry integration
curl -X POST https://wasel.jo/api/test-error
# Check Sentry dashboard for error
```

---

## Phase 7: Production Validation

### 7.1 Smoke Tests

```bash
# Run smoke tests
npm run test:load:smoke

# Expected results:
# - All requests succeed
# - p95 latency < SLO targets
# - No errors
```

### 7.2 Full Load Test

```bash
# Run production load test
npm run test:load:production

# Monitor during load test:
# - Kubernetes HPA scaling
# - Redis Streams consumer lag
# - Database query performance
# - Service health endpoints
```

### 7.3 Verify SLO Compliance

```bash
# Check observability dashboard
open https://wasel.jo/ops/observability

# Verify metrics:
# - API Gateway p95 < 250ms ✅
# - Ride Matching p95 < 700ms ✅
# - Payment p95 < 350ms ✅
# - Error rate < 1% ✅
```

---

## Phase 8: Post-Deployment

### 8.1 Enable Monitoring Alerts

```bash
# Configure Prometheus alerts
kubectl apply -f - <<EOF
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: wasel-alerts
  namespace: wasel-production
spec:
  groups:
    - name: wasel
      interval: 30s
      rules:
        - alert: HighErrorRate
          expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.01
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate detected"
        - alert: HighConsumerLag
          expr: redis_stream_lag_seconds > 60
          for: 2m
          labels:
            severity: warning
          annotations:
            summary: "Redis consumer lag > 60s"
EOF
```

### 8.2 Configure Alertmanager

```bash
# Set up Slack/PagerDuty integration
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-config
  namespace: wasel-production
stringData:
  alertmanager.yml: |
    route:
      receiver: 'slack'
      group_by: ['alertname', 'cluster']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
    receivers:
      - name: 'slack'
        slack_configs:
          - api_url: 'YOUR_SLACK_WEBHOOK_URL'
            channel: '#wasel-alerts'
            title: 'Wasel Production Alert'
EOF
```

### 8.3 Document Runbook

Update [PRODUCTION_RUNBOOK.md](./docs/PRODUCTION_RUNBOOK.md) with:
- Deployment procedures
- Rollback steps
- Common issues and resolutions
- On-call escalation paths

---

## Rollback Procedures

### Rollback Backend Service

```bash
# Get previous revision
kubectl rollout history deployment/ride-matching-service -n wasel-production

# Rollback to previous version
kubectl rollout undo deployment/ride-matching-service -n wasel-production

# Or rollback to specific revision
kubectl rollout undo deployment/ride-matching-service --to-revision=2 -n wasel-production

# Verify rollback
kubectl rollout status deployment/ride-matching-service -n wasel-production
```

### Rollback Web Application

```bash
# Via Vercel
vercel rollback https://wasel.jo

# Or redeploy previous version
git checkout v0.9.0
vercel --prod
```

### Rollback Database Migration

```bash
# Connect to database
psql $DATABASE_URL

# Run rollback script
\i supabase/migrations/ROLLBACK_STRATEGY.md
```

---

## Troubleshooting

### Service Won't Start

```bash
# Check pod status
kubectl describe pod <pod-name> -n wasel-production

# Check logs
kubectl logs <pod-name> -n wasel-production

# Common issues:
# 1. Missing secrets/configmaps
# 2. Image pull errors
# 3. Resource limits too low
```

### High Consumer Lag

```bash
# Scale up workers manually
kubectl scale deployment ride-matching-service --replicas=10 -n wasel-production

# Check Redis connection
kubectl exec -it <pod-name> -n wasel-production -- redis-cli -h $REDIS_HOST ping
```

### Mobile App Crashes

```bash
# Check Sentry for crash reports
# Review logs in App Store Connect / Play Console
# Deploy hotfix via OTA update (if configured)
```

---

## Success Checklist

- [ ] All Kubernetes pods running and healthy
- [ ] HPA scaling verified under load
- [ ] Redis Streams cluster operational
- [ ] Web application accessible via HTTPS
- [ ] Mobile apps submitted to stores
- [ ] Monitoring dashboards configured
- [ ] Alerts firing correctly
- [ ] SLO compliance validated
- [ ] Load tests passed
- [ ] Runbook documented
- [ ] Team trained on operations

---

## Production Launch 🚀

**Congratulations! Wasel is now live in production.**

Monitor for 24-48 hours and ensure:
- No critical errors in Sentry
- SLO compliance maintained
- User feedback is positive
- No performance degradation

---

**Questions or Issues?**
- Slack: #wasel-production
- Email: ops@wasel.jo
- Runbook: [docs/PRODUCTION_RUNBOOK.md](./docs/PRODUCTION_RUNBOOK.md)
