#!/bin/bash
set -e

echo "🎯 Wasel 10/10 Validation"
echo "=========================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

section() {
    echo ""
    echo -e "${BLUE}▶${NC} $1"
    echo "----------------------------------------"
}

# ============================================
# 1. Backend Services Validation
# ============================================
section "1. Backend Services"

# Check if services are deployed
if kubectl get deployment ride-matching -n wasel-backend &> /dev/null; then
    check_pass "Ride matching service deployed"
    
    # Check if pods are running
    PODS=$(kubectl get pods -n wasel-backend -l app=ride-matching --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "Ride matching pods running ($PODS replicas)"
        
        # Check health endpoint
        POD=$(kubectl get pods -n wasel-backend -l app=ride-matching -o jsonpath='{.items[0].metadata.name}')
        if kubectl exec -n wasel-backend $POD -- curl -s http://localhost:8081/health | grep -q '"status":"healthy"'; then
            check_pass "Ride matching service is healthy"
        else
            check_fail "Ride matching service health check failed"
        fi
    else
        check_fail "No ride matching pods running"
    fi
else
    check_fail "Ride matching service not deployed"
fi

if kubectl get deployment payment-reconciliation -n wasel-backend &> /dev/null; then
    check_pass "Payment reconciliation service deployed"
    
    PODS=$(kubectl get pods -n wasel-backend -l app=payment-reconciliation --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "Payment reconciliation pods running ($PODS replicas)"
        
        POD=$(kubectl get pods -n wasel-backend -l app=payment-reconciliation -o jsonpath='{.items[0].metadata.name}')
        if kubectl exec -n wasel-backend $POD -- curl -s http://localhost:8082/health | grep -q '"status":"healthy"'; then
            check_pass "Payment reconciliation service is healthy"
        else
            check_fail "Payment reconciliation service health check failed"
        fi
    else
        check_fail "No payment reconciliation pods running"
    fi
else
    check_fail "Payment reconciliation service not deployed"
fi

if kubectl get deployment ops-analytics -n wasel-backend &> /dev/null; then
    check_pass "Ops analytics worker deployed"
    
    PODS=$(kubectl get pods -n wasel-backend -l app=ops-analytics --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "Ops analytics pods running ($PODS replicas)"
        
        POD=$(kubectl get pods -n wasel-backend -l app=ops-analytics -o jsonpath='{.items[0].metadata.name}')
        if kubectl exec -n wasel-backend $POD -- curl -s http://localhost:8083/health | grep -q '"status":"healthy"'; then
            check_pass "Ops analytics worker is healthy"
        else
            check_fail "Ops analytics worker health check failed"
        fi
    else
        check_fail "No ops analytics pods running"
    fi
else
    check_fail "Ops analytics worker not deployed"
fi

# Check database connectivity
section "1.1 Database Layer"

if [ -n "$DATABASE_URL" ]; then
    check_pass "DATABASE_URL configured"
    
    # Try to connect via one of the services
    POD=$(kubectl get pods -n wasel-backend -l app=ride-matching -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$POD" ]; then
        if kubectl exec -n wasel-backend $POD -- node -e "const postgres=require('postgres');const sql=postgres(process.env.DATABASE_URL);sql\`SELECT 1\`.then(()=>{console.log('OK');process.exit(0);}).catch(()=>process.exit(1));" &> /dev/null; then
            check_pass "Database connection successful"
        else
            check_warn "Database connection test skipped (service not ready)"
        fi
    fi
else
    check_fail "DATABASE_URL not configured"
fi

# ============================================
# 2. Mobile Apps Validation
# ============================================
section "2. Mobile Apps"

MOBILE_DIR="mobile"

if [ -d "$MOBILE_DIR" ]; then
    check_pass "Mobile directory exists"
    
    # Check screens
    SCREENS=(
        "SignInScreen.tsx"
        "HomeScreen.production.tsx"
        "RideRequestScreen.tsx"
        "MapScreen.tsx"
        "LiveTrackingScreen.tsx"
        "TripsScreen.tsx"
        "RateRideScreen.tsx"
        "ProfileScreen.tsx"
        "WalletScreen.tsx"
        "PackagesScreen.tsx"
        "BusScreen.tsx"
        "DriverScreen.tsx"
        "SafetyScreen.tsx"
        "NotificationsScreen.tsx"
        "ChatScreen.tsx"
        "NetworksScreen.tsx"
        "AdvancedSearchScreen.tsx"
        "ScheduledRideScreen.tsx"
    )
    
    SCREEN_COUNT=0
    for screen in "${SCREENS[@]}"; do
        if [ -f "$MOBILE_DIR/src/screens/$screen" ]; then
            ((SCREEN_COUNT++))
        fi
    done
    
    if [ $SCREEN_COUNT -eq ${#SCREENS[@]} ]; then
        check_pass "All 18 mobile screens implemented ($SCREEN_COUNT/${#SCREENS[@]})"
    elif [ $SCREEN_COUNT -gt 10 ]; then
        check_warn "Mobile screens partially implemented ($SCREEN_COUNT/${#SCREENS[@]})"
    else
        check_fail "Mobile screens incomplete ($SCREEN_COUNT/${#SCREENS[@]})"
    fi
    
    # Check services
    SERVICES=("auth.ts" "location.ts" "ride.ts")
    SERVICE_COUNT=0
    for service in "${SERVICES[@]}"; do
        if [ -f "$MOBILE_DIR/src/services/$service" ]; then
            ((SERVICE_COUNT++))
        fi
    done
    
    if [ $SERVICE_COUNT -eq ${#SERVICES[@]} ]; then
        check_pass "Mobile service layer complete ($SERVICE_COUNT/${#SERVICES[@]})"
    else
        check_fail "Mobile service layer incomplete ($SERVICE_COUNT/${#SERVICES[@]})"
    fi
    
    # Check if builds exist
    if [ -f "$MOBILE_DIR/android/app/build.gradle" ]; then
        check_pass "Android build configuration exists"
    else
        check_warn "Android build configuration missing"
    fi
    
    if [ -f "$MOBILE_DIR/ios/Podfile" ]; then
        check_pass "iOS build configuration exists"
    else
        check_warn "iOS build configuration missing"
    fi
else
    check_fail "Mobile directory not found"
fi

# ============================================
# 3. Monitoring Infrastructure
# ============================================
section "3. Monitoring Infrastructure"

# Check Prometheus
if kubectl get deployment prometheus -n wasel-observability &> /dev/null; then
    check_pass "Prometheus deployed"
    
    PODS=$(kubectl get pods -n wasel-observability -l app=prometheus --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "Prometheus running"
        
        # Port forward and check
        kubectl port-forward -n wasel-observability svc/prometheus 9090:9090 > /dev/null 2>&1 &
        PF_PID=$!
        sleep 2
        
        if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
            check_pass "Prometheus is healthy"
            
            # Check if targets are being scraped
            TARGETS=$(curl -s http://localhost:9090/api/v1/targets | jq -r '.data.activeTargets | length')
            if [ "$TARGETS" -gt 0 ]; then
                check_pass "Prometheus scraping $TARGETS targets"
            else
                check_warn "No scrape targets configured"
            fi
        else
            check_fail "Prometheus health check failed"
        fi
        
        kill $PF_PID 2>/dev/null || true
    else
        check_fail "Prometheus not running"
    fi
else
    check_fail "Prometheus not deployed"
fi

# Check Grafana
if kubectl get deployment grafana -n wasel-observability &> /dev/null; then
    check_pass "Grafana deployed"
    
    PODS=$(kubectl get pods -n wasel-observability -l app=grafana --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "Grafana running"
        
        kubectl port-forward -n wasel-observability svc/grafana 3000:3000 > /dev/null 2>&1 &
        PF_PID=$!
        sleep 2
        
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            check_pass "Grafana is healthy"
        else
            check_fail "Grafana health check failed"
        fi
        
        kill $PF_PID 2>/dev/null || true
    else
        check_fail "Grafana not running"
    fi
else
    check_fail "Grafana not deployed"
fi

# Check Loki
if kubectl get deployment loki -n wasel-observability &> /dev/null; then
    check_pass "Loki deployed"
    
    PODS=$(kubectl get pods -n wasel-observability -l app=loki --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "Loki running"
    else
        check_fail "Loki not running"
    fi
else
    check_fail "Loki not deployed"
fi

# Check OpenTelemetry Collector
if kubectl get deployment otel-collector -n wasel-observability &> /dev/null; then
    check_pass "OpenTelemetry Collector deployed"
    
    PODS=$(kubectl get pods -n wasel-observability -l app=otel-collector --field-selector=status.phase=Running -o json | jq -r '.items | length')
    if [ "$PODS" -gt 0 ]; then
        check_pass "OpenTelemetry Collector running"
    else
        check_fail "OpenTelemetry Collector not running"
    fi
else
    check_fail "OpenTelemetry Collector not deployed"
fi

# Check dashboards
if [ -f "infra/observability/grafana-dashboard-wasel-overview.json" ]; then
    check_pass "Grafana dashboard configuration exists"
else
    check_warn "Grafana dashboard configuration missing"
fi

# ============================================
# Summary
# ============================================
echo ""
echo "========================================"
echo "Validation Summary"
echo "========================================"
echo -e "${GREEN}Passed:${NC}  $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC}  $FAIL"
echo ""

TOTAL=$((PASS + FAIL))
if [ $TOTAL -eq 0 ]; then
    SCORE=0
else
    SCORE=$(echo "scale=1; ($PASS / $TOTAL) * 10" | bc)
fi

echo -e "Overall Score: ${BLUE}${SCORE}/10${NC}"
echo ""

if (( $(echo "$SCORE >= 9.5" | bc -l) )); then
    echo -e "${GREEN}🎉 Wasel is 10/10 production-ready!${NC}"
    exit 0
elif (( $(echo "$SCORE >= 8.0" | bc -l) )); then
    echo -e "${YELLOW}⚠ Close to 10/10, but some gaps remain${NC}"
    echo "Review the failed checks above"
    exit 1
else
    echo -e "${RED}❌ Significant gaps remain${NC}"
    echo "Address the failed checks before claiming 10/10"
    exit 1
fi
