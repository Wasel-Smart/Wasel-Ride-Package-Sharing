#!/bin/bash

# ============================================================
# Complete Connectivity Verification Script
# Tests all three components for 100% connectivity
# ============================================================

set -e

echo "🔍 Complete Connectivity Verification"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# Function to run check
run_check() {
    local name=$1
    local command=$2
    local critical=${3:-true}
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "  Testing $name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        if [ "$critical" = "true" ]; then
            echo -e "${RED}✗${NC}"
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        else
            echo -e "${YELLOW}⚠${NC}"
            WARNING_CHECKS=$((WARNING_CHECKS + 1))
        fi
        return 1
    fi
}

# Function to test HTTP endpoint
test_http() {
    local url=$1
    local expected_code=${2:-200}
    
    local code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    [ "$code" = "$expected_code" ]
}

# Function to test HTTP with auth
test_http_auth() {
    local url=$1
    local token=$2
    local expected_code=${3:-200}
    
    local code=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $token" "$url")
    [ "$code" = "$expected_code" ]
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Edge Function Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test edge function health
run_check "Edge function health" "test_http 'https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health'"

# Test edge function CORS
run_check "Edge function CORS" "curl -s -X OPTIONS -H 'Origin: https://wasel14.online' 'https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health' | grep -q 'access-control-allow-origin'"

# Test edge function response time
echo -n "  Testing response time... "
START_TIME=$(date +%s%N)
curl -s "https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health" > /dev/null
END_TIME=$(date +%s%N)
RESPONSE_TIME=$(( (END_TIME - START_TIME) / 1000000 ))

if [ $RESPONSE_TIME -lt 1000 ]; then
    echo -e "${GREEN}✓${NC} (${RESPONSE_TIME}ms)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif [ $RESPONSE_TIME -lt 3000 ]; then
    echo -e "${YELLOW}⚠${NC} (${RESPONSE_TIME}ms - slow)"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
else
    echo -e "${RED}✗${NC} (${RESPONSE_TIME}ms - too slow)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Check if Supabase CLI is available
run_check "Supabase CLI installed" "command -v supabase" false

# Check if edge function is listed
if command -v supabase &> /dev/null; then
    run_check "Edge function listed" "supabase functions list 2>/dev/null | grep -q 'make-server-0b1f4071'" false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. Provider Credentials"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check environment variables
run_check "Supabase URL configured" "[ -n '$VITE_SUPABASE_URL' ] || grep -q 'VITE_SUPABASE_URL' .env"
run_check "Supabase Anon Key configured" "[ -n '$VITE_SUPABASE_ANON_KEY' ] || grep -q 'VITE_SUPABASE_ANON_KEY' .env"
run_check "Edge Function Name configured" "[ -n '$VITE_EDGE_FUNCTION_NAME' ] || grep -q 'VITE_EDGE_FUNCTION_NAME' .env"
run_check "Google Client ID configured" "[ -n '$VITE_GOOGLE_CLIENT_ID' ] || grep -q 'VITE_GOOGLE_CLIENT_ID' .env"
run_check "Google Maps API Key configured" "[ -n '$VITE_GOOGLE_MAPS_API_KEY' ] || grep -q 'VITE_GOOGLE_MAPS_API_KEY' .env"
run_check "Stripe Publishable Key configured" "[ -n '$VITE_STRIPE_PUBLISHABLE_KEY' ] || grep -q 'VITE_STRIPE_PUBLISHABLE_KEY' .env"

# Test Google Maps API
if grep -q "VITE_GOOGLE_MAPS_API_KEY" .env 2>/dev/null; then
    MAPS_KEY=$(grep "VITE_GOOGLE_MAPS_API_KEY" .env | cut -d'=' -f2)
    run_check "Google Maps API accessible" "test_http 'https://maps.googleapis.com/maps/api/js?key=$MAPS_KEY'" false
fi

# Test Stripe API
if grep -q "VITE_STRIPE_PUBLISHABLE_KEY" .env 2>/dev/null; then
    run_check "Stripe API accessible" "test_http 'https://api.stripe.com/v1'" false
fi

# Check Supabase secrets (if CLI available)
if command -v supabase &> /dev/null; then
    echo ""
    echo "  Checking Supabase secrets..."
    
    if supabase secrets list 2>/dev/null | grep -q "SUPABASE_URL"; then
        echo -e "    ${GREEN}✓${NC} SUPABASE_URL"
    else
        echo -e "    ${YELLOW}⚠${NC} SUPABASE_URL not set"
    fi
    
    if supabase secrets list 2>/dev/null | grep -q "STRIPE_SECRET_KEY"; then
        echo -e "    ${GREEN}✓${NC} STRIPE_SECRET_KEY"
    else
        echo -e "    ${YELLOW}⚠${NC} STRIPE_SECRET_KEY not set"
    fi
    
    if supabase secrets list 2>/dev/null | grep -q "TWILIO_ACCOUNT_SID"; then
        echo -e "    ${GREEN}✓${NC} TWILIO_ACCOUNT_SID"
    else
        echo -e "    ${YELLOW}⚠${NC} TWILIO_ACCOUNT_SID not set"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Production Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check production files
run_check ".env file exists" "[ -f .env ]"
run_check ".env.production exists" "[ -f .env.production ]" false
run_check "vercel.json exists" "[ -f vercel.json ]"

# Check fallback disabled
run_check "Fallback disabled in production" "grep -q 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false' .env.production || grep -q 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false' .env" false

# Check production URLs
run_check "Production URL configured" "grep -q 'wasel14.online' .env || grep -q 'wasel14.online' .env.production" false

# Test production build
echo -n "  Testing production build... "
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    
    # Check build output
    if [ -d "dist" ]; then
        echo -e "    ${GREEN}✓${NC} dist/ directory created"
        
        if [ -f "dist/index.html" ]; then
            echo -e "    ${GREEN}✓${NC} index.html exists"
        fi
        
        if [ -d "dist/assets" ]; then
            echo -e "    ${GREEN}✓${NC} assets/ directory exists"
        fi
    fi
else
    echo -e "${RED}✗${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Check Vercel CLI
run_check "Vercel CLI installed" "command -v vercel" false

# Check if linked to Vercel
if command -v vercel &> /dev/null; then
    run_check "Linked to Vercel project" "[ -d .vercel ]" false
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4. Application Wiring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run existing wiring verification
if [ -f "scripts/verify-wiring.mjs" ]; then
    echo "  Running wiring verification..."
    if node scripts/verify-wiring.mjs > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} All wiring checks passed"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "  ${RED}✗${NC} Some wiring checks failed"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
fi

# Check critical files
run_check "Health check module exists" "[ -f src/utils/healthCheck.ts ]"
run_check "Backend workflow module exists" "[ -f src/services/backendWorkflow.ts ]"
run_check "Fallback strategy module exists" "[ -f src/utils/fallbackStrategy.ts ]"
run_check "Edge function config exists" "[ -f src/utils/edgeFunctionConfig.ts ]"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5. Integration Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test Supabase connection
echo -n "  Testing Supabase connection... "
SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env 2>/dev/null | cut -d'=' -f2 || echo "")
if [ -n "$SUPABASE_URL" ]; then
    if test_http "$SUPABASE_URL/rest/v1/" 200 || test_http "$SUPABASE_URL/rest/v1/" 401; then
        echo -e "${GREEN}✓${NC}"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
        echo -e "${RED}✗${NC}"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
else
    echo -e "${YELLOW}⚠${NC} (URL not configured)"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Test edge function endpoints
echo -n "  Testing edge function endpoints... "
ENDPOINTS_OK=0
ENDPOINTS_TOTAL=3

test_http "https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health" && ENDPOINTS_OK=$((ENDPOINTS_OK + 1))
test_http "https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/trust/status" 401 && ENDPOINTS_OK=$((ENDPOINTS_OK + 1))
test_http "https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/communications/preferences" 401 && ENDPOINTS_OK=$((ENDPOINTS_OK + 1))

if [ $ENDPOINTS_OK -eq $ENDPOINTS_TOTAL ]; then
    echo -e "${GREEN}✓${NC} ($ENDPOINTS_OK/$ENDPOINTS_TOTAL)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
elif [ $ENDPOINTS_OK -gt 0 ]; then
    echo -e "${YELLOW}⚠${NC} ($ENDPOINTS_OK/$ENDPOINTS_TOTAL)"
    WARNING_CHECKS=$((WARNING_CHECKS + 1))
else
    echo -e "${RED}✗${NC} ($ENDPOINTS_OK/$ENDPOINTS_TOTAL)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# ============================================================
# Calculate Score
# ============================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Verification Results"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SCORE=$(( (PASSED_CHECKS * 100) / TOTAL_CHECKS ))

echo "Total Checks: $TOTAL_CHECKS"
echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
echo -e "Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
echo ""

# Display score with color
if [ $SCORE -ge 90 ]; then
    echo -e "Connectivity Score: ${GREEN}$SCORE/100${NC} 🎉"
    echo -e "Status: ${GREEN}Excellent - Ready for production!${NC}"
elif [ $SCORE -ge 70 ]; then
    echo -e "Connectivity Score: ${YELLOW}$SCORE/100${NC}"
    echo -e "Status: ${YELLOW}Good - Minor issues to address${NC}"
elif [ $SCORE -ge 50 ]; then
    echo -e "Connectivity Score: ${YELLOW}$SCORE/100${NC}"
    echo -e "Status: ${YELLOW}Fair - Several issues need attention${NC}"
else
    echo -e "Connectivity Score: ${RED}$SCORE/100${NC}"
    echo -e "Status: ${RED}Poor - Critical issues must be fixed${NC}"
fi

echo ""

# ============================================================
# Recommendations
# ============================================================
if [ $FAILED_CHECKS -gt 0 ] || [ $WARNING_CHECKS -gt 0 ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Recommendations"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [ $FAILED_CHECKS -gt 0 ]; then
        echo "Critical Issues:"
        echo "  1. Run: bash scripts/deploy-edge-function.sh"
        echo "  2. Run: bash scripts/configure-providers.sh"
        echo "  3. Run: bash scripts/configure-production.sh"
        echo ""
    fi
    
    if [ $WARNING_CHECKS -gt 0 ]; then
        echo "Optional Improvements:"
        echo "  • Configure additional OAuth providers"
        echo "  • Set up email provider (Resend or SendGrid)"
        echo "  • Configure Sentry for error monitoring"
        echo "  • Set up Twilio for SMS notifications"
        echo ""
    fi
fi

# Exit with appropriate code
if [ $SCORE -ge 80 ]; then
    exit 0
else
    exit 1
fi
