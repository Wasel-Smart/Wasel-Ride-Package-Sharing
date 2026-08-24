const React = require('react');

function component(name) {
  return React.forwardRef(({ children, testID, accessibilityLabel, disabled, onPress, ...props }, ref) =>
    React.createElement(
      name,
      { ...props, ref, testID, accessibilityLabel, disabled, onPress: disabled ? undefined : onPress },
      children,
    ),
  );
}

const ReactNative = {
  View: component('View'),
  Text: component('Text'),
  ScrollView: component('ScrollView'),
  TextInput: component('TextInput'),
  Image: component('Image'),
  Pressable: component('Pressable'),
  TouchableOpacity: component('TouchableOpacity'),
  ActivityIndicator: component('ActivityIndicator'),
  FlatList: component('FlatList'),
  KeyboardAvoidingView: component('KeyboardAvoidingView'),
  Switch: component('Switch'),
  Modal: component('Modal'),
  StatusBar: component('StatusBar'),
  Animated: {
    View: component('AnimatedView'),
    Text: component('AnimatedText'),
    Value: jest.fn(() => ({ setValue: jest.fn(), interpolate: jest.fn() })),
    timing: jest.fn(() => ({ start: jest.fn(callback => callback?.()) })),
    spring: jest.fn(() => ({ start: jest.fn(callback => callback?.()) })),
  },
  Alert: { alert: jest.fn() },
  NativeModules: { BlobModule: {}, Networking: {}, PlatformConstants: { forceTouchAvailable: false } },
  Linking: { openURL: jest.fn(), canOpenURL: jest.fn().mockResolvedValue(true) },
  Platform: { OS: 'ios', select: values => values?.ios ?? values?.default },
  I18nManager: { isRTL: false, allowRTL: jest.fn(), forceRTL: jest.fn() },
  PixelRatio: { get: jest.fn(() => 2) },
  Dimensions: { get: jest.fn(() => ({ width: 390, height: 844, scale: 2, fontScale: 1 })) },
  useWindowDimensions: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  StyleSheet: {
    create: styles => styles,
    flatten: style => (Array.isArray(style) ? Object.assign({}, ...style) : style),
    hairlineWidth: 1,
    absoluteFillObject: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  },
};

module.exports = ReactNative;
