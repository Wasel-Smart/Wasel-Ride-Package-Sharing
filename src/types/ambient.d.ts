declare module 'react-router' {
  export * from 'react-router-dom';
}

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  export const Icon: FC<SVGProps<SVGSVGElement>>;
  export default Icon;
}

declare module 'framer-motion' {
  export const motion: {
    (tag: string): any;
    div: any;
    span: any;
    button: any;
    li: any;
    ul: any;
    section: any;
    header: any;
    footer: any;
    main: any;
    nav: any;
    aside: any;
    form: any;
    input: any;
    textarea: any;
    select: any;
    option: any;
    table: any;
    tr: any;
    td: any;
    th: any;
    thead: any;
    tbody: any;
    img: any;
    a: any;
    h1: any;
    h2: any;
    h3: any;
    h4: any;
    h5: any;
    h6: any;
    p: any;
  };
  export const AnimatePresence: any;
  export const useMotionValue: any;
  export const useTransform: any;
  export const useSpring: any;
  export const useScroll: any;
  export const useInView: any;
  export const useAnimation: any;
  export const useMotionValueEvent: any;
  export const useReducedMotion: any;
  export const useDragControls: any;
  export const useVelocity: any;
  export const useTime: any;
  export const useVector: any;
  export const useAccelerometer: any;
  export const useDeviceOrientation: any;
  export const useDeviceMotion: any;
  export const useScrollProgress: any;
  export const useElementSize: any;
  export const useElementBounding: any;
  export const useViewportScroll: any;
  export const useViewportSize: any;
  export const useViewportBounding: any;
  export const useViewportElement: any;
  export const useViewportProgress: any;
  export const useViewportInView: any;
  export const useViewportMotionValue: any;
  export const useViewportTransform: any;
  export const useViewportSpring: any;
  export const useViewportScrollProgress: any;
  export const useViewportBoundingClientRect: any;
  export const useViewportElementSize: any;
  export const useViewportElementBounding: any;
  export const useViewportElementScroll: any;
  export const useViewportElementInView: any;
  export const useViewportElementMotionValue: any;
  export const useViewportElementTransform: any;
  export const useViewportElementSpring: any;
  export const useViewportElementScrollProgress: any;
  export const useViewportElementBoundingClientRect: any;
  export const useViewportElementSizeObserver: any;
  export const useViewportElementBoundingObserver: any;
  export const useViewportElementScrollObserver: any;
  export const useViewportElementInViewObserver: any;
  export const useViewportElementMotionValueObserver: any;
  export const useViewportElementTransformObserver: any;
  export const useViewportElementSpringObserver: any;
  export const useViewportElementScrollProgressObserver: any;
  export const useViewportElementBoundingClientRectObserver: any;
  export const useViewportElementSizeObserver: any;
  export const useViewportElementBoundingObserver: any;
  export const useViewportElementScrollObserver: any;
  export const useViewportElementInViewObserver: any;
  export const useViewportElementMotionValueObserver: any;
  export const useViewportElementTransformObserver: any;
  export const useViewportElementSpringObserver: any;
  export const useViewportElementScrollProgressObserver: any;
  export const useViewportElementBoundingClientRectObserver: any;
}

declare module 'zod' {
  export const z: any;
  export default z;
}

declare module '@supabase/auth-js' {
  export const SupabaseAuthClient: any;
  export default SupabaseAuthClient;
}

declare module '@microsoft/applicationinsights-web' {
  export const applicationInsights: any;
  export default applicationInsights;
}
