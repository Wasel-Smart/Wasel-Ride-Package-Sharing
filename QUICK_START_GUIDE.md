# Quick Reference - New Features

## 🔐 Security Features

### CSRF Protection
```typescript
import { CSRF } from '@/utils/csrf';

// Automatically added to POST/PUT/DELETE/PATCH requests
// Manual usage:
const token = CSRF.getToken();
const headers = CSRF.addHeader({ 'Content-Type': 'application/json' });
```

### Circuit Breaker
```typescript
import { circuitBreakers } from '@/utils/circuitBreaker';

// Automatic in fetchWithRetry()
// Manual usage:
const breaker = circuitBreakers.get('my-service', {
  failureThreshold: 5,
  timeout: 30000,
});

const result = await breaker.execute(async () => {
  return await fetch('https://api.example.com');
});
```

### Session Management
```typescript
import { sessionManager } from '@/utils/sessionManager';

// Start session
sessionManager.startSession(userId);

// Check validity
const isValid = sessionManager.isSessionValid();

// Extend session
sessionManager.extendSession();

// Get stats
const stats = sessionManager.getSessionStats();
```

### Secure Storage
```typescript
import { secureStorage } from '@/utils/encryption';

// Store encrypted data
await secureStorage.setItem('key', 'sensitive-data');

// Retrieve encrypted data
const data = await secureStorage.getItem('key');

// Remove
secureStorage.removeItem('key');
```

---

## 🏥 Health Monitoring

### Check System Health
```typescript
import { performHealthCheck } from '@/utils/healthCheck';

const health = await performHealthCheck();
console.log(health.overall); // HEALTHY | DEGRADED | UNHEALTHY
```

### Start Monitoring
```typescript
import { startHealthMonitoring } from '@/utils/healthCheck';

// Already started in App.tsx
// Manual usage:
const stopMonitoring = startHealthMonitoring(60000); // Every 60 seconds
```

---

## 🚨 Alerting System

### Subscribe to Alerts
```typescript
import { alerting } from '@/utils/alerting';

const unsubscribe = alerting.subscribe((alert) => {
  console.log('Alert:', alert.title, alert.message);
});
```

### Check Metrics
```typescript
import { alerting } from '@/utils/alerting';

alerting.checkMetric({
  metric: 'error_rate',
  value: 0.08,
  timestamp: Date.now(),
});
```

### Get Alert Stats
```typescript
const stats = alerting.getStats();
console.log(stats.total, stats.unacknowledged);
```

---

## 🍪 GDPR Components

### Cookie Consent Banner
```typescript
import { CookieConsentBanner } from '@/components/gdpr/CookieConsentBanner';

// Already in App.tsx
<CookieConsentBanner />
```

### Data Export Button
```typescript
import { DataExportButton } from '@/components/gdpr/DataExportButton';

<DataExportButton />
```

### Account Deletion Dialog
```typescript
import { AccountDeletionDialog } from '@/components/gdpr/AccountDeletionDialog';

<AccountDeletionDialog />
```

### Privacy Settings Page
```typescript
import { PrivacySettings } from '@/features/profile/PrivacySettings';

// Add to router
<Route path="/privacy-settings" element={<PrivacySettings />} />
```

---

## ⏱️ Session Timeout Warning

```typescript
import { SessionTimeoutWarning } from '@/components/system/SessionTimeoutWarning';

// Already in App.tsx
<SessionTimeoutWarning />
```

---

## 🧪 Testing

### Run Integration Tests
```bash
npm run test:unit
```

### Test Database Migrations
```bash
.\scripts\test-migrations.bat
```

### Run E2E Tests
```bash
npm run test:e2e
```

---

## 🔧 Configuration

### Environment Variables
```bash
# Security
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Analytics
VITE_ANALYTICS_ENDPOINT=https://analytics.wasel14.online/api/v1

# CDN
VITE_CDN_URL=https://cdn.wasel14.online
```

### CSP Headers
Located in `public/_headers` - automatically applied

---

## 📊 Monitoring

### Check Circuit Breaker Status
```typescript
import { circuitBreakers } from '@/utils/circuitBreaker';

const stats = circuitBreakers.getAllStats();
console.log(stats);
```

### View Health Status
```typescript
import { performHealthCheck } from '@/utils/healthCheck';

const health = await performHealthCheck();
console.log(health.checks.database.status);
console.log(health.checks.authentication.status);
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start Supabase
```bash
npm run supabase:start
```

### 4. Run Migrations
```bash
npm run supabase:db:reset
```

### 5. Start Dev Server
```bash
npm run dev
```

---

## 🔍 Debugging

### Check CSRF Token
```typescript
import { CSRF } from '@/utils/csrf';
console.log('CSRF Token:', CSRF.getToken());
```

### Check Session Status
```typescript
import { sessionManager } from '@/utils/sessionManager';
console.log('Session Valid:', sessionManager.isSessionValid());
console.log('Time Remaining:', sessionManager.getTimeUntilTimeout());
```

### Check Circuit Breaker State
```typescript
import { circuitBreakers } from '@/utils/circuitBreaker';
const breaker = circuitBreakers.get('api-calls');
console.log('Circuit State:', breaker.getState());
```

---

## 📝 Common Tasks

### Add New Alert Rule
```typescript
import { alerting } from '@/utils/alerting';

alerting.addRule({
  id: 'custom-metric',
  name: 'Custom Metric Alert',
  metric: 'custom_metric',
  condition: (value) => value > 100,
  severity: AlertSeverity.WARNING,
  message: 'Custom metric exceeded threshold',
  cooldownMs: 5 * 60 * 1000,
});
```

### Create New Circuit Breaker
```typescript
import { circuitBreakers } from '@/utils/circuitBreaker';

const breaker = circuitBreakers.get('new-service', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 30000,
});
```

### Manually Trigger Health Check
```typescript
import { performHealthCheck } from '@/utils/healthCheck';

const health = await performHealthCheck();
if (health.overall === 'UNHEALTHY') {
  // Handle unhealthy state
}
```

---

## 🎯 Best Practices

1. **Always use fetchWithRetry()** for API calls (includes CSRF + circuit breaker)
2. **Check session validity** before sensitive operations
3. **Use secureStorage** for sensitive data (not localStorage)
4. **Subscribe to alerts** for critical metrics
5. **Monitor health checks** in production
6. **Test migrations** before deploying
7. **Respect GDPR** - use provided components

---

## 📚 Documentation

- [Complete Implementation Summary](./COMPLETE_IMPLEMENTATION_SUMMARY.md)
- [Architecture](./docs/architecture.md)
- [Security](./docs/security-and-identity.md)
- [Testing](./docs/testing.md)
- [API Contract](./docs/api-contract.md)

---

**Quick Help:**
- CSRF not working? Check `CSRF.getToken()` returns a value
- Session timeout? Check `sessionManager.isSessionValid()`
- Circuit breaker open? Check `breaker.getState()`
- Health check failing? Run `performHealthCheck()` manually
