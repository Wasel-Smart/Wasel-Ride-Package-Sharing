# Wasel Production Deployment and Recovery Guide

**Current release decision: NOT READY for production schema rollout.**

This document is intentionally conservative. The live Supabase project has been confirmed as `ztsuuvetsiufqzeabfbr` (project name: `Wasel14.online`). A read-only inspection on 2026-11-19 found only the legacy `public.kv_store_0b1f4071` table and one migration (`20260714021551_create_kv_table_0b1f4071`). The deployed `make-server-0b1f4071` function is not evidence that the canonical Wasel application schema or booking/payment flows are deployed.

**Do not run migrations, deploy Edge Functions, change secrets, or run seed scripts against the live project as part of initial recovery.** First establish a separate staging project and validate the complete migration rollout there.

## 1. Non-negotiable safety rules

- Never paste database passwords, service-role keys, Stripe secrets, webhook secrets, or other credentials into Git, issues, pull requests, logs, or chat.
- Never use a production service-role key in local development, CI, or staging.
- Never manually apply selected historical SQL files with `psql`. The repository migration set and its canonical runner are the source of truth.
- Never assume a successful Edge Function deployment means its database dependencies exist.
- Do not disable or replace the currently deployed Edge Function until frontend routing, authentication, traffic, and rollback have been reviewed.
- Do not mark a release ready because a Vercel status context is green; verify the actual production deployment, domain, and smoke tests.
- Database migrations must be additive where possible, reviewed, backed up, and have a documented recovery plan. Do not assume SQL migrations can be rolled back automatically.

## 2. Environment inventory

| Environment | Supabase project ref | Allowed use |
| --- | --- | --- |
| Production | `ztsuuvetsiufqzeabfbr` | Read-only inspection until staging validation and explicit release approval |
| Staging | Create a separate project and record its ref in the deployment record | Migration execution, integration tests, webhook tests, and release-candidate validation |
| Local | Local Supabase CLI stack | Fresh database bootstrap and repeatable automated tests |

The staging project must be separate from production, use the same major Postgres version, enable the required extensions, and use non-production provider credentials. Do not use a second project that contains unknown user data as a disposable staging target.

## 3. Local clean-database validation

Run from the repository root using the Node version pinned by the project:

```bash
npm ci
npx supabase start
npx supabase db reset
npm run verify:supabase-rollout
npm run type-check
npm run lint:strict
npm test
npm run test:coverage
npm run build
```

A successful static rollout-manifest check is not a substitute for executing every migration against a clean PostgreSQL database. Record the CLI version, Postgres version, migration count, command exit codes, and test artifacts.

If `supabase db reset` fails, stop and fix the migration ordering, SQL, extension, role, policy, or seed issue. Do not skip the failing migration or continue against production.

## 4. Staging migration validation

1. Create and verify a dedicated staging Supabase project.
2. Confirm its project ref, region, Postgres major version, extensions, Auth settings, Storage buckets, and Edge Function configuration.
3. Review the full ordered migration inventory and compare it with the repository migration ledger.
4. Take a staging backup before applying the release candidate.
5. Link the local CLI to staging only after checking the project ref in the Supabase dashboard.
6. Apply the complete repository migration set using the repository's documented migration workflow. Do not cherry-pick SQL files or use old hard-coded filenames.
7. Verify migration history, table definitions, indexes, foreign keys, triggers, grants, RLS policies, and function security settings.
8. Re-run the migration workflow to verify its documented repeatability behavior. If the runner is not safely repeatable or cannot recover from a partial run, fix the runner before production rollout.
9. Execute integration and concurrency tests for signup/OTP, driver authorization, booking capacity, cancellation, payment intents, webhook replay, wallet PIN/step-up, package lifecycle, escrow, and refunds.
10. Verify cross-user and cross-tenant isolation with real authenticated test users.

Do not connect production until the staging evidence is reviewed and all release gates pass.

## 5. Production preflight (read-only until approved)

Before any production write, two people should independently verify:

- The target project ref is exactly `ztsuuvetsiufqzeabfbr`.
- A current restorable database backup exists and the restore procedure has been tested.
- The production migration plan contains only reviewed changes and identifies lock duration, data impact, compatibility, and recovery steps.
- The exact release commit and CI run are recorded.
- Frontend and Edge Function versions are compatible with the schema before and after the migration.
- Required secrets are present in the correct Supabase project without exposing their values.
- Auth redirect URLs, OAuth providers, email/SMS providers, webhook endpoints, Storage policies, CORS origins, and rate limits are verified.
- A rollback or forward-fix decision tree is approved. Do not promise that reverting an application deployment reverses a database migration.
- A maintenance window and owner for monitoring are assigned.

The current production database inspection does **not** satisfy the schema preflight. Do not proceed until the discrepancy between the live legacy KV-only schema and the repository's canonical application schema is understood and a staged migration has passed.

## 6. Edge Function release

Deploy functions only after their required schema, grants, RLS policies, and secrets have been validated in staging.

- Review each function's authentication model. Keep JWT verification enabled for user-facing functions unless the function performs its own verified authentication.
- Webhooks must verify provider signatures and reject replayed or stale events.
- Never trust client-supplied prices, roles, payment state, escrow state, trip ownership, or delivery evidence.
- Use an explicit allowlist of production web origins for browser-facing CORS. Do not use `Access-Control-Allow-Origin: *` for authenticated application APIs.
- Verify function-to-database compatibility and run authenticated smoke tests after deployment.
- Keep a copy of the previous function source and its configuration for recovery.

The currently deployed `make-server-0b1f4071` function must not be replaced blindly. First map every frontend caller and confirm whether production traffic depends on it.

## 7. Frontend and Vercel release

- Confirm the Vercel project is the one serving the Wasel production domain.
- Confirm `www.wasel14.online` is the canonical domain and the apex domain redirects as intended.
- Confirm production environment variables are configured in Vercel without copying secret values into this document.
- Ensure the frontend points to the confirmed production Supabase URL and uses only publishable client credentials.
- Build the exact release commit in CI. Require type checks, lint, unit tests, coverage, production build, security checks, database bootstrap, and relevant E2E suites.
- Deploy through the protected production workflow after all required checks pass. Do not use an unreviewed local `vercel --prod` command as a workaround for blocked CI.
- Verify the deployment URL, domain routing, TLS, cache behavior, service worker update, and browser console after deployment.

## 8. Post-deployment smoke tests

Use dedicated test accounts and non-production payment instruments where applicable. Verify:

- Signup, login, logout, password recovery, OAuth callback, and phone verification.
- User profile reads and updates under RLS.
- Driver eligibility and trip creation.
- Search, booking, seat allocation, cancellation, and concurrent booking behavior.
- Payment intent creation, signed webhook success/failure, duplicate webhook replay, refunds, and ledger consistency.
- Package creation, matching, pickup, delivery evidence, and escrow transitions across separate devices.
- Notifications, Arabic RTL, accessibility, and mobile layouts.
- Monitoring, alert delivery, database health, and error rates.

Do not create fake transactions or mark a smoke test passed without retaining the test result.

## 9. Recovery

For an application-only regression, redeploy the last known-good application release after confirming schema compatibility.

For a database issue:
1. Stop further writes if data integrity may be affected.
2. Preserve logs, migration output, and the exact release commit.
3. Assess whether a reviewed forward fix is safer than restoring a backup.
4. Restore only using the tested recovery procedure and an explicitly approved target.
5. Reconcile payments and external provider events before reopening affected flows.
6. Verify critical invariants and user-facing flows before resuming traffic.

Never run an invented `rollback.sql` or assume a previous migration can safely be reversed.

## 10. Release status

**Current status: NOT READY.**

The live project is confirmed, but its database does not currently expose the canonical Wasel application schema. A staging environment, clean database bootstrap, migration recovery design, end-to-end booking/payment/package validation, production secret verification, and deployment-domain verification remain required.

Do not change this status until the corresponding evidence is recorded in [`PRODUCTION_READINESS.md`](../PRODUCTION_READINESS.md) and all P0 acceptance criteria are verified.
