import '@testing-library/react-native/extend-expect';

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

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  FontAwesome: () => null,
  MaterialIcons: () => null,
}));

const RN = require('react-native');

jest.mock('react-native', () => {
  const React = require('react');

  const createPassThrough = (name) => {
    const Component = ({ children, ...props }) => {
      if (children) {
        return React.createElement(React.Fragment, null, children);
      }
      return null;
    };
    Component.displayName = name;
    return Component;
  };

  return {
    ...RN,
    View: createPassThrough('View'),
    Text: createPassThrough('Text'),
    TouchableOpacity: createPassThrough('TouchableOpacity'),
    TouchableWithoutFeedback: createPassThrough('TouchableWithoutFeedback'),
    Pressable: createPassThrough('Pressable'),
    Image: createPassThrough('Image'),
    ImageBackground: createPassThrough('ImageBackground'),
    ScrollView: createPassThrough('ScrollView'),
    FlatList: createPassThrough('FlatList'),
    ActivityIndicator: createPassThrough('ActivityIndicator'),
    TextInput: createPassThrough('TextInput'),
    KeyboardAvoidingView: createPassThrough('KeyboardAvoidingView'),
    SafeAreaView: createPassThrough('SafeAreaView'),
    StatusBar: createPassThrough('StatusBar'),
    RefreshControl: createPassThrough('RefreshControl'),
    SectionList: createPassThrough('SectionList'),
    VirtualizedList: createPassThrough('VirtualizedList'),
    Switch: createPassThrough('Switch'),
    Slider: createPassThrough('Slider'),
    WebView: createPassThrough('WebView'),
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => style,
      hairlineWidth: 1,
    },
    Platform: {
      OS: 'ios',
      select: (obj) => obj.ios || obj.default,
    },
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
      addEventListener: jest.fn(),
    },
    PixelRatio: {
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((size) => size),
    },
  };
});

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
