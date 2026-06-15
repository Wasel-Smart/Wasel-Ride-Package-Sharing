# OAuth Setup Guide - Google & Facebook Authentication

This guide walks you through configuring Google and Facebook OAuth for Wasel authentication.

## Table of Contents
- [Google OAuth Setup](#google-oauth-setup)
- [Facebook OAuth Setup](#facebook-oauth-setup)
- [Supabase Configuration](#supabase-configuration)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Testing OAuth Flow](#testing-oauth-flow)
- [Troubleshooting](#troubleshooting)

---

## Google OAuth Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Name it "Wasel Authentication" or similar

### Step 2: Enable Google+ API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Google+ API"
3. Click **Enable**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Fill in required fields:
   - **App name**: Wasel
   - **User support email**: support@wasel14.online
   - **Developer contact**: your-email@example.com
4. Add scopes:
   - `userinfo.email`
   - `userinfo.profile`
5. Add test users (for development)
6. Save and continue

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application**
4. Configure:
   - **Name**: Wasel Web Client
   - **Authorized JavaScript origins**:
      ```
      http://localhost:5173
      http://localhost:4173
      https://wasel14.online
      https://zexlxabdcsjefptmjhuq.supabase.co
      ```
    - **Authorized redirect URIs**:
      ```
      http://localhost:54321/auth/v1/callback
      https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback
      ```
5. Click **Create**
6. Copy **Client ID** and **Client Secret**

### Step 5: Add to Environment Variables

Add to `.env`:
```bash
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## Facebook OAuth Setup

### Step 1: Create Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click **My Apps** > **Create App**
3. Select **Consumer** as app type
4. Fill in:
   - **App name**: Wasel
   - **App contact email**: support@wasel14.online
5. Click **Create App**

### Step 2: Add Facebook Login Product

1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Select **Web** platform
4. Enter site URL: `https://wasel14.online`

### Step 3: Configure Facebook Login Settings

1. Go to **Facebook Login** > **Settings**
2. Add **Valid OAuth Redirect URIs**:
   ```
    http://localhost:54321/auth/v1/callback
    https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback
   ```
3. Save changes

### Step 4: Get App Credentials

1. Go to **Settings** > **Basic**
2. Copy **App ID** and **App Secret**
3. Add your app domain: `wasel14.online`

### Step 5: Add to Environment Variables

Add to `.env`:
```bash
VITE_FACEBOOK_APP_ID=<YOUR_FACEBOOK_APP_ID>
SUPABASE_AUTH_FACEBOOK_CLIENT_ID=your-facebook-app-id
SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

### Step 6: Make App Public (Production Only)

1. Go to **Settings** > **Basic**
2. Toggle **App Mode** from Development to Live
3. Complete App Review if required

---

## Supabase Configuration

### Option 1: Supabase Dashboard (Recommended for Production)

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your Supabase project.
3. Navigate to **Authentication** > **Providers**

#### Enable Google:
1. Find **Google** provider
2. Toggle **Enable**
3. Enter:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
4. Click **Save**

#### Enable Facebook:
1. Find **Facebook** provider
2. Toggle **Enable**
3. Enter:
   - **Client ID**: Your Facebook App ID
   - **Client Secret**: Your Facebook App Secret
4. Click **Save**

### Option 2: Local Supabase (Development)

Update `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_CLIENT_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"

[auth.external.facebook]
enabled = true
client_id = "env(SUPABASE_AUTH_FACEBOOK_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET)"
redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
```

Then restart Supabase:
```bash
npm run supabase:stop
npm run supabase:start
```

---

## Local Development

### Complete .env Configuration

```bash
# Supabase
VITE_SUPABASE_URL=https://zexlxabdcsjefptmjhuq.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_SUPABASE_PUBLISHABLE_KEY>

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=your-client-secret

# Facebook OAuth
VITE_FACEBOOK_APP_ID=<YOUR_FACEBOOK_APP_ID>
SUPABASE_AUTH_FACEBOOK_CLIENT_ID=your-facebook-app-id
SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=your-facebook-app-secret

# Auth Callback
VITE_AUTH_CALLBACK_PATH=/app/auth/callback
```

### Test Locally

1. Start development server:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/auth`

3. Click **Google** or **Facebook** button

4. Complete OAuth flow

5. Verify redirect to: `http://localhost:5173/app/auth/callback`

---

## Production Deployment

### Update Redirect URLs

#### Google Cloud Console:
Add production URLs to **Authorized redirect URIs**:
```
https://wasel14.online/app/auth/callback
https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback
```

#### Facebook App Settings:
Add production URLs to **Valid OAuth Redirect URIs**:
```
https://wasel14.online/app/auth/callback
https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback
```

### Update Supabase Site URL

1. Go to Supabase Dashboard > **Authentication** > **URL Configuration**
2. Set **Site URL**: `https://wasel14.online`
3. Add **Redirect URLs**:
   ```
   https://wasel14.online/app/auth/callback
   https://wasel14.online/auth
   ```

### Environment Variables for Production

```bash
VITE_APP_URL=https://wasel14.online
VITE_SUPABASE_URL=https://zexlxabdcsjefptmjhuq.supabase.co
# ... rest of production credentials
```

---

## Testing OAuth Flow

### Manual Testing Checklist

- [ ] Google sign-in opens popup/redirect
- [ ] User can select Google account
- [ ] Consent screen shows correct app name and scopes
- [ ] Successful auth redirects to callback
- [ ] User profile is created in database
- [ ] User is redirected to intended destination
- [ ] Session persists after page refresh
- [ ] Sign out works correctly
- [ ] Facebook sign-in follows same flow
- [ ] Error messages are user-friendly

### Automated E2E Tests

Run OAuth tests:
```bash
npm run test:e2e:oauth
```

---

## Troubleshooting

### Common Issues

#### "redirect_uri_mismatch" Error
**Cause**: Redirect URI not registered in OAuth provider
**Fix**: Add exact redirect URI to Google/Facebook console

#### "invalid_client" Error
**Cause**: Wrong Client ID or Secret
**Fix**: Verify credentials in `.env` match provider console

#### OAuth Popup Blocked
**Cause**: Browser blocking popups
**Fix**: Use redirect flow instead of popup

#### Profile Not Created
**Cause**: Database permissions or profile creation logic
**Fix**: Check Supabase logs and RLS policies

#### Session Not Persisting
**Cause**: Cookie/localStorage issues
**Fix**: Check browser settings and CORS configuration

### Debug Mode

Enable OAuth debugging:
```typescript
// In AuthContext.tsx
if (import.meta.env.DEV) {
  console.log('[OAuth] Provider:', provider);
  console.log('[OAuth] Redirect URL:', redirectTo);
  console.log('[OAuth] Error:', error);
}
```

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Navigate to **Logs** > **Auth Logs**
3. Filter by OAuth events
4. Check for errors

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use environment variables** for all credentials
3. **Rotate secrets** regularly
4. **Limit OAuth scopes** to minimum required
5. **Validate redirect URLs** strictly
6. **Enable PKCE** for additional security
7. **Monitor OAuth usage** for suspicious activity
8. **Use HTTPS** in production always

---

## Support

For issues or questions:
- Email: support@wasel14.online
- Documentation: [docs/README.md](./README.md)
- GitHub Issues: [Create Issue](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/issues)

---

**Last Updated**: 2025-01-15
**Version**: 1.0.0

