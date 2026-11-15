# Security Audit Findings

**Last updated:** 2026-11-15
**Status:** Remediation in progress. See `SECURITY_CHECKLIST.md` for credential rotation status and `scripts/purge-git-history.sh` / `scripts/move-env-offsite.mjs` for the automated remediation tools.

---

## Summary

| Severity | Count | Resolved |
|---|---|---|
| Critical | 2 | 0 |
| High | 4 | 2 |
| Medium | 5 | 4 |
| Low | 3 | 3 |

---

## Critical

### C-01 — Service account key committed to git history
**File:** `docs/wasel-planning-with-ai.json` (historical commit — not in working tree)
**Description:** A Google Cloud service account private key was committed to the repository. Even after removal from the working tree, the key remains accessible in git history to anyone with repo access.
**Status:** ❌ Not resolved — key not yet rotated at Google Cloud Console; git history not yet purged.
**Required actions (in order):**
1. Delete the key: [Google Cloud Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) → find the account → Keys tab → Delete
2. Create a replacement key and store it in a secrets manager, not the repo
3. Run `bash scripts/purge-git-history.sh` — interactive script that purges the file and all other credential patterns from history, then verifies the result
4. Force-push: `git push origin --force --all && git push origin --force --tags`
5. Notify all collaborators to re-clone
6. Enable GitHub Secret Scanning + Push Protection: GitHub → Settings → Security

### C-02 — Real env files in OneDrive sync path
**Files:** `.env`, `.env.local`, `.env.production` (local disk only, not committed)
**Description:** Real secrets sit in a OneDrive-synced folder. OneDrive uploads them to Microsoft cloud storage and makes them accessible from any signed-in device or OneDrive web interface.
**Status:** ❌ Not resolved.
**Required action:** Run `node scripts/move-env-offsite.mjs` (or `npm run secrets:move-offsite`) — moves real env files to `~/.wasel-secrets/` outside the OneDrive sync tree and replaces them with pointer files. Supports `--dry-run` to preview.

---

## High

### H-01 — Provider credentials not rotated after exposure
**Description:** Multiple credentials were found in local env files that were previously exposed via OneDrive sync and/or accidental commits. None have been confirmed rotated at the provider — redacting from local files is not the same as invalidating at the provider.
**Affected credentials:** Stripe secret key + webhook secret, Twilio auth token + API key, Supabase service role key, Google OAuth client secret, Facebook OAuth app secret, Resend API key, SendGrid API key, Vercel OIDC token, `COMMUNICATION_WORKER_SECRET`, `COMMUNICATION_WEBHOOK_TOKEN`.
**Status:** ❌ Not resolved. See `SECURITY_CHECKLIST.md` for the full rotation table with provider links.
**Generate new worker secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Run twice — once for COMMUNICATION_WORKER_SECRET, once for COMMUNICATION_WEBHOOK_TOKEN
```

### H-02 — Twilio webhook allows query-string token fallback
**File:** `supabase/functions/webhooks/index.ts`
**Description:** Twilio webhook authentication falls back to a query-string token when `TWILIO_WEBHOOK_REQUIRE_SIGNATURE` is not set to `true`. Twilio's HMAC signature verification is stronger and should be the only accepted method in production.
**Status:** ❌ Not resolved — set `TWILIO_WEBHOOK_REQUIRE_SIGNATURE=true` in Supabase Edge Function secrets after confirming the provider-side signature URL matches the deployed function URL.

### H-03 — MFA not enforced for high-privilege roles
**File:** `src/hooks/useMFAEnforcement.ts`
**Status:** ✅ Resolved — `PrivilegedMfaGate` component enforces MFA for admin/finance/trust routes; backend path is live. Feature flag `VITE_ENABLE_TWO_FACTOR_AUTH` controls UI opt-in.

### H-04 — Browser-side ride matcher queried dropped columns
**Status:** ✅ Resolved — obsolete browser-side matcher removed in Nov 2026. Matching is server-side only via `matching-worker`.

---

## Medium

### M-01 — Observability env vars are placeholders in production
**Description:** `VITE_SENTRY_DSN` and `VITE_APP_INSIGHTS_CONNECTION_STRING` are not set in Vercel. Runtime errors and Web Vitals are silently dropped in production — the `initSentry()` function detects placeholder values and skips initialization.
**Status:** ❌ Not resolved.
**Fix:** Set both in Vercel Dashboard → Settings → Environment Variables → Production, then redeploy (Vite inlines `VITE_*` at build time):
- `VITE_SENTRY_DSN`: [sentry.io](https://sentry.io) → Your project → Settings → Client Keys (DSN)
- `VITE_APP_INSIGHTS_CONNECTION_STRING`: Azure Portal → Application Insights → Overview → Connection String

### M-02 — Stripe webhook endpoint may point at deprecated function
**Description:** Stripe webhook destination may still point to `stripe-payments-v2` (now a 410 stub) instead of the canonical handler.
**Status:** ⚠️ Verify in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks).
Canonical endpoint: `https://<project-ref>.supabase.co/functions/v1/make-server-0b1f4071/payments/webhooks/stripe`

### M-03 — CliQ webhook amount unit unconfirmed
**File:** `supabase/functions/cliq-payments/index.ts`
**Description:** `CLIQ_WEBHOOK_AMOUNT_UNIT` must be set to `jod` or `fils` based on an actual signed sandbox payload. Until confirmed, top-ups remain uncredited and are held for manual review.
**Status:** ❌ Not resolved — requires CliQ sandbox verification.

### M-04 — Growth event cache not partitioned by user (legacy)
**Status:** ✅ Resolved — cache is now partitioned by user scope; legacy unscoped cache is cleared on load.

### M-05 — Demand alert storage not partitioned by user (legacy)
**Status:** ✅ Resolved — browser storage is now partitioned by signed-in user; legacy shared key is cleared on load.

---

## Low

### L-01 — Password minimum length was 8 characters
**Status:** ✅ Resolved — raised to 12 characters in `supabase/config.toml`.

### L-02 — Webhook JWT gate missing for provider callbacks
**Status:** ✅ Resolved — dedicated `supabase/functions/webhooks/` function with `verify_jwt = false`; provider HMAC signature checks run before any auth logic.

### L-03 — Translation drift check always exited 0
**Status:** ✅ Resolved — `scripts/verify-translations.mjs` now exits 1 on drift; `translations` CI job gates the build.

---

## Wallet transaction settlement — implementation verification

The `finalizeTopUpTransaction` function in the payment worker uses the correct pattern:
`SELECT ... FOR UPDATE` advisory lock → amount/currency validation → credit wallet → mark posted.

Two items still require manual verification before go-live:
- Confirm `finalizeTopUpTransaction` deduplicates on Stripe `event.id` (replay protection at the application layer)
- Confirm `verifyStripeWebhookSignature` enforces a timestamp tolerance (replay protection at the transport layer — Stripe recommends rejecting events older than 5 minutes)
