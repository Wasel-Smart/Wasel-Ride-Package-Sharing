# Repo Reconciliation Plan

## Current State

Two overlapping application trees:
- **`src/`** — Primary web app (more complete, more recent)
- **`Wasel-Ride-Package-Sharing/src/`** — Secondary/legacy copy (more complete schema, but diverged)

## Reconciliation Decision

**Canonical root**: `src/` (primary app)  
**Archived**: `Wasel-Ride-Package-Sharing/` → renamed to `_archive/wasel-ride-package-sharing-legacy/`

## Migration Rules

1. **Features**: If a feature exists only in `Wasel-Ride-Package-Sharing/src/features/`, port it to `src/features/`. Mark original as deprecated.
2. **Services**: Merge any superior service implementations from the legacy tree into `src/services/`.
3. **Components**: Merge unique components. Delete duplicates.
4. **Types/Migrations**: The unified schema from `Wasel-Ride-Package-Sharing/src/supabase/migrations/20260320000000_w_mobility_platform_complete.sql` is the cleanest. Use it as the basis for the canonical migration.
5. **Tests**: Port any unique tests from the legacy tree to `tests/`.
6. **Config**: Preserve only one set of config files (root level).

## Files to Archive (not delete, for safety)

All files under `Wasel-Ride-Package-Sharing/` will be moved to `_archive/wasel-ride-package-sharing-legacy/`.

## Canonical Paths After Reconciliation

| Purpose | Path |
|---------|------|
| Frontend | `src/` |
| Backend shared | `backend/shared/` |
| API gateway | `backend/api-gateway/` |
| Workers | `backend/workers/` |
| Migrations | `supabase/migrations/` (canonical) + `backend/migrations/` (API gateway separate) |
| Infra | `infra/` |
| Tests | `tests/` |
| Docs | `docs/` |
