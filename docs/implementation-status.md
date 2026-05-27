# Implementation Status

This document is the honest, up-to-date record of what is live, what is contractually defined but pending backend infrastructure, and what is on the roadmap. It exists so contributors and reviewers can assess the platform's current state without confusion.

---

## Live in production

These capabilities are fully implemented and running in the current deployment.

### Web client
- React 19 + TypeScript 5 + Vite 6 SPA, deployed on Vercel
- Ride request and booking flow (find ride, offer ride, Raje3 return trips)
- Package delivery request and tracking UI
- Bus corridor discovery
- User profiles, verification flows, and preferences
- Wallet UI and payment surface (Stripe + local wallet)
- Trust and moderation workflows
- Driver onboarding and availability UI
- In-app and push notification surfaces
- Safety surface
- Operator-facing Mobility OS surface
- Wasel Plus subscription tier
- Arabic and English internationalisation

### Mobile client foundation
- React Native / Expo app shell with authenticated navigation
- Home, auth, find ride, offer ride, ride detail, chat, trips, wallet, notifications, profile, and support screens
- Shared hooks for auth, rides, bookings, wallet, profile, realtime updates, push notifications, location, biometric checks, and network status
- Production app-store release still depends on the configuration checklist in `mobile/MOBILE_CONFIGURATION.md`

### Identity and auth
- Supabase Auth: email/password, Google OAuth, Facebook OAuth
- RBAC: role-based permission checks on all sensitive operations
- 2FA: setup and verify flows wired to the backend 2FA endpoint

### Database
- Postgres via Supabase with PostGIS and pg_trgm extensions
- Full schema for profiles, vehicles, trips, bookings, packages, payments, ratings, messages, notifications, verifications, and wallet transactions
- Row-level security policies
- Supabase migrations workflow with seed data

### Edge runtime
- Supabase Edge Function serving as the API gateway for authenticated operations
- Communications worker: email (Resend/SendGrid), SMS and WhatsApp (Twilio), push notifications

### Observability
- Sentry for runtime error capture
- Structured client-side logging via `src/platform/observability.ts`
- Vercel Analytics and Speed Insights

---

## Contractually defined — pending backend infrastructure

These capabilities have complete, typed contracts in the repository (domain models, queue topics, service definitions, SLO targets) but are not yet backed by independent running services. The current deployment uses the Supabase edge function and direct Supabase queries to approximate them.

| Capability | Contract location | Current approximation |
|---|---|---|
| Ride matching service | `src/domain/rides/lifecycle.ts`, `service-topology.ts` | Direct Supabase query |
| Driver matching worker | `src/platform/queue-contracts.ts` | Synchronous fallback |
| Package delivery service | `src/domain/packages/lifecycle.ts` | Direct Supabase query |
| Package tracking worker | `queue-contracts.ts` | Polling fallback |
| Payment service | `src/domain/events.ts` (PaymentAuthorized, PaymentCaptured) | Stripe + Supabase direct |
| Payment reconciliation worker | `queue-contracts.ts` | Not yet implemented |
| Notification service | `service-topology.ts` | Edge function handles dispatch |
| Event broker (Kafka/Redis Streams) | `docs/workers-and-queues.md` | In-memory event bus |
| Redis GEO for geo queries | `service-topology.ts` (dataStores) | PostGIS queries |
| Ops/analytics worker | `queue-contracts.ts` | Not yet implemented |

The in-memory `DomainEventBus` in `src/platform/event-bus.ts` is a deliberate design target, not a permanent solution. It is designed so that replacing it with a real broker requires only swapping the publish/subscribe calls in `src/services/`.

---

## Kubernetes and infra scaffolding

Deployment manifests and environment overlays for `dev`, `staging`, and `prod` live in `infra/kubernetes/`. These are scaffolding intended to grow into the full worker deployment topology. They are not currently applied to a live Kubernetes cluster.

---

## Roadmap

- Real-time driver location on map (requires backend geo-stream service)
- In-app chat between riders and drivers
- Corridor demand analytics dashboard (requires ops worker)
- Automated settlement and payout reporting (requires payment worker)
- Native mobile app-store release for iOS and Android

---

## Versioning

This document should be updated whenever a capability moves from one column to another. The target review cadence is every release.
