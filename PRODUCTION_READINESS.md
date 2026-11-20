# Production Readiness Checklist

**Last updated**: 2026-11-19  
**Status**: NOT READY for public production traffic until all P0 items are closed and verified.

This checklist is the single source of truth. Do not claim "production-ready" or "10/10" until every P0 item is checked and verified on a clean environment.

---

## P0 – Blocking (must be complete before any real user traffic)

### 1. Database schema bootstrap (#242)
- [ ] `recurring_trips` is created **before** any table that references it (currently `trips` has the FK before the table exists).
- [ ] Subquery CHECK constraint `no_self_booking` is removed and replaced with a race-safe trigger or RPC.
- [ ] Full schema + migrations apply cleanly on a **brand-new** empty Supabase/Postgres project (`supabase db reset` or equivalent).
- [ ] CI job exists that spins up a fresh database, applies the schema, and runs basic smoke tests.
- [ ] Rollback / production rollout notes documented.

### 2. Package tracking + escrow (#241)
- [ ] Package records, timeline, and escrow state live in **server-authoritative** Supabase tables (not localStorage).
- [ ] RLS policies enforce sender / driver / recipient / support access.
- [ ] Payment is driven by real provider (Stripe or Jordan gateway) + signed webhooks. Browser never sets `senderPaid` / `heldInEscrow` / `releasedToDriver`.
- [ ] Escrow release is a server-side state transition gated by verified delivery evidence.
- [ ] `isNearDestination` either uses real PostGIS/geocoding or is removed from the happy path.
- [ ] Integration tests cover cross-device persistence, forged status attempts, webhook replay, and isolation.
- [ ] UI copy no longer presents simulated tracking/escrow as live.


**Implementation note:** Database hardening primitives are being added in `docs/PACKAGE_ESCROW_HARDENING.md`. The issue remains open until the provider webhook, trusted delivery verification, RLS/integration tests, and production rollout are verified.

### 3. Canonical production environment (#240)
- [ ] The exact Supabase project used by `wasel14.online` is identified and documented (project ref only, no secrets).
- [ ] Repository ruleset requires pull requests + required CI/security status checks before merge to `master`.
- [ ] Non-production Supabase environment exists for migration validation.
- [ ] Vercel production domain and environment variables are confirmed.

---

## P1 – Required for controlled pilot

- [ ] Real end-to-end ride matching works for at least one corridor with real drivers.
- [ ] Real end-to-end package create → match → pickup → deliver → escrow release works cross-device.
- [ ] Basic observability (Sentry + key success/error rates) is live and reviewed daily during pilot.
- [ ] Support / moderation path exists for disputes and safety reports.

---

## P2 – Scale & world-class posture

- [ ] Matching latency and booking success rate SLOs defined and monitored.
- [ ] Load testing on booking + package critical paths.
- [ ] Gradual extraction of auth / payments / matching only after the monolith is stable under real traffic.
- [ ] Honest public status language (no “10/10 production-ready” until the above is true).

---

## How to use this file

1. Keep this file open while working on #240, #241, #242.
2. Update checkboxes only after verification on a clean environment.
3. Close the corresponding GitHub issue only when the acceptance criteria in the issue **and** the matching checkbox here are both satisfied.
4. Do not merge “10/10” or “Production-ready” language into README until every P0 box is checked.

**Owner**: Wasel-Smart  
**Next action**: Finish schema bootstrap fix + real package tables/RPCs.
