#!/bin/bash

# Deploy to Vercel with deployment confirmation and health checks
# Usage: ./deploy.sh [--prod] [--force]

set -e

PROD=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --prod)
      PROD=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI not found. Install with: npm install -g vercel"
  exit 1
fi

# Check if logged in
if ! vercel projects list &> /dev/null; then
  echo "❌ Not logged into Vercel. Run: vercel login"
  exit 1
fi

echo "🚀 Starting Vercel deployment..."

# Build locally first to catch errors early
echo "📦 Building locally..."
if ! vercel build; then
  echo "❌ Local build failed. Fix errors and try again."
  exit 1
fi

# Deploy
if [ "$PROD" = true ]; then
  echo "⚠️  Deploying to PRODUCTION"
  read -p "Are you sure? Type 'yes' to continue: " confirm
  if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelled"
    exit 1
  fi
  
  DEPLOY_CMD="vercel --prod"
  if [ "$FORCE" = true ]; then
    DEPLOY_CMD="$DEPLOY_CMD --force"
  fi
else
  echo "📤 Deploying to preview environment..."
  DEPLOY_CMD="vercel"
fi

# Run deployment
$DEPLOY_CMD || {
  echo "❌ Deployment failed"
  exit 1
}

# Get the latest deployment URL
DEPLOYMENT_URL=$(vercel ls | head -2 | tail -1 | awk '{print $2}')

echo "✅ Deployment successful!"
echo "🔗 URL: $DEPLOYMENT_URL"

# Wait for deployment to be ready
echo "⏳ Waiting for deployment to be ready..."
for i in {1..30}; do
  if curl -s "$DEPLOYMENT_URL" > /dev/null 2>&1; then
    echo "✓ Deployment is live"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "⚠️  Deployment took longer than expected, but may be live"
  fi
  sleep 2
done

# Health check
echo "🏥 Running health checks..."
if [ -f "api/health.ts" ] || [ -f "api/health.js" ]; then
  HEALTH_URL="$DEPLOYMENT_URL/api/health"
  if curl -s "$HEALTH_URL" | grep -q "operational"; then
    echo "✓ Health check passed"
  else
    echo "⚠️  Health check returned unexpected status"
  fi
fi

echo ""
echo "✨ Deployment complete!"
echo "📊 View logs: vercel logs --follow --tail"
echo "📈 View analytics: $DEPLOYMENT_URL"
