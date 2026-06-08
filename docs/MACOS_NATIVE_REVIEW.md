# Wasel macOS Native Review

Date: 2026-06-08

## Rating

Wasel macOS-native readiness: **6.5/10**

This score is for the native macOS surface, not the existing web, backend, or Expo mobile product.

## Evidence

- Native SwiftUI package added at `macos/WaselMac`.
- Uses `WindowGroup`, `NavigationSplitView`, source-list sidebar rows, Settings scene, toolbar action, and command menu shortcuts.
- AppKit interop is intentionally narrow: `WindowConfigurator` configures the `NSWindow` title, subtitle, toolbar style, minimum size, and lifecycle behavior.
- Telemetry uses Apple's unified logging through `OSLog.Logger` with `Lifecycle`, `Windowing`, `Sidebar`, and `Commands` categories.
- `script/build_and_run.sh` builds the SwiftPM executable, stages a local `.app` bundle, launches with `/usr/bin/open -n`, and supports `--logs`, `--telemetry`, and `--verify`.
- `.codex/environments/environment.toml` wires a Run action for the macOS project.

## Score Rationale

| Category | Score |
| --- | ---: |
| Native macOS UI structure | 7.5/10 |
| AppKit interop discipline | 7/10 |
| Native telemetry | 8/10 |
| Build/run workflow | 6/10 |
| Production packaging readiness | 3/10 |
| Runtime verification | 4/10 |

## Remaining Gaps

- The current workspace is Windows and does not have `swift` or `xcodebuild`, so the macOS target still needs a real macOS build and launch pass.
- No code signing, notarization, entitlements, or app icon bundle has been added.
- The native shell uses static operational data; it is not yet wired to Wasel's live APIs.
- No macOS accessibility audit or screenshot review has been run.
- No Swift unit/UI tests exist yet for this native target.

## Next macOS Validation Command

Run this on macOS:

```bash
cd macos/WaselMac
./script/build_and_run.sh --verify
./script/build_and_run.sh --telemetry
```
