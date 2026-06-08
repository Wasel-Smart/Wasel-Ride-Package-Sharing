import Foundation
import OSLog

final class WaselTelemetry {
  static let shared = WaselTelemetry()

  private static let subsystem = Bundle.main.bundleIdentifier ?? "online.wasel.mac"

  private let lifecycleLogger = Logger(subsystem: WaselTelemetry.subsystem, category: "Lifecycle")
  private let windowLogger = Logger(subsystem: WaselTelemetry.subsystem, category: "Windowing")
  private let sidebarLogger = Logger(subsystem: WaselTelemetry.subsystem, category: "Sidebar")
  private let commandLogger = Logger(subsystem: WaselTelemetry.subsystem, category: "Commands")

  private init() {}

  func appLaunched() {
    lifecycleLogger.info("Wasel Mac app launched")
  }

  func appActivated() {
    lifecycleLogger.info("Wasel Mac app activated as regular macOS app")
  }

  func windowConfigured(identifier: String) {
    windowLogger.info("Configured window: \(identifier, privacy: .public)")
  }

  func sidebarSelectionChanged(to section: WaselSection) {
    sidebarLogger.info("Selected section: \(section.rawValue, privacy: .public)")
  }

  func actionTriggered(_ name: String) {
    commandLogger.info("Action triggered: \(name, privacy: .public)")
  }
}
