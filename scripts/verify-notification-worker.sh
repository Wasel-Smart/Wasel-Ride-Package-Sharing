#!/bin/bash
set -euo pipefail

echo "====================================================================================="
echo "===========================...VERIFYING NOTIFICATION WORKER...======================="
echo "====================================================================================="

NAMESPACE="${NAMESPACE:-wasel-production}"

echo "Checking deployment..."
kubectl get deployment notification-worker -n "${NAMESPACE}"

echo "Checking pods..."
kubectl get pods -n "${NAMESPACE}" -l app=notification-worker

echo "Checking service..."
kubectl get service notification-worker-service -n "${NAMESPACE}"

echo "Checking HPA..."
kubectl get hpa notification-worker-hpa -n "${NAMESPACE}" 2>/dev/null || echo "HPA not found (optional)"

echo "Checking recent events..."
kubectl get events -n "${NAMESPACE}" --field-selector involved-object.name=notification-worker --sort-by='.lastTimestamp' | tail -10

echo "Checking pod logs..."
POD=$(kubectl get pods -n "${NAMESPACE}" -l app=notification-worker -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")
if [ -n "$POD" ]; then
    echo "Logs for pod: $POD"
    kubectl logs "$POD" -n "${NAMESPACE}" --tail=50
else
    echo "No pods found"
fi

echo "====================================================================================="
echo "=============================...VERIFICATION COMPLETE...============================="
echo "====================================================================================="
