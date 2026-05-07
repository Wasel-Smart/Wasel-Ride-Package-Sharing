# OAuth Setup Progress Tracker

## 🔵 GOOGLE OAUTH (Track Your Progress)

### Phase 1: Google Cloud Console Setup
- [ ] Opened https://console.cloud.google.com/
- [ ] Signed in with Google account
- [ ] Created new project named "Wasel"
- [ ] Project is selected (check top-left dropdown)

### Phase 2: Enable API
- [ ] Opened https://console.cloud.google.com/apis/library
- [ ] Searched for "Google+ API"
- [ ] Clicked "Enable"
- [ ] API is now enabled (green checkmark)

### Phase 3: OAuth Consent Screen
- [ ] Opened https://console.cloud.google.com/apis/credentials/consent
- [ ] Selected "External" user type
- [ ] Entered app name: "Wasel"
- [ ] Entered support email
- [ ] Entered developer email
- [ ] Added scopes: userinfo.email, userinfo.profile
- [ ] Added test user (your email)
- [ ] Saved consent screen

### Phase 4: Create Credentials
- [ ] Opened https://console.cloud.google.com/apis/credentials
- [ ] Clicked "CREATE CREDENTIALS" > "OAuth client ID"
- [ ] Selected "Web application"
- [ ] Named it "Wasel Web Client"
- [ ] Added JavaScript origins:
  - [ ] http://localhost:5173
  - [ ] http://localhost:4173
  - [ ] https://djccmatubyyudeosrngm.supabase.co
- [ ] Added redirect URIs:
  - [ ] http://localhost:54321/auth/v1/callback
  - [ ] https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
- [ ] Clicked "CREATE"
- [ ] **COPIED Client ID:** _______________________________________________
- [ ] **COPIED Client Secret:** ___________________________________________

---

## 🔷 FACEBOOK OAUTH (Track Your Progress)

### Phase 1: Facebook Developers Setup
- [ ] Opened https://developers.facebook.com/
- [ ] Signed in with Facebook account
- [ ] Completed developer registration (if needed)

### Phase 2: Create App
- [ ] Clicked "My Apps" > "Create App"
- [ ] Selected "Consumer" app type
- [ ] Entered app name: "Wasel"
- [ ] Entered contact email
- [ ] Clicked "Create App"
- [ ] Completed security check

### Phase 3: Add Facebook Login
- [ ] Found "Facebook Login" in products
- [ ] Clicked "Set up"
- [ ] Selected "Web" platform
- [ ] Entered site URL: http://localhost:5173
- [ ] Saved and continued

### Phase 4: Configure Settings
- [ ] Opened Facebook Login > Settings
- [ ] Added redirect URIs:
  - [ ] http://localhost:54321/auth/v1/callback
  - [ ] https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
- [ ] Clicked "Save Changes"

### Phase 5: Get Credentials
- [ ] Opened Settings > Basic
- [ ] **COPIED App ID:** _________________________________________________
- [ ] Clicked "Show" on App Secret
- [ ] **COPIED App Secret:** _____________________________________________
- [ ] Added app domain: localhost
- [ ] Saved changes

---

## ⚙️ SUPABASE CONFIGURATION

### Configure Providers
- [ ] Opened https://app.supabase.com/project/djccmatubyyudeosrngm
- [ ] Went to Authentication > Providers
- [ ] Enabled Google provider
- [ ] Entered Google Client ID
- [ ] Entered Google Client Secret
- [ ] Saved Google provider
- [ ] Enabled Facebook provider
- [ ] Entered Facebook App ID
- [ ] Entered Facebook App Secret
- [ ] Saved Facebook provider

### Configure URLs
- [ ] Went to Authentication > URL Configuration
- [ ] Set Site URL: http://localhost:5173
- [ ] Added redirect URLs:
  - [ ] http://localhost:5173/app/auth/callback
  - [ ] http://localhost:5173/**
- [ ] Saved URL configuration

---

## 💻 LOCAL SETUP

### Update .env File
- [ ] Opened .env file
- [ ] Updated VITE_GOOGLE_CLIENT_ID
- [ ] Updated SUPABASE_AUTH_GOOGLE_CLIENT_ID
- [ ] Updated SUPABASE_AUTH_GOOGLE_CLIENT_SECRET
- [ ] Updated VITE_FACEBOOK_APP_ID
- [ ] Updated SUPABASE_AUTH_FACEBOOK_CLIENT_ID
- [ ] Updated SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET
- [ ] Saved .env file

### Verify Setup
- [ ] Ran: npm run verify:oauth
- [ ] All checks passed ✅
- [ ] Ran: npm run dev
- [ ] Server started successfully

---

## ✅ TESTING

### Test Google Sign-In
- [ ] Opened http://localhost:5173/auth/sign-in
- [ ] Clicked "Continue with Google"
- [ ] Selected Google account
- [ ] Granted permissions
- [ ] Redirected back successfully
- [ ] User is signed in

### Test Facebook Sign-In
- [ ] Opened http://localhost:5173/auth/sign-in
- [ ] Clicked "Continue with Facebook"
- [ ] Logged in with Facebook
- [ ] Granted permissions
- [ ] Redirected back successfully
- [ ] User is signed in

---

## 🎉 COMPLETION

- [ ] Both Google and Facebook OAuth working
- [ ] No warnings when running: npx supabase link
- [ ] Ready for development!

---

**Date Started:** _______________
**Date Completed:** _______________
**Notes:**
