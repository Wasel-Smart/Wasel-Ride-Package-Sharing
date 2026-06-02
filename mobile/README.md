# Wasel Mobile App

React Native (Expo) mobile application for Wasel — ride-sharing & package delivery platform.

## Stack

- **Framework**: Expo SDK 51 + React Native 0.74
- **Navigation**: Expo Router v3 (file-based, deep-link ready)
- **State / Data**: TanStack Query v5 + Zustand
- **Backend**: Supabase (shared with web)
- **Maps**: react-native-maps
- **Payments**: Stripe React Native
- **Auth**: Supabase Auth (phone OTP + Google OAuth)
- **Styling**: NativeWind v4 (Tailwind for RN)
- **Push Notifications**: Expo Notifications (FCM + APNs)
- **Testing**: Jest + React Native Testing Library + Detox (E2E)
- **CI/CD**: EAS Build + EAS Update (OTA) + GitHub Actions
- **Monitoring**: Sentry React Native

## Quick Start

```bash
cd mobile
npm install
npx expo start
```

Press `a` for Android, `i` for iOS, or scan QR with Expo Go.

## Environment

Copy `.env.example` → `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GOOGLE_MAPS_KEY=AIza...
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EXPO_PUBLIC_SENTRY_DSN=https://...
```

## Project Structure

```
mobile/
├── app/                     # Expo Router screens
│   ├── (auth)/              # Auth flow: login, OTP, onboarding
│   ├── (tabs)/              # Main tabs: home, rides, packages, wallet, profile
│   ├── ride/                # Ride booking + live tracking
│   ├── package/             # Package delivery flow
│   └── _layout.tsx
├── src/
│   ├── components/ui/       # Button, Input, Card, Badge, Sheet
│   ├── components/map/      # MapView, DriverMarker, RoutePolyline
│   ├── components/ride/     # RideCard, DriverPanel, StatusBar
│   ├── hooks/               # useRide, useLocation, useWallet
│   ├── services/            # Supabase service layer
│   ├── stores/              # Zustand: auth, ride, location, wallet
│   ├── lib/                 # Supabase, Stripe, Sentry clients
│   └── types/               # Shared TypeScript types
├── __tests__/               # Jest + RNTL tests
├── e2e/                     # Detox E2E tests
├── app.json
├── package.json
└── tsconfig.json
```

## Mobile-Exclusive Features

| Feature | Status |
|---------|--------|
| Push Notifications (FCM + APNs) | ✅ |
| Background Location (driver mode) | ✅ |
| Biometric Authentication | ✅ |
| Offline Mode (MMKV cache) | ✅ |
| Haptic Feedback | ✅ |
| Native Maps (react-native-maps) | ✅ |
| Deep Links (wasel://) | ✅ |
| Widget (iOS Home Screen) | ✅ |

## Scripts

```bash
npm start              # Expo dev server
npm run android        # Android emulator
npm run ios            # iOS simulator
npm test               # Jest unit tests
npm run test:e2e       # Detox E2E (build required)
npm run build:android  # EAS Android build
npm run build:ios      # EAS iOS build
npm run update         # OTA update via EAS Update
npm run type-check     # TypeScript check
npm run lint           # ESLint
```
