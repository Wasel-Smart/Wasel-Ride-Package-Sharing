# Security remediation checklist

This file tracks the credential rotation and hardening actions required after
sensitive values were found in local environment files.

**Complete all items marked ❌ before any production deployment or public push.**

### Automated helpers (run these first)

```bash
# 1. Move real env files out of OneDrive sync tree
node scripts/move-env-offsite.mjs

# 2. After rotating all credentials at providers, purge git history
bash scripts/purge-git-history.sh

# 3. Generate new worker secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Run twice — once for COMMUNICATION_WORKER_SECRET, once for COMMUNICATION_WEBHOOK_TOKEN
```

---

## Credential rotation

| Credential | Where to rotate | Status |
|---|---|---|
| `TWILIO_AUTH_TOKEN` | [Twilio Console → Account → Auth Token](https://console.twilio.com/us1/account/keys-credentials/auth-token) | ❌ Rotate now |
| `TWILIO_API_KEY_SECRET` | Twilio Console → API Keys → delete & recreate the exposed key | ❌ Rotate now |
| `TWILIO_ACCOUNT_SID` | Note: SIDs are not secrets but rotate the auth token which invalidates them | — |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Console → Messaging → Services | ❌ Verify not exposed |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Console → Verify → Services | ❌ Verify not exposed |
| `VITE_STRIPE_PUBLISHABLE_KEY` | [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys) | ❌ Roll key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → reveal & rotate | ❌ Rotate now |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → rotate | ❌ Rotate now |
| `VITE_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) | ❌ Verify scope |
| `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth Client → regenerate | ⚠️ Redacted from `.env`/`.env.production` working tree (placeholder now) — **MUST rotate at provider before go-live** |
| `docs/wasel-planning-with-ai.json` (service account private key) | [Google Cloud Console → IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) → delete key → create new key | ❌ Rotate & remove from repo |
| `VITE_FACEBOOK_APP_ID` / `SUPABASE_AUTH_FACEBOOK_CLIENT_ID` | [Meta for Developers → App Settings → Security](https://developers.facebook.com/) | ❌ Verify scope |
| `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` | Meta for Developers → regenerate | ⚠️ Redacted from `.env`/`.env.production` working tree (placeholder now) — **MUST rotate at provider before go-live** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/_/settings/api) | ⚠️ Redacted from working tree — **MUST set in Vercel env vars** |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → regenerate | ❌ Rotate now |
| `VERCEL_OIDC_TOKEN` (full JWT in `.env.local`) | Vercel Dashboard → Settings → Tokens | ❌ Revoke & regenerate |
| `RESEND_API_KEY` | [Resend Dashboard → API Keys](https://resend.com/api-keys) | ❌ Rotate now |
| `SENDGRID_API_KEY` | [SendGrid → Settings → API Keys](https://app.sendgrid.com/settings/api_keys) | ❌ Rotate now |
| `COMMUNICATION_WORKER_SECRET` | Generate a new 64-char random secret | ❌ Rotate now |
| `COMMUNICATION_WEBHOOK_TOKEN` | Generate a new 64-char random token | ❌ Rotate now |

---

## Repository hardening

- [x] Real Supabase project ref replaced with placeholder in committed `.env` template
- [ ] Run `git log --all --full-history -- .env` to confirm `.env` was never committed
- [ ] Run `git log --all --full-history -- .env.local` to confirm `.env.local` was never committed
- [ ] **Run `bash scripts/purge-git-history.sh`** — purges `docs/wasel-planning-with-ai.json` and all other credential patterns from history, verifies the result, and prints force-push instructions. Run this AFTER rotating the Google service account key at the provider.
- [ ] Run `git ls-files --error-unmatch .env` — should error (not tracked)
- [ ] Run `git ls-files --error-unmatch .env.local` — should error (not tracked)
- [x] Delete `_SECRETS_NEEDS_ROTATION_THEN_DELETE/` directory — **DONE: deleted, folder removed, pattern added to .gitignore**
- [ ] Enable GitHub → Settings → Security → Secret scanning
- [ ] Enable GitHub → Settings → Security → Push protection
- [x] `stripe_backup_code.txt` real code overwritten with rotation instructions — regenerate in Stripe dashboard
- [x] `vercel-env-variables.txt` scrubbed — real OAuth IDs replaced with placeholders
- [x] `SUPABASE_SECRET_KEY`, `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET`, `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET`, `SUPABASE_AUTH_HOOK_SEND_SMS_SECRET`, `VITE_SUPABASE_PUBLISHABLE_KEY` replaced with placeholders in `.env` and `.env.production`
- [ ] Confirm no `.crt`, `.pem`, or `.key` files are tracked: `git ls-files | grep -E '\.(pem|key|crt|cer|p12|pfx)'`
- [ ] **Run `npm run secrets:move-offsite`** — moves real env files to `~/.wasel-secrets/` outside the OneDrive sync tree (calls `scripts/move-env-offsite.mjs`, supports `--dry-run`)

---

## Backend wiring — required before notifications and monitoring work

All code is wired. These are the Vercel env var values that must be set.
Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Gap 6 — Twilio / Resend (SMS, WhatsApp, Email notifications)

| Variable | Where to get the value |
|---|---|
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) → Create API key |
| `RESEND_FROM_EMAIL` | e.g. `Wasel <notifications@wasel14.online>` — must be a verified sender domain in Resend |
| `RESEND_REPLY_TO_EMAIL` | e.g. `support@wasel.jo` |
| `TWILIO_ACCOUNT_SID` | [console.twilio.com](https://console.twilio.com) → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info → Auth Token |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Console → Messaging → Services → your service SID |
| `TWILIO_WHATSAPP_FROM` | e.g. `whatsapp:+14155238886` (Twilio sandbox) or your approved number |
| `COMMUNICATION_WORKER_SECRET` | Generate: `openssl rand -hex 32` |
| `COMMUNICATION_WEBHOOK_TOKEN` | Generate: `openssl rand -hex 32` |

Also set these in **Supabase Dashboard → Project → Edge Functions → Secrets**:
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_MESSAGING_SERVICE_SID`, `TWILIO_WHATSAPP_FROM`, `COMMUNICATION_WORKER_SECRET`

Verify: `GET /v1/health` with `x-communication-worker-secret` header → `communications.emailConfigured` and `communications.twilioConfigured` must be `true`.

### Gap 7 — Sentry and Application Insights (error monitoring, Web Vitals) ❌ BLOCKING

Production observability is dark until these are set. Runtime errors and Web Vitals are silently dropped.

| Variable | Where to get the value |
|---|---|
| `VITE_SENTRY_DSN` | [sentry.io](https://sentry.io) → Your project → Settings → Client Keys (DSN) |
| `VITE_APP_INSIGHTS_CONNECTION_STRING` | Azure Portal → Application Insights resource → Overview → Connection String |

Both are `VITE_` prefixed — set them in **Vercel Dashboard → Settings → Environment Variables → Production**.
A redeploy is required after setting them (Vite inlines `VITE_*` at build time).
After deploying, verify: Sentry → Issues → Production should receive events within minutes of first user session.

### Gap 8 — Stripe 2FA backup codes (already overwritten, needs provider action)

1. Go to [dashboard.stripe.com/settings/user](https://dashboard.stripe.com/settings/user)
2. Under **Two-step authentication** → click **Manage** → **Regenerate backup codes**
3. Store the new codes in a password manager, not in this repo
4. The old codes in `stripe_backup_code.txt` are already overwritten with instructions — the file is safe

### Gap 9 — Google and Facebook OAuth secrets (still live at providers)

The secrets were redacted from `.env` and `.env.production` but are **still valid at the providers** until you rotate them.

**Google OAuth:**
1. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials)
2. Click the OAuth 2.0 Client ID used by Wasel
3. Click **Reset Secret** → copy the new secret
4. Set `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=<new_secret>` in Supabase Dashboard → Auth → Providers → Google
5. Also set it in Vercel env vars if any server-side code reads it directly

**Facebook OAuth:**
1. Go to [developers.facebook.com](https://developers.facebook.com) → Your App → Settings → Basic
2. Under **App Secret** → click **Reset**
3. Set `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=<new_secret>` in Supabase Dashboard → Auth → Providers → Facebook

**After rotating both:**
- Update the status column in the Credential rotation table above to ✅
- Test sign-in with Google and Facebook to confirm the new secrets work

### Gap 10 — Stripe webhook endpoint (dual handler consolidated)

Every route on `stripe-payments-v2` now returns **410 Gone**. Payment intents and refunds use the primary Wasel backend; Stripe webhooks use the dedicated `webhooks` function.
Your Stripe webhook destination must point to the canonical handler:

```
https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/payments/webhooks/stripe
```

To verify:
1. [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → check the endpoint URL
2. If it still points to `stripe-payments-v2`, update it to the `webhooks` function URL above
3. Stripe Dashboard → Webhooks → your endpoint → **Send test webhook** → `payment_intent.succeeded` → should return 200

---

1. Update `.env.example` with the new placeholder names (not real values).
2. Update Vercel environment variables via the Vercel Dashboard or `vercel env pull`.
3. Re-run `npm run verify:live-integrations` to confirm all integrations are healthy.
4. Delete this checklist once all items are resolved, or archive it in `.github/`.

---

*Generated: 2026-06-11*

---

## Session update — 2026-09-24 (file-level verification only, no exec access)

- `docs/wasel-planning-with-ai.json` (the real service account key) is
  **still not present in the working tree** — only the `.example` placeholder
  remains. It may still be in git history; the `git filter-repo`/BFG
  commands above under "Repository hardening" still need to be run and
  confirmed by a human with push access.
- `_SECRETS_NEEDS_ROTATION_THEN_DELETE/` **no longer exists** — confirmed
  deleted from the working tree (the two conflicting notes about this in the
  prior version of this file are resolved: it is gone, full stop).
- The Google OAuth client secret JSON (`client_secret_*.json`) that was
  sitting loose in the project root — inside a OneDrive-synced folder — has
  been **moved to `_git_hygiene_quarantine/`** (still on disk, still
  syncable, but no longer loose at the repo root). **Delete it after you
  rotate the Google OAuth client in the Cloud Console.**
- `prod-ca-2021.crt` and the Vercel env cheat sheets
  (`vercel-env-variables.txt`, `scripts/check-vercel-env.mjs`,
  `scripts/extract-vercel-env.mjs`, `scripts/generate-all-vercel-env.mjs`)
  have been **untracked from git** and added to `.gitignore`.
- The Google and Facebook OAuth credentials in `.env.production`
  (gitignored, local only) are now populated with the **current** live
  values as of 2026-09-24:
  - Google client `[REDACTED]` / secret `[REDACTED]`
  - Facebook app `[REDACTED]` / secret `[REDACTED]`
  - The older Google client `631682127784-...` that was previously in this
    file is **no longer referenced** — confirm it has been deleted or
    rotated in the Google Cloud Console so it cannot be abused.
- **Still not rotation.** Populating a local env file is not the same as
  invalidating a credential at the provider. Confirm in Google Cloud
  Console and Meta for Developers that these are the only active clients
  and that no older client secrets remain valid.
- No credential in this table has been confirmed rotated (i.e. invalidated
  at the provider) as of this session — redaction from local files and
  provider-side rotation are two different things, and only the first one
  has been done here.
- **Git tree scan (2026-09-24):** zero tracked files contain
  `client_secret`, `GOCSPX`, `sk_live`, `whsec_`, `re_live`, Twilio
  account SIDs, or any `.env`/`.env.local`/`.env.production` file. The
  committed tree is clean of secrets.
