# Security & Secrets Management

## Secret Management

**Never store real credentials in `.env`, `.env.local`, or any file that may be committed or synced to cloud storage.**

### Production Secret Sources (in priority order)
1. **Azure Key Vault** — primary secret store for production
2. **Vercel Environment Variables** — for Vercel-hosted deployments
3. **Supabase Secrets** — for edge function secrets (`supabase secrets set`)
4. **Kubernetes Secrets** — for k8s deployments (base64-encoded, not encrypted at rest)

### Local Development
- Use `.env.local` (gitignored) for local development only
- Use `.env.example` as a template — never copy it as `.env` without replacing values
- Rotate any credentials that were ever stored in `.env` or `.env.local`

### OneDrive Sync Exposure Risk
This repository is located at `C:\Users\user\OneDrive\Desktop\Wdoubleme`.
If OneDrive syncs your Desktop folder, any file in this repo (including `.env`, `.env.local`)
may be uploaded to OneDrive cloud storage.

**IMMEDIATE ACTION REQUIRED � Choose ONE of these options:**

**Option A (Recommended): Exclude the project folder from OneDrive sync**
1. Right-click the Wdoubleme folder -> "Free up space" (this removes it from OneDrive sync while keeping it locally)
2. Or open OneDrive Settings -> Sync and backup -> Manage backup -> Uncheck "Desktop"

**Option B: Store secrets outside OneDrive**
1. Create C:\Users\user\.env (outside OneDrive tree)
2. Move your real credentials from Wdoubleme\.env to C:\Users\user\.env
3. Update ite.config.ts to load env from C:\Users\user\ (see envDir option)
4. Replace Wdoubleme\.env contents with placeholders only

**Option C: Use managed secret stores (Production)**
- Vercel Environment Variables
- Azure Key Vault
- Supabase Secrets (supabase secrets set)

After applying any option above, verify no .env files with real secrets remain inside the OneDrive sync tree.

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
