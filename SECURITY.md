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

## Credential Rotation Guide

### Google OAuth Client Secret (Supabase Auth)
**Status**: A client secret was found in a local-only quarantine directory (`_SECRETS_NEEDS_ROTATION_THEN_DELETE/`). It was **never committed to git**.

**Rotation steps**:
1. Open [Google Cloud Console ? Credentials](https://console.cloud.google.com/apis/credentials)
2. Find the OAuth 2.0 Client ID used for Wasel (project: `wasel-planning-with-ai`)
3. Click **Create Credentials ? OAuth client ID** to generate a new pair
4. Copy the new **Client ID** and **Client secret**
5. Update Supabase Auth Google provider:
   ```bash
   supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="new-client-id"
   supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_SECRET="new-client-secret"
   ```
6. Update Vercel environment variables if the client ID is used there
7. Update `.env` / `.env.local` with the new values
8. Delete the old OAuth client in Google Cloud Console

### Google Service Account Private Key (`docs/wasel-planning-with-ai.json`)
**Status**: A service account private key is committed in `docs/wasel-planning-with-ai.json`. This is a **critical exposure**.

**Rotation steps**:
1. Open [Google Cloud Console ? IAM ? Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Find the service account `fb-service-account@wasel-planning-with-ai.iam.gserviceaccount.com`
3. Go to the **Keys** tab ? **Add Key ? Create new key** (JSON)
4. Download the new key and replace `docs/wasel-planning-with-ai.json` content
5. **Delete the old key** from Google Cloud Console
6. **Remove the old key from git history**:
   ```bash
   git filter-repo --path docs/wasel-planning-with-ai.json --invert-paths
   ```
   Or use BFG Repo-Cleaner:
   ```bash
   bfg --delete-files docs/wasel-planning-with-ai.json
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force
   ```
7. Update any code that reads this file with the new key path/content

### Local Communication Worker Secrets (`.env`)
**Status**: Real secrets were found in `.env` inside OneDrive sync tree.

**Rotation steps**:
1. Generate new secrets:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Replace `COMMUNICATION_WORKER_SECRET` and `COMMUNICATION_WEBHOOK_TOKEN` in `.env`
3. Update Supabase secrets if these are used by edge functions:
   ```bash
   supabase secrets set COMMUNICATION_WORKER_SECRET="new-secret"
   supabase secrets set COMMUNICATION_WEBHOOK_TOKEN="new-token"
   ```
4. Move `.env` outside OneDrive sync or exclude the project folder from OneDrive

### General Rotation Checklist
- [ ] All secrets in `.env` are replaced with placeholders or moved to a secret store
- [ ] `git ls-files | grep -E '\.(pem|key|p12|pfx|json)'` shows no private key files
- [ ] `scripts/validate-no-secrets.mjs` passes locally
- [ ] CI secret scanning (`secret-scan.yml`) passes on PR
- [ ] No secrets appear in GitHub Actions logs
