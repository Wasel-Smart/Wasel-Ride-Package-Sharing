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
