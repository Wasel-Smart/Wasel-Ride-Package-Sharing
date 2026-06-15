#!/bin/bash
set -e

# Wasel Mobile App Build & Deployment Script
# Builds Android APK/AAB and iOS IPA for production.

echo "Wasel Mobile App Build System"
echo "=================================="

load_env_file() {
    local file=$1
    local line key value

    if [ -f "$file" ]; then
        while IFS= read -r line || [ -n "$line" ]; do
            line=${line%$'\r'}

            if [[ -z "$line" || "$line" == \#* || "$line" != *=* ]]; then
                continue
            fi

            key=${line%%=*}
            value=${line#*=}
            key=${key#export }

            if [[ ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
                continue
            fi

            if [[ "$value" == \"*\" && "$value" == *\" ]]; then
                value=${value:1:${#value}-2}
            elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
                value=${value:1:${#value}-2}
            fi

            export "$key=$value"
        done < "$file"
    fi
}

load_env_file ".env"
load_env_file ".env.local"

VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-${SUPABASE_URL:-${VITE_SUPABASE_PROJECT_URL:-}}}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-${SUPABASE_ANON_KEY:-${SUPABASE_PUBLISHABLE_KEY:-${VITE_SUPABASE_PUBLISHABLE_KEY:-}}}}

export VITE_SUPABASE_URL
export VITE_SUPABASE_ANON_KEY

# Environment validation
if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "Error: Supabase credentials not set."
    echo "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or provide SUPABASE_URL and SUPABASE_ANON_KEY in .env/.env.local."
    exit 1
fi

PLATFORM=${1:-all}
BUILD_TYPE=${2:-release}
BUILD_IOS=true

if [[ "$PLATFORM" = "ios" && "$OSTYPE" != "darwin"* ]]; then
    echo "Error: iOS release builds require macOS with Xcode and CocoaPods."
    echo "Use npm run mobile:build:android on Windows, or run the iOS build on macOS."
    exit 1
elif [[ "$PLATFORM" = "all" && "$OSTYPE" != "darwin"* ]]; then
    echo "iOS builds require macOS. Continuing with Android only."
    BUILD_IOS=false
fi

cd mobile

echo "Installing dependencies..."
npm install

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
    echo "Building Android app..."

    mkdir -p android/app/src/main/assets

    npx react-native bundle \
        --platform android \
        --dev false \
        --entry-file index.js \
        --bundle-output android/app/src/main/assets/index.android.bundle \
        --assets-dest android/app/src/main/res

    cd android

    echo "Generating APK..."
    ./gradlew assembleRelease

    echo "Generating AAB for Play Store..."
    ./gradlew bundleRelease

    echo "Android build complete:"
    echo "   APK: android/app/build/outputs/apk/release/app-release.apk"
    echo "   AAB: android/app/build/outputs/bundle/release/app-release.aab"

    cd ..
fi

if [[ "$BUILD_IOS" = true && ("$PLATFORM" = "ios" || "$PLATFORM" = "all") ]]; then
    echo "Building iOS app..."

    npx react-native bundle \
        --platform ios \
        --dev false \
        --entry-file index.js \
        --bundle-output ios/main.jsbundle \
        --assets-dest ios

    cd ios

    echo "Installing CocoaPods..."
    pod install

    echo "Generating IPA..."
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

    echo "iOS build complete:"
    echo "   IPA: ios/build/Wasel.ipa"

    cd ..
fi

cd ..

echo ""
echo "Mobile app build complete."
echo ""
echo "Next steps:"
echo "  - Upload APK/AAB to Google Play Console"
echo "  - Upload IPA to App Store Connect via Xcode or Transporter"
echo "  - Configure push notification certificates"
echo "  - Submit for review"
