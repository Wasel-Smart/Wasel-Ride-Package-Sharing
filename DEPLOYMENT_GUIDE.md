# 🚀 WASEL DEPLOYMENT GUIDE - Wasel14.online

## **📋 DEPLOYMENT STEPS**

### **Step 1: Fix Vercel Project Settings**

Go to your Vercel project dashboard: https://vercel.com/your-project/settings

#### **1.1 General Settings**
- **Root Directory**: Leave EMPTY or set to `.` (not the Windows path)
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

#### **1.2 Node.js Version**
- Set to: **20.x** (matches your package.json engines)

### **Step 2: Set Environment Variables**

Go to: https://vercel.com/your-project/settings/environment-variables

Add these variables for **Production** environment:

```bash
# App Environment
VITE_APP_ENV=production
VITE_APP_NAME=Wasel
MODE=production
NODE_ENV=production

# Supabase
VITE_SUPABASE_URL=https://zexlxabdcsjefptmjhuq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpleGx4YWJkY3NqZWZwdG1qaHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NzU3MjYsImV4cCI6MjA5MzM1MTcyNn0.p17L08rXvykUbPpTev82S5WQo_uhSakwP7WI3HbMmA0
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
VITE_API_URL=https://zexlxabdcsjefptmjhuq.supabase.co/functions/v1/make-server-0b1f4071

# Feature Flags
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ENABLE_DEMO_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ENABLE_TWO_FACTOR_AUTH=false
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=false
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=false

# App URLs
VITE_APP_URL=https://wasel14.online
VITE_PRODUCTION_APP_URL=https://wasel14.online

# Support
VITE_SUPPORT_EMAIL=support@wasel.app
VITE_SUPPORT_PHONE_NUMBER=962790000000
VITE_BUSINESS_ADDRESS=Amman, Jordan
VITE_BUSINESS_ADDRESS_AR=عمّان، الأردن
VITE_FOUNDER_NAME=Wasel Team

# Auth
VITE_AUTH_CALLBACK_PATH=/app/auth/callback

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIzaSyBWqXeMJ-oPSDpqeR548hw3QUU0EaxE85s
VITE_GOOGLE_CLIENT_ID=235290462223-ooc9cnn6r80ruk475p88286hiepqu8b5.apps.googleusercontent.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SZmpKENhKSYxMCXJ2TgwgNMNjUjHk5CwPQ31zWTEsokWdkD7GgaVhgU3ZPD7ti5gd6NWBvwdWcH3R0hXQCOG3QI00lTUi6x7v

# Monitoring (optional)
VITE_SENTRY_DSN=
```

### **Step 3: Update Supabase Auth Settings**

Go to your Supabase dashboard: https://supabase.com/dashboard/project/zexlxabdcsjefptmjhuq/auth/url-configuration

Add these URLs:

**Site URL:**
```
https://wasel14.online
```

**Redirect URLs (add all):**
```
https://wasel14.online/app/auth/callback
https://wasel14.online/auth/callback
http://localhost:3002/app/auth/callback
http://localhost:3002/auth/callback
```

### **Step 4: Push Changes to GitHub**

```bash
# Commit the fixed vercel.json
git add vercel.json .env.production
git commit -m "fix: vercel deployment configuration"
git push origin master
```

### **Step 5: Redeploy on Vercel**

Option A: **Automatic** (if connected to GitHub)
- Vercel will auto-deploy after push

Option B: **Manual**
- Go to: https://vercel.com/your-project
- Click "Redeploy" button

### **Step 6: Verify Deployment**

Once deployed, test:

1. **Home Page**: https://wasel14.online
2. **Auth**: https://wasel14.online/app/auth
3. **Find Ride**: https://wasel14.online/app/rides/find

---

## **🔧 TROUBLESHOOTING**

### **Issue: "Root Directory does not exist"**
**Solution**: 
- Go to Vercel Project Settings → General
- Set Root Directory to: `.` or leave EMPTY
- Do NOT use Windows path like `C:\Users\...`

### **Issue: "Build failed"**
**Solution**:
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure Node.js version is 20.x

### **Issue: "Configuration Error" on deployed site**
**Solution**:
- Verify all `VITE_*` environment variables are set in Vercel
- Make sure `VITE_APP_URL` is `https://wasel14.online`
- Redeploy after adding variables

### **Issue: "Auth callback fails"**
**Solution**:
- Add `https://wasel14.online/app/auth/callback` to Supabase redirect URLs
- Update Supabase Site URL to `https://wasel14.online`

---

## **✅ DEPLOYMENT CHECKLIST**

- [ ] Vercel Root Directory is `.` or empty
- [ ] All environment variables set in Vercel
- [ ] `VITE_APP_URL=https://wasel14.online`
- [ ] `MODE=production`
- [ ] Supabase redirect URLs updated
- [ ] Supabase Site URL updated
- [ ] Code pushed to GitHub
- [ ] Deployment triggered
- [ ] Site loads at https://wasel14.online
- [ ] Auth works
- [ ] Ride search works

---

## **🎯 QUICK FIX COMMANDS**

If you need to redeploy quickly:

```bash
# 1. Ensure changes are committed
git add .
git commit -m "fix: deployment configuration"
git push origin master

# 2. Vercel will auto-deploy
# Or manually trigger at: https://vercel.com/your-project
```

---

## **📞 SUPPORT**

If deployment still fails:
1. Check Vercel build logs
2. Verify environment variables
3. Test locally first: `npm run build && npm run preview`
4. Check Supabase dashboard for auth errors

---

**Your app should now deploy successfully to https://wasel14.online** 🚀
