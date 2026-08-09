# Security remediation checklist

This file tracks the credential rotation and hardening actions required after
sensitive values were found in local environment files.

**Complete all items marked ❌ before any production deployment or public push.**

---

## Credential rotation

| Credential | Where to rotate | Status |
|---|---|---|
| `TWILIO_AUTH_TOKEN` | [Twilio Console → Account → Auth Token](https://console.twilio.com/us1/account/keys-credentials/auth-token) | ❌ Rotate now |
| `TWILIO_API_KEY_SECRET` | Twilio Console → API Keys → delete & recreate `SKd72935...` | ❌ Rotate now |
| `TWILIO_ACCOUNT_SID` | Note: SIDs are not secrets but rotate the auth token which invalidates them | — |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Console → Messaging → Services | ❌ Verify not exposed |
| `TWILIO_VERIFY_SERVICE_SID` | Twilio Console → Verify → Services | ❌ Verify not exposed |
| `VITE_STRIPE_PUBLISHABLE_KEY` (`pk_live_51Spp9L...`) | [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys) | ❌ Roll key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys → reveal & rotate | ❌ Rotate now |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → rotate | ❌ Rotate now |
| `VITE_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials) | ❌ Verify scope |
| `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth Client → regenerate | ❌ Rotate now |
| `VITE_FACEBOOK_APP_ID` / `SUPABASE_AUTH_FACEBOOK_CLIENT_ID` | [Meta for Developers → App Settings → Security](https://developers.facebook.com/) | ❌ Verify scope |
| `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` | Meta for Developers → regenerate | ❌ Rotate now |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/_/settings/api) | ❌ Roll key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → regenerate | ❌ Rotate now |
| `VERCEL_OIDC_TOKEN` (full JWT in `.env.local`) | Vercel Dashboard → Settings → Tokens | ❌ Revoke & regenerate |
| `RESEND_API_KEY` | [Resend Dashboard → API Keys](https://resend.com/api-keys) | ❌ Rotate now |
| `SENDGRID_API_KEY` | [SendGrid → Settings → API Keys](https://app.sendgrid.com/settings/api_keys) | ❌ Rotate now |
| `COMMUNICATION_WORKER_SECRET` | Generate a new 64-char random secret | ❌ Rotate now |
| `COMMUNICATION_WEBHOOK_TOKEN` | Generate a new 64-char random token | ❌ Rotate now |

---

## Repository hardening

- [ ] Run `git log --all --full-history -- .env` to confirm `.env` was never committed
- [ ] Run `git log --all --full-history -- .env.local` to confirm `.env.local` was never committed
- [ ] If either command returns commits, run `git filter-repo --invert-paths --path .env` to scrub history
- [ ] Run `git ls-files --error-unmatch .env` — should error (not tracked)
- [ ] Run `git ls-files --error-unmatch .env.local` — should error (not tracked)
- [ ] Enable GitHub → Settings → Security → Secret scanning
- [ ] Enable GitHub → Settings → Security → Push protection
- [ ] Confirm no `.crt`, `.pem`, or `.key` files are tracked: `git ls-files | grep -E '\.(pem|key|crt|cer|p12|pfx)'`

---

## After rotating all credentials

1. Update `.env.example` with the new placeholder names (not real values).
2. Update Vercel environment variables via the Vercel Dashboard or `vercel env pull`.
3. Re-run `npm run verify:live-integrations` to confirm all integrations are healthy.
4. Delete this checklist once all items are resolved, or archive it in `.github/`.

---

*Generated: 2026-06-11*
