#!/bin/bash
set -e

# Wasel Mobile App Build & Deployment Script
# Builds Android APK/AAB and iOS IPA for production

echo "🚀 Wasel Mobile App Build System"
echo "=================================="

# Environment validation
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Error: Supabase credentials not set"
    exit 1
fi

PLATFORM=${1:-all}
BUILD_TYPE=${2:-release}

cd mobile

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build Android
if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
    echo "🤖 Building Android app..."
    
    # Bundle JavaScript
    npx react-native bundle \
        --platform android \
        --dev false \
        --entry-file index.js \
        --bundle-output android/app/src/main/assets/index.android.bundle \
        --assets-dest android/app/src/main/res
    
    cd android
    
    # Build APK
    echo "📱 Generating APK..."
    ./gradlew assembleRelease
    
    # Build AAB for Play Store
    echo "📦 Generating AAB for Play Store..."
    ./gradlew bundleRelease
    
    echo "✅ Android build complete:"
    echo "   APK: android/app/build/outputs/apk/release/app-release.apk"
    echo "   AAB: android/app/build/outputs/bundle/release/app-release.aab"
    
    cd ..
fi

# Build iOS
if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
    echo "🍎 Building iOS app..."
    
    # Bundle JavaScript
    npx react-native bundle \
        --platform ios \
        --dev false \
        --entry-file index.js \
        --bundle-output ios/main.jsbundle \
        --assets-dest ios
    
    cd ios
    
    # Install pods
    echo "📦 Installing CocoaPods..."
    pod install
    
    # Build IPA
    echo "📱 Generating IPA..."
    xcodebuild \
        -workspace Wasel.xcworkspace \
        -scheme Wasel \
        -configuration Release \
        -archivePath build/Wasel.xcarchive \
        archive
    
    xcodebuild \
        -exportArchive \
        -archivePath build/Wasel.xcarchive \
        -exportPath build \
        -exportOptionsPlist ExportOptions.plist
    
    echo "✅ iOS build complete:"
    echo "   IPA: ios/build/Wasel.ipa"
    
    cd ..
fi

cd ..

echo ""
echo "🎉 Mobile app build complete!"
echo ""
echo "Next steps:"
echo "  - Upload APK/AAB to Google Play Console"
echo "  - Upload IPA to App Store Connect via Xcode or Transporter"
echo "  - Configure push notification certificates"
echo "  - Submit for review"
