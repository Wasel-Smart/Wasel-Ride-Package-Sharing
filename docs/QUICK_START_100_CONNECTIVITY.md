# 🚀 Quick Start: 100% Connectivity

This guide will get you from **6/10** to **10/10** connectivity in 3 simple steps.

---

## Current Status: 6/10

❌ **Edge function not deployed**  
❌ **Provider credentials incomplete**  
❌ **Production environment not configured**

---

## Target Status: 10/10

✅ **Edge function deployed and responding**  
✅ **All provider credentials configured**  
✅ **Production environment fully configured**

---

## Prerequisites

```bash
# Install required tools
npm install -g supabase vercel

# Make scripts executable (Unix/Mac)
chmod +x scripts/*.sh

# For Windows, use Git Bash or WSL
```

---

## Step 1: Deploy Edge Function (5 minutes)

```bash
# Run automated deployment script
bash scripts/deploy-edge-function.sh
```

**What this does:**
- Logs into Supabase
- Links to production project
- Deploys `make-server-0b1f4071` edge function
- Sets all required secrets
- Tests deployment

**Expected Output:**
```
✅ Deployment Complete!
Edge Function URL: https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071
✓ Edge function is healthy (HTTP 200)
```

---

## Step 2: Configure Provider Credentials (10 minutes)

```bash
# Run interactive configuration script
bash scripts/configure-providers.sh
```

**What this does:**
- Guides you through setting up:
  - ✅ Google OAuth (already have Client ID)
  - ✅ Facebook OAuth (optional)
  - ✅ Stripe (test keys already configured)
  - ✅ Twilio (credentials already available)
  - ✅ Email provider (Resend or SendGrid)
  - ✅ Sentry (optional)
- Sets all secrets in Supabase edge function

**Quick Setup:**

### Google OAuth (Required)
1. Go to: https://console.cloud.google.com
2. Use existing Client ID: `235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com`
3. Get Client Secret from console
4. Enter when prompted

### Stripe (Already Configured)
- Test keys already set
- For production, get live keys from: https://dashboard.stripe.com

### Twilio (Already Configured)
- Credentials already available
- Just confirm during setup

---

## Step 3: Configure Production Environment (5 minutes)

```bash
# Run automated Vercel configuration
bash scripts/configure-production.sh
```

**What this does:**
- Logs into Vercel
- Links to your project
- Sets all environment variables
- Creates `.env.production.local`
- Tests production build
- Optionally deploys to production

**Expected Output:**
```
✅ Production Environment Configured!
• Vercel environment variables: ✓
• Local .env.production.local: ✓
• Production build: ✓
```

---

## Step 4: Verify 100% Connectivity (2 minutes)

```bash
# Run comprehensive verification
bash scripts/verify-connectivity.sh
```

**Expected Output:**
```
Connectivity Score: 100/100 🎉
Status: Excellent - Ready for production!

✓ Edge function deployed
✓ Provider credentials configured
✓ Production environment ready
```

---

## Alternative: Manual Configuration

If you prefer manual setup, follow the detailed guide:

📖 **[Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md)**

---

## Troubleshooting

### Edge Function Not Responding

```bash
# Check function logs
supabase functions logs make-server-0b1f4071

# Redeploy
supabase functions deploy make-server-0b1f4071 --no-verify-jwt
```

### Provider Credentials Not Working

```bash
# List current secrets
supabase secrets list

# Set individual secret
supabase secrets set SECRET_NAME="value"
```

### Production Build Failing

```bash
# Check environment variables
cat .env

# Verify all required vars are set
npm run verify:contracts
```

---

## Quick Commands Reference

```bash
# Deploy edge function
bash scripts/deploy-edge-function.sh

# Configure providers
bash scripts/configure-providers.sh

# Configure production
bash scripts/configure-production.sh

# Verify connectivity
bash scripts/verify-connectivity.sh

# Test edge function
curl https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071/health

# Deploy to Vercel
vercel --prod
```

---

## Success Checklist

After completing all steps, verify:

- [ ] Edge function health returns 200 OK
- [ ] Google OAuth login works
- [ ] Stripe checkout works (test mode)
- [ ] Production build succeeds
- [ ] Vercel deployment succeeds
- [ ] No fallback warnings in console
- [ ] All API calls use edge function
- [ ] Connectivity score: 10/10

---

## Next Steps

Once you achieve 100% connectivity:

1. **Test OAuth Flows**
   - Test Google login
   - Test Facebook login (if configured)

2. **Test Payment Flows**
   - Test wallet top-up
   - Test subscription checkout

3. **Configure Production Providers**
   - Switch Stripe to live keys
   - Set up production email provider
   - Configure Sentry for monitoring

4. **Deploy to Production**
   ```bash
   vercel --prod
   ```

5. **Monitor & Optimize**
   - Check Sentry for errors
   - Monitor edge function logs
   - Optimize response times

---

## Support

If you encounter issues:

1. Check logs: `supabase functions logs make-server-0b1f4071`
2. Verify secrets: `supabase secrets list`
3. Test endpoints: `curl [endpoint-url]`
4. Review: [Complete Deployment Guide](./COMPLETE_DEPLOYMENT_GUIDE.md)

---

## Estimated Time

- **Step 1 (Edge Function):** 5 minutes
- **Step 2 (Providers):** 10 minutes
- **Step 3 (Production):** 5 minutes
- **Step 4 (Verification):** 2 minutes

**Total:** ~22 minutes to 100% connectivity! 🚀
