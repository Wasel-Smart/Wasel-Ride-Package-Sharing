#!/bin/bash
set -e

# Wasel Load Testing & SLO Validation Script
# Executes k6 load tests and validates SLO compliance.

echo "Wasel Production Load Testing"
echo "=================================="

TEST_TYPE=${1:-smoke}
TARGET_URL=${2:-https://wasel14.online}

K6_BIN=${K6_BIN:-}
K6_BIN=$(command -v k6 || command -v k6.exe || echo "")

if [[ -z "$K6_BIN" ]]; then
    echo "ERROR: k6 is not installed or not in your PATH."
    echo "Please install k6 to run load tests: https://k6.io/docs/get-started/installation/"
    echo "Example (Windows): winget install k6.k6"
    echo "Example (macOS):   brew install k6"
    echo "Example (Linux):   sudo apt-get install k6"
    exit 1
fi

NODE_BIN=${NODE_BIN:-}
NODE_BIN=$(command -v node || command -v node.exe || echo "")

if [[ -z "$NODE_BIN" ]]; then
    echo "ERROR: Node.js is not available in this shell PATH."
    exit 1
fi
# Set environment variables
export API_URL=$TARGET_URL
export BASE_URL=$TARGET_URL
export K6_PROJECT_ID=${K6_PROJECT_ID:-wasel-production}

# Create results directory
mkdir -p test-results/load

case $TEST_TYPE in
    smoke)
        echo "Running smoke test (30s, 10 VUs)..."
        "$K6_BIN" run \
            -e BASE_URL="$TARGET_URL" \
            -e API_URL="$TARGET_URL" \
            -e K6_PROJECT_ID="$K6_PROJECT_ID" \
            tests/load/k6-smoke.js \
            --out json=test-results/load/smoke-results.json \
            --summary-export=test-results/load/smoke-summary.json
        ;;

    production)
        echo "Running production load test (18m, up to 500 VUs)..."
        "$K6_BIN" run \
            -e BASE_URL="$TARGET_URL" \
            -e API_URL="$TARGET_URL" \
            -e K6_PROJECT_ID="$K6_PROJECT_ID" \
            tests/load/k6-production.js \
            --out json=test-results/load/production-results.json \
            --summary-export=test-results/load/production-summary.json
        ;;

    stress)
        echo "Running stress test (pushing to failure)..."
        "$K6_BIN" run \
            -e BASE_URL="$TARGET_URL" \
            -e API_URL="$TARGET_URL" \
            -e K6_PROJECT_ID="$K6_PROJECT_ID" \
            tests/load/k6-production.js \
            --stage "1m:10,3m:50,5m:100,5m:500,5m:1000,2m:2000,2m:0" \
            --out json=test-results/load/stress-results.json \
            --summary-export=test-results/load/stress-summary.json
        ;;

    soak)
        echo "Running soak test (2 hours sustained load)..."
        "$K6_BIN" run \
            -e BASE_URL="$TARGET_URL" \
            -e API_URL="$TARGET_URL" \
            -e K6_PROJECT_ID="$K6_PROJECT_ID" \
            tests/load/k6-production.js \
            --stage "5m:50,2h:50,5m:0" \
            --out json=test-results/load/soak-results.json \
            --summary-export=test-results/load/soak-summary.json
        ;;

    *)
        echo "Unknown test type: $TEST_TYPE"
        echo "Valid types: smoke, production, stress, soak"
        exit 1
        ;;
esac

# Validate SLO compliance
echo ""
echo "Validating SLO Compliance..."

if [ -f "test-results/load/${TEST_TYPE}-summary.json" ]; then
    "$NODE_BIN" scripts/validate-slo-compliance.mjs test-results/load/${TEST_TYPE}-summary.json
else
    echo "Summary file not found, skipping SLO validation"
fi

echo ""
echo "Load testing complete."
echo ""
echo "Results: test-results/load/${TEST_TYPE}-results.json"
echo "Summary: test-results/load/${TEST_TYPE}-summary.json"
