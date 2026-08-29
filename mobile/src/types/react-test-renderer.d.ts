declare module 'react-test-renderer' {
  import type { ReactElement, ReactNode } from 'react';

  export interface TestInstance {
    instance: any;
    type: any;
    props: any;
    children: Array<TestInstance | TestInstance['children'][number] | string>;
    parent: TestInstance | null;
    find: (fn: (node: TestInstance) => boolean) => TestInstance;
    findByType: (type: any) => TestInstance;
    findByProps: (props: Record<string, any>) => TestInstance;
    findAll: (fn: (node: TestInstance) => boolean) => TestInstance[];
    findAllByType: (type: any) => TestInstance[];
    findAllByProps: (props: Record<string, any>) => TestInstance[];
  }

  export interface TestRendererOptions {
    createNodeMock?: (element: ReactElement) => any;
  }

  export interface TestRenderer {
    root: TestInstance;
    toJSON: () => any;
    toTree: () => any;
    update: (nextElement: ReactElement) => void;
    unmount: () => void;
    getInstance: () => any;
  }

  export const create: (
    nextElement: ReactElement,
    options?: TestRendererOptions,
  ) => TestRenderer;
}
