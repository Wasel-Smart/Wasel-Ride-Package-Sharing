# Security Policy

## Supported branch

Security fixes should target `master`.

## Reporting a vulnerability

Do not open public issues for security problems.

Use a private GitHub security advisory for this repository:

- [Report a vulnerability](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/security/advisories/new)

Include:

1. A clear description of the vulnerability.
2. Reproduction steps or proof of concept.
3. Affected routes, services, or environment assumptions.
4. Recommended mitigations if you have them.

## Secrets handling

- Client-side code must never depend on service-role or provider secret keys.
- Production fallbacks should fail closed unless an explicitly controlled drill requires otherwise.
- New integrations must document required environment variables in `.env.example` and `README.md`.

## Authentication expectations

- Production auth should support refresh-token rotation and backend verification of sensitive mutations.
- Role-based access checks should exist at the gateway and service boundary, not only in the UI.

## Transport and abuse controls

- External APIs should be versioned under `/v1/`.
- Public-facing routes should be protected by gateway-level rate limiting.
- Write-heavy real-time endpoints, especially location updates, should be throttled and audited.

## Observability and incident response

- Security-relevant failures should emit structured logs with request and trace identifiers.
- Critical auth, payment, and trust flows should be visible in monitoring dashboards and alerting.
