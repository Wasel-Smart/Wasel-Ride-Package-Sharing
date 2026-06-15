# Application Wiring Documentation

## Overview

This document describes the complete wiring architecture between Wasel's frontend and backend services, including connection strategies, fallback mechanisms, and health monitoring.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│                     Port: 5173 (dev)                         │
└────────────┬────────────────────────────────────────────────┘
             │
             ├─── Health Check Monitor (60s interval)
             │
             ├─── Auth Context (Session Management)
             │
             ├─── Edge Function Client
             │    └─── wasel-backend (v1.0.0)
             │         └─── /functions/v1/make-server-0b1f4071
             │
             └─── Supabase Client
                  │
                  ├─── Auth (Port: 54321)
                  ├─── Database (Port: 54322)
                  ├─── Realtime (Port: 4000)
                  └─── Studio (Port: 54323)
```

## Connection Points

### 1. Supabase Client Connection

**Location**: `src/utils/supabase/client.ts`

**Configuration**:
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Public anonymous key
- Auto-configured from environment with fallbacks

**Features**:
- Automatic session refresh
- Auth state synchronization
- Real-time subscriptions
- Connection pooling

### 2. Edge Function Transport

**Location**: `src/services/backendWorkflow.ts`

**Configuration**:
- `VITE_EDGE_FUNCTION_NAME`: Function identifier (default: `make-server-0b1f4071`)
- `VITE_API_URL`: Override for custom API endpoints

**Features**:
- Request/response envelopes
- Automatic retry with exponential backoff
- CSRF protection for state-changing operations
- Request tracing and correlation IDs

### 3. Authentication Flow

**Location**: `src/contexts/AuthContext.tsx`

**Providers**:
- Email/Password (Supabase Auth)
- Google OAuth
- Facebook OAuth

**Callback URL**: `/app/auth/callback`

**Session Management**:
- JWT tokens with 1-hour expiry
- Automatic refresh 5 minutes before expiry
- Secure storage in httpOnly cookies (production)
- localStorage fallback (development)

### 4. Health Monitoring

**Location**: `src/utils/healthCheck.ts`

**Checks**:
- Supabase connection (auth.getSession)
- Edge function availability (GET /health)
- Database connectivity (simple query)

**Frequency**:
- On startup: immediate
- Development: every 60 seconds
- Production: on-demand only

**Status Indicators**:
```typescript
interface HealthCheckResult {
  healthy: boolean;
  services: {
    supabase: boolean;
    edgeFunction: boolean;
    database: boolean;
  };
  timestamp: string;
  errors: string[];
}
```

## Fallback Strategy

### Configuration

**Location**: `src/utils/fallbackStrategy.ts`

**Modes**:
1. `disabled` - Production mode, no fallbacks
2. `reads-only` - Allow direct DB reads, require edge for writes
3. `writes-if-enabled` - Allow writes if explicitly enabled
4. `always` - Full fallback (development only)

### Decision Matrix

| Environment | Edge Available | Operation | Fallback Allowed |
|-------------|----------------|-----------|------------------|
| Production  | Yes            | Any       | No               |
| Production  | No             | Any       | No (fail)        |
| Development | Yes            | Any       | No (use edge)    |
| Development | No             | Read      | Yes              |
| Development | No             | Write     | If enabled       |

### Usage Example

```typescript
import { runBackendWorkflow } from './backendWorkflow';

const profile = await runBackendWorkflow({
  operation: 'Get Profile',
  authMode: 'required',
  fallbackPolicy: 'always',
  edge: (ctx) => requestEdgeJson({ path: `/profile/${ctx.userId}` }),
  fallback: (ctx) => getDirectProfile(ctx.userId),
});
```

## Environment Configuration

### Required Variables

```bash
# Supabase Connection
VITE_SUPABASE_URL=https://zexlxabdcsjefptmjhuq.supabase.co
VITE_SUPABASE_ANON_KEY=<YOUR_SUPABASE_ANON_KEY>
VITE_SUPABASE_PUBLISHABLE_KEY=<YOUR_SUPABASE_PUBLISHABLE_KEY>

# Edge Function
VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071

# Application
VITE_APP_URL=https://wasel14.online
```

### Optional Variables

```bash
# Override edge function base URL
VITE_EDGE_FUNCTIONS_BASE_URL=https://custom-api.example.com

# Override complete API URL
VITE_API_URL=https://api.example.com/v1

# Enable direct Supabase fallback (dev only)
VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=true
```

### Validation

Runtime validation occurs on startup via `validateRuntimeConfiguration()`:

**Error Severity**:
- `error`: Blocks application startup
- `warning`: Logged but allows startup

**Common Issues**:
- Missing Supabase URL or key
- HTTP URL in production (requires HTTPS)
- Project ref mismatch between URL and key
- Direct fallback enabled in production

## Port Configuration

### Development

| Service           | Port  | Protocol |
|-------------------|-------|----------|
| Vite Dev Server   | 5173  | HTTP     |
| Supabase API      | 54321 | HTTP     |
| Postgres          | 54322 | TCP      |
| Supabase Studio   | 54323 | HTTP     |
| Realtime          | 4000  | WS       |

### Production

| Service           | Port  | Protocol |
|-------------------|-------|----------|
| Nginx (Frontend)  | 8080  | HTTP     |
| Supabase API      | 443   | HTTPS    |

## Docker Orchestration

### Development Stack

```bash
docker-compose -f docker-compose.dev.yml up
```

**Includes**:
- PostgreSQL with PostGIS
- Supabase Auth (GoTrue)
- Supabase REST (PostgREST)
- Supabase Realtime
- Supabase Studio
- Wasel Web (hot-reload)

### Production Stack

```bash
docker-compose up --build
```

**Includes**:
- Wasel Web (static build)
- Health checks
- Restart policies

**External Dependencies**:
- Managed Supabase instance
- CDN for static assets

## Troubleshooting

### Connection Issues

**Symptom**: "Backend not configured" error

**Solutions**:
1. Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
2. Check network connectivity to Supabase
3. Run health check: `performHealthCheck(true)`

**Symptom**: Auth callback fails

**Solutions**:
1. Verify callback URL matches: `http://localhost:5173/app/auth/callback`
2. Check Supabase dashboard → Authentication → URL Configuration
3. Ensure port 5173 is not in use

**Symptom**: Edge function timeout

**Solutions**:
1. Check edge function logs in Supabase dashboard
2. Verify function is deployed: `supabase functions list`
3. Enable fallback for development: `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=true`

### Health Check Debugging

```typescript
import { performHealthCheck } from './utils/healthCheck';

// Force fresh health check
const health = await performHealthCheck(true);

console.log('Backend Health:', health);
// {
//   healthy: true,
//   services: { supabase: true, edgeFunction: true, database: true },
//   timestamp: '2024-01-15T10:30:00.000Z',
//   errors: []
// }
```

### Fallback Debugging

```typescript
import { getFallbackConfig, validateFallbackConfig } from './utils/fallbackStrategy';

// Check current fallback configuration
console.log('Fallback Config:', getFallbackConfig());

// Validate configuration
const validation = validateFallbackConfig();
if (!validation.valid) {
  console.warn('Fallback warnings:', validation.warnings);
}
```

## Security Considerations

### Production Requirements

1. **HTTPS Only**: All connections must use HTTPS
2. **No Direct Fallback**: `VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false`
3. **CSRF Protection**: Enabled for all state-changing operations
4. **JWT Validation**: All requests validated server-side
5. **Rate Limiting**: Enforced at edge function level

### Development Relaxations

1. HTTP allowed for localhost
2. Direct Supabase fallback permitted
3. Detailed error messages
4. Health check logging

## Performance Optimization

### Connection Pooling

- Supabase client reuses connections
- Max 10 concurrent requests per client
- Automatic connection recycling

### Caching Strategy

- Health checks cached for 30 seconds
- Session tokens cached until expiry
- Profile data cached in React Query

### Request Optimization

- Automatic retry with exponential backoff
- Request deduplication
- Batch operations where possible

## Monitoring

### Metrics Collected

- Request latency (p50, p95, p99)
- Error rates by endpoint
- Fallback usage frequency
- Health check results

### Integration Points

- Sentry for error tracking
- Custom observability via `src/platform/observability.ts`
- Supabase dashboard for database metrics

## Migration Guide

### From Direct Supabase to Edge Functions

1. Update environment variables:
   ```bash
   VITE_EDGE_FUNCTION_NAME=make-server-0b1f4071
   ```

2. Wrap existing calls:
   ```typescript
   // Before
   const profile = await getDirectProfile(userId);

   // After
   const profile = await runBackendWorkflow({
     operation: 'Get Profile',
     edge: (ctx) => requestEdgeJson({ path: `/profile/${ctx.userId}` }),
     fallback: (ctx) => getDirectProfile(ctx.userId),
   });
   ```

3. Test with fallback disabled:
   ```bash
   VITE_ALLOW_DIRECT_SUPABASE_FALLBACK=false npm run dev
   ```

## References

- [Supabase Client Documentation](https://supabase.com/docs/reference/javascript)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [OAuth Setup Guide](./docs/oauth-setup-guide.md)
- [Security Architecture](./SECURITY_ARCHITECTURE.md)
