# Operational Seeding

Operational seed execution is governed by `scripts/supabase-migration-registry.mjs`.
Do not invent ad hoc seed order or manually maintain a second source of truth.

## Rules

1. Apply rollout migrations before any operational seed pack.
2. Keep every operational seed file transactional: start with `BEGIN;` and end with `COMMIT;`.
3. Every seed must be idempotent and must write to `public.seed_execution_log`.
4. Smoke-check seeds are not part of production cutover and must stay separate from operational seeds.
5. After any migration or seed change, run `npm run verify:supabase-rollout`.

## Canonical Flow

1. Review `src/supabase/migrations/MIGRATIONS_README.md`.
2. Apply rollout migrations in the registry-defined order.
3. Apply the operational seeds listed in the same registry.
4. Run the smoke-check seed only in rehearsal or validation environments.

## Seed Packs

- Operational seeds: `db/seeds/roles.seed.sql`, `db/seeds/cities.seed.sql`, `db/seeds/trip_types.seed.sql`, `db/seeds/pricing.seed.sql`, `db/seeds/core.seed.sql`, `db/seeds/automation.seed.sql`
- Smoke checks: `src/supabase/seeds/mock_engine_smoke_checks.sql`

## Guardrails

- Never edit historical migrations to compensate for bad seed data.
- Fix data drift with a new migration or a new idempotent seed step.
- Treat seed failures as rollout failures. Do not continue with partial reference data.
