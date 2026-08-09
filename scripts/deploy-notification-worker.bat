@echo off
setlocal enabledelayedexpansion

echo =====================================================================================
echo ===========================...DEPLOYING NOTIFICATION WORKER...=======================
echo =====================================================================================

set REGISTRY=%REGISTRY:wasel.azurecr.io%
if "%REGISTRY%"=="" set REGISTRY=wasel.azurecr.io
set VERSION=%VERSION%
if "%VERSION%"=="" set VERSION=latest
set NAMESPACE=%NAMESPACE%
if "%NAMESPACE%"=="" set NAMESPACE=wasel-production
set IMAGE=%REGISTRY%/notification-worker:%VERSION%

echo Building notification worker...
docker build -t %IMAGE% -t %REGISTRY%/notification-worker:latest -f Dockerfile .

echo Pushing notification worker image...
docker push %IMAGE%
docker push %REGISTRY%/notification-worker:latest

echo Updating Kubernetes manifests...
powershell -Command "(Get-Content notification-worker.yaml) -replace 'wasel.azurecr.io/notification-worker:latest', '%IMAGE%' | Set-Content notification-worker.yaml"

echo Deploying to Kubernetes...
kubectl apply -f notification-worker.yaml -n %NAMESPACE%

echo Verifying deployment...
kubectl rollout status deployment/notification-worker -n %NAMESPACE% --timeout=300s
kubectl get pods -n %NAMESPACE% -l app=notification-worker

echo =====================================================================================
echo ==============================...DEPLOY COMPLETE...==================================
echo =====================================================================================
