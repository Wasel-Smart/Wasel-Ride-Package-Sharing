#!/bin/bash
set -euo pipefail

echo "====================================================================================="
echo "===========================...DEPLOYING NOTIFICATION WORKER...======================="
echo "====================================================================================="

REGISTRY="${REGISTRY:-wasel.azurecr.io}"
VERSION="${VERSION:-latest}"
NAMESPACE="${NAMESPACE:-wasel-production}"
IMAGE="${REGISTRY}/notification-worker:${VERSION}"

echo "Building notification worker..."
docker build -t "${IMAGE}" -t "${REGISTRY}/notification-worker:latest" -f Dockerfile .

echo "Pushing notification worker image..."
docker push "${IMAGE}"
docker push "${REGISTRY}/notification-worker:latest"

echo "Updating Kubernetes manifests..."
sed -i "s|wasel.azurecr.io/notification-worker:latest|${IMAGE}|g" notification-worker.yaml

echo "Deploying to Kubernetes..."
kubectl apply -f notification-worker.yaml -n "${NAMESPACE}"

echo "Verifying deployment..."
kubectl rollout status deployment/notification-worker -n "${NAMESPACE}" --timeout=300s
kubectl get pods -n "${NAMESPACE}" -l app=notification-worker

echo "Running health check..."
sleep 5
kubectl port-forward svc/notification-worker-service 3000:80 -n "${NAMESPACE}" &
PF_PID=$!
sleep 3
curl -s http://localhost:3000/health || echo "Health check failed - check pod logs"
kill $PF_PID 2>/dev/null || true

echo "====================================================================================="
echo "=============================...DEPLOY COMPLETE...=================================="
echo "====================================================================================="
