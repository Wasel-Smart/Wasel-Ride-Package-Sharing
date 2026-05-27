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

require_env() {
    local name="$1"
    local value="${!name}"

    if [ -z "$value" ]; then
        echo -e "${RED}Missing required environment variable: $name${NC}"
        exit 1
    fi
}

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

# Link to project
echo ""
echo "Linking to production project..."
supabase link --project-ref zexlxabdcsjefptmjhuq

echo -e "${GREEN}✓${NC} Linked to project"

# Deploy edge function
echo ""
echo "Deploying edge function..."
supabase functions deploy make-server-0b1f4071 --no-verify-jwt

echo -e "${GREEN}✓${NC} Edge function deployed"

# Set secrets
echo ""
echo "Setting edge function secrets..."

require_env "SUPABASE_SERVICE_ROLE_KEY"
require_env "STRIPE_SECRET_KEY"
require_env "TWILIO_ACCOUNT_SID"
require_env "TWILIO_AUTH_TOKEN"

# Core Supabase secrets
supabase secrets set SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co"
if [ -n "$SUPABASE_ANON_KEY" ]; then
    supabase secrets set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
fi
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"

# App configuration
supabase secrets set APP_BASE_URL="https://wasel14.online"

if [ -n "$SUPABASE_AUTH_GOOGLE_CLIENT_ID" ]; then
    supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="$SUPABASE_AUTH_GOOGLE_CLIENT_ID"
fi

# Stripe
supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
supabase secrets set STRIPE_API_VERSION="2024-11-20.acacia"

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID"
supabase secrets set TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"
if [ -n "$TWILIO_API_KEY_SID" ]; then
    supabase secrets set TWILIO_API_KEY_SID="$TWILIO_API_KEY_SID"
fi
if [ -n "$TWILIO_API_KEY_SECRET" ]; then
    supabase secrets set TWILIO_API_KEY_SECRET="$TWILIO_API_KEY_SECRET"
fi
if [ -n "$TWILIO_MESSAGING_SERVICE_SID" ]; then
    supabase secrets set TWILIO_MESSAGING_SERVICE_SID="$TWILIO_MESSAGING_SERVICE_SID"
fi
if [ -n "$TWILIO_SMS_FROM" ]; then
    supabase secrets set TWILIO_SMS_FROM="$TWILIO_SMS_FROM"
fi
if [ -n "$TWILIO_WHATSAPP_FROM" ]; then
    supabase secrets set TWILIO_WHATSAPP_FROM="$TWILIO_WHATSAPP_FROM"
fi

# Communications worker
WORKER_SECRET=$(openssl rand -base64 32)
WEBHOOK_TOKEN=$(openssl rand -base64 32)
supabase secrets set COMMUNICATION_WORKER_SECRET="$WORKER_SECRET"
supabase secrets set COMMUNICATION_WEBHOOK_TOKEN="$WEBHOOK_TOKEN"
supabase secrets set COMMUNICATION_MAX_ATTEMPTS="5"
supabase secrets set COMMUNICATION_PROCESS_INLINE="false"
supabase secrets set ENABLE_RUNTIME_ADMIN_ENDPOINTS="false"
supabase secrets set ALLOWED_ORIGINS="https://wasel14.online"

echo -e "${GREEN}✓${NC} Secrets configured"

# Test deployment
echo ""
echo "Testing edge function..."
HEALTH_URL="https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")

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
echo "  https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071"
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
echo "  3. Set up Stripe webhook"
echo "  4. Configure email provider (Resend or SendGrid)"
echo ""
