# Credential Rotation Guide

This guide provides step-by-step instructions for rotating all credentials listed in `SECURITY_CHECKLIST.md` that were exposed in `.env.local`.

---

## 1. Stripe Live Credentials

### 1.1 Webhook Secret
1. Go to the [Stripe Webhooks Settings Page](https://dashboard.stripe.com/webhooks).
2. Select the webhook endpoint used by Wasel (e.g. pointing to `https://api.wasel14.online/v1/webhooks/stripe`).
3. Click **Signing Secret** → **Reveal** → **Rotate**.
4. Set expiration (e.g., immediate or 24-hour grace period if deploying immediately).
5. Copy the new secret (starts with `whsec_`).
6. Update `STRIPE_WEBHOOK_SECRET` in `.env.local` and your Vercel/Kubernetes secrets.

### 1.2 Publishable & Secret Keys
1. Go to [Stripe API Keys Dashboard](https://dashboard.stripe.com/apikeys).
2. Under **Standard keys**:
   - For `Secret key` (`sk_live_...`): Click **Roll key...**, select expiration time, and copy the new value.
   - For `Publishable key` (`pk_live_...`): Copy the new rolled value.
3. Update `VITE_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` in `.env.local` and staging/production configs.

---

## 2. Twilio Credentials

### 2.1 Auth Token & API Keys
1. Go to [Twilio Console Credentials Page](https://console.twilio.com/us1/account/keys-credentials/api-keys).
2. To rotate the main Auth Token:
   - Go to Console Dashboard.
   - Find **Auth Token** and click **Rotate Token**. Confirm rotation.
3. To rotate API Key Secret:
   - Click **Create API Key**.
   - Generate a new standard API key.
   - Save the Secret and SID. Delete the old key `SKd72935...`.
4. Update `TWILIO_AUTH_TOKEN` and `TWILIO_API_KEY_SECRET` in `.env.local` and runtime configurations.

---

## 3. Supabase Credentials

### 3.1 Anon & Service Role Keys
1. Go to your [Supabase Dashboard API Settings](https://supabase.com/dashboard/project/_/settings/api).
2. Click **JWT Settings** → **Generate a new JWT Secret**. This invalidates all active tokens.
3. Roll the **anon/public** key and **service_role** key.
4. Copy the new `service_role` and `anon` keys.
5. Update `SUPABASE_SERVICE_ROLE_KEY` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.

---

## 4. Third-Party Auth Providers

### 4.1 Google Client Secret
1. Go to the [Google Cloud Credentials Console](https://console.cloud.google.com/apis/credentials).
2. Find the OAuth 2.0 Client ID for Wasel.
3. Click the edit icon. Click **Reset client secret** (or delete/recreate secret).
4. Copy the new client secret.
5. Update `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` in your Supabase Auth configurations.

### 4.2 Facebook Client Secret
1. Go to the [Meta Developers Console](https://developers.facebook.com/).
2. Select your app → **App settings** → **Basic**.
3. Under **App Secret**, click **Reset** or **Show** to regenerate.
4. Update `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` in Supabase Auth settings.

---

## 5. Other Integrations & Worker Secrets

### 5.1 Resend API Key
1. Go to [Resend API Keys Dashboard](https://resend.com/api-keys).
2. Delete the old API key.
3. Click **Create API Key**, name it `wasel-prod`, and copy the new value.
4. Update `RESEND_API_KEY` in config.

### 5.2 SendGrid API Key
1. Go to [SendGrid API Keys Console](https://app.sendgrid.com/settings/api_keys).
2. Click **Create API Key** → Full Access.
3. Save the new API key. Delete the compromised key.
4. Update `SENDGRID_API_KEY`.

### 5.3 Communication Worker Token
1. Run this command to generate a new 64-character token:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update `COMMUNICATION_WORKER_SECRET` and `COMMUNICATION_WEBHOOK_TOKEN` with this new token across both the dispatch service and the receiving Edge Function.

---

## 6. Verification
To verify the rotated keys are fully integrated and functional, run:
```bash
npm run verify:live-integrations
```
Check that all subsystems report a green status.
