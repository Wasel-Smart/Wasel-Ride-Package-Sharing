# Complete Deployment Guide - 100% Connectivity

This guide ensures **100% frontend-backend connectivity** by covering:
1. ✅ Edge Function Deployment
2. ✅ Provider Credentials Configuration
3. ✅ Production Environment Setup

---

## Phase 1: Edge Function Deployment

### Step 1.1: Install Supabase CLI (if not installed)
```bash
npm install -g supabase
```

### Step 1.2: Login to Supabase
```bash
supabase login
```

### Step 1.3: Link to Production Project
```bash
# Link to your production Supabase project
supabase link --project-ref zexlxabdcsjefptmjhuq
```

### Step 1.4: Deploy Edge Function
```bash
# Deploy the edge function to production
supabase functions deploy make-server-0b1f4071

# Verify deployment
supabase functions list
```

### Step 1.5: Set Edge Function Secrets
```bash
# Set all required secrets for the edge function
supabase secrets set \
  SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co" \
  SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0" \
  SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc3NTcyNiwiZXhwIjoyMDkzMzUxNzI2fQ.YT92TwRlZDMvyu11sTzuB2mhlSIHVplxT5EybXio30U" \
  APP_BASE_URL="https://wasel14.online"

# Verify secrets are set
supabase secrets list
```

### Step 1.6: Test Edge Function
```bash
# Test the health endpoint
curl https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health
```

**Expected Response:**
```json
{
  "service": "make-server-0b1f4071",
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Phase 2: Provider Credentials Configuration

### Step 2.1: Google OAuth Setup

1. **Go to Google Cloud Console**: https://console.cloud.google.com
2. **Create/Select Project**: "Wasel Production"
3. **Enable APIs**:
   - Google+ API
   - Google Maps JavaScript API
4. **Create OAuth 2.0 Credentials**:
   - Application type: Web application
   - Authorized JavaScript origins:
     - `https://wasel14.online`
     - `https://zexlxabdcsjefptmjhuq.supabase.co`
   - Authorized redirect URIs:
     - `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback`
     - `https://wasel14.online/app/auth/callback`
5. **Copy Credentials**:
   - Client ID: `235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com`
   - Client Secret: (copy from console)

### Step 2.2: Facebook OAuth Setup

1. **Go to Facebook Developers**: https://developers.facebook.com
2. **Create App**: "Wasel"
3. **Add Facebook Login Product**
4. **Configure OAuth Redirect URIs**:
   - `https://zexlxabdcsjefptmjhuq.supabase.co/auth/v1/callback`
   - `https://wasel14.online/app/auth/callback`
5. **Copy Credentials**:
   - App ID: (from dashboard)
   - App Secret: (from dashboard)

### Step 2.3: Stripe Setup

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Switch to Live Mode**
3. **Get API Keys**:
   - Publishable key: `pk_live_...`
   - Secret key: `sk_live_...`
4. **Create Webhook**:
   - URL: `https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/payments/webhooks/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `checkout.session.expired`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
     - `payment_intent.payment_failed`
   - Copy webhook signing secret: `whsec_...`
5. **Create Wasel Plus Product**:
   - Name: "Wasel Plus"
   - Price: 5 JOD/month
   - Copy Price ID: `price_...`

### Step 2.4: Twilio Setup

1. **Go to Twilio Console**: https://console.twilio.com
2. **Get Account Credentials**:
   - Account SID: `AC1386e065d313ae43d256ca0394d0b4e6`
   - Auth Token: (from console)
3. **Create Messaging Service**:
   - Name: "Wasel Notifications"
   - Copy Messaging Service SID: `MG...`
4. **Buy Phone Number** (Jordan):
   - Country: Jordan (+962)
   - Capabilities: SMS, Voice
   - Example: `+962790000000`
5. **Create API Key**:
   - Friendly Name: "Wasel Production"
   - Copy API Key SID: `SK4519926e3b0a4186bee07283ab57b018`
   - Copy API Key Secret: (shown once)

### Step 2.5: Email Provider Setup (Choose One)

#### Option A: Resend (Recommended)
1. **Go to Resend**: https://resend.com
2. **Create API Key**: "Wasel Production"
3. **Verify Domain**: `wasel14.online`
4. **Copy API Key**: `re_...`

#### Option B: SendGrid
1. **Go to SendGrid**: https://sendgrid.com
2. **Create API Key**: "Wasel Production"
3. **Verify Sender**: `notifications@wasel14.online`
4. **Copy API Key**: `SG...`

### Step 2.6: Sentry Setup

1. **Go to Sentry**: https://sentry.io
2. **Create Project**: "Wasel Web"
3. **Platform**: React
4. **Copy DSN**: `https://...@sentry.io/...`

---

## Phase 3: Production Environment Configuration

### Step 3.1: Update Supabase Edge Function Secrets

Run this script to set ALL production secrets:

```bash
# Create a file: set-production-secrets.sh
cat > set-production-secrets.sh << 'EOF'
#!/bin/bash

# Supabase
supabase secrets set SUPABASE_URL="https://zexlxabdcsjefptmjhuq.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc3NTcyNiwiZXhwIjoyMDkzMzUxNzI2fQ.YT92TwRlZDMvyu11sTzuB2mhlSIHVplxT5EybXio30U"
supabase secrets set SUPABASE_DB_URL="postgresql://postgres.zexlxabdcsjefptmjhuq:YOUR_DB_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# App
supabase secrets set APP_BASE_URL="https://wasel14.online"

# Google OAuth (REPLACE WITH YOUR VALUES)
supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_ID="235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com"
supabase secrets set SUPABASE_AUTH_GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"

# Facebook OAuth (REPLACE WITH YOUR VALUES)
supabase secrets set SUPABASE_AUTH_FACEBOOK_CLIENT_ID="YOUR_FACEBOOK_APP_ID"
supabase secrets set SUPABASE_AUTH_FACEBOOK_CLIENT_SECRET="YOUR_FACEBOOK_APP_SECRET"

# Stripe (REPLACE WITH YOUR LIVE VALUES)
supabase secrets set STRIPE_SECRET_KEY="sk_live_YOUR_STRIPE_SECRET_KEY"
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_YOUR_WEBHOOK_SECRET"
supabase secrets set STRIPE_API_VERSION="2024-11-20.acacia"
supabase secrets set STRIPE_WASEL_PLUS_PRICE_ID="price_YOUR_PRICE_ID"

# Twilio (REPLACE WITH YOUR VALUES)
supabase secrets set TWILIO_ACCOUNT_SID="AC1386e065d313ae43d256ca0394d0b4e6"
supabase secrets set TWILIO_AUTH_TOKEN="YOUR_TWILIO_AUTH_TOKEN"
supabase secrets set TWILIO_API_KEY_SID="SK4519926e3b0a4186bee07283ab57b018"
supabase secrets set TWILIO_API_KEY_SECRET="YOUR_TWILIO_API_KEY_SECRET"
supabase secrets set TWILIO_MESSAGING_SERVICE_SID="YOUR_MESSAGING_SERVICE_SID"
supabase secrets set TWILIO_SMS_FROM="+962790000000"
supabase secrets set TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"

# Email - Resend (REPLACE WITH YOUR VALUES)
supabase secrets set RESEND_API_KEY="re_YOUR_RESEND_API_KEY"
supabase secrets set RESEND_FROM_EMAIL="Wasel <notifications@wasel14.online>"
supabase secrets set RESEND_REPLY_TO_EMAIL="support@wasel14.online"

# Email - SendGrid (REPLACE WITH YOUR VALUES)
supabase secrets set SENDGRID_API_KEY="SG.YOUR_SENDGRID_API_KEY"
supabase secrets set SENDGRID_FROM_EMAIL="notifications@wasel14.online"

# Communications Worker
supabase secrets set COMMUNICATION_WORKER_SECRET="$(openssl rand -base64 32)"
supabase secrets set COMMUNICATION_WEBHOOK_TOKEN="$(openssl rand -base64 32)"
supabase secrets set COMMUNICATION_MAX_ATTEMPTS="5"
supabase secrets set COMMUNICATION_PROCESS_INLINE="false"
supabase secrets set ENABLE_RUNTIME_ADMIN_ENDPOINTS="false"
supabase secrets set ALLOWED_ORIGINS="https://wasel14.online"

echo "✅ All secrets set successfully!"
EOF

chmod +x set-production-secrets.sh
./set-production-secrets.sh
```

### Step 3.2: Update Supabase Dashboard Settings

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard/project/zexlxabdcsjefptmjhuq
2. **Authentication → URL Configuration**:
   - Site URL: `https://wasel14.online`
   - Redirect URLs:
     - `https://wasel14.online/app/auth/callback`
     - `https://wasel14.online/**`
3. **Authentication → Providers**:
   - Enable Google OAuth
   - Enable Facebook OAuth
   - Add credentials from Step 2.1 and 2.2
4. **Database → Connection Pooling**:
   - Enable connection pooling
   - Copy connection string for edge function

### Step 3.3: Configure Vercel Environment Variables

Create a file to import all variables at once:

```bash
# Create: vercel-env-import.sh
cat > vercel-env-import.sh << 'EOF'
#!/bin/bash

# Install Vercel CLI if not installed
npm install -g vercel

# Login to Vercel
vercel login

# Link to project
vercel link

# Set production environment variables
vercel env add VITE_SUPABASE_URL production
# Paste: https://zexlxabdcsjefptmjhuq.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0

vercel env add VITE_EDGE_FUNCTION_NAME production
# Paste: make-server-0b1f4071

vercel env add VITE_API_URL production
# Paste: https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071

vercel env add VITE_APP_URL production
# Paste: https://wasel14.online

vercel env add VITE_GOOGLE_MAPS_API_KEY production
# Paste: AIzaSyBWqXeMJ-oPSDpqeR548hw3QUU0EaxE85s

vercel env add VITE_GOOGLE_CLIENT_ID production
# Paste: 235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com

vercel env add VITE_STRIPE_PUBLISHABLE_KEY production
# Paste: pk_test_51SZmpKENhKSYxMCXJ2TgwgNMNjUjHk5CwPQ31zWTEsokWdkD7GgaVhgU3ZPD7ti5gd6NWBvwdWcH3R0hXQCOG3QI00lTUi6x7v

vercel env add VITE_SENTRY_DSN production
# Paste: YOUR_SENTRY_DSN

vercel env add VITE_ALLOW_DIRECT_SUPABASE_FALLBACK production
# Paste: false

echo "✅ Vercel environment variables configured!"
EOF

chmod +x vercel-env-import.sh
```

### Step 3.4: Update Production .env File

```bash
# Update .env.production with real values
cat > .env.production << 'EOF'
# Wasel Production Environment
VITE_APP_ENV=production
VITE_APP_NAME=Wasel
NODE_ENV=production

# Supabase
VITE_SUPABASE_URL=https://zexlxabdcsjefptmjhuq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
VITE_API_URL=https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071

# Feature Flags
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ENABLE_DEMO_DATA=false

# App URLs
VITE_APP_URL=https://wasel14.online
VITE_AUTH_CALLBACK_PATH=/app/auth/callback

# Google
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBWqXeMJ-oPSDpqeR548hw3QUU0EaxE85s
VITE_GOOGLE_CLIENT_ID=235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SZmpKENhKSYxMCXJ2TgwgNMNjUjHk5CwPQ31zWTEsokWdkD7GgaVhgU3ZPD7ti5gd6NWBvwdWcH3R0hXQCOG3QI00lTUi6x7v

# Support
VITE_SUPPORT_EMAIL=support@wasel14.online
VITE_SUPPORT_PHONE_NUMBER=962790000000
EOF
```

---

## Phase 4: Deployment & Verification

### Step 4.1: Deploy to Vercel

```bash
# Build and deploy
npm run build
vercel --prod

# Or use automatic deployment
git add .
git commit -m "feat: complete production configuration"
git push origin main
```

### Step 4.2: Verify Edge Function Connectivity

```bash
# Test health endpoint
curl https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health

# Test with authentication (replace TOKEN with real JWT)
curl -H "Authorization: Bearer TOKEN" \
  https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/trust/status
```

### Step 4.3: Verify Provider Connectivity

```bash
# Run provider diagnostics (requires worker secret)
curl -X GET \
  -H "x-communication-worker-secret: YOUR_WORKER_SECRET" \
  https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/communications/admin/provider-diagnostics
```

### Step 4.4: Run Complete Verification

```bash
# Run all verification checks
npm run verify:wiring
npm run verify:oauth
npm run verify:contracts
```

---

## Phase 5: Post-Deployment Checklist

### ✅ Edge Function Deployment
- [ ] Edge function deployed to Supabase
- [ ] All secrets configured in Supabase
- [ ] Health endpoint returns 200 OK
- [ ] Function logs show no errors

### ✅ Provider Credentials
- [ ] Google OAuth working (test login)
- [ ] Facebook OAuth working (test login)
- [ ] Stripe checkout working (test payment)
- [ ] Twilio SMS sending (test notification)
- [ ] Email sending (test welcome email)
- [ ] Sentry capturing errors

### ✅ Production Environment
- [ ] Vercel environment variables set
- [ ] Production build successful
- [ ] HTTPS enabled on wasel14.online
- [ ] Auth callbacks working
- [ ] No fallback warnings in console
- [ ] All API calls use edge function

---

## Troubleshooting

### Edge Function Not Responding
```bash
# Check function logs
supabase functions logs make-server-0b1f4071

# Redeploy
supabase functions deploy make-server-0b1f4071 --no-verify-jwt
```

### OAuth Not Working
1. Check redirect URIs match exactly
2. Verify secrets are set in Supabase dashboard
3. Check browser console for CORS errors
4. Ensure site URL is correct in Supabase settings

### Stripe Webhook Failing
1. Verify webhook URL is correct
2. Check webhook signing secret matches
3. Test webhook with Stripe CLI:
```bash
stripe listen --forward-to https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/payments/webhooks/stripe
```

### Email Not Sending
1. Verify API keys are correct
2. Check domain verification status
3. Test with admin endpoint:
```bash
curl -X POST \
  -H "x-communication-worker-secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"channel":"email","destination":"test@example.com"}' \
  https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/communications/admin/send-test
```

---

## Success Criteria

When all steps are complete, you should have:

1. ✅ **Edge Function**: Deployed and responding to requests
2. ✅ **OAuth**: Google and Facebook login working
3. ✅ **Payments**: Stripe checkout and webhooks working
4. ✅ **Communications**: Email and SMS sending successfully
5. ✅ **Monitoring**: Sentry capturing errors
6. ✅ **Production**: Live on wasel14.online with HTTPS
7. ✅ **No Fallbacks**: All requests go through edge function
8. ✅ **100% Connectivity**: Frontend ↔ Backend fully wired

**Frontend-Backend Connectivity: 10/10** 🎉
