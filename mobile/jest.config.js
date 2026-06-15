process.env.NODE_ENV = 'test';

module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transform: {
    '^.+\\.(js|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|expo|@expo|@react-navigation)',
  ],
  moduleNameMapper: {
    '^react-native/Libraries/Utilities/Platform$': '<rootDir>/src/test/mocks/Platform.js',
    '^\\.\\./Utilities/Platform$': '<rootDir>/src/test/mocks/Platform.js',
  },
};
