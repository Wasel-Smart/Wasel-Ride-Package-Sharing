import SwiftUI

struct ContentView: View {
  @ObservedObject var store: WaselDashboardStore
  @SceneStorage("WaselMac.selectedSection") private var selectedSectionRaw = WaselSection.commandCenter.rawValue

  var body: some View {
    NavigationSplitView {
      SidebarView(selection: selection)
    } detail: {
      DetailView(store: store)
    }
    .navigationSplitViewStyle(.balanced)
    .toolbar {
      ToolbarItemGroup {
        Button {
          store.refreshOperations()
        } label: {
          Label("Refresh", systemImage: "arrow.clockwise")
        }
        .help("Refresh operations")
      }
    }
    .onAppear {
      if let storedSection = WaselSection(rawValue: selectedSectionRaw) {
        store.select(storedSection)
      }
    }
  }

  private var selection: Binding<WaselSection?> {
    Binding(
      get: {
        store.selectedSection
      },
      set: { newValue in
        guard let newValue else { return }
        selectedSectionRaw = newValue.rawValue
        store.select(newValue)
      }
    )
  }
}
