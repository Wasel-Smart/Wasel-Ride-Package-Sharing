module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|expo-.*|@expo-.*|@react-navigation|@tanstack|zustand|socket.io-client|react-native-mmkv|@sentry|@react-native-firebase))',
  ],
};
