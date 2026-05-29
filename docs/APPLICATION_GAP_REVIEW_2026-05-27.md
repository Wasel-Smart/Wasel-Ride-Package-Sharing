# Application Gap Review (May 27, 2026)

## Scope

This review was executed as a repository-level engineering and operational gap assessment using available static sources plus local verification commands.

## Executive Summary

The codebase presents itself as production-ready, but there is a **critical execution gap**: baseline quality checks cannot run in this environment because project dependencies are not installed and TypeScript config is not forward-compatible with current TypeScript behavior.

## Findings

### 1) Build and verification pipeline not runnable from a clean workspace (Critical)

**Evidence**
- `npm run -s type-check` fails with missing type definitions (`node`, `vite/client`) and TypeScript 6 deprecation hard-stop on `baseUrl`.
- `npm run -s lint:strict` fails with missing `@eslint/js` package resolution.
- `npm run -s test:security` fails because `vitest` is not found.

**Impact**
- Cannot validate correctness, lint hygiene, or security tests.
- CI parity from local development is broken.
- Production confidence claims cannot be verified from a fresh environment.

**Recommended fixes**
1. Enforce `npm ci` in onboarding and CI bootstrap.
2. Add preflight check script to detect missing dependencies before running any quality gate.
3. Update `tsconfig.json` for TypeScript 6+/7 compatibility (e.g., explicit deprecation handling and eventual `baseUrl` migration).

### 2) Documentation claims are stronger than verifiable state (High)

**Evidence**
- README declares production-ready/10 out of 10 and extensive quality gates.
- Actual local execution in current checkout cannot run key gates without additional setup.

**Impact**
- Risk of false confidence for maintainers and stakeholders.
- Onboarding friction and slower incident response during urgent fixes.

**Recommended fixes**
1. Add a "Verification prerequisites" section listing mandatory setup (`npm ci`, env expectations, toolchain versions).
2. Add a quick diagnostic command that fails fast with actionable remediation.
3. Ensure badges/claims reflect reproducible checks.

### 3) TypeScript configuration future-compatibility risk (High)

**Evidence**
- TypeScript reports `baseUrl` deprecation behavior warning elevated to error context for TS7 transition.

**Impact**
- Future compiler upgrades can block builds unexpectedly.
- Increased technical debt and migration pressure.

**Recommended fixes**
1. Plan migration away from deprecated options.
2. Temporarily add explicit deprecation acknowledgement only if migration cannot be completed immediately.
3. Add TS version pin and upgrade playbook.

### 4) Security validation depends on non-guaranteed local tooling state (Medium)

**Evidence**
- Security test command relies on `vitest`; command currently not executable in fresh state.

**Impact**
- Security regressions may slip if teams assume script availability without install verification.

**Recommended fixes**
1. Add `presecurity` script guard to verify dependencies.
2. Include security smoke checks in CI with explicit install step.
3. Document minimum local security validation path.

### 5) Ambiguity in supported branch naming in security policy (Low)

**Evidence**
- `SECURITY.md` lists both `master` and `main` as supported branches.

**Impact**
- Potential confusion in vulnerability patch targeting and backport policy.

**Recommended fixes**
1. Confirm canonical default branch.
2. Update policy to a single source of truth for supported release branches.

## Prioritized Remediation Plan

1. **Immediate (today)**: ensure dependency bootstrap (`npm ci`) is mandatory and verified.
2. **Short term (1-2 days)**: fix TypeScript config compatibility and add preflight diagnostics.
3. **Short term (1 week)**: reconcile README operational claims with reproducible checks.
4. **Ongoing**: harden security validation workflow and branch policy clarity.

## Commands Run

- `npm run -s type-check`
- `npm run -s lint:strict`
- `npm run -s test:security`

