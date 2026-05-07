# Vercel Environment Variables Setup

## Required Steps

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables for **Production**, **Preview**, and **Development**:

## Critical Variables (MUST SET)

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://zexlxabdcsjefptmjhuq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqY2NtYXR1Ynl5dWRlb3NybmdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwNjY5MjUsImV4cCI6MjA3NzQyNjkyNX0.WlYJmK-OUKlNyp3ktcb2ShILFN1vgCumAL4tOATziTQ
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_Iy-jArsso0ehGKQ83kuiDg_1T-cl9zE
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071

# App Configuration (CHANGE THIS TO YOUR VERCEL DOMAIN)
VITE_APP_URL=https://your-app.vercel.app
VITE_APP_NAME=Wasel

# API Configuration (Use Supabase URL as API)
VITE_API_URL=https://zexlxabdcsjefptmjhuq.supabase.co

# Feature Flags
VITE_ENABLE_DEMO_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ENABLE_TWO_FACTOR_AUTH=false
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=false
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=false

# Auth
VITE_AUTH_CALLBACK_PATH=/app/auth/callback

# Support
VITE_SUPPORT_EMAIL=support@wasel.app
VITE_SUPPORT_PHONE_NUMBER=962790000000

# Google Maps & OAuth
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBWqXeMJ-oPSDpqeR548hw3QUU0EaxE85s
VITE_GOOGLE_CLIENT_ID=235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SZmpKENhKSYxMCXJ2TgwgNMNjUjHk5CwPQ31zWTEsokWdkD7GgaVhgU3ZPD7ti5gd6NWBvwdWcH3R0hXQCOG3QI00lTUi6x7v
```

## Important Notes

1. **VITE_APP_URL**: After your first deployment, update this to your actual Vercel URL (e.g., `https://wasel-app.vercel.app`)
2. **VITE_API_URL**: Set this to your Supabase URL to satisfy the validation
3. All URLs MUST use `https://` in production (not `http://`)
4. Don't add server-side secrets (SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, etc.) to Vercel unless you have backend functions

## Quick Setup Command

You can also use Vercel CLI:

```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production
vercel env add VITE_APP_URL production
vercel env add VITE_API_URL production
```

## After Adding Variables

1. Redeploy your application
2. Update `VITE_APP_URL` to match your actual Vercel domain
3. Update Supabase Auth settings to allow your Vercel domain as a redirect URL
