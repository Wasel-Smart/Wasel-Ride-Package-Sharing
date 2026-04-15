# Wasel Application Enterprise Audit Report

Date: 2026-04-15
Workspace: `C:\Users\user\OneDrive\Desktop\Wdoubleme`
Scope: runtime contracts, environment policy, real-data paths, localization/encoding hygiene, service consolidation

## 📊 System Health Report

| Pillar | Before | After | Evidence |
| --- | --- | --- | --- |
| Contract Completeness | 4.5/10 | 7.5/10 | Added explicit runtime response contracts and normalization for trips, bookings, wallet, plus contract violation errors |
| Environment Discipline | 3.0/10 | 7.5/10 | Removed checked-in public Supabase fallback behavior, removed hardcoded edge function slug, enforced protected-env rules |
| Real-Data Integrity | 4.0/10 | 6.5/10 | Removed synthetic platform stats and synthetic fleet filling in protected flows, blocked unsafe persistence fallbacks |
| Encoding & Localization Quality | 5.5/10 | 6.5/10 | Preserved existing RTL/LTR infrastructure, removed one fake metric from UI, but encoding debt still remains in several files |
| Architecture Consolidation | 5.0/10 | 6.5/10 | Centralized fallback policy and normalized service contracts, but broader domain fragmentation still exists |

Validation executed:
- `npm run type-check`
- `npx vitest run tests/unit/utils/environment.test.ts tests/unit/utils/supabaseInfo.test.ts tests/unit/services/trips.test.ts tests/unit/services/bookings.test.ts tests/unit/services/backendFallback.test.ts --config vitest.config.ts`
- `npm run lint`
- `npm run build`

Validation outcome:
- Type-check: passed
- Targeted unit suites: 60/60 passed
- Lint: passed with 4 existing warnings in `src/pages/waselServiceShared.tsx`
- Production build: passed

## 🔥 Critical Issues Found Per Pillar

### 1. Contract Completeness
- `src/services/trips.ts` accepted backend responses without a versioned runtime contract and silently switched between edge and direct paths.
- `src/services/bookings.ts` had implicit response shapes across edge/direct mutations.
- `src/services/walletApi.ts` trusted wallet and payment payloads without a dedicated response contract boundary.
- Contract failures surfaced as generic runtime errors instead of explicit contract violations.

### 2. Environment Discipline
- `src/utils/supabase/info.tsx` exposed a checked-in public Supabase URL and anon key fallback path.
- `src/services/core.ts` carried a hardcoded edge function name default.
- Protected environments did not fail closed on demo data, synthetic trips, direct Supabase fallback, or local persistence fallback.
- Supabase rollout tooling mixed operational seeds with smoke-check/mock verification seeds.

### 3. Real-Data Integrity
- `src/services/liveDataService.ts` generated synthetic platform statistics.
- `src/features/mobility-os/MobilityOSCore.tsx` and `src/features/home/MobilityOSLandingMap.tsx` filled missing fleet capacity with synthetic vehicles.
- `src/services/bus.ts` and `src/services/journeyLogistics.ts` could silently surface local-only fallback data in flows that should fail closed outside development/test.

### 4. Encoding & Localization Quality
- UTF-8 handling was not explicitly enforced in the changed production-critical paths.
- Existing mojibake remains in source comments and a few UI strings, especially in map/auth-adjacent files.
- Localization structure already supports RTL/LTR, but contract and runtime hardening had not been aligned with that standard.

### 5. Architecture Consolidation
- Fallback decisions were repeated across services instead of flowing through one policy.
- Trips/bookings/wallet used different response-shape assumptions.
- Operational rollout and smoke-check seed concerns were coupled in the Supabase tooling.

## 🛠 Exact Fixes Applied

### Contracts
- `src/contracts/validation.ts`
  Added `parseContract()` so response-shape violations throw a `ValidationError` with contract name, version, and issue list.
- `src/contracts/bookings.ts`
  Added normalized booking record/list/envelope contracts and explicit TypeScript contract types.
- `src/services/bookings.ts`
  Enforced contract parsing on edge and direct paths, normalized mutation envelopes, and removed silent fallback behavior in protected environments.
- `src/services/trips.ts`
  Enforced runtime contracts for create/search/get/update/delete/publish/price flows and gated direct Supabase fallback through runtime policy.
- `src/services/walletApi.ts`
  Added response-contract parsing for wallet snapshots, payment intents, confirmations, and step-up verification.

### Environment discipline
- `src/utils/env.ts`
  Added explicit app-environment resolution, placeholder env detection, protected-environment rules, and centralized flags for demo data, synthetic trips, direct fallback, and local persistence fallback.
- `src/utils/environment.ts`
  Added protected-environment validation for public Supabase config, backend config, HTTPS requirements, and demo/fallback bans.
- `src/utils/supabase/info.tsx`
  Removed checked-in public Supabase defaults and resolved public config from env only.
- `src/services/core.ts`
  Removed the hardcoded edge function slug and made backend resolution explicit.
- `README.md`
  Updated runtime-configuration guidance to match env-only public config and protected-env behavior.

### Real-data integrity
- `src/services/runtimePolicy.ts`
  Added a single fallback-policy module for direct Supabase fallback, local persistence fallback, and synthetic data.
- `src/services/liveDataService.ts`
  Replaced synthetic random platform stats with live Mobility OS snapshot mapping.
- `src/features/home/HomePageSections.tsx`
  Removed fake wait-time presentation and switched the home stat card to real seat-availability language.
- `src/features/mobility-os/MobilityOSCore.tsx`
  Stopped synthetic fleet padding unless explicitly allowed in development/test.
- `src/features/home/MobilityOSLandingMap.tsx`
  Disabled synthetic landing-map fleet generation outside explicitly allowed environments.
- `src/services/bus.ts`
  Prevented local booking persistence fallback unless the environment explicitly allows it.
- `src/services/journeyLogistics.ts`
  Hid `local-only` records when local persistence fallback is disallowed and prevented direct/local fallback from silently leaking into protected environments.

### Rollout integrity
- `scripts/supabase-migration-registry.mjs`
  Split operational rollout seeds from smoke-check seed files.
- `scripts/run-seeds.mjs`
  Changed default seed execution to operational seeds only, with smoke checks opt-in.
- `scripts/apply-supabase-rollout.mjs`
  Added explicit smoke-check execution instead of mixing it into normal rollout.
- `scripts/verify-supabase-rollout.mjs`
  Verified smoke-check artifacts separately and updated guidance.
- `src/supabase/migrations/MIGRATIONS_README.md`
  Regenerated migration documentation after the rollout split.

### Test hardening
- `tests/unit/utils/environment.test.ts`
  Updated expectations for strict protected-environment validation.
- `tests/unit/utils/supabaseInfo.test.ts`
  Added explicit public-key stubbing so the test no longer depends on local machine env state.
- `tests/unit/services/bookings.test.ts`
  Pinned the test environment and direct fallback flags explicitly.
- `tests/unit/services/trips.test.ts`
  Pinned the test environment and direct fallback flags explicitly.

## 🧱 Refactored Architecture Summary

Current improvement pattern:
- `src/utils/env.ts` is now the single source of truth for environment mode and fallback toggles.
- `src/services/runtimePolicy.ts` is now the single source of truth for whether degraded-mode behavior is allowed.
- `src/contracts/*` now holds explicit response-shape contracts for high-risk service domains.
- `src/services/trips.ts`, `src/services/bookings.ts`, and `src/services/walletApi.ts` now consume normalized runtime contracts instead of relying on implicit backend behavior.
- Supabase rollout tooling now separates production rollout seeds from smoke-check verification seeds.

Net effect:
- UI, service, and backend-integration boundaries are more explicit.
- Protected environments fail closed more often.
- High-risk data flows are less fragmented, but the wider service layer is not yet fully consolidated.

## ⚠ Remaining Risks / Technical Debt

### Contract and architecture debt
- `src/services/communicationPreferences.ts` still uses local-first fallback behavior.
- `src/services/growthEngine.ts` still creates a local referral snapshot fallback when remote retrieval fails.
- `src/services/rideLifecycle.ts` still creates `local-only` booking records.
- Many other service modules still do not have dedicated versioned runtime response contracts.

### Environment and release debt
- `.github/workflows/ci.yml` still runs E2E jobs with demo-data flags enabled. Verify jobs are stricter now, but the pipeline still lacks a real staging-backed E2E gate.
- Local secret files such as `.env.production` exist on disk outside git tracking. They were not printed or modified here, but they remain an operational risk if not rotated and managed through a secrets manager.

### Encoding and localization debt
- Existing mojibake remains in files such as `src/components/MapWrapper.tsx`, `src/components/WaselMap.tsx`, and `src/pages/WaselAuthCallback.tsx`.
- RTL/LTR handling exists and was not broken by this refactor, but localization is still monolithic and not yet contract-tested.

### Lint debt
- `src/pages/waselServiceShared.tsx` still has 4 `react-refresh/only-export-components` warnings.

## 🚀 Production Readiness Score By Pillar

| Pillar | Score | Release decision |
| --- | --- | --- |
| Contract Completeness | 7.5/10 | Improved materially, but not yet complete across the whole service layer |
| Environment Discipline | 7.5/10 | Good progress, but CI and local secret handling still block a clean enterprise release posture |
| Real-Data Integrity | 6.5/10 | Safer in core trip/booking/home paths, but local-first behavior still exists elsewhere |
| Encoding & Localization Quality | 6.5/10 | RTL/LTR is intact, but encoding cleanup is incomplete |
| Architecture Consolidation | 6.5/10 | Core fallback policy is centralized, wider service fragmentation remains |

Overall release assessment:
- Current state: improved and buildable
- Enterprise-grade production state: not yet achieved
- Immediate blockers before calling this fully production-ready:
  - remove or strictly gate remaining local-first referral/preferences/lifecycle fallbacks
  - add broader service-contract coverage
  - clean mojibake source files
  - replace demo-backed E2E coverage with staging-backed verification
