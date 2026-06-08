# Wasel Mac

Native macOS SwiftUI shell for the Wasel mobility operating system.

## What This Adds

- SwiftUI `WindowGroup` app with a native source-list sidebar and stable detail panes.
- Dedicated Settings scene for operator preferences.
- Native command menu shortcuts for refresh and section switching.
- Narrow AppKit bridge in `Support/WindowConfigurator.swift` for `NSWindow` sizing, title, toolbar style, and lifecycle behavior.
- OSLog telemetry in `Services/WaselTelemetry.swift` for lifecycle, windowing, sidebar, and command events.

## Run On macOS

```bash
cd macos/WaselMac
./script/build_and_run.sh --verify
./script/build_and_run.sh --telemetry
```

Telemetry can be filtered with subsystem `online.wasel.mac`.
