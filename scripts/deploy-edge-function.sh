#!/bin/bash

# ============================================================
# Wasel Edge Function Deployment Script
# Deploys make-server-0b1f4071 to Supabase with all secrets
# ============================================================

set -e

echo "🚀 Wasel Edge Function Deployment"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Not logged in to Supabase"
    echo "Running: supabase login"
    supabase login
fi

echo -e "${GREEN}✓${NC} Logged in to Supabase"

PROJECT_REF=${SUPABASE_PROJECT_REF:?Set SUPABASE_PROJECT_REF before running this script}
EDGE_FUNCTION_NAME=${SUPABASE_EDGE_FUNCTION_NAME:-${VITE_EDGE_FUNCTION_NAME:-make-server-0b1f4071}}
SUPABASE_URL_VALUE=${SUPABASE_URL:-https://$PROJECT_REF.supabase.co}
APP_BASE_URL_VALUE=${APP_BASE_URL:-https://wasel14.online}
ALLOWED_ORIGINS_VALUE=${ALLOWED_ORIGINS:-$APP_BASE_URL_VALUE}

# Link to project
echo ""
echo "Linking to production project..."
supabase link --project-ref "$PROJECT_REF"

echo -e "${GREEN}✓${NC} Linked to project"

# Deploy edge functions
echo ""
echo "Deploying edge functions..."
supabase functions deploy "$EDGE_FUNCTION_NAME"
supabase functions deploy provider-webhooks --no-verify-jwt

echo -e "${GREEN}✓${NC} Edge function deployed"

# Set secrets
echo ""
echo "Setting edge function secrets..."

# Core Supabase secrets
supabase secrets set SUPABASE_URL="$SUPABASE_URL_VALUE"
supabase secrets set SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:?Set SUPABASE_ANON_KEY}"
supabase secrets set SUPABASE_PUBLISHABLE_KEY="${SUPABASE_PUBLISHABLE_KEY:?Set SUPABASE_PUBLISHABLE_KEY}"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?Set SUPABASE_SERVICE_ROLE_KEY}"

# App configuration
supabase secrets set APP_BASE_URL="$APP_BASE_URL_VALUE"

# Google OAuth
supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="${SUPABASE_AUTH_GOOGLE_CLIENT_ID:?Set SUPABASE_AUTH_GOOGLE_CLIENT_ID}"

# Stripe
supabase secrets set STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:?Set STRIPE_SECRET_KEY}"
supabase secrets set STRIPE_API_VERSION="2026-02-25.clover"

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID="${TWILIO_ACCOUNT_SID:?Set TWILIO_ACCOUNT_SID}"
supabase secrets set TWILIO_AUTH_TOKEN="${TWILIO_AUTH_TOKEN:?Set TWILIO_AUTH_TOKEN}"
supabase secrets set TWILIO_API_KEY_SID="${TWILIO_API_KEY_SID:?Set TWILIO_API_KEY_SID}"
supabase secrets set TWILIO_API_KEY_SECRET="${TWILIO_API_KEY_SECRET:?Set TWILIO_API_KEY_SECRET}"
supabase secrets set TWILIO_SMS_FROM="${TWILIO_SMS_FROM:?Set TWILIO_SMS_FROM}"

# Communications worker
WORKER_SECRET=$(openssl rand -base64 32)
WEBHOOK_TOKEN=$(openssl rand -base64 32)
supabase secrets set COMMUNICATION_WORKER_SECRET="$WORKER_SECRET"
supabase secrets set COMMUNICATION_WEBHOOK_TOKEN="$WEBHOOK_TOKEN"
supabase secrets set COMMUNICATION_MAX_ATTEMPTS="5"
supabase secrets set COMMUNICATION_PROCESS_INLINE="false"
supabase secrets set ENABLE_RUNTIME_ADMIN_ENDPOINTS="false"
supabase secrets set ALLOWED_ORIGINS="$ALLOWED_ORIGINS_VALUE"

echo -e "${GREEN}✓${NC} Secrets configured"

# Test deployment
echo ""
echo "Testing edge function..."
HEALTH_URL="$SUPABASE_URL_VALUE/functions/v1/$EDGE_FUNCTION_NAME/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    "$HEALTH_URL")

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Edge function is healthy (HTTP $HTTP_CODE)"
else
    echo -e "${RED}❌${NC} Edge function health check failed (HTTP $HTTP_CODE)"
    echo "URL: $HEALTH_URL"
    exit 1
fi

# Display summary
echo ""
echo "=================================="
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "=================================="
echo ""
echo "Edge Function URL:"
echo "  $SUPABASE_URL_VALUE/functions/v1/$EDGE_FUNCTION_NAME"
echo ""
echo "Provider Webhook URLs:"
echo "  Stripe: $SUPABASE_URL_VALUE/functions/v1/provider-webhooks/stripe"
echo "  Resend: $SUPABASE_URL_VALUE/functions/v1/provider-webhooks/resend?token=$WEBHOOK_TOKEN"
echo "  Twilio: $SUPABASE_URL_VALUE/functions/v1/provider-webhooks/twilio?token=$WEBHOOK_TOKEN"
echo ""
echo "Health Check:"
echo "  curl $HEALTH_URL"
echo ""
echo "Worker Secret (save this):"
echo "  $WORKER_SECRET"
echo ""
echo "Webhook Token (save this):"
echo "  $WEBHOOK_TOKEN"
echo ""
echo "Next Steps:"
echo "  1. Update Vercel environment variables"
echo "  2. Configure OAuth providers in Supabase dashboard"
echo "  3. Set up Stripe webhook at the provider-webhooks/stripe URL"
echo "  4. Configure email/SMS provider webhooks at the provider-webhooks URLs"
echo ""
