# Wasel 10/10 Production Readiness Gate

This document is the release evidence map for the eight gates required before Wasel can be called a 10/10 production application. Each gate names the repo evidence, the command to run, and the production proof that must be attached to a release.

## 1. green CI

**Definition:** every merge candidate must pass type checking, linting, unit/service tests, build, browser E2E, security scan, and production-readiness evidence checks.

**Repo evidence**
- Root scripts include `type-check`, `lint`, `test`, `build`, `test:e2e`, `verify`, and `readiness:10`.
- `@testing-library/dom` is declared so React Testing Library suites can resolve their peer dependency.
- CI workflows live in `.github/workflows/ci.yml`, `.github/workflows/security.yml`, and `.github/workflows/secret-scan.yml`.

**Commands**
```bash
npm run type-check
npm run lint
npm run test
npm run build
npm run readiness:10
npm run test:e2e
```

**Release proof required:** CI URL, commit SHA, and artifact bundle for test/build reports.

## 2. tested real payments

**Definition:** real provider flows must be exercised in test/sandbox mode with signed webhooks, idempotency, ledger updates, and reconciliation evidence.

**Repo evidence**
- Stripe payment intents and checkout sessions are created through `supabase/functions/stripe-payments-v2/index.ts`.
- Webhooks require `STRIPE_WEBHOOK_SECRET` and verify signatures using Stripe's webhook construction API.
- Payment creation supports Stripe idempotency keys.
- Successful payment events publish `payments.captured` into the durable outbox.
- CliQ/JOPACC payment configuration and webhook secrets are read by the Supabase edge runtime.

**Commands**
```bash
npm run test -- src/services/__tests__/paymentService.test.ts
supabase functions serve stripe-payments-v2 --env-file .env.production.sandbox
stripe trigger payment_intent.succeeded
```

**Release proof required:** Stripe/CliQ sandbox event IDs, webhook delivery IDs, internal payment row IDs, outbox event IDs, and reconciliation report.

## 3. real matching under concurrency

**Definition:** matching must use spatial compatibility and atomic reservation so concurrent workers cannot assign the same supply twice.

**Repo evidence**
- `supabase/functions/matching-worker/index.ts` invokes `match_alert_atomic` in parallel with `Promise.allSettled`.
- `supabase/migrations/20260711000000_atomic_spatial_matching.sql` uses PostGIS `ST_DWithin`, advisory transaction locks, `FOR UPDATE`, and `FOR UPDATE SKIP LOCKED`.
- The worker returns matched, skipped-locked, and error counts for operational evidence.

**Commands**
```bash
npm run test -- tests/unit/production-readiness-contract.test.ts
supabase db push
node scripts/load-smoke-node.mjs --scenario matching-concurrency
```

**Release proof required:** concurrency run showing zero duplicate trip/driver assignments, p95 matching latency, lock-skip count, and DLQ count.

## 4. monitored production workers

**Definition:** every worker must expose success/failure metrics, latency SLOs, retries, circuit-breaker state, and DLQ persistence.

**Repo evidence**
- `src/platform/worker-framework.ts` records SLO latency/success, circuit-breaker failures, retries, and dead letters.
- `src/platform/production-workers.ts` registers matching, package, payment, notification, and ops workers.
- `api/health.ts` reports broker and service health.
- `docs/observability.md` and `docs/reliability-slos.md` define dashboard and SLO expectations.

**Commands**
```bash
npm run readiness:10
node scripts/local-worker-runtime.mjs --once
node scripts/validate-slo-compliance.mjs
```

**Release proof required:** dashboard screenshot/link, alert policy IDs, sample trace IDs, DLQ count, and worker p95 latency.

## 5. validated RLS/security

**Definition:** every sensitive table must have RLS enabled, policies must be tested for least privilege, secrets must not be committed, and auth/provider configuration must be checked before release.

**Repo evidence**
- RLS migrations harden core tables under `supabase/migrations`.
- `scripts/audit-rls-policies.sql` identifies vulnerable tables and missing policies.
- `tests/integration/security.test.ts` and `tests/integration/security-features.test.ts` cover security behavior.
- Secret scanning and security workflows exist under `.github/workflows`.

**Commands**
```bash
psql "$SUPABASE_DB_URL" -f scripts/audit-rls-policies.sql
npm run test -- tests/integration/security.test.ts tests/integration/security-features.test.ts
node scripts/validate-no-secrets.mjs
node scripts/validate-production-auth-providers.mjs
```

**Release proof required:** RLS audit output with zero vulnerable sensitive tables, secret-scan report, and auth provider validation output.

## 6. mobile release confidence

**Definition:** mobile must pass type/lint/unit/export checks and device-specific smoke tests for auth, maps/location, push, payments, offline sync, and RTL.

**Repo evidence**
- Mobile scripts include `type-check`, `lint`, `test`, `test:e2e`, and `build`.
- Mobile includes Stripe, Firebase analytics/crashlytics/messaging, Sentry, maps, secure storage, haptics, notifications, offline, and Detox.

**Commands**
```bash
cd mobile
npm run type-check
npm run lint
npm run test
npm run build
npm run test:e2e
```

**Release proof required:** Android/iOS build IDs, device matrix, push token test, payment-sheet sandbox test, location permission test, and Arabic RTL screenshots.

## 7. incident response readiness

**Definition:** responders must know how to triage, mitigate, communicate, and recover from critical failures.

**Repo evidence**
- `docs/PRODUCTION_RUNBOOK.md`, `docs/COMMUNICATIONS_DELIVERY_RUNBOOK.md`, `docs/CREDENTIAL_ROTATION_GUIDE.md`, and `docs/PRODUCTION_CUTOVER_CHECKLIST.md` define operational procedures.
- DLQ, health, SLO, and worker metrics provide escalation signals.

**Commands**
```bash
node scripts/verify-live-health.mjs
node scripts/verify-production-deployment.mjs
node scripts/validate-slo-compliance.mjs
```

**Release proof required:** on-call owner, escalation policy, latest incident drill date, rollback drill result, and credential rotation drill result.

## 8. load/scaling evidence

**Definition:** release candidates must have measured capacity for core read/write/API paths and worker queues.

**Repo evidence**
- `tests/load/k6-smoke.js` and `tests/load/k6-production.js` provide load scripts.
- `scripts/run-load-tests.sh` wraps load execution.
- `docs/scaling-and-tradeoffs.md` records scaling assumptions and migration triggers.

**Commands**
```bash
bash scripts/run-load-tests.sh smoke
bash scripts/run-load-tests.sh production
node scripts/validate-topology.mjs
```

**Release proof required:** k6 summary, p95/p99 latency, error rate, max queue depth, database CPU/IO, and scale-up decision notes.

## Release decision

A release is 10/10-ready only when every gate has:

1. a passing automated command;
2. a production or sandbox artifact;
3. an owner;
4. a rollback/mitigation path;
5. a link in the release record.
