# Changelog

All notable changes to Wasel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- Vite 6 + React 18 + TypeScript 5 + Supabase stack
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
