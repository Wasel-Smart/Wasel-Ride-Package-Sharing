# ⚠️ CREDENTIAL ROTATION REQUIRED

**Status:** OPEN — must be completed before any public production traffic.  
**Last updated:** 2026-11-19  
**Source:** `SECURITY_AUDIT_FINDINGS.md` C-01, C-02, H-01

---

## Why this file exists

Two critical security findings require **operator action outside the codebase**:

1. A Google Cloud service account key was committed to git history.
2. Multiple provider credentials were exposed via OneDrive sync.

Code changes cannot fix these — the credentials must be rotated at each provider
and the git history must be purged.

---

## Step-by-step remediation (in order)

### 1. Rotate every exposed credential

| Credential | Provider link | Status |
|---|---|---|
| Google Cloud service account key | [GCP IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts) → Keys tab → Delete old → Create new | ❌ NOT DONE |
| Stripe secret key (`STRIPE_SECRET_KEY`) | [Stripe Dashboard → API keys](https://dashboard.stripe.com/apikeys) → Roll | ❌ NOT DONE |
| Stripe webhook secret (`STRIPE_WEBHOOK_SECRET`) | [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) → Reveal → Regenerate | ❌ NOT DONE |
| Twilio auth token (`TWILIO_AUTH_TOKEN`) | [Twilio Console → Account Info](https://console.twilio.com/us1/account/keys-credentials/api-keys) → Regenerate | ❌ NOT DONE |
| Twilio API key (`TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET`) | Twilio Console → API Keys → Delete old → Create new | ❌ NOT DONE |
| Supabase service role key (`SUPABASE_SERVICE_ROLE_KEY`) | [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/_/settings/api) → Regenerate | ❌ NOT DONE |
| Google OAuth client secret (`VITE_GOOGLE_CLIENT_SECRET`) | [GCP Console → Credentials](https://console.cloud.google.com/apis/credentials) → Edit OAuth → Reset Secret | ❌ NOT DONE |
| Facebook OAuth app secret (`VITE_FACEBOOK_APP_SECRET`) | [Meta for Developers → App Settings → Basic](https://developers.facebook.com/apps/) → Reset Secret | ❌ NOT DONE |
| Resend API key (`RESEND_API_KEY`) | [Resend Dashboard → API Keys](https://resend.com/api-keys) → Delete old → Create new | ❌ NOT DONE |
| SendGrid API key (`SENDGRID_API_KEY`) | [SendGrid Settings → API Keys](https://app.sendgrid.com/settings/api_keys) → Delete old → Create new | ❌ NOT DONE |
| `COMMUNICATION_WORKER_SECRET` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ❌ NOT DONE |
| `COMMUNICATION_WEBHOOK_TOKEN` | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | ❌ NOT DONE |

Mark each row ✅ after rotating. **Do not deploy to production until all rows are ✅.**

### 2. Purge the git history (after all credentials above are rotated)

The `docs/wasel-planning-with-ai.json` file containing the GCP service account key
must be removed from every commit in the repo history. The script already exists:

```bash
# Preview what will be purged (dry run)
bash scripts/purge-git-history.sh --dry-run

# Execute the purge
bash scripts/purge-git-history.sh

# Force-push all branches and tags
git push origin --force --all
git push origin --force --tags
```

After force-pushing, every collaborator **must re-clone the repository**.
Existing local clones contain the leaked key in their `.git/objects/`.

### 3. Enable GitHub Secret Scanning + Push Protection

Navigate to: GitHub repository → Settings → Security → Secret scanning  
Enable both:
- **Secret scanning** (alerts on detected secrets)
- **Push protection** (blocks pushes containing known secret patterns)

### 4. Verify OneDrive exposure is closed

Confirm the following:
- `C:\Users\user\Wasel14.online` is **not** inside any OneDrive-synced path
- `C:\Users\user\.wasel-secrets\` (where real env files now live) is **not** synced
- Microsoft OneDrive version history / recycle bin no longer holds old `.env` files
  (OneDrive web → Recycle Bin → check and permanently delete)

---

## Vercel environment variables to set (blocking observability)

These two are missing from Vercel and cause zero crash visibility in production:

```
VITE_SENTRY_DSN           → sentry.io → Your project → Settings → Client Keys (DSN)
VITE_APP_INSIGHTS_CONNECTION_STRING → Azure Portal → App Insights → Overview → Connection String
```

After setting them, `npm run verify:ci` will pass the observability gate
(the `--warn-only` flag was removed in this commit — the gate now blocks deploys).

---

## CliQ webhook amount unit (pending sandbox verification)

`CLIQ_WEBHOOK_AMOUNT_UNIT` must be set to either `jod` or `fils` based on an actual
signed CliQ sandbox webhook payload. Until confirmed, top-ups are held for manual review.

Steps:
1. Trigger a CliQ sandbox deposit via the JoPACC test console
2. Inspect the raw webhook body received by `cliq-payments` function
3. Check the `amount` field unit (1 JOD = 1000 fils)
4. Set `CLIQ_WEBHOOK_AMOUNT_UNIT=jod` or `CLIQ_WEBHOOK_AMOUNT_UNIT=fils` in Supabase Edge Function secrets

---

## Stripe webhook endpoint verification

Confirm in [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) that
the endpoint URL points to the canonical handler:

```
https://<project-ref>.supabase.co/functions/v1/make-server-0b1f4071/payments/webhooks/stripe
```

**Not** to `stripe-payments-v2` (which now returns 410).
