# Add ALL Environment Variables to Vercel

## 🚀 Quick Start

### Step 1: Generate All Variables
```bash
npm run generate:vercel-env
```

This will:
- ✅ Read your existing `.env` file (if it exists)
- ✅ Generate all VITE_* variables with defaults
- ✅ Display categorized list
- ✅ Save to `vercel-env-variables.txt`

### Step 2: Copy Variables

The script outputs all variables in this format:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_APP_URL=https://your-app.vercel.app
...
```

### Step 3: Add to Vercel Dashboard

1. Go to: **[Vercel Dashboard](https://vercel.com/dashboard)**
2. Select your project
3. Go to: **Settings → Environment Variables**
4. For each variable:
   - Click **"Add New"**
   - Enter **Name** (e.g., `VITE_SUPABASE_URL`)
   - Enter **Value** (e.g., `https://your-project.supabase.co`)
   - Select **Environment**:
     - ✅ Production
     - ✅ Preview
     - ⚠️ Development (optional)
   - Click **"Save"**

### Step 4: Update Placeholder Values

⚠️ **IMPORTANT**: Replace placeholder values with your actual credentials!

## 📋 Complete Variable List

### 🔴 CRITICAL (Required)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Where to find:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to: Settings → API
- Copy "Project URL" → `VITE_SUPABASE_URL`
- Copy "anon public" key → `VITE_SUPABASE_ANON_KEY`

### 🟡 RECOMMENDED (Highly Recommended)

```bash
VITE_APP_URL=https://your-app.vercel.app
VITE_APP_NAME=Wasel
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Where to find:**
- `VITE_APP_URL`: Your Vercel deployment URL (e.g., `https://wasel.vercel.app`)
- `VITE_APP_NAME`: Your app name (default: "Wasel")
- `VITE_GOOGLE_MAPS_API_KEY`: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- `VITE_STRIPE_PUBLISHABLE_KEY`: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)

### 🔵 OAUTH (Social Login)

```bash
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_FACEBOOK_APP_ID=your-facebook-app-id
VITE_AUTH_CALLBACK_PATH=/app/auth/callback
```

**Where to find:**
- `VITE_GOOGLE_CLIENT_ID`: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
- `VITE_FACEBOOK_APP_ID`: [Facebook Developers](https://developers.facebook.com/apps/)
- `VITE_AUTH_CALLBACK_PATH`: Keep as `/app/auth/callback`

### 🟢 SUPPORT (Contact Information)

```bash
VITE_SUPPORT_EMAIL=support@wasel.jo
VITE_SUPPORT_PHONE_NUMBER=962790000000
VITE_SUPPORT_WHATSAPP_NUMBER=962790000000
VITE_SUPPORT_SMS_NUMBER=962790000000
```

**Update with your actual contact information**

### 🟣 FEATURE FLAGS (Enable/Disable Features)

```bash
VITE_ENABLE_TWO_FACTOR_AUTH=false
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=true
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=true
VITE_ENABLE_DEMO_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
```

**Set to `true` or `false` based on your needs**

### 🟠 MONITORING (Analytics & Error Tracking)

```bash
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_ANALYTICS_ENDPOINT=https://analytics.wasel14.online/api/v1
VITE_CDN_URL=https://cdn.wasel14.online
```

**Where to find:**
- `VITE_SENTRY_DSN`: [Sentry Dashboard](https://sentry.io/) → Project Settings → Client Keys (DSN)
- `VITE_ANALYTICS_ENDPOINT`: Your analytics endpoint (optional)
- `VITE_CDN_URL`: Your CDN URL (optional)

### ⚪ EDGE FUNCTIONS (API Configuration)

```bash
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
VITE_EDGE_FUNCTIONS_BASE_URL=https://your-project.supabase.co/functions/v1
VITE_API_URL=https://api.example.com
```

**Optional - only if you have custom API endpoints**

### ⚫ OTHER

```bash
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-or-anon-key
```

**Usually same as `VITE_SUPABASE_ANON_KEY`**

## 🎯 Quick Copy-Paste Template

Copy this template and replace with your values:

```bash
# CRITICAL
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RECOMMENDED
VITE_APP_URL=https://your-app.vercel.app
VITE_APP_NAME=Wasel
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# OAUTH
VITE_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
VITE_FACEBOOK_APP_ID=123456789
VITE_AUTH_CALLBACK_PATH=/app/auth/callback

# SUPPORT
VITE_SUPPORT_EMAIL=support@yourdomain.com
VITE_SUPPORT_PHONE_NUMBER=962790000000
VITE_SUPPORT_WHATSAPP_NUMBER=962790000000
VITE_SUPPORT_SMS_NUMBER=962790000000

# FEATURE FLAGS
VITE_ENABLE_TWO_FACTOR_AUTH=false
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=true
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=true
VITE_ENABLE_DEMO_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false

# MONITORING
VITE_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456
VITE_ANALYTICS_ENDPOINT=https://analytics.yourdomain.com/api/v1
VITE_CDN_URL=https://cdn.yourdomain.com

# EDGE FUNCTIONS
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
VITE_EDGE_FUNCTIONS_BASE_URL=
VITE_API_URL=

# OTHER
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📝 Step-by-Step Vercel Dashboard Instructions

### Adding Variables One by One

1. **Navigate to Environment Variables**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click on your project
   - Click "Settings" tab
   - Click "Environment Variables" in sidebar

2. **Add Each Variable**
   - Click "Add New" button
   - In "Name" field: Enter variable name (e.g., `VITE_SUPABASE_URL`)
   - In "Value" field: Enter variable value
   - Select environments:
     - ✅ Check "Production"
     - ✅ Check "Preview"
     - ⚠️ Check "Development" (optional)
   - Click "Save"

3. **Repeat for All Variables**
   - Add all 28 variables from the list above
   - Double-check each value is correct
   - Ensure no typos in variable names

### Bulk Import (Alternative Method)

Vercel also supports bulk import via CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add variables from file
vercel env add VITE_SUPABASE_URL production
# Paste value when prompted

# Or use pull/push
vercel env pull .env.local
# Edit .env.local
vercel env push .env.local
```

## ✅ Verification Checklist

After adding all variables:

- [ ] All 28 VITE_* variables added
- [ ] No placeholder values remaining
- [ ] All variables set for "Production" environment
- [ ] All variables set for "Preview" environment (recommended)
- [ ] Supabase URL and keys are correct
- [ ] App URL matches your Vercel domain
- [ ] API keys are valid (Google Maps, Stripe, etc.)
- [ ] Feature flags set to desired values
- [ ] Contact information is correct

## 🚀 Deploy

After adding all variables:

```bash
git add .
git commit -m "fix: configure Vercel static site deployment"
git push origin master
```

Vercel will automatically redeploy with the new environment variables.

## 🔍 Verify Deployment

After deployment:

1. **Check Build Logs**
   - Go to Vercel Dashboard → Deployments
   - Click on latest deployment
   - Verify "Environment variables validated" message

2. **Test Production Site**
   - Visit your Vercel URL
   - Open browser console (F12)
   - Check for no environment variable errors
   - Test Supabase connection
   - Test OAuth login (if configured)
   - Test maps (if configured)

## 🐛 Troubleshooting

### Variables Not Working

1. **Clear Vercel Cache**
   - Settings → General → Clear Cache
   - Redeploy

2. **Check Variable Names**
   - Must be EXACTLY as shown (case-sensitive)
   - Must start with `VITE_`

3. **Check Values**
   - No extra spaces
   - No quotes needed in Vercel Dashboard
   - URLs should include `https://`

### Build Still Fails

1. Check [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)
2. Verify all CRITICAL variables are set
3. Check build logs for specific errors
4. Test locally: `npm run vercel-build`

## 📚 Additional Resources

- [DEPLOY_NOW.md](./DEPLOY_NOW.md) - Quick deployment guide
- [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) - Detailed variable documentation
- [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md) - Common issues
- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)

## 🔒 Security Notes

- ✅ Only VITE_* variables are safe for browser
- ❌ Never add server secrets to Vercel for static sites:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `TWILIO_AUTH_TOKEN`
  - Any `*_SECRET` or `*_PRIVATE_KEY` variables
- 🔐 Server secrets belong in Supabase Edge Functions environment

---

**Ready to add variables? Run: `npm run generate:vercel-env`** 🚀
