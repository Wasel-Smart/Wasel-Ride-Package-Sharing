import Foundation

struct WaselSnapshot {
  var lastUpdated: Date
  var health: String
  var metrics: [WaselMetric]
  var sections: [WaselSection: [WaselWorkItem]]

  static let sample = WaselSnapshot(
    lastUpdated: .now,
    health: "Operational",
    metrics: [
      WaselMetric(
        title: "Production Pods",
        value: "13",
        caption: "Ready in wasel-production",
        trend: "All online",
        state: .good
      ),
      WaselMetric(
        title: "Core Flows",
        value: "7",
        caption: "Rides, packages, bus, wallet, trust, ops, auth",
        trend: "Native shell mapped",
        state: .good
      ),
      WaselMetric(
        title: "Telemetry",
        value: "OSLog",
        caption: "Window, sidebar, commands, refresh",
        trend: "Filter by online.wasel.mac",
        state: .good
      ),
      WaselMetric(
        title: "macOS Build",
        value: "Pending",
        caption: "Requires macOS with Swift 5.9+",
        trend: "Not verifiable on Windows",
        state: .warning
      )
    ],
    sections: [
      .commandCenter: [
        WaselWorkItem("Review live network readiness", "Summarizes fleet, bus, package, and wallet surfaces in one desktop view.", .ready),
        WaselWorkItem("Refresh production state", "Command-R updates the shell timestamp and emits telemetry.", .ready),
        WaselWorkItem("Open native settings", "Dedicated Settings scene keeps preferences out of the main workspace.", .ready)
      ],
      .rides: [
        WaselWorkItem("Find ride demand board", "Desktop detail surface for live passenger demand and route matching.", .ready),
        WaselWorkItem("Offer ride operations", "Keeps driver supply, seats, and verification visible without mobile push navigation.", .ready),
        WaselWorkItem("Trip exception review", "Mac-friendly queue for cancellations, disputes, and reassignments.", .planned)
      ],
      .packages: [
        WaselWorkItem("Package tracking lane", "Shows sender, carrier, and checkpoint status in a scan-friendly list.", .ready),
        WaselWorkItem("Return workflow", "Reserved for return package handling and proof-of-handoff review.", .planned)
      ],
      .bus: [
        WaselWorkItem("Corridor board", "Maps Jordan bus corridor demand into a stable desktop work surface.", .ready),
        WaselWorkItem("Stop reliability", "Tracks late arrivals, crowding, and service advisories.", .planned)
      ],
      .wallet: [
        WaselWorkItem("Payment health", "Surfaces capture, refund, payout, and failed payment queues.", .ready),
        WaselWorkItem("Driver payout review", "Separates operator review from rider-facing wallet flows.", .planned)
      ],
      .operations: [
        WaselWorkItem("Worker status", "Reflects matching, notification, ops, package, payment, and web readiness.", .ready),
        WaselWorkItem("SLO review", "Keeps availability, latency, and incident signals in the operator workspace.", .ready),
        WaselWorkItem("Log filter", "Use subsystem online.wasel.mac to verify native UI telemetry.", .ready)
      ],
      .trust: [
        WaselWorkItem("Identity review", "Dedicated queue for safety and account verification work.", .ready),
        WaselWorkItem("Support risk triage", "Turns high-risk support items into an operator-first desktop list.", .planned)
      ]
    ]
  )
}

struct WaselMetric: Identifiable {
  let id = UUID()
  let title: String
  let value: String
  let caption: String
  let trend: String
  let state: WaselMetricState

  init(title: String, value: String, caption: String, trend: String, state: WaselMetricState) {
    self.title = title
    self.value = value
    self.caption = caption
    self.trend = trend
    self.state = state
  }
}

enum WaselMetricState {
  case good
  case warning
  case attention

  var label: String {
    switch self {
    case .good:
      "Good"
    case .warning:
      "Review"
    case .attention:
      "Action"
    }
  }
}

struct WaselWorkItem: Identifiable {
  let id = UUID()
  let title: String
  let detail: String
  let status: WaselWorkStatus

  init(_ title: String, _ detail: String, _ status: WaselWorkStatus) {
    self.title = title
    self.detail = detail
    self.status = status
  }
}

enum WaselWorkStatus {
  case ready
  case planned
  case blocked

  var label: String {
    switch self {
    case .ready:
      "Ready"
    case .planned:
      "Planned"
    case .blocked:
      "Blocked"
    }
  }
}
