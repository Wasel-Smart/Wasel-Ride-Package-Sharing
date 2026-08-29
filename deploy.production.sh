#!/usr/bin/env sh

# abort on errors
set -e

echo '====================================================================================='
echo '=============================...DEPLOYING PRODUCTION...============================='
echo '====================================================================================='

npm run build

echo '====================================================================================='
echo '=====================================...BUILD...====================================='
echo '====================================================================================='

# navigate into the build output directory

rm -rf deploy
mkdir deploy
cp -r ./dist ./deploy/dist
cp -r ./package.json ./deploy/package.json
cp -r ./package-lock.json ./deploy/package-lock.json
# .env.production is consumed at build time by Vite (production mode); copy it
# into the deploy payload only when it exists so the script does not fail.
if [ -f .env.production ]; then
  cp -r .env.production ./deploy/.env
fi
cd deploy

git init
git add -A
git commit -m 'deploy'

echo '====================================================================================='
echo '==================================...PUSHING GIT...=================================='
echo '====================================================================================='
git push -f "${DEPLOY_REMOTE:-origin}" master
cd -

rm -rf deploy
rm -rf dist

green=$(tput setaf 2)
reset=$(tput sgr0)
now=$(date +"%T")

echo "${green}====================================================================================="
echo "${green}=======================...DEPLOY SUCCESS PRODUCTION AT $now...======================"
echo "${green}=====================================================================================${reset}"