import SwiftUI

struct SettingsView: View {
  @AppStorage("WaselMac.showOperationalWarnings") private var showOperationalWarnings = true
  @AppStorage("WaselMac.compactRows") private var compactRows = false

  var body: some View {
    Form {
      Section("Operations") {
        Toggle("Show operational warnings", isOn: $showOperationalWarnings)
        Toggle("Use compact work rows", isOn: $compactRows)
      }

      Section("Telemetry") {
        LabeledContent("Subsystem", value: "online.wasel.mac")
        LabeledContent("Categories", value: "Lifecycle, Windowing, Sidebar, Commands")
      }
    }
    .formStyle(.grouped)
    .padding()
    .onChange(of: showOperationalWarnings) { _, _ in
      WaselTelemetry.shared.actionTriggered("settings.show_operational_warnings")
    }
    .onChange(of: compactRows) { _, _ in
      WaselTelemetry.shared.actionTriggered("settings.compact_rows")
    }
  }
}
