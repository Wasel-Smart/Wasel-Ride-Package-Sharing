# Wasel Mobile - React Native App

Native iOS and Android application for Wasel mobility platform with full feature parity to the web application.

## Features

- ✅ **Authentication**: Email/password + OTP via Supabase Auth
- ✅ **Ride Requests**: Full ride lifecycle from request to completion
- ✅ **Real-time Tracking**: Live driver location updates via WebSocket
- ✅ **Payments**: Integrated with Stripe for secure payments
- ✅ **Push Notifications**: Rich notifications for ride updates
- ✅ **Ride History**: View past rides and receipts
- ✅ **Driver Ratings**: Rate drivers after ride completion
- ✅ **Offline Support**: Basic offline functionality (roadmap)

## Technology Stack

- **Framework**: React Native 0.76
- **Navigation**: React Navigation 7
- **State Management**: React Query + Context API
- **Maps**: react-native-maps (Google Maps + Apple Maps)
- **Location**: react-native-geolocation-service
- **Push Notifications**: @notifee/react-native + react-native-push-notification
- **Auth**: @supabase/supabase-js
- **WebSockets**: socket.io-client
- **Type Safety**: TypeScript 5.9

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
- React Native CLI

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
# Start Metro bundler
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
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # Business logic services
│   │   ├── auth.ts        # Authentication service
│   │   ├── location.ts    # Location tracking service
│   │   └── ride.ts        # Ride lifecycle service
│   ├── hooks/             # Custom React hooks
│   ├── providers/         # Context providers
│   ├── utils/             # Utility functions
│   ├── styles/            # Global styles
│   └── types/             # TypeScript types
├── android/               # Android native code
├── ios/                   # iOS native code
├── assets/                # Images, fonts, etc.
├── app.json               # App configuration
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript config
```

## Key Services

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

// Subscribe to auth state
const unsubscribe = mobileAuth.subscribe((state) => {
  console.log('Auth state:', state.user);
});
```

### Location Tracking Service

```typescript
import { locationTracking } from './src/services/location';

// Initialize WebSocket connection
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
  (location) => {
    console.log('Driver location:', location);
  }
);

// Stop tracking
locationTracking.stopTracking();
```

### Ride Lifecycle Service

```typescript
import { rideLifecycle } from './src/services/ride';

// Request a ride
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

// Get active ride
const activeRide = await rideLifecycle.getActiveRide();

// Cancel ride
await rideLifecycle.cancelRide(rideId, 'Changed my mind');

// Rate ride
await rideLifecycle.rateRide(rideId, 5, 'Great driver!');

// Subscribe to ride updates
const unsubscribe = rideLifecycle.subscribe((ride) => {
  console.log('Ride status:', ride?.status);
});
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

## Configuration

### iOS Configuration

1. **Info.plist** - Add required permissions:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Wasel needs your location to find nearby rides</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Wasel needs your location for live tracking</string>

<key>NSCameraUsageDescription</key>
<string>Take photos for driver verification</string>
```

2. **Signing & Capabilities** - Configure in Xcode:
   - Push Notifications
   - Background Modes (Location updates, Remote notifications)
   - Maps

### Android Configuration

1. **AndroidManifest.xml** - Add permissions:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

2. **build.gradle** - Add Google Maps API key:
```gradle
android {
    defaultConfig {
        manifestPlaceholders = [
            googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY"
        ]
    }
}
```

## Push Notifications Setup

### iOS (APNs)

1. Create APNs certificate in Apple Developer Portal
2. Upload certificate to Firebase/Supabase
3. Add Push Notification capability in Xcode
4. Register for notifications in AppDelegate

### Android (FCM)

1. Download `google-services.json` from Firebase
2. Place in `android/app/`
3. Configure in `android/build.gradle`
4. Enable Cloud Messaging in Firebase Console

## Testing

### Unit Tests

```bash
npm test
```

### E2E Tests (Detox)

```bash
# Build for testing
npm run detox:build:ios
npm run detox:build:android

# Run tests
npm run detox:test:ios
npm run detox:test:android
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

### Metro Bundler Issues

```bash
# Clear cache
npm start -- --reset-cache

# Or
npx react-native start --reset-cache
```

## Performance Optimization

- Images optimized with WebP format
- List virtualization with FlashList
- Memoization for expensive renders
- Code splitting with React.lazy
- Bundle size monitoring with Metro stats

## Security

- API keys stored in secure storage
- TLS pinning for production API
- Biometric authentication support
- Jailbreak/root detection
- ProGuard/R8 enabled for Android

## Analytics

- Firebase Analytics integration
- Crash reporting via Sentry
- Performance monitoring
- User behavior tracking

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## License

See [LICENSE](../LICENSE) for license information.

## Support

For issues or questions:
- GitHub Issues: https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/issues
- Email: support@wasel.jo
- Docs: https://docs.wasel.jo
