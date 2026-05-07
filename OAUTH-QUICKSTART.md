# OAuth Quick Start Guide - Step by Step

Follow these exact steps to get your OAuth credentials.

## 🔵 GOOGLE OAUTH SETUP (15 minutes)

### Step 1: Access Google Cloud Console
1. Open: https://console.cloud.google.com/
2. Sign in with your Google account

### Step 2: Create Project
1. Click the project dropdown (top left, next to "Google Cloud")
2. Click "NEW PROJECT"
3. Project name: `Wasel`
4. Click "CREATE"
5. Wait for project creation, then select it

### Step 3: Enable Google+ API
1. Go to: https://console.cloud.google.com/apis/library
2. Search: `Google+ API`
3. Click on "Google+ API"
4. Click "ENABLE"
5. Wait for it to enable

### Step 4: Configure OAuth Consent Screen
1. Go to: https://console.cloud.google.com/apis/credentials/consent
2. Select "External" user type
3. Click "CREATE"
4. Fill in the form:
   - **App name**: `Wasel`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click "SAVE AND CONTINUE"
6. On "Scopes" page, click "ADD OR REMOVE SCOPES"
7. Select these scopes:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
8. Click "UPDATE" then "SAVE AND CONTINUE"
9. On "Test users" page, click "ADD USERS"
10. Add your email address
11. Click "SAVE AND CONTINUE"
12. Review and click "BACK TO DASHBOARD"

### Step 5: Create OAuth Credentials
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click "CREATE CREDENTIALS" > "OAuth client ID"
3. Application type: **Web application**
4. Name: `Wasel Web Client`
5. Under "Authorized JavaScript origins", click "ADD URI":
   ```
   http://localhost:5173
   http://localhost:4173
   https://djccmatubyyudeosrngm.supabase.co
   ```
6. Under "Authorized redirect URIs", click "ADD URI":
   ```
   http://localhost:54321/auth/v1/callback
   https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
   ```
7. Click "CREATE"
8. **COPY YOUR CREDENTIALS** (you'll need these):
   - Client ID: `xxxxx.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-xxxxx`

### Step 6: Add to .env File
Open your `.env` file and replace these lines:
```bash
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE.apps.googleusercontent.com
SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

---

## 🔷 FACEBOOK OAUTH SETUP (15 minutes)

### Step 1: Access Facebook Developers
1. Open: https://developers.facebook.com/
2. Sign in with your Facebook account
3. If prompted, complete developer registration

### Step 2: Create App
1. Click "My Apps" (top right)
2. Click "Create App"
3. Select "Consumer" as app type
4. Click "Next"
5. Fill in:
   - **App name**: `Wasel`
   - **App contact email**: Your email
6. Click "Create App"
7. Complete security check if prompted

### Step 3: Add Facebook Login
1. In your app dashboard, find "Add products to your app"
2. Find "Facebook Login" card
3. Click "Set up"
4. Select "Web" platform
5. Enter Site URL: `http://localhost:5173`
6. Click "Save" then "Continue"
7. Skip the rest of the quickstart

### Step 4: Configure Facebook Login Settings
1. In left sidebar, click "Facebook Login" > "Settings"
2. Under "Valid OAuth Redirect URIs", add:
   ```
   http://localhost:54321/auth/v1/callback
   https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
   ```
3. Click "Save Changes"

### Step 5: Get App Credentials
1. In left sidebar, click "Settings" > "Basic"
2. **COPY YOUR CREDENTIALS**:
   - App ID: `123456789012345`
   - App Secret: Click "Show", then copy
3. Under "App Domains", add: `localhost`
4. Click "Save Changes"

### Step 6: Add to .env File
Open your `.env` file and replace these lines:
```bash
VITE_FACEBOOK_APP_ID=YOUR_APP_ID_HERE
SUPABASE_AUTH_FACEBOOK_CLIENT_ID=YOUR_APP_ID_HERE
SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=YOUR_APP_SECRET_HERE
```

---

## ⚙️ CONFIGURE SUPABASE DASHBOARD

### Step 1: Access Supabase Project
1. Open: https://app.supabase.com/project/djccmatubyyudeosrngm
2. Sign in if needed

### Step 2: Enable Google Provider
1. Go to: Authentication > Providers
2. Find "Google" in the list
3. Toggle it ON
4. Enter:
   - **Client ID**: Your Google Client ID
   - **Client Secret**: Your Google Client Secret
5. Click "Save"

### Step 3: Enable Facebook Provider
1. Still in Authentication > Providers
2. Find "Facebook" in the list
3. Toggle it ON
4. Enter:
   - **Client ID**: Your Facebook App ID
   - **Client Secret**: Your Facebook App Secret
5. Click "Save"

### Step 4: Configure Site URL
1. Go to: Authentication > URL Configuration
2. Set **Site URL**: `http://localhost:5173`
3. Under "Redirect URLs", add:
   ```
   http://localhost:5173/app/auth/callback
   http://localhost:5173/**
   ```
4. Click "Save"

---

## ✅ VERIFY YOUR SETUP

### Step 1: Check Environment Variables
```bash
npm run verify:oauth
```

You should see all green checkmarks ✅

### Step 2: Restart Development Server
```bash
npm run dev
```

### Step 3: Test Google Sign-In
1. Open: http://localhost:5173/auth/sign-in
2. Click "Continue with Google"
3. Select your Google account
4. Grant permissions
5. You should be redirected back and signed in

### Step 4: Test Facebook Sign-In
1. Go back to: http://localhost:5173/auth/sign-in
2. Click "Continue with Facebook"
3. Log in with Facebook
4. Grant permissions
5. You should be redirected back and signed in

---

## 🚨 TROUBLESHOOTING

### "redirect_uri_mismatch" Error
- **Problem**: Redirect URI not registered
- **Fix**: Go back to Google Cloud Console > Credentials
- **Add exactly**: `http://localhost:54321/auth/v1/callback`

### "invalid_client" Error
- **Problem**: Wrong credentials in .env
- **Fix**: Double-check Client ID and Secret match exactly
- **Tip**: No extra spaces or quotes

### OAuth Popup Blocked
- **Problem**: Browser blocking popup
- **Fix**: Allow popups for localhost in browser settings

### Can't Find OAuth Buttons
- **Problem**: Frontend not configured
- **Fix**: Check that sign-in page has Google/Facebook buttons

### Still Getting Warnings?
```bash
# Check your .env file has all variables
cat .env | grep SUPABASE_AUTH

# Should show:
# SUPABASE_AUTH_GOOGLE_CLIENT_ID=...
# SUPABASE_AUTH_GOOGLE_CLIENT_SECRET=...
# SUPABASE_AUTH_FACEBOOK_CLIENT_ID=...
# SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET=...
```

---

## 📋 CHECKLIST

- [ ] Google Cloud project created
- [ ] Google+ API enabled
- [ ] OAuth consent screen configured
- [ ] Google OAuth credentials created
- [ ] Google credentials added to .env
- [ ] Facebook app created
- [ ] Facebook Login product added
- [ ] Facebook redirect URIs configured
- [ ] Facebook credentials added to .env
- [ ] Supabase Google provider enabled
- [ ] Supabase Facebook provider enabled
- [ ] `npm run verify:oauth` passes
- [ ] Google sign-in works
- [ ] Facebook sign-in works

---

## 🎯 NEXT STEPS

Once OAuth is working:
1. Link your Supabase project: `npx supabase link --project-ref zexlxabdcsjefptmjhuq`
2. Run full verification: `npm run verify`
3. Deploy to production (update redirect URIs with production URLs)

---

**Need Help?**
- Check: [OAuth Setup Guide](./oauth-setup-guide.md)
- Check: [OAuth Setup Checklist](./oauth-setup-checklist.md)
- Email: support@wasel14.online
