#!/bin/bash

# Troubleshoot Vercel deployment issues
# Usage: ./troubleshoot.sh [--verbose]

VERBOSE=false

if [ "$1" = "--verbose" ]; then
  VERBOSE=true
fi

echo "🔍 Vercel Deployment Troubleshooter"
echo "===================================="
echo ""

# Check 1: Vercel CLI
echo "✓ Checking Vercel CLI installation..."
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found"
  echo "   Fix: npm install -g vercel"
  exit 1
else
  VERCEL_VERSION=$(vercel --version)
  echo "   ✓ Vercel CLI: $VERCEL_VERSION"
fi

# Check 2: Authentication
echo ""
echo "✓ Checking authentication..."
if vercel projects list &> /dev/null; then
  echo "   ✓ Authenticated with Vercel"
else
  echo "❌ Not authenticated with Vercel"
  echo "   Fix: vercel login"
  exit 1
fi

# Check 3: Project Link
echo ""
echo "✓ Checking project link..."
if [ -f ".vercel/project.json" ]; then
  PROJECT_NAME=$(jq -r '.projectId' .vercel/project.json 2>/dev/null || echo "unknown")
  echo "   ✓ Project linked: $PROJECT_NAME"
else
  echo "⚠️  No .vercel/project.json found"
  echo "   Fix: vercel link"
fi

# Check 4: Package Manager
echo ""
echo "✓ Checking package manager..."
if [ -f "package-lock.json" ]; then
  echo "   ✓ Using npm"
elif [ -f "pnpm-lock.yaml" ]; then
  echo "   ✓ Using pnpm"
elif [ -f "yarn.lock" ]; then
  echo "   ✓ Using yarn"
else
  echo "❌ No package lock file found"
fi

# Check 5: Dependencies
echo ""
echo "✓ Checking dependencies..."
if npm ls &> /dev/null; then
  echo "   ✓ Dependencies valid"
else
  echo "❌ Dependency issues found"
  echo "   Fix: npm install"
fi

# Check 6: Environment Variables
echo ""
echo "✓ Checking environment variables..."
ENV_COUNT=$(vercel env list 2>/dev/null | wc -l)
if [ "$ENV_COUNT" -gt 1 ]; then
  echo "   ✓ $((ENV_COUNT - 1)) environment variables configured"
  
  if [ "$VERBOSE" = true ]; then
    echo "   Variables:"
    vercel env list | tail -n +2 | while read line; do
      VAR_NAME=$(echo "$line" | awk '{print $1}')
      echo "     - $VAR_NAME"
    done
  fi
else
  echo "   ⚠️  No environment variables configured"
fi

# Check 7: Build Configuration
echo ""
echo "✓ Checking build configuration..."
if [ -f "vercel.json" ]; then
  BUILD_CMD=$(jq -r '.buildCommand // "npm run build"' vercel.json)
  OUTPUT_DIR=$(jq -r '.outputDirectory // "dist"' vercel.json)
  echo "   ✓ vercel.json found"
  echo "     Build command: $BUILD_CMD"
  echo "     Output directory: $OUTPUT_DIR"
else
  echo "   ℹ️  No vercel.json found (using defaults)"
fi

# Check 8: Build Test
echo ""
echo "✓ Testing local build..."
if vercel build &> /tmp/build.log; then
  echo "   ✓ Build succeeded"
else
  echo "❌ Build failed"
  echo "   First 20 lines of error:"
  head -20 /tmp/build.log | sed 's/^/     /'
fi

# Check 9: Recent Deployments
echo ""
echo "✓ Checking recent deployments..."
FAILED=$(vercel ls --json 2>/dev/null | jq '[.[] | select(.state == "ERROR")] | length' 2>/dev/null || echo "0")
if [ "$FAILED" -gt 0 ]; then
  echo "❌ Found $FAILED failed deployments in last 50"
  echo "   Recent deployments:"
  vercel ls | head -5 | sed 's/^/     /'
else
  LATEST=$(vercel ls --json 2>/dev/null | jq -r '.[0].state' 2>/dev/null || echo "unknown")
  echo "   ✓ Latest deployment: $LATEST"
fi

# Check 10: Disk Space (for builds)
echo ""
echo "✓ Checking disk space..."
AVAILABLE=$(df -h . | tail -1 | awk '{print $4}')
echo "   ✓ Available: $AVAILABLE"

echo ""
echo "===================================="
echo "✅ Troubleshooting complete"
echo ""
echo "Common issues & fixes:"
echo "  • Build fails: Check vercel.json buildCommand"
echo "  • Env vars missing: Verify in Vercel dashboard"
echo "  • Deploy hangs: Check for infinite loops or large files"
echo "  • 404 on deployment: Verify outputDirectory"
echo ""
echo "For more help: https://vercel.com/docs"
