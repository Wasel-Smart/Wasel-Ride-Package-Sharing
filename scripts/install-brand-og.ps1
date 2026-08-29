#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Installs the rebuilt Wasel OG social card into public/brand/, regenerates
  web formats, and verifies the result. Single command, no manual steps to
  skip. Run from the repo root:

      .\scripts\install-brand-og.ps1

.NOTES
  Root cause this fixes: prior instructions were multi-step copy/paste
  blocks where a middle step could be silently skipped (e.g. running
  "git commit" without the "Copy-Item" step before it), leaving stale
  files committed with a misleading commit message. This script instead
  performs every step in one execution and hard-fails with a clear
  message if any step didn't actually happen, so nothing can succeed
  partially without you knowing.
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Write-Step($message) {
    Write-Host "== $message ==" -ForegroundColor Cyan
}

function Write-Fail($message) {
    Write-Host "FAILED: $message" -ForegroundColor Red
    exit 1
}

function Write-Ok($message) {
    Write-Host "$message" -ForegroundColor Green
}

function Write-Warn($message) {
    Write-Host "WARNING: $message" -ForegroundColor Yellow
}

# Preflight checks
Write-Step "Preflight: checking required tools"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Fail "git is not installed or not in PATH. Install git and retry."
}

if (-not (Test-Path .git)) {
    Write-Fail "No .git directory found. Run this script from the repository root."
}

$targetDir = Join-Path $RepoRoot 'public/brand'
if (-not (Test-Path $targetDir)) {
    Write-Fail "Target directory '$targetDir' does not exist. Create it before running this script."
}

try {
    Add-Type -AssemblyName System.Drawing -ErrorAction Stop
} catch {
    Write-Fail "System.Drawing is not available on this platform. Run on Windows with .NET Framework/Desktop Runtime installed."
}

Write-Step "Step 1: Locating wasel-og-1200x630.png"

$searchRoots = @(
    "$env:USERPROFILE\Downloads",
    "$env:USERPROFILE\Desktop",
    "$env:USERPROFILE\OneDrive\Desktop",
    "$env:USERPROFILE\OneDrive\Downloads"
) | Where-Object { Test-Path $_ }

$found = @()
foreach ($root in $searchRoots) {
    $found += Get-ChildItem -Path $root -Filter "wasel-og-1200x630.png" -File -ErrorAction SilentlyContinue
}

if ($found.Count -eq 0) {
    Write-Fail "Could not find wasel-og-1200x630.png in Downloads, Desktop, or OneDrive equivalents. Download it from the chat first (click the file card so your browser actually saves it to disk), then re-run this script."
}

$source = ($found | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Ok "Found: $source"

Write-Step "Step 2: Verifying source image is the correct 1200x630 card"

try {
    $srcImg = [System.Drawing.Image]::FromFile($source)
    $srcW = $srcImg.Width
    $srcH = $srcImg.Height
    $srcImg.Dispose()
} catch {
    Write-Fail "Source file is not a valid image or is corrupted: $source"
}

if ($srcW -ne 1200 -or $srcH -ne 630) {
    Write-Fail "Source file is ${srcW}x${srcH}, expected 1200x630. This is not the rebuilt OG card. Stopping before touching anything."
}
Write-Ok "Source verified: ${srcW}x${srcH}"

Write-Step "Step 3: Installing to public/brand/"

$targets = @(
    Join-Path $targetDir 'wasel-og.png',
    Join-Path $targetDir 'wasel-social-dark.png',
    Join-Path $targetDir 'wasel-w-mark.png'
)

foreach ($t in $targets) {
    Copy-Item $source $t -Force
    Write-Ok "  -> $t"
}

Write-Step "Step 4: Verifying every target actually changed"

$allGood = $true
foreach ($t in $targets) {
    try {
        $img = [System.Drawing.Image]::FromFile((Resolve-Path $t))
        $w = $img.Width; $h = $img.Height
        $img.Dispose()
        if ($w -eq 1200 -and $h -eq 630) {
            Write-Ok "  OK: $t is ${w}x${h}"
        } else {
            Write-Host "  FAILED: $t is ${w}x${h}, expected 1200x630" -ForegroundColor Red
            $allGood = $false
        }
    } catch {
        Write-Host "  FAILED: could not read $t after copy: $_" -ForegroundColor Red
        $allGood = $false
    }
}

if (-not $allGood) {
    Write-Fail "One or more targets did not update. Stopping before commit."
}

Write-Step "Step 5: Regenerating .webp/.avif variants"

$hasNpx = Get-Command npx -ErrorAction SilentlyContinue
$hasSharp = $false

if ($hasNpx) {
    $checkSharp = npx --yes sharp-cli --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        $hasSharp = $true
    }
}

if ($hasSharp) {
    foreach ($base in @("wasel-og", "wasel-social-dark", "wasel-w-mark")) {
        $png = Join-Path $targetDir "$base.png"
        $webp = Join-Path $targetDir "$base.webp"
        $avif = Join-Path $targetDir "$base.avif"

        try {
            npx --yes sharp-cli -i $png -o $webp 2>$null
            if (Test-Path $webp) {
                Write-Ok "  -> $base.webp regenerated"
            } else {
                Write-Warn "  $base.webp was not created"
            }

            npx --yes sharp-cli -i $png -o $avif 2>$null
            if (Test-Path $avif) {
                Write-Ok "  -> $base.avif regenerated"
            } else {
                Write-Warn "  $base.avif was not created"
            }
        } catch {
            Write-Warn "Could not regenerate $base.webp/.avif automatically. Do this manually with your usual export pipeline."
        }
    }
} else {
    Write-Warn "npx or sharp-cli not available. Regenerate .webp/.avif for the 3 files above manually."
}

Write-Step "Step 6: Staging and committing"

$filesToStage = @()
foreach ($t in $targets) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($t)
    $png = Join-Path $targetDir "$base.png"
    $webp = Join-Path $targetDir "$base.webp"
    $avif = Join-Path $targetDir "$base.avif"

    if (Test-Path $png) { $filesToStage += $png }
    if (Test-Path $webp) { $filesToStage += $webp }
    if (Test-Path $avif) { $filesToStage += $avif }
}

if ($filesToStage.Count -eq 0) {
    Write-Fail "No brand files found to stage. Something went wrong during copy."
}

git add $filesToStage 2>$null

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Fail "Git sees no staged changes even though the files were verified as updated on disk. Check that you're in the right git repo / branch."
}

Write-Ok "Staged files:"
$staged | ForEach-Object { Write-Host "  $_" }

git commit -m "brand: install rebuilt OG social card (1200x630), verified before commit"

Write-Ok "DONE. wasel-og.png is confirmed 1200x630 and committed."
