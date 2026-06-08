import Combine
import Foundation

final class WaselDashboardStore: ObservableObject {
  @Published private(set) var snapshot = WaselSnapshot.sample
  @Published var selectedSection: WaselSection = .commandCenter

  func select(_ section: WaselSection) {
    guard selectedSection != section else { return }
    selectedSection = section
    WaselTelemetry.shared.sidebarSelectionChanged(to: section)
  }

  func refreshOperations() {
    snapshot.lastUpdated = .now
    WaselTelemetry.shared.actionTriggered("refresh_operations")
  }

  func workItems(for section: WaselSection) -> [WaselWorkItem] {
    snapshot.sections[section] ?? []
  }
}
