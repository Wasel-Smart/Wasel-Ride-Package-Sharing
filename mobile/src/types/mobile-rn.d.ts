declare module 'react-native' {
  import * as React from 'react';
  
  export const StatusBar: any;
  export const StyleSheet: any;
  export const Text: any;
  export const View: any;
  export const ScrollView: any;
  export const TextInput: any;
  export const Image: any;
  export const Pressable: any;
  export const TouchableOpacity: any;
  export const ActivityIndicator: any;
  export const FlatList: any;
  export const KeyboardAvoidingView: any;
  export const Platform: any;
  export const Alert: any;
  export const Animated: any;
  export const Linking: any;
  export const PermissionsAndroid: any;
  export const I18nManager: any;
  export const PixelRatio: any;
  export const useWindowDimensions: any;
  export const NativeModules: any;
  export const Dimensions: any;
  export const requireNativeComponent: any;
  export const UIManager: any;
  export const findNodeHandle: any;
  export const createRef: any;
  export const useCallback: any;
  export const useEffect: any;
  export const useState: any;
  export const useMemo: any;
  export const useRef: any;
  export const useContext: any;
  export const useReducer: any;
  export const useLayoutEffect: any;
  export const useImperativeHandle: any;
  export const useDebugValue: any;
  export const forwardRef: any;
  export const memo: any;
  export const lazy: any;
  export const Suspense: any;
  export const ErrorBoundary: any;
  export const Component: any;
  export const PureComponent: any;
  export const Switch: any;

  export type StyleProp<T> = any;
  export type ViewStyle = any;
  export type TextStyle = any;
  export type GestureResponderEvent = any;
  export type FlatList<T> = any;
  export type ScrollView = any;
  export type SwitchProps = any;
}

declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
  export const SafeAreaView: any;
}

declare module 'expo-notifications' {
  export const setNotificationHandler: any;
  export const getPermissionsAsync: any;
  export const requestPermissionsAsync: any;
  export const getExpoPushTokenAsync: any;
  export const setNotificationChannelAsync: any;
  export const AndroidImportance: any;
  export const addPushTokenListener: any;
  export const addNotificationReceivedListener: any;
  export const addNotificationResponseReceivedListener: any;
  export const scheduleNotificationAsync: any;
  export const cancelAllScheduledNotificationsAsync: any;
  export const setBadgeCountAsync: any;
  export namespace Notifications {
    export type Notification = any;
    export type NotificationResponse = any;
  }
}

declare module 'react-native-mmkv' {
  export const MMKV: any;
}

declare module 'react-native-permissions' {
  export const request: any;
  export const PERMISSIONS: any;
  export const RESULTS: any;
}

declare module '@testing-library/react-native' {
  export const render: any;
  export const fireEvent: any;
}

declare const __DEV__: boolean;
