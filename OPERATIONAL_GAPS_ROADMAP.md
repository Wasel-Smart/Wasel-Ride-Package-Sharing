# Operational Gaps & Runbook

## Executive Summary

Wasel has production-grade code but needs operational excellence infrastructure. This document outlines 8 critical operational gaps and solutions.

---

## Gap 1: Comprehensive Monitoring Dashboard (Priority: CRITICAL)

### Current State

- ✅ Basic Sentry error tracking
- ✅ Lighthouse performance
- ❌ No real-time ops dashboard
- ❌ No custom metrics
- ❌ No SLA tracking

### Solution: DataDog or New Relic

**Setup (1 week):**

```typescript
// src/services/monitoring.ts
import { datadog } from '@datadog/browser-rum';

datadog.init({
  applicationId: 'YOUR_APP_ID',
  clientToken: 'YOUR_CLIENT_TOKEN',
  site: 'datadoghq.com',
  service: 'wasel-web',
  env: 'production',
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
});

// Custom metrics
export function trackRideSearch(duration: number, results: number) {
  datadog.getRumGlobal().addUserAction('ride_search', {
    duration_ms: duration,
    results_count: results,
  });
}

export function trackPayment(amount: number, method: string, success: boolean) {
  datadog.getRumGlobal().addUserAction('payment', {
    amount_jod: amount,
    payment_method: method,
    success,
  });
}
```

**Dashboards to Create:**

1. Operations Dashboard
   - Active users (real-time)
   - Rides in progress
   - Revenue/hour
   - Error rate
   - API latency (p50, p95, p99)

2. Business Dashboard
   - Daily/weekly revenue
   - User acquisition
   - Retention metrics
   - Top routes
   - Driver earnings

3. Technical Dashboard
   - Error rates by endpoint
   - Database performance
   - Memory/CPU usage
   - Deployment status
   - Uptime SLA

**Cost:** $300-500/month

**Timeline:** 1 week

**Impact:** Operational excellence +0.4

---

## Gap 2: Automated Alerting System (Priority: HIGH)

### Alert Strategy

```yaml
Alerts:
  - error_rate_high:
      condition: error_rate > 1%
      window: 5 minutes
      severity: critical
      action: PagerDuty + Slack
      resolution: auto-rollback if deployment-related

  - api_latency_high:
      condition: p95_latency > 1000ms
      window: 10 minutes
      severity: warning
      action: Slack + auto-scale

  - payment_failures:
      condition: payment_success_rate < 95%
      window: 30 minutes
      severity: critical
      action: PagerDuty + investigate CliQ

  - database_connections:
      condition: connections > 80% capacity
      window: 5 minutes
      severity: warning
      action: Slack + investigate queries

  - disk_space:
      condition: disk_usage > 80%
      window: 1 minute
      severity: warning
      action: Slack + cleanup

  - uptime_degradation:
      condition: uptime < 99%
      window: 1 hour
      severity: high
      action: PagerDuty + investigate
```

### Implementation (3 days)

```typescript
// src/supabase/functions/make-server-0b1f4071/alerts.ts

export class AlertSystem {
  private thresholds = {
    errorRatePercent: 1,
    latencyMs: 1000,
    paymentSuccessRate: 95,
  };

  async checkHealth() {
    const metrics = await this.getMetrics();

    if (metrics.errorRate > this.thresholds.errorRatePercent) {
      await this.alert('critical', 'Error rate too high', metrics);
    }

    if (metrics.p95Latency > this.thresholds.latencyMs) {
      await this.alert('warning', 'API latency high', metrics);
    }

    if (metrics.paymentSuccessRate < this.thresholds.paymentSuccessRate) {
      await this.alert('critical', 'Payment failures increasing', metrics);
    }
  }

  private async alert(severity: string, message: string, data: any) {
    // Send to PagerDuty
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      body: JSON.stringify({
        routing_key: PAGERDUTY_KEY,
        event_action: 'trigger',
        payload: {
          summary: message,
          severity,
          source: 'wasel-monitoring',
          custom_details: data,
        },
      }),
    });

    // Send to Slack
    await fetch(SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({
        text: `🚨 [${severity.toUpperCase()}] ${message}`,
        attachments: [{
          color: severity === 'critical' ? 'danger' : 'warning',
          fields: [
            { title: 'Error Rate', value: `${data.errorRate}%`, short: true },
            { title: 'Latency (p95)', value: `${data.p95Latency}ms`, short: true },
          ],
        }],
      }),
    });
  }
}

// Run every minute
setInterval(() => new AlertSystem().checkHealth(), 60000);
```

**Cost:** $0 (Slack free, PagerDuty $14/user/month for 1-2 engineers)

**Timeline:** 3 days

**Impact:** Operational uptime +1%

---

## Gap 3: Database Backup & Recovery (Priority: CRITICAL)

### Current State - Backup Infrastructure

- ❌ No automated backups
- ❌ No disaster recovery plan
- ❌ No tested restore procedures

### Solution: Supabase + S3 Backups

```typescript
// src/supabase/functions/make-server-0b1f4071/backups.ts

import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3';

const s3Client = new S3Client({ region: 'us-east-1' });

export async function backupDatabase() {
  // 1. Export database
  const dump = await Deno.run({
    cmd: [
      'pg_dump',
      `postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:5432/${DB_NAME}`,
      '-Fc', // Custom format for faster restore
    ],
    stdout: 'piped',
  });

  const backupData = await dump.output();

  // 2. Compress
  const compressed = Deno.run({
    cmd: ['gzip'],
    stdin: 'piped',
    stdout: 'piped',
  });

  // 3. Upload to S3
  const timestamp = new Date().toISOString();
  const key = `backups/${timestamp}.sql.gz`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: 'wasel-backups',
      Key: key,
      Body: backupData,
      ServerSideEncryption: 'AES256',
    })
  );

  console.log(`Backup created: s3://wasel-backups/${key}`);

  // 4. Keep only last 30 days
  await cleanOldBackups();
}

async function cleanOldBackups() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  // List and delete old backups
}

// Run daily at 2 AM UTC
export async function scheduleBackups() {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(2, 0, 0);

  if (now > target) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  const delay = target.getTime() - now.getTime();
  setTimeout(() => {
    backupDatabase();
    setInterval(backupDatabase, 24 * 60 * 60 * 1000);
  }, delay);
}
```

**Backup Strategy:**

- Daily full backups (kept 30 days)
- Hourly incremental backups (kept 7 days)
- Multi-region S3 replication
- Weekly restore test

**Cost:** $20/month (S3 storage)

**Timeline:** 1 week

**RTO (Recovery Time Objective):** <30 minutes

**RPO (Recovery Point Objective):** <1 hour

**Impact:** Disaster recovery readiness +2.0

---

## Gap 4: Disaster Recovery Plan (Priority: HIGH)

### Disaster Recovery Runbook

```markdown
# DISASTER RECOVERY RUNBOOK

## Database Recovery Scenario

### Step 1: Assess Situation (5 min)
- [ ] Verify database is unreachable
- [ ] Check AWS/Supabase status page
- [ ] Notify all team members
- [ ] Post status: "Investigating database connectivity"

### Step 2: Restore from Backup (10 min)
- [ ] SSH to recovery server
- [ ] Download latest backup from S3

  ```bash
  aws s3 cp s3://wasel-backups/backups/latest.sql.gz .
  gunzip latest.sql.gz
  ```

- [ ] Create new database instance
- [ ] Restore from backup

  ```bash
  psql "postgres://user:pass@new-host/wasel" < latest.sql
  ```

### Step 3: Point Traffic (5 min)

- [ ] Update DNS to new database host
- [ ] Update environment variables
- [ ] Restart Edge Functions
- [ ] Verify database connectivity

### Step 4: Verify Data (10 min)

- [ ] Check row counts in critical tables
- [ ] Verify recent transactions
- [ ] Run smoke tests
- [ ] Confirm user activity

### Step 5: Communicate (ongoing)

- [ ] Post updates every 5 minutes
- [ ] Notify users when service restored
- [ ] Send post-mortem within 24 hours

**Total Recovery Time: ~30 minutes**

**Data Loss: ~1 hour (since latest backup)**

```

**Other Disaster Scenarios:**

1. Payment processing down → Switch to CliQ backup
2. API slow → Auto-scale or rollback
3. Data corruption → Restore from hourly backup
4. Security breach → Activate incident response

**Cost:** $0 (included in backup costs)

**Timeline:** 1 week to document and test

**Impact:** Business continuity +2.0

---

## Gap 5: Application Performance Monitoring (APM)

### Tool: Datadog APM

```typescript
// Enable tracing
import { tracer } from 'dd-trace';

tracer.init({
  service: 'wasel-api',
  env: 'production',
});

// Trace database queries
export async function queryDatabase(sql: string) {
  const span = tracer.startSpan('database.query');
  span.setTag('sql', sql);

  try {
    const result = await supabase.query(sql);
    span.setTag('rows_returned', result.length);
    return result;
  } catch (error) {
    span.setTag('error', true);
    throw error;
  } finally {
    span.finish();
  }
}

// Trace API calls
export async function callExternalAPI(url: string, options: any) {
  const span = tracer.startSpan('http.request');
  span.setTag('url', url);
  span.setTag('method', options.method);

  try {
    const response = await fetch(url, options);
    span.setTag('status', response.status);
    return response;
  } finally {
    span.finish();
  }
}
```

**Metrics to Track:**

- Request latency (p50, p95, p99)
- Error rates by endpoint
- Database query performance
- External API call performance
- Memory usage trends
- CPU usage trends

**Cost:** $300/month

**Timeline:** 2 days

**Impact:** Performance optimization +0.3

---

## Gap 6: Log Aggregation & Centralization

### Solution: ELK Stack or Datadog Logs

```typescript
// Centralized logging
import { logger } from 'dd-logs';

logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  loginMethod: 'google',
  ipAddress: request.ip,
});

logger.error('Payment failed', {
  userId: user.id,
  paymentId: payment.id,
  error: err.message,
  amount: payment.amount,
  provider: 'cliq',
});

logger.warn('High latency detected', {
  endpoint: '/api/rides/search',
  latencyMs: 1250,
  threshold: 1000,
});
```

**Log Retention:**

- 7 days: All logs (searchable)
- 30 days: Archived (searchable)
- 1 year: Long-term storage (limited search)

**Cost:** $200/month (Datadog logs)

**Timeline:** 1 week

**Impact:** Operational insight +0.4

---

## Gap 7: Cost Tracking & Optimization

### Cost Breakdown

```text
Monthly Operating Costs:
├─ Supabase Database: $50
├─ Supabase Storage: $20
├─ Supabase Functions: $10
├─ Monitoring (DataDog): $300
├─ Backup Storage (S3): $20
├─ CDN (Vercel): $20
├─ Email/SMS (SendGrid + Twilio): $200
├─ Payment Processing (CliQ): ~2% of revenue
└─ Domain + SSL: $15

Total: ~$635 + 2% of revenue
```

### Cost Optimization

```typescript
// Monitor AWS costs
export async function trackCloudCosts() {
  const costs = {
    supabase: 50,
    storage: 20,
    functions: 10,
    monitoring: 300,
    backups: 20,
    cdn: 20,
    communication: 200,
    domain: 15,
  };

  const total = Object.values(costs).reduce((a, b) => a + b, 0);

  if (total > previousMonth * 1.2) {
    // Alert if costs spike >20%
    await notifyFinance('Cost spike detected', { costs });
  }
}

// Recommendations
const optimizations = [
  'Archive old logs after 30 days', // Save $50/month
  'Use spot instances for backups', // Save $10/month
  'Compress uploaded images', // Save $5/month
  'Cache more aggressively', // Reduce API calls 20%
];
```

**Cost Target:** <$1K/month for 10K DAU

**Timeline:** 1 week

**Impact:** Financial sustainability +1.0

---

## Gap 8: Capacity Planning & Scaling

### Forecasting Model

```typescript
// Predict future load
export class CapacityPlanner {
  predictLoad(baseload: number, growthRate: number, months: number) {
    const predictions = [];
    for (let i = 0; i < months; i++) {
      const load = baseload * Math.pow(1 + growthRate, i);
      predictions.push({
        month: i,
        predicted_dau: Math.round(load),
        predicted_concurrent: Math.round(load * 0.05), // 5% concurrent
        predicted_rpd: Math.round(load * 8), // 8 rides per DAU per day
      });
    }
    return predictions;
  }

  recommendScaling(predictions: any[]) {
    const recommendations = [];
    for (const pred of predictions) {
      if (pred.predicted_concurrent > 100) {
        recommendations.push({
          action: 'Increase database connections',
          from: 100,
          to: 200,
          month: pred.month,
        });
      }
      if (pred.predicted_rpd > 50000) {
        recommendations.push({
          action: 'Enable read replicas',
          month: pred.month,
        });
      }
    }
    return recommendations;
  }
}

// Usage
const planner = new CapacityPlanner();
const predictions = planner.predictLoad(1000, 0.3, 12); // 30% monthly growth
const recommendations = planner.recommendScaling(predictions);
```

**Scaling Timeline:**

- Month 1: 1K DAU → No scaling needed
- Month 2-3: 1K-2K DAU → Increase database connections
- Month 4-6: 2K-5K DAU → Add read replicas
- Month 6+: 5K+ DAU → Multi-region setup

**Cost:** $0 (internal)

**Timeline:** 1 week

**Impact:** Growth readiness +1.0

---

## Summary: Operational Readiness

| Gap | Priority | Timeline | Cost | Impact |
|-----|----------|----------|------|--------|
| Monitoring | CRITICAL | 1 week | $300/mo | +0.4 |
| Alerting | HIGH | 3 days | $14/mo | +1.0 |
| Backups | CRITICAL | 1 week | $20/mo | +2.0 |
| Disaster Recovery | HIGH | 1 week | $0 | +2.0 |
| APM | MEDIUM | 2 days | $300/mo | +0.3 |
| Log Aggregation | MEDIUM | 1 week | $200/mo | +0.4 |
| Cost Tracking | LOW | 1 week | $0 | +1.0 |
| Capacity Planning | MEDIUM | 1 week | $0 | +1.0 |
|---|---|---|---|---|
| **TOTAL** | - | **6 weeks** | **$834/mo** | **+8.1** |

---

## Operational Excellence Checklist

- [ ] Monitoring dashboard configured
- [ ] Alerting system active
- [ ] Daily backups running
- [ ] Disaster recovery tested
- [ ] APM instrumented
- [ ] Logs centralized
- [ ] Cost tracking enabled
- [ ] Capacity plan documented
- [ ] Runbooks written
- [ ] Team trained

**Status: 30% Complete**

**Expected Completion: Week 4**

---

**Next Review:** July 1, 2026
