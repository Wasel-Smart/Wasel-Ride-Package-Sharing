#!/usr/bin/env bash
# deploy-edge-functions.sh
# ─────────────────────────────────────────────────────────────────────────────
# Deploys all Wasel Supabase edge functions to your project.
#
# Prerequisites:
#   - Supabase CLI installed: npm install -g supabase
#   - Logged in: supabase login
#
# Usage:
#   ./scripts/deploy-edge-functions.sh [--project-ref <ref>] [--env <env>]
#
# Examples:
#   ./scripts/deploy-edge-functions.sh --project-ref djccmatubyyudeosrngm
#   ./scripts/deploy-edge-functions.sh --project-ref djccmatubyyudeosrngm --env production
#
# If --project-ref is not passed the script reads SUPABASE_PROJECT_REF from
# the environment (or your .env / .env.production file).
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}ℹ  $*${NC}"; }
success() { echo -e "${GREEN}✓  $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠  $*${NC}"; }
error()   { echo -e "${RED}✗  $*${NC}"; exit 1; }

# ── Argument parsing ──────────────────────────────────────────────────────────
PROJECT_REF=""
ENV_NAME="production"

while [[ $# -gt 0 ]]; do
  case $1 in
    --project-ref) PROJECT_REF="$2"; shift 2 ;;
    --env)         ENV_NAME="$2";    shift 2 ;;
    *) warn "Unknown option: $1"; shift ;;
  esac
done

# ── Resolve project ref ───────────────────────────────────────────────────────
if [[ -z "$PROJECT_REF" ]]; then
  # Try to load from env file
  ENV_FILE=".env.${ENV_NAME}"
  [[ -f "$ENV_FILE" ]] && source <(grep -E '^SUPABASE_PROJECT_REF=' "$ENV_FILE" | sed 's/^/export /')
  PROJECT_REF="${SUPABASE_PROJECT_REF:-}"
fi

if [[ -z "$PROJECT_REF" ]]; then
  error "No project ref supplied. Pass --project-ref <ref> or set SUPABASE_PROJECT_REF."
fi

info "Deploying edge functions → project: ${PROJECT_REF} (env: ${ENV_NAME})"
echo ""

# ── Functions to deploy (in dependency order) ─────────────────────────────────
FUNCTIONS=(
  "make-server-0b1f4071"   # ← primary API gateway — must be first
  "health-check"
  "ride-pricing"
  "notification-trigger"
  "wasel-mailer"
  "wasel-email"
  "sms-verification"
  "payment-webhook"
  "subscription-webhook"
)

DEPLOYED=()
FAILED=()

for fn in "${FUNCTIONS[@]}"; do
  fn_dir="supabase/functions/${fn}"

  if [[ ! -d "$fn_dir" ]]; then
    warn "Skipping '${fn}' — directory not found at ${fn_dir}"
    continue
  fi

  info "Deploying: ${fn} …"
  if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>&1; then
    success "Deployed: ${fn}"
    DEPLOYED+=("$fn")
  else
    warn "Failed: ${fn} (continuing with remaining functions)"
    FAILED+=("$fn")
  fi
  echo ""
done

# ── Summary ───────────────────────────────────────────────────────────────────
echo "────────────────────────────────────────────────────"
echo ""
success "Deployed (${#DEPLOYED[@]}): ${DEPLOYED[*]:-none}"

if [[ ${#FAILED[@]} -gt 0 ]]; then
  echo ""
  warn "Failed   (${#FAILED[@]}): ${FAILED[*]}"
  echo ""
  warn "The most important function is 'make-server-0b1f4071'."
  warn "If it failed, ride search and bookings will not work in production."
  exit 1
fi

echo ""
info "All edge functions deployed successfully."
info "Next: verify with  curl -s \${VITE_SUPABASE_URL}/functions/v1/make-server-0b1f4071/health -H 'Authorization: Bearer \${VITE_SUPABASE_ANON_KEY}'"
