# Wasel Mobile App - Setup & Installation Guide

## 🎯 Quick Start (5 Minutes)

### 1. Install Dependencies
```bash
cd mobile
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 3. Start Development Server
```bash
npm start
```

### 4. Run on Device/Simulator
```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

---

## 📦 Required Dependencies

### Core Dependencies (Already in package.json)
```json
{
  "@expo/vector-icons": "^14.0.0",
  "@react-native-async-storage/async-storage": "1.23.1",
  "@react-navigation/bottom-tabs": "^6.6.1",
  "@react-navigation/native": "^6.1.18",
  "@react-navigation/native-stack": "^6.11.0",
  "@supabase/supabase-js": "^2.105.4",
  "expo": "~51.0.0",
  "expo-constants": "~16.0.0",
  "expo-font": "~12.0.0",
  "expo-linking": "~6.3.0",
  "expo-location": "~17.0.0",
  "expo-notifications": "~0.28.0",
  "expo-secure-store": "~13.0.0",
  "expo-splash-screen": "~0.27.0",
  "expo-status-bar": "~1.12.0",
  "react": "18.2.0",
  "react-native": "0.74.0",
  "react-native-maps": "1.14.0",
  "react-native-safe-area-context": "4.10.1",
  "react-native-screens": "3.31.1",
  "react-native-url-polyfill": "^2.0.0",
  "react-native-gesture-handler": "~2.17.1"
}
```

### Additional Dependencies to Install
```bash
# Performance & Caching
npm install @tanstack/react-query

# Haptics & Feedback
npm install expo-haptics

# Image Optimization
npm install expo-image

# Biometric Authentication
npm install expo-local-authentication

# Error Tracking
npm install @sentry/react-native

# Animations
npm install react-native-reanimated

# Build Tools
npm install --save-dev @babel/core babel-preset-expo metro-react-native-babel-preset
```

---

## 🔧 Configuration Files Created

### ✅ Completed
1. **tsconfig.json** - TypeScript configuration (FIXED)
2. **app.json** - Expo configuration
3. **babel.config.js** - Babel transpiler config
4. **metro.config.js** - Metro bundler config
5. **.gitignore** - Git ignore rules
6. **.env.example** - Environment template

### ✅ Components Created
1. **src/lib/supabase.ts** - Supabase client
2. **src/components/ErrorBoundary.tsx** - Error handling
3. **src/components/SkeletonLoader.tsx** - Loading states
4. **src/hooks/useHaptics.ts** - Haptic feedback
5. **src/hooks/useDebounce.ts** - Search optimization

---

## 🚀 Build & Deploy

### Development Build
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Create development build
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Production Build
```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### Over-The-Air (OTA) Updates
```bash
# Publish update
eas update --branch production --message "Bug fixes and improvements"
```

---

## 🧪 Testing

### Type Checking
```bash
npm run type-check
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Unit Tests (TODO)
```bash
npm test
```

### E2E Tests (TODO)
```bash
npm run test:e2e
```

---

## 📱 Platform-Specific Setup

### iOS Setup
1. Install Xcode from App Store
2. Install CocoaPods: `sudo gem install cocoapods`
3. Install pods: `cd ios && pod install`
4. Open `ios/WaselMobile.xcworkspace` in Xcode
5. Configure signing & capabilities
6. Add required permissions to Info.plist (already in app.json)

### Android Setup
1. Install Android Studio
2. Install Android SDK (API 33+)
3. Configure environment variables:
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator
   export PATH=$PATH:$ANDROID_HOME/tools
   export PATH=$PATH:$ANDROID_HOME/platform-tools
   ```
4. Create virtual device in AVD Manager
5. Add required permissions to AndroidManifest.xml (already in app.json)

---

## 🔐 Environment Variables

### Required Variables
```bash
# Supabase (REQUIRED)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Google Maps (REQUIRED for maps)
EXPO_PUBLIC_GOOGLE_MAPS_IOS_KEY=your-ios-key
EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY=your-android-key
```

### Optional Variables
```bash
# Sentry (for error tracking)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH=true
EXPO_PUBLIC_ENABLE_LOCATION_SERVICES=true
```

---

## 🐛 Troubleshooting

### TypeScript Errors
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm run type-check
```

### Metro Bundler Issues
```bash
# Clear Metro cache
npx expo start --clear
```

### Build Failures
```bash
# Clean and reinstall
rm -rf node_modules
rm package-lock.json
npm install
```

### iOS Pod Issues
```bash
cd ios
pod deintegrate
pod install
cd ..
```

### Android Gradle Issues
```bash
cd android
./gradlew clean
cd ..
```

---

## 📊 Performance Monitoring

### Bundle Size
```bash
# Analyze bundle
npx expo export --dump-sourcemap
npx source-map-explorer dist/bundles/*.js
```

### Startup Time
- Use React Native Performance Monitor
- Enable in dev menu: Cmd+D (iOS) / Cmd+M (Android)
- Select "Show Perf Monitor"

### Memory Usage
- Use Xcode Instruments (iOS)
- Use Android Studio Profiler (Android)

---

## 🎨 Design System

### Colors
```typescript
const WASEL_COLORS = {
  bg: '#0A1628',
  card: '#0E1D35',
  card2: '#112240',
  cyan: '#00C8E8',
  green: '#00C875',
  gold: '#F0A830',
  border: 'rgba(255,255,255,0.08)',
  text: '#EFF6FF',
  muted: '#5A7A9A',
  sub: '#8AA4C0',
};
```

### Typography
- Headings: SF Pro Display (iOS) / Roboto (Android)
- Body: System default
- Sizes: 12, 14, 16, 18, 20, 24, 32

### Spacing
- Base unit: 4px
- Common: 8, 12, 16, 20, 24, 32, 40, 48

---

## 📚 Resources

### Documentation
- [Expo Docs](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [React Navigation](https://reactnavigation.org/)
- [Supabase Docs](https://supabase.com/docs)

### Tools
- [Expo Go](https://expo.dev/client) - Test on device
- [EAS Build](https://docs.expo.dev/build/introduction/) - Cloud builds
- [EAS Submit](https://docs.expo.dev/submit/introduction/) - App store submission
- [EAS Update](https://docs.expo.dev/eas-update/introduction/) - OTA updates

---

## ✅ Checklist

### Before First Run
- [ ] Install Node.js 20+
- [ ] Install npm 10+
- [ ] Install Expo CLI: `npm install -g expo-cli`
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Create Expo account
- [ ] Configure .env file
- [ ] Install dependencies: `npm install`

### Before Production
- [ ] Configure app.json with correct bundle IDs
- [ ] Add app icons and splash screens
- [ ] Configure push notification credentials
- [ ] Setup Sentry error tracking
- [ ] Configure Google Maps API keys
- [ ] Test on real devices (iOS & Android)
- [ ] Run accessibility audit
- [ ] Test offline functionality
- [ ] Verify biometric authentication
- [ ] Test push notifications
- [ ] Verify location services
- [ ] Check bundle size (<15MB)
- [ ] Test app startup time (<2s)
- [ ] Verify 60 FPS scrolling
- [ ] Test on slow networks
- [ ] Verify error handling
- [ ] Test deep linking
- [ ] Verify analytics tracking

---

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Configure environment**: Copy `.env.example` to `.env`
3. **Start dev server**: `npm start`
4. **Test on device**: Scan QR code with Expo Go
5. **Implement remaining features**: See `MOBILE_EXCELLENCE_ROADMAP.md`
6. **Build for production**: `eas build`
7. **Submit to stores**: `eas submit`

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Wasel-Smart/Wasel-Ride-Package-Sharing/issues)
- **Email**: support@wasel14.online
- **Docs**: See `MOBILE_EXCELLENCE_ROADMAP.md` and `APPLICATION_GAPS_ANALYSIS.md`

---

## 📈 Current Status

- **TypeScript Config**: ✅ Fixed
- **Build Configuration**: ✅ Complete
- **Supabase Integration**: ✅ Ready
- **Error Handling**: ✅ Implemented
- **Loading States**: ✅ Implemented
- **Haptic Feedback**: ✅ Hook ready
- **Search Optimization**: ✅ Hook ready

**Current Rating**: 5.0/10 → Target: 9.0/10

**Next Priority**: Install dependencies and implement pull-to-refresh, loading indicators, and React Query caching.
