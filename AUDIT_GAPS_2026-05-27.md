# Wasel Deep-Dive Gap Audit (2026-05-27)

## Scope
- Repository-wide static review.
- Executed quality gate script for automated verification.
- Environment limitation: package install is blocked by registry 403, so full dynamic validation could not complete.

## Critical Gaps (Fix First)

1. **Quality gate currently fails end-to-end**
   - `npm run verify:gaps` fails in TypeScript, lint, tests, and build stages.
   - This means CI/CD confidence is currently broken.
   - Fix list:
     - Restore dependency installation path in CI/local (`npm ci` or private registry credentials).
     - Run and resolve all failures in `type-check`, `lint`, `test`, `build`, `size`.

2. **TypeScript config incompatible with TS6 deprecation policy**
   - `tsconfig.json` still uses `baseUrl`, which now triggers TS5101 warning/error path for TS6+ unless ignored.
   - Fix list:
     - Add `"ignoreDeprecations": "6.0"` as immediate mitigation.
     - Long-term migrate away from deprecated `baseUrl` behavior.

3. **Dependency supply/registry reliability issue**
   - `npm install` fails with `403 Forbidden - GET https://registry.npmjs.org/eslint`.
   - This blocks fresh environment setup and reproducibility.
   - Fix list:
     - Verify npm registry/network policy in CI and developer onboarding docs.
     - Add fallback mirror or artifact cache.
     - Add preflight script that validates registry access early.

## High Priority Gaps

4. **Lint ecosystem version drift risk**
   - Warnings show peer-dependency mismatches around ESLint ecosystem (`eslint`, `@eslint/js`, plugins).
   - Fix list:
     - Pin compatible versions as a tested set.
     - Document update cadence and run compatibility matrix.

5. **Huge quality claim vs. current broken gate mismatch**
   - README states “Production-ready” and “10/10”, while automated gap check currently fails.
   - Fix list:
     - Gate status badge should reflect live CI.
     - Move aspirational claims into dated milestone docs; keep README factual.

6. **Tests excluded from tsconfig include path**
   - `tests` are excluded in tsconfig, while quality gate relies heavily on tests.
   - Risk: tests may compile differently than app source expectations.
   - Fix list:
     - Add dedicated `tsconfig.tests.json` and enforce in CI.

## Medium Priority Gaps

7. **Security audit command exists but not guaranteed in default verify pipeline**
   - `security:audit` is separate from `verify`.
   - Fix list:
     - Add security audit in CI merge gate (or nightly with blocker policy).

8. **Operational script sprawl complexity**
   - Very large scripts surface increases maintenance burden and hidden failures.
   - Fix list:
     - Classify scripts by owner and lifecycle.
     - Deprecate/merge redundant scripts.

9. **Potential documentation drift**
   - Large documentation surface with many “complete/final/10-out-of-10” files can drift from reality.
   - Fix list:
     - Add docs freshness SLA + automated stale-check (last validated date).

## Suggested Execution Plan

1. Unblock dependency install (registry + lockfile integrity).
2. Fix TS deprecation flags and path alias strategy.
3. Run `npm run verify:gaps` until green.
4. Align README quality claims with current CI truth.
5. Add CI policy: merge blocked unless `verify` + `security:audit` pass.
6. Add `tsconfig.tests.json` and enforce test type-check.

## Evidence Commands Run
- `npm run verify:gaps` (failed, multi-stage quality gate).
- `npm install` (failed due to npm registry 403).
- Static inspection: `package.json`, `tsconfig.json`, `eslint.config.js`, `README.md`.
