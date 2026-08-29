@echo off
REM =============================================================================
REM Wasel — OneDrive Sync Exclusion Setup
REM =============================================================================
REM This script configures the project folder to be excluded from OneDrive sync.
REM OneDrive sync exposes local secrets (.env, service account keys, etc.) to
REM cloud storage, which is a credential leakage risk.
REM
REM Usage: Run this script once from the project root directory.
REM Requires Administrator privileges for the attrib command.
REM =============================================================================

echo [Wasel] Configuring OneDrive sync exclusion...

REM Create a marker file that OneDrive respects for sync exclusion
if not exist ".nosync" (
    echo [Wasel] Creating .nosync marker file...
    echo This folder is excluded from OneDrive sync. Do not delete. > .nosync
)

REM Set the hidden + system attribute so OneDrive skips this folder
echo [Wasel] Applying file attributes...
attrib +h +s ".nosync" /S /L

REM Also mark the .env.vercel.local file as hidden+system if it exists
if exist ".env.vercel.local" (
    echo [Wasel] Marking .env.vercel.local as excluded from sync...
    attrib +h +s ".env.vercel.local"
    echo [WARNING] .env.vercel.local contains a real Vercel OIDC token.
    echo [WARNING] Consider deleting it and re-authenticating with Vercel when needed:
    echo [WARNING]   vercel login
    echo [WARNING]   vercel link
)

echo.
echo [Wasel] OneDrive sync exclusion configured.
echo.
echo Additional manual steps required:
echo   1. Open OneDrive Settings ^> Sync and backup ^> Manage backup
echo   2. Uncheck "Desktop" folder, OR
echo   3. Right-click this project folder in File Explorer ^> "Free up space"
echo.
echo For Vercel local auth token:
echo   - The token in .env.vercel.local expires quickly and is auto-generated.
echo   - Run 'vercel login' to regenerate when needed.
echo   - Never commit .env.vercel.local to version control.
echo.
pause
