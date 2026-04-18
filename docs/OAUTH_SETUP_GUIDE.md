# 🔐 Wasel OAuth & Authentication Setup Guide

## 📋 Complete Credentials Reference

### Supabase Configuration
```env
# Project URL
VITE_SUPABASE_URL=https://djccmatubyyudeosrngm.supabase.co

# Anon Key (Public)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2NtYXR1Ynl5dWRlb3NybmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNjY5MjUsImV4cCI6MjA3NzQyNjkyNX0.WlYJmK-OUKlNyp3ktcb2ShILFN1vgCumAL4tOATziTQ

# Publishable Key
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Iy-jArsso0ehGKQ83kuiDg_1T-cl9zE

# Service Role Key (Server-side only - DO NOT expose to frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2NtYXR1Ynl5dWRlb3NybmdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjA2NjkyNSwiZXhwIjoyMDc3NDI2OTI1fQ.7_fGWjK9c8iGk36iHMqH37nBJEAdosg4G8aZSaYdWeQ
```

### Google OAuth Configuration
```env
# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBWqXeMJ-oPSDpqeR548hw3QUU0EaxE85s

# Google OAuth Client IDs
VITE_GOOGLE_CLIENT_ID=235290462223-slmuhn0n9nvmalq3tfdt7cl5de55fcnp.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_ID_ALT=235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com
```

### Stripe Configuration
```env
# Stripe Publishable Key (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SZmpKENhKSYxMCXJ2TgwgNMNjUjHk5CwPQ31zWTEsokWdkD7GgaVhgU3ZPD7ti5gd6NWBvwdWcH3R0hXQCOG3QI00lTUi6x7v

# Stripe Secret Key (Backend only)
STRIPE_SECRET_KEY=sk_test_51SZmpKENhKSYxMCX03sEOKEiljDGWYTX0ZKTVmqKM0NeNH60jWc6pzyW8vaMHr7ahEKfKRNG24UqNrlsELnEGvHZ004Ec5d33u
```

### Twilio Configuration
```env
# Twilio Account SID
TWILIO_ACCOUNT_SID=AC1386e065d313ae43d256ca0394d0b4e6

# Twilio Auth Token
TWILIO_AUTH_TOKEN=5005d351cb6bee711cb5127a7d192728

# Twilio API Key
TWILIO_API_KEY_SID=SK4519926e3b0a4186bee07283ab57b018
TWILIO_API_KEY_SECRET=LCnyYDzwgp4n9qqg7hx2nf0HRvOLnRQU
```

---

## 🔧 OAuth Setup Instructions

### 1. Supabase OAuth Configuration

#### Step 1: Access Supabase Dashboard
```
URL: https://supabase.com/dashboard/project/djccmatubyyudeosrngm
```

#### Step 2: Configure Redirect URLs
Navigate to: **Authentication → URL Configuration**

Add these redirect URLs:
```
http://localhost:3000/app/auth/callback
http://localhost:5173/app/auth/callback
https://your-production-domain.com/app/auth/callback
```

#### Step 3: Enable OAuth Providers
Navigate to: **Authentication → Providers**

**Enable Google:**
- Provider: Google
- Client ID: `235290462223-slmuhn0n9nvmalq3tfdt7cl5de55fcnp.apps.googleusercontent.com`
- Client Secret: (Get from Google Cloud Console)
- Redirect URL: `https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback`

**Enable Facebook:**
- Provider: Facebook
- App ID: (Get from Facebook Developers)
- App Secret: (Get from Facebook Developers)
- Redirect URL: `https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback`

---

### 2. Google Cloud Console Setup

#### Step 1: Access Google Cloud Console
```
URL: https://console.cloud.google.com/auth/overview?project=wasel14
```

#### Step 2: Configure OAuth Consent Screen
1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** user type
3. Fill in application details:
   - App name: Wasel
   - User support email: support@wasel.com
   - Developer contact: support@wasel.com

#### Step 3: Create OAuth 2.0 Client ID
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: Wasel Production
5. Authorized JavaScript origins:
   ```
   http://localhost:3000
   http://localhost:5173
   https://your-production-domain.com
   ```
6. Authorized redirect URIs:
   ```
   http://localhost:3000/app/auth/callback
   http://localhost:5173/app/auth/callback
   https://your-production-domain.com/app/auth/callback
   https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
   ```

#### Step 4: Enable Required APIs
Enable these APIs in Google Cloud Console:
- Google Maps JavaScript API
- Google Maps Geocoding API
- Google Maps Places API
- Google+ API (for OAuth)

---

### 3. Facebook Developers Setup

#### Step 1: Access Facebook Developers
```
URL: https://developers.facebook.com/apps
```

#### Step 2: Create/Configure App
1. Create new app or select existing
2. Add **Facebook Login** product
3. Configure OAuth redirect URIs:
   ```
   https://djccmatubyyudeosrngm.supabase.co/auth/v1/callback
   ```

#### Step 3: Get Credentials
1. Go to **Settings → Basic**
2. Copy **App ID** and **App Secret**
3. Add to Supabase OAuth configuration

---

## 🔐 OAuth Flow Implementation

### Frontend Code (Already Implemented)

**Location:** `src/contexts/AuthContext.tsx`

```typescript
// Google Sign-In
const signInWithGoogle = useCallback(async (returnTo?: string) => {
  return signInWithOAuthProvider(supabase, 'google', returnTo);
}, []);

// Facebook Sign-In
const signInWithFacebook = useCallback(async (returnTo?: string) => {
  return signInWithOAuthProvider(supabase, 'facebook', returnTo);
}, []);
```

**Location:** `src/pages/WaselAuth.tsx`

```typescript
// Google Sign-In Handler
const handleGoogleSignIn = async () => {
  setError('');
  setPendingAction('google');
  const { error: oauthError } = await signInWithGoogle(safeReturnTo);
  setPendingAction(null);
  if (oauthError) setError(friendlyAuthError(oauthError, 'Google sign-in failed.'));
};

// Facebook Sign-In Handler
const handleFacebookSignIn = async () => {
  setError('');
  setPendingAction('facebook');
  const { error: oauthError } = await signInWithFacebook(safeReturnTo);
  setPendingAction(null);
  if (oauthError) setError(friendlyAuthError(oauthError, 'Facebook sign-in failed.'));
};
```

### Callback Handler (Already Implemented)

**Location:** `src/pages/WaselAuthCallback.tsx`

Handles:
- OAuth code exchange
- Session establishment
- Password recovery flows
- Redirect to original destination

---

## 🧪 Testing OAuth Flow

### Test Google Sign-In:
1. Navigate to: `http://localhost:3000/app/auth?tab=signin`
2. Click "Continue with Google"
3. Select Google account
4. Should redirect to: `http://localhost:3000/app/auth/callback`
5. Then redirect to: `http://localhost:3000/app/find-ride`

### Test Facebook Sign-In:
1. Navigate to: `http://localhost:3000/app/auth?tab=signin`
2. Click "Continue with Facebook"
3. Login with Facebook
4. Should redirect to: `http://localhost:3000/app/auth/callback`
5. Then redirect to: `http://localhost:3000/app/find-ride`

---

## 🐛 Common OAuth Issues & Solutions

### Issue 1: "Redirect URI mismatch"
**Solution:**
1. Check Supabase redirect URLs match exactly
2. Check Google Cloud Console authorized redirect URIs
3. Ensure no trailing slashes

### Issue 2: "OAuth client not found"
**Solution:**
1. Verify Google Client ID in `.env` file
2. Check Supabase OAuth provider configuration
3. Ensure OAuth consent screen is published

### Issue 3: "Invalid redirect_uri parameter"
**Solution:**
1. Add all possible redirect URIs to Google Cloud Console
2. Include both localhost and production URLs
3. Include Supabase callback URL

### Issue 4: "Access blocked: This app's request is invalid"
**Solution:**
1. Verify OAuth consent screen is configured
2. Add test users in Google Cloud Console
3. Publish OAuth consent screen for production

---

## 🔒 Security Best Practices

### 1. Environment Variables
```bash
# NEVER commit these files:
.env
.env.local
.env.production

# ALWAYS use .env.example as template
```

### 2. Client ID vs Secret
```
✅ Client ID: Safe to expose in frontend
❌ Client Secret: NEVER expose in frontend
❌ Service Role Key: NEVER expose in frontend
```

### 3. Redirect URL Validation
```typescript
// Always validate redirect URLs
const safeReturnTo = (() => {
  const raw = params.get('returnTo') || '/app/find-ride';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/find-ride';
})();
```

---

## 📱 Mobile OAuth Configuration

### iOS (React Native / Capacitor)
```typescript
// Add to Info.plist
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>wasel</string>
    </array>
  </dict>
</array>
```

### Android (React Native / Capacitor)
```xml
<!-- Add to AndroidManifest.xml -->
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="wasel" />
</intent-filter>
```

---

## 🚀 Production Deployment Checklist

### Before Deployment:
- [ ] Update `.env.production` with production URLs
- [ ] Add production redirect URLs to Supabase
- [ ] Add production redirect URLs to Google Cloud Console
- [ ] Add production redirect URLs to Facebook Developers
- [ ] Test OAuth flow on staging environment
- [ ] Verify SSL certificate is valid
- [ ] Test on mobile devices (iOS, Android)

### After Deployment:
- [ ] Test Google Sign-In on production
- [ ] Test Facebook Sign-In on production
- [ ] Monitor error logs for OAuth issues
- [ ] Set up OAuth analytics tracking

---

## 📊 OAuth Analytics

### Track OAuth Events:
```typescript
// Track Google Sign-In
analytics.track('oauth_signin_started', { provider: 'google' });
analytics.track('oauth_signin_completed', { provider: 'google' });

// Track Facebook Sign-In
analytics.track('oauth_signin_started', { provider: 'facebook' });
analytics.track('oauth_signin_completed', { provider: 'facebook' });
```

---

## 🔗 Useful Links

### Supabase:
- Dashboard: https://supabase.com/dashboard/project/djccmatubyyudeosrngm
- Auth Docs: https://supabase.com/docs/guides/auth
- OAuth Docs: https://supabase.com/docs/guides/auth/social-login

### Google:
- Cloud Console: https://console.cloud.google.com/auth/overview?project=wasel14
- OAuth Docs: https://developers.google.com/identity/protocols/oauth2

### Facebook:
- Developers: https://developers.facebook.com/apps
- Login Docs: https://developers.facebook.com/docs/facebook-login
- **Complete Guide**: [FACEBOOK_OAUTH_COMPLETE.md](./FACEBOOK_OAUTH_COMPLETE.md) ✅

---

## ✅ Verification Checklist

- [x] Supabase project configured
- [x] Google OAuth client created
- [x] Facebook App configured ✅
- [x] Redirect URLs configured
- [x] Environment variables set
- [x] Frontend code implemented
- [x] Callback handler implemented
- [x] Android deep link configured ✅
- [x] Key hashes added ✅
- [ ] Test Google Sign-In (local)
- [ ] Test Facebook Sign-In (local)
- [ ] Test on mobile devices
- [ ] Deploy to production
- [ ] Test on production

---

## 📞 Support

For OAuth issues:
1. Check Supabase logs: Dashboard → Logs → Auth
2. Check browser console for errors
3. Verify redirect URLs match exactly
4. Test with different browsers
5. Clear browser cache and cookies

---

**Status**: ✅ **CONFIGURED**
**OAuth Providers**: Google, Facebook
**Framework**: React 18 + Supabase Auth
**Ready for**: Production Deployment

---

**Last Updated**: January 2026
**Version**: 2.0.0
