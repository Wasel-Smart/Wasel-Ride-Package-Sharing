@echo off
TITLE Wasel — Deploy to wasel14.online
color 0A

echo.
echo  ============================================================
echo   WASEL — Deploy GitHub repo to www.Wasel14.online
echo   Source : github.com/Wasel-Smart/Wasel-Ride-Package-Sharing
echo   Target : www.Wasel14.online (via Vercel)
echo  ============================================================
echo.

cd /d "C:\Users\user\OneDrive\Desktop\Wdoubleme"

:: ── STEP 1: make sure the correct remote exists ─────────────────
echo [1/4] Setting up GitHub remote...

git remote get-url github-main >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Adding remote "github-main" ...
    git remote add github-main https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing.git
) else (
    echo Remote "github-main" already exists — updating URL to be safe...
    git remote set-url github-main https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing.git
)

:: ── STEP 2: stage all v9+ improvement files ──────────────────────
echo.
echo [2/4] Staging changes...
git add src\styles\wasel-improvements.css
git add src\styles\globals.css
git add src\features\home\WorldClassHomePage.tsx
git add src\features\home\sections\HomePageStyles.tsx
git add src\features\home\sections\QuickActionsSection.tsx

:: Check if there is anything new to commit
git diff --cached --quiet
if %ERRORLEVEL% EQU 0 (
    echo Nothing new to commit — all changes already committed.
) else (
    echo Committing...
    git commit -m "feat: quality lift v9+ — mobile responsiveness, brand consistency, flow polish"
)

:: ── STEP 3: push to the correct GitHub repo (master branch) ──────
echo.
echo [3/4] Pushing to github.com/Wasel-Smart/Wasel-Ride-Package-Sharing ...
echo       (this triggers GitHub Actions -> Vercel -> www.Wasel14.online)
echo.

git push github-main HEAD:master

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  --------------------------------------------------------
    echo   Push failed. GitHub may need credentials.
    echo   Try running this manually in your terminal:
    echo.
    echo   git push github-main HEAD:master
    echo  --------------------------------------------------------
    pause
    exit /b 1
)

:: ── STEP 4: done ─────────────────────────────────────────────────
echo.
echo  ============================================================
echo   [4/4] DONE!
echo.
echo   GitHub Actions is now building and deploying.
echo   Your site will be live in ~2-3 minutes at:
echo   https://www.Wasel14.online
echo.
echo   Watch the live pipeline at:
echo   https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/actions
echo  ============================================================
echo.
pause
