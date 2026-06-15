declare module '@react-navigation/native' {
  import type { ReactElement, ReactNode } from 'react';

  export interface NavigationContainerProps {
    children?: ReactNode;
    independent?: boolean;
    linking?: unknown;
    onStateChange?: (state: unknown) => void;
    initialState?: unknown;
    theme?: unknown;
  }

  export function NavigationContainer(props: NavigationContainerProps): ReactElement;
  export function useNavigation<T = unknown>(): T;
  export function useRoute<T = unknown>(): { params?: T };
}
