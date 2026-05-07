# OAuth Quick Start Guide

Get Google and Facebook authentication working in 5 minutes.

## Prerequisites

- Supabase project running
- Google Cloud Console access
- Facebook Developer account

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Get Google Credentials (2 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Google+ API
3. OAuth consent screen → External → Fill required fields
4. Credentials → Create OAuth Client ID → Web application
5. Add redirect URI: `http://localhost:54321/auth/v1/callback`
6. Copy **Client ID** and **Client Secret**

### Step 2: Get Facebook Credentials (2 min)

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create App → Consumer type
3. Add Facebook Login product
4. Settings → Add redirect URI: `http://localhost:54321/auth/v1/callback`
5. Copy **App ID** and **App Secret**

### Step 3: Configure Environment (1 min)

Add to `.env`:

```bash
# Google OAuth
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=your-client-secret

# Facebook OAuth
VITE_FACEBOOK_APP_ID=your-facebook-app-id
SUPABASE_AUTH_FACEBOOK_CLIENT_ID=your-facebook-app-id
SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
```

### Step 4: Enable in Supabase

**Option A: Dashboard (Recommended)**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google → Paste Client ID and Secret
3. Enable Facebook → Paste App ID and Secret

**Option B: Local Config**
```bash
# Already configured in supabase/config.toml
npm run supabase:stop
npm run supabase:start
```

### Step 5: Test It

```bash
npm run dev
# Navigate to http://localhost:5173/auth
# Click Google or Facebook button
# Complete sign-in
```

---

## ✅ Verify Setup

```bash
npm run verify:oauth
```

Should show all green checkmarks ✅

---

## 🎯 Production Setup

### Update Redirect URLs

**Google Console:**
```
https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
https://wasel14.online/app/auth/callback
```

**Facebook Console:**
```
https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
https://wasel14.online/app/auth/callback
```

### Update Supabase

Dashboard → Authentication → URL Configuration:
- Site URL: `https://wasel14.online`
- Add redirect URLs above

---

## 🐛 Troubleshooting

### "redirect_uri_mismatch"
→ Add exact URI to provider console

### "invalid_client"
→ Check Client ID/Secret in `.env`

### Popup blocked
→ Allow popups or use redirect flow

### More help
→ See [Full OAuth Setup Guide](./oauth-setup-guide.md)

---

## 📚 Next Steps

- [ ] Test both providers
- [ ] Run E2E tests: `npm run test:e2e:oauth`
- [ ] Review [OAuth Setup Checklist](./oauth-setup-checklist.md)
- [ ] Configure production URLs
- [ ] Deploy and test live

---

**Need Help?**  
Email: support@wasel14.online  
Docs: [oauth-setup-guide.md](./oauth-setup-guide.md)
