# 🚨 URGENT FIX: Configure Vercel Dashboard Settings

## The Problem

Vercel Dashboard settings are overriding your `vercel.json` file. You need to manually configure the project as a static site in the dashboard.

## ✅ Solution: Update Vercel Dashboard Settings

### Step 1: Go to Project Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your project
3. Click **"Settings"** tab
4. Click **"General"** in the left sidebar

### Step 2: Configure Framework Preset

Scroll to **"Framework Preset"** section:
- Click the dropdown
- Select **"Vite"** or **"Other"**
- Click **"Save"**

### Step 3: Configure Build & Development Settings

Scroll to **"Build & Development Settings"** section:

**Framework Preset:** `Vite` or `Other`

**Build Command:**
```
npm run vercel-build
```

**Output Directory:**
```
dist
```

**Install Command:**
```
npm install
```

**Development Command:** (leave default or set to)
```
npm run dev
```

Click **"Save"** after each change.

### Step 4: Clear Build Cache

1. Stay in Settings → General
2. Scroll to **"Build & Development Settings"**
3. Find **"Deployment Protection"** or scroll further
4. Look for **"Clear Cache"** button
5. Click **"Clear Cache"**

### Step 5: Redeploy

1. Go to **"Deployments"** tab
2. Click **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Or just push a new commit:

```bash
git commit --allow-empty -m "trigger: redeploy with correct settings"
git push origin master
```

## 🎯 Expected Settings

After configuration, your settings should look like:

```
Framework Preset: Vite
Build Command: npm run vercel-build
Output Directory: dist
Install Command: npm install
Node.js Version: 20.x (auto-detected)
```

## ✅ Verification

After redeployment, you should see:

```
✓ Detected framework: Vite
✓ Using @vercel/static-build
✓ Running "npm run vercel-build"
✓ Build completed
✓ Deployment ready
```

## 🐛 If Still Not Working

### Option A: Delete and Reimport Project

1. **Settings → General → Delete Project** (⚠️ Warning: This deletes the project)
2. Go to Vercel Dashboard
3. Click **"Add New..." → Project**
4. Import your GitHub repository again
5. During import, set:
   - Framework Preset: **Vite**
   - Build Command: **npm run vercel-build**
   - Output Directory: **dist**
6. Add environment variables (see [ADD_ALL_ENV_VARIABLES.md](./ADD_ALL_ENV_VARIABLES.md))
7. Deploy

### Option B: Use Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Remove existing link
rm -rf .vercel

# Deploy with CLI (will prompt for settings)
vercel

# When prompted:
# - Set up and deploy? Yes
# - Which scope? Select your account
# - Link to existing project? No (create new) or Yes (link existing)
# - Project name? Your project name
# - Directory? ./ (current directory)
# - Override settings? Yes
# - Build Command? npm run vercel-build
# - Output Directory? dist
# - Development Command? npm run dev

# Deploy to production
vercel --prod
```

### Option C: Create New vercel.json (Simplified)

If the above doesn't work, try this simpler configuration:

```json
{
  "buildCommand": "npm run vercel-build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

Save this and push:

```bash
git add vercel.json
git commit -m "fix: simplify vercel.json configuration"
git push origin master
```

## 📸 Visual Guide

### Where to Find Settings:

1. **Dashboard** → Your Project → **Settings** (tab at top)
2. **General** (left sidebar)
3. Scroll to **"Build & Development Settings"**
4. You'll see:
   - Framework Preset (dropdown)
   - Build Command (text input)
   - Output Directory (text input)
   - Install Command (text input)
   - Development Command (text input)

### What Each Field Should Be:

| Field | Value |
|-------|-------|
| Framework Preset | `Vite` |
| Build Command | `npm run vercel-build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Development Command | `npm run dev` |

## 🔍 Check Current Settings

To see what Vercel is currently using:

1. Go to **Deployments** tab
2. Click on the failed deployment
3. Look at the build logs
4. Check what commands Vercel is running

If you see it trying to run a Node.js server, the settings are wrong.

## ⚡ Quick Fix Commands

```bash
# 1. Ensure vercel.json is committed
git add vercel.json
git commit -m "fix: configure static site build"
git push origin master

# 2. Clear local Vercel cache
rm -rf .vercel

# 3. Trigger redeploy
git commit --allow-empty -m "trigger: redeploy"
git push origin master
```

## 📞 Still Having Issues?

1. **Check build logs** - Look for what command Vercel is trying to run
2. **Verify vercel.json** - Make sure it's in the root directory
3. **Check .gitignore** - Make sure vercel.json is NOT ignored
4. **Contact Vercel Support** - They can check your project configuration

## 🎯 The Root Cause

Vercel Dashboard settings take precedence over vercel.json in some cases. You MUST configure the dashboard settings manually to ensure it treats your project as a static site (Vite) and not a Node.js server.

---

**Follow Step 1-5 above to fix the issue immediately!** 🚀
