# Wasel Native Mobile Shells

This folder contains first-party native shell scaffolds for Android and iOS so the Wasel application is not limited to a web-only repository.

## Android

- Package/application id: `online.wasel14.app`
- Main activity: `native/android/app/src/main/java/online/wasel14/app/MainActivity.kt`
- Permissions: internet, precise/coarse location, notifications
- Deep link host: `https://wasel14.online`
- Runtime target: production Wasel web app URL with `?source=android`

## iOS

- Bundle id: `online.wasel14.app`
- Entry point: `native/ios/Wasel/AppDelegate.swift`
- Runtime target: production Wasel web app URL with `?source=ios`
- Usage descriptions cover location, app activity, and remote notifications

## Release rule

The native shells are release scaffolds. Store builds still require platform SDKs, signing, final icons/splash export, and app-store metadata in CI/release infrastructure.
