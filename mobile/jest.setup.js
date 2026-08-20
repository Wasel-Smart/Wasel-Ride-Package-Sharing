import '@testing-library/jest-native/extend-expect';

jest.mock('react-native-screens', () => ({
  ...jest.requireActual('react-native-screens'),
  enableScreens: jest.fn(),
  enableFreeze: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 0, Medium: 1, Heavy: 2 },
}));

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  withScope: jest.fn(callback => callback({
    setTag: jest.fn(),
    setExtra: jest.fn(),
    captureException: jest.fn(),
  })),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'token-123' }),
  addPushTokenListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  getDeviceNameAsync: jest.fn().mockResolvedValue('TestDevice'),
  osName: 'iOS',
  osVersion: '17.0',
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {},
    },
    easConfig: { projectId: 'test-project' },
    installationId: 'test-installation-id',
    manifest: {},
    appOwnership: 'expo',
  },
}));
