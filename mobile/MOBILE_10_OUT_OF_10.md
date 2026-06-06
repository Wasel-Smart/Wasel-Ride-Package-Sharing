# Wasel Mobile - React Native App

Native iOS and Android application for Wasel mobility platform with **full offline mode support** and **E2E testing**.

## ✅ 10/10 Features

### Complete Feature Set
- ✅ **Authentication**: Email/password + OTP via Supabase Auth
- ✅ **Ride Requests**: Full ride lifecycle from request to completion
- ✅ **Real-time Tracking**: Live driver location updates via WebSocket
- ✅ **Payments**: Integrated with Stripe for secure payments
- ✅ **Push Notifications**: Rich notifications for ride updates
- ✅ **Ride History**: View past rides and receipts
- ✅ **Driver Ratings**: Rate drivers after ride completion
- ✅ **Offline Mode**: Full offline support with automatic sync ⭐ NEW
- ✅ **E2E Testing**: Detox test suite for production quality ⭐ NEW

## 🔥 Offline Mode (Production-Ready)

### Network State Management
- Automatic network detection with NetInfo
- Real-time online/offline status indicators
- Graceful degradation when offline

### Offline Queue System
- Automatic queuing of actions when offline:
  - Ride requests
  - Ride cancellations
  - Driver ratings
  - Profile updates
- Persistent queue storage with AsyncStorage
- Retry logic with exponential backoff (max 3 retries)
- Dead-letter queue for failed actions

### Data Caching
- **Ride History**: 24-hour cache
- **Active Rides**: 1-hour cache
- **Driver Info**: 2-hour cache
- Automatic cache invalidation
- Manual cache clearing from settings

### Auto-Sync
- Automatic sync when network returns
- Manual sync trigger from settings
- Sync progress indicators
- Conflict resolution

### Usage Example

```typescript
import { offlineService } from './services/offline';
import { useOffline } from './hooks/useOffline';

// Hook usage in components
function MyComponent() {
  const { isOnline, queueSize, sync, isSyncing } = useOffline();
  
  return (
    <View>
      {!isOnline && <Text>Offline Mode - {queueSize} actions queued</Text>}
      {isOnline && queueSize > 0 && (
        <Button onPress={sync} disabled={isSyncing}>
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      )}
    </View>
  );
}

// Service usage
async function requestRide(data) {
  if (!offlineService.isDeviceOnline()) {
    // Automatically queued for later sync
    await offlineService.queueOfflineAction({
      type: 'RIDE_REQUEST',
      payload: data,
    });
    return { queued: true };
  }
  
  // Normal online request
  return await apiRequest(data);
}
```

## 🧪 E2E Testing with Detox

### Test Suite Coverage
- ✅ **Authentication Flow**: Sign in, sign up, sign out, session persistence
- ✅ **Ride Request Flow**: Request, match, cancel, rate, history
- ✅ **Offline Mode**: Network detection, queue, sync, cache
- ✅ **Real-time Features**: Live tracking, map updates
- ✅ **Payment Flow**: Payment method, processing, confirmation

### Running E2E Tests

```bash
# Install Detox CLI globally
npm install -g detox-cli

# Build test app (iOS)
npm run build:e2e:ios

# Build test app (Android)
npm run build:e2e:android

# Run tests (iOS)
npm run test:e2e:ios

# Run tests (Android)
npm run test:e2e:android

# Run specific test file
detox test e2e/auth.test.ts --configuration ios.sim.debug

# Run with debug logs
detox test --configuration ios.sim.debug --loglevel trace
```

### Test Configuration

Detox configuration in `.detoxrc.js`:
- iOS Simulator: iPhone 15 Pro
- Android Emulator: Pixel 5 API 33
- Test timeout: 120 seconds
- Permissions: Location, notifications, camera

### Writing New Tests

```typescript
import { device, element, by, expect as detoxExpect } from 'detox';

describe('My Feature', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should do something', async () => {
    await element(by.id('my-button')).tap();
    await detoxExpect(element(by.id('result'))).toBeVisible();
  });
});
```

## Technology Stack

- **Framework**: React Native 0.74 (Expo 51)
- **Navigation**: Expo Router
- **State Management**: React Query + Zustand
- **Maps**: react-native-maps (Google Maps + Apple Maps)
- **Location**: expo-location + react-native-geolocation-service
- **Push Notifications**: expo-notifications + @notifee/react-native
- **Offline Storage**: AsyncStorage + MMKV
- **Network Detection**: @react-native-community/netinfo
- **Auth**: @supabase/supabase-js
- **WebSockets**: socket.io-client
- **Testing**: Detox + Jest
- **Type Safety**: TypeScript 5.3

## Prerequisites

### iOS Development
- macOS (required for iOS development)
- Xcode 15+
- CocoaPods
- iOS Simulator or physical device

### Android Development
- Android Studio
- JDK 17+
- Android SDK 33+
- Android Emulator or physical device

### Common
- Node.js >= 20.0.0
- npm >= 10.0.0
- Expo CLI

## Quick Start

### 1. Install Dependencies

```bash
cd mobile
npm install

# iOS only - install pods
cd ios && pod install && cd ..
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Update with your values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://wasel.jo/api
EXPO_PUBLIC_WS_URL=wss://wasel.jo/ws
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

### 3. Run Development Server

```bash
# Start Expo dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Project Structure

```
mobile/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/            # Base UI components
│   │   └── OfflineBanner.tsx  # Offline indicator
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # Business logic services
│   │   ├── auth.ts        # Authentication service
│   │   ├── location.ts    # Location tracking service
│   │   ├── ride.ts        # Ride lifecycle service
│   │   └── offline.ts     # Offline mode service ⭐
│   ├── hooks/             # Custom React hooks
│   │   └── useOffline.ts  # Offline mode hook ⭐
│   ├── providers/         # Context providers
│   ├── utils/             # Utility functions
│   ├── styles/            # Global styles
│   └── types/             # TypeScript types
├── e2e/                   # E2E tests with Detox ⭐
│   ├── auth.test.ts       # Authentication tests
│   ├── ride-request.test.ts  # Ride flow tests
│   ├── offline.test.ts    # Offline mode tests ⭐
│   ├── jest.config.js     # Jest configuration
│   └── setup.ts           # Test setup
├── android/               # Android native code
├── ios/                   # iOS native code
├── assets/                # Images, fonts, etc.
├── .detoxrc.js            # Detox configuration ⭐
├── app.json               # App configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Key Services

### Offline Service

```typescript
import { offlineService } from './src/services/offline';

// Check network state
const isOnline = offlineService.isDeviceOnline();

// Subscribe to network changes
const unsubscribe = offlineService.subscribeToNetworkState((online) => {
  console.log('Network:', online ? 'online' : 'offline');
});

// Queue action for later sync
await offlineService.queueOfflineAction({
  type: 'RIDE_REQUEST',
  payload: { ... },
});

// Manually sync queue
await offlineService.syncOfflineQueue();

// Cache data
await offlineService.cacheData('key', data, 3600000);

// Get cached data
const cached = await offlineService.getCachedData('key');

// Get stats
const stats = await offlineService.getOfflineStats();
// { queueSize: 3, cacheSize: 12, isOnline: true }
```

### Authentication Service

```typescript
import { mobileAuth } from './src/services/auth';

// Sign in
const { error } = await mobileAuth.signInWithEmail(email, password);

// Sign up
await mobileAuth.signUpWithEmail(email, password, { name: 'John' });

// Phone OTP
await mobileAuth.signInWithPhone('+962791234567');
await mobileAuth.verifyOtp(phone, token);

// Sign out
await mobileAuth.signOut();
```

### Location Tracking Service

```typescript
import { locationTracking } from './src/services/location';

// Initialize WebSocket
await locationTracking.initialize();

// Start tracking (driver mode)
await locationTracking.startTracking((location) => {
  console.log('Current location:', location);
}, {
  interval: 5000,      // 5 seconds
  distanceFilter: 10,  // 10 meters
});

// Subscribe to driver location (rider mode)
const unsubscribe = locationTracking.subscribeToDriver(
  'driver-123',
  (location) => console.log('Driver location:', location)
);

// Stop tracking
locationTracking.stopTracking();
```

### Ride Lifecycle Service

```typescript
import { rideLifecycle } from './src/services/ride';

// Request a ride (automatically handles offline)
const { ride, error } = await rideLifecycle.requestRide({
  origin: {
    latitude: 31.9539,
    longitude: 35.9106,
    address: 'Downtown Amman',
  },
  destination: {
    latitude: 31.9675,
    longitude: 35.8825,
    address: 'Abdali',
  },
  seats: 2,
});

// Get active ride (with offline cache fallback)
const activeRide = await rideLifecycle.getActiveRide();

// Cancel ride (queued if offline)
await rideLifecycle.cancelRide(rideId, 'Changed my mind');

// Rate ride (queued if offline)
await rideLifecycle.rateRide(rideId, 5, 'Great driver!');

// Get ride history (cached for offline viewing)
const history = await rideLifecycle.getRideHistory();
```

## Building for Production

### iOS

```bash
# Archive for App Store
npm run build:ios

# Or manually
cd ios
xcodebuild -workspace Wasel.xcworkspace \
  -scheme Wasel \
  -configuration Release \
  -archivePath ./build/Wasel.xcarchive \
  archive
```

### Android

```bash
# Build APK
npm run build:android

# Or build AAB for Play Store
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests

```bash
# Build and run iOS tests
npm run build:e2e:ios
npm run test:e2e:ios

# Build and run Android tests
npm run build:e2e:android
npm run test:e2e:android
```

## Configuration

### iOS Configuration

**Info.plist** - Add required permissions:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Wasel needs your location to find nearby rides</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Wasel needs your location for live tracking</string>

<key>NSCameraUsageDescription</key>
<string>Take photos for driver verification</string>
```

**Signing & Capabilities** - Configure in Xcode:
- Push Notifications
- Background Modes (Location updates, Remote notifications)
- Maps

### Android Configuration

**AndroidManifest.xml** - Add permissions:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

## Troubleshooting

### iOS Build Fails

```bash
# Clean build folder
cd ios
rm -rf build
rm -rf Pods
rm Podfile.lock

# Reinstall pods
pod install
```

### Android Build Fails

```bash
# Clean Gradle cache
cd android
./gradlew clean
./gradlew cleanBuildCache

# Rebuild
./gradlew assembleDebug
```

### Detox Tests Fail

```bash
# Rebuild test app
npm run build:e2e:ios

# Clean Detox cache
detox clean-framework-cache
detox build-framework-cache

# Run with debug logs
detox test --configuration ios.sim.debug --loglevel trace
```

## Performance Optimization

- Images optimized with WebP format
- List virtualization with FlashList
- Memoization for expensive renders
- Code splitting with React.lazy
- Bundle size monitoring with Metro stats
- Offline data caching for instant load

## Security

- API keys stored in secure storage (expo-secure-store)
- TLS pinning for production API
- Biometric authentication support (expo-local-authentication)
- Jailbreak/root detection
- ProGuard/R8 enabled for Android
- Offline queue encryption

## Analytics & Monitoring

- Sentry for crash reporting
- Performance monitoring
- User behavior tracking
- Offline sync metrics

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](../LICENSE) for license information.

## Support

For issues or questions:
- GitHub Issues: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/issues
- Email: support@wasel.jo
- Docs: https://docs.wasel.jo

---

🎉 **Wasel Mobile is now 10/10 with full offline mode and E2E testing!**
