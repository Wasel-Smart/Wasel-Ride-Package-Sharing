<#
  verify-real-status.ps1
  One command that produces real, evidence-backed numbers instead of
  self-reported scores. Run from the repo root:

      .\scripts\verify-real-status.ps1

  It wraps the EXISTING verify-ci.ps1 (unchanged) and adds the checks that
  script doesn't cover: secrets scan, git-history check for the service
  account key, and a reminder for the separate mobile pipeline.

  Everything is logged to verify-log-<timestamp>.txt at the repo root.
  Paste that file's contents back and you'll get a real scorecard, not a
  guessed one.
#>

$ErrorActionPreference = 'Continue'
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = "verify-log-$timestamp.txt"

function Write-Section {
    param([string]$Title)
    "" | Tee-Object -FilePath $logFile -Append
    "==================== $Title ====================" | Tee-Object -FilePath $logFile -Append
}

function Invoke-Logged {
    param([string]$Name, [scriptblock]$Script)
    Write-Section $Name
    try {
        & $Script *>&1 | Tee-Object -FilePath $logFile -Append
        "[$Name] exit code: $LASTEXITCODE" | Tee-Object -FilePath $logFile -Append
    } catch {
        "[$Name] THREW: $_" | Tee-Object -FilePath $logFile -Append
    }
}

"Verification run started: $timestamp" | Tee-Object -FilePath $logFile

# 1. The existing, already-solid verify pipeline (audit, type-check, lint,
#    contracts, chunked unit tests, build). Untouched — just invoked.
Invoke-Logged 'verify-ci.ps1 (existing)' { & .\scripts\verify-ci.ps1 }

# 2. Secrets scan — not part of verify-ci.ps1 but exists as its own script.
Invoke-Logged 'secrets:check' { & npm run secrets:check }

# 3. Git history check for the service account key — confirms whether the
#    filter-repo/BFG purge in SECURITY_CHECKLIST.md is still needed.
Invoke-Logged 'git-history-check (service account key)' {
    git log --all --full-history -- docs/wasel-planning-with-ai.json
}

# 4. Git history check for .env files.
Invoke-Logged 'git-history-check (.env)' {
    git log --all --full-history -- .env
    git log --all --full-history -- .env.local
}

# 5. Confirm no live private key files are tracked.
Invoke-Logged 'tracked-key-files-check' {
    git ls-files | Select-String -Pattern '\.(pem|key|crt|cer|p12|pfx)$'
}

Write-Section 'DONE'
"Full log written to $logFile" | Tee-Object -FilePath $logFile -Append
"" | Tee-Object -FilePath $logFile -Append
"REMINDER: mobile/ has its own pipeline, not covered above. Run separately:" | Tee-Object -FilePath $logFile -Append
"    cd mobile; yarn install; yarn type-check; yarn lint; yarn test" | Tee-Object -FilePath $logFile -Append
"Paste that output back too if you want mobile scored honestly." | Tee-Object -FilePath $logFile -Append
