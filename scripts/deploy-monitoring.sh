#!/bin/bash
set -e

echo "📊 Deploying Wasel Monitoring Infrastructure"
echo "=============================================="

# Configuration
NAMESPACE="wasel-observability"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create secrets
log_info "Creating observability secrets..."

if [ -z "$GRAFANA_ADMIN_PASSWORD" ]; then
    log_warn "GRAFANA_ADMIN_PASSWORD not set, generating random password..."
    GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32)
    log_info "Grafana admin password: $GRAFANA_ADMIN_PASSWORD"
fi

kubectl create secret generic observability-secrets \
    --from-literal=grafana-admin-password="${GRAFANA_ADMIN_PASSWORD}" \
    --from-literal=grafana-cloud-endpoint="${GRAFANA_CLOUD_OTLP_ENDPOINT:-}" \
    --from-literal=grafana-cloud-api-key="${GRAFANA_CLOUD_API_KEY:-}" \
    -n $NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

# Step 2: Deploy monitoring stack
log_info "Deploying monitoring stack..."
kubectl apply -f infra/kubernetes/observability-stack.yaml

# Step 3: Wait for deployments
log_info "Waiting for deployments to be ready..."

kubectl wait --for=condition=available --timeout=300s \
    deployment/otel-collector \
    deployment/prometheus \
    deployment/grafana \
    deployment/loki \
    -n $NAMESPACE

# Step 4: Import Grafana dashboards
log_info "Importing Grafana dashboards..."

GRAFANA_POD=$(kubectl get pods -n $NAMESPACE -l app=grafana -o jsonpath='{.items[0].metadata.name}')

if [ -n "$GRAFANA_POD" ]; then
    log_info "Waiting for Grafana to be fully ready..."
    sleep 10
    
    log_info "Importing Wasel overview dashboard..."
    kubectl exec -n $NAMESPACE $GRAFANA_POD -- \
        curl -X POST http://localhost:3000/api/dashboards/db \
        -H "Content-Type: application/json" \
        -u "admin:${GRAFANA_ADMIN_PASSWORD}" \
        -d @/dev/stdin < infra/observability/grafana-dashboard-wasel-overview.json || \
        log_warn "Dashboard import failed (may need manual import)"
fi

# Step 5: Set up port forwards for local access
log_info "Setting up port forwards..."

# Kill existing port forwards
pkill -f "kubectl port-forward.*$NAMESPACE" || true

# Grafana
kubectl port-forward -n $NAMESPACE svc/grafana 3000:3000 > /dev/null 2>&1 &
GRAFANA_PID=$!

# Prometheus
kubectl port-forward -n $NAMESPACE svc/prometheus 9090:9090 > /dev/null 2>&1 &
PROMETHEUS_PID=$!

# Loki
kubectl port-forward -n $NAMESPACE svc/loki 3100:3100 > /dev/null 2>&1 &
LOKI_PID=$!

log_info "Port forwards established (PIDs: Grafana=$GRAFANA_PID, Prometheus=$PROMETHEUS_PID, Loki=$LOKI_PID)"

# Step 6: Verify services
log_info "Verifying monitoring services..."

sleep 5

# Check Prometheus
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
    log_info "✓ Prometheus is healthy"
else
    log_error "✗ Prometheus health check failed"
fi

# Check Grafana
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    log_info "✓ Grafana is healthy"
else
    log_error "✗ Grafana health check failed"
fi

# Check Loki
if curl -s http://localhost:3100/ready > /dev/null 2>&1; then
    log_info "✓ Loki is healthy"
else
    log_error "✗ Loki health check failed"
fi

# Step 7: Display service information
echo ""
log_info "✅ Monitoring infrastructure deployment complete!"
echo ""
echo "Access points (via port-forward):"
echo "  Grafana:    http://localhost:3000"
echo "              Username: admin"
echo "              Password: $GRAFANA_ADMIN_PASSWORD"
echo ""
echo "  Prometheus: http://localhost:9090"
echo "  Loki:       http://localhost:3100"
echo ""
echo "Kubernetes services:"
kubectl get services -n $NAMESPACE
echo ""
echo "To stop port forwards:"
echo "  kill $GRAFANA_PID $PROMETHEUS_PID $LOKI_PID"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/prometheus -n $NAMESPACE"
echo "  kubectl logs -f deployment/grafana -n $NAMESPACE"
echo "  kubectl logs -f deployment/loki -n $NAMESPACE"
echo "  kubectl logs -f deployment/otel-collector -n $NAMESPACE"
