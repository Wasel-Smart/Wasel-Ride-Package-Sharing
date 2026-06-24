/**
 * Performance Monitoring Service
 */
import React from 'react';
import { Platform } from 'react-native';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'fps' | 'bytes';
  tags?: Record<string, string>;
}

class PerformanceService {
  private metrics: PerformanceMetric[] = [];
  private startTime: number | null = null;

  markStart(name: string): void {
    this.startTime = Date.now();
  }

  markEnd(name: string, tags?: Record<string, string>): number {
    if (!this.startTime) return 0;

    const duration = Date.now() - this.startTime;
    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      tags: tags ?? {},
    });

    this.startTime = null;
    return duration;
  }

  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    this.logMetric(metric);
  }

  private logMetric(metric: PerformanceMetric): void {
    if (Platform.OS === 'web') {
      console.log(`[Perf] ${metric.name}: ${metric.value}${metric.unit}`);
      return;
    }

    if (__DEV__) {
      console.log(`[Perf] ${metric.name}: ${metric.value}${metric.unit}`);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

export const performance = new PerformanceService();

// Performance decorator for screens
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  screenName: string,
) {
  return React.memo(function PerformanceTrackedComponent(props: P) {
    React.useEffect(() => {
      performance.markStart(`screen_${screenName}_load`);
      return () => {
        performance.markEnd(`screen_${screenName}_visible`);
      };
    }, []);
    return <Component {...props} />;
  });
}