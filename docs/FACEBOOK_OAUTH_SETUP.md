# Facebook OAuth Setup

This runbook documents the exact configuration required to make "Continue with Facebook" work end-to-end on `www.wasel14.online`. It is the single source of truth — when something breaks, follow these steps top to bottom.

> **Self-check first:** before touching any dashboard, run
>
> ```bash
> node scripts/verify-facebook-oauth.mjs --production
> ```
>
> The script validates every step in this runbook without printing or storing any secret values. It exits 0 only if the live wiring is consistent.

## What "working" means

When everything below is correct, the following will be true:

1. `node scripts/verify-facebook-oauth.mjs --production` exits 0.
2. Opening `https://www.wasel14.online/app/auth` in an incognito window and clicking **Continue with Facebook** shows the Facebook consent dialog, and after authorization the user lands back on the app authenticated as a Supabase user.

The codebase already implements the OAuth flow. There is no JavaScript SDK integration to add — Supabase runs the entire OAuth handshake server-side. All configuration is in dashboards and env vars.

## 1. Required configuration (one source per value)

| Setting | Value | Lives in |
|---|---|---|
| Facebook App ID | `1438623708121685` | Facebook Developers → Waseljo → Settings → Basic |
| Facebook App Mode | **Live** | Facebook Developers → Waseljo → Settings → Basic → App Mode |
| Facebook App Secret | (rotated, never in repo or chat) | Facebook Developers → Waseljo → Settings → Basic → "Show" |
| Facebook Login → Valid OAuth Redirect URIs | `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` | Facebook Developers → Waseljo → Facebook Login → Settings |
| Supabase Auth Provider → Facebook enabled | ON | Old Supabase dashboard → Authentication → Providers → Facebook |
| Supabase Auth Provider → Facebook Client ID | `1438623708121685` | Old Supabase dashboard → Authentication → Providers → Facebook |
| Supabase Auth Provider → Facebook Client Secret | (rotated, never in repo or chat) | Old Supabase dashboard → Authentication → Providers → Facebook |
| Supabase Auth Provider → Facebook Callback URL | `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` | Old Supabase dashboard → Authentication → Providers → Facebook |
| Vercel env `VITE_SUPABASE_URL` | `https://zexlxabdcsjefptmjhuq.supabase.co` | Vercel → wasel-jo → Settings → Environment Variables |
| Vercel env `VITE_SUPABASE_PUBLISHABLE_KEY` | (current Supabase publishable key) | Vercel → wasel-jo → Settings → Environment Variables |
| Vercel env `VITE_FACEBOOK_APP_ID` | `1438623708121685` | Vercel → wasel-jo → Settings → Environment Variables |
| Vercel env `SUPABASE_AUTH_FACEBOOK_CLIENT_ID` | `1438623708121685` | Vercel → wasel-jo → Settings → Environment Variables |
| Vercel env `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` | (current Facebook App Secret) | Vercel → wasel-jo → Settings → Environment Variables |
| Vercel Deployment Protection → Vercel Authentication | **OFF** | Vercel → wasel-jo → Settings → Deployment Protection |
| Vercel Deployment Protection → Password Protection | **OFF** | Vercel → wasel-jo → Settings → Deployment Protection |

The `VITE_FACEBOOK_APP_ID` env var is intentionally not read by the web app at runtime (the comment in `.env.example` documents this). It is only kept because deploy scripts copy it to Vercel. The real OAuth credentials are read server-side by Supabase.

## 2. Step-by-step setup

### 2.1 Facebook app (Waseljo)

1. Open https://developers.facebook.com/apps/1438623708121685/.
2. **Settings → Basic**:
   - App Mode: toggle to **Live** (a banner at the top confirms the change).
   - Copy **App ID** and **App Secret**. The App ID is public (`VITE_FACEBOOK_APP_ID`); the App Secret must only ever be pasted into Supabase and Vercel, never into chat or git.
3. **Facebook Login → Settings**:
   - **Valid OAuth Redirect URIs**: add exactly `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback`.
   - Click **Save Changes**.
4. Confirm the app is set to **Live** and is not in development / restricted mode.

### 2.2 Supabase project (`zexlxabdcsjefptmjhuq`)

1. Open https://supabase.com/dashboard/project/zexlxabdcsjefptmjhuq/auth/providers.
2. **Authentication → Providers → Facebook**:
   - **Facebook enabled**: ON.
   - **Facebook Client ID**: `1438623708121685`.
   - **Facebook Secret**: paste the current Facebook App Secret.
   - **Callback URL**: `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` (read-only; this is your project's fixed callback).
   - Save.

### 2.3 Vercel project (`wasel-jo`)

1. Open https://vercel.com/wasel2/wasel-jo → Settings → Environment Variables.
2. For **Production** environment, ensure these are set (hide the values; mark as Sensitive):
   - `VITE_SUPABASE_URL` = `https://zexlxabdcsjefptmjhuq.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = current publishable key (from Supabase → Settings → API)
   - `VITE_FACEBOOK_APP_ID` = `1438623708121685`
   - `SUPABASE_AUTH_FACEBOOK_CLIENT_ID` = `1438623708121685`
   - `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` = current Facebook App Secret
3. **Settings → Deployment Protection**:
   - **Vercel Authentication**: **OFF**.
   - **Password Protection**: **OFF**.
4. **Deployments** → click the three-dot menu on the latest deployment → **Redeploy**.

### 2.4 Local environment (for development only)

The repo's `.env` and `.env.production` are gitignored. They should match the production Supabase project so that local dev and production agree.

- `.env:110` `VITE_SUPABASE_URL` = `https://zexlxabdcsjefptmjhuq.supabase.co`
- `.env:114` `VITE_SUPABASE_PUBLISHABLE_KEY` = current publishable key
- `.env:233` `VITE_FACEBOOK_APP_ID` = `1438623708121685`
- `.env:234` `SUPABASE_AUTH_FACEBOOK_CLIENT_ID` = `1438623708121685`
- `.env:235` `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` = leave as `SET_IN_SECRET_MANAGER` (real secret stays in Supabase UI; do not write it into a OneDrive-synced file)
- `.env.production` mirrors the same values for the build step.

The codebase does not use `VITE_FACEBOOK_APP_ID` at runtime. The local value is for parity only.

## 3. Verification

### 3.1 Self-check script

```bash
node scripts/verify-facebook-oauth.mjs --production
```

The script:
- Parses `.env` and `.env.production` for the expected Supabase URL, App ID, and publishable key.
- Calls `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/authorize?provider=facebook` and asserts a 302 redirect to `facebook.com/dialog/oauth` with the correct `client_id` and `redirect_uri`.
- (with `--production`) Fetches `https://www.wasel14.online/app/auth` and fails if it is gated by `vercel.com/sso-api` or `vercel.com/login`.

### 3.2 Browser test

1. Open `https://www.wasel14.online/app/auth` in an incognito window.
2. Click **Continue with Facebook**.
3. **Expected**: Facebook consent dialog. After consenting, you land back on the app authenticated.
4. **Failure: "Can't load URL / domain of this URL isn't included in the app's domains"** — Facebook site URL is missing. In Facebook Developers → Settings → Basic → Website, set Site URL to `https://www.wasel14.online`. This field is required even for OAuth.
5. **Failure: "URL blocked: This redirect URL doesn't match…"** — `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` is missing from Facebook Login → Settings → Valid OAuth Redirect URIs. Add it and re-test.
6. **Failure: "Facebook is not enabled in Supabase"** — Supabase provider is off or has a placeholder secret. Re-do §2.2.
7. **Failure: Vercel SSO login page appears** — Deployment Protection is still on. Re-do §2.3 step 3.

## 4. Security rules

- **Never commit** `.env` or `.env.production` (they are gitignored; do not change `.gitignore` to allow them).
- **Never paste any of these into chat, screenshots, or logs**:
  - Facebook App Secret
  - Supabase publishable or secret keys
  - Vercel tokens
- If any of them has been pasted anywhere — even once — **rotate it immediately** in the source dashboard, then paste the new value only into the destination dashboard (Supabase or Vercel UI), never into chat.
- Treat every secret that appears in this conversation as compromised. The historical secret values are not useful after rotation.
- Local dev secrets belong in `WASEL_ENV_DIR` (typically `$env:USERPROFILE\.wasel-secrets`), not inside the OneDrive-synced repo. See `.env.example` for the full policy.

## 5. Rotation playbook

When rotating any secret in this chain, do it in this order to minimize the chance of a partial failure:

1. Rotate the source credential (Facebook Developers or Supabase Settings → API).
2. Update the destination dashboard (Supabase Provider or Vercel env var) with the new value.
3. Trigger a Vercel redeploy.
4. Re-run `node scripts/verify-facebook-oauth.mjs --production`.
5. Test the live button in an incognito window.
6. Only then consider the rotation complete.

Rotating a secret without updating all readers (Supabase provider, Vercel env var) will break login.
