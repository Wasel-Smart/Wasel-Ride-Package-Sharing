# Monitoring & Analytics on Vercel

Track performance, errors, and user experience in production.

## Vercel Analytics Dashboard

### Enable Analytics
1. Vercel Dashboard → Select project
2. Settings → Analytics
3. Enable Web Analytics and/or Vitals

### Core Web Vitals

Monitor user experience metrics:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | <2.5s | 2.5-4s | >4s |
| **FID** (First Input Delay) | <100ms | 100-300ms | >300ms |
| **CLS** (Cumulative Layout Shift) | <0.1 | 0.1-0.25 | >0.25 |

### Accessing Metrics
1. Dashboard → Analytics
2. View trends over time
3. Filter by route or device type
4. Compare before/after deployments

## Real User Monitoring (RUM)

Vercel collects anonymous RUM data automatically. To integrate custom monitoring:

```ts
// Track custom events
import { Analytics } from '@vercel/analytics/react';

export default function App() {
  return (
    <>
      <Analytics />
      {/* Your app */}
    </>
  );
}
```

## Error Tracking Integration

### Sentry Integration

1. Install SDK: `npm install @sentry/react`
2. Initialize in your app:

```ts
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.VITE_ENV,
  tracesSampleRate: 1.0,
});
```

3. Set Sentry DSN in Vercel environment variables
4. View errors in Sentry dashboard

### Vercel Error Logs

View errors automatically tracked by Vercel:

```bash
# Stream logs in real-time
vercel logs --follow --tail --error-only
```

## Performance Monitoring

### Lighthouse CI

```bash
npm install -g @lhci/cli@*
lhci autorun
```

Create `lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["https://example.com"],
      "numberOfRuns": 3
    },
    "upload": {
      "target": "temporary-public-storage"
    },
    "assert": {
      "preset": "lighthouse:recommended"
    }
  }
}
```

### Custom Metrics

Track in your application:

```ts
// Performance Observer API
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('Performance metric:', entry.name, entry.duration);
  }
});

observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
```

## Database Query Monitoring

For backend performance:

```ts
// Log slow queries
const start = Date.now();
const result = await db.query(sql);
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`Slow query (${duration}ms):`, sql.substring(0, 100));
}
```

## API Route Performance

Monitor endpoint response times:

```ts
// api/route.ts
export default async (req, res) => {
  const start = Date.now();
  
  try {
    const data = await fetchData();
    const duration = Date.now() - start;
    
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.json(data);
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
};
```

## Alerts & Notifications

### Vercel Alerts (Enterprise)

1. Dashboard → Settings → Alerts
2. Set thresholds for:
   - High error rates
   - Long response times
   - Memory usage

### Custom Slack Alerts

```bash
# Create webhook at https://api.slack.com/messaging/webhooks

# Alert on high error rate
* */5 * * * * curl -X POST $SLACK_WEBHOOK -d \
  '{"text":"High error rate detected"}' \
  || true
```

## Deployment Comparisons

### Before/After Metrics

1. Deploy new version
2. Go to Analytics
3. Filter by date range
4. Compare metrics across deployments

### Identify Regressions

Look for spikes in:
- Error rate
- Response time
- Core Web Vitals degradation

## Status Page Integration

Create public status page with Vercel incidents:

```ts
// api/health.ts
export default async (req, res) => {
  const checks = {
    api: await checkApiHealth(),
    database: await checkDatabaseHealth(),
    cdn: await checkCdnHealth()
  };
  
  const healthy = Object.values(checks).every(c => c === true);
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'operational' : 'degraded',
    checks,
    timestamp: new Date()
  });
};
```

## Log Retention & Archival

Vercel retains logs for:
- 24 hours: Free tier
- 30 days: Pro & Enterprise

For longer retention, integrate:
- **Datadog**: For distributed tracing
- **New Relic**: For APM
- **CloudWatch**: For cloud-native monitoring
- **Splunk**: For log aggregation

## Cost Monitoring

1. Dashboard → Usage
2. View bandwidth, function calls, logs
3. Set budget alerts if needed

## Recommended Dashboard

Set up a monitoring dashboard with:
- Core Web Vitals trend
- Error rate over time
- Top error messages
- Deployment history with metrics
