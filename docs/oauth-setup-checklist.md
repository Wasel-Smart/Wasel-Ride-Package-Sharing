# OAuth Setup Checklist

Quick reference checklist to ensure Google and Facebook OAuth are properly configured for Wasel.

## ✅ Pre-Setup Requirements

- [ ] Active Supabase project selected.
- [ ] Google Cloud Console access
- [ ] Facebook Developer account
- [ ] Domain access (for production): `wasel14.online`

---

## 🔵 Google OAuth Setup

### Google Cloud Console

- [ ] Created/selected Google Cloud project
- [ ] Enabled Google+ API
- [ ] Configured OAuth consent screen
  - [ ] App name: "Wasel"
  - [ ] Support email set
  - [ ] Scopes: `userinfo.email`, `userinfo.profile`
- [ ] Created OAuth 2.0 Client ID
  - [ ] Type: Web application
  - [ ] Authorized JavaScript origins added
  - [ ] Authorized redirect URIs added
- [ ] Copied Client ID
- [ ] Copied Client Secret

### Environment Variables

- [ ] Added `VITE_GOOGLE_CLIENT_ID` to `.env`
- [ ] Added `SUPABASE_AUTH_GOOGLE_CLIENT_ID` to `.env`
- [ ] Added `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET` to `.env`
- [ ] Verified no placeholder values remain

### Supabase Configuration

- [ ] Enabled Google provider in Supabase Dashboard
- [ ] OR configured `[auth.external.google]` in `supabase/config.toml`
- [ ] Verified redirect URI matches Supabase callback URL

---

## 🔷 Facebook OAuth Setup

### Facebook Developer Console

- [ ] Created Facebook App
- [ ] Added Facebook Login product
- [ ] Configured Valid OAuth Redirect URIs
- [ ] Added app domain
- [ ] Copied App ID
- [ ] Copied App Secret
- [ ] Set app to Live mode (production only)

### Environment Variables

- [ ] Added `VITE_FACEBOOK_APP_ID` to `.env`
- [ ] Added `SUPABASE_AUTH_FACEBOOK_CLIENT_ID` to `.env`
- [ ] Added `SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET` to `.env`
- [ ] Verified no placeholder values remain

### Supabase Configuration

- [ ] Enabled Facebook provider in Supabase Dashboard
- [ ] OR configured `[auth.external.facebook]` in `supabase/config.toml`
- [ ] Verified redirect URI matches Supabase callback URL

---

## 🔧 Local Development Setup

### Configuration Files

- [ ] `.env` file exists and is populated
- [ ] `supabase/config.toml` has OAuth sections enabled
- [ ] No secrets committed to git (check `.gitignore`)

### Redirect URLs (Development)

- [ ] `http://localhost:5173` added to Google authorized origins
- [ ] `http://localhost:54321/auth/v1/callback` added to Google redirect URIs
- [ ] `http://localhost:54321/auth/v1/callback` added to Facebook redirect URIs
- [ ] `VITE_AUTH_CALLBACK_PATH=/app/auth/callback` set in `.env`

### Supabase Local

- [ ] Supabase CLI installed
- [ ] Local Supabase started: `npm run supabase:start`
- [ ] Database migrations applied
- [ ] Auth configuration loaded

---

## 🚀 Production Setup

### Redirect URLs (Production)

- [ ] `https://wasel14.online` added to Google authorized origins
- [ ] `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` added to Google

  - [ ] `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` added to Facebook

  - **Check**: `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback` for production

### "invalid_client"
- **Fix**: Verify Client ID and Secret match in `.env` and provider console
- **Check**: No extra spaces or quotes in `.env` values

### OAuth popup blocked
- **Fix**: Allow popups for localhost/wasel14.online
- **Alternative**: Use redirect flow instead of popup

### Profile not created
- **Fix**: Check Supabase logs for errors
- **Check**: RLS policies allow profile creation
- **Check**: `authAPI.createProfile()` function works

### Session not persisting
- **Fix**: Check browser localStorage/cookies
- **Check**: CORS configuration
- **Check**: Supabase session refresh settings

---

## 📚 Documentation References

- [OAuth Setup Guide](./oauth-setup-guide.md) - Detailed setup instructions
- [Security & Identity](./security-and-identity.md) - Authentication architecture
- [API Contract](./api-contract.md) - Auth endpoints
- [Testing Guide](./testing.md) - E2E test setup

---

## 🎯 Success Criteria (10/10)

Your OAuth setup is 10/10 when:

- ✅ All checklist items completed
- ✅ `npm run verify:oauth` passes
- ✅ Both Google and Facebook sign-in work
- ✅ User profiles created automatically
- ✅ Sessions persist correctly
- ✅ Error messages are user-friendly
- ✅ E2E tests pass
- ✅ Production deployment works
- ✅ No secrets in version control
- ✅ Documentation is up to date

---

**Last Updated**: 2025-01-15  
**Maintained By**: Wasel Engineering Team  
**Support**: support@wasel14.online

