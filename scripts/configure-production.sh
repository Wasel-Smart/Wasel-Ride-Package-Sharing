#!/bin/bash

# ============================================================
# Production Environment Configuration Script
# Configures Vercel with all production environment variables
# ============================================================

set -e

echo "🌐 Production Environment Configuration"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠${NC} Vercel CLI not found. Installing..."
    npm install -g vercel
fi

echo -e "${GREEN}✓${NC} Vercel CLI found"

# Login to Vercel
echo ""
echo "Logging in to Vercel..."
vercel login

# Link to project
echo ""
echo "Linking to Vercel project..."
vercel link

echo -e "${GREEN}✓${NC} Linked to Vercel project"
echo ""

# ============================================================
# Set Environment Variables
# ============================================================
echo "Setting production environment variables..."
echo ""

# Function to set env var
set_env() {
    local key=$1
    local value=$2
    local env_type=${3:-production}
    
    echo -n "  Setting $key... "
    echo "$value" | vercel env add "$key" "$env_type" --force > /dev/null 2>&1
    echo -e "${GREEN}✓${NC}"
}

set_env_if_present() {
    local key=$1
    local value=${2:-}
    local env_type=${3:-production}

    if [ -z "$value" ]; then
        echo -e "  Skipping $key... ${YELLOW}not provided${NC}"
        return
    fi

    set_env "$key" "$value" "$env_type"
}

require_env() {
    local key=$1
    local value=${!key:-}

    if [ -z "$value" ]; then
        echo -e "${RED}Missing required environment variable:${NC} $key"
        echo "Export it before running this script so credentials are not stored in source control."
        exit 1
    fi

    printf '%s' "$value"
}

APP_URL_VALUE=${VITE_APP_URL:-https://wasel14.online}
SUPABASE_URL_VALUE=$(require_env "VITE_SUPABASE_URL")
SUPABASE_PUBLISHABLE_KEY_VALUE=$(require_env "VITE_SUPABASE_PUBLISHABLE_KEY")
SUPABASE_ANON_KEY_VALUE=${VITE_SUPABASE_ANON_KEY:-}
EDGE_FUNCTION_NAME_VALUE=${VITE_EDGE_FUNCTION_NAME:-make-server-0b1f4071}
API_URL_VALUE=${VITE_API_URL:-"$SUPABASE_URL_VALUE/functions/v1/$EDGE_FUNCTION_NAME_VALUE"}
GOOGLE_MAPS_API_KEY_VALUE=${VITE_GOOGLE_MAPS_API_KEY:-}
GOOGLE_CLIENT_ID_VALUE=${VITE_GOOGLE_CLIENT_ID:-}
STRIPE_PUBLISHABLE_KEY_VALUE=${VITE_STRIPE_PUBLISHABLE_KEY:-}

# Core App Configuration
echo "1. Core App Configuration"
set_env "VITE_APP_ENV" "production"
set_env "VITE_APP_NAME" "Wasel"
set_env "NODE_ENV" "production"

# Supabase Configuration
echo ""
echo "2. Supabase Configuration"
set_env "VITE_SUPABASE_URL" "$SUPABASE_URL_VALUE"
set_env_if_present "VITE_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY_VALUE"
set_env "VITE_SUPABASE_PUBLISHABLE_KEY" "$SUPABASE_PUBLISHABLE_KEY_VALUE"
set_env "VITE_EDGE_FUNCTION_NAME" "$EDGE_FUNCTION_NAME_VALUE"
set_env "VITE_API_URL" "$API_URL_VALUE"

# Feature Flags
echo ""
echo "3. Feature Flags"
set_env "VITE_ALLOW_DIRECT_SUPABASE_FALLBACK" "false"
set_env "VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK" "false"
set_env "VITE_ENABLE_DEMO_DATA" "false"
set_env "VITE_ENABLE_SYNTHETIC_TRIPS" "false"
set_env "VITE_ENABLE_TWO_FACTOR_AUTH" "false"
set_env "VITE_ENABLE_EMAIL_NOTIFICATIONS" "true"
set_env "VITE_ENABLE_SMS_NOTIFICATIONS" "false"
set_env "VITE_ENABLE_WHATSAPP_NOTIFICATIONS" "false"

# App URLs
echo ""
echo "4. App URLs"
set_env "VITE_APP_URL" "$APP_URL_VALUE"
set_env "VITE_PRODUCTION_APP_URL" "${VITE_PRODUCTION_APP_URL:-$APP_URL_VALUE}"
set_env "VITE_AUTH_CALLBACK_PATH" "/app/auth/callback"

# Support Contact
echo ""
echo "5. Support Contact"
set_env "VITE_SUPPORT_EMAIL" "support@wasel14.online"
set_env "VITE_SUPPORT_PHONE_NUMBER" "962790000000"
set_env "VITE_SUPPORT_WHATSAPP_NUMBER" "962790000000"
set_env "VITE_SUPPORT_SMS_NUMBER" "962790000000"

# Business Information
echo ""
echo "6. Business Information"
set_env "VITE_BUSINESS_ADDRESS" "Amman, Jordan"
set_env "VITE_BUSINESS_ADDRESS_AR" "عمّان، الأردن"
set_env "VITE_FOUNDER_NAME" "Wasel Team"

# Google Services
echo ""
echo "7. Google Services"
set_env_if_present "VITE_GOOGLE_MAPS_API_KEY" "$GOOGLE_MAPS_API_KEY_VALUE"
set_env_if_present "VITE_GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID_VALUE"

# Stripe
echo ""
echo "8. Stripe Configuration"
set_env_if_present "VITE_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUBLISHABLE_KEY_VALUE"

# Analytics & Monitoring
echo ""
echo "9. Analytics & Monitoring"
set_env "VITE_ANALYTICS_ENDPOINT" "https://analytics.wasel14.online/api/v1"
set_env "VITE_CDN_URL" "https://cdn.wasel14.online"

echo ""
echo -e "${GREEN}✓${NC} All environment variables set"

# ============================================================
# Create .env.production.local file
# ============================================================
echo ""
echo "Creating .env.production.local file..."

cat > .env.production.local << EOF
# Wasel Production Environment - Local Copy
# Generated by configure-production.sh
# DO NOT COMMIT THIS FILE

# Core
VITE_APP_ENV=production
VITE_APP_NAME=Wasel
NODE_ENV=production

# Supabase
VITE_SUPABASE_URL=$SUPABASE_URL_VALUE
VITE_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY_VALUE
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY_VALUE
VITE_EDGE_FUNCTION_NAME=$EDGE_FUNCTION_NAME_VALUE
VITE_API_URL=$API_URL_VALUE

# Feature Flags
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ENABLE_DEMO_DATA=false

# App URLs
VITE_APP_URL=$APP_URL_VALUE
VITE_AUTH_CALLBACK_PATH=/app/auth/callback

# Google
VITE_GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY_VALUE
VITE_GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID_VALUE

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY_VALUE

# Support
VITE_SUPPORT_EMAIL=support@wasel14.online
VITE_SUPPORT_PHONE_NUMBER=962790000000
EOF

echo -e "${GREEN}✓${NC} .env.production.local created"

# ============================================================
# Test Build
# ============================================================
echo ""
echo "Testing production build..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Production build successful"
else
    echo -e "${RED}❌${NC} Production build failed"
    exit 1
fi

# ============================================================
# Deploy to Vercel
# ============================================================
echo ""
read -p "Deploy to Vercel now? (y/n): " deploy_choice

if [ "$deploy_choice" = "y" ] || [ "$deploy_choice" = "Y" ]; then
    echo ""
    echo "Deploying to Vercel..."
    vercel --prod
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✅ Deployment successful!${NC}"
    else
        echo ""
        echo -e "${RED}❌ Deployment failed${NC}"
        exit 1
    fi
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Production Environment Configured!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Configuration Summary:"
echo "  • Vercel environment variables: ✓"
echo "  • Local .env.production.local: ✓"
echo "  • Production build: ✓"
echo ""
echo "Production URLs:"
echo "  • App: https://wasel14.online"
echo "  • API: $API_URL_VALUE"
echo ""
echo "Next Steps:"
echo "  1. Configure OAuth providers in Supabase dashboard"
echo "  2. Set up Stripe webhook"
echo "  3. Configure email provider"
echo "  4. Add Sentry DSN to Vercel"
echo "  5. Test all integrations"
echo ""
echo "Manual Configuration Required:"
echo "  • Supabase Dashboard → Authentication → Providers"
echo "    - Add Google OAuth credentials"
echo "    - Add Facebook OAuth credentials"
echo "  • Stripe Dashboard → Webhooks"
echo "    - Add webhook endpoint"
echo "  • Vercel Dashboard → Environment Variables"
echo "    - Add VITE_SENTRY_DSN (if using Sentry)"
echo "    - Add VITE_FACEBOOK_APP_ID (if using Facebook)"
echo ""

