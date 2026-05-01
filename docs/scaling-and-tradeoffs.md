# Scaling And Tradeoffs

This document explains why the current architecture is shaped the way it is, what tradeoffs are intentional, and what changes are expected as Wasel grows from early traction into regional scale.

## Current posture

The repo is still a single codebase, but its runtime contracts now separate:

- identity and access
- ride matching
- package delivery
- payments
- operations and trust
- observability

That split matters because a mobility platform fails at scale when business logic is trapped in controllers or scattered across pages.

## Why event-driven

Rides and logistics are not fully synchronous problems.

The following work should not block user-facing HTTP responses:

- driver matching
- push and SMS notifications
- fraud and trust checks
- analytics rollups
- payment settlement and reconciliation

The repository now models these as domain events even where some downstream workers are still represented as architecture contracts rather than in-repo services.

## Scaling assumptions

### 10k monthly active users

- Supabase + edge contract can support early growth.
- Browser fallback behavior should remain disabled in production except for drills.
- One region is enough if observability is strong.

### 100k monthly active users

- Introduce dedicated queue infrastructure.
- Split matching, package, and payment workers.
- Add Redis GEO or PostGIS-backed proximity services.
- Formalize API gateway rate limiting and abuse controls.

### 1M monthly active users

- Separate service ownership by bounded context.
- Move matching into its own autoscaled worker fleet.
- Add regional failover, replayable event streams, and operational runbooks per service.
- Use distributed tracing and SLO-driven incident response.

## Known tradeoffs

### Compatibility over breaking rewrites

The UI still uses some legacy booking status names. The service layer now projects those into canonical lifecycle states so the system can mature without a high-risk UI break.

### Frontend repo, backend contracts

Some platform concerns are represented here as:

- typed domain models
- OpenAPI specs
- docs
- CI and load assets

That is intentional. The server runtime is not fully colocated in this repository, but the engineering contract is now explicit and reviewable.

### Direct Supabase fallback

Fallback paths are helpful for drills and degraded-mode testing, but dangerous as a permanent production pattern. The repo continues to treat them as controlled exceptions, not default behavior.
