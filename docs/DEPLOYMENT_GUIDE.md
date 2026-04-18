# Production Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying Wasel to production environments.

---

## Pre-Deployment Checklist

### 1. Environment Configuration

```bash
# Copy production environment template
cp .env.production.example .env.production

# Required variables (MUST be set):
VITE_APP_ENV=production
VITE_APP_URL=https://wasel.jo
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
VITE_SUPABASE_PUBLISHABLE_KEY=your-production-publishable-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_your_key
VITE_GOOGLE_MAPS_API_KEY=your-production-maps-key
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project

# Support contact (MUST be set):
VITE_SUPPORT_EMAIL=support@wasel.jo
VITE_SUPPORT_WHATSAPP_NUMBER=962790000000
VITE_SUPPORT_PHONE_NUMBER=962790000000

# Security (MUST be enabled):
VITE_ENABLE_TWO_FACTOR_AUTH=true
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK=false
```

### 2. Database Setup

```bash
# Apply all migrations
npm run apply:supabase-rollout

# Verify migration integrity
npm run verify:supabase-rollout

# Load production seed data (cities, pricing, etc.)
npm run seed
```

### 3. Security Verification

```bash
# Verify no secrets in code
git grep -i "sk_live" || echo "✓ No Stripe secret keys"
git grep -i "password" src/ || echo "✓ No hardcoded passwords"

# Verify environment variables
node scripts/validate-env.mjs

# Verify production auth configuration
npm run verify:auth:production
```

### 4. Build & Test

```bash
# Full verification suite
npm run verify

# This runs:
# - Type checking
# - Linting (zero warnings)
# - Unit tests with coverage
# - Production build
# - E2E tests
# - Bundle size validation
```

---

## Deployment Steps

### Option A: Vercel (Recommended)

#### Initial Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link
```

#### Configure Environment Variables

```bash
# Set production environment variables in Vercel dashboard
# Or use CLI:
vercel env add VITE_APP_ENV production
vercel env add VITE_APP_URL production
vercel env add VITE_SUPABASE_URL production
# ... (add all required variables)
```

#### Deploy to Production

```bash
# Deploy to production
vercel --prod

# Verify deployment
curl -I https://wasel.jo
```

### Option B: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Initialize
netlify init

# Deploy
netlify deploy --prod --dir=dist
```

### Option C: Custom Server (Nginx)

```bash
# Build production bundle
npm run build

# Output directory: ./dist

# Copy to server
rsync -avz --delete dist/ user@server:/var/www/wasel/

# Nginx configuration (see below)
```

#### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name wasel.jo www.wasel.jo;

    ssl_certificate /etc/letsencrypt/live/wasel.jo/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wasel.jo/privkey.pem;

    root /var/www/wasel;
    index index.html;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(self), microphone=(), camera=()" always;

    # CSP header
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com;" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json application/xml+rss;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Service worker (no cache)
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }

    # Manifest (no cache)
    location = /manifest.json {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires 0;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name wasel.jo www.wasel.jo;
    return 301 https://$server_name$request_uri;
}
```

---

## Post-Deployment Verification

### 1. Smoke Tests

```bash
# Health check
curl https://wasel.jo/

# Check security headers
curl -I https://wasel.jo/ | grep -E "(X-Frame|X-Content|Strict-Transport)"

# Check PWA manifest
curl https://wasel.jo/manifest.json

# Check service worker
curl https://wasel.jo/sw.js
```

### 2. Critical User Flows

Test these flows manually in production:

- [ ] Landing page loads
- [ ] User can sign up
- [ ] User can sign in
- [ ] User can search for rides
- [ ] User can offer a ride
- [ ] User can view bus schedules
- [ ] User can send a package
- [ ] User can access wallet
- [ ] User can view profile
- [ ] User can sign out

### 3. Performance Verification

```bash
# Run Lighthouse audit
npx lighthouse https://wasel.jo --view

# Target scores:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 95
# SEO: > 90
```

### 4. Error Monitoring

```bash
# Verify Sentry is receiving events
# 1. Trigger a test error in production
# 2. Check Sentry dashboard for event
# 3. Verify error details are captured
```

---

## Rollback Procedure

### Vercel Rollback

```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or use dashboard:
# 1. Go to Vercel dashboard
# 2. Select project
# 3. Go to Deployments
# 4. Click "..." on previous deployment
# 5. Click "Promote to Production"
```

### Netlify Rollback

```bash
# List deployments
netlify deploy:list

# Rollback to specific deploy
netlify rollback --deploy-id [deploy-id]
```

### Custom Server Rollback

```bash
# Keep previous build
mv dist dist.backup
mv dist.previous dist

# Restart nginx
sudo systemctl reload nginx

# Verify
curl -I https://wasel.jo/
```

---

## Monitoring Setup

### 1. Sentry Configuration

```typescript
// Already configured in src/main.tsx
// Verify VITE_SENTRY_DSN is set in production

// Test Sentry integration:
Sentry.captureMessage('Production deployment successful');
```

### 2. Uptime Monitoring

**UptimeRobot Setup:**
1. Go to https://uptimerobot.com
2. Add new monitor
3. Monitor type: HTTPS
4. URL: https://wasel.jo
5. Interval: 5 minutes
6. Alert contacts: Add email/SMS

**Pingdom Setup:**
1. Go to https://pingdom.com
2. Add new check
3. Check type: HTTP
4. URL: https://wasel.jo
5. Check interval: 1 minute
6. Alert contacts: Add team members

### 3. Performance Monitoring

**Vercel Analytics:**
- Automatically enabled for Vercel deployments
- View at: https://vercel.com/[team]/[project]/analytics

**Google Analytics:**
```html
<!-- Add to index.html if needed -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### 4. Database Monitoring

**Supabase Dashboard:**
1. Go to Supabase project dashboard
2. Enable "Database Insights"
3. Set up slow query alerts
4. Configure connection pool monitoring

---

## Backup Strategy

### Database Backups

**Automated Backups (Supabase):**
```bash
# Supabase Pro plan includes:
# - Daily automated backups (retained for 7 days)
# - Point-in-time recovery (PITR)

# Enable PITR in Supabase dashboard:
# 1. Go to Database > Backups
# 2. Enable Point-in-time Recovery
# 3. Set retention period (7-30 days)
```

**Manual Backup:**
```bash
# Export database schema
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --schema-only \
  > schema_backup_$(date +%Y%m%d).sql

# Export data
pg_dump -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  --data-only \
  > data_backup_$(date +%Y%m%d).sql
```

**Restore from Backup:**
```bash
# Restore schema
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  < schema_backup_20240101.sql

# Restore data
psql -h db.your-project.supabase.co \
  -U postgres \
  -d postgres \
  < data_backup_20240101.sql
```

### Storage Backups

**Supabase Storage:**
```bash
# Backup storage bucket
supabase storage download --bucket avatars --destination ./backups/avatars/

# Restore storage bucket
supabase storage upload --bucket avatars --source ./backups/avatars/
```

---

## Scaling Considerations

### Database Scaling

**Connection Pooling:**
```typescript
// Already configured in Supabase client
// Default pool size: 15 connections
// Increase in Supabase dashboard if needed
```

**Read Replicas:**
```bash
# Supabase Pro plan supports read replicas
# Enable in dashboard for read-heavy workloads
```

### CDN Configuration

**Vercel Edge Network:**
- Automatically configured
- Global CDN with 100+ edge locations
- No additional configuration needed

**Cloudflare (Optional):**
```bash
# Add Cloudflare in front of Vercel
# 1. Add site to Cloudflare
# 2. Update DNS to Cloudflare nameservers
# 3. Configure SSL/TLS to "Full (strict)"
# 4. Enable "Always Use HTTPS"
# 5. Set cache rules for static assets
```

### Rate Limiting

**Supabase Edge Functions:**
```typescript
// Add rate limiting to edge functions
import { rateLimit } from '@supabase/rate-limit';

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

export async function handler(req: Request) {
  try {
    await limiter.check(req, 10); // 10 requests per minute
    // ... handle request
  } catch {
    return new Response('Rate limit exceeded', { status: 429 });
  }
}
```

---

## Troubleshooting

### Common Issues

**1. Build Fails**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

**2. Environment Variables Not Loading**
```bash
# Verify variables are set
node -e "console.log(process.env.VITE_APP_ENV)"

# Check for typos in variable names
grep -r "VITE_" .env.production
```

**3. Database Connection Issues**
```bash
# Test Supabase connection
curl https://your-project.supabase.co/rest/v1/ \
  -H "apikey: your-anon-key"

# Check connection pooling
# Supabase dashboard > Database > Connection pooling
```

**4. High Error Rate**
```bash
# Check Sentry dashboard for errors
# Common causes:
# - API rate limiting
# - Database connection pool exhausted
# - Invalid environment variables
# - CORS issues
```

**5. Slow Performance**
```bash
# Check Web Vitals in Vercel Analytics
# Common causes:
# - Large bundle size (check with npm run size)
# - Unoptimized images
# - Slow database queries
# - Missing indexes
```

---

## Emergency Contacts

**On-Call Rotation:**
- Primary: [Name] - [Phone] - [Email]
- Secondary: [Name] - [Phone] - [Email]
- Escalation: [Name] - [Phone] - [Email]

**Service Providers:**
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com

**Critical Incidents:**
1. Assess severity (P0-P3)
2. Notify on-call engineer
3. Create incident channel (#incident-YYYYMMDD)
4. Follow incident response plan
5. Document in post-mortem

---

## Maintenance Windows

**Scheduled Maintenance:**
- Day: Sunday
- Time: 02:00 - 04:00 UTC (low traffic period)
- Notification: 48 hours advance notice
- Status page: https://status.wasel.jo (if available)

**Emergency Maintenance:**
- Immediate notification via email/SMS
- Status updates every 30 minutes
- Post-incident report within 24 hours

---

## Compliance & Legal

**Data Protection:**
- GDPR compliance (if serving EU users)
- Data retention: 90 days for inactive users
- Right to deletion: support@wasel.jo
- Privacy policy: https://wasel.jo/app/privacy

**Security:**
- SSL/TLS: TLS 1.2+ only
- Security headers: Enforced via vercel.json
- Vulnerability disclosure: security@wasel.jo
- Security policy: See SECURITY.md

---

## Success Metrics

**Post-Deployment KPIs:**
- Uptime: > 99.9%
- Error rate: < 0.1%
- P95 response time: < 500ms
- Lighthouse performance: > 90
- User satisfaction: > 4.5/5

**Monitor Daily:**
- Active users
- Error rate
- API response times
- Database query performance
- CDN cache hit rate

---

## Next Steps

After successful deployment:

1. **Week 1:**
   - Monitor error rates closely
   - Gather user feedback
   - Fix critical bugs
   - Optimize performance bottlenecks

2. **Week 2-4:**
   - Implement user onboarding
   - Add advanced analytics
   - Optimize database queries
   - Enhance monitoring dashboards

3. **Month 2+:**
   - A/B testing framework
   - Advanced features
   - Mobile app development
   - International expansion

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-01  
**Maintained By:** DevOps Team
