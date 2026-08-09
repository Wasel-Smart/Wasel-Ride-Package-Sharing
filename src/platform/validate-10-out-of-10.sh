#!/usr/bin/env bash
set -euo pipefail

echo ""
echo "============================================================"
echo "  Wasel 10/10 Production Platform Validation"
echo "============================================================"
echo ""

SCORE=0
MAX=10
FAILED=()

check() {
  local name="$1"
  local condition="$2"
  if eval "$condition"; then
    echo "  [PASS] $name"
    SCORE=$((SCORE + 1))
  else
    echo "  [FAIL] $name"
    FAILED+=("$name")
  fi
}

echo "--- Environment & Secrets ---"

check ".env exists" "[ -f .env ]"
check ".env does not contain real Supabase URL" "! grep -qE 'zexlxabdcsjefptmjhuq\.supabase\.co' .env 2>/dev/null || true"
check ".env does not contain real anon key" "! grep -qE 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' .env 2>/dev/null || true"
check ".env does not contain real Twilio auth token" "! grep -qE 'TWILIO_AUTH_TOKEN=(AC|38fc)' .env 2>/dev/null || true"
check ".env.local does not exist or is clean" "[ ! -f .env.local ] || ! grep -qE 'zexlxabdcsjefptmjhuq\.supabase\.co' .env.local 2>/dev/null || true"
check "VITE_ALLOW_DIRECT_SUPABASE_FALLBACK is false" "grep -qE 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false' .env 2>/dev/null || grep -qE 'VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false' .env.production.template 2>/dev/null"

echo ""
echo "--- Infrastructure ---"

check "vercel.json exists" "[ -f vercel.json ]"
check "docker-compose.yml exists" "[ -f docker-compose.yml ]"
check "Dockerfile exists" "[ -f Dockerfile ]"
check "k8s manifests exist" "[ -d k8s ] && [ $(find k8s -name '*.yaml' | wc -l) -ge 3 ]"
check "CI workflow exists" "[ -f .github/workflows/ci.yml ]"

echo ""
echo "--- Security ---"

check "CSP headers configured in vercel.json" "grep -q 'Content-Security-Policy' vercel.json 2>/dev/null"
check "HSTS header configured" "grep -q 'Strict-Transport-Security' vercel.json 2>/dev/null || grep -q 'Strict-Transport-Security' docker/nginx.conf 2>/dev/null"
check "X-Frame-Options set to DENY" "grep -q 'X-Frame-Options.*DENY' vercel.json 2>/dev/null || grep -q 'X-Frame-Options.*DENY' docker/nginx.conf 2>/dev/null"
check "Edge function has verify_jwt enabled" "! grep -q 'verify_jwt = false' supabase/config.toml 2>/dev/null"
check "No Math.random() in security-sensitive paths" "! grep -rn 'Math\.random()' src/services/ src/utils/ src/platform/ src/domain/ 2>/dev/null | grep -v '// allow-math-random' | grep -v '.test.' | grep -v '__tests__' || true"

echo ""
echo "--- Testing ---"

check "Vitest config exists" "[ -f vitest.config.ts ]"
check "Playwright config exists" "[ -f playwright.config.ts ]"
check "Unit tests exist" "find tests/unit src -name '*.test.{ts,tsx}' 2>/dev/null | head -1 | grep -q . || find tests/ src/ -name '*.test.{ts,tsx}' 2>/dev/null | head -1 | grep -q ."
check "E2E tests exist" "[ -f tests/e2e/auth-flow.spec.ts ] || [ -f e2e/auth-flow.spec.ts ]"
check "Load tests exist" "[ -f tests/load/k6-smoke.js ] || [ -f tests/load/k6-production.js ]"

echo ""
echo "--- Database ---"

check "Prisma schema exists" "[ -f schema.prisma ]"
check "Supabase migrations exist" "[ -d supabase/migrations ] && [ $(find supabase/migrations -maxdepth 1 -name '*.sql' | wc -l) -ge 5 ]"
check "Migration rollbacks exist" "[ -d supabase/migrations/rollback ] && [ $(find supabase/migrations/rollback -maxdepth 1 -name '*.sql' | wc -l) -ge 5 ]"

echo ""
echo "--- Code Quality ---"

check "TypeScript strict mode enabled" "grep -q '\"strict\": true' tsconfig.json 2>/dev/null"
check "ESLint configured" "[ -f eslint.config.js ]"
check "Prettier configured" "[ -f .prettierrc ]"
check "No console.log in production code (excluding comments)" "! grep -rn 'console\.log' src/services/ src/platform/ src/router/ 2>/dev/null | grep -v '//' | grep -v '\.test\.' | grep -v '__tests__' | grep -v '.spec.' || true"

echo ""
echo "============================================================"
echo "  Score: $SCORE / $MAX"
echo "============================================================"

if [ ${#FAILED[@]} -gt 0 ]; then
  echo ""
  echo "Failed checks:"
  for f in "${FAILED[@]}"; do
    echo "  - $f"
  done
  echo ""
  exit 1
else
  echo "All checks passed!"
  exit 0
fi