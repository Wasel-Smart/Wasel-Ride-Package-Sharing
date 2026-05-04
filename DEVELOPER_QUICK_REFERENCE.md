# Wasel Platform - Developer Quick Reference
## Security & Resilience Features

**Version:** 2.0  
**Last Updated:** 2025

---

## 🔒 Security Features

### 1. Encrypted Storage

```typescript
import { secureStorage } from '@/utils/encryption';

// ✅ DO: Use for sensitive data
await secureStorage.setItem('user_payment_method', JSON.stringify(paymentData));
const data = await secureStorage.getItem('user_payment_method');

// ❌ DON'T: Use regular localStorage for sensitive data
localStorage.setItem('payment_info', JSON.stringify(paymentData)); // INSECURE!
```

### 2. CSRF Protection

```typescript
import { addCSRFHeader, getCSRFToken } from '@/utils/csrf';

// ✅ DO: Add CSRF token to all state-changing requests
const response = await fetch('/api/booking', {
  method: 'POST',
  headers: addCSRFHeader({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }),
  body: JSON.stringify(data),
});

// For forms
<input type="hidden" name="csrf_token" value={getCSRFToken()} />
```

### 3. Input Sanitization

```typescript
import { sanitizeHtml, sanitizeString } from '@/utils/sanitization';

// ✅ DO: Sanitize user input before display
const safeMessage = sanitizeHtml(userMessage);
<div dangerouslySetInnerHTML={{ __html: safeMessage }} />

// ✅ DO: Sanitize before logging
logger.info('User action', { message: sanitizeString(userInput) });
```

### 4. Session Management

```typescript
import { sessionManager } from '@/utils/sessionManager';

// Start session on login
const metadata = sessionManager.startSession(userId);

// Check if session is valid
if (!sessionManager.isSessionValid()) {
  // Redirect to login
}

// Update activity on user interaction
sessionManager.updateLastActivity();

// End session on logout
sessionManager.endSession();
```

---

## 🔄 Resilience Features

### 1. Circuit Breaker

```typescript
import { circuitBreakers } from '@/utils/circuitBreaker';

// Get or create a circuit breaker
const breaker = circuitBreakers.get('payment-api', {
  failureThreshold: 5,
  timeout: 60000,
});

// Use it to protect API calls
try {
  const result = await breaker.execute(async () => {
    return await paymentAPI.charge(amount);
  });
  console.log('Payment successful:', result);
} catch (error) {
  if (error.message.includes('Circuit breaker')) {
    // Service is down, show user-friendly message
    showError('Payment service temporarily unavailable');
  } else {
    // Handle other errors
    showError('Payment failed');
  }
}

// Check circuit breaker status
const stats = breaker.getStats();
console.log('Circuit state:', stats.state);
```

### 2. Retry Logic

```typescript
import { withRetry, RetryPresets } from '@/utils/retry';

// ✅ DO: Use retry for network operations
const userData = await withRetry(
  () => fetchUserProfile(userId),
  RetryPresets.STANDARD
);

// ✅ DO: Use custom retry config
const bookingData = await withRetry(
  () => createBooking(data),
  {
    maxAttempts: 5,
    initialDelayMs: 1000,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}:`, error);
    },
  }
);

// ✅ DO: Use with timeout
const result = await withRetryAndTimeout(
  () => longRunningOperation(),
  30000, // 30 second timeout
  RetryPresets.PATIENT
);
```

### 3. Error Boundaries

```typescript
import { ErrorBoundary, RouteErrorBoundary } from '@/components/system/ErrorBoundary';

// ✅ DO: Wrap routes with error boundaries
function App() {
  return (
    <RouteErrorBoundary>
      <Routes>
        <Route path="/app" element={<Dashboard />} />
      </Routes>
    </RouteErrorBoundary>
  );
}

// ✅ DO: Wrap risky components
function PaymentForm() {
  return (
    <ErrorBoundary
      fallback={<div>Payment form unavailable</div>}
      onError={(error, info) => {
        logger.error('Payment form error', { error, info });
      }}
    >
      <StripePaymentForm />
    </ErrorBoundary>
  );
}
```

### 4. Health Checks

```typescript
import { performHealthCheck, startHealthMonitoring } from '@/utils/healthCheck';

// One-time health check
const health = await performHealthCheck();
if (health.overall === 'UNHEALTHY') {
  showMaintenanceMode();
}

// Start periodic monitoring (in App.tsx)
useEffect(() => {
  const stopMonitoring = startHealthMonitoring(60000);
  return () => stopMonitoring();
}, []);
```

---

## 📊 Monitoring Features

### 1. Alerting System

```typescript
import { alerting, AlertSeverity } from '@/utils/alerting';

// Subscribe to alerts
useEffect(() => {
  const unsubscribe = alerting.subscribe((alert) => {
    if (alert.severity === AlertSeverity.CRITICAL) {
      showNotification(alert.title, alert.message, 'error');
    }
  });
  return unsubscribe;
}, []);

// Check metrics
alerting.checkMetric({
  metric: 'error_rate',
  value: errorCount / totalRequests,
  timestamp: Date.now(),
});

// Add custom alert rule
alerting.addRule({
  id: 'custom-metric',
  name: 'Custom Metric Alert',
  metric: 'custom_metric',
  condition: (value) => value > threshold,
  severity: AlertSeverity.WARNING,
  message: 'Custom metric exceeded threshold',
  cooldownMs: 5 * 60 * 1000,
});
```

### 2. Logging

```typescript
import { logger } from '@/utils/monitoring';

// ✅ DO: Use structured logging
logger.info('User action', {
  userId: user.id,
  action: 'booking_created',
  bookingId: booking.id,
});

logger.error('Payment failed', {
  userId: user.id,
  amount: payment.amount,
  error: error.message,
});

// ✅ DO: Log important events
logger.info('Session started', { important: true, userId: user.id });
```

---

## 🔐 GDPR Compliance

### 1. Consent Management

```typescript
import { gdpr } from '@/utils/gdpr';

// Record consent
await gdpr.recordConsent({
  userId: user.id,
  consentType: 'marketing',
  granted: true,
  timestamp: Date.now(),
  ipAddress: userIp,
  userAgent: navigator.userAgent,
});

// Check consent
const hasConsent = await gdpr.getConsent(user.id, 'analytics');
if (hasConsent) {
  // Track analytics
}
```

### 2. Data Export

```typescript
// Request data export
const request = await gdpr.requestDataExport(user.id);
console.log('Export requested at:', new Date(request.requestedAt));

// User will receive download link via email
```

### 3. Account Deletion

```typescript
// Request deletion (30-day grace period)
const request = await gdpr.requestDeletion(user.id, 'User requested');
console.log('Deletion scheduled for:', new Date(request.scheduledFor));

// Cancel deletion
await gdpr.cancelDeletion(user.id);
```

---

## 🗄️ Database Best Practices

### 1. Soft Deletes

```typescript
// ✅ DO: Use soft delete
await supabase
  .from('users')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', userId);

// ✅ DO: Filter out soft-deleted records
const { data } = await supabase
  .from('users')
  .select('*')
  .is('deleted_at', null);
```

### 2. Optimistic Locking

```typescript
// ✅ DO: Use version for concurrent updates
const { data: user } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();

const { error } = await supabase
  .from('users')
  .update({ 
    full_name: newName,
    version: user.version + 1 
  })
  .eq('id', userId)
  .eq('version', user.version); // Prevents concurrent updates

if (error) {
  // Version mismatch - reload and retry
}
```

### 3. Audit Logs

```typescript
// Audit logs are automatic! Just query them:
const { data: logs } = await supabase
  .from('audit_logs')
  .select('*')
  .eq('table_name', 'users')
  .eq('record_id', userId)
  .order('timestamp', { ascending: false });

console.log('User history:', logs);
```

---

## ⚡ Performance Tips

### 1. Use Circuit Breakers for External APIs

```typescript
// ✅ DO
const breaker = circuitBreakers.get('maps-api');
const location = await breaker.execute(() => mapsAPI.geocode(address));

// ❌ DON'T: Call external APIs directly
const location = await mapsAPI.geocode(address); // No protection!
```

### 2. Combine Retry with Circuit Breaker

```typescript
const breaker = circuitBreakers.get('payment-api');

const result = await withRetry(
  () => breaker.execute(() => paymentAPI.charge(amount)),
  RetryPresets.QUICK
);
```

### 3. Use Secure Storage Sparingly

```typescript
// ✅ DO: Only for sensitive data
await secureStorage.setItem('payment_token', token);

// ❌ DON'T: For non-sensitive data (encryption overhead)
await secureStorage.setItem('theme_preference', 'dark'); // Use regular localStorage
```

---

## 🧪 Testing

### 1. Test with Circuit Breaker

```typescript
import { CircuitBreaker, CircuitState } from '@/utils/circuitBreaker';

test('should handle circuit breaker open state', async () => {
  const breaker = new CircuitBreaker('test', { failureThreshold: 1 });
  
  // Force open
  try {
    await breaker.execute(async () => { throw new Error('Failed'); });
  } catch {}
  
  expect(breaker.getState()).toBe(CircuitState.OPEN);
});
```

### 2. Test with Retry

```typescript
import { withRetry } from '@/utils/retry';

test('should retry on failure', async () => {
  const fn = vi.fn()
    .mockRejectedValueOnce(new Error('Failed'))
    .mockResolvedValue('success');
  
  const result = await withRetry(fn, { maxAttempts: 2, initialDelayMs: 10 });
  
  expect(result).toBe('success');
  expect(fn).toHaveBeenCalledTimes(2);
});
```

---

## 🚨 Common Pitfalls

### ❌ DON'T: Store sensitive data unencrypted
```typescript
// BAD
localStorage.setItem('credit_card', cardNumber);

// GOOD
await secureStorage.setItem('payment_method', encryptedData);
```

### ❌ DON'T: Forget CSRF tokens
```typescript
// BAD
fetch('/api/booking', { method: 'POST', body: data });

// GOOD
fetch('/api/booking', {
  method: 'POST',
  headers: addCSRFHeader(),
  body: data,
});
```

### ❌ DON'T: Ignore circuit breaker state
```typescript
// BAD
try {
  await breaker.execute(apiCall);
} catch (error) {
  // Retry immediately - might overwhelm service
  await apiCall();
}

// GOOD
try {
  await breaker.execute(apiCall);
} catch (error) {
  if (error.message.includes('Circuit breaker')) {
    showMaintenanceMessage();
  } else {
    await withRetry(apiCall);
  }
}
```

---

## 📚 Additional Resources

- [Complete Enhancement Report](./COMPLETE_ENHANCEMENT_REPORT.md)
- [Architecture Documentation](./docs/architecture.md)
- [Security Policy](./SECURITY.md)
- [API Contract](./docs/api-contract.md)

---

## 🆘 Need Help?

1. Check the [Complete Enhancement Report](./COMPLETE_ENHANCEMENT_REPORT.md)
2. Review test files in `tests/unit/utils/`
3. Check implementation in `src/utils/`
4. Contact the engineering team

---

**Remember:** Security and resilience are not optional - they're requirements! 🔒🛡️
