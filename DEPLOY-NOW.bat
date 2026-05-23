@echo off
TITLE Wasel — DEPLOY to www.Wasel14.online
color 0A

echo.
echo  ====================================================
echo   WASEL — Full Build + Deploy to www.Wasel14.online
echo  ====================================================
echo.

cd /d "C:\Users\user\OneDrive\Desktop\Wdoubleme"

set VERCEL_PROJECT_ID=prj_tj8aK19c8AyTf3kPpuwfgliA7q0A
set VERCEL_ORG_ID=team_8FxIwGRvCqna0P0ObnB7dpSF

:: ── STEP 1: Full production build (tsc + vite) ───────────────────
echo [1/2] Running npm run build...
echo.

call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  !! BUILD FAILED — fix errors above and run again.
    pause
    exit /b 1
)

echo.
echo  Build SUCCESS. Deploying to Vercel...
echo.

:: ── STEP 2: Deploy to Vercel production ──────────────────────────
echo [2/2] Deploying to www.Wasel14.online...
echo.

call npx vercel --prod --yes --no-clipboard

echo.
echo  ====================================================
echo   LIVE at https://www.Wasel14.online
echo  ====================================================
echo.
pause
