# Vercel Quick Reference

## 🚀 Deploy to Vercel

### First Time Setup
```bash
# 1. Extract environment variables
npm run extract:vercel-env

# 2. Add variables to Vercel Dashboard
# Go to: Vercel Dashboard → Settings → Environment Variables
# Add all VITE_* variables (minimum: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

# 3. Commit and push
git add .
git commit -m "fix: configure Vercel deployment"
git push origin master
```

### Redeploy
```bash
git add .
git commit -m "your commit message"
git push origin master
```

## 🔍 Pre-Deployment Checks

```bash
# Check TypeScript
npm run type-check

# Check linting
npm run lint

# Test build locally
npm run vercel-build

# Full verification
npm run verify:ci
```

## 🐛 Troubleshooting

```bash
# Extract environment variables
npm run extract:vercel-env

# Check build locally
npm run vercel-build

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📋 Required Environment Variables

Minimum required in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md) for complete list.

## 🔗 Quick Links

- [Deployment Checklist](./VERCEL_DEPLOYMENT_CHECKLIST.md)
- [Environment Setup](./VERCEL_ENV_SETUP.md)
- [Troubleshooting Guide](./VERCEL_TROUBLESHOOTING.md)
- [Vercel Dashboard](https://vercel.com/dashboard)

## ⚡ Vercel CLI (Optional)

```bash
# Install
npm i -g vercel

# Deploy from CLI
vercel

# Deploy to production
vercel --prod

# View logs
vercel logs

# Rollback
vercel rollback
```

## 🎯 Build Configuration

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: >=20.10.0

## ⚠️ Common Issues

1. **Build fails** → Check [VERCEL_TROUBLESHOOTING.md](./VERCEL_TROUBLESHOOTING.md)
2. **Missing env vars** → Run `npm run extract:vercel-env`
3. **Blank page** → Check browser console and Vercel environment variables
4. **404 on refresh** → Already fixed in vercel.json
5. **Old code running** → Clear Vercel cache in dashboard

## 📞 Support

- [Vercel Status](https://www.vercel-status.com/)
- [Vercel Docs](https://vercel.com/docs)
- [GitHub Issues](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/issues)
