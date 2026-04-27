#!/bin/bash

set -u

BASE_URL="${BASE_URL:-https://YOUR_PROJECT.supabase.co/functions/v1/make-server-0b1f4071}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNED=0

pass() {
  echo -e "   ${GREEN}PASS${NC} - $1"
  PASSED=$((PASSED + 1))
}

fail() {
  echo -e "   ${RED}FAIL${NC} - $1"
  FAILED=$((FAILED + 1))
}

warn() {
  echo -e "   ${YELLOW}WARN${NC} - $1"
  WARNED=$((WARNED + 1))
}

http_status() {
  curl -sS -o /dev/null -w "%{http_code}" "$1"
}

http_body() {
  curl -sS "$1"
}

echo "Wasel backend health check"
echo "Target: $BASE_URL"
echo ""

echo "1. Aggregate health"
HEALTH_STATUS=$(http_status "$BASE_URL/health")
HEALTH_RESPONSE=$(http_body "$BASE_URL/health")
if [ "$HEALTH_STATUS" = "200" ]; then
  pass "/health returned 200"
else
  fail "/health returned $HEALTH_STATUS"
fi

if echo "$HEALTH_RESPONSE" | grep -q '"ok":true' && echo "$HEALTH_RESPONSE" | grep -q '"service":"make-server-0b1f4071"'; then
  pass "/health response includes ok=true and the service name"
else
  fail "/health response did not include the expected contract"
fi

echo ""
echo "2. Component probes"
for component in db auth storage kv; do
  STATUS=$(http_status "$BASE_URL/health/$component")
  RESPONSE=$(http_body "$BASE_URL/health/$component")

  if [ "$STATUS" = "200" ]; then
    pass "/health/$component returned 200"
  else
    fail "/health/$component returned $STATUS"
  fi

  if echo "$RESPONSE" | grep -q "\"component\":\"$component\""; then
    pass "/health/$component identifies the requested component"
  else
    fail "/health/$component did not include component metadata"
  fi
done

KV_RESPONSE=$(http_body "$BASE_URL/health/kv")
if echo "$KV_RESPONSE" | grep -q '"status":"not_configured"'; then
  warn "/health/kv reports no dedicated KV backend, which is acceptable for the current runtime"
fi

echo ""
echo "3. Job catalog"
JOBS_STATUS=$(http_status "$BASE_URL/jobs/status")
JOBS_RESPONSE=$(http_body "$BASE_URL/jobs/status")
if [ "$JOBS_STATUS" = "200" ]; then
  pass "/jobs/status returned 200"
else
  fail "/jobs/status returned $JOBS_STATUS"
fi

if echo "$JOBS_RESPONSE" | grep -q '"available_jobs"'; then
  pass "/jobs/status returned the available_jobs catalog"
else
  fail "/jobs/status did not include available_jobs"
fi

JOB_COUNT=$(echo "$JOBS_RESPONSE" | grep -o '"name"' | wc -l | tr -d ' ')
if [ "$JOB_COUNT" -ge "5" ]; then
  pass "/jobs/status advertised $JOB_COUNT callable job endpoints"
else
  fail "/jobs/status only advertised $JOB_COUNT job endpoints"
fi

if echo "$JOBS_RESPONSE" | grep -q '"enabled":false'; then
  warn "/jobs/status reports one or more gated jobs as disabled; check worker secrets and migration endpoint flags"
fi

echo ""
echo "Results"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Warnings: $WARNED"

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}Backend contract check passed.${NC}"
  exit 0
fi

echo -e "${RED}Backend contract check failed.${NC}"
exit 1
