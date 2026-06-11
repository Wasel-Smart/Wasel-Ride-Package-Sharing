# Changelog

All notable changes to Wasel will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Incremental release automation (`scripts/release.mjs`)
- Semantic versioning workflow with patch / minor / major targets
- Automated changelog generation on release

### Security
- Hardened `.gitignore` to block all `.env.*` variants, certificates, and AI-tool artefacts
- Added `*.crt`, `*.cer`, `*.pfx`, `*.p12` to ignored patterns
- Added Vercel OIDC token files to ignored patterns

---

## [2.0.0] - 2026-06-11

### Added
- Mobile app baseline (`mobile/`) with React Native scaffold and service layer
  (auth, location, and ride services implemented; UI screens in progress)
- Real-time tracking via Supabase Realtime channels
- Docker Compose files for development and production environments
- Kubernetes deployment manifests under `infra/kubernetes/` with dev / staging / prod overlays
- k6 load smoke tests (`tests/load/`)
- OpenAPI contract validation scripts (`scripts/validate-openapi.mjs`)
- Infra and topology validation scripts
- Redis Streams event broker (`src/platform/event-broker-redis.ts`)
- Worker framework (`src/platform/worker-framework.ts`)
- HPA and observability configs (Prometheus / Grafana) under `infra/`
- Backend service skeletons for ride matching, payment reconciliation, and ops analytics
- `WorldClassAuthPage` — streamlined phone and email authentication surface
- Session timeout warning and cookie consent banner components
- OAuth setup guide and checklist (`docs/oauth-setup-guide.md`)
- Wiring quick reference card and detailed architecture documentation
- `HONEST_AUDIT_REPORT.md` — transparent gap analysis by Amazon Q Developer (8.5 / 10)

### Changed
- Auth and home experience refreshed
- Landing brand lockup fixed on mobile viewports
- Vite vendor chunking adjusted for better cache granularity
- Wallet runtime hardened with proper backend fallback behaviour
- Production deployment posture tightened (fail-closed fallbacks)
- GitHub security workflow configuration corrected
- Phone number handling fixed across auth flows
- Mobile viewport and scroll locking resolved
- Provider webhook Supabase bearer token fixed
- Required edge auth header handling corrected
- Vercel static site deployment configuration fixed

### Removed
- Nested `Wasel-Ride-Package-Sharing/` sub-repository removed from working tree
- Generated deployment artefacts removed from version control
- Revoked Supabase public key removed from auth configuration

---

## [1.0.0] - 2025-05-01

### Added

**Platform architecture**
- Canonical domain lifecycle models for rides, packages, and driver availability
- Typed domain event system with full envelope schema (`DomainEventEnvelope`) and 14 event types
- In-memory `DomainEventBus` with per-type subscribe, subscribeAll, and 200-event history
- Explicit service topology (`src/platform/service-topology.ts`) with SLO targets per service
- Typed queue contracts for all 9 core topics with retry policies and DLQ suffixes
- Standard API response envelopes with request tracing support
- RBAC primitives with role → permission mapping for `admin`, `driver`, `user`, and `operator`
- Geo-stream throttling primitive for real-time location update management
- Structured observability layer (`src/platform/observability.ts`)

**Security**
- Environment-aware Content Security Policy directives
- Client-side rate limiting with automatic TTL cleanup
- Password strength scoring with feedback (0–4 scale)
- 2FA scaffolding: setup, verify, and disable flows
- Input sanitisation utilities and strict URL / email / phone validators
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

---

[Unreleased]: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/releases/tag/v1.0.0
