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

## Known-true facts (verifiable from the filesystem)

- `mobile/src/` exists with a real screen/navigation structure.
- `proguard-rules.pro`, ABI/density split config, and Sentry integration files are
  present — whether they function correctly requires a real Android build, not a file
  listing.
- Test files exist (`authFlow.test.ts`, `rideFlow.test.ts`, component tests) — presence
  of test files is not the same as a passing test run.

## What this document is NOT

Not a certification of release-readiness. Scores return once `yarn test` output is
pasted and reviewed, not before.

## Last edited

August 2026 — scores removed pending real verification.
