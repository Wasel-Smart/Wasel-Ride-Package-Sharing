#!/bin/bash

# Wasel Backend Health Check
# Version: 2.0.0
# Date: 2026-07-02

echo "╔════════════════════════════════════════════════════╗"
echo "║  🧪 WASEL BACKEND HEALTH CHECK v2.0.0             ║"
echo "║  Robust, efficient, and maintainable checks.      ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Configuration
BASE_URL="https://api.wasel14.online/v1"
EXPECTED_VERSION="5.0.0"
MIN_JOB_COUNT=5

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
declare -A results
FAILED_COUNT=0

# Helper function for running tests
run_test() {
  local name="$1"
  local command="$2"
  local expected="$3"
  local actual

  echo -n "🧪 Running test: $name..."
  
  # Execute command and capture output
  actual=$(eval "$command")

  if [[ "$actual" == "$expected" ]]; then
    echo -e " ${GREEN}PASS${NC}"
    results["$name"]="PASS"
  else
    echo -e " ${RED}FAIL${NC}"
    results["$name"]="FAIL"
    results["${name}_details"]="Expected: '$expected', Got: '$actual'"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
}

# --- Pre-flight checks ---
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ ERROR: 'jq' is not installed. Please install it to run this script.${NC}"
    echo "   (e.g., 'sudo apt-get install jq' or 'brew install jq')"
    exit 1
fi

echo "🌐 Testing against: $BASE_URL"
echo "═══════════════════════════════════════════════════"

# --- Fetch data once ---
echo "📡 Fetching data from endpoints..."
health_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
health_body=$(echo "$health_response" | sed '$d')
health_status=$(echo "$health_response" | tail -n1)

jobs_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/jobs/status")
jobs_body=$(echo "$jobs_response" | sed '$d')

cleanup_response=$(curl -s -X POST "$BASE_URL/jobs/cleanup")

profile_status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/profile/test-user-123")
echo "✅ Data fetched."
echo ""

# --- Run tests ---

# Health Endpoint
run_test "Health endpoint status" "echo $health_status" "200"
run_test "Health response content" "echo '$health_body' | jq -r '.status'" "ok"
run_test "Server version" "echo '$health_body' | jq -r '.version'" "$EXPECTED_VERSION"

# Jobs Endpoint
run_test "Available jobs count" "[[ $(echo "$jobs_body" | jq '.available_jobs | length') -ge $MIN_JOB_COUNT ]]" "true"

# Job Execution
run_test "Cleanup job execution" "echo '$cleanup_response' | jq -r '.success'" "true"

# Other Endpoints
run_test "Profile endpoint accessibility" "[[ '$profile_status' == '200' || '$profile_status' == '404' ]]" "true"

# --- Report results ---
echo ""
echo "═══════════════════════════════════════════════════"
echo "📊 TEST RESULTS:"
echo ""

TOTAL_TESTS=${#results[@]}
if [[ $FAILED_COUNT -gt 0 ]]; then
  TOTAL_TESTS=$((TOTAL_TESTS / 2)) # Each failure adds a 'details' key
fi
PASSED_COUNT=$((TOTAL_TESTS - FAILED_COUNT))

if [ $FAILED_COUNT -eq 0 ]; then
  echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ✅ ALL TESTS PASSED! ($PASSED_COUNT/$TOTAL_TESTS)            ║${NC}"
  echo -e "${GREEN}║  🎉 Server is production-ready!           ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
  echo ""
  echo "✅ SERVER STATUS: OPERATIONAL"
  echo "✅ READY TO LAUNCH: YES"
else
  echo -e "${RED}╔═══════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  ❌ $FAILED_COUNT/$TOTAL_TESTS TESTS FAILED                  ║${NC}"
  echo -e "${RED}╚═══════════════════════════════════════════╝${NC}"
  echo ""
  echo " Failure Details:"
  for key in "${!results[@]}"; do
    if [[ $key == *"_details" ]]; then
      test_name=${key%_details}
      echo -e "   • ${YELLOW}$test_name${NC}: ${results[$key]}"
    fi
  done
  echo ""
  echo "⚠️  SERVER STATUS: UNHEALTHY"
  echo "Common issues:"
  echo "   • Cache not cleared: Wait 60-90 seconds and re-run."
  echo "   • Wrong URL/Version: Update BASE_URL or EXPECTED_VERSION in this script."
  echo "   • Server not deployed or has an error: Check your Supabase function logs."
fi

echo ""
echo "═══════════════════════════════════════════════════"
echo "For more help, see:"
echo "   📄 /docs/TROUBLESHOOTING_DENO_CRON.md"
echo "   📄 /docs/architecture.md"
echo ""

exit $FAILED_COUNT
