// swift-tools-version: 5.9

import PackageDescription

let package = Package(
  name: "WaselMac",
  platforms: [
    .macOS(.v14)
  ],
  products: [
    .executable(name: "WaselMac", targets: ["WaselMac"])
  ],
  targets: [
    .executableTarget(
      name: "WaselMac",
      path: "Sources/WaselMac"
    )
  ]
)
