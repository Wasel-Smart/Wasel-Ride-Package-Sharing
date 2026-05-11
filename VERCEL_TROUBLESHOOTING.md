# Vercel Deployment Troubleshooting

## Current Deployment Configuration

- **Build Command**: `npm run vercel-build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: >=20.10.0 (from package.json engines)

## Common Issues & Solutions

### 1. Build Fails During npm install

**Symptoms:**
- Warnings about deprecated packages (inflight, glob, rimraf)
- Build stops during dependency installation

**Solution:**
These are just warnings and won't stop the build. If the build actually fails here, check:

```bash
# Locally test the install
npm ci
```

If it fails locally, update package-lock.json:
```bash
rm -rf node_modules package-lock.json
npm install
git add package-lock.json
git commit -m "chore: update package-lock.json"
git push
```

### 2. Missing Environment Variables

**Symptoms:**
- Build completes but app doesn't work
- Console errors about undefined environment variables
- Supabase connection fails

**Solution:**

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables

2. Add these REQUIRED variables:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Select environment scope:
   - ✅ Production
   - ✅ Preview (recommended)
   - ⚠️ Development (optional)

4. Redeploy

### 3. TypeScript Compilation Errors

**Symptoms:**
- Build fails with TypeScript errors
- "tsc --noEmit" command fails

**Solution:**

Test locally first:
```bash
npm run type-check
```

Fix any TypeScript errors before deploying.

### 4. Vite Build Fails

**Symptoms:**
- Build fails during "vite build" step
- Module resolution errors
- Import errors

**Solution:**

Test the build locally:
```bash
npm run vercel-build
```

Common fixes:
- Ensure all imports use correct paths
- Check that `@/` alias is working
- Verify all dependencies are in package.json

### 5. Build Succeeds but Site Shows Blank Page

**Symptoms:**
- Deployment successful
- Site loads but shows blank page
- No errors in Vercel logs

**Solution:**

1. Check browser console for errors
2. Verify environment variables are set
3. Check that `outputDirectory` is set to `dist` in vercel.json
4. Ensure index.html exists in dist folder

### 6. Routing Issues (404 on Refresh)

**Symptoms:**
- Home page works
- Navigation works
- Refreshing on any route shows 404

**Solution:**

This is already fixed in vercel.json with:
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

If still having issues, verify vercel.json is committed and pushed.

### 7. Assets Not Loading

**Symptoms:**
- CSS not loading
- Images not loading
- JavaScript chunks failing

**Solution:**

1. Check that assets are in the `dist` folder after build
2. Verify base URL in vite.config.ts (should be `/` for Vercel)
3. Check browser Network tab for 404s

### 8. Build Cache Issues

**Symptoms:**
- Old code still running after deployment
- Changes not appearing
- Vercel using old configuration

**Solution:**

1. Go to Vercel Dashboard → Your Project → Settings
2. Scroll to "Build & Development Settings"
3. Click "Clear Cache"
4. Redeploy

Or use Vercel CLI:
```bash
vercel --force
```

### 9. Node Version Mismatch

**Symptoms:**
- Build fails with Node.js version errors
- Syntax errors for modern JavaScript

**Solution:**

Vercel should auto-detect from package.json engines:
```json
{
  "engines": {
    "node": ">=20.10.0",
    "npm": ">=10.0.0"
  }
}
```

If not working, add to vercel.json:
```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": null
}
```

### 10. Environment Variables Not Available in Build

**Symptoms:**
- Build fails with "undefined" errors
- Environment variables work locally but not on Vercel

**Solution:**

1. Ensure variables are prefixed with `VITE_`
2. Verify they're set in Vercel Dashboard
3. Check they're set for the correct environment (Production/Preview)
4. Redeploy after adding variables

## Quick Diagnostic Commands

Run these locally to catch issues before deploying:

```bash
# Check TypeScript
npm run type-check

# Check linting
npm run lint

# Test build
npm run vercel-build

# Verify environment extraction
npm run extract:vercel-env

# Run full verification
npm run verify:ci
```

## Getting More Information

### View Full Build Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Click on the failed deployment
4. View full logs

### Enable Verbose Logging

Add to vercel.json:
```json
{
  "buildCommand": "npm run vercel-build -- --debug",
  "outputDirectory": "dist"
}
```

### Test Deployment Locally

```bash
# Install Vercel CLI
npm i -g vercel

# Run local build
vercel build

# Test production build
vercel dev --prod
```

## Still Having Issues?

1. Check [VERCEL_DEPLOYMENT_CHECKLIST.md](./VERCEL_DEPLOYMENT_CHECKLIST.md)
2. Review [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)
3. Check Vercel Status: https://www.vercel-status.com/
4. Contact Vercel Support with deployment URL

## Emergency Rollback

If deployment breaks production:

1. Go to Vercel Dashboard → Deployments
2. Find last working deployment
3. Click "..." menu → "Promote to Production"

Or use CLI:
```bash
vercel rollback
```
