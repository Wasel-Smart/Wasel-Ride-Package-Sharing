#!/bin/bash
set -e

echo "🚀 Deploying Wasel Backend Services to Kubernetes"
echo "=================================================="

# Configuration
NAMESPACE="wasel-backend"
DOCKER_REGISTRY="ghcr.io/wasel-smart"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Create namespace if it doesn't exist
log_info "Creating namespace: $NAMESPACE"
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Step 2: Build and push Docker images
log_info "Building backend service images..."

cd backend/services

# Ride Matching Service
log_info "Building ride-matching-service..."
docker build -f ride-matching/Dockerfile.production -t $DOCKER_REGISTRY/ride-matching-service:latest .
docker push $DOCKER_REGISTRY/ride-matching-service:latest

# Payment Reconciliation Service
log_info "Building payment-reconciliation-service..."
docker build -f payment-reconciliation/Dockerfile.production -t $DOCKER_REGISTRY/payment-reconciliation-service:latest .
docker push $DOCKER_REGISTRY/payment-reconciliation-service:latest

# Ops Analytics Worker
log_info "Building ops-analytics-worker..."
docker build -f ops-analytics/Dockerfile.production -t $DOCKER_REGISTRY/ops-analytics-worker:latest .
docker push $DOCKER_REGISTRY/ops-analytics-worker:latest

cd ../..

# Step 3: Create secrets
log_info "Creating backend secrets..."

if ! kubectl get secret wasel-backend-secrets -n $NAMESPACE &> /dev/null; then
    kubectl create secret generic wasel-backend-secrets \
        --from-literal=database-url="${DATABASE_URL}" \
        --from-literal=redis-url="${REDIS_URL}" \
        --from-literal=stripe-secret-key="${STRIPE_SECRET_KEY}" \
        -n $NAMESPACE
    log_info "Secrets created"
else
    log_warn "Secrets already exist, skipping creation"
fi

# Step 4: Deploy services
log_info "Deploying backend services..."

kubectl apply -f infra/kubernetes/workers/ride-matching.yaml
kubectl apply -f infra/kubernetes/workers/payment-reconciliation.yaml
kubectl apply -f infra/kubernetes/workers/ops-analytics.yaml

# Step 5: Wait for rollout
log_info "Waiting for deployments to be ready..."

kubectl rollout status deployment/ride-matching -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/payment-reconciliation -n $NAMESPACE --timeout=300s
kubectl rollout status deployment/ops-analytics -n $NAMESPACE --timeout=300s

# Step 6: Verify health
log_info "Verifying service health..."

SERVICES=("ride-matching-service:8081" "payment-reconciliation-service:8082" "ops-analytics-worker:8083")

for SERVICE in "${SERVICES[@]}"; do
    SERVICE_NAME=$(echo $SERVICE | cut -d: -f1)
    PORT=$(echo $SERVICE | cut -d: -f2)
    
    log_info "Checking $SERVICE_NAME health..."
    
    POD=$(kubectl get pods -n $NAMESPACE -l app=${SERVICE_NAME%-service} -o jsonpath='{.items[0].metadata.name}')
    
    if [ -z "$POD" ]; then
        log_error "No pods found for $SERVICE_NAME"
        continue
    fi
    
    HEALTH=$(kubectl exec -n $NAMESPACE $POD -- curl -s http://localhost:$PORT/health)
    
    if echo "$HEALTH" | grep -q '"status":"healthy"'; then
        log_info "✓ $SERVICE_NAME is healthy"
    else
        log_error "✗ $SERVICE_NAME health check failed"
        echo "$HEALTH"
    fi
done

# Step 7: Display service endpoints
log_info "Service endpoints:"
kubectl get services -n $NAMESPACE

# Step 8: Display pod status
log_info "Pod status:"
kubectl get pods -n $NAMESPACE

echo ""
log_info "✅ Backend services deployment complete!"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/ride-matching -n $NAMESPACE"
echo "  kubectl logs -f deployment/payment-reconciliation -n $NAMESPACE"
echo "  kubectl logs -f deployment/ops-analytics -n $NAMESPACE"
echo ""
echo "To check metrics:"
echo "  kubectl port-forward -n $NAMESPACE svc/ride-matching-service 9090:9090"
echo "  curl http://localhost:9090/metrics"
