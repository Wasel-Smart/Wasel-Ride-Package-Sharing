# Migration Standards

This migration set is maintained from `scripts/supabase-migration-registry.mjs`.

## Required Rules

1. Use `YYYYMMDDHHMMSS_short_description.sql` for every new rollout migration.
2. Give each migration one primary responsibility:
   - `schema`: durable table, column, type, or index changes
   - `hardening`: constraints, grants, policies, or safety indexes
   - `runtime-contract`: application-facing schema alignment
   - `backfill`: deterministic data movement only
3. Split schema and backfill steps unless the schema would be invalid without the data change.
4. Keep backfills deterministic and restart-safe. Prefer stable keys, explicit predicates, and idempotent updates.
5. Avoid hidden coupling to runtime code. Edge functions and workers may consume the schema, but they do not own DDL.
6. Prefer transactional migrations. If a statement cannot run inside a transaction, isolate it and document why.
7. Do not add time-dependent check constraints, subqueries inside check constraints, or environment-sensitive defaults.
8. Use `if exists` and `if not exists` only when they improve replay safety without masking a real correctness issue.
9. Any destructive change must ship with a reviewed rollback or compensating migration plan.
10. Run `npm run sync:supabase-migration-docs` and `npm run verify:supabase-rollout` before merge.

## Review Checklist

- The file is registered in `scripts/supabase-migration-registry.mjs`.
- The description is specific enough for future maintainers to understand the purpose without opening the SQL first.
- The migration order is explicit and does not rely on another pending file sharing the same timestamp.
- Data moves are deterministic, bounded, and safe to retry.
- New indexes match a concrete application access path.
- Privileged objects declare a safe `search_path` and least-privilege grants where relevant.

## Historical Exceptions

Several older migrations predate these standards and remain frozen for auditability:

- Some historical files use pre-canonical date-only names.
- Some older snapshot migrations combine broad schema setup with reference data.

Those files are tracked in the registry as `phase: historical` and `naming: legacy`. New work must not copy those patterns.


## Rollout Runner and Recovery

The canonical runner is `scripts/apply-supabase-rollout.mjs`. It executes all rollout migrations through one `psql` session and holds a PostgreSQL session-level advisory lock for the migration sequence.

- Every migration is recorded in `wasel_migration_meta.migration_ledger` with its SHA-256 checksum, status, start time, executor, and completion time.
- An `applied` migration with an unchanged checksum is skipped.
- A changed checksum or a previous `started` record stops the rollout. Never delete or rewrite a ledger row to force a retry.
- A `started` record means the migration may have partially changed the database. Inspect the database and migration effects, then prepare a reviewed forward-repair or compensating migration before resuming.
- On the first ledgered rollout, the operator must verify that none of the registered rollout migrations has already been applied outside this ledger and explicitly pass `--confirm-no-prior-rollout-migrations`. This flag is an operator assertion, not an automatic database-history detector.
- Seeds and smoke checks are separate from migration history. They are not protected by the migration ledger and must be reviewed independently.
- Never use the production project to validate a new migration or recovery path. Validate on an isolated staging database first.
