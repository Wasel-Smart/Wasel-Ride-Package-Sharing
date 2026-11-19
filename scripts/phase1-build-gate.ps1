#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Wasel Phase 1 — Build Gate
  Run this script from a checkout OUTSIDE OneDrive to verify all CI gates pass.

.DESCRIPTION
  This script executes the Phase 1 steps from docs/PRODUCTION_LAUNCH_PLAN.md:
    1. Install dependencies
    2. TypeScript check
    3. Lint
    4. Build
    5. Full verify:ci (type-check + lint + coverage + routes + secrets + env + edge + contracts)

  IMPORTANT: Move the repo to a path outside OneDrive first, e.g.:
    C:\Projects\Wasel14.online
  Then run this script from that path.

.NOTES
  Minimum requirements:
    - Node.js 22.x
    - npm 10+
    - Valid .env file with VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_APP_URL set
#>

param(
  [switch]$SkipInstall,
  [switch]$BuildOnly
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

function Step($label) {
  Write-Host ""
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
  Write-Host "  $label" -ForegroundColor Cyan
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Pass($msg) { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }
function Info($msg) { Write-Host "  ℹ  $msg" -ForegroundColor DarkGray }

# ── Guard: not inside OneDrive ───────────────────────────────────────────────
Step "Pre-flight: location check"
$cwd = (Get-Location).Path
if ($cwd -match "OneDrive") {
  Fail "Repo is inside OneDrive ($cwd). Move it to C:\Projects\Wasel14.online and re-run."
}
Pass "Location: $cwd (not OneDrive)"

# ── Check Node version ───────────────────────────────────────────────────────
$nodeVer = node --version 2>&1
if ($nodeVer -notmatch "v2[2-9]") {
  Fail "Node 22.x required; found $nodeVer"
}
Pass "Node version: $nodeVer"

# ── Step 1: npm install ──────────────────────────────────────────────────────
if (-not $SkipInstall) {
  Step "Step 1 of 5: npm install"
  npm install
  if ($LASTEXITCODE -ne 0) { Fail "npm install failed" }
  Pass "Dependencies installed"
} else {
  Info "Skipping npm install (--SkipInstall)"
}

# ── Step 2: type-check ───────────────────────────────────────────────────────
if (-not $BuildOnly) {
  Step "Step 2 of 5: TypeScript check"
  npm run type-check
  if ($LASTEXITCODE -ne 0) { Fail "TypeScript errors found — fix before proceeding" }
  Pass "TypeScript: zero errors"

  # ── Step 3: lint ──────────────────────────────────────────────────────────
  Step "Step 3 of 5: ESLint"
  npm run lint
  if ($LASTEXITCODE -ne 0) { Fail "Lint errors found — fix before proceeding" }
  Pass "Lint: clean"
}

# ── Step 4: build ────────────────────────────────────────────────────────────
Step "Step 4 of 5: Production build"
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Build failed — check output above" }
Pass "Build: dist/ produced"

# ── Step 5: verify:ci ────────────────────────────────────────────────────────
if (-not $BuildOnly) {
  Step "Step 5 of 5: Full CI verification"
  npm run verify:ci
  if ($LASTEXITCODE -ne 0) { Fail "verify:ci failed — check output above" }
  Pass "verify:ci: all gates green"
}

# ── Summary ──────────────────────────────────────────────────────────────────
$elapsed = [math]::Round(((Get-Date) - $startTime).TotalSeconds)
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  ✅ Phase 1 complete in ${elapsed}s" -ForegroundColor Green
Write-Host "  Next: Phase 2 — credential rotation" -ForegroundColor Green
Write-Host "  See: docs/PRODUCTION_LAUNCH_PLAN.md" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
