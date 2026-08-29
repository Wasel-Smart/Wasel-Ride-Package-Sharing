#!/bin/bash
# Wasel Kubernetes deployment script.
# Deploys the manifests that actually exist in ./k8s to the target cluster.
# This repository ships a static SPA (served by nginx) backed by Supabase;
# there is no custom microservice image built here, so we apply the committed
# manifests rather than building nonexistent backend services.

set -euo pipefail

CLUSTER_NAME=${WASEL_CLUSTER_NAME:-wasel-production}
NAMESPACE=${WASEL_NAMESPACE:-wasel}
REGISTRY=${WASEL_REGISTRY:-wasel.azurecr.io}
K8S_DIR=${WASEL_K8S_DIR:-k8s}

resolve_command() {
  command -v "$1" || command -v "$2" || echo ""
}

echo "Wasel Kubernetes Deployment"
echo "==========================="

KUBECTL_BIN=${KUBECTL_BIN:-$(resolve_command kubectl kubectl.exe)}
if [[ -z "$KUBECTL_BIN" ]]; then
  echo "ERROR: kubectl is not installed or not in PATH." >&2
  echo "Install: https://kubernetes.io/docs/tasks/tools/install-kubectl/" >&2
  exit 1
fi

if [[ ! -d "$K8S_DIR" ]]; then
  echo "ERROR: Kubernetes manifest directory '$K8S_DIR' not found." >&2
  exit 1
fi

echo "Connecting to cluster context: $CLUSTER_NAME"
"$KUBECTL_BIN" config use-context "$CLUSTER_NAME"

echo "Creating namespace: $NAMESPACE"
"$KUBECTL_BIN" create namespace "$NAMESPACE" --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -

# Create the secret only from explicitly provided environment variables.
# Keys match k8s/secret.yaml. Nothing is hardcoded; missing values stay empty
# and must be supplied via your secret manager / CI secrets.
echo "Creating secrets (from environment)..."
"$KUBECTL_BIN" create secret generic wasel-secrets \
  --namespace="$NAMESPACE" \
  --from-literal=DATABASE_URL="${DATABASE_URL:-}" \
  --from-literal=JWT_SECRET="${JWT_SECRET:-}" \
  --from-literal=REDIS_PASSWORD="${REDIS_PASSWORD:-}" \
  --from-literal=STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}" \
  --from-literal=STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}" \
  --from-literal=TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:-}" \
  --from-literal=TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:-}" \
  --from-literal=TWILIO_FROM_NUMBER="${TWILIO_FROM_NUMBER:-}" \
  --from-literal=SENDGRID_API_KEY="${SENDGRID_API_KEY:-}" \
  --from-literal=SENDGRID_FROM_EMAIL="${SENDGRID_FROM_EMAIL:-}" \
  --dry-run=client -o yaml | "$KUBECTL_BIN" apply -f -

# Apply every manifest that exists under k8s/ (namespace, configmap, secret,
# and the api-server/postgres/redis subdirs). Skip optional add-ons if absent.
echo "Applying Kubernetes manifests from $K8S_DIR..."
while IFS= read -r -d '' manifest; do
  echo "  - $manifest"
  "$KUBECTL_BIN" apply -f "$manifest" -n "$NAMESPACE"
done < <(find "$K8S_DIR" -type f \( -name '*.yaml' -o -name '*.yml' \) -print0 | sort -z)

echo ""
echo "Verifying deployment..."
"$KUBECTL_BIN" get all -n "$NAMESPACE"

echo ""
echo "Deployment complete."
echo ""
echo "Notes:"
echo "  - The SPA is served by the api-server/nginx manifest in $K8S_DIR/api-server."
echo "  - Ensure the container image referenced by $K8S_DIR/api-server/deployment.yaml"
echo "    is built and pushed to $REGISTRY before scaling the deployment."
echo "  - For Git-based deploys (Vercel), this script is not required."
