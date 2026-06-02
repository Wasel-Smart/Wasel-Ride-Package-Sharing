# Supabase migrations directory

The canonical Wasel rollout migrations are maintained under `src/supabase/migrations/` and registered in `scripts/supabase-migration-registry.mjs`.

This directory intentionally contains no deployable `.sql` files so Supabase CLI commands cannot accidentally apply the legacy root migration set. Historical root-level migration snapshots were moved to `supabase/archive/migrations/` for reference only; do not deploy them to production.

Use the documented rollout commands and verification gate:

```bash
npm run verify:supabase-rollout
```
