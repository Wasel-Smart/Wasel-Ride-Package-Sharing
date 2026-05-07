# OAuth Setup - Copy & Paste Reference Card

## 🔗 QUICK LINKS

### Google Cloud Console
- Main Console: https://console.cloud.google.com/
- API Library: https://console.cloud.google.com/apis/library
- OAuth Consent: https://console.cloud.google.com/apis/credentials/consent
- Credentials: https://console.cloud.google.com/apis/credentials

### Facebook Developers
- Main Console: https://developers.facebook.com/
- My Apps: https://developers.facebook.com/apps/

### Supabase Dashboard
- Your Project: https://app.supabase.com/project/djccmatubyyudeosrngm
- Auth Providers: https://app.supabase.com/project/djccmatubyyudeosrngm/auth/providers
- URL Config: https://app.supabase.com/project/djccmatubyyudeosrngm/auth/url-configuration

---

## 📋 COPY-PASTE VALUES

### Google - Authorized JavaScript Origins
```
http://localhost:5173
http://localhost:4173
https://djccmatubyyudeosrngm.supabase.co
```

### Google - Authorized Redirect URIs
```
http://localhost:54321/auth/v1/callback
https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
```

### Facebook - Valid OAuth Redirect URIs
```
http://localhost:54321/auth/v1/callback
https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
```

### Facebook - App Domains
```
localhost
djccmatubyyudeosrngm.supabase.co
```

### Supabase - Site URL
```
http://localhost:5173
```

### Supabase - Additional Redirect URLs
```
http://localhost:5173/app/auth/callback
http://localhost:5173/**
```

---

## 🔑 CREDENTIALS TEMPLATE

### For .env File

```bash
# Google OAuth
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=GOCSPX-YOUR_SECRET

# Facebook OAuth
VITE_FACEBOOK_APP_ID=YOUR_APP_ID
SUPABASE_AUTH_FACEBOOK_CLIENT_ID=YOUR_APP_ID
SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=YOUR_APP_SECRET
```

---

## 🎯 GOOGLE OAUTH SCOPES

Required scopes to add:
```
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

Or search for:
- `userinfo.email`
- `userinfo.profile`

---

## 🛠️ HELPFUL COMMANDS

### Verify OAuth Setup
```bash
npm run verify:oauth
```

### Interactive Credentials Setup
```bash
node scripts/setup-oauth-credentials.mjs
```

### Start Development Server
```bash
npm run dev
```

### Link Supabase Project
```bash
npx supabase link --project-ref zexlxabdcsjefptmjhuq
```

### Check Supabase Status
```bash
npm run supabase:status
```

### Restart Supabase (if using local)
```bash
npm run supabase:stop
npm run supabase:start
```

---

## 📝 NOTES SPACE

### Google Credentials
```
Client ID: 
Client Secret: 
Created: 
```

### Facebook Credentials
```
App ID: 
App Secret: 
Created: 
```

### Issues Encountered
```


```

### Resolution
```


```

---

## 🚨 COMMON ERRORS & FIXES

### Error: redirect_uri_mismatch
**Copy this exactly:**
```
http://localhost:54321/auth/v1/callback
```
Add to Google Cloud Console > Credentials > Your OAuth Client > Authorized redirect URIs

### Error: invalid_client
- Double-check Client ID and Secret in .env
- Make sure no extra spaces or quotes
- Verify credentials match in provider console

### Error: access_denied
- Check OAuth consent screen is configured
- Add your email as test user in Google Cloud Console
- Make sure app is not in "Testing" mode with restricted users

---

## ✅ VERIFICATION CHECKLIST

Quick check before testing:
- [ ] Google Client ID starts with numbers, ends with `.apps.googleusercontent.com`
- [ ] Google Client Secret starts with `GOCSPX-`
- [ ] Facebook App ID is all numbers
- [ ] Facebook App Secret is alphanumeric string
- [ ] All redirect URIs match exactly (no trailing slashes)
- [ ] .env file saved
- [ ] Development server restarted

---

**Last Updated:** 2025-01-15
**Your Project:** Wasel (djccmatubyyudeosrngm)
