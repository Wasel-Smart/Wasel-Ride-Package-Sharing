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

# Link to project
echo ""
echo "Linking to production project..."
supabase link --project-ref zexlxabdcsjefptmjhuq

echo -e "${GREEN}✓${NC} Linked to project"

# Deploy edge functions
echo ""
echo "Deploying edge functions..."
supabase functions deploy make-server-0b1f4071
supabase functions deploy provider-webhooks --no-verify-jwt

echo -e "${GREEN}✓${NC} Edge function deployed"

# Set secrets
echo ""
echo "Setting edge function secrets..."

# Core Supabase secrets
supabase secrets set SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
supabase secrets set SUPABASE_PUBLISHABLE_KEY="sb_publishable_Iy-jArsso0ehGKQ83kuiDg_1T-cl9zE"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<YOUR_SUPABASE_SERVICE_ROLE_KEY>"

# App configuration
supabase secrets set APP_BASE_URL="https://wasel14.online"

# Google OAuth
supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com"

# Stripe
supabase secrets set STRIPE_SECRET_KEY="sk_live_REPLACE_WITH_YOUR_REAL_SECRET_KEY"
supabase secrets set STRIPE_API_VERSION="2026-02-25.clover"

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID="<YOUR_TWILIO_ACCOUNT_SID>"
supabase secrets set TWILIO_AUTH_TOKEN="<YOUR_TWILIO_AUTH_TOKEN>"
supabase secrets set TWILIO_API_KEY_SID="SK4519926e3b0a4186bee07283ab57b018"
supabase secrets set TWILIO_API_KEY_SECRET="<YOUR_TWILIO_API_SECRET>"
supabase secrets set TWILIO_SMS_FROM="+962790000000"

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
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer <YOUR_SUPABASE_ANON_KEY>" \
    -H "apikey: <YOUR_SUPABASE_ANON_KEY>" \
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
echo "  https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071"
echo ""
echo "Provider Webhook URLs:"
echo "  Stripe: https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/provider-webhooks/stripe"
echo "  Resend: https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/provider-webhooks/resend?token=$WEBHOOK_TOKEN"
echo "  Twilio: https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/provider-webhooks/twilio?token=$WEBHOOK_TOKEN"
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
