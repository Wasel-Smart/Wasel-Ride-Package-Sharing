@echo off
echo ============================================
echo  Wasel - Fix All Issues and Redeploy
echo ============================================
echo.

cd /d "%~dp0"

echo [1/2] Pushing migrations (including out-of-order, with PostGIS fix)...
npx supabase db push --include-all
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: db push failed. See above for details.
    echo.
    echo Common fixes:
    echo   - If "already exists" errors: these are safe to ignore if tables exist
    echo   - If "relation does not exist": a dependent table is missing
    pause
    exit /b 1
)

echo.
echo [2/2] Redeploying edge function with latest code...
npx supabase functions deploy make-server-0b1f4071 --no-verify-jwt
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Edge function deploy failed.
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Done! 
echo.
echo  NOTE: SUPABASE_SERVICE_ROLE_KEY is injected
echo  automatically by Supabase - do NOT set it
echo  manually (it starts with SUPABASE_ which
echo  is a reserved prefix).
echo.
echo  Your edge function is live. Refresh the app
echo  at localhost:3002 to test the fix.
echo ============================================
pause
