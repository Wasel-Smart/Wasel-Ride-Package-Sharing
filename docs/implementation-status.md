# Implementation Status

This document is the honest, up-to-date record of what is live, what is contractually defined but pending backend infrastructure, and what is on the roadmap. It exists so contributors and reviewers can assess the platform's current state without confusion.

---

## Live in production

These capabilities are fully implemented and running in the current deployment.

### Web client
- React 18 + TypeScript 5 + Vite 6 SPA, deployed on Vercel
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

### Async runtime
- Pluggable event broker: `SupabaseEventBroker` (Postgres outbox + Realtime + polling fallback) is the default when Supabase is configured; `InMemoryEventBroker` is the fallback when Supabase is unavailable
- Durable outbox table `event_outbox` with status tracking (`pending` → `processed` / `failed`)
- Dead-letter table `dead_letter_messages` for worker failures
- Five production workers with retry, circuit breaker, and DLQ: matching, package, payment, notification, ops
- `async-runtime.ts` starts broker + worker pool on app bootstrap
- Domain events flow from services → in-memory bus → durable broker → workers

### Edge runtime
- Supabase Edge Function serving as the API gateway for authenticated operations
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

These capabilities were previously listed as "pending backend infrastructure" but are now fully operational:

| Capability | Implementation |
|---|---|
| Ride matching service | `matching-worker` consumes `rides.requested` from broker; assigns driver via Supabase |
| Driver matching worker | `src/platform/production-workers.ts` matching-worker with circuit breaker + retry |
| Package delivery service | `package-worker` consumes `packages.created` and `packages.location-updated` |
| Package tracking worker | `package-worker` writes tracking events to `package_events` table |
| Payment service | Stripe webhook publishes `PaymentCaptured` to outbox; `payment-worker` settles transactions |
| Payment reconciliation worker | `payment-worker` updates `transactions` status to `posted` on capture |
| Notification service | `dispatchNotification()` publishes `notifications.dispatch` to broker; `notification-worker` delivers via Twilio/push |
| Event broker | `SupabaseEventBroker` with Postgres outbox, Realtime, and polling fallback |
| Ops/analytics worker | `ops-worker` consumes `rides.completed` and `payments.captured`; writes to `ops_aggregates` |

---

## Remaining gaps

| Gap | Severity | Plan |
|-----|----------|------|
| Redis GEO not deployed | Low | PostGIS with GiST indexes is adequate for current Jordan-market volume; switch when query latency exceeds 500ms |
| Kafka/Redis Streams not deployed | Low | `SupabaseEventBroker` is the production transport; `EventBroker` interface is abstracted for future swap |
| Payment reconciliation worker | Low | Currently handled by `payment-worker`; separate worker can be extracted if volume grows |

---

## Deployment

The web app is deployed on Vercel. Supabase edge functions handle server-side logic (payments, CliQ, communications, event-broker-proxy). Docker Compose is used for local development only.

---

## Roadmap (not yet started)

- Redis GEO migration when PostGIS latency exceeds 500ms
- Kafka/Redis Streams replacement for `SupabaseEventBroker` at scale
- Separate payment reconciliation worker if transaction volume grows

---

## Versioning

This document should be updated whenever a capability moves from one column to another. The target review cadence is every release.
