#!/bin/bash
set -e

# Wasel Load Testing & SLO Validation Script
# Executes k6 load tests and validates SLO compliance.

echo "Wasel Production Load Testing"
echo "=================================="

TEST_TYPE=${1:-smoke}
TARGET_URL=${2:-https://wasel14.online}

K6_BIN=${K6_BIN:-}

if [[ -z "$K6_BIN" ]]; then
    if command -v k6 &> /dev/null; then
        K6_BIN=k6
    elif command -v k6.exe &> /dev/null; then
        K6_BIN=k6.exe
    fi
fi

if [[ -z "$K6_BIN" ]]; then
    echo "k6 not found. Installing..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    elif command -v apt-get &> /dev/null; then
        sudo gpg -k
        sudo mkdir -p /usr/share/keyrings /etc/apt/sources.list.d
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install k6
    elif [[ "$OSTYPE" == "msys"* || "$OSTYPE" == "cygwin"* || "$OS" == "Windows_NT" ]] || command -v powershell.exe &> /dev/null || command -v cmd.exe &> /dev/null; then
        if command -v winget.exe &> /dev/null; then
            winget.exe install --id k6.k6 --source winget --accept-package-agreements --accept-source-agreements
        elif command -v choco.exe &> /dev/null; then
            choco.exe install k6 -y
        elif command -v choco &> /dev/null; then
            choco install k6 -y
        elif command -v scoop &> /dev/null; then
            scoop install k6
        else
            echo "Install k6 with one of these commands, then rerun npm run load:smoke:"
            echo "  winget install --id k6.k6 --source winget"
            echo "  choco install k6 -y"
            echo "  scoop install k6"
            exit 1
        fi
    else
        echo "Please install k6 manually: https://k6.io/docs/get-started/installation/"
        exit 1
    fi

    if command -v k6 &> /dev/null; then
        K6_BIN=k6
    elif command -v k6.exe &> /dev/null; then
        K6_BIN=k6.exe
    fi

    if [[ -z "$K6_BIN" ]]; then
        echo "k6 installation completed, but k6 is not available in this shell PATH yet."
        echo "Open a new terminal and rerun npm run load:smoke."
        exit 1
    fi
fi

NODE_BIN=${NODE_BIN:-}

if [[ -z "$NODE_BIN" ]]; then
    if command -v node &> /dev/null; then
        NODE_BIN=node
    elif command -v node.exe &> /dev/null; then
        NODE_BIN=node.exe
    else
        echo "Node.js is not available in this shell PATH."
        exit 1
    fi
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
