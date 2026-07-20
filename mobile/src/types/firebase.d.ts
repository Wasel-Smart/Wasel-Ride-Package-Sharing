declare module '@react-native-firebase/analytics' {
  function analytics(): {
    setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
    setUserId(userId: string): Promise<void>;
    logScreen(screenName: string): Promise<void>;
    logEvent(name: string, params?: Record<string, string | number | boolean | null>): Promise<void>;
  };

  export default analytics;
}

declare module '@react-native-firebase/crashlytics' {
  function crashlytics(): {
    setAttribute(key: string, value: string): Promise<void>;
    log(message: string): void;
    recordError(error: Error): void;
  };

  export default crashlytics;
}
