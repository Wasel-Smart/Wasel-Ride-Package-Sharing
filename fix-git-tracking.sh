#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# fix-git-tracking.sh
# Run ONCE from the repo root to stop git tracking files that are now
# gitignored but were previously committed.
#
# Usage:  bash fix-git-tracking.sh
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

echo "🔧 Removing tracked files that should now be gitignored..."

# ── Environment file (NEVER committed) ───────────────────────────────────────
git rm --cached .env 2>/dev/null && echo "  ✓ .env untracked" || echo "  – .env was not tracked"

# ── Log files ────────────────────────────────────────────────────────────────
for f in build-check.log gcm-diagnose.log firepit-log.txt vite-out.log vite-err.log preview-log.txt; do
  git rm --cached "$f" 2>/dev/null && echo "  ✓ $f untracked" || echo "  – $f was not tracked"
done

# ── Temp icon/image generation artifacts ─────────────────────────────────────
git ls-files --error-unmatch tmp-wasel-pin-*.png 2>/dev/null | while read -r f; do
  git rm --cached "$f" && echo "  ✓ $f untracked"
done || echo "  – no tmp-wasel-pin-*.png files were tracked"

git ls-files --error-unmatch tmp-wasel-*.ico 2>/dev/null | while read -r f; do
  git rm --cached "$f" && echo "  ✓ $f untracked"
done || echo "  – no tmp-wasel-*.ico files were tracked"

# ── Root image artifacts ──────────────────────────────────────────────────────
git rm --cached mobility-os-current.png 2>/dev/null && echo "  ✓ mobility-os-current.png untracked" || echo "  – mobility-os-current.png was not tracked"

echo ""
echo "✅  Done. Now commit the cleanup:"
echo ""
echo "    git add .gitignore"
echo "    git commit -m 'chore: untrack committed files now covered by .gitignore'"
echo ""
echo "⚠️   IMPORTANT: Replace .env with your REAL credentials before running the app."
echo "     They have been wiped and replaced with placeholders."
echo "     Copy from .env.example and fill in your actual keys."
