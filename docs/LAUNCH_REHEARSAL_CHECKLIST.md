# Launch Rehearsal Checklist

Use this checklist for the final rehearsal before production cutover.

## Environment

- Production-like Supabase project is linked and reachable.
- Required provider secrets are configured in Vercel, Kubernetes, and local deploy shell.
- `kubectl` context points to the intended cluster.
- Docker registry login is active for `WASEL_REGISTRY`.
- Monitoring endpoints and alert routing are enabled.

## Database

```bash
npx supabase migration list
npm run verify:supabase-rollout
```

- Confirm pending migrations are expected.
- Apply migrations only after backup confirmation.
- Run `supabase/migrations/verify_database.sql` after migration.

## Build Gates

```bash
npm run verify:contracts
npm run type-check
npm run test:unit
npm run build
```

## Services

```bash
npm run k8s:deploy
kubectl rollout status deployment/ride-matching-service -n wasel-production
kubectl rollout status deployment/payment-reconciliation-service -n wasel-production
kubectl rollout status deployment/ops-analytics-service -n wasel-production
```

## Mobile

```bash
npm run mobile:build:android
npm run mobile:build:ios
```

## Rehearsal Exit

- Web build artifact produced.
- Backend services roll out cleanly.
- Android and iOS release artifacts are generated.
- Smoke and load tests meet SLO thresholds.
- Rollback owner and communications owner are assigned.
