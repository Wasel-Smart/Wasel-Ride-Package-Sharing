# Changelog

All notable changes to Wasel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Refactored
- `OfferRidePage` split into a pure render shell (~394 lines) and `useOfferRideController` hook (350 lines) — all state, side-effects, trust gate evaluation, route intelligence, and submission logic are now independently testable
- Added `useOfferRideController.test.ts` unit tests covering step validation boundary conditions and Arabic error message format
- Added `aria-label` to all icon-only buttons in `OfferRidePage` (step progress bar now carries `role="progressbar"` with `aria-valuenow`)

### Added
- E2E specs: `offer-ride.spec.ts`, `bus-booking.spec.ts`, `package-flow.spec.ts`, `driver-onboarding.spec.ts`, `trust-center.spec.ts`, `payment-methods.spec.ts`, `schedule.spec.ts`, `support.spec.ts` — 10 spec files total (was 4)
- W3C traceparent distributed tracing helpers (`resolveTraceContext`, `buildDownstreamTraceHeaders`) in edge `_shared/pure-helpers.ts`; exported through `_handlers/shared.ts` barrel
- `CREDENTIAL_ROTATION_REQUIRED.md` — operator checklist with provider links for all exposed credentials

### Fixed
- `SchedulePage.persist()` is now Supabase-first (throws on failure instead of silently falling through to localStorage); errors surface via a live `role="alert"` banner
- `AdminDashboardPage` now verifies JWT `app_metadata.role` claim (server-issued) in addition to the profile role field — cannot be spoofed via DevTools or stale cache
- Removed duplicate `src/services/tokens.ts` (conflicting hex values; canonical source is `src/utils/wasel-ds.ts`)
- Removed `--warn-only` from `verify:ci` observability gate — missing `VITE_SENTRY_DSN` or `VITE_APP_INSIGHTS_CONNECTION_STRING` now blocks production deploys
- Iraq market code clarified as infrastructure-only (future feature flag) — not dead code, not accidentally active

### Security
- Stripe and CliQ webhooks now answer 400 (not a retryable 500) when a correctly signed body is not a JSON object; covered by new Deno tests
- `/communications/admin/apply-migrations` and `/moderation/admin/apply-migrations` return 410 unless `ALLOW_RUNTIME_MIGRATIONS=true`; schema changes ship through `supabase db push`


### Changed
- Documentation now states the coverage gate CI actually enforces (20/25/30/28 ratchet) separately from the 75/80/85/85 target
- `REVIEW_REPORT.md` no longer self-grades 9/10
- `SettlementLedger` now rejects negative or non-finite amounts, a COD fee above the cash collected, and a ride commission above the fare (previously the merchant share was silently clamped and escrow was left overdrawn); added `verifyEscrowSettled`

### Added
- Incremental release automation
- Semantic versioning workflow
- Automated changelog generation

## [1.0.0] - 2025-05-01

### Added

**Platform architecture**
- Canonical domain lifecycle models for rides, packages, and driver availability
- Typed domain event system with full envelope schema (`DomainEventEnvelope`) and 14 event types
- In-memory `DomainEventBus` with per-type subscribe, subscribeAll, and 200-event history
- Explicit service topology in `src/platform/service-topology.ts` with SLO targets per service
- Typed queue contracts for all 9 core topics with retry policies and DLQ suffixes
- Standard API response envelopes with request tracing support
- RBAC primitives with role→permission mapping for `admin`, `driver`, `user`, and `operator`
- Geo-stream throttling primitive for real-time location update management
- Structured observability layer (`src/platform/observability.ts`)

**Security**
- Environment-aware Content Security Policy directives
- Client-side rate limiting with automatic TTL cleanup
- Password strength scoring with feedback (0–4 scale)
- 2FA scaffolding: setup, verify, and disable flows
- Input sanitisation utilities and strict URL/email/phone validators
- Hardened nginx headers (HSTS, X-Frame-Options, COOP, CORP, Permissions-Policy)

**Features**
- Ride request and booking flow (find and offer ride surfaces)
- Package delivery lifecycle with escrow and tracking
- Bus corridor discovery
- Raje3 (return trip) feature
- Wallet and payment orchestration (Stripe + local wallet)
- Trust and moderation workflows
- Driver availability and onboarding
- In-app and push notifications
- Safety surface
- Operator-facing mobility surfaces (Mobility OS)
- Wasel Plus subscription tier
- User preferences, profile, and verification

**Internationalisation**
- Arabic and English language support
- Per-user language preference stored and respected
- Bilingual profile fields (`full_name_ar`, `bio_ar`)

**Infrastructure and quality**
- Vite 6 + React 19 + TypeScript 5 + Supabase stack
- Vitest unit test suite with coverage
- Playwright end-to-end browser verification
- k6 load smoke tests
- OpenAPI contract validation scripts
- Infra validation scripts for topology and environment
- Dockerised SPA deployment with nginx
- Kubernetes and observability deployment scaffolding in `infra/`
- GitHub CI workflow and dedicated security workflow
- Sentry integration for runtime error capture
- Vercel Analytics and Speed Insights

**Documentation**
- Architecture overview (`docs/architecture.md`)
- API contract (`docs/api-contract.md`)
- Reliability SLOs (`docs/reliability-slos.md`)
- Workers and queues topology (`docs/workers-and-queues.md`)
- Observability guide (`docs/observability.md`)
- Security and identity model (`docs/security-and-identity.md`)
- OAuth setup guide and checklist
- Implementation status (`docs/implementation-status.md`)
- Contributing guide, Code of Conduct, Security policy

[Unreleased]: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/releases/tag/v1.0.0
