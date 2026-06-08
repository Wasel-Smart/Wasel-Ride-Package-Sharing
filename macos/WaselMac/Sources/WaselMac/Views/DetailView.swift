import SwiftUI

struct DetailView: View {
  @ObservedObject var store: WaselDashboardStore

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        header

        if store.selectedSection == .commandCenter {
          MetricsGrid(metrics: store.snapshot.metrics)
        }

        WorkItemsPanel(
          section: store.selectedSection,
          items: store.workItems(for: store.selectedSection)
        )
      }
      .padding(28)
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(.background)
  }

  private var header: some View {
    HStack(alignment: .top) {
      VStack(alignment: .leading, spacing: 8) {
        Label(store.selectedSection.title, systemImage: store.selectedSection.systemImage)
          .font(.largeTitle.weight(.semibold))

        Text(store.selectedSection.subtitle)
          .font(.title3)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 8) {
        StatusBadge(text: store.snapshot.health, state: .good)
        Text("Updated \(store.snapshot.lastUpdated, style: .relative)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct MetricsGrid: View {
  let metrics: [WaselMetric]

  private let columns = [
    GridItem(.adaptive(minimum: 220), spacing: 14)
  ]

  var body: some View {
    LazyVGrid(columns: columns, alignment: .leading, spacing: 14) {
      ForEach(metrics) { metric in
        VStack(alignment: .leading, spacing: 12) {
          HStack {
            Text(metric.title)
              .font(.headline)
            Spacer()
            StatusBadge(text: metric.state.label, state: metric.state)
          }

          Text(metric.value)
            .font(.system(size: 32, weight: .semibold, design: .rounded))
            .foregroundStyle(.primary)

          Text(metric.caption)
            .font(.callout)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)

          Text(metric.trend)
            .font(.caption.weight(.medium))
            .foregroundStyle(.tertiary)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 8))
      }
    }
  }
}

struct WorkItemsPanel: View {
  let section: WaselSection
  let items: [WaselWorkItem]

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("\(section.title) Work Surface")
        .font(.title2.weight(.semibold))

      VStack(spacing: 0) {
        ForEach(items) { item in
          HStack(alignment: .top, spacing: 14) {
            Image(systemName: item.status == .ready ? "checkmark.circle.fill" : "circle.dashed")
              .foregroundStyle(item.status == .ready ? .green : .secondary)
              .frame(width: 22)

            VStack(alignment: .leading, spacing: 5) {
              HStack {
                Text(item.title)
                  .font(.headline)
                Spacer()
                StatusBadge(text: item.status.label, state: item.status.metricState)
              }

              Text(item.detail)
                .font(.callout)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            }
          }
          .padding(.vertical, 14)

          if item.id != items.last?.id {
            Divider()
              .padding(.leading, 36)
          }
        }
      }
      .padding(.horizontal, 16)
      .background(.regularMaterial)
      .clipShape(RoundedRectangle(cornerRadius: 8))
    }
  }
}

struct StatusBadge: View {
  let text: String
  let state: WaselMetricState

  var body: some View {
    Text(text)
      .font(.caption.weight(.semibold))
      .padding(.horizontal, 8)
      .padding(.vertical, 4)
      .foregroundStyle(foreground)
      .background(background)
      .clipShape(Capsule())
  }

  private var foreground: Color {
    switch state {
    case .good:
      .green
    case .warning:
      .orange
    case .attention:
      .red
    }
  }

  private var background: Color {
    foreground.opacity(0.14)
  }
}

private extension WaselWorkStatus {
  var metricState: WaselMetricState {
    switch self {
    case .ready:
      .good
    case .planned:
      .warning
    case .blocked:
      .attention
    }
  }
}
