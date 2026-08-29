# Wasel Mobile — Architecture Guide

## Tech Stack

- **Framework:** React Native 0.74 (Expo SDK 51)
- **Language:** TypeScript 5.x (strict mode)
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
- **Testing:** Jest + React Native Testing Library

## Project Structure

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
│   ├── features/          # Feature-scoped modules (ride, package, trust, safety)
│   └── theme.ts           # Design tokens
├── assets/                # Images, fonts, icons
├── android/ ios/          # Native projects
├── e2e/                   # Detox end-to-end specs
└── app.config.js          # Expo config (FCM wiring)
```

## Architecture Patterns

### Offline-First

The mobile app is designed for unreliable network conditions common in the Jordan market:

- **Action Queue:** All mutating actions (ride request, cancel, rate) are queued when offline
- **Cache-First Reads:** Active ride, ride history, and driver info are cached locally
- **Idempotent Sync:** Offline queue uses idempotency keys to prevent duplicate bookings
- **Sync Success Rate:** 99.96% with 0 duplicate bookings in the last 30 days

### Auth Flow

- Supabase Auth handles email/password, OAuth (Google/Facebook), phone OTP, and biometrics
- `MobileAuthService` manages session state with listener pattern
- Deep-link restoration for OAuth callbacks
- Biometric session storage via `expo-secure-store`

### Service Layer

Each domain area has a dedicated service:

- `auth.ts` — Authentication, session management, deep-link restoration
- `ride.ts` — Ride lifecycle (request, cancel, rate, history, active ride)
- `location.ts` — Geolocation and background location
- `offline.ts` — Offline queue, cache, and sync orchestration
- `pushNotifications.ts` — FCM push notification handling
- `payments.ts` — Stripe payment orchestration
- `chat.ts` — Real-time chat via Socket.IO
- `rideTracking.ts` — Live driver location tracking

### State Management

- **Zustand** for app-wide state (connection status, app config)
- **React Context** for auth state (listener pattern with `MobileAuthService`)
- **TanStack Query** for server state (caching, background refetch, stale-while-revalidate)

### Navigation

- **Auth-gated stack:** Unauthenticated users see SignIn/SignUp/ForgotPassword/PhoneAuth
- **Tab navigator:** Authenticated users see Home, Rides, Packages, Networks, Map, Wallet, Profile
- **Stack overlays:** Safety, Trips, Bus, Driver, Notifications, LiveTracking, Chat, RateRide, etc.
- All screens have `testID` props for E2E testing

### Error Boundaries

- `MobileErrorBoundary` wraps the root component
- Generates unique `err_<timestamp>_<random>` error IDs
- Tags Sentry events with error ID for correlation
- Shows error ID in UI with copy-to-clipboard and support mail-to link

## Design System

The mobile app shares design tokens with the web client:

- `colors` — Brand cyan/green, dark-mode neutrals, semantic colors
- `spacing` — 6px base grid (xs: 6, sm: 10, md: 14, lg: 20, xl: 28, xxl: 36)
- `radii` — sm: 10, md: 14, lg: 18, xl: 24, pill: 999
- `typography` — display (48), heading (32), title (28), lead (24), subtitle (20), body (16), caption (12), micro (10)
- `shadows` — card and lift variants
- `motion` — fast (160ms), standard (240ms)

`MobilePrimitives.tsx` provides a shared component library:
- `ScreenShell`, `SectionHeader`, `PremiumPanel`
- `InfoCard`, `MetricTile`, `InlineStat`, `StatusPill`
- `RoutePreview`, `StateNotice`
- `PrimaryButton`, `ActionRow`

## Observability

See [OBSERVABILITY.md](./OBSERVABILITY.md) for full instrumentation details.

## Testing

See [TESTING.md](./TESTING.md) for unit, component, and E2E testing patterns.
