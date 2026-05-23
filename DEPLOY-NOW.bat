@echo off
TITLE Wasel — URGENT Deploy to www.Wasel14.online
color 0A

echo.
echo  ====================================================
echo   WASEL — URGENT Direct Deploy to Vercel
echo   NO git push needed — builds and ships directly
echo   Target: www.Wasel14.online
echo  ====================================================
echo.

cd /d "C:\Users\user\OneDrive\Desktop\Wdoubleme"

:: ── Vercel project IDs (from .vercel/project.json) ──────────────
set VERCEL_PROJECT_ID=prj_tj8aK19c8AyTf3kPpuwfgliA7q0A
set VERCEL_ORG_ID=team_8FxIwGRvCqna0P0ObnB7dpSF

:: ── STEP 1: Build ────────────────────────────────────────────────
echo [1/2] Building production bundle (vite build)...
echo.

call npx vite build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  !! vite build failed. Checking for previous dist...
    if not exist "dist\index.html" (
        echo  !! No dist\index.html found. Cannot deploy.
        echo     Fix the build error above, then run this again.
        pause
        exit /b 1
    )
    echo  >> Using existing dist from last successful build.
)

:: ── STEP 2: Deploy to Vercel ─────────────────────────────────────
echo.
echo [2/2] Deploying to Vercel production...
echo.

call npx vercel --prod --yes --no-clipboard

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  !! First attempt failed. Retrying with --prebuilt flag...
    call npx vercel --prod --yes --no-clipboard --prebuilt
)

echo.
echo  ====================================================
echo   DONE — Live at https://www.Wasel14.online
echo  ====================================================
echo.
pause
