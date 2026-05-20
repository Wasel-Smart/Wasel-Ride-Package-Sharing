import { useEffect, useRef, useCallback } from 'react';
import { InteractionManager } from 'react-native';

export function usePerformanceMonitor(screenName: string) {
  const startTime = useRef(Date.now());

  useEffect(() => {
    const loadTime = Date.now() - startTime.current;
    console.log(`[Performance] ${screenName} loaded in ${loadTime}ms`);

    return () => {
      const totalTime = Date.now() - startTime.current;
      console.log(`[Performance] ${screenName} total time: ${totalTime}ms`);
    };
  }, [screenName]);
}

export function useInteractionComplete(callback: () => void) {
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      callback();
    });

    return () => task.cancel();
  }, [callback]);
}

export function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  return fn().finally(() => {
    const duration = Date.now() - start;
    console.log(`[Performance] ${name} took ${duration}ms`);
  });
}

export function measureSync<T>(name: string, fn: () => T): T {
  const start = Date.now();
  const result = fn();
  const duration = Date.now() - start;
  console.log(`[Performance] ${name} took ${duration}ms`);
  return result;
}

export class PerformanceTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, Date.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : Date.now();

    if (!start) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const duration = (end ?? Date.now()) - start;
    console.log(`[Performance] ${name}: ${duration}ms`);
    return duration;
  }

  clear() {
    this.marks.clear();
  }
}

export const performanceTracker = new PerformanceTracker();
