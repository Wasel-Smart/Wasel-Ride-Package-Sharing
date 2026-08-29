# Implementation Status

This document is the honest, up-to-date record of what is live, what is contractually defined but pending backend infrastructure, and what is on the roadmap.

---

## Live in production

These capabilities are fully implemented and running in the current deployment.

### Web client

- React 19 + TypeScript 5 + Vite 6 SPA, deployed on Vercel
- Ride request and booking flow (find ride, offer ride, Raje3 return trips)
- Package delivery request and tracking UI
- Bus corridor discovery
- User profiles, verification flows, and preferences
- Wallet UI and payment surface (Stripe + CliQ + local wallet)
- Trust and moderation workflows
- Driver onboarding and availability UI
- In-app and push notification surfaces
- Safety surface
- Operator-facing Mobility OS surface
- Wasel Plus subscription tier
- Arabic and English internationalisation

### Identity and auth

- Supabase Auth: email/password, Google OAuth, Facebook OAuth
- RBAC: role-based permission checks on all sensitive operations
- 2FA: setup and verify flows wired to the backend 2FA endpoint

### Database

- Postgres via Supabase with PostGIS and pg_trgm extensions
- Full schema for profiles, vehicles, trips, bookings, packages, payments, ratings, messages, notifications, verifications, and wallet transactions
- Row-level security policies
- Supabase migrations workflow with seed data
- Durable outbox (`event_outbox`) and dead-letter (`dead_letter_messages`) tables for async workers
- `ops_aggregates` table for operational analytics

### Server-side async runtime

- Domain events flow from services → in-memory bus → durable broker → Supabase Edge Function handlers
- Server-side processing in Edge Function:
  - Driver matching during booking creation (`POST /v1/bookings`)
  - Package assignment during package creation (`POST /v1/packages`)
  - Payment reconciliation via Stripe webhooks
  - Notification delivery via Twilio/Resend/SendGrid
- In-process event broker for same-tab real-time UI updates
- Dead-letter table `dead_letter_messages` for worker failures

### Edge runtime

- Supabase Edge Function serving as the API gateway for authenticated operations
- Versioned `/v1/` API with standard response envelopes
- Communications worker: email (Resend/SendGrid), SMS and WhatsApp (Twilio), push notifications
- Stripe webhook publishes `PaymentCaptured` events to the outbox for the payment-worker
- `event-broker-proxy` edge function for durable publish/poll/ack/fail operations

### Observability

- Sentry for runtime error capture
- Structured client-side logging via `src/platform/observability.ts`
- Vercel Analytics and Speed Insights
- `/api/health.ts` reports broker outbox depth, DLQ count, and service configuration

---

## Contractually defined — fully implemented

| Capability | Implementation |
| --- | --- |
| Ride matching service | Edge function assigns driver server-side during `POST /v1/bookings` |
| Package delivery service | Edge function assigns package to trip server-side during `POST /v1/packages` |
| Package tracking worker | `package-worker` writes tracking events to `package_events` table (legacy in-browser worker retained for backward compat) |
| Payment reconciliation worker | Edge function handles Stripe webhooks and updates `transactions` status |
| Notification service | `dispatchNotification()` publishes `notifications.dispatch` to broker; edge function delivers via Twilio/push |
| Event broker | `SupabaseEventBroker` with Postgres outbox, Realtime, and polling fallback |
| Ops/analytics worker | Edge function and growth engine update `ops_aggregates` |

---

## Roadmap (not yet started)

| Gap | Severity | Plan |
|-----|----------|------|
| Redis GEO not deployed | Low | PostGIS with GiST indexes is adequate for current Jordan-market volume; switch when query latency exceeds 500ms. Local dev addon now available: `docker-compose.redis.yml` + `infra/redis/redis.conf` |
| Kafka/Redis Streams not deployed | Low | `SupabaseEventBroker` is the production transport; `EventBroker` interface is abstracted for future swap. No config or scaffolding exists yet for either |
| Separate worker services | Low | Current architecture uses synchronous edge function processing. Draft (unreviewed, not deployed) k8s manifests for notification/ops/payment/ride-matching workers now live in `infra/k8s-draft/` — needs a security/resource-limits review before anything is applied to a cluster |
| Mobile app React version sync | Medium | Update mobile app from React 18 to React 19 to match web client. Not done in this pass — this is a dependency bump that needs a real test run (`yarn install && yarn test`) before merging, which this session cannot execute against your machine |

## Correction (this pass)

A prior pass's `mobile/HONEST_AUDIT_REPORT.md` claimed 9/10 "Excellent" test coverage.
On inspection, the Detox specs in `mobile/e2e/` asserted against testIDs and screens
that did not exist anywhere in `mobile/src` (`login-button`, `packages-tab`,
`new-package-button`, a nonexistent `package-form-screen`, `seats-selector`, a
nonexistent `phone-auth-screen` reachable from sign-in, `quick-link-trips`, and more).
These specs could not have passed against a real build. They've been rewritten to
match the actual components, and two dead-end navigation buttons on `SignInScreen`
(sign-up and forgot-password links with empty `onPress`) were fixed as a result of
writing a real test against them. `mobile/30_DAY_PRODUCTION_REPORT.md` also reports
specific DAU/crash-rate figures for a wallet feature and general usage that this pass
could not verify against any real telemetry source in the repo — treat those numbers
as unverified until confirmed against actual Sentry/analytics dashboards, not as
launch-ready facts.

---

## Deployment

The web app is deployed on Vercel. Supabase edge functions handle server-side logic (payments, CliQ, communications, event-broker-proxy). Docker Compose is used for local development only.

---

## Versioning

This document should be updated whenever a capability moves from one column to another. The target review cadence is every release.
