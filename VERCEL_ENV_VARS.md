# Vercel Environment Variables — Go-Live Checklist

Set these in: Vercel Dashboard → Project → Settings → Environment Variables
Select environment: **Production** (and optionally Preview)

## Required before first deploy

| Variable | Value source |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → anon public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same as anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API → service_role (**secret**) |
| `SUPABASE_JWT_SECRET` | Supabase dashboard → Project Settings → API → JWT Settings |
| `VITE_EDGE_FUNCTION_NAME` | `make-server-0b1f4071` |
| `VITE_API_URL` | `https://<project-ref>.supabase.co/functions/v1/make-server-0b1f4071` |
| `VITE_APP_URL` | `https://wasel14.online` |
| `APP_BASE_URL` | `https://wasel14.online` |
| `VITE_AUTH_CALLBACK_PATH` | `/app/auth/callback` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Cloud Console → APIs & Services → Credentials |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 Client IDs |
| `SUPABASE_AUTH_GOOGLE_CLIENT_ID` | Same as above |
| `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 Client IDs → secret |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys → **pk_live_...** |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → **sk_live_...** (**secret**) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Webhooks → signing secret (**whsec_...**) |
| `STRIPE_API_VERSION` | `2026-02-25.clover` |
| `VITE_SENTRY_DSN` | Sentry → Project → Settings → Client Keys |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account Info (**secret**) |
| `TWILIO_API_KEY_SID` | Twilio Console → API Keys |
| `TWILIO_API_KEY_SECRET` | Twilio Console → API Keys (**secret**) |
| `TWILIO_MESSAGING_SERVICE_SID` | Twilio Console → Messaging → Services |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `COMMUNICATION_WORKER_SECRET` | Generate: `openssl rand -hex 32` |
| `COMMUNICATION_WEBHOOK_TOKEN` | Generate: `openssl rand -hex 32` |
| `ALLOWED_ORIGINS` | `https://wasel14.online` |

## Feature flags (set these too)

| Variable | Production value |
|---|---|
| `VITE_APP_ENV` | `production` |
| `NODE_ENV` | `production` |
| `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK` | `false` |
| `VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK` | `false` |
| `VITE_ENABLE_DEMO_DATA` | `false` |
| `VITE_ENABLE_SYNTHETIC_TRIPS` | `false` |
| `ENABLE_RUNTIME_ADMIN_ENDPOINTS` | `false` |

## After setting variables

1. Redeploy on Vercel (trigger a new deployment)
2. Run `node scripts/verify-supabase-rollout.mjs` locally against production
3. Walk through `docs/PRODUCTION_CUTOVER_CHECKLIST.md` sections 3–5

## Security reminder

- Never paste live secrets into chat, email, or documents
- Rotate any key that was shared outside a secrets manager
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS — treat it like a root password
