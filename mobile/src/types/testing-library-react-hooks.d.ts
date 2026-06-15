declare module '@testing-library/react-hooks' {
  import type { ComponentType, ReactElement } from 'react';

  export interface RenderHookOptions<TProps> {
    initialProps?: TProps;
    wrapper?: ComponentType<TProps>;
  }

  export interface RenderHookResult<TResult> {
    result: { current: TResult };
    rerender: (props: unknown) => void;
    unmount: () => void;
  }

  export function renderHook<TProps, TResult>(
    render: (props: TProps) => TResult,
    options?: RenderHookOptions<TProps>,
  ): RenderHookResult<TResult>;

  export function waitFor(callback: () => void | ReactElement): Promise<void>;
}
