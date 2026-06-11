#!/bin/bash

# Backend Services Deployment Script - Production Grade
# Deploys all microservices to Kubernetes with health checks

set -e

echo "🚀 Wasel Backend Services Deployment"
echo "======================================"

# Configuration
NAMESPACE="${NAMESPACE:-wasel-production}"
REGISTRY="${REGISTRY:-ghcr.io/wasel-smart}"
VERSION="${VERSION:-latest}"

# Services to deploy
SERVICES=(
  "ride-matching"
  "payment-reconciliation"
  "ops-analytics"
)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Create namespace if it doesn't exist
echo -e "${YELLOW}Creating namespace ${NAMESPACE}...${NC}"
kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# Deploy Redis Streams (Event Broker)
echo -e "${YELLOW}Deploying Redis Streams...${NC}"
kubectl apply -f infra/kubernetes/base/redis-streams.yaml -n ${NAMESPACE}
echo -e "${GREEN}✓ Redis Streams deployed${NC}"

# Deploy each service
for service in "${SERVICES[@]}"; do
  echo -e "${YELLOW}Deploying ${service}...${NC}"
  
  # Build Docker image
  docker build \
    -f backend/services/${service}/Dockerfile.production \
    -t ${REGISTRY}/${service}:${VERSION} \
    .
  
  # Push to registry
  docker push ${REGISTRY}/${service}:${VERSION}
  
  # Apply Kubernetes manifests
  kubectl apply -f infra/kubernetes/base/${service}.yaml -n ${NAMESPACE}
  
  # Wait for rollout
  kubectl rollout status deployment/${service} -n ${NAMESPACE} --timeout=300s
  
  echo -e "${GREEN}✓ ${service} deployed${NC}"
done

# Deploy monitoring stack
echo -e "${YELLOW}Deploying monitoring stack...${NC}"
kubectl apply -f infra/kubernetes/base/prometheus.yaml -n ${NAMESPACE}
kubectl apply -f infra/kubernetes/base/grafana.yaml -n ${NAMESPACE}
echo -e "${GREEN}✓ Monitoring deployed${NC}"

# Verify all services are healthy
echo -e "${YELLOW}Verifying service health...${NC}"
sleep 10

for service in "${SERVICES[@]}"; do
  POD=$(kubectl get pod -n ${NAMESPACE} -l app=${service} -o jsonpath="{.items[0].metadata.name}")
  
  if kubectl exec -n ${NAMESPACE} ${POD} -- curl -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ ${service} is healthy${NC}"
  else
    echo -e "${RED}✗ ${service} health check failed${NC}"
    exit 1
  fi
done

echo ""
echo -e "${GREEN}======================================"
echo "✓ All services deployed successfully!"
echo "======================================${NC}"
echo ""
echo "Service Endpoints:"
echo "  - Ride Matching: http://ride-matching.${NAMESPACE}.svc.cluster.local:8080"
echo "  - Payment Reconciliation: http://payment-reconciliation.${NAMESPACE}.svc.cluster.local:8080"
echo "  - Ops Analytics: http://ops-analytics.${NAMESPACE}.svc.cluster.local:8080"
echo "  - Prometheus: http://prometheus.${NAMESPACE}.svc.cluster.local:9090"
echo "  - Grafana: http://grafana.${NAMESPACE}.svc.cluster.local:3000"
echo ""
echo "View logs:"
echo "  kubectl logs -f -l app=ride-matching -n ${NAMESPACE}"
echo ""
