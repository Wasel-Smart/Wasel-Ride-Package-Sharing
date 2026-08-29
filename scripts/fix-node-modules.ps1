# ============================================================
#  fix-node-modules.ps1
#  Fixes OneDrive-corrupted node_modules for any JS project.
#
#  What this does:
#    1. Removes the broken node_modules folder
#    2. Creates a local folder at C:\dev-cache\{ProjectName}-node_modules
#       (completely outside OneDrive - safe from sync)
#    3. Creates a junction (directory symlink) from the project
#       to the local folder. OneDrive IGNORES junction points.
#    4. Detects your package manager (npm, pnpm, yarn) and runs
#       the install command into the now-safe local location.
#
#  Run as Administrator in PowerShell:
#    .\scripts\fix-node-modules.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# ── Pre-flight Checks ───────────────────────────────────────

# 1. Administrator Check & Self-Elevation
if (-Not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "This script requires Administrator privileges to create a directory junction."
    Write-Host "Attempting to re-launch as Administrator..." -ForegroundColor Yellow
    Start-Process pwsh -Verb RunAs -ArgumentList "-NoProfile -File `"$PSCommandPath`""
    exit
}

# Resolve project path dynamically. Assumes this script is in a subfolder of the project root.
$scriptPath    = $MyInvocation.MyCommand.Path
$projectPath   = (Resolve-Path (Join-Path $scriptPath "..\..")).Path
$projectName   = (Get-Item $projectPath).Name
$localCache    = "C:\dev-cache\$($projectName)-node_modules"
$junctionPath  = "$projectPath\node_modules"

# 2. Package Manager Detection
$packageManager = $null
$installCommand = $null
if (Test-Path (Join-Path $projectPath "pnpm-lock.yaml")) {
    $packageManager = "pnpm"
    $installCommand = "pnpm install"
} elseif (Test-Path (Join-Path $projectPath "yarn.lock")) {
    $packageManager = "yarn"
    $installCommand = "yarn install"
} elseif (Test-Path (Join-Path $projectPath "package-lock.json")) {
    $packageManager = "npm"
    $installCommand = "npm install"
} else {
    $packageManager = "npm" # Fallback for projects without a lock file yet
    $installCommand = "npm install"
}

if ((Get-Command $packageManager -ErrorAction SilentlyContinue) -eq $null) {
    Write-Host "ERROR: Package manager '$packageManager' is not installed or not in your PATH." -ForegroundColor Red
    Write-Host "Please install it and try again."
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Wasel node_modules OneDrive Fix" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project detected at: $projectPath" -ForegroundColor Gray
Write-Host "Package manager:     $packageManager" -ForegroundColor Gray

# ── Step 1: Remove broken node_modules ──────────────────────
Write-Host "[1/4] Removing corrupted node_modules..." -ForegroundColor Yellow
if (Test-Path $junctionPath) {
    # Remove junction or real folder safely
    if ((Get-Item $junctionPath).LinkType -eq "Junction") {
        Remove-Item $junctionPath -Force
        Write-Host "      Removed existing junction." -ForegroundColor Gray
    } else {
        Remove-Item -Recurse -Force $junctionPath
        Write-Host "      Removed existing directory." -ForegroundColor Gray
    }
} else {
    Write-Host "      No existing node_modules found, skipping." -ForegroundColor Gray
}

# ── Step 2: Create local cache directory ────────────────────
Write-Host "[2/4] Creating local cache at $localCache ..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $localCache | Out-Null
Write-Host "      Done." -ForegroundColor Gray

# ── Step 3: Create junction ──────────────────────────────────
Write-Host "[3/4] Linking project → local cache (OneDrive ignores junctions)..." -ForegroundColor Yellow
$result = cmd /c "mklink /J `"$junctionPath`" `"$localCache`"" 2>&1
Write-Host "      $result" -ForegroundColor Gray

if (-not (Test-Path $junctionPath)) {
    Write-Host ""
    Write-Host "ERROR: Junction creation failed. Make sure you are running as Administrator." -ForegroundColor Red
    exit 1
}

# ── Step 4: Install Dependencies ─────────────────────────────
Write-Host "[4/4] Running '$installCommand' (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host ""
Set-Location $projectPath
Invoke-Expression $installCommand

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  SUCCESS!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  node_modules is stored at:" -ForegroundColor White
Write-Host "    $localCache" -ForegroundColor Cyan
Write-Host ""
Write-Host "  OneDrive will NEVER touch it again." -ForegroundColor White
Write-Host ""
Write-Host "  Now run:  npm run verify" -ForegroundColor Yellow
Write-Host ""
