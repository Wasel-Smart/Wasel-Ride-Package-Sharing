# Wasel Production Deployment Guide

## Prerequisites

- [ ] Supabase account created
- [ ] Stripe account with API keys
- [ ] Twilio account with phone number
- [ ] Resend account for emails
- [ ] Google Maps API key
- [ ] Sentry account for monitoring
- [ ] Domain name configured

## Phase 1: Database Setup (Critical)

### 1.1 Create Supabase Project

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### 1.2 Apply Migrations

```bash
# Apply all migrations in order
supabase db push

# Or manually apply each migration
psql $DATABASE_URL -f supabase/migrations/20250101000000_complete_schema.sql
psql $DATABASE_URL -f supabase/migrations/20250418000001_resilient_core.sql
psql $DATABASE_URL -f supabase/migrations/20250420000000_phone_verification.sql
```

### 1.3 Seed Database

```bash
# Apply seed data
psql $DATABASE_URL -f db/seeds/jordan_data.seed.sql
```

### 1.4 Verify Database

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check cities data
SELECT COUNT(*) FROM cities;

-- Check routes data
SELECT COUNT(*) FROM routes;
```

## Phase 2: Edge Functions Deployment

### 2.1 Deploy Functions

```bash
# Deploy main API server
supabase functions deploy make-server-0b1f4071

# Deploy payment webhook
supabase functions deploy payment-webhook

# Deploy email service
supabase functions deploy wasel-email

# Deploy SMS verification
supabase functions deploy sms-verification
```

### 2.2 Set Function Secrets

```bash
# Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio secrets
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_SMS_FROM=+962...

# Resend secrets
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL="Wasel <notifications@wasel.jo>"

# Supabase secrets (already set by default)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_ANON_KEY=eyJ...
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2.3 Test Functions

```bash
# Test health endpoint
curl https://your-project.supabase.co/functions/v1/make-server-0b1f4071/health

# Test with authentication
curl -X GET \
  https://your-project.supabase.co/functions/v1/make-server-0b1f4071/profile/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Phase 3: Frontend Configuration

### 3.1 Update Environment Variables

Create `.env.production`:

```bash
# App Configuration
VITE_APP_ENV=production
VITE_APP_URL=https://wasel.jo
VITE_APP_NAME=Wasel

# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071

# Google Maps
VITE_GOOGLE_MAPS_API_KEY=AIza...
VITE_GOOGLE_CLIENT_ID=...apps.googleusercontent.com

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Sentry
VITE_SENTRY_DSN=https://...@sentry.io/...

# Contact
VITE_SUPPORT_EMAIL=support@wasel.jo
VITE_SUPPORT_WHATSAPP_NUMBER=962790000000
VITE_SUPPORT_PHONE_NUMBER=962790000000

# Features
VITE_ENABLE_TWO_FACTOR_AUTH=true
VITE_ENABLE_EMAIL_NOTIFICATIONS=true
VITE_ENABLE_SMS_NOTIFICATIONS=true
VITE_ENABLE_WHATSAPP_NOTIFICATIONS=true

# Security
VITE_ENABLE_SYNTHETIC_DATA=false
VITE_ENABLE_SYNTHETIC_TRIPS=false
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false
VITE_ALLOW_LOCAL_PERSISTENCE_FALLBACK=false
```

### 3.2 Build Production Bundle

```bash
# Install dependencies
npm ci

# Run all checks
npm run type-check
npm run lint:strict
npm run test:coverage

# Build
npm run build

# Verify bundle size
npm run size
```

### 3.3 Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Or use GitHub integration
git push origin main
```

## Phase 4: Payment Integration

### 4.1 Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-project.supabase.co/functions/v1/payment-webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook signing secret
5. Update function secrets

### 4.2 Test Payment Flow

```bash
# Use Stripe test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# 3D Secure: 4000 0025 0000 3155
```

## Phase 5: Monitoring Setup

### 5.1 Configure Sentry

```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Create release
sentry-cli releases new wasel@1.0.0

# Upload source maps
sentry-cli releases files wasel@1.0.0 upload-sourcemaps ./dist

# Finalize release
sentry-cli releases finalize wasel@1.0.0
```

### 5.2 Set Up Alerts

In Sentry Dashboard:
- Error spike: > 10 errors in 15 minutes
- Performance: p75 LCP > 2.8s
- Availability: 2 consecutive failures

### 5.3 Web Vitals Dashboard

```sql
-- Create view for Web Vitals monitoring
CREATE OR REPLACE VIEW web_vitals_summary AS
SELECT 
  metric_name,
  rating,
  COUNT(*) as count,
  AVG(value) as avg_value,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95,
  DATE_TRUNC('hour', created_at) as hour
FROM web_vitals
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY metric_name, rating, DATE_TRUNC('hour', created_at)
ORDER BY hour DESC, metric_name;
```

## Phase 6: Security Hardening

### 6.1 Configure Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://wasel.jo
Redirect URLs:
  - https://wasel.jo/app/auth/callback
  - https://wasel.jo/auth/callback
```

### 6.2 Enable Rate Limiting

In Supabase Dashboard → Settings → API:
- Enable rate limiting
- Set to 100 requests per minute per IP

### 6.3 Configure CORS

Already configured in Edge Functions with:
```typescript
'Access-Control-Allow-Origin': '*'
```

For production, update to:
```typescript
'Access-Control-Allow-Origin': 'https://wasel.jo'
```

## Phase 7: Testing

### 7.1 Smoke Tests

```bash
# Run E2E tests against production
VITE_APP_URL=https://wasel.jo npm run test:e2e

# Run accessibility tests
npm run test:e2e:a11y

# Run RTL tests
npm run test:e2e:rtl
```

### 7.2 Load Testing

```bash
# Install k6
brew install k6  # macOS
# or download from k6.io

# Run load test
k6 run scripts/load-test.js
```

### 7.3 Manual Testing Checklist

- [ ] User registration with email
- [ ] User registration with Google OAuth
- [ ] Phone verification flow
- [ ] Create trip as driver
- [ ] Book ride as passenger
- [ ] Payment with Stripe
- [ ] Send package
- [ ] Book bus ticket
- [ ] Real-time notifications
- [ ] Live trip tracking
- [ ] Wallet top-up
- [ ] Profile update
- [ ] Arabic language switch
- [ ] Mobile responsive design
- [ ] Offline functionality

## Phase 8: Go Live

### 8.1 DNS Configuration

```
A     @       76.76.21.21
CNAME www     cname.vercel-dns.com
```

### 8.2 SSL Certificate

Vercel automatically provisions SSL certificates.

### 8.3 Launch Checklist

- [ ] All migrations applied
- [ ] All Edge Functions deployed
- [ ] All secrets configured
- [ ] Payment webhook configured
- [ ] Monitoring configured
- [ ] DNS configured
- [ ] SSL active
- [ ] Smoke tests passed
- [ ] Load tests passed
- [ ] Manual tests passed
- [ ] Backup strategy in place
- [ ] Rollback plan documented

### 8.4 Post-Launch Monitoring

First 24 hours:
- Monitor Sentry for errors
- Check Web Vitals dashboard
- Monitor payment success rate
- Check database performance
- Monitor API response times

## Rollback Procedure

If critical issues occur:

```bash
# 1. Revert Vercel deployment
vercel rollback

# 2. Revert database migration (if needed)
psql $DATABASE_URL -f supabase/migrations/rollback.sql

# 3. Notify users via status page
```

## Support Contacts

- Database: Supabase Support
- Payments: Stripe Support
- SMS: Twilio Support
- Email: Resend Support
- Monitoring: Sentry Support

## Maintenance

### Daily
- Check error logs in Sentry
- Monitor payment success rate
- Check API health endpoints

### Weekly
- Review Web Vitals trends
- Check database performance
- Review user feedback

### Monthly
- Update dependencies
- Review security alerts
- Backup database
- Review and optimize queries

## Troubleshooting

### Database Connection Issues
```bash
# Check connection
psql $DATABASE_URL -c "SELECT 1"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"
```

### Edge Function Errors
```bash
# View function logs
supabase functions logs make-server-0b1f4071

# Test function locally
supabase functions serve make-server-0b1f4071
```

### Payment Failures
```bash
# Check webhook logs
supabase functions logs payment-webhook

# Verify webhook signature
curl -X POST https://your-project.supabase.co/functions/v1/payment-webhook \
  -H "stripe-signature: test"
```

## Success Metrics

Track these KPIs:
- User registrations per day
- Trips created per day
- Bookings per day
- Payment success rate (target: >95%)
- Average response time (target: <500ms)
- Error rate (target: <1%)
- Web Vitals (LCP <2.5s, CLS <0.1, INP <200ms)

---

**Deployment Status**: Ready for Production ✅

**Estimated Deployment Time**: 4-6 hours

**Team Required**: 1 DevOps + 1 Backend + 1 Frontend

**Risk Level**: Medium (comprehensive testing required)
