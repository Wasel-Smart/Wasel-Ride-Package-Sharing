# Mobile App Audit Report

## Status: UNVERIFIED — do not trust the scores below without re-running CI

A previous version of this file claimed an overall score of 9.3/10 with every category
rated "Excellent" (9–9.5/10). Those numbers were not backed by a passing build at the
repo root — `test-results/.last-run.json` at the repo root currently reports
`"status": "failed"`. Mobile has its own build/test pipeline (Jest, Detox) and has not
been independently re-verified.

**No score in this document is valid until someone has actually run, in order, and
pasted the real output of:**

```
yarn install
yarn type-check
yarn lint
yarn test
```

## Overview

React Native (Expo SDK 51) client. 78+ source files, 25+ product screens per prior
(unverified) documentation — file counts are checkable, behavior is not, without running
the app.

### Previously-claimed scorecard (NOT verified)

| Category                    | Score  | Status         |
| --------------------------- | ------ | -------------- |
| Architecture & Modularity   | 9.5/10 | Excellent       |
| Code Quality & Patterns     | 9/10   | Excellent       |
| TypeScript Strictness       | 9.5/10 | Excellent       |
| Test Coverage               | 9/10   | Excellent       |
| Error Handling & Boundaries | 9.5/10 | Excellent       |
| Offline-First Design        | 9.5/10 | Excellent       |
| Security Practices          | 9/10   | Excellent       |
| UX & Accessibility          | 9/10   | Excellent       |
| Documentation               | 9/10   | Excellent       |
| Observability               | 9/10   | Excellent       |
| CI / Quality Gates          | 8.5/10 | Excellent       |

## Known-true facts (verifiable from the filesystem)

- `mobile/src/` exists with a real screen/navigation structure.
- `proguard-rules.pro`, ABI/density split config, and Sentry integration files are
  present — whether they function correctly requires a real Android build, not a file
  listing.
- Test files exist (`authFlow.test.ts`, `rideFlow.test.ts`, component tests) — presence
  of test files is not the same as a passing test run.

## Documented changes (claimed, not independently re-verified)

1. **Component testing** — Installed `@testing-library/react-native` and added comprehensive
   snapshot and interaction tests for `Button.tsx` and `MobilePrimitives.tsx`.

2. **E2E test expansion** — Added `packageFlow.test.ts` for package creation flow and expanded
   `authFlow.test.ts` with full auth surface coverage. `rideFlow.test.ts` now covers login →
   home → ride request → safety center → wallet.

3. **Android cold-start optimization** — Created `proguard-rules.pro` with comprehensive
   keep rules for Hermes, Sentry, Firebase, Stripe, and Fresco. Enabled ABI and density splits
   in `build.gradle`. Optimized splash screen config with logo support.

4. **Advanced observability** — Upgraded `performance.tsx` with Sentry metrics, screen tracking,
   auto component tracking, cold-start gauge metrics, and domain-specific tracing primitives
   (`recordNavigation`, `recordOfflineAction`, `recordSyncResult`, `recordApiCall`).

5. **Documentation** — Added `TESTING.md`, `OBSERVABILITY.md`, and `ARCHITECTURE.md` with
   comprehensive guides for testing patterns, instrumentation setup, and architecture decisions.

6. **Auth API mismatch** — `AuthProvider.tsx` called `authService.signIn()` and
   `authService.resetPassword()`, which did not exist on `MobileAuthService`. Added `signIn`
   (delegating to `signInWithEmail`) and `resetPassword` (delegating to Supabase's
   `resetPasswordForEmail`).

7. **Offline URL validation bug** — `offline.ts` used `Array.includes()` for hostname matching,
   which rejected subdomain Supabase URLs like `xyz.supabase.co`. Fixed to use `endsWith()`
   matching the pattern in `api.ts`.

8. **Dead code** — Removed `Tabs.tsx`, an unused placeholder file. The production tab navigation
   lives in `AppNavigator.tsx`'s `TabNavigator`, which references real screen components.

9. **Error boundary** — `MobileErrorBoundary` now generates a unique error ID, tags Sentry
   events with that ID, shows the error ID in the UI, provides a "copy ID" button, and includes
   a support mail-to link.

10. **validateCoordinate** — Fixed fragile latitude/longitude detection logic that had
    duplicated label comparisons.

### Remaining gaps (minor, as claimed)

- **E2E coverage** — Detox specs cover auth, ride, and package flows; wallet E2E is next
- **Component snapshot tests** — Core primitives covered; expanding to all screens
- **Android cold start** — Hermes enabled, ProGuard optimized, ABI splits configured; target <2s on Android requires native module profiling
- **React Native Testing Library** — Installed and used for core components; expanding to screens
- **CI E2E pipeline** — Detox configured; CI integration requires EAS build pipeline setup

## What this document is NOT

Not a certification of release-readiness. Scores return once `yarn test` output is
pasted and reviewed, not before.

## Last edited

August 2026 — scores removed pending real verification.
