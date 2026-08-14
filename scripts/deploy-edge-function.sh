#!/usr/bin/env bash

# Deploy the production edge function without ever placing credentials in source.
# All credentials must be injected by the CI secret store or the caller's shell.

set -euo pipefail

PROJECT_REF="zexlxabdcsjefptmjhuq"
FUNCTION_NAME="make-server-0b1f4071"
APP_BASE_URL="https://wasel14.online"

readonly REQUIRED_SECRETS=(
  SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY
  TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN
  TWILIO_API_KEY_SID
  TWILIO_API_KEY_SECRET
  TWILIO_SMS_FROM
  COMMUNICATION_WORKER_SECRET
  COMMUNICATION_WEBHOOK_TOKEN
  WASEL_INTERNAL_HEALTH_TOKEN
)

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    printf 'Required command is not available: %s\n' "$1" >&2
    exit 1
  }
}

require_secret() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    printf 'Required secret is not set: %s\n' "$name" >&2
    exit 1
  fi
}

for command in supabase curl; do
  require_command "$command"
done

for secret_name in "${REQUIRED_SECRETS[@]}"; do
  require_secret "$secret_name"
done

if ! supabase projects list >/dev/null 2>&1; then
  printf 'Supabase CLI is not authenticated. Run supabase login or provide SUPABASE_ACCESS_TOKEN.\n' >&2
  exit 1
fi

supabase link --project-ref "$PROJECT_REF"

# The function performs route-level authorization itself. Keep this explicit so
# unauthenticated health and browser preflight requests remain available.
supabase functions deploy "$FUNCTION_NAME" --no-verify-jwt

supabase secrets set \
  "SUPABASE_URL=https://${PROJECT_REF}.supabase.co" \
  "SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}" \
  "SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}" \
  "APP_BASE_URL=${APP_BASE_URL}" \
  "STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}" \
  "STRIPE_API_VERSION=${STRIPE_API_VERSION:-2024-11-20.acacia}" \
  "TWILIO_ACCOUNT_SID=${TWILIO_ACCOUNT_SID}" \
  "TWILIO_AUTH_TOKEN=${TWILIO_AUTH_TOKEN}" \
  "TWILIO_API_KEY_SID=${TWILIO_API_KEY_SID}" \
  "TWILIO_API_KEY_SECRET=${TWILIO_API_KEY_SECRET}" \
  "TWILIO_SMS_FROM=${TWILIO_SMS_FROM}" \
  "COMMUNICATION_WORKER_SECRET=${COMMUNICATION_WORKER_SECRET}" \
  "COMMUNICATION_WEBHOOK_TOKEN=${COMMUNICATION_WEBHOOK_TOKEN}" \
  "WASEL_INTERNAL_HEALTH_TOKEN=${WASEL_INTERNAL_HEALTH_TOKEN}" \
  "COMMUNICATION_MAX_ATTEMPTS=${COMMUNICATION_MAX_ATTEMPTS:-5}" \
  "COMMUNICATION_PROCESS_INLINE=false" \
  "ENABLE_RUNTIME_ADMIN_ENDPOINTS=false" \
  "ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-${APP_BASE_URL}}"

if [[ -n "${SUPABASE_AUTH_GOOGLE_CLIENT_ID:-}" ]]; then
  supabase secrets set "SUPABASE_AUTH_GOOGLE_CLIENT_ID=${SUPABASE_AUTH_GOOGLE_CLIENT_ID}"
fi

health_url="https://${PROJECT_REF}.supabase.co/functions/v1/${FUNCTION_NAME}/health"
http_code="$(curl --fail --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 15 "$health_url" || true)"
if [[ "$http_code" != "200" ]]; then
  printf 'Edge function health check failed (HTTP %s).\n' "$http_code" >&2
  exit 1
fi

printf 'Edge function deployment completed and passed its health check.\n'
