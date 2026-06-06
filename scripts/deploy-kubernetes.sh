#!/bin/bash
set -e

# Wasel Production Kubernetes Deployment Script
# Deploys all microservices to production cluster.

echo "Wasel Production Kubernetes Deployment"
echo "==========================================="

CLUSTER_NAME=${WASEL_CLUSTER_NAME:-wasel-production}
NAMESPACE=${WASEL_NAMESPACE:-wasel-production}
REGISTRY=${WASEL_REGISTRY:-wasel.azurecr.io}

resolve_command() {
    local name=$1
    local exe_name=${2:-$1}

    if command -v "$name" &> /dev/null; then
        command -v "$name"
    elif command -v "$exe_name" &> /dev/null; then
        command -v "$exe_name"
    fi
}

install_kubectl_if_possible() {
    if command -v winget.exe &> /dev/null; then
        winget.exe install --id Kubernetes.kubectl --source winget --accept-package-agreements --accept-source-agreements
    elif command -v choco.exe &> /dev/null; then
        choco.exe install kubernetes-cli -y
    elif command -v choco &> /dev/null; then
        choco install kubernetes-cli -y
    elif command -v scoop &> /dev/null; then
        scoop install kubectl
    else
        return 1
    fi
}

echo "Validating deployment environment..."

KUBECTL_BIN=${KUBECTL_BIN:-$(resolve_command kubectl kubectl.exe)}

if [[ -z "$KUBECTL_BIN" ]]; then
    echo "kubectl not found. Installing..."
    if install_kubectl_if_possible; then
        KUBECTL_BIN=$(resolve_command kubectl kubectl.exe)
    fi
fi

if [[ -z "$KUBECTL_BIN" ]]; then
    echo "kubectl is required. Install it, then rerun npm run k8s:deploy."
    echo "Windows options:"
    echo "  choco install kubernetes-cli -y"
    echo "  winget install --id Kubernetes.kubectl --source winget"
    echo "  scoop install kubectl"
    exit 1
fi

DOCKER_BIN=${DOCKER_BIN:-$(resolve_command docker docker.exe)}

if [[ -z "$DOCKER_BIN" ]]; then
    echo "docker not found. Install Docker Desktop and ensure docker is available in this shell PATH."
    exit 1
fi

echo "Connecting to cluster: $CLUSTER_NAME..."
"$KUBECTL_BIN" config use-context "$CLUSTER_NAME"

echo "Creating namespace: $NAMESPACE..."
"$KUBECTL_BIN" create namespace "$NAMESPACE" --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -

echo "Creating secrets..."
"$KUBECTL_BIN" create secret generic wasel-secrets \
    --namespace="$NAMESPACE" \
    --from-literal=redis.password="$REDIS_PASSWORD" \
    --from-literal=database.url="$DATABASE_URL" \
    --from-literal=sentry.dsn="$SENTRY_DSN" \
    --from-literal=stripe.secret.key="$STRIPE_SECRET_KEY" \
    --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -

echo "Creating config map..."
"$KUBECTL_BIN" create configmap wasel-config \
    --namespace="$NAMESPACE" \
    --from-literal=redis.host="$REDIS_HOST" \
    --from-literal=redis.port="$REDIS_PORT" \
    --from-literal=environment=production \
    --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -

echo "Building and pushing Docker images..."

SERVICES=("ride-matching" "payment-reconciliation" "ops-analytics")

for service in "${SERVICES[@]}"; do
    echo "Building $service..."
    "$DOCKER_BIN" build -t "$REGISTRY/${service}-service:latest" -f "backend/services/${service}/Dockerfile" .
    "$DOCKER_BIN" push "$REGISTRY/${service}-service:latest"
done

echo "Deploying Redis Streams cluster..."
"$KUBECTL_BIN" apply -f infra/kubernetes/base/redis-cluster.yaml -n "$NAMESPACE"

echo "Waiting for Redis cluster..."
"$KUBECTL_BIN" wait --for=condition=ready pod -l app=redis -n "$NAMESPACE" --timeout=300s

echo "Deploying PostgreSQL + PostGIS..."
"$KUBECTL_BIN" apply -f infra/kubernetes/base/postgres.yaml -n "$NAMESPACE"

echo "Waiting for PostgreSQL..."
"$KUBECTL_BIN" wait --for=condition=ready pod -l app=postgres -n "$NAMESPACE" --timeout=300s

echo "Deploying microservices..."

"$KUBECTL_BIN" apply -f infra/kubernetes/workers/ride-matching-service.yaml -n "$NAMESPACE"
"$KUBECTL_BIN" apply -f infra/kubernetes/workers/payment-and-ops-services.yaml -n "$NAMESPACE"

echo "Waiting for deployments to be ready..."
"$KUBECTL_BIN" rollout status deployment/ride-matching-service -n "$NAMESPACE"
"$KUBECTL_BIN" rollout status deployment/payment-reconciliation-service -n "$NAMESPACE"
"$KUBECTL_BIN" rollout status deployment/ops-analytics-service -n "$NAMESPACE"

echo "Deploying observability stack..."
"$KUBECTL_BIN" apply -f infra/observability/prometheus.yaml -n "$NAMESPACE"
"$KUBECTL_BIN" apply -f infra/observability/grafana.yaml -n "$NAMESPACE"

echo "Verifying deployment..."
"$KUBECTL_BIN" get all -n "$NAMESPACE"

echo ""
echo "Deployment complete."
echo ""
echo "Services deployed:"
echo "  - Redis Streams cluster (3 replicas)"
echo "  - PostgreSQL + PostGIS (3 replicas)"
echo "  - Ride Matching Service (HPA: 3-20)"
echo "  - Payment Reconciliation Service (HPA: 2-10)"
echo "  - Ops Analytics Service (HPA: 2-8)"
echo "  - Prometheus + Grafana"
echo ""
echo "Next steps:"
echo "  - Configure Ingress: kubectl apply -f infra/kubernetes/base/ingress.yaml"
echo "  - Check logs: kubectl logs -f deployment/ride-matching-service -n $NAMESPACE"
echo "  - Monitor HPA: kubectl get hpa -n $NAMESPACE -w"
echo "  - Access Grafana: kubectl port-forward svc/grafana 3000:3000 -n $NAMESPACE"
