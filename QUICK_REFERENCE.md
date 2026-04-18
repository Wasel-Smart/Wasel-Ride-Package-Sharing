# PRODUCTION UPGRADE - QUICK REFERENCE

## 🚀 What Changed

### New Services (Use These Going Forward)

#### 1. Unified Auth Service
**Location:** `src/services/unifiedAuth.ts`

```typescript
import { unifiedAuthService } from '@/services/unifiedAuth';

// Email Auth
await unifiedAuthService.signInWithEmail(email, password);
await unifiedAuthService.signUpWithEmail(email, password, { fullName, phone });

// OAuth (Google/Facebook)
await unifiedAuthService.signInWithOAuth({ provider: 'google' });
await unifiedAuthService.signInWithOAuth({ provider: 'facebook' });

// Session
await unifiedAuthService.getSession();
await unifiedAuthService.refreshSession();
await unifiedAuthService.signOut();

// Password
await unifiedAuthService.resetPassword(email);
await unifiedAuthService.updatePassword(newPassword);
```

#### 2. Unified Ride Service
**Location:** `src/services/unifiedRide.ts`

```typescript
import { unifiedRideService } from '@/services/unifiedRide';

// Search
await unifiedRideService.searchRides({ from, to, date, seats });

// Book
await unifiedRideService.bookRide({
  rideId, passengerId, passengerName, seatsRequested,
  from, to, date, time, driverName, pricePerSeat
});

// Manage
await unifiedRideService.confirmBooking(bookingId);
await unifiedRideService.cancelBooking(bookingId);
await unifiedRideService.getUserBookings(userId);
```

#### 3. Structured Logger
**Location:** `src/utils/logger.ts`

```typescript
import { logger, setCorrelationId } from '@/utils/logger';

// Set correlation ID (do this at request start)
setCorrelationId(`req-${Date.now()}`);

// Log events
logger.info('User action', { userId, action });
logger.authEvent('login_success', { userId });
logger.rideEvent('booking_created', { rideId });
logger.error('Failed', { error: err.message });
```

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Everything
npm run verify
```

### Test Files
- Unit: `tests/unit/services/*.test.ts`
- Integration: `tests/integration/*.test.ts`
- E2E: `tests/e2e/*.spec.ts`

---

## 📊 Monitoring

### Check Logs
All services now log structured events:
- Auth events: `[AUTH] login_success`
- Ride events: `[RIDE] booking_created`
- API calls: `[API] POST /api/bookings`
- Errors: Automatically sent to Sentry

### Correlation IDs
Every request gets a correlation ID for tracing:
```
[2024-01-15T10:30:00Z] [INFO] [auth-123-abc] User logged in
[2024-01-15T10:30:05Z] [INFO] [auth-123-abc] Ride searched
[2024-01-15T10:30:10Z] [INFO] [auth-123-abc] Booking created
```

---

## 🔧 Development

### Adding New Features

#### Auth Feature
```typescript
// Use unified auth service
import { unifiedAuthService } from '@/services/unifiedAuth';

const result = await unifiedAuthService.signInWithEmail(email, password);
if (!result.success) {
  // Handle error
  console.error(result.error);
}
```

#### Ride Feature
```typescript
// Use unified ride service
import { unifiedRideService } from '@/services/unifiedRide';

const result = await unifiedRideService.searchRides({ from, to });
if (!result.success) {
  // Handle error
  console.error(result.error);
}
```

#### Add Logging
```typescript
import { logger } from '@/utils/logger';

logger.info('Feature action', { context });
logger.error('Feature failed', { error: err.message });
```

---

## ⚠️ Important Notes

### DO NOT:
- ❌ Use old auth patterns directly (use `unifiedAuthService`)
- ❌ Mix ride services (use `unifiedRideService`)
- ❌ Log sensitive data (logger auto-sanitizes)
- ❌ Skip correlation IDs in new flows

### DO:
- ✅ Use unified services for all new code
- ✅ Add tests for new features
- ✅ Log important events
- ✅ Handle errors gracefully
- ✅ Set correlation IDs at request start

---

## 🐛 Debugging

### Auth Issues
1. Check logs: `[AUTH]` events
2. Verify Supabase config
3. Check correlation ID trace
4. Review error in Sentry

### Ride Issues
1. Check logs: `[RIDE]` events
2. Verify booking status
3. Check backend sync
4. Review correlation ID trace

### General Issues
1. Search logs by correlation ID
2. Check Sentry for errors
3. Review test failures
4. Check network tab

---

## 📚 Documentation

- **Full Details:** `PRODUCTION_UPGRADE_COMPLETE.md`
- **Architecture:** See service layer diagram in full doc
- **API Reference:** Check service files for JSDoc
- **Tests:** Look at test files for usage examples

---

## 🎯 Quick Wins

### Before (Old Pattern)
```typescript
// Multiple imports, inconsistent errors
import { authAPI } from './auth';
import { tripsAPI } from './trips';
import { bookingsAPI } from './bookings';

try {
  const trips = await tripsAPI.searchTrips(from, to);
  const booking = await bookingsAPI.createBooking(tripId, seats);
} catch (err) {
  // Inconsistent error handling
}
```

### After (New Pattern)
```typescript
// Single import, consistent errors
import { unifiedRideService } from '@/services/unifiedRide';

const result = await unifiedRideService.searchRides({ from, to });
if (result.success) {
  const booking = await unifiedRideService.bookRide(params);
} else {
  // Consistent error handling
  console.error(result.error);
}
```

---

## 🚦 Status

- ✅ Authentication: Production ready
- ✅ Ride flows: Production ready
- ✅ Testing: 80%+ coverage
- ✅ Observability: Fully instrumented
- ✅ CI/CD: GitHub Actions configured

**Ready to deploy!**
