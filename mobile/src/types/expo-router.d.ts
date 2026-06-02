declare module 'expo-router' {
  import type { ComponentType, ReactNode } from 'react';
  import type { TextStyle, ViewStyle } from 'react-native';

  export const Stack: ComponentType<{
    screenOptions?: Record<string, unknown>;
    children?: ReactNode;
  }>;

  export const Link: ComponentType<{
    href: string;
    style?: TextStyle | ViewStyle;
    children?: ReactNode;
  }>;
}
