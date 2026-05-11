# Vercel Environment Variables Setup

## Required Environment Variables

Add these in Vercel Dashboard → Your Project → Settings → Environment Variables

### Critical (Required for Build)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### App Configuration

```
VITE_APP_URL=https://your-app.vercel.app
VITE_APP_NAME=Wasel
```

### Maps

```
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### OAuth (Client-Side)

```
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_FACEBOOK_APP_ID=your-facebook-app-id
```

### Support Contact

```
VITE_SUPPORT_WHATSAPP_NUMBER=962790000000
VITE_SUPPORT_EMAIL=support@wasel.jo
VITE_SUPPORT_PHONE_NUMBER=962790000000
VITE_SUPPORT_SMS_NUMBER=962790000000
VITE_AUTH_CALLBACK_PATH=/app/auth/callback
```

### Feature Flags

```
VITE_ENABLE_TWO_FACTOR_AUTH=false
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=true
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=true
VITE_ENABLE_DEMO_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
```

### Payments

```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Monitoring & Analytics

```
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_ANALYTICS_ENDPOINT=https://analytics.wasel14.online/api/v1
VITE_CDN_URL=https://cdn.wasel14.online
```

### Edge Function

```
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
```

## Optional Overrides

```
VITE_EDGE_FUNCTIONS_BASE_URL=https://your-project.supabase.co/functions/v1
VITE_API_URL=https://api.example.com
```

## Important Notes

1. **Only add VITE_* prefixed variables** - These are safe for browser exposure
2. **DO NOT add these server-side secrets to Vercel** (for static site deployment):
   - SUPABASE_SERVICE_ROLE_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_WEBHOOK_SECRET
   - TWILIO_AUTH_TOKEN
   - SENDGRID_API_KEY
   - RESEND_API_KEY
   - Any *_SECRET or *_PRIVATE_KEY variables

3. **Environment Scope**: Set variables for:
   - Production (required)
   - Preview (recommended)
   - Development (optional)

4. **After adding variables**: Redeploy your project

## Quick Setup Script

Copy all VITE_* variables from your local `.env` file and paste them into Vercel Dashboard.

## Verification

After deployment, check browser console for any missing environment variable warnings.
