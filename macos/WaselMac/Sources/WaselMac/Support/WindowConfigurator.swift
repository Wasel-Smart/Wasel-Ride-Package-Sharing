import AppKit
import SwiftUI

struct WindowConfigurator: NSViewRepresentable {
  let minSize: NSSize

  func makeCoordinator() -> Coordinator {
    Coordinator()
  }

  func makeNSView(context: Context) -> NSView {
    NSView(frame: .zero)
  }

  func updateNSView(_ view: NSView, context: Context) {
    DispatchQueue.main.async {
      guard let window = view.window else { return }
      let windowID = ObjectIdentifier(window)
      guard !context.coordinator.configuredWindows.contains(windowID) else { return }

      window.minSize = minSize
      window.title = "Wasel"
      window.subtitle = "Mobility operating system"
      window.toolbarStyle = .unified
      window.titlebarAppearsTransparent = false
      window.isReleasedWhenClosed = false

      context.coordinator.configuredWindows.insert(windowID)
      WaselTelemetry.shared.windowConfigured(identifier: "main")
    }
  }

  final class Coordinator {
    var configuredWindows = Set<ObjectIdentifier>()
  }
}
