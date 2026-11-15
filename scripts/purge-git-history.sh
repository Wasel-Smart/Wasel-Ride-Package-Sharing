#!/usr/bin/env bash
# =============================================================================
# scripts/purge-git-history.sh
#
# Purges committed secrets from git history using git-filter-repo.
# Run this ONCE after rotating all credentials at their providers.
#
# Prerequisites:
#   pip install git-filter-repo        (or: brew install git-filter-repo)
#   All collaborators must re-clone after this runs.
#
# Usage:
#   bash scripts/purge-git-history.sh
# =============================================================================

set -euo pipefail

echo ""
echo "=== Wasel git history purge ==="
echo ""
echo "This script removes committed secrets from git history."
echo "It is DESTRUCTIVE and rewrites all commits."
echo ""
echo "Before running:"
echo "  1. Confirm all credentials have been rotated at their providers"
echo "  2. Confirm you have a backup of the repo"
echo "  3. Confirm all collaborators know they must re-clone after this"
echo ""
read -r -p "Type YES to continue: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborted."
  exit 1
fi

# Check git-filter-repo is installed
if ! command -v git-filter-repo &>/dev/null; then
  echo ""
  echo "ERROR: git-filter-repo is not installed."
  echo "Install it with: pip install git-filter-repo"
  echo "Or on macOS:     brew install git-filter-repo"
  exit 1
fi

# Confirm we are in the repo root
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
  echo "ERROR: Run this script from the repo root (Wasel14.online/)."
  exit 1
fi

echo ""
echo "--- Step 1: Purging committed secret files from history ---"

# Google service account key (the primary committed secret)
git filter-repo --invert-paths \
  --path "docs/wasel-planning-with-ai.json" \
  --force

# Any other service account / credential files that may have been committed
git filter-repo --invert-paths \
  --path-glob "client_secret_*.json" \
  --path-glob "*firebase-adminsdk*.json" \
  --path-glob "*service-account*.json" \
  --path-glob "*.pem" \
  --path-glob "*.p8" \
  --path-glob "_SECRETS_NEEDS_ROTATION_THEN_DELETE/" \
  --force

echo ""
echo "--- Step 2: Verifying the files are gone from history ---"

if git log --all --full-history -- "docs/wasel-planning-with-ai.json" | grep -q "commit"; then
  echo "WARNING: docs/wasel-planning-with-ai.json still appears in history. Re-run the purge."
else
  echo "OK: docs/wasel-planning-with-ai.json not found in history."
fi

echo ""
echo "--- Step 3: Verifying no tracked env files ---"

for f in .env .env.local .env.production; do
  if git ls-files --error-unmatch "$f" 2>/dev/null; then
    echo "WARNING: $f is tracked by git. Run: git rm --cached $f"
  else
    echo "OK: $f is not tracked."
  fi
done

echo ""
echo "--- Step 4: Verifying no .pem/.key files are tracked ---"

tracked_certs=$(git ls-files | grep -E '\.(pem|key|crt|cer|p12|pfx)' || true)
if [ -n "$tracked_certs" ]; then
  echo "WARNING: The following cert/key files are tracked:"
  echo "$tracked_certs"
else
  echo "OK: No cert/key files tracked."
fi

echo ""
echo "=== Purge complete ==="
echo ""
echo "Next steps:"
echo "  1. Force-push to remote:"
echo "     git push origin --force --all"
echo "     git push origin --force --tags"
echo ""
echo "  2. Notify all collaborators to re-clone:"
echo "     git clone <repo-url>"
echo ""
echo "  3. Enable GitHub Secret Scanning + Push Protection:"
echo "     GitHub → Settings → Security → Secret scanning → Enable"
echo "     GitHub → Settings → Security → Push protection → Enable"
echo ""
echo "  4. Mark C-01 as resolved in SECURITY_AUDIT_FINDINGS.md"
