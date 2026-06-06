#!/bin/bash
set -e

# Wasel Load Testing & SLO Validation Script
# Executes k6 load tests and validates SLO compliance

echo "📊 Wasel Production Load Testing"
echo "=================================="

TEST_TYPE=${1:-smoke}
TARGET_URL=${2:-https://wasel.jo}

if ! command -v k6 &> /dev/null; then
    echo "❌ k6 not found. Installing..."
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    else
        echo "Please install k6 manually: https://k6.io/docs/get-started/installation/"
        exit 1
    fi
fi

# Set environment variables
export API_URL=$TARGET_URL
export K6_PROJECT_ID=${K6_PROJECT_ID:-wasel-production}

# Create results directory
mkdir -p test-results/load

case $TEST_TYPE in
    smoke)
        echo "🔥 Running smoke test (30s, 10 VUs)..."
        k6 run tests/load/k6-smoke.js \
            --out json=test-results/load/smoke-results.json \
            --summary-export=test-results/load/smoke-summary.json
        ;;
    
    production)
        echo "🚀 Running production load test (18m, up to 500 VUs)..."
        k6 run tests/load/k6-production.js \
            --out json=test-results/load/production-results.json \
            --summary-export=test-results/load/production-summary.json
        ;;
    
    stress)
        echo "💥 Running stress test (pushing to failure)..."
        k6 run tests/load/k6-production.js \
            --stage "1m:10,3m:50,5m:100,5m:500,5m:1000,2m:2000,2m:0" \
            --out json=test-results/load/stress-results.json \
            --summary-export=test-results/load/stress-summary.json
        ;;
    
    soak)
        echo "⏱️  Running soak test (2 hours sustained load)..."
        k6 run tests/load/k6-production.js \
            --stage "5m:50,2h:50,5m:0" \
            --out json=test-results/load/soak-results.json \
            --summary-export=test-results/load/soak-summary.json
        ;;
    
    *)
        echo "❌ Unknown test type: $TEST_TYPE"
        echo "Valid types: smoke, production, stress, soak"
        exit 1
        ;;
esac

# Validate SLO compliance
echo ""
echo "📈 Validating SLO Compliance..."

if [ -f "test-results/load/${TEST_TYPE}-summary.json" ]; then
    node scripts/validate-slo-compliance.mjs test-results/load/${TEST_TYPE}-summary.json
else
    echo "⚠️  Summary file not found, skipping SLO validation"
fi

echo ""
echo "✅ Load testing complete!"
echo ""
echo "Results: test-results/load/${TEST_TYPE}-results.json"
echo "Summary: test-results/load/${TEST_TYPE}-summary.json"
