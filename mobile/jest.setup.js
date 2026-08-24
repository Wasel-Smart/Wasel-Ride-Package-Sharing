import '@testing-library/jest-native/extend-expect';
import React from 'react';
import TestRenderer from 'react-test-renderer';

if (typeof React.act !== 'function' && typeof TestRenderer.act === 'function') {
  React.act = TestRenderer.act;
}

console.log('jest.setup.js BEFORE polyfill: crypto.randomUUID type:', typeof globalThis.crypto?.randomUUID);
console.log('jest.setup.js BEFORE polyfill: fetch type:', typeof globalThis.fetch);

if (typeof globalThis.crypto !== 'undefined' && !globalThis.crypto.randomUUID) {
  try {
    globalThis.crypto.randomUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  } catch (e) {
    globalThis.crypto = {
      ...globalThis.crypto,
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      },
    };
  }
}

if (typeof globalThis.fetch === 'undefined') {
  const fetchPolyfill = async () => {
    throw new Error('fetch is not defined');
  };
  globalThis.fetch = fetchPolyfill;
  if (typeof global !== 'undefined') {
    global.fetch = fetchPolyfill;
  }
}

console.log('jest.setup.js AFTER polyfill: crypto.randomUUID type:', typeof globalThis.crypto?.randomUUID);
console.log('jest.setup.js AFTER polyfill: fetch type:', typeof globalThis.fetch);

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
