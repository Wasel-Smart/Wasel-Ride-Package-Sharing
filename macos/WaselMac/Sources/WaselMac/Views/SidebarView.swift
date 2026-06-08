import SwiftUI

struct SidebarView: View {
  @Binding var selection: WaselSection?

  var body: some View {
    List(selection: $selection) {
      Section("Workspace") {
        ForEach(WaselSection.allCases) { section in
          Label {
            VStack(alignment: .leading, spacing: 2) {
              Text(section.title)
                .font(.body)
              Text(section.subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }
          } icon: {
            Image(systemName: section.systemImage)
          }
          .tag(section)
        }
      }
    }
    .listStyle(.sidebar)
    .navigationTitle("Wasel")
  }
}
