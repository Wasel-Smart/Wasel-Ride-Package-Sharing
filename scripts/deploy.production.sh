#!/usr/bin/env sh

set -e

echo '====================================================================================='
echo '============================= DEPLOYING PRODUCTION (Blue-Green) ===================='
echo '====================================================================================='

VERSION=$(node -p "require('./package.json').version")
TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
DEPLOY_ID="v${VERSION}-${TIMESTAMP}"

echo "Deploy ID: ${DEPLOY_ID}"

npm run build

echo '====================================================================================='
echo '=====================================...BUILD...====================================='
echo '====================================================================================='

rm -rf deploy
mkdir -p deploy
cp -r ./dist ./deploy/dist
cp -r ./package.json ./deploy/package.json
cp -r ./package-lock.json ./deploy/package-lock.json
cp -r .env.production ./deploy/.env

cd deploy

git init
git add -A
git commit -m "deploy: ${DEPLOY_ID}"

echo '====================================================================================='
echo '================================..PUSHING GIT...=================================='
echo '====================================================================================='
git push -f "${DEPLOY_REMOTE:-origin}" master

echo '====================================================================================='
echo '=========================...DEPLOYING TO K8S...==================================='
echo '====================================================================================='

kubectl set image deployment/wasel-web wasel-web=wasel.azurecr.io/wasel-web:"${DEPLOY_ID}" -n wasel || true

echo '====================================================================================='
echo '=========================...RUNNING HEALTH CHECKS...==============================='
echo '====================================================================================='

MAX_RETRIES=30
RETRY_COUNT=0
HEALTHY=false

until [ $RETRY_COUNT -ge $MAX_RETRIES ]; do
  RESPONSE=$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:8080/health 2>/dev/null || echo "000")
  if [ "$RESPONSE" = "200" ]; then
    HEALTHY=true
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Health check attempt ${RETRY_COUNT}/${MAX_RETRIES} failed (HTTP ${RESPONSE}), retrying in 5s..."
  sleep 5
done

if [ "$HEALTHY" = false ]; then
  echo 'ERROR: Health checks failed after 150 seconds. Rolling back...'
  kubectl rollout undo deployment/wasel-web -n wasel || true
  exit 1
fi

echo '====================================================================================='
echo '=========================...DEPLOY SUCCESS...======================================'
echo "====================================================================================="
echo "  Version: ${DEPLOY_ID}"
echo "  Health:  PASS"
echo "  Time:    $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "====================================================================================="