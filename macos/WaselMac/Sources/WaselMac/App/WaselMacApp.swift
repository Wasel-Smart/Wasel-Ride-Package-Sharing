import AppKit
import SwiftUI

@main
struct WaselMacApp: App {
  @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  @StateObject private var store = WaselDashboardStore()

  var body: some Scene {
    WindowGroup("Wasel", id: "main") {
      ContentView(store: store)
        .frame(minWidth: 1120, minHeight: 720)
        .background(WindowConfigurator(minSize: NSSize(width: 1120, height: 720)))
        .onAppear {
          WaselTelemetry.shared.appLaunched()
        }
    }
    .commands {
      WaselCommands(store: store)
    }

    Settings {
      SettingsView()
        .frame(width: 520)
    }
  }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
  func applicationDidFinishLaunching(_ notification: Notification) {
    NSApp.setActivationPolicy(.regular)
    NSApp.activate(ignoringOtherApps: true)
    WaselTelemetry.shared.appActivated()
  }
}

struct WaselCommands: Commands {
  let store: WaselDashboardStore

  var body: some Commands {
    CommandMenu("Wasel") {
      Button("Refresh Operations") {
        store.refreshOperations()
      }
      .keyboardShortcut("r", modifiers: [.command])

      Divider()

      ForEach(WaselSection.allCases) { section in
        Button(section.title) {
          store.select(section)
        }
        .keyboardShortcut(section.shortcut, modifiers: [.command, .option])
      }
    }
  }
}
