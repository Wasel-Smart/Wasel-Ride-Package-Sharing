@echo off
REM Wasel | واصل — Build Fix Script (Windows)
REM Automatically fixes the build and verifies it works

echo.
echo 🔧 Wasel Build Fix Script
echo ==========================
echo.

REM Step 1: Install dependencies
echo 📦 Step 1: Installing dependencies...
echo.
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: npm install failed
    exit /b 1
)
echo.
echo ✅ Dependencies installed
echo.

REM Step 2: Type check
echo 🔍 Step 2: Running TypeScript type check...
echo.
call npm run type-check
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Type check failed
    exit /b 1
)
echo.
echo ✅ Type check passed
echo.

REM Step 3: Build
echo 🏗️  Step 3: Building production bundle...
echo.
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Error: Build failed
    exit /b 1
)
echo.
echo ✅ Build completed successfully
echo.

REM Step 4: Verify dist directory
echo 📂 Step 4: Verifying build output...
echo.

if not exist "dist" (
    echo ❌ Error: /dist directory not found
    exit /b 1
)

if not exist "dist\index.html" (
    echo ❌ Error: /dist/index.html not found
    exit /b 1
)

if not exist "dist\assets" (
    echo ❌ Error: /dist/assets directory not found
    exit /b 1
)

echo    ✓ /dist directory exists
echo    ✓ /dist/index.html exists
echo    ✓ /dist/assets directory exists
echo.
echo ✅ Build output verified
echo.

REM Summary
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🎉 SUCCESS! Build is now working!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 🚀 Next Steps:
echo    1. Test the build locally:
echo       npm run preview
echo.
echo    2. Deploy to production:
echo       npm run deploy
echo.
echo    3. Analyze bundle size:
echo       npm run analyze
echo.
echo 📚 Documentation:
echo    • Full details: /BUILD_FIXED.md
echo    • Quick reference: /BUILD_FIX_SUMMARY.md
echo.
pause
