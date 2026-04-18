# KV Store Implementation Guide

## Overview

Production-grade key-value store for dynamic app configuration and feature flag management. Enables real-time behavior changes without redeployment.

## Architecture

### Database Schema

**Table: `kv_store_0b1f4071`**
- `key` (TEXT, PRIMARY KEY): Namespaced key with strict format
- `value` (JSONB): Flexible JSON value storage
- `metadata` (JSONB): Environment, owner, tags, description
- `expires_at` (TIMESTAMPTZ): Optional TTL support
- `created_at`, `updated_at` (TIMESTAMPTZ): Audit timestamps
- `updated_by` (UUID): User who made the change

**Table: `kv_store_audit_log`**
- Complete audit trail for all changes
- Tracks INSERT, UPDATE, DELETE operations
- Stores old and new values

### Key Naming Convention

**Strict Format:** `{namespace}:{identifier}`

**Allowed Namespaces:**
- `app_config:*` - Application configuration
- `feature_flag:*` - Feature flags

**Examples:**
- ✅ `app_config:global`
- ✅ `app_config:global_production`
- ✅ `feature_flag:bus_service`
- ✅ `feature_flag:wallet_v2`
- ❌ `config:test` (invalid namespace)
- ❌ `feature_flag:Test-Feature` (uppercase/special chars)

## Usage

### 1. App Configuration

#### Frontend Usage

```typescript
import { useAppConfig } from '@/hooks/useKVStore';

function MyComponent() {
  const { data: config, isLoading } = useAppConfig('global', 'production');
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      <p>Rate Limit: {config?.api_rate_limit}</p>
      <p>Languages: {config?.supported_languages.join(', ')}</p>
    </div>
  );
}
```

#### Service Layer Usage

```typescript
import { getAppConfig, setAppConfig } from '@/services/kvStore';

// Get configuration
const config = await getAppConfig('global', 'production');

// Set configuration (admin only)
await setAppConfig('global', {
  maintenance_mode: false,
  api_rate_limit: 100,
  max_upload_size_mb: 10,
  supported_languages: ['en', 'ar'],
  default_currency: 'JOD',
  support_whatsapp: '+962791234567',
  min_app_version: '1.0.0',
  force_update_version: '1.0.0',
}, {
  environment: 'production',
  description: 'Global app configuration',
  owner: 'platform_team',
});
```

### 2. Feature Flags

#### Simple On/Off Flag

```typescript
import { useFeatureFlag } from '@/hooks/useKVStore';

function BusServiceButton() {
  const { data: isEnabled } = useFeatureFlag('bus_service');
  
  if (!isEnabled) return null;
  
  return <button>Book Bus</button>;
}
```

#### Convenience Hooks

```typescript
import { useBusServiceEnabled, useWalletV2Enabled } from '@/hooks/useKVStore';

function Dashboard() {
  const { data: busEnabled } = useBusServiceEnabled();
  const { data: walletV2Enabled } = useWalletV2Enabled();
  
  return (
    <div>
      {busEnabled && <BusServiceWidget />}
      {walletV2Enabled ? <WalletV2 /> : <WalletV1 />}
    </div>
  );
}
```

#### Gradual Rollout (Percentage-based)

```typescript
// Set feature flag with 25% rollout
await setFeatureFlag('wallet_v2', {
  enabled: true,
  rollout: {
    type: 'percentage',
    percentage: 25, // 25% of users
  },
  metadata: {
    description: 'New wallet interface',
    owner: 'payments_team',
  },
});

// Frontend automatically handles rollout
const { data: isEnabled } = useFeatureFlag('wallet_v2');
// Returns true for 25% of users (deterministic based on user ID)
```

#### User List Rollout

```typescript
// Enable for specific users
await setFeatureFlag('premium_features', {
  enabled: true,
  rollout: {
    type: 'user_list',
    user_ids: ['user-123', 'user-456', 'user-789'],
  },
});
```

#### Toggle Feature Flag (Admin)

```typescript
import { useToggleFeatureFlag } from '@/hooks/useKVStore';

function AdminPanel() {
  const toggleFlag = useToggleFeatureFlag();
  
  const handleToggle = () => {
    toggleFlag.mutate({
      featureName: 'bus_service',
      enabled: false,
    });
  };
  
  return <button onClick={handleToggle}>Disable Bus Service</button>;
}
```

### 3. Direct Database Access (SQL)

```sql
-- Get value
SELECT * FROM get_kv_value('feature_flag:bus_service');

-- Set value with TTL (1 hour)
SELECT set_kv_value(
  'app_config:temp_config',
  '{"test": true}'::jsonb,
  3600,
  '{"environment": "staging"}'::jsonb
);

-- Cleanup expired entries
SELECT cleanup_expired_kv_entries();
```

## Security & Permissions

### Row Level Security (RLS)

**Read Access:**
- ✅ All users (authenticated + anonymous)
- ✅ Only non-expired entries
- ✅ Public read for app config and feature flags

**Write Access:**
- ✅ Service role only
- ✅ Admin users (via service role)
- ❌ Regular users cannot write

### Audit Trail

All changes are automatically logged:
- Who made the change
- When it was made
- Old and new values
- Operation type (INSERT/UPDATE/DELETE)

```typescript
import { getKVAuditLog } from '@/services/kvStore';

// Get audit history for a key
const history = await getKVAuditLog('feature_flag:wallet_v2', 50);
```

## Environment-Aware Configuration

### Separate Configs per Environment

```typescript
// Production
await setAppConfig('global', productionConfig, {
  environment: 'production',
});

// Staging
await setAppConfig('global_staging', stagingConfig, {
  environment: 'staging',
});

// Development
await setAppConfig('global_development', devConfig, {
  environment: 'development',
});
```

### Runtime Environment Detection

```typescript
import { getEnv } from '@/utils/env';

const env = getEnv('VITE_APP_ENV') as Environment;
const configKey = env === 'production' ? 'global' : `global_${env}`;
const config = await getAppConfig(configKey, env);
```

## TTL Support

### Set Expiring Values

```typescript
// Expire after 1 hour (3600 seconds)
await setKVValue({
  key: 'app_config:temp_maintenance',
  value: { maintenance_mode: true },
  ttl_seconds: 3600,
});

// Expire after 24 hours
await setKVValue({
  key: 'feature_flag:limited_promo',
  value: { enabled: true },
  ttl_seconds: 86400,
});
```

### Automatic Cleanup

Run periodic cleanup (e.g., via cron job):

```typescript
import { cleanupExpiredEntries } from '@/services/kvStore';

// Returns number of deleted entries
const deletedCount = await cleanupExpiredEntries();
console.log(`Cleaned up ${deletedCount} expired entries`);
```

## Best Practices

### 1. Key Naming
- Use lowercase with underscores
- Be descriptive but concise
- Group related configs with prefixes

### 2. Metadata
Always include:
- `environment`: Which environment this applies to
- `description`: What this config/flag controls
- `owner`: Team or person responsible
- `tags`: For categorization and search

### 3. Feature Flag Rollout Strategy
1. Start with 0% (disabled)
2. Enable for internal team (user_list)
3. Gradual rollout: 5% → 25% → 50% → 100%
4. Monitor metrics at each stage
5. Full rollout or rollback based on data

### 4. Caching
- App configs: 5-10 minute cache
- Feature flags: 2-5 minute cache
- Use React Query for automatic caching

### 5. Error Handling
```typescript
const { data, error, isLoading } = useFeatureFlag('new_feature');

if (error) {
  // Fail open or closed based on criticality
  return <DefaultExperience />;
}

if (isLoading) {
  return <LoadingState />;
}

return data ? <NewFeature /> : <OldFeature />;
```

## Migration & Deployment

### 1. Apply Migration

```bash
# Run migration
supabase db push

# Or via SQL
psql -f src/supabase/migrations/20260324005540_kv_store.sql
```

### 2. Seed Initial Data

```bash
# Run seed file
psql -f src/supabase/seeds/kv_store.seed.sql
```

### 3. Verify Setup

```sql
-- Check tables exist
SELECT tablename FROM pg_tables WHERE tablename LIKE 'kv_store%';

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'kv_store_0b1f4071';

-- Check seed data
SELECT key, metadata->>'environment' as env FROM kv_store_0b1f4071;
```

## Monitoring & Observability

### Key Metrics to Track

1. **Read Performance**
   - Query latency
   - Cache hit rate
   - Failed reads

2. **Write Operations**
   - Update frequency
   - Failed writes
   - Audit log growth

3. **Feature Flag Usage**
   - Evaluation count per flag
   - Rollout percentage distribution
   - Toggle frequency

### Alerts

Set up alerts for:
- High read latency (> 100ms)
- Failed writes
- Expired entries not cleaned up
- Audit log size growth

## Troubleshooting

### Issue: Feature flag not updating in real-time

**Solution:** Check cache TTL and invalidate queries:
```typescript
queryClient.invalidateQueries({ queryKey: ['kv-store', 'feature-flag'] });
```

### Issue: Permission denied on write

**Solution:** Ensure using service role or admin credentials:
```typescript
// Use service role client for admin operations
import { supabaseAdmin } from '@/services/supabaseAdmin';
```

### Issue: Key format validation error

**Solution:** Verify key matches pattern:
```typescript
import { isValidKVKey } from '@/types/kv-store.types';

if (!isValidKVKey(key)) {
  console.error('Invalid key format:', key);
}
```

## Future Enhancements

- [ ] User attribute-based rollout
- [ ] A/B testing integration
- [ ] Admin UI for flag management
- [ ] Real-time updates via Supabase Realtime
- [ ] Flag dependency management
- [ ] Scheduled flag changes
- [ ] Multi-region replication
- [ ] Flag analytics dashboard

## Support

For questions or issues:
- Check audit log for change history
- Review metadata for ownership
- Contact team specified in `owner` field
