# Supabase Blockers and Handling Status (Wasel)

Updated: 2026-11-16. Source: repo/config/workflow audit; not a live production certification.

## 1. Critical — migration history drift / unsafe DB delivery
**Status:** mitigated in-repo, external DBA execution required.

Handled now:
- `scripts/reconcile-migrations.mjs` warns on local/remote mismatch and blocks unsafe assumptions.
- `npm run verify:ci` runs migration reconciliation and edge bundle/graph/type checks.
- `.github/workflows/db-drift.yml` now fails when linked-project credentials are missing unless `DB_DRIFT_ALLOW_SKIP=true` (for non-production forks only).
- `.github/workflows/production-readiness.yml` runs edge/migration checks and optional linked dry-run/schema diff.
- `docs/DBA_MIGRATION_RECONCILIATION_PLAN.md` remains the execution authority; **do not run `supabase db push`** from this checkout.

Still required:
- DBA reconciliation against backup/restored copy, `supabase migration list --linked`, apply/repair plan, and post-migration audit SQLs (`ops/production-readiness-audit.sql`, `ops/audit_client_privileges.sql`, `tests/rls_coverage.sql`).

## 2. Critical — unverified production parity
**Status:** partially automated, secrets/ops-dependent.

Handled now:
- CI/workflow hooks added for drift/reconciliation.
- Local/CI-ready checks: `edge:sync:check`, `edge:graph`, `edge:types`, `reconcile:migrations`.

Still required:
- Configure `SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` in repo/environment secrets.
- Run read-only audits on production or restored clone and capture evidence.

## 3. High — edge/payment/webhook duplication
**Status:** reduced/clarified, not fully removed.

Handled now:
- `webhooks` function kept as provider-signature boundary; vendored make-server closure sync added to `scripts/prepare-edge-bundles.mjs` and verified by `edge:sync:check`.
- `stripe-payments-v2` is a retired compatibility endpoint (410) pointing to canonical make-server payments route.
- `cliq-payments` marked legacy compatibility endpoint with canonical routes documented.
- Canonical payment behavior remains in `make-server-0b1f4071` handlers/tests; wallet-topup/payment edge tests passed locally before deploy.

Still required:
- Remove or formally version legacy endpoints after client migration; add contract tests for every externally deployed payment/webhook route.

## 4. High — gateway JWT disabled for sensitive functions
**Status:** documented/guarded, architectural risk remains.

Handled now:
- `config.toml` comments clarified for `make-server-0b1f4071`, `webhooks`, `stripe-payments-v2`, and auth hooks.
- Route-level auth/signature enforcement remains the control (review required per change).

Still required:
- Periodic security review of handler auth guards and consider splitting public health/webhook surfaces further.

## 5. High — RLS/privilege assurance automation
**Status:** tooling present, target-DB execution required.

Handled now:
- Authoritative gate files exist: `supabase/tests/rls_coverage.sql`, `supabase/ops/production-readiness-audit.sql`, `supabase/ops/audit_client_privileges.sql`, `supabase/rls-allowlist.json`.

Still required:
- Run against reconciled staging/prod clone in CI/CD or release checklist with recorded results.

## 6. Medium — auth/provider/hook config ambiguity
**Status:** improved.

Handled now:
- `supabase/config.toml` documents SMS hook disabled-by-default requirements and clarifies Twilio legacy vs Twilio Verify active block.
- `SUPABASE_AUTH_REDIRECT_URI` env dependency remains explicit.

Still required:
- Validate per-environment Twilio/hook/OAuth env vars in deployment system; enable hook only after end-to-end verification.

## 7. Medium — reference schema drift
**Status:** improved.

Handled now:
- `supabase/schema.sql` and `supabase/ai_schema.sql` marked reference snapshots only; migrations/reconciled history declared source of truth.

Still required:
- Regenerate snapshots only after reconciliation or add generation automation.

## 8. Medium — production change control
**Status:** improved.

Handled now:
- DBA plan, blockers doc, CI checks, and existing ops/test SQLs provide a concrete path.

Still required:
- Signed DBA/owner execution and recorded validation evidence.

## 9. Medium — function/config sprawl
**Status:** documented.

Still required:
- Ownership map/deprecation schedule for legacy compatibility functions and vendored artifacts.

## Validation run in this workspace
- `npm run edge:sync` / `edge:sync:check` / `edge:graph` — pass.
- `npm run test:edge -- wallet-topup-payment-method payments` — pass (8 + 10 tests, Deno 2.9.8).
- `supabase functions deploy make-server-0b1f4071 --project-ref zexlxabdcsjefptmjhuq` — completed (warnings only: unset `SUPABASE_AUTH_REDIRECT_URI`, Docker not running, CLI update available).
