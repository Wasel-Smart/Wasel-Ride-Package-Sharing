#!/bin/bash
set -e

# Wasel Production Kubernetes Deployment Script
# Deploys all microservices to production cluster

echo "☸️  Wasel Production Kubernetes Deployment"
echo "==========================================="

CLUSTER_NAME=${WASEL_CLUSTER_NAME:-wasel-production}
NAMESPACE=${WASEL_NAMESPACE:-wasel-production}
REGISTRY=${WASEL_REGISTRY:-wasel.azurecr.io}

# Validate environment
echo "🔍 Validating deployment environment..."

if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl not found. Install kubectl first."
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ docker not found. Install Docker first."
    exit 1
fi

# Connect to cluster
echo "🔗 Connecting to cluster: $CLUSTER_NAME..."
kubectl config use-context $CLUSTER_NAME

# Create namespace
echo "📦 Creating namespace: $NAMESPACE..."
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create secrets
echo "🔐 Creating secrets..."
kubectl create secret generic wasel-secrets \
    --namespace=$NAMESPACE \
    --from-literal=redis.password=$REDIS_PASSWORD \
    --from-literal=database.url=$DATABASE_URL \
    --from-literal=sentry.dsn=$SENTRY_DSN \
    --from-literal=stripe.secret.key=$STRIPE_SECRET_KEY \
    --dry-run=client -o yaml | kubectl apply -f -

# Create config map
echo "⚙️  Creating config map..."
kubectl create configmap wasel-config \
    --namespace=$NAMESPACE \
    --from-literal=redis.host=$REDIS_HOST \
    --from-literal=redis.port=$REDIS_PORT \
    --from-literal=environment=production \
    --dry-run=client -o yaml | kubectl apply -f -

# Build and push Docker images
echo "🐳 Building and pushing Docker images..."

SERVICES=("ride-matching" "payment-reconciliation" "ops-analytics")

for service in "${SERVICES[@]}"; do
    echo "📦 Building $service..."
    docker build -t $REGISTRY/${service}-service:latest -f backend/services/${service}/Dockerfile .
    docker push $REGISTRY/${service}-service:latest
done

# Deploy Redis cluster
echo "🔴 Deploying Redis Streams cluster..."
kubectl apply -f infra/kubernetes/base/redis-cluster.yaml -n $NAMESPACE

# Wait for Redis
echo "⏳ Waiting for Redis cluster..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s

# Deploy PostgreSQL
echo "🐘 Deploying PostgreSQL + PostGIS..."
kubectl apply -f infra/kubernetes/base/postgres.yaml -n $NAMESPACE

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
kubectl wait --for=condition=ready pod -l app=postgres -n $NAMESPACE --timeout=300s

# Deploy microservices
echo "🚀 Deploying microservices..."

kubectl apply -f infra/kubernetes/workers/ride-matching-service.yaml -n $NAMESPACE
kubectl apply -f infra/kubernetes/workers/payment-and-ops-services.yaml -n $NAMESPACE

# Wait for deployments
echo "⏳ Waiting for deployments to be ready..."
kubectl rollout status deployment/ride-matching-service -n $NAMESPACE
kubectl rollout status deployment/payment-reconciliation-service -n $NAMESPACE
kubectl rollout status deployment/ops-analytics-service -n $NAMESPACE

# Deploy observability stack
echo "📊 Deploying observability stack..."
kubectl apply -f infra/observability/prometheus.yaml -n $NAMESPACE
kubectl apply -f infra/observability/grafana.yaml -n $NAMESPACE

# Verify deployment
echo "✅ Verifying deployment..."
kubectl get all -n $NAMESPACE

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Services deployed:"
echo "  ✓ Redis Streams cluster (3 replicas)"
echo "  ✓ PostgreSQL + PostGIS (3 replicas)"
echo "  ✓ Ride Matching Service (HPA: 3-20)"
echo "  ✓ Payment Reconciliation Service (HPA: 2-10)"
echo "  ✓ Ops Analytics Service (HPA: 2-8)"
echo "  ✓ Prometheus + Grafana"
echo ""
echo "Next steps:"
echo "  - Configure Ingress: kubectl apply -f infra/kubernetes/base/ingress.yaml"
echo "  - Check logs: kubectl logs -f deployment/ride-matching-service -n $NAMESPACE"
echo "  - Monitor HPA: kubectl get hpa -n $NAMESPACE -w"
echo "  - Access Grafana: kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE"
