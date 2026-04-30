/**
 * Performance Dashboard — Real-time Observability
 * 
 * Aggregates and displays performance metrics in real-time.
 */

import { metricsCollector } from './metricsCollector';
import { serviceHealthMonitor } from '../microservices/healthMonitor';

export interface PerformanceDashboard {
  timestamp: number;
  api: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    p95ResponseTime: number;
    errorRate: number;
  };
  services: {
    healthy: number;
    degraded: number;
    down: number;
  };
  user: {
    totalActions: number;
    topActions: Array<{ action: string; count: number }>;
  };
  system: {
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

class PerformanceMonitor {
  generateDashboard(): PerformanceDashboard {
    const apiMetrics = metricsCollector.getAggregation('api.request.duration');
    const apiCounters = metricsCollector.getAllCounters();
    const healthStatus = serviceHealthMonitor.getAllHealthStatus();
    
    const totalRequests = Object.entries(apiCounters)
      .filter(([key]) => key.startsWith('api.request.count'))
      .reduce((sum, [, value]) => sum + value, 0);
    
    const errorRequests = Object.entries(apiCounters)
      .filter(([key]) => key.includes('status:4') || key.includes('status:5'))
      .reduce((sum, [, value]) => sum + value, 0);
    
    const serviceStats = Object.values(healthStatus).reduce(
      (acc, health) => {
        if (health.status === 'healthy') acc.healthy++;
        else if (health.status === 'degraded') acc.degraded++;
        else acc.down++;
        return acc;
      },
      { healthy: 0, degraded: 0, down: 0 },
    );
    
    const userActions = Object.entries(apiCounters)
      .filter(([key]) => key.startsWith('user.action'))
      .map(([key, count]) => ({
        action: key.replace('user.action{action:', '').replace(/,.*/, ''),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      timestamp: Date.now(),
      api: {
        totalRequests,
        successRate: totalRequests > 0 ? ((totalRequests - errorRequests) / totalRequests) * 100 : 100,
        avgResponseTime: apiMetrics?.avg || 0,
        p95ResponseTime: apiMetrics?.p95 || 0,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
      },
      services: serviceStats,
      user: {
        totalActions: userActions.reduce((sum, { count }) => sum + count, 0),
        topActions: userActions,
      },
      system: {
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        cpuUsage: undefined,
      },
    };
  }

  exportMetrics(): string {
    const dashboard = this.generateDashboard();
    return JSON.stringify(dashboard, null, 2);
  }

  logDashboard(): void {
    const dashboard = this.generateDashboard();
    console.warn('=== Performance Dashboard ===');
    console.warn(`API: ${dashboard.api.totalRequests} requests, ${dashboard.api.successRate.toFixed(1)}% success`);
    console.warn(`Response Time: avg ${dashboard.api.avgResponseTime.toFixed(0)}ms, p95 ${dashboard.api.p95ResponseTime.toFixed(0)}ms`);
    console.warn(`Services: ${dashboard.services.healthy} healthy, ${dashboard.services.down} down`);
    console.warn(`User Actions: ${dashboard.user.totalActions} total`);
  }
}

export const performanceMonitor = new PerformanceMonitor();
