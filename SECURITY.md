# Security & Secrets Management

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
supabase secrets set STRIPE_SECRET_KEY="sk_live_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
supabase secrets set CLIQ_WEBHOOK_SECRET="..."
supabase secrets set CLIQ_API_KEY="..."
supabase secrets set CLIQ_MERCHANT_ID="..."
```

## OneDrive Sync Exposure Risk

This repository contains `.env.local` with production Supabase keys.

- `.env.local` is gitignored.
- The project folder is inside `C:\Users\user\OneDrive\Desktop\Wdoubleme`.
- If OneDrive is syncing your Desktop folder, `.env.local` is being uploaded to OneDrive cloud storage.

**Recommendation:** Either move `.env.local` outside the OneDrive tree, or configure OneDrive to exclude `.env.local` from syncing.

## Pre-Deployment Checklist

1. [ ] Run `npm run verify:ci` locally
2. [ ] Apply pending Supabase migrations (`supabase db push`)
3. [ ] Set all required secrets in Supabase (`supabase secrets set ...`)
4. [ ] Verify Stripe webhook points to deployed `stripe-payments-v2/webhook`
5. [ ] Verify `.env.local` is not being cloud-synced
6. [ ] Confirm `CLIQ_WEBHOOK_SECRET` is set and matches CliQ dashboard
