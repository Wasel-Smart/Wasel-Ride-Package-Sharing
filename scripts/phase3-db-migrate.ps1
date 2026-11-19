#!/usr/bin/env pwsh
<#
.SYNOPSIS
  Wasel Phase 3 — Database Migration Gate
  Runs the DBA reconciliation and migration checks from docs/PRODUCTION_LAUNCH_PLAN.md.

.DESCRIPTION
  Steps:
    3.1  Verify Supabase CLI is installed and project is linked
    3.2  List pending migrations
    3.3  Dry-run push (no changes)
    3.4  Run production-readiness audit SQL (read-only)

  Does NOT apply migrations — that requires explicit confirmation.
  Run with -Apply to actually push (after a backup is confirmed).

.NOTES
  Requires:
    - supabase CLI (https://supabase.com/docs/guides/cli)
    - SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF environment variables or Supabase CLI login
#>

param(
  [switch]$Apply
)

$ErrorActionPreference = "Stop"

function Step($label) {
  Write-Host ""
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
  Write-Host "  $label" -ForegroundColor Cyan
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
}

function Pass($msg) { Write-Host "  ✅ $msg" -ForegroundColor Green }
function Fail($msg) { Write-Host "  ❌ $msg" -ForegroundColor Red; exit 1 }
function Warn($msg) { Write-Host "  ⚠️  $msg" -ForegroundColor Yellow }
function Info($msg) { Write-Host "  ℹ  $msg" -ForegroundColor DarkGray }

# ── Check supabase CLI ───────────────────────────────────────────────────────
Step "Step 3.1: Supabase CLI check"
try {
  $ver = supabase --version 2>&1
  Pass "Supabase CLI: $ver"
} catch {
  Fail "supabase CLI not found. Install from https://supabase.com/docs/guides/cli"
}

# ── Check project link ───────────────────────────────────────────────────────
Step "Step 3.2: Migration list (linked project)"
Warn "IMPORTANT: Take a manual backup before proceeding."
Warn "Supabase Dashboard → Settings → Database → Backups → Create Backup"
Write-Host ""
supabase migration list --linked
if ($LASTEXITCODE -ne 0) {
  Fail "Migration list failed. Ensure the project is linked: supabase link --project-ref <ref>"
}

# ── Dry-run ──────────────────────────────────────────────────────────────────
Step "Step 3.3: Dry-run push"
Info "Running supabase db push --dry-run — no changes will be made"
supabase db push --dry-run
if ($LASTEXITCODE -ne 0) {
  Fail "Dry-run failed. Review migration errors before attempting a live push."
}
Pass "Dry-run: no errors"

# ── Apply (optional) ─────────────────────────────────────────────────────────
if ($Apply) {
  Step "Step 3.4 (LIVE): Applying migrations"
  Warn "This will modify the linked production database."
  $confirm = Read-Host "Type YES to confirm"
  if ($confirm -ne "YES") { Fail "Aborted by user" }

  supabase db push
  if ($LASTEXITCODE -ne 0) { Fail "db push failed" }
  Pass "Migrations applied"

  Write-Host ""
  Write-Host "  Next steps:" -ForegroundColor Cyan
  Write-Host "    1. Run supabase/ops/production-readiness-audit.sql" -ForegroundColor Cyan
  Write-Host "    2. Run supabase/ops/audit_client_privileges.sql" -ForegroundColor Cyan
  Write-Host "    3. Run supabase/tests/rls_coverage.sql" -ForegroundColor Cyan
  Write-Host "    4. Test anon key: GET /rest/v1/drivers?select=license_number&limit=1" -ForegroundColor Cyan
} else {
  Write-Host ""
  Pass "Dry-run complete — no changes made."
  Info "Run with -Apply to push migrations after confirming a backup exists."
}
