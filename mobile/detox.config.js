/**
 * Detox E2E Tests Configuration
 */
const config = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  configurations: {
    'ios.sim.debug': {
      type: 'ios',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/Wasel.app',
      build: 'xcodebuild -workspace ios/Wasel.xcworkspace -scheme Wasel -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
      device: {
        type: 'iPhone 15',
      },
    },
    'android.emu.debug': {
      type: 'android.emulator',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
      device: {
        avdName: 'Pixel_4_API_34',
      },
    },
  },
};

module.exports = config;