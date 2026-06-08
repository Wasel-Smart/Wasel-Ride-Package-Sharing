# Wasel iOS Native Readiness

Date: 2026-06-08

## Current Rating

Wasel iOS repository readiness: **9/10**

Wasel iOS simulator/App Store release proof: **pending macOS verification**

The repository now passes the code and configuration checks that previously capped the score below 8. A final 10/10 release certification still requires running Xcode, CocoaPods, and Detox on macOS because iOS apps cannot be built or simulator-tested from this Windows workspace.

## Improvements Completed

- Expo Router is now the explicit mobile entrypoint through `expo-router/entry`.
- The router maps directly to the real Wasel screens: home, rides, packages, and profile.
- Stable iOS automation IDs were added for primary screens, tabs, ride fields, package fields, submit buttons, and the connectivity banner.
- Detox iOS build commands now run the native-project guard before invoking `xcodebuild`.
- Stale Detox tests were replaced with tests that target the UI that currently exists.
- EAS build profiles were added for development, preview, production, and submit flows.
- `npm run ios:ensure-project` now guards native iOS project generation.
- `npm run verify:ios-readiness` now checks the exact blockers that caused the lower score.

## Verified Locally

```bash
npm run verify:ios-readiness
npm run type-check
npm test
```

Results:

- iOS readiness gate: 32/32 static checks passed, 1 warning for macOS-only native project generation.
- TypeScript: passed.
- Jest: 2 suites passed, 7 tests passed.

## Remaining 10/10 Release Certification Step

Run on macOS:

```bash
cd mobile
npm run ios:prebuild
npm run ios:pods
npm run build:e2e:ios
npm run test:e2e:ios
npm run build:ios
```

After those pass on a booted iOS Simulator or a signed device build, Wasel can be rated 10/10 for iOS release readiness.
