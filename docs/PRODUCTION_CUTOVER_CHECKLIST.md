# Production Cutover Checklist

This checklist is for the live production launch window.

## Freeze

- Confirm launch approval from product, engineering, and operations.
- Freeze non-launch merges.
- Confirm rollback target and previous stable deployment.
- Confirm provider dashboards are accessible.

## Secrets

- Vercel production variables are configured.
- Kubernetes `wasel-secrets` values are present.
- Supabase service-role credentials are not exposed to public clients.
- Stripe live keys and webhook signing secrets are configured.
- Sentry DSN and release token are configured.

## Database

```bash
pg_dump "$SUPABASE_DB_URL" --schema-only > prelaunch-schema-backup.sql
npx supabase migration list
npx supabase db push
psql "$SUPABASE_DB_URL" -f supabase/migrations/verify_database.sql
```

## Deploy

```bash
npm run build
vercel deploy --prod
npm run k8s:deploy
```

## Verify

```bash
curl -f https://wasel.jo/health
npm run load:smoke
```

- Sign up/sign in works.
- Ride booking works.
- Package flow works.
- Payment setup and reconciliation work.
- Notifications are delivered or queued with retry.
- Grafana and Sentry show production traffic.

## Rollback

- Roll back Vercel to the previous production deployment.
- Roll back Kubernetes image tags if worker errors breach SLOs.
- Apply the documented database rollback only if the migration is confirmed as the root cause.
