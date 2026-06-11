# ============================================================
#  fix-node-modules.ps1
#  Fixes OneDrive-corrupted node_modules once and for all.
#
#  What this does:
#    1. Removes the broken node_modules folder
#    2. Creates a local folder at C:\dev-cache\Wdoubleme-node_modules
#       (completely outside OneDrive - safe from sync)
#    3. Creates a junction (directory symlink) from the project
#       to the local folder. OneDrive IGNORES junction points.
#    4. Runs npm install into the now-safe local location
#
#  Run as Administrator in PowerShell:
#    .\fix-node-modules.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$projectPath   = "C:\Users\user\OneDrive\Desktop\Wdoubleme"
$localCache    = "C:\dev-cache\Wdoubleme-node_modules"
$junctionPath  = "$projectPath\node_modules"

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Wasel node_modules OneDrive Fix" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# ── Step 1: Remove broken node_modules ──────────────────────
Write-Host "[1/4] Removing corrupted node_modules..." -ForegroundColor Yellow
if (Test-Path $junctionPath) {
    # Remove junction or real folder safely
    if ((Get-Item $junctionPath).LinkType -eq "Junction") {
        (Get-Item $junctionPath).Delete()
        Write-Host "      Removed existing junction." -ForegroundColor Gray
    } else {
        Remove-Item -Recurse -Force $junctionPath
        Write-Host "      Removed existing folder." -ForegroundColor Gray
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

# ── Step 4: npm install ──────────────────────────────────────
Write-Host "[4/4] Running npm install (this may take a few minutes)..." -ForegroundColor Yellow
Write-Host ""
Set-Location $projectPath
npm install

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
