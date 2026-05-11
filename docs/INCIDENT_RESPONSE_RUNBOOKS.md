# Wasel Platform - Incident Response Runbooks

## Table of Contents

1. [High Error Rate](#high-error-rate)
2. [API Down](#api-down)
3. [Database Down](#database-down)
4. [Payment Failures](#payment-failures)
5. [High Latency](#high-latency)
6. [Circuit Breaker Open](#circuit-breaker-open)
7. [High Memory Usage](#high-memory-usage)
8. [High CPU Usage](#high-cpu-usage)
9. [Deployment Rollback](#deployment-rollback)
10. [Data Corruption](#data-corruption)

---

## High Error Rate

### Symptoms
- Error rate > 5% over 5 minutes
- Multiple user reports of failures
- Sentry error spike

### Impact
- **Severity:** Critical
- **User Impact:** High - Users cannot complete actions
- **Business Impact:** Revenue loss, reputation damage

### Diagnosis

#### Step 1: Check Error Dashboard
```bash
# Open Grafana dashboard
open https://grafana.wasel.jo/d/errors

# Check Sentry
open https://sentry.io/wasel/errors
```

#### Step 2: Identify Error Pattern
```bash
# Check error logs
kubectl logs -l app=wasel-api --tail=100 | grep ERROR

# Check error distribution
curl https://api.wasel.jo/health | jq '.errors'
```

#### Step 3: Check Recent Deployments
```bash
# List recent deployments
kubectl rollout history deployment/wasel-api

# Check deployment time vs error spike
```

### Resolution

#### If Caused by Recent Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/wasel-api

# Verify rollback
kubectl rollout status deployment/wasel-api

# Check error rate
watch -n 5 'curl -s https://api.wasel.jo/health | jq ".errorRate"'
```

#### If Caused by External Service
```bash
# Check circuit breaker status
curl https://api.wasel.jo/debug/circuit-breakers

# Manually open circuit breaker if needed
curl -X POST https://api.wasel.jo/debug/circuit-breakers/stripe/open
```

#### If Caused by Database
```bash
# Check database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql -c "SELECT query, state, wait_event FROM pg_stat_activity WHERE state != 'idle';"

# Kill long-running queries if needed
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < now() - interval '5 minutes';"
```

### Communication

**Internal:**
```
🚨 INCIDENT: High Error Rate
Status: Investigating
Impact: Users experiencing failures
ETA: 15 minutes
Updates: Every 5 minutes
```

**External (if needed):**
```
We're experiencing technical difficulties. 
Our team is working to resolve the issue.
Updates: https://status.wasel.jo
```

### Post-Incident

1. **Root Cause Analysis**
   - Document what happened
   - Identify root cause
   - Create prevention plan

2. **Follow-up Actions**
   - Update monitoring
   - Improve alerting
   - Add tests

---

## API Down

### Symptoms
- Health check failing
- 503/504 errors
- No response from API

### Impact
- **Severity:** Critical
- **User Impact:** Critical - Complete service outage
- **Business Impact:** Complete revenue loss

### Diagnosis

#### Step 1: Check API Health
```bash
# Check health endpoint
curl -v https://api.wasel.jo/health

# Check from multiple locations
curl -v https://api.wasel.jo/health --resolve api.wasel.jo:443:1.2.3.4
```

#### Step 2: Check Infrastructure
```bash
# Check pods
kubectl get pods -l app=wasel-api

# Check pod logs
kubectl logs -l app=wasel-api --tail=50

# Check pod events
kubectl describe pods -l app=wasel-api
```

#### Step 3: Check Load Balancer
```bash
# Check load balancer health
aws elbv2 describe-target-health --target-group-arn <arn>

# Check CloudFront (if used)
aws cloudfront get-distribution --id <id>
```

### Resolution

#### If Pods are Crashing
```bash
# Check crash reason
kubectl logs -l app=wasel-api --previous

# Increase resources if OOM
kubectl set resources deployment/wasel-api --limits=memory=2Gi

# Restart deployment
kubectl rollout restart deployment/wasel-api
```

#### If Database Connection Issue
```bash
# Check database connectivity
psql -h db.wasel.jo -U wasel -c "SELECT 1;"

# Check connection pool
psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='wasel';"

# Restart connection pool
kubectl rollout restart deployment/wasel-api
```

#### If Load Balancer Issue
```bash
# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>

# Deregister unhealthy targets
aws elbv2 deregister-targets --target-group-arn <arn> --targets Id=<id>

# Register new targets
aws elbv2 register-targets --target-group-arn <arn> --targets Id=<id>
```

### Communication

**Internal:**
```
🔴 CRITICAL: API Down
Status: Investigating
Impact: Complete service outage
ETA: 10 minutes
Page: On-call engineer paged
```

**External:**
```
⚠️ Service Outage
We're experiencing a complete service outage.
Our team is working urgently to restore service.
Updates every 5 minutes: https://status.wasel.jo
```

---

## Database Down

### Symptoms
- Database connection errors
- Timeout errors
- Data not loading

### Impact
- **Severity:** Critical
- **User Impact:** Critical - No data access
- **Business Impact:** Complete service disruption

### Diagnosis

#### Step 1: Check Database Status
```bash
# Check database connectivity
psql -h db.wasel.jo -U wasel -c "SELECT 1;"

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json
```

#### Step 2: Check Database Metrics
```bash
# Check connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check locks
psql -c "SELECT * FROM pg_locks WHERE NOT granted;"

# Check replication lag
psql -c "SELECT * FROM pg_stat_replication;"
```

#### Step 3: Check Disk Space
```bash
# Check disk usage
df -h

# Check database size
psql -c "SELECT pg_size_pretty(pg_database_size('wasel'));"
```

### Resolution

#### If Connection Pool Exhausted
```bash
# Kill idle connections
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

# Increase connection limit (if needed)
psql -c "ALTER SYSTEM SET max_connections = 200;"
psql -c "SELECT pg_reload_conf();"
```

#### If Disk Full
```bash
# Clean up old logs
find /var/log/postgresql -name "*.log" -mtime +7 -delete

# Vacuum database
psql -c "VACUUM FULL;"

# Archive old data
psql -c "DELETE FROM audit_logs WHERE created_at < now() - interval '90 days';"
```

#### If Replication Lag
```bash
# Check replication status
psql -c "SELECT * FROM pg_stat_replication;"

# Restart replication
psql -c "SELECT pg_wal_replay_resume();"
```

### Communication

**Internal:**
```
🔴 CRITICAL: Database Down
Status: Investigating
Impact: Complete data access failure
ETA: 15 minutes
Escalation: Database team engaged
```

---

## Payment Failures

### Symptoms
- Payment failure rate > 10%
- Stripe webhook failures
- User reports of payment issues

### Impact
- **Severity:** Critical
- **User Impact:** High - Cannot complete purchases
- **Business Impact:** Direct revenue loss

### Diagnosis

#### Step 1: Check Stripe Status
```bash
# Check Stripe status
curl https://status.stripe.com/api/v2/status.json

# Check Stripe dashboard
open https://dashboard.stripe.com
```

#### Step 2: Check Payment Logs
```bash
# Check payment errors
kubectl logs -l app=wasel-api | grep "payment" | grep "ERROR"

# Check Stripe webhook logs
curl https://api.wasel.jo/admin/webhooks/stripe/logs
```

#### Step 3: Check Payment Flow
```bash
# Test payment flow
curl -X POST https://api.wasel.jo/payments/test \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"amount": 1, "currency": "JOD"}'
```

### Resolution

#### If Stripe API Issue
```bash
# Check Stripe API key
echo $STRIPE_SECRET_KEY | cut -c1-10

# Rotate API key if compromised
# Update secret in Kubernetes
kubectl create secret generic stripe-secret \
  --from-literal=api-key=$NEW_STRIPE_KEY \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart pods
kubectl rollout restart deployment/wasel-api
```

#### If Webhook Issue
```bash
# Check webhook endpoint
curl -X POST https://api.wasel.jo/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'

# Re-register webhook
curl -X POST https://api.stripe.com/v1/webhook_endpoints \
  -u $STRIPE_SECRET_KEY: \
  -d url=https://api.wasel.jo/webhooks/stripe \
  -d "enabled_events[]"=payment_intent.succeeded
```

### Communication

**Internal:**
```
🚨 INCIDENT: Payment Failures
Status: Investigating
Impact: Users cannot complete payments
Revenue Impact: High
ETA: 10 minutes
```

**External:**
```
We're experiencing issues with payment processing.
Please try again in a few minutes.
Your account will not be charged for failed attempts.
```

---

## Deployment Rollback

### When to Rollback

- Error rate > 5% after deployment
- Critical bug discovered
- Performance degradation
- Data corruption risk

### Rollback Procedure

#### Step 1: Assess Impact
```bash
# Check error rate
curl https://api.wasel.jo/health | jq '.errorRate'

# Check affected users
psql -c "SELECT COUNT(DISTINCT user_id) FROM error_logs WHERE created_at > now() - interval '5 minutes';"
```

#### Step 2: Execute Rollback
```bash
# Rollback application
kubectl rollout undo deployment/wasel-api

# Verify rollback
kubectl rollout status deployment/wasel-api

# Check health
curl https://api.wasel.jo/health
```

#### Step 3: Rollback Database (if needed)
```bash
# Check migration version
psql -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# Rollback migration
psql -f supabase/migrations/rollback/YYYYMMDD_migration_rollback.sql

# Verify rollback
psql -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

#### Step 4: Verify System
```bash
# Run smoke tests
npm run test:smoke

# Check critical flows
curl -X POST https://api.wasel.jo/test/booking
curl -X POST https://api.wasel.jo/test/payment
```

### Communication

**Internal:**
```
⚠️ ROLLBACK IN PROGRESS
Deployment: v1.2.3 → v1.2.2
Reason: High error rate
Status: Rolling back
ETA: 5 minutes
```

**External:**
```
We've identified an issue and are reverting to a stable version.
Service will be restored shortly.
```

---

## Emergency Contacts

### On-Call Rotation

**Primary:** +962-XXX-XXXX  
**Secondary:** +962-XXX-XXXX  
**Manager:** +962-XXX-XXXX

### Escalation Path

1. **Level 1:** On-call engineer (0-15 min)
2. **Level 2:** Team lead (15-30 min)
3. **Level 3:** Engineering manager (30-60 min)
4. **Level 4:** CTO (60+ min)

### External Contacts

**Supabase Support:** support@supabase.com  
**Stripe Support:** +1-XXX-XXX-XXXX  
**AWS Support:** Case via console

---

## Post-Incident Checklist

- [ ] Incident resolved
- [ ] Service restored
- [ ] Users notified
- [ ] Status page updated
- [ ] Incident report created
- [ ] Root cause identified
- [ ] Prevention plan created
- [ ] Monitoring updated
- [ ] Runbook updated
- [ ] Team debriefed

---

**Last Updated:** 2025  
**Version:** 1.0  
**Owner:** Engineering Team
