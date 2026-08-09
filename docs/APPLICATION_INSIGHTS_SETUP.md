# Application Insights Monitoring Setup

## Overview

Application Insights is now integrated into the Wasel application to provide comprehensive performance monitoring, exception tracking, and analytics for production deployments.

## Features

✅ **Performance Monitoring**

- Automatic page view tracking
- Ajax/HTTP request tracking
- Browser performance metrics
- Network correlation

✅ **Exception & Error Tracking**

- Unhandled exceptions
- JavaScript errors
- Unhandled promise rejections
- Error boundaries

✅ **Distributed Tracing**

- W3C trace context support
- Request correlation across services
- End-to-end diagnostics

✅ **Custom Metrics**

- Business event tracking
- Custom performance metrics
- User journey analytics

## Configuration

### Environment Setup

1. **Create an Application Insights Resource** in Azure Portal
2. **Get the Instrumentation Key** from the resource
3. **Add to .env**:

   ```bash
   VITE_APP_INSIGHTS_KEY=your-instrumentation-key-here
   ```

### Local Development

When running locally without Application Insights configured:

```
✓ Logs: "Application Insights not configured (VITE_APP_INSIGHTS_KEY not set)"
✓ App continues to work normally
✓ No monitoring overhead in development
```

### Production Deployment

1. Set the `VITE_APP_INSIGHTS_KEY` environment variable in your deployment
2. Application Insights will automatically:
   - Track all page views
   - Capture all errors
   - Monitor network performance
   - Track user interactions

## API Reference

### Core Functions

```typescript
import {
  initializeAppInsights,        // Called automatically in main.tsx
  getAppInsights,               // Get the AppInsights instance
  trackCustomEvent,             // Track business events
  trackPageView,                // Track custom page views
  trackException,               // Track errors manually
  trackMetric,                  // Track performance metrics
} from '@/utils/appInsights';
```

### Usage Examples

**Track a custom business event:**

```typescript
import { trackCustomEvent } from '@/utils/appInsights';

// Track ride booking
trackCustomEvent('ride_booked', {
  origin: 'Cairo',
  destination: 'Alexandria',
  rideType: 'economy',
  price: '150.00',
});
```

**Track a page navigation:**

```typescript
import { trackPageView } from '@/utils/appInsights';

// In your routing logic
trackPageView('FindRidePage', {
  timestamp: new Date().toISOString(),
});
```

**Track errors:**

```typescript
import { trackException } from '@/utils/appInsights';

try {
  await ridesApi.bookRide(rideData);
} catch (error) {
  trackException(error, 2); // 2 = Error level (0=Verbose, 1=Info, 2=Error, 3=Critical)
}
```

**Track performance metrics:**

```typescript
import { trackMetric } from '@/utils/appInsights';

const startTime = performance.now();
await expensiveOperation();
const duration = performance.now() - startTime;

trackMetric('operation_duration_ms', duration, {
  operation: 'ride_matching',
  userId: 'user123',
});
```

## Monitoring Dashboard

After configuration, access your insights at:

- **Azure Portal**: Resource Group → Application Insights → Your Resource
- **Dashboards**: Custom Workbook dashboards for key metrics
- **Performance**: Browser performance, dependency tracking
- **Failures**: Exception rates, error messages, stack traces
- **Users**: Session count, new/returning users, geography

## Alerts

Set up alerts in Application Insights for:

- High error rates
- Performance degradation
- Availability issues
- Custom thresholds

## Data Retention

Application Insights data is retained per your Azure plan:

- **Free tier**: 90 days
- **Paid tiers**: 30-730 days (configurable)

## Privacy & GDPR

- Application Insights respects GDPR requirements
- Configure data retention policies
- Use sampling for large-scale deployments
- No personally identifiable information is collected by default

## Troubleshooting

**Application Insights not logging data:**

1. Verify `VITE_APP_INSIGHTS_KEY` is set correctly
2. Check browser console for errors: `console.debug()` messages will appear
3. Wait 5-10 minutes for data to appear in Azure Portal (batch processing)
4. Verify network tab shows requests to `dc.applicationinsights.azure.com`

**High data costs:**

1. Enable sampling in high-volume scenarios
2. Configure adaptive sampling
3. Adjust log level from Verbose to Info/Error
4. Filter non-critical event tracking

## References

- [Application Insights Documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview)
- [JavaScript SDK Guide](https://learn.microsoft.com/en-us/azure/azure-monitor/app/javascript)
- [Best Practices](https://learn.microsoft.com/en-us/azure/azure-monitor/app/best-practices)
