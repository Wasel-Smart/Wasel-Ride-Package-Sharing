# Wasel — Verified fixes (2026-07-01)

## What I actually verified against the live `master` branch (commit 3f91593)

Note: my first look at this repo used GitHub's web file browser, which returned a
stale cached snapshot (old README, screenshot PNGs, self-graded "10/10" docs that
no longer exist on master). Once I `git clone`d the real repo, the picture was
different — larger, more mature (backend microservices, mobile app, infra/k8s),
and the specific issue below is what's actually blocking things right now.

## Fix #1 — CRITICAL: root `npm install` fails on Linux

**File:** `package.json`
**Before:** `"lightningcss-win32-x64-msvc": "^1.32.0"` was pinned as a hard,
regular dependency (not `optionalDependencies`, where native per-platform
binaries belong).
**Effect:** `npm install` / `npm ci` fails immediately with `EBADPLATFORM` on
any Linux machine — which is what Vercel, GitHub Actions, and Docker builds all
run on. It only "worked" on the original dev's Windows machine, which is why it
shipped unnoticed.
**Fix:** removed the pin. Vite's `lightningcss` dependency already declares
correct per-platform `optionalDependencies` on its own — npm resolves the right
binary (win32/linux/mac) automatically per machine. No functionality lost.
**Verified:** clean `npm install` → `tsc --noEmit` (0 errors) → `vite build`
(succeeds, dist/ produced) on Linux, from a fresh clone.

## Fix #2 — Dependency confusion risk: phantom `"mobile"` package

**File:** `package.json`
**Before:** `"mobile": "^0.0.1"` sat in `dependencies`, right next to the
lightningcss line. It looks like someone meant to reference the local
`mobile/` React Native app folder, but instead it resolves to an unrelated
public npm package literally named `mobile` (published 2014, single
maintainer, description: "not what you're thinking"). Currently harmless
content-wise, but it's a live dependency-confusion vector — a malicious actor
could in theory take over an abandoned-looking package name like this, and
your build would silently pull it in.
**Fix:** removed it from root `dependencies`.
**Not done (separate issue, needs its own PR):** I tried wiring `mobile/` in
as a real npm workspace instead. That immediately surfaced a *third*, unrelated
bug: `mobile/package.json` pins `@types/react ~18.2.79`, but its own
`react-native@0.86.0` peer-requires `@types/react ^19.1.1` — an internal
conflict inside the mobile app itself, currently invisible because mobile/ was
never wired into any install. Flagging this for you to fix in `mobile/`
directly; I didn't want to bundle a guessed version bump into this patch
without your sign-off.

## What I checked and found clean (no action needed)
- No hardcoded secrets/API keys in `src`, `services`, `backend` (checked for
  Stripe live keys, AWS keys, private key blocks, generic secret patterns)
- No `.env` / `.env.local` files tracked in git
- No Node `crypto` import leaking into frontend `src` (the "blank page" bug
  referenced in old open PR titles appears to already be fixed on master)
- Low `console.log` count (18) and TODO/FIXME count (2) in `src` — not a mess

## What this patch does NOT fix (needs your access, not mine)
- 19 open PRs sitting unmerged on GitHub, some since May 2026, including
  Dependabot security bumps — I have no push/merge access to your repo
- The mobile app's internal `@types/react` version conflict (see above)
- No independent code review / no external users / 0 releases — these are
  process gaps, not something a patch fixes
