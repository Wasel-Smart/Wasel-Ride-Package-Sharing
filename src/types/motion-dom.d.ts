declare module 'motion-dom' {
  type AnyRecord = Record<string, any>;
  type AnyFunction = (...args: any[]) => any;

  export type AnyResolvedKeyframe = any;
  export type OnKeyframesResolved<V = any> = (keyframes: V[]) => void;
  export type KeyframeResolver<V = any> = any;
  export type TransformProperties = AnyRecord;
  export type SVGPathProperties = AnyRecord;
  export type Transition = AnyRecord;
  export type PresenceContextProps = AnyRecord;
  export type ResolvedValues = AnyRecord;
  export type VisualElement<Instance = any> = AnyRecord & { current?: Instance };
  export type Feature = any;
  export type UnresolvedValueKeyframe = any;
  export type AnimationOptions = AnyRecord;
  export type ElementOrSelector = Element | Element[] | NodeListOf<Element> | string;
  export type DOMKeyframesDefinition = AnyRecord;
  export type AnimationPlaybackOptions = AnyRecord;
  export type AnimationPlaybackControls = AnyRecord;
  export type AnimationPlaybackControlsWithThen = AnimationPlaybackControls & PromiseLike<void>;
  export type ValueAnimationTransition<V = any> = AnyRecord & { from?: V; to?: V };
  export type AnimationScope<T = any> = { current: T };
  export type EventInfo = AnyRecord;
  export type MotionValueEventCallbacks<V = any> = AnyRecord;
  export type FollowValueOptions = AnyRecord;
  export type SpringOptions = AnyRecord;
  export type TransformOptions<T = any> = AnyRecord & { mixer?: AnyFunction; clamp?: boolean };
  export type WillChange = AnyRecord;
  export type LegacyAnimationControls = AnyRecord;
  export type NodeGroup = AnyRecord;
  export type IProjectionNode = AnyRecord;
  export type ArcOptions = AnyRecord;
  export type DelayedFunction = AnyFunction;
  export type FlatTree = AnyRecord;
  export type MotionPath = AnyRecord;

  export interface MotionValue<V = any> {
    get(): V;
    set(value: V): void;
    on(eventName: string, callback: AnyFunction): () => void;
    [key: string]: any;
  }

  export interface MotionNodeOptions {
    initial?: any;
    animate?: any;
    exit?: any;
    transition?: any;
    variants?: any;
    custom?: any;
    inherit?: boolean;
    layout?: boolean | string;
    layoutId?: string;
    whileHover?: any;
    whileTap?: any;
    whileFocus?: any;
    whileDrag?: any;
    whileInView?: any;
    drag?: boolean | 'x' | 'y';
    dragConstraints?: any;
    dragElastic?: any;
    dragMomentum?: boolean;
    viewport?: any;
    onAnimationStart?: AnyFunction;
    onAnimationComplete?: AnyFunction;
    onUpdate?: AnyFunction;
    onDragStart?: AnyFunction;
    onDrag?: AnyFunction;
    onDragEnd?: AnyFunction;
    [key: string]: any;
  }

  export const addScaleCorrector: any;
  export const animateVisualElement: any;
  export const arc: any;
  export const buildTransform: any;
  export const calcLength: any;
  export const createBox: any;
  export const delay: any;
  export const optimizedAppearDataAttribute: any;
  export const resolveMotionValue: any;
  export const visualElementStore: any;
}
