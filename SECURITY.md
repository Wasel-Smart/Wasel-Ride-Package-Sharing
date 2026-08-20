# Security & Secrets Management

## CRITICAL: OneDrive Sync Exposure Risk

**This repository is located inside a OneDrive-synced folder (`C:\Users\user\OneDrive\Desktop\`).**
If OneDrive syncs your Desktop folder, any file in this repo � especially `.env`, `.env.local`, or any file containing credentials � may be **uploaded to OneDrive cloud storage**. This is a **credential leakage risk**.

### Immediate Actions Required (choose ONE):

**Option A (Recommended): Exclude the project folder from OneDrive sync**
1. Right-click the `Wdoubleme-master` folder ? "Free up space" (removes it from OneDrive sync while keeping it local)
2. Or open OneDrive Settings ? Sync and backup ? Manage backup ? Uncheck "Desktop"

**Option B: Store secrets outside OneDrive**
1. Create `C:\Users\user\.env` (outside OneDrive tree)
2. Move real credentials from `Wdoubleme-master\.env` to `C:\Users\user\.env`
3. Update `vite.config.ts` to load env from `C:\Users\user\` (see `envDir` option)
4. Replace `Wdoubleme-master\.env` contents with placeholders only

**Option C: Use managed secret stores (Production)**
- Vercel Environment Variables
- Azure Key Vault
- Supabase Secrets (`supabase secrets set`)

### CI Guard
A pre-merge check scans for `.env` files containing non-placeholder values. Any `.env` file found inside the repo with real secret patterns will **block CI**.

### Verification
After applying any option above:
```bash
# Scan for .env files with real secrets in the repo
git ls-files | grep '\.env' || echo "No tracked .env files"
# Verify no real secrets in OneDrive sync tree
```

## Required Environment Variables

Before running the app locally or deploying to production, ensure these variables are set.

### Always required
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Payments (at least one provider)
- `STRIPE_SECRET_KEY` — Stripe secret key (sk_...)
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook endpoint secret (whsec_...)
- `STRIPE_API_VERSION` — defaults to `2024-11-20` if unset

### CliQ (Jordan)
- `CLIQ_API_BASE_URL`
- `CLIQ_MERCHANT_ID`
- `CLIQ_API_KEY`
- `CLIQ_WEBHOOK_SECRET` — must be set in Supabase secrets for webhook verification

### Communications
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_SENDER_ID`

### Observability
- `VITE_SENTRY_DSN` — optional but recommended in production

## Running Validation

```bash
# Check all env vars (Node.js only)
node scripts/validate-env.mjs
```

## Supabase Edge Function Secrets

Use the Supabase CLI to set secrets that edge functions need:

```bash
supabase secrets set STRIPE_SECRET_KEY="<your-stripe-secret-key>"
supabase secrets set STRIPE_WEBHOOK_SECRET="<your-stripe-webhook-secret>"
supabase secrets set CLIQ_WEBHOOK_SECRET="<your-cliq-webhook-secret>"
supabase secrets set CLIQ_API_KEY="<your-cliq-api-key>"
supabase secrets set CLIQ_MERCHANT_ID="<your-cliq-merchant-id>"
```

## Pre-Deployment Checklist

1. [ ] Run `npm run verify:ci` locally
2. [ ] Apply pending Supabase migrations (`supabase db push`)
3. [ ] Set all required secrets in Supabase (`supabase secrets set ...`)
4. [ ] Verify Stripe webhook points to deployed `stripe-payments-v2/webhook`
5. [ ] Verify `.env.local` is not being cloud-synced
6. [ ] Confirm `CLIQ_WEBHOOK_SECRET` is set and matches CliQ dashboard
7. [ ] Confirm `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false` in production
8. [ ] Confirm `verify_jwt = true` in `supabase/config.toml`
9. [ ] Run `bash src/platform/validate-10-out-of-10.sh`
