@echo off
setlocal enabledelayedexpansion

echo =====================================================================================
echo ===========================...VERIFYING NOTIFICATION WORKER...=======================
echo =====================================================================================

set NAMESPACE=%NAMESPACE:wasel-production%
if "%NAMESPACE%"=="" set NAMESPACE=wasel-production

echo Checking deployment...
kubectl get deployment notification-worker -n %NAMESPACE%

echo Checking pods...
kubectl get pods -n %NAMESPACE% -l app=notification-worker

echo Checking service...
kubectl get service notification-worker-service -n %NAMESPACE%

echo Checking HPA...
kubectl get hpa notification-worker-hpa -n %NAMESPACE% 2>nul || echo HPA not found (optional)

echo Checking recent events...
kubectl get events -n %NAMESPACE% --field-selector involved-object.name=notification-worker --sort-by='.lastTimestamp' | findstr /C:"notification-worker" | more

echo Checking pod logs...
for /f "delims=" %%i in ('kubectl get pods -n %NAMESPACE% -l app=notification-worker -o jsonpath="{.items[0].metadata.name}" 2^>nul') do set POD=%%i
if defined POD (
    echo Logs for pod: %POD%
    kubectl logs %POD% -n %NAMESPACE% --tail=50
) else (
    echo No pods found
)

echo =====================================================================================
echo ==============================...VERIFICATION COMPLETE...=============================
echo =====================================================================================
