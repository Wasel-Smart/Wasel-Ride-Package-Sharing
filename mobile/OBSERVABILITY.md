# Wasel Mobile — Observability Guide

## Overview

The Wasel mobile client uses Sentry as the primary observability backend. As of August 2026, the mobile app has been upgraded with advanced tracing primitives that mirror the web client's structured observability posture.

## Instrumentation Layers

### 1. Crash Reporting

- **Sentry React Native SDK** captures unhandled exceptions and native crashes
- **Firebase Crashlytics** provides secondary crash reporting for native stack traces
- **MobileErrorBoundary** wraps the root component, generating unique `err_<timestamp>_<random>` IDs
- Error IDs are tagged in Sentry scope and surfaced in the UI with a support mail-to flow

### 2. Performance Tracing

The `performance.tsx` service exposes the following tracing primitives:

- `initPerformanceMonitoring()` — Initialize Sentry with full tracing, screen tracking, and cold-start instrumentation
- `startTransaction(name, op, attributes?)` — Create a Sentry transaction with optional attributes
- `withPerformanceTracking(Component, screenName)` — HOC that tracks screen render time
- `recordColdStart()` — Records cold-start duration as a Sentry gauge metric
- `recordNavigation(from, to)` — Breadcrumb + transaction for every navigation event
- `recordOfflineAction(actionType)` — Breadcrumb for queued offline actions
- `recordSyncResult(actionType, success)` — Breadcrumb for sync success/failure
- `recordApiCall(endpoint, method, status, durationMs)` — Breadcrumb + transaction for API calls

### 3. Breadcrumbs

Breadcrumbs capture user activity and system events:

- Navigation events
- Offline queue actions and sync results
- API calls with method, endpoint, status, and duration
- Screen loads
- User interactions (via custom instrumentation in components)

### 4. Session Tracking

- Automatic session tracking is enabled (`enableAutoSessionTracking: true`)
- Session tracking interval: 30 seconds
- Sessions are tagged with release version and build number

### 5. Metrics

Sentry metrics capture:

- `app.cold_start_ms` — Cold-start duration on each app launch
- Screen load times via `startTransaction`
- API call durations via `recordApiCall`

## Setup

### Environment Variables

```env
EXPO_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_APP_BUILD_NUMBER=1
```

### Initialization

Call `initPerformanceMonitoring()` once at app startup, before rendering any screens:

```tsx
import { initPerformanceMonitoring } from './src/services/performance';

initPerformanceMonitoring();
```

### Instrumenting Screens

Wrap screens with the `withPerformanceTracking` HOC:

```tsx
import { withPerformanceTracking } from '../services/performance';

export default withPerformanceTracking(HomeScreen, 'Home');
```

### Instrumenting Navigation

Record navigation events in your navigator:

```tsx
import { recordNavigation } from '../services/performance';

// On screen focus
recordNavigation('App', 'Home', 'RideRequest');
```

## Sentry Dashboard Queries

### Cold-Start Trend

```
average(app.cold_start_ms) over last 30 days
```

### Crash-Free Sessions

```
crash_free_session_rate(session) over last 30 days
```

### Slowest API Calls

```
average(api.duration_ms) over last 7 days
  where endpoint = '/v1/rides'
```

### Offline Sync Reliability

```
count(offline.sync_success = true) / count(offline.sync) over last 30 days
```

## Future Enhancements

- OpenTelemetry bridge for vendor-neutral tracing
- Custom performance marks for React Native re-render detection
- Network inspector integration for offline-debug flows
- Distributed trace correlation with web client and edge functions
