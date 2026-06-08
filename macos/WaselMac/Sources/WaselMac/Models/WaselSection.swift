import Foundation
import SwiftUI

enum WaselSection: String, CaseIterable, Identifiable, Hashable {
  case commandCenter
  case rides
  case packages
  case bus
  case wallet
  case operations
  case trust

  var id: String { rawValue }

  var title: String {
    switch self {
    case .commandCenter:
      "Command Center"
    case .rides:
      "Rides"
    case .packages:
      "Packages"
    case .bus:
      "Bus"
    case .wallet:
      "Wallet"
    case .operations:
      "Operations"
    case .trust:
      "Trust"
    }
  }

  var subtitle: String {
    switch self {
    case .commandCenter:
      "Network pulse and launch readiness"
    case .rides:
      "Passenger and driver movement"
    case .packages:
      "Courier and package lanes"
    case .bus:
      "Corridors, stops, and demand"
    case .wallet:
      "Payments and payouts"
    case .operations:
      "SLOs, workers, and incidents"
    case .trust:
      "Safety, identity, and support"
    }
  }

  var systemImage: String {
    switch self {
    case .commandCenter:
      "square.grid.2x2"
    case .rides:
      "car.side"
    case .packages:
      "shippingbox"
    case .bus:
      "bus"
    case .wallet:
      "creditcard"
    case .operations:
      "chart.line.uptrend.xyaxis"
    case .trust:
      "shield.checkered"
    }
  }

  var shortcut: KeyEquivalent {
    switch self {
    case .commandCenter:
      "1"
    case .rides:
      "2"
    case .packages:
      "3"
    case .bus:
      "4"
    case .wallet:
      "5"
    case .operations:
      "6"
    case .trust:
      "7"
    }
  }
}
