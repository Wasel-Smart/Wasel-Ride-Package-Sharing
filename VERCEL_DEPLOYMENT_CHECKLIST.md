# Vercel Deployment Checklist

## ✅ Pre-Deployment Steps

### 1. Extract Environment Variables
```bash
npm run extract:vercel-env
```
This will display all VITE_* variables from your `.env` file.

### 2. Configure Vercel Environment Variables

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

#### Minimum Required (Build will fail without these):
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`

#### Highly Recommended:
- [ ] `VITE_APP_URL` (your production URL)
- [ ] `VITE_APP_NAME`
- [ ] `VITE_GOOGLE_MAPS_API_KEY`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`

#### OAuth Configuration:
- [ ] `VITE_GOOGLE_CLIENT_ID`
- [ ] `VITE_FACEBOOK_APP_ID`
- [ ] `VITE_AUTH_CALLBACK_PATH`

#### Support Contact:
- [ ] `VITE_SUPPORT_EMAIL`
- [ ] `VITE_SUPPORT_PHONE_NUMBER`
- [ ] `VITE_SUPPORT_WHATSAPP_NUMBER`
- [ ] `VITE_SUPPORT_SMS_NUMBER`

#### Feature Flags:
- [ ] `VITE_ENABLE_TWO_FACTOR_AUTH`
- [ ] `VITE_ENABLE_EMAIL_NOTIFICATIONS`
- [ ] `VITE_ENABLE_SMS_NOTIFICATIONS`
- [ ] `VITE_ENABLE_WHATSAPP_NOTIFICATIONS`
- [ ] `VITE_ENABLE_DEMO_DATA`
- [ ] `VITE_ENABLE_SYNTHETIC_TRIPS`
- [ ] `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK`

#### Monitoring & Analytics:
- [ ] `VITE_SENTRY_DSN`
- [ ] `VITE_ANALYTICS_ENDPOINT`
- [ ] `VITE_CDN_URL`

#### Edge Functions:
- [ ] `VITE_EDGE_FUNCTION_NAME`
- [ ] `VITE_EDGE_FUNCTIONS_BASE_URL` (optional)

### 3. Environment Scope Selection

For each variable, select the appropriate scope:
- ✅ **Production** (required for live site)
- ✅ **Preview** (recommended for PR previews)
- ⚠️ **Development** (optional, usually use local .env)

### 4. Verify Configuration Files

- [x] `vercel.json` - Updated to use simplified build command
- [x] `package.json` - Contains `vercel-build` script
- [x] `vite.config.ts` - Properly configured
- [x] `tsconfig.json` - No errors

## 🚀 Deployment Steps

### 1. Commit Changes
```bash
git add vercel.json VERCEL_ENV_SETUP.md VERCEL_DEPLOYMENT_CHECKLIST.md scripts/extract-vercel-env.mjs package.json
git commit -m "fix: configure Vercel deployment with environment variables"
git push origin master
```

### 2. Trigger Deployment

Vercel will automatically deploy on push, or manually trigger:
- Go to Vercel Dashboard → Your Project → Deployments
- Click "Redeploy"

### 3. Monitor Build

Watch the build logs for:
- ✅ "Environment variables validated"
- ✅ "Build completed"
- ❌ Any error messages

## 🔍 Post-Deployment Verification

### 1. Check Build Logs
- [ ] No environment variable errors
- [ ] TypeScript compilation successful
- [ ] Vite build completed
- [ ] Output directory created

### 2. Test Production Site
- [ ] Site loads correctly
- [ ] No console errors about missing env vars
- [ ] Supabase connection works
- [ ] OAuth login works (if configured)
- [ ] Maps display correctly (if configured)
- [ ] Stripe integration works (if configured)

### 3. Verify Analytics
- [ ] Sentry receiving events (if configured)
- [ ] Vercel Analytics working
- [ ] Custom analytics endpoint receiving data (if configured)

## 🐛 Troubleshooting

### Build Fails with "Missing required environment variables"
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel
- Check variable names are exactly correct (case-sensitive)
- Ensure variables are set for the correct environment (Production/Preview)

### Build Succeeds but Site Doesn't Work
- Check browser console for errors
- Verify environment variables are accessible (check Network tab)
- Ensure Supabase URL and keys are correct
- Check CORS settings in Supabase

### OAuth Not Working
- Verify callback URL in Google/Facebook console matches `VITE_APP_URL + VITE_AUTH_CALLBACK_PATH`
- Check Supabase Auth settings
- Ensure OAuth provider is enabled in Supabase

### Maps Not Loading
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set
- Check API key restrictions in Google Cloud Console
- Ensure Maps JavaScript API is enabled

## 📚 Additional Resources

- [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md) - Common issues and solutions
- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) - Detailed variable documentation
- [OAuth Setup Guide](./docs/oauth-setup-guide.md)
- [Architecture Documentation](./docs/architecture.md)

## ⚠️ Security Reminders

- ✅ Only VITE_* variables should be in Vercel (browser-safe)
- ❌ Never add server secrets to Vercel for static sites:
  - SUPABASE_SERVICE_ROLE_KEY
  - STRIPE_SECRET_KEY
  - TWILIO_AUTH_TOKEN
  - Any *_SECRET or *_PRIVATE_KEY variables
- 🔒 Server secrets belong in Supabase Edge Functions environment variables
