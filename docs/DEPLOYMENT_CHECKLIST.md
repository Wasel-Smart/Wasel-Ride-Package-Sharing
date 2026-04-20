# WASEL PRODUCTION DEPLOYMENT CHECKLIST

**Date**: _______________  
**Deployed By**: _______________  
**Reviewed By**: _______________

---

## PRE-DEPLOYMENT

### Environment Setup
- [ ] Supabase account created
- [ ] Stripe account created (live mode)
- [ ] Twilio account created with Jordan number
- [ ] Resend account created
- [ ] Google Maps API key obtained
- [ ] Sentry project created
- [ ] Domain name purchased and configured
- [ ] Vercel account set up

### Credentials Collected
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `TWILIO_ACCOUNT_SID`
- [ ] `TWILIO_AUTH_TOKEN`
- [ ] `TWILIO_SMS_FROM`
- [ ] `RESEND_API_KEY`
- [ ] `GOOGLE_MAPS_API_KEY`
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `SENTRY_DSN`

---

## DATABASE SETUP

### Supabase Project
- [ ] Project created in Supabase dashboard
- [ ] Project reference noted: _______________
- [ ] Database password saved securely
- [ ] Connection pooling enabled
- [ ] Point-in-time recovery enabled

### Migrations
- [ ] Supabase CLI installed: `npm install -g supabase`
- [ ] Logged in: `supabase login`
- [ ] Project linked: `supabase link --project-ref YOUR_REF`
- [ ] Migration 1 applied: `20250101000000_complete_schema.sql`
- [ ] Migration 2 applied: `20250418000001_resilient_core.sql`
- [ ] Migration 3 applied: `20250420000000_phone_verification.sql`

### Verification
- [ ] All tables created (30+ tables)
- [ ] RLS enabled on all tables
- [ ] Triggers created successfully
- [ ] Functions created successfully
- [ ] Indexes created successfully

### Seed Data
- [ ] Jordan cities loaded (15 cities)
- [ ] Routes calculated (210 routes)
- [ ] Bus operators added (8 buses)
- [ ] Pricing tiers configured (6 tiers)
- [ ] Cancellation policies set (4 policies)

### Database Queries Test
```sql
-- Run these to verify
SELECT COUNT(*) FROM cities; -- Should be 15
SELECT COUNT(*) FROM routes; -- Should be 210
SELECT COUNT(*) FROM buses; -- Should be 8
SELECT COUNT(*) FROM pricing_tiers; -- Should be 6
SELECT COUNT(*) FROM cancellation_policies; -- Should be 4
```
- [ ] All counts match expected values

---

## EDGE FUNCTIONS DEPLOYMENT

### Function 1: Main API Server
- [ ] Deployed: `supabase functions deploy make-server-0b1f4071`
- [ ] Health check works: `curl .../health`
- [ ] Profile endpoint tested
- [ ] Rides endpoint tested
- [ ] Trips endpoint tested

### Function 2: Payment Webhook
- [ ] Deployed: `supabase functions deploy payment-webhook`
- [ ] Stripe webhook configured
- [ ] Webhook secret set
- [ ] Test event sent from Stripe
- [ ] Event processed successfully

### Function 3: Email Service
- [ ] Deployed: `supabase functions deploy wasel-email`
- [ ] Resend API key set
- [ ] Test email sent
- [ ] Email received successfully
- [ ] All templates working

### Function 4: SMS Verification
- [ ] Deployed: `supabase functions deploy sms-verification`
- [ ] Twilio credentials set
- [ ] Test SMS sent to Jordan number
- [ ] SMS received successfully
- [ ] Verification flow tested

### Function Secrets
```bash
# Run these commands
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_SMS_FROM=+962...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set RESEND_FROM_EMAIL="Wasel <notifications@wasel.jo>"
```
- [ ] All secrets set successfully
- [ ] Secrets verified: `supabase secrets list`

---

## FRONTEND DEPLOYMENT

### Build
- [ ] Dependencies installed: `npm ci`
- [ ] Type check passed: `npm run type-check`
- [ ] Linting passed: `npm run lint:strict`
- [ ] Tests passed: `npm run test`
- [ ] E2E tests passed: `npm run test:e2e`
- [ ] Production build created: `npm run build`
- [ ] Bundle size checked: `npm run size`

### Environment Variables
Create `.env.production` with:
- [ ] `VITE_APP_ENV=production`
- [ ] `VITE_APP_URL=https://wasel.jo`
- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] `VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071`
- [ ] `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] `VITE_GOOGLE_MAPS_API_KEY`
- [ ] `VITE_GOOGLE_CLIENT_ID`
- [ ] `VITE_SENTRY_DSN`
- [ ] `VITE_ENABLE_TWO_FACTOR_AUTH=true`
- [ ] `VITE_ENABLE_DEMO_DATA=false`
- [ ] `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false`

### Vercel Deployment
- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] Logged in: `vercel login`
- [ ] Environment variables set in Vercel dashboard
- [ ] Deployed: `vercel --prod`
- [ ] Deployment URL noted: _______________
- [ ] Custom domain configured
- [ ] SSL certificate active

---

## INTEGRATIONS

### Stripe
- [ ] Live mode enabled
- [ ] Webhook endpoint added: `https://YOUR_PROJECT.supabase.co/functions/v1/payment-webhook`
- [ ] Events selected: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
- [ ] Webhook secret copied to function secrets
- [ ] Test payment made with live card
- [ ] Payment processed successfully
- [ ] Webhook received and processed

### Supabase Auth
- [ ] Site URL set: `https://wasel.jo`
- [ ] Redirect URLs added:
  - [ ] `https://wasel.jo/app/auth/callback`
  - [ ] `https://wasel.jo/auth/callback`
- [ ] Google OAuth configured
- [ ] Facebook OAuth configured
- [ ] Email templates customized
- [ ] Rate limiting enabled (100 req/min)

### Google Maps
- [ ] API key restrictions set (HTTP referrers)
- [ ] Allowed domains: `wasel.jo`, `*.wasel.jo`
- [ ] APIs enabled: Maps JavaScript API, Places API, Directions API
- [ ] Billing account linked
- [ ] Daily quota set

### Sentry
- [ ] Project created
- [ ] DSN copied to environment
- [ ] Source maps uploaded
- [ ] Release created: `wasel@1.0.0`
- [ ] Alerts configured:
  - [ ] Error spike (>10 errors in 15 min)
  - [ ] Performance (p75 LCP >2.8s)
  - [ ] Availability (2 consecutive failures)

---

## TESTING

### Smoke Tests
- [ ] Homepage loads
- [ ] User registration works
- [ ] Email verification works
- [ ] Phone verification works
- [ ] Login works
- [ ] Google OAuth works
- [ ] Profile update works
- [ ] Create trip works
- [ ] Book ride works
- [ ] Payment works
- [ ] Email notification received
- [ ] SMS notification received

### Payment Flow
- [ ] Test card success: 4242 4242 4242 4242
- [ ] Test card decline: 4000 0000 0000 0002
- [ ] Test 3D Secure: 4000 0025 0000 3155
- [ ] Refund processed successfully
- [ ] Wallet balance updated correctly

### Phone Verification
- [ ] Code sent to Jordan number
- [ ] Code received within 30 seconds
- [ ] Code verified successfully
- [ ] Profile updated with phone number
- [ ] Verification record created

### E2E Tests
- [ ] All Playwright tests passed
- [ ] Accessibility tests passed (WCAG 2.1 AA)
- [ ] RTL/Arabic tests passed
- [ ] Mobile tests passed

### Load Testing
- [ ] k6 installed
- [ ] Load test script created
- [ ] 100 concurrent users tested
- [ ] 1000 concurrent users tested
- [ ] Response times acceptable (<500ms p95)
- [ ] Error rate acceptable (<1%)
- [ ] Database performance acceptable

---

## MONITORING

### Sentry
- [ ] Error tracking active
- [ ] Performance monitoring active
- [ ] Session replay enabled
- [ ] Alerts configured
- [ ] Team members invited

### Web Vitals
- [ ] `web_vitals` table created
- [ ] Reporter sending data
- [ ] Dashboard query created
- [ ] Metrics visible in Supabase

### Database Monitoring
- [ ] Connection pooling configured
- [ ] Query performance monitored
- [ ] Slow query log enabled
- [ ] Index usage tracked

### Logs
- [ ] Edge Function logs accessible
- [ ] Database logs accessible
- [ ] Application logs in Sentry
- [ ] Audit logs being written

---

## SECURITY

### Authentication
- [ ] JWT tokens working
- [ ] Session management working
- [ ] Password reset working
- [ ] OAuth providers working
- [ ] Rate limiting active

### Database
- [ ] RLS policies tested
- [ ] Service role key secured
- [ ] Anon key is public-safe
- [ ] Connection string secured
- [ ] Backup encryption enabled

### API
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Input validation working
- [ ] SQL injection prevented
- [ ] XSS prevention active

### Secrets
- [ ] All secrets in environment variables
- [ ] No secrets in code
- [ ] No secrets in logs
- [ ] Secrets rotated regularly
- [ ] Access restricted to team

---

## DNS & SSL

### DNS Configuration
- [ ] A record: `@` → Vercel IP
- [ ] CNAME record: `www` → Vercel
- [ ] DNS propagation complete (check: `dig wasel.jo`)
- [ ] TTL set appropriately

### SSL Certificate
- [ ] Certificate provisioned by Vercel
- [ ] HTTPS working
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal enabled

---

## BACKUP & RECOVERY

### Database Backups
- [ ] Automated backups enabled
- [ ] Backup frequency: Daily
- [ ] Backup retention: 30 days
- [ ] Point-in-time recovery enabled
- [ ] Backup restore tested

### Rollback Plan
- [ ] Previous Vercel deployment noted
- [ ] Database rollback script prepared
- [ ] Rollback procedure documented
- [ ] Team trained on rollback

---

## DOCUMENTATION

### Internal Docs
- [ ] Production Deployment Guide reviewed
- [ ] Developer Quick Reference shared
- [ ] Monitoring Runbook shared
- [ ] API documentation updated
- [ ] Troubleshooting guide reviewed

### External Docs
- [ ] Terms of Service published
- [ ] Privacy Policy published
- [ ] Help Center articles created
- [ ] FAQ page updated
- [ ] Contact information correct

---

## TEAM READINESS

### Training
- [ ] Development team trained
- [ ] Support team trained
- [ ] Operations team trained
- [ ] Management briefed

### Communication
- [ ] Launch announcement prepared
- [ ] Social media posts scheduled
- [ ] Email campaign ready
- [ ] Press release prepared (if applicable)

### Support
- [ ] Support email active: support@wasel.jo
- [ ] Support phone active: +962 79 000 0000
- [ ] Support hours defined
- [ ] Escalation process defined

---

## GO/NO-GO DECISION

### Critical Criteria (All Must Pass)
- [ ] All smoke tests passed
- [ ] Payment flow working
- [ ] Phone verification working
- [ ] No critical bugs
- [ ] Performance acceptable
- [ ] Security audit passed

### Go/No-Go Decision
- [ ] **GO** - Proceed with launch
- [ ] **NO-GO** - Delay launch (reason: _______________)

**Decision Made By**: _______________  
**Date**: _______________  
**Time**: _______________

---

## POST-LAUNCH

### First Hour
- [ ] Monitor Sentry for errors
- [ ] Check Web Vitals dashboard
- [ ] Monitor payment success rate
- [ ] Check API response times
- [ ] Monitor user registrations

### First Day
- [ ] Review all metrics
- [ ] Check user feedback
- [ ] Fix critical issues
- [ ] Update documentation
- [ ] Team debrief

### First Week
- [ ] Daily metrics review
- [ ] User feedback analysis
- [ ] Performance optimization
- [ ] Bug fixes deployed
- [ ] Feature requests logged

---

## SIGN-OFF

**Deployment Completed By**:  
Name: _______________  
Signature: _______________  
Date: _______________

**Reviewed By**:  
Name: _______________  
Signature: _______________  
Date: _______________

**Approved By**:  
Name: _______________  
Signature: _______________  
Date: _______________

---

**CONGRATULATIONS ON YOUR PRODUCTION DEPLOYMENT!** 🎉

Keep this checklist for future reference and deployments.
