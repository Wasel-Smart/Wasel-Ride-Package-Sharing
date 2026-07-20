# Wasel Mobile — React Native Application

**Status: Production-grade (feature-complete mobile client)**

Wasel is a Jordan-focused mobility platform for shared rides, package handoff logistics,
bus corridor discovery, trust workflows, and operator-facing surfaces. This directory is the
**React Native (Expo) mobile client**. It shares domain contracts with the web client and the
Supabase backend.

> The previous README described this as a "20% scaffold with no UI or navigation". That was
> outdated. The mobile app is a full, navigable client with 25+ screens, offline-first sync,
> auth, payments, live tracking, and push notifications.

## Tech stack

- **Framework:** React Native 0.74 (Expo SDK 51)
- **Language:** TypeScript 5.x (strict)
- **Navigation:** React Navigation (bottom tabs + native stack)
- **Server state:** TanStack Query
- **State:** Zustand stores + React Context (auth)
- **Maps:** `react-native-maps` (Google Maps / Apple Maps)
- **Location:** `expo-location` + `react-native-geolocation-service`
- **Auth:** `@supabase/supabase-js` (email, phone OTP, OAuth, biometrics)
- **Payments:** `@stripe/stripe-react-native`
- **Realtime:** `socket.io-client` for live driver/rider location
- **Offline:** local queue + cache (`react-native-mmkv`, AsyncStorage) with online sync
- **Push:** `expo-notifications`
- **Analytics / crash:** `@sentry/react-native`, `@react-native-firebase/*`
- **E2E:** Detox

## Project structure

```
mobile/
├── src/
│   ├── components/        # Reusable UI (MobilePrimitives, ChatThread, banners, boundaries)
│   ├── screens/           # 25+ product screens (ride, packages, map, wallet, safety, ...)
│   ├── navigation/        # AppNavigator (tabs + stack, auth gating)
│   ├── services/          # Business logic: auth, ride, location, payments, offline, push, ...
│   ├── stores/            # Zustand stores (app, connection)
│   ├── hooks/             # useOffline, usePushNotifications
│   ├── providers/         # AuthProvider
│   ├── lib/               # API client, config, query client
│   ├── utils/             # Validation, offline queue, accessibility
│   ├── types/             # Ambient type declarations
│   └── theme.ts           # Design tokens
├── assets/                # Images, fonts, icons
├── android/ ios/          # Native projects
├── e2e/                   # Detox end-to-end specs
├── app.config.js          # Expo config (FCM wiring)
└── app.json               # Expo manifest
```

## Getting started

### Prerequisites

- Node.js 20+ (Expo SDK 51)
- Yarn 1.22+
- For iOS: macOS + Xcode 15+ + CocoaPods
- For Android: Android Studio + JDK 17+ + SDK 33+

### Install

```bash
cd mobile
yarn install
```

### Configure environment

```bash
cp .env.example .env
```

Required values (see `.env.example`):

```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_GOOGLE_MAPS_KEY
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
EXPO_PUBLIC_SUPABASE_FUNCTION_URL
EXPO_PUBLIC_API_URL
EXPO_PUBLIC_WS_URL
```

### Run

```bash
yarn start        # Expo dev server
yarn android      # Android emulator / device
yarn ios          # iOS simulator / device
```

## Quality gates

```bash
yarn type-check   # tsc --noEmit
yarn lint         # eslint (0 warnings allowed)
yarn test         # jest unit tests (services, stores, utils)
yarn test:e2e     # detox end-to-end (requires a built native app)
```

## Notes / known limitations

- Native builds (iOS/Android) require the Google Maps key and (for FCM) `google-services.json`
  placed per the Expo docs; `app.config.js` wires FCM automatically when the file is present.
- Push notifications and live tracking depend on the backend WebSocket / Supabase Realtime
  endpoints being configured in the environment.
