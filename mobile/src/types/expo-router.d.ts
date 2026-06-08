declare module 'expo-router' {
  import type { ComponentType, ReactNode } from 'react';
  import type { TextStyle, ViewStyle } from 'react-native';

  export const Stack: ComponentType<{
    screenOptions?: Record<string, unknown>;
    children?: ReactNode;
  }>;

  export const Tabs: ComponentType<{
    screenOptions?: Record<string, unknown> | ((props: { route: { name: string } }) => Record<string, unknown>);
    children?: ReactNode;
  }> & {
    Screen: ComponentType<{
      name: string;
      options?: Record<string, unknown>;
    }>;
  };

  export const Link: ComponentType<{
    href: string;
    style?: TextStyle | ViewStyle;
    testID?: string;
    children?: ReactNode;
  }>;
}
