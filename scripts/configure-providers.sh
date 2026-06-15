#!/bin/bash

# ============================================================
# Provider Credentials Configuration Script
# Sets up all third-party provider credentials
# ============================================================

set -e

echo "🔐 Provider Credentials Configuration"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_REF=${SUPABASE_PROJECT_REF:-<YOUR_PROJECT_REF>}
SUPABASE_URL=${SUPABASE_URL:-https://$PROJECT_REF.supabase.co}
APP_URL=${APP_BASE_URL:-https://wasel14.online}
EDGE_FUNCTION_NAME=${SUPABASE_EDGE_FUNCTION_NAME:-${VITE_EDGE_FUNCTION_NAME:-make-server-0b1f4071}}
FUNCTIONS_BASE_URL="$SUPABASE_URL/functions/v1"

# Function to prompt for input
prompt_secret() {
    local var_name=$1
    local description=$2
    local current_value=$3
    
    echo -e "${BLUE}$description${NC}"
    if [ -n "$current_value" ]; then
        echo -e "${YELLOW}Current: $current_value${NC}"
    fi
    read -p "Enter value (or press Enter to skip): " value
    
    if [ -n "$value" ]; then
        echo "$value"
    else
        echo "$current_value"
    fi
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"
echo ""

# ============================================================
# Google OAuth Configuration
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Google OAuth Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup Instructions:"
echo "1. Go to: https://console.cloud.google.com"
echo "2. Create/Select project: Wasel Production"
echo "3. Enable Google+ API and Google Maps JavaScript API"
echo "4. Create OAuth 2.0 credentials"
echo "5. Add authorized origins: $APP_URL, $SUPABASE_URL"
echo "6. Add redirect URI: $SUPABASE_URL/auth/v1/callback"
echo ""

GOOGLE_CLIENT_ID=$(prompt_secret "GOOGLE_CLIENT_ID" "Google OAuth Client ID" "")
GOOGLE_CLIENT_SECRET=$(prompt_secret "GOOGLE_CLIENT_SECRET" "Google OAuth Client Secret" "")

if [ -n "$GOOGLE_CLIENT_SECRET" ]; then
    supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
    supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
    echo -e "${GREEN}✓${NC} Google OAuth configured"
else
    echo -e "${YELLOW}⚠${NC} Google OAuth skipped"
fi

echo ""

# ============================================================
# Facebook OAuth Configuration
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Facebook OAuth Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup Instructions:"
echo "1. Go to: https://developers.facebook.com"
echo "2. Create app: Wasel"
echo "3. Add Facebook Login product"
echo "4. Add redirect URI: $SUPABASE_URL/auth/v1/callback"
echo ""

FACEBOOK_APP_ID=$(prompt_secret "FACEBOOK_APP_ID" "Facebook App ID" "")
FACEBOOK_APP_SECRET=$(prompt_secret "FACEBOOK_APP_SECRET" "Facebook App Secret" "")

if [ -n "$FACEBOOK_APP_ID" ] && [ -n "$FACEBOOK_APP_SECRET" ]; then
    supabase secrets set SUPABASE_AUTH_FACEBOOK_CLIENT_ID="$FACEBOOK_APP_ID"
    supabase secrets set SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET="$FACEBOOK_APP_SECRET"
    echo -e "${GREEN}✓${NC} Facebook OAuth configured"
else
    echo -e "${YELLOW}⚠${NC} Facebook OAuth skipped"
fi

echo ""

# ============================================================
# Stripe Configuration
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Stripe Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup Instructions:"
echo "1. Go to: https://dashboard.stripe.com"
echo "2. Switch to Live Mode (or use Test Mode for now)"
echo "3. Get API keys from Developers → API keys"
echo "4. Create webhook endpoint:"
echo "   URL: $FUNCTIONS_BASE_URL/provider-webhooks/stripe"
echo "   Events: checkout.session.*, customer.subscription.*, invoice.*, payment_intent.payment_failed"
echo "5. Create Wasel Plus product (5 JOD/month) and copy Price ID"
echo ""

STRIPE_SECRET_KEY=$(prompt_secret "STRIPE_SECRET_KEY" "Stripe Secret Key (sk_live_... or sk_test_...)" "")
STRIPE_WEBHOOK_SECRET=$(prompt_secret "STRIPE_WEBHOOK_SECRET" "Stripe Webhook Secret (whsec_...)" "")
STRIPE_PRICE_ID=$(prompt_secret "STRIPE_PRICE_ID" "Wasel Plus Price ID (price_...)" "")

if [ -n "$STRIPE_SECRET_KEY" ]; then
    supabase secrets set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
    supabase secrets set STRIPE_API_VERSION="2024-11-20.acacia"
    
    if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
        supabase secrets set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
    fi
    
    if [ -n "$STRIPE_PRICE_ID" ]; then
        supabase secrets set STRIPE_WASEL_PLUS_PRICE_ID="$STRIPE_PRICE_ID"
    fi
    
    echo -e "${GREEN}✓${NC} Stripe configured"
else
    echo -e "${YELLOW}⚠${NC} Stripe skipped"
fi

echo ""

# ============================================================
# Twilio Configuration
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Twilio Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup Instructions:"
echo "1. Go to: https://console.twilio.com"
echo "2. Get Account SID and Auth Token from dashboard"
echo "3. Create Messaging Service: Wasel Notifications"
echo "4. Buy Jordan phone number (+962)"
echo "5. Create API Key for programmatic access"
echo "6. Use status callback URL: $FUNCTIONS_BASE_URL/provider-webhooks/twilio?token=\$COMMUNICATION_WEBHOOK_TOKEN"
echo ""

TWILIO_ACCOUNT_SID=$(prompt_secret "TWILIO_ACCOUNT_SID" "Twilio Account SID (AC...)" "")
TWILIO_AUTH_TOKEN=$(prompt_secret "TWILIO_AUTH_TOKEN" "Twilio Auth Token" "<YOUR_TWILIO_AUTH_TOKEN>")
TWILIO_API_KEY_SID=$(prompt_secret "TWILIO_API_KEY_SID" "Twilio API Key SID (SK...)" "")
TWILIO_API_KEY_SECRET=$(prompt_secret "TWILIO_API_KEY_SECRET" "Twilio API Key Secret" "")
TWILIO_MESSAGING_SID=$(prompt_secret "TWILIO_MESSAGING_SID" "Twilio Messaging Service SID (MG...)" "")
TWILIO_SMS_FROM=$(prompt_secret "TWILIO_SMS_FROM" "Twilio SMS From Number (+962...)" "+962790000000")

if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ]; then
    supabase secrets set TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID"
    supabase secrets set TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"

    if [ -n "$TWILIO_API_KEY_SID" ] && [ -n "$TWILIO_API_KEY_SECRET" ]; then
        supabase secrets set TWILIO_API_KEY_SID="$TWILIO_API_KEY_SID"
        supabase secrets set TWILIO_API_KEY_SECRET="$TWILIO_API_KEY_SECRET"
    fi
    
    if [ -n "$TWILIO_MESSAGING_SID" ]; then
        supabase secrets set TWILIO_MESSAGING_SERVICE_SID="$TWILIO_MESSAGING_SID"
    fi
    
    if [ -n "$TWILIO_SMS_FROM" ]; then
        supabase secrets set TWILIO_SMS_FROM="$TWILIO_SMS_FROM"
    fi
    
    supabase secrets set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
    
    echo -e "${GREEN}✓${NC} Twilio configured"
else
    echo -e "${YELLOW}⚠${NC} Twilio skipped"
fi

echo ""

# ============================================================
# Email Provider Configuration
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Email Provider Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Choose your email provider:"
echo "1. Resend (recommended)"
echo "2. SendGrid"
echo "3. Skip"
echo ""
read -p "Enter choice (1-3): " email_choice

case $email_choice in
    1)
        echo ""
        echo "Resend Setup:"
        echo "1. Go to: https://resend.com"
        echo "2. Create API key: Wasel Production"
        echo "3. Verify domain: wasel14.online"
        echo "4. Configure webhook URL: $FUNCTIONS_BASE_URL/provider-webhooks/resend?token=\$COMMUNICATION_WEBHOOK_TOKEN"
        echo ""
        
        RESEND_API_KEY=$(prompt_secret "RESEND_API_KEY" "Resend API Key (re_...)" "")
        
        if [ -n "$RESEND_API_KEY" ]; then
            supabase secrets set RESEND_API_KEY="$RESEND_API_KEY"
            supabase secrets set RESEND_FROM_EMAIL="Wasel <notifications@wasel14.online>"
            supabase secrets set RESEND_REPLY_TO_EMAIL="support@wasel14.online"
            echo -e "${GREEN}✓${NC} Resend configured"
        fi
        ;;
    2)
        echo ""
        echo "SendGrid Setup:"
        echo "1. Go to: https://sendgrid.com"
        echo "2. Create API key: Wasel Production"
        echo "3. Verify sender: notifications@wasel14.online"
        echo ""
        
        SENDGRID_API_KEY=$(prompt_secret "SENDGRID_API_KEY" "SendGrid API Key (SG...)" "")
        
        if [ -n "$SENDGRID_API_KEY" ]; then
            supabase secrets set SENDGRID_API_KEY="$SENDGRID_API_KEY"
            supabase secrets set SENDGRID_FROM_EMAIL="notifications@wasel14.online"
            echo -e "${GREEN}✓${NC} SendGrid configured"
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠${NC} Email provider skipped"
        ;;
esac

echo ""

# ============================================================
# Sentry Configuration
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6. Sentry Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Setup Instructions:"
echo "1. Go to: https://sentry.io"
echo "2. Create project: Wasel Web"
echo "3. Platform: React"
echo "4. Copy DSN"
echo ""

SENTRY_DSN=$(prompt_secret "SENTRY_DSN" "Sentry DSN (https://...@sentry.io/...)" "")

if [ -n "$SENTRY_DSN" ]; then
    echo -e "${GREEN}✓${NC} Sentry configured (add to Vercel env vars)"
    echo "  VITE_SENTRY_DSN=$SENTRY_DSN"
else
    echo -e "${YELLOW}⚠${NC} Sentry skipped"
fi

echo ""

# ============================================================
# Database Connection String
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7. Database Connection String"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Get from Supabase Dashboard:"
echo "Project Settings → Database → Connection Pooling → Connection string"
echo ""

DB_PASSWORD=$(prompt_secret "DB_PASSWORD" "Database Password" "")

if [ -n "$DB_PASSWORD" ]; then
    DB_URL="postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    supabase secrets set SUPABASE_DB_URL="$DB_URL"
    echo -e "${GREEN}✓${NC} Database connection configured"
else
    echo -e "${YELLOW}⚠${NC} Database connection skipped"
fi

echo ""

# ============================================================
# Summary
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Provider Configuration Complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Configured Providers:"
[ -n "$GOOGLE_CLIENT_SECRET" ] && echo -e "  ${GREEN}✓${NC} Google OAuth"
[ -n "$FACEBOOK_APP_SECRET" ] && echo -e "  ${GREEN}✓${NC} Facebook OAuth"
[ -n "$STRIPE_SECRET_KEY" ] && echo -e "  ${GREEN}✓${NC} Stripe"
[ -n "$TWILIO_AUTH_TOKEN" ] && echo -e "  ${GREEN}✓${NC} Twilio"
[ -n "$RESEND_API_KEY" ] && echo -e "  ${GREEN}✓${NC} Resend"
[ -n "$SENDGRID_API_KEY" ] && echo -e "  ${GREEN}✓${NC} SendGrid"
[ -n "$SENTRY_DSN" ] && echo -e "  ${GREEN}✓${NC} Sentry"
[ -n "$DB_PASSWORD" ] && echo -e "  ${GREEN}✓${NC} Database"
echo ""
echo "Next Steps:"
echo "  1. Update Supabase Dashboard → Authentication → Providers"
echo "  2. Add OAuth credentials in Supabase UI"
echo "  3. Configure Stripe webhook in Stripe dashboard"
echo "  4. Add VITE_SENTRY_DSN to Vercel environment variables"
echo "  5. Test all integrations"
echo ""
