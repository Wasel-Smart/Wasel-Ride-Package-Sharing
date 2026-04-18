# Production Readiness Checklist

Use this checklist before deploying to production. Check off each item as you complete it.

---

## Pre-Deployment

### Environment Configuration
- [ ] Copy `.env.production.example` to `.env.production`
- [ ] Set `VITE_APP_ENV=production`
- [ ] Set production `VITE_APP_URL` (https://wasel.jo)
- [ ] Configure Supabase production credentials
- [ ] Configure Stripe live keys (pk_live_...)
- [ ] Configure Google Maps production API key
- [ ] Configure Sentry DSN for error tracking
- [ ] Set support contact information
- [ ] Enable two-factor authentication (`VITE_ENABLE_TWO_FACTOR_AUTH=true`)
- [ ] Disable demo/test features
- [ ] Run `npm run production:validate` to verify configuration

### Database
- [ ] Apply all database migrations (`npm run apply:supabase-rollout`)
- [ ] Verify migration integrity (`npm run verify:supabase-rollout`)
- [ ] Load production seed data (`npm run seed`)
- [ ] Enable Row-Level Security (RLS) on all tables
- [ ] Review and tighten database policies
- [ ] Enable database audit logging
- [ ] Configure automated backups (daily)
- [ ] Test backup restoration process
- [ ] Set up Point-in-Time Recovery (PITR)
- [ ] Configure connection pooling limits

### Security
- [ ] Run security audit (`npm audit --audit-level=high`)
- [ ] Verify no secrets in code (`git grep -i "sk_live"`)
- [ ] Verify no hardcoded passwords
- [ ] Review and update security headers (vercel.json)
- [ ] Configure Content Security Policy (CSP)
- [ ] Enable HTTPS enforcement
- [ ] Configure CORS policies
- [ ] Set up rate limiting on API endpoints
- [ ] Enable Supabase security features
- [ ] Review user permissions and roles
- [ ] Set up security monitoring alerts

### Code Quality
- [ ] Run type checking (`npm run type-check`)
- [ ] Run linting with zero warnings (`npm run lint:strict`)
- [ ] Run all unit tests (`npm run test`)
- [ ] Verify 90%+ test coverage (`npm run test:coverage`)
- [ ] Run E2E tests (`npm run test:e2e`)
- [ ] Run accessibility tests (`npm run test:e2e:a11y`)
- [ ] Run RTL/Arabic tests (`npm run test:e2e:rtl`)
- [ ] Verify bundle sizes (`npm run size`)
- [ ] Run Lighthouse audit (`npm run test:lhci`)

### Build & Deploy
- [ ] Create production build (`npm run build`)
- [ ] Verify build output in `dist/` directory
- [ ] Test production build locally (`npm run preview`)
- [ ] Verify all routes work correctly
- [ ] Verify service worker loads
- [ ] Verify PWA manifest is valid
- [ ] Check for console errors
- [ ] Verify all assets load correctly

---

## Deployment

### DNS & SSL
- [ ] Configure DNS records for production domain
- [ ] Set up SSL certificate (Let's Encrypt or similar)
- [ ] Verify HTTPS is working
- [ ] Configure www redirect (if applicable)
- [ ] Set up CDN (Vercel Edge Network or Cloudflare)
- [ ] Configure cache headers

### Hosting Platform (Vercel)
- [ ] Create Vercel project
- [ ] Link GitHub repository
- [ ] Configure environment variables in Vercel dashboard
- [ ] Set up production domain
- [ ] Configure build settings
- [ ] Enable Vercel Analytics
- [ ] Set up deployment notifications

### Monitoring & Alerting
- [ ] Configure Sentry error tracking
- [ ] Set up uptime monitoring (UptimeRobot/Pingdom)
- [ ] Configure performance monitoring
- [ ] Set up log aggregation (optional)
- [ ] Create monitoring dashboards
- [ ] Configure alert rules
- [ ] Set up on-call rotation
- [ ] Test alert notifications

### Backup & Recovery
- [ ] Configure automated database backups
- [ ] Test database backup process (`npm run backup:db`)
- [ ] Test database restoration process
- [ ] Document rollback procedure
- [ ] Set up storage backups (Supabase Storage)
- [ ] Configure backup retention policy (30 days)
- [ ] Test disaster recovery plan

---

## Post-Deployment

### Smoke Tests
- [ ] Verify landing page loads
- [ ] Test user signup flow
- [ ] Test user signin flow
- [ ] Test find ride functionality
- [ ] Test offer ride functionality
- [ ] Test bus schedules
- [ ] Test package delivery
- [ ] Test wallet functionality
- [ ] Test profile management
- [ ] Test notifications
- [ ] Verify all critical user flows work

### Performance Verification
- [ ] Run Lighthouse audit on production URL
- [ ] Verify Performance score > 90
- [ ] Verify Accessibility score > 95
- [ ] Verify Best Practices score > 95
- [ ] Verify SEO score > 90
- [ ] Check Web Vitals metrics
- [ ] Verify response times < 500ms (P95)
- [ ] Check CDN cache hit rate

### Security Verification
- [ ] Verify security headers (`curl -I https://wasel.jo`)
- [ ] Test SSL certificate
- [ ] Verify HTTPS redirect works
- [ ] Test rate limiting
- [ ] Verify authentication flows
- [ ] Test authorization controls
- [ ] Check for exposed secrets
- [ ] Run security scan (OWASP ZAP or similar)

### Monitoring Verification
- [ ] Verify Sentry is receiving events
- [ ] Check uptime monitoring is active
- [ ] Verify performance metrics are being collected
- [ ] Test alert notifications
- [ ] Check error rates are within acceptable range
- [ ] Verify logs are being captured
- [ ] Test health check endpoint (`npm run production:health --url=https://wasel.jo`)

---

## Documentation

### Internal Documentation
- [ ] Update deployment guide with production specifics
- [ ] Document environment variables
- [ ] Document database schema
- [ ] Document API endpoints
- [ ] Create runbooks for common operations
- [ ] Document incident response procedures
- [ ] Update architecture diagrams
- [ ] Document monitoring setup

### External Documentation
- [ ] Update README with production information
- [ ] Update privacy policy
- [ ] Update terms of service
- [ ] Create user documentation
- [ ] Create FAQ
- [ ] Set up status page (optional)

---

## Team Readiness

### Training
- [ ] Train team on production environment
- [ ] Review incident response plan
- [ ] Practice rollback procedure
- [ ] Review monitoring dashboards
- [ ] Train on database backup/restore
- [ ] Review security procedures

### Communication
- [ ] Notify stakeholders of deployment schedule
- [ ] Prepare launch announcement
- [ ] Set up support channels
- [ ] Create customer communication templates
- [ ] Prepare social media posts
- [ ] Set up feedback collection

---

## Compliance & Legal

### Data Protection
- [ ] Review GDPR compliance (if applicable)
- [ ] Configure data retention policies
- [ ] Set up data deletion procedures
- [ ] Document data processing activities
- [ ] Review privacy policy
- [ ] Set up cookie consent (if needed)

### Payment Compliance
- [ ] Verify PCI DSS compliance
- [ ] Review Stripe integration security
- [ ] Test payment flows
- [ ] Configure payment notifications
- [ ] Set up refund procedures
- [ ] Document payment policies

### Local Regulations (Jordan)
- [ ] Review TRC requirements
- [ ] Configure incident reporting
- [ ] Review local data protection laws
- [ ] Set up local support channels

---

## Launch Day

### Final Checks (T-1 hour)
- [ ] Run full verification suite (`npm run verify`)
- [ ] Verify all environment variables are set
- [ ] Check database connection
- [ ] Verify external services (Stripe, Google Maps, etc.)
- [ ] Test critical user flows one more time
- [ ] Verify monitoring is active
- [ ] Confirm team is ready
- [ ] Have rollback plan ready

### Deployment (T-0)
- [ ] Deploy to production (`npm run production:deploy`)
- [ ] Verify deployment succeeded
- [ ] Run smoke tests
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Watch for alerts

### Post-Launch (T+1 hour)
- [ ] Monitor error rates closely
- [ ] Check user feedback
- [ ] Verify all systems operational
- [ ] Send launch announcement
- [ ] Update status page
- [ ] Celebrate! 🎉

---

## Week 1 Post-Launch

### Daily Monitoring
- [ ] Check error rates
- [ ] Review performance metrics
- [ ] Monitor user feedback
- [ ] Check database performance
- [ ] Review security logs
- [ ] Verify backups are running
- [ ] Check uptime metrics

### Issue Tracking
- [ ] Triage reported issues
- [ ] Fix critical bugs immediately
- [ ] Document known issues
- [ ] Plan bug fix releases
- [ ] Communicate with users

### Optimization
- [ ] Identify performance bottlenecks
- [ ] Optimize slow database queries
- [ ] Improve error handling
- [ ] Enhance monitoring
- [ ] Update documentation based on learnings

---

## Success Metrics

### Technical KPIs
- [ ] Uptime > 99.9%
- [ ] Error rate < 0.1%
- [ ] P95 response time < 500ms
- [ ] Lighthouse performance > 90
- [ ] Zero critical security vulnerabilities

### Business KPIs
- [ ] User signups
- [ ] Active users
- [ ] Ride bookings
- [ ] Package deliveries
- [ ] User satisfaction > 4.5/5
- [ ] Support ticket volume

---

## Emergency Contacts

**On-Call Engineer:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Incident Commander:**
- Name: _______________
- Phone: _______________
- Email: _______________

**CTO/Technical Lead:**
- Name: _______________
- Phone: _______________
- Email: _______________

**Service Providers:**
- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- Stripe Support: https://support.stripe.com

---

## Sign-Off

**Deployment Approved By:**

- [ ] Technical Lead: _______________ Date: _______________
- [ ] Product Manager: _______________ Date: _______________
- [ ] Security Lead: _______________ Date: _______________
- [ ] CTO/CEO: _______________ Date: _______________

**Deployment Date:** _______________  
**Deployment Time:** _______________  
**Deployed By:** _______________

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-01  
**Next Review:** After first production deployment
