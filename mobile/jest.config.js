module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native$': '<rootDir>/test/react-native-mock.js',
    '^react-native-url-polyfill/auto$': '<rootDir>/test/empty-module.js',
  },
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|expo-.*|@expo-.*|@react-navigation|@tanstack|zustand|socket.io-client|react-native-mmkv|@sentry|@react-native-firebase|@testing-library/react-native))',
  ],
  coverageThreshold: {
    global: {
      statements: 75,
      branches: 60,
      functions: 90,
      lines: 85,
    },
  },
};
