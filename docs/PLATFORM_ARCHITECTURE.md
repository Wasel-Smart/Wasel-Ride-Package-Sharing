# Wasel Platform Architecture

## Objective

Wasel now has a domain-driven platform foundation that is structured to evolve from a frontend-heavy application into a service-oriented mobility platform with stronger contracts, observability, resilience, and security controls.

## Bounded Domains

The application is now organized around explicit bounded domains under `src/domains`:

- `auth`
- `mobility`
- `wallet`
- `mapping`
- `analytics`
- `admin`
- `notifications`

Each domain follows the same internal shape:

- `application/`
- `domain/`
- `infrastructure/`
- `presentation/`

## Platform Kernel

Shared platform capabilities now live under `src/platform`:

- `contracts/`: service contract registry and generated OpenAPI source
- `events/`: domain events and event bus primitives
- `observability/`: telemetry bootstrap, spans, metrics hooks
- `security/`: request context, JWT validation, request signing
- `resilience/`: retry, timeout, circuit breaker utilities
- `mapping/`: provider abstraction and response caching
- `localization/`: translation completeness reporting primitives

This separates cross-cutting concerns from feature modules and gives every domain the same architectural entry points.

## Runtime Design

### Domain Services

Each domain exposes an application service that publishes domain events and delegates external concerns to infrastructure gateways. This creates a clean handoff point for future extraction into independent services.

### API-First Contracts

Core service boundaries are registered in `src/platform/contracts/service-contracts.json`. Generated OpenAPI artifacts are written to `docs/openapi/` and checked in CI for drift.

### Observability

The platform now initializes OpenTelemetry alongside Sentry wiring and records:

- request spans
- API latency metrics
- domain-event metrics
- transaction tracing hooks

### Security

The gateway layer now enforces:

- request-scoped headers
- JWT validation in non-test modes
- signed authenticated requests
- circuit-breaker protection on outbound API calls

### Resilience

Platform utilities support:

- bounded timeouts
- retries
- circuit breaking
- map-provider fallbacks

### Localization

Translations are exported through a canonical merged tree so English and Arabic keysets cannot silently diverge. Translation completeness is now CI-gated.

## Mapping Architecture

Mapping behavior now routes through the `mapping` domain and provider abstraction instead of embedding provider logic directly inside UI components. The provider layer now owns:

- tile selection
- route resolution
- points-of-interest fetching
- response caching
- retry and timeout behavior

## Enforcement

The architecture is now guarded by:

- ESLint boundary rules for domain layers
- `scripts/check-domain-boundaries.mjs`
- OpenAPI drift detection
- translation completeness tests

## Current State

This is a strengthened modular monolith with microservice-ready seams, not a fully decomposed distributed system. The platform is now in a materially better position to support later extraction of auth, wallet, trips, notifications, and analytics into independently deployed services.
