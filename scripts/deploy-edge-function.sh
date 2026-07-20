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

# Deploy edge function
echo ""
echo "Deploying edge function..."
supabase functions deploy make-server-0b1f4071 --no-verify-jwt

echo -e "${GREEN}✓${NC} Edge function deployed"

# Set secrets
echo ""
echo "Setting edge function secrets..."

# Core Supabase secrets
supabase secrets set SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc3NTcyNiwiZXhwIjoyMDkzMzUxNzI2fQ.YT92TwRlZDMvyu11sTzuB2mhlSIHVplxT5EybXio30U"

# App configuration
supabase secrets set APP_BASE_URL="https://wasel14.online"

# Google OAuth
supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com"

# Stripe
supabase secrets set STRIPE_SECRET_KEY="sk_test_51SZmpKENhKSYxMCX03sEOKEiljDGWYTX0ZKTVmqKM0NeNH60jWc6pzyW8vaMHr7ahEKfKRNG24UqNrlsELnEGvHZ004Ec5d33u"
supabase secrets set STRIPE_API_VERSION="2024-11-20.acacia"

# Twilio
supabase secrets set TWILIO_ACCOUNT_SID="AC1386e065d313ae43d256ca0394d0b4e6"
supabase secrets set TWILIO_AUTH_TOKEN="5005d351cb6bee711cb5127a7d192728"
supabase secrets set TWILIO_API_KEY_SID="SK4519926e3b0a4186bee07283ab57b018"
supabase secrets set TWILIO_API_KEY_SECRET="LCnyYDzwgp4n9qqg7hx2nf0HRvOLnRQU"
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
