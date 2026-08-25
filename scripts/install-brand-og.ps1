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
Add-Type -AssemblyName System.Drawing

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "== Step 1: Locating wasel-og-1200x630.png ==" -ForegroundColor Cyan

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
    Write-Host "FAILED: could not find wasel-og-1200x630.png in Downloads, Desktop, or OneDrive equivalents." -ForegroundColor Red
    Write-Host "Download it from the chat first (click the file card so your browser actually saves it to disk), then re-run this script." -ForegroundColor Yellow
    exit 1
}

# Use the most recently modified match if there are several
$source = ($found | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
Write-Host "Found: $source" -ForegroundColor Green

Write-Host "== Step 2: Verifying source image is the correct 1200x630 card ==" -ForegroundColor Cyan
$srcImg = [System.Drawing.Image]::FromFile($source)
$srcW = $srcImg.Width
$srcH = $srcImg.Height
$srcImg.Dispose()

if ($srcW -ne 1200 -or $srcH -ne 630) {
    Write-Host "FAILED: source file is ${srcW}x${srcH}, expected 1200x630. This is not the rebuilt OG card. Stopping before touching anything." -ForegroundColor Red
    exit 1
}
Write-Host "Source verified: ${srcW}x${srcH}" -ForegroundColor Green

Write-Host "== Step 3: Installing to public/brand/ ==" -ForegroundColor Cyan
$targets = @(
    ".\public\brand\wasel-og.png",
    ".\public\brand\wasel-social-dark.png",
    ".\public\brand\wasel-w-mark.png"
)
foreach ($t in $targets) {
    Copy-Item $source $t -Force
    Write-Host "  -> $t" -ForegroundColor Green
}

Write-Host "== Step 4: Verifying every target actually changed ==" -ForegroundColor Cyan
$allGood = $true
foreach ($t in $targets) {
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $t))
    $w = $img.Width; $h = $img.Height
    $img.Dispose()
    if ($w -eq 1200 -and $h -eq 630) {
        Write-Host "  OK: $t is ${w}x${h}" -ForegroundColor Green
    } else {
        Write-Host "  FAILED: $t is ${w}x${h}, expected 1200x630" -ForegroundColor Red
        $allGood = $false
    }
}
if (-not $allGood) {
    Write-Host "FAILED: one or more targets did not update. Stopping before commit." -ForegroundColor Red
    exit 1
}

Write-Host "== Step 5: Regenerating .webp/.avif variants (if sharp-cli is available) ==" -ForegroundColor Cyan
$hasSharp = Get-Command npx -ErrorAction SilentlyContinue
if ($hasSharp) {
    foreach ($base in @("wasel-og", "wasel-social-dark", "wasel-w-mark")) {
        try {
            npx --yes sharp-cli -i ".\public\brand\$base.png" -o ".\public\brand\$base.webp" 2>$null
            npx --yes sharp-cli -i ".\public\brand\$base.png" -o ".\public\brand\$base.avif" 2>$null
            Write-Host "  -> $base.webp / $base.avif regenerated" -ForegroundColor Green
        } catch {
            Write-Host "  WARNING: could not regenerate $base.webp/.avif automatically. Do this manually with your usual export pipeline." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  SKIPPED: npx not found. Regenerate .webp/.avif for the 3 files above manually." -ForegroundColor Yellow
}

Write-Host "== Step 6: Staging and committing ==" -ForegroundColor Cyan
git add public/brand/wasel-og.png public/brand/wasel-social-dark.png public/brand/wasel-w-mark.png `
        public/brand/wasel-og.webp public/brand/wasel-social-dark.webp public/brand/wasel-w-mark.webp `
        public/brand/wasel-og.avif public/brand/wasel-social-dark.avif public/brand/wasel-w-mark.avif `
        2>$null

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "FAILED: git sees no staged changes even though the files were verified as updated on disk. Check that you're in the right git repo / branch." -ForegroundColor Red
    exit 1
}

Write-Host "Staged files:" -ForegroundColor Green
$staged | ForEach-Object { Write-Host "  $_" }

git commit -m "brand: install rebuilt OG social card (1200x630), verified before commit"

Write-Host "== DONE. wasel-og.png is confirmed 1200x630 and committed. ==" -ForegroundColor Cyan
