# Launch Rehearsal Checklist

## Before Rehearsal

1. Confirm `npm run verify:supabase-rollout` passes.
2. Confirm the rollout migration catalog matches the filesystem and README.
3. Confirm seed files are present, transactional, and idempotent.
4. Confirm environment flags that unlock fake flows remain disabled in the rehearsal target.

## Rehearsal Steps

1. Apply rollout migrations in canonical order.
2. Apply operational seeds.
3. Run smoke-check seeds in the rehearsal environment only.
4. Verify auth signup creates canonical users and wallet records.
5. Verify booking, payment, communication, and safety writes fail loudly when backend persistence fails.
6. Verify feature-flag and KV reads return current values without client-side mutation access.

## Exit Criteria

1. No migration, seed, or smoke-check step fails.
2. RLS policies prevent cross-user reads and writes.
3. Wallet, booking, and subscription state changes are traceable in the database.
4. Operational dashboards and runbooks are updated with any observed gaps.
