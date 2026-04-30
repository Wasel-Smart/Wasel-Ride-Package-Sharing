# Production Environment Setup Guide

## Overview

This guide walks you through setting up a production-ready environment for Wasel, integrating the new KV Store for dynamic configuration management.

## Architecture: Hybrid Configuration Model

Wasel uses a **hybrid configuration approach**:

1. **Static Environment Variables** (`.env.production`)
   - Credentials and secrets
   - Infrastructure endpoints
   - Build-time configuration

2. **Dynamic KV Store** (Database)
   - Feature flags (toggle without redeploy)
   - App configuration (runtime changes)
   - Environment-specific settings

## Step 1: Static Environment Setup

### 1.1 Create Production Environment File

```bash
cp .env.production.example .env.production
```

### 1.2 Required Variables

Edit `.env.production` with your production values:

```bash
# ============================================================================
# Core Application
# ============================================================================
VITE_APP_ENV=production
VITE_APP_URL=https://wasel.jo  # Your production domain
VITE_APP_NAME=Wasel

# ============================================================================
# Supabase (CRITICAL)
# ============================================================================
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Real anon key
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Same as anon key

# Edge Functions
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
# VITE_API_URL=https://your-project.supabase.co/functions/v1/make-server-0b1f4071

# ============================================================================
# Third-Party Services
# ============================================================================

# Stripe (Use LIVE keys for production)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # NOT pk_test_
STRIPE_SECRET_KEY=sk_live_...  # NOT sk_test_

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...  # Browser key with domain restrictions
GOOGLE_MAPS_API_KEY=AIzaSy...  # Server key (if different)

# Google OAuth
VITE_GOOGLE_CLIENT_ID=123456789.apps.googleusercontent.com

# Sentry (Error Monitoring)
VITE_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/123456

# ============================================================================
# Contact & Support
# ============================================================================
VITE_SUPPORT_EMAIL=support@wasel.jo
VITE_SUPPORT_WHATSAPP_NUMBER=962791234567
VITE_SUPPORT_PHONE_NUMBER=962791234567
VITE_SUPPORT_SMS_NUMBER=962791234567
VITE_BUSINESS_ADDRESS=Amman, Jordan
VITE_BUSINESS_ADDRESS_AR=عمان، الأردن
VITE_FOUNDER_NAME=Wasel Team

# ============================================================================
# Security & Features
# ============================================================================
VITE_AUTH_CALLBACK_PATH=/app/auth/callback
VITE_ENABLE_TWO_FACTOR_AUTH=true  # Enable after backend setup

# Notifications
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=true
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=true

# Production Safety
VITE_ENABLE_SYNTHETIC_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK=false

# ============================================================================
# Server-Side Secrets (Edge Functions)
# ============================================================================

# Supabase Project
SUPABASE_PROJECT_URL=https://your-project.supabase.co
SUPABASE_PROJECT_REF=your-project-ref
SUPABASE_PROJECT_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_PROJECT_SECRET_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Service role key

# Twilio (SMS & WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SMS_FROM=+962791234567
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Email Provider (Choose one)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=Wasel <notifications@wasel.jo>
RESEND_REPLY_TO_EMAIL=support@wasel.jo

# OR SendGrid
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxx
# SENDGRID_FROM_EMAIL=notifications@wasel.jo

# Worker Secrets
COMMUNICATION_WORKER_SECRET=$(openssl rand -hex 32)
AUTOMATION_WORKER_SECRET=$(openssl rand -hex 32)
COMMUNICATION_WEBHOOK_TOKEN=$(openssl rand -hex 32)
COMMUNICATION_MAX_ATTEMPTS=5
COMMUNICATION_PROCESS_INLINE=false
```

### 1.3 Security Checklist

- [ ] All `pk_test_` replaced with `pk_live_`
- [ ] All `sk_test_` replaced with `sk_live_`
- [ ] No placeholder values remain
- [ ] All URLs use HTTPS
- [ ] Domain restrictions on API keys
- [ ] Secrets are unique and random
- [ ] `.env.production` is in `.gitignore`

## Step 2: Dynamic KV Store Configuration

### 2.1 Apply KV Store Migration

```bash
# Push migration to production
supabase db push --db-url "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres"

# Or via SQL
psql -h db.[project-ref].supabase.co -U postgres -d postgres -f src/supabase/migrations/20260324005540_kv_store.sql
```

### 2.2 Seed Production Configuration

```bash
# Run seed file
psql -h db.[project-ref].supabase.co -U postgres -d postgres -f src/supabase/seeds/kv_store.seed.sql
```

### 2.3 Verify KV Store Setup

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE tablename LIKE 'kv_store%';

-- Check seed data
SELECT key, metadata->>'environment' as env, value 
FROM kv_store_0b1f4071 
WHERE key LIKE 'app_config:%' OR key LIKE 'feature_flag:%';
```

### 2.4 Configure Production App Config

Update the production app config via SQL or admin panel:

```sql
-- Update production app config
SELECT set_kv_value(
  'app_config:global',
  '{
    "maintenance_mode": false,
    "api_rate_limit": 100,
    "max_upload_size_mb": 10,
    "supported_languages": ["en", "ar"],
    "default_currency": "JOD",
    "support_whatsapp": "+962791234567",
    "min_app_version": "1.0.0",
    "force_update_version": "1.0.0"
  }'::jsonb,
  NULL,
  '{
    "environment": "production",
    "description": "Production app configuration",
    "owner": "platform_team"
  }'::jsonb
);
```

### 2.5 Configure Feature Flags

```sql
-- Enable core features
SELECT set_kv_value(
  'feature_flag:bus_service',
  '{"enabled": true, "metadata": {"description": "Bus service"}}'::jsonb,
  NULL,
  '{"environment": "production"}'::jsonb
);

SELECT set_kv_value(
  'feature_flag:package_delivery',
  '{"enabled": true, "metadata": {"description": "Package delivery"}}'::jsonb,
  NULL,
  '{"environment": "production"}'::jsonb
);

-- Gradual rollout for new features
SELECT set_kv_value(
  'feature_flag:wallet_v2',
  '{
    "enabled": true,
    "rollout": {"type": "percentage", "percentage": 10},
    "metadata": {"description": "Wallet V2 - 10% rollout"}
  }'::jsonb,
  NULL,
  '{"environment": "production"}'::jsonb
);
```

## Step 3: Deployment

### 3.1 Build Production Bundle

```bash
# Validate environment
npm run validate-production-env

# Build
npm run build

# Verify bundle size
npm run size
```

### 3.2 Deploy to Hosting

#### Vercel
```bash
vercel --prod
```

#### Netlify
```bash
netlify deploy --prod --dir=build
```

#### Cloudflare Pages
```bash
wrangler pages deploy build
```

### 3.3 Post-Deployment Verification

```bash
# Health check
curl https://wasel.jo/health

# Check KV store access
curl https://wasel.jo/api/config/health
```

## Step 4: Runtime Configuration Management

### 4.1 Access Admin Panel

Navigate to: `https://wasel.jo/admin/kv-store`

### 4.2 Toggle Feature Flags (No Redeploy)

```typescript
// Via admin UI or API
await toggleFeatureFlag('bus_service', false);  // Instant disable
await toggleFeatureFlag('bus_service', true);   // Instant enable
```

### 4.3 Update App Config (No Redeploy)

```typescript
// Update rate limit instantly
await setAppConfig('global', {
  ...currentConfig,
  api_rate_limit: 200,  // Increase limit
});
```

### 4.4 Gradual Feature Rollout

```typescript
// Start at 5%
await setFeatureFlag('new_feature', {
  enabled: true,
  rollout: { type: 'percentage', percentage: 5 },
});

// Monitor metrics, then increase
await setFeatureFlag('new_feature', {
  enabled: true,
  rollout: { type: 'percentage', percentage: 25 },
});

// Full rollout
await setFeatureFlag('new_feature', {
  enabled: true,
  rollout: null,  // Remove rollout restrictions
});
```

## Step 5: Monitoring & Maintenance

### 5.1 Monitor KV Store

```sql
-- Check recent changes
SELECT * FROM kv_store_audit_log 
ORDER BY changed_at DESC 
LIMIT 50;

-- Check expired entries
SELECT COUNT(*) FROM kv_store_0b1f4071 
WHERE expires_at IS NOT NULL AND expires_at <= NOW();
```

### 5.2 Cleanup Expired Entries

```bash
# Run daily via cron
SELECT cleanup_expired_kv_entries();
```

### 5.3 Backup Configuration

```bash
# Export current config
pg_dump -h db.[project-ref].supabase.co -U postgres \
  -t kv_store_0b1f4071 -t kv_store_audit_log \
  > kv_store_backup_$(date +%Y%m%d).sql
```

## Troubleshooting

### Issue: Environment validation fails

**Solution:** Check each variable matches the required format:
```bash
npm run validate-production-env
```

### Issue: KV store not accessible

**Solution:** Verify RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'kv_store_0b1f4071';
```

### Issue: Feature flag not updating

**Solution:** Clear React Query cache:
```typescript
queryClient.invalidateQueries({ queryKey: ['kv-store'] });
```

### Issue: Stripe test keys in production

**Solution:** Replace all test keys:
```bash
# Find test keys
grep -r "pk_test_" .env.production
grep -r "sk_test_" .env.production

# Replace with live keys
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

## Security Best Practices

1. **Never commit `.env.production`** - It's in `.gitignore`
2. **Rotate secrets regularly** - Every 90 days minimum
3. **Use domain restrictions** - On Google Maps API keys
4. **Enable 2FA** - After backend verifier is ready
5. **Monitor audit logs** - Check for unauthorized changes
6. **Backup configurations** - Daily automated backups
7. **Test in staging first** - Never test in production

## Quick Reference

### Environment Variables Priority
1. `.env.production` (build-time, static)
2. KV Store `app_config:global` (runtime, dynamic)
3. Feature flags (runtime, instant toggle)

### When to Use Each
- **Static env vars**: Credentials, endpoints, build config
- **KV Store config**: Rate limits, feature settings, app behavior
- **Feature flags**: A/B tests, gradual rollouts, instant toggles

### Common Commands
```bash
# Validate environment
npm run validate-production-env

# Build production
npm run build

# Check bundle size
npm run size

# Deploy
vercel --prod

# Check KV store
psql -c "SELECT * FROM kv_store_0b1f4071;"
```

## Support

For production deployment issues:
1. Check this guide first
2. Review `docs/KV_STORE_GUIDE.md`
3. Check audit logs for config changes
4. Contact platform team
