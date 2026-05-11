# Circuit Breaker Recovery Guide

## Overview

The Wasel platform uses circuit breakers to prevent cascading failures when backend services are temporarily unavailable. If you encounter a "Circuit breaker api-calls is OPEN" error, this guide will help you recover.

## What is a Circuit Breaker?

A circuit breaker is a design pattern that prevents your application from repeatedly trying to execute an operation that's likely to fail. When too many failures occur, the circuit breaker "opens" and fails fast instead of waiting for timeouts.

## Circuit Breaker States

- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures detected, requests fail immediately
- **HALF_OPEN**: Testing if the service has recovered

## Automatic Recovery

The circuit breaker will automatically attempt to recover:

1. **After 10 seconds**: The circuit breaker transitions from OPEN to HALF_OPEN
2. **On network recovery**: When your internet connection is restored
3. **On successful request**: After 1 successful request in HALF_OPEN state, it closes

## Manual Recovery Options

### Option 1: Browser Console (Recommended)

Open your browser's developer console and run:

```javascript
// Reset the API circuit breaker
window.__waselDebug.resetApiCircuitBreaker()

// Check circuit breaker status
window.__waselDebug.getApiCircuitBreakerState()

// View all circuit breakers
window.__waselDebug.getAllCircuitBreakers()

// Reset all circuit breakers
window.__waselDebug.resetAllCircuitBreakers()
```

### Option 2: Refresh the Page

Simply refresh your browser. The circuit breaker state is not persisted across page loads.

### Option 3: Wait for Auto-Recovery

The circuit breaker will automatically attempt recovery after 10 seconds.

## Configuration Changes (v1.1.0)

The following improvements have been made to prevent circuit breaker issues:

- **Reduced timeout**: 30s → 10s (faster recovery)
- **Lower success threshold**: 2 → 1 (easier to close)
- **Shorter monitoring period**: 2min → 1min
- **Auto-reset on network recovery**: Circuit breaker resets when internet connection is restored
- **Immediate reset on success**: Successful responses immediately reset the breaker

## Preventing Circuit Breaker Issues

1. **Check your internet connection**: Most circuit breaker issues are caused by network problems
2. **Verify backend health**: Ensure the Supabase backend is accessible
3. **Monitor the console**: Look for repeated API failures that might trigger the circuit breaker
4. **Use fallback mode**: The app automatically falls back to direct Supabase queries when edge functions are unavailable

## Debugging

To check the current circuit breaker state:

```javascript
const state = window.__waselDebug.getApiCircuitBreakerState()
console.log('Circuit Breaker State:', state)
```

Expected output:
```javascript
{
  failures: 0,
  successes: 0,
  lastFailureTime: 0,
  lastSuccessTime: 1234567890,
  state: 'CLOSED' // or 'OPEN' or 'HALF_OPEN'
}
```

## Support

If circuit breaker issues persist after trying these recovery options:

1. Check the browser console for underlying errors
2. Verify your network connection
3. Ensure the Supabase backend is configured correctly
4. Review the [Health Check documentation](./observability.md)

## Technical Details

- Circuit breaker implementation: `src/utils/circuitBreaker.ts`
- API integration: `src/services/core.ts`
- Configuration: `DEFAULT_CONFIG` in `circuitBreaker.ts`
