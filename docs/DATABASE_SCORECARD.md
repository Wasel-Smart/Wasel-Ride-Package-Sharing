Database Scorecard — Wasel

Status: UNVERIFIED — do not trust the score below without a real review

A previous version of this file claimed a 9.2/10 score with no supporting evidence
(no query plans, no load test results, no migration dry-run output attached). That
number has been removed.

What's actually checkable right now, from the filesystem alone:

- 62 migration files exist under `supabase/migrations/` with PostGIS-related SQL —
  presence and volume confirmed, correctness and index effectiveness not confirmed.
- No evidence in this repo of an actual `EXPLAIN ANALYZE` run, load test against the
  schema, or backup/restore drill having been performed.

Previously-claimed score (NOT verified — kept here only for traceability):

```
Score: 9.2/10

Why It Reaches 9+

- Strong integrity constraints for trips and packages
- Transaction reference checks and single-default payment enforcement
- Operational indexes for auditability and performance

Remaining Gap To Watch

- Monitor map/index maintenance for very large datasets
- Review replication and backup RTO/RPO under load
- Validate any third-party extensions for long-term performance
```

To re-score this file honestly, run against a real (non-production) database and paste
output:

```
supabase db reset
supabase db lint
-- EXPLAIN ANALYZE on the hot-path queries (ride matching, package lookup)
```

Last edited: August 2026 — score removed pending real verification.
