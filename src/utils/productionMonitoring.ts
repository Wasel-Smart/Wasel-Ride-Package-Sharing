/**
 * Production Monitoring & Alerting Configuration
 * Comprehensive observability for 99.9%+ uptime
 */

export interface MetricThreshold {
  warning: number;
  critical: number;
  unit: string;
}

export interface AlertRule {
  name: string;
  metric: string;
  threshold: MetricThreshold;
  window: string;
  severity: 'info' | 'warning' | 'critical';
  channels: ('email' | 'sms' | 'slack' | 'pagerduty')[];
}

export const productionAlerts: AlertRule[] = [
  {
    name: 'High Error Rate',
    metric: 'error_rate',
    threshold: { warning: 1, critical: 5, unit: '%' },
    window: '5m',
    severity: 'critical',
    channels: ['email', 'slack', 'pagerduty'],
  },
  {
    name: 'API Latency',
    metric: 'api_latency_p95',
    threshold: { warning: 500, critical: 1000, unit: 'ms' },
    window: '5m',
    severity: 'warning',
    channels: ['email', 'slack'],
  },
  {
    name: 'Database Connection Pool',
    metric: 'db_pool_usage',
    threshold: { warning: 80, critical: 95, unit: '%' },
    window: '5m',
    severity: 'critical',
    channels: ['email', 'slack', 'pagerduty'],
  },
  {
    name: 'Payment Failure Rate',
    metric: 'payment_failure_rate',
    threshold: { warning: 2, critical: 5, unit: '%' },
    window: '15m',
    severity: 'critical',
    channels: ['email', 'sms', 'slack', 'pagerduty'],
  },
  {
    name: 'Auth Failure Rate',
    metric: 'auth_failure_rate',
    threshold: { warning: 5, critical: 10, unit: '%' },
    window: '5m',
    severity: 'warning',
    channels: ['email', 'slack'],
  },
  {
    name: 'Queue Lag',
    metric: 'queue_lag_seconds',
    threshold: { warning: 30, critical: 60, unit: 's' },
    window: '5m',
    severity: 'warning',
    channels: ['email', 'slack'],
  },
  {
    name: 'Memory Usage',
    metric: 'memory_usage',
    threshold: { warning: 85, critical: 95, unit: '%' },
    window: '5m',
    severity: 'warning',
    channels: ['email', 'slack'],
  },
  {
    name: 'CPU Usage',
    metric: 'cpu_usage',
    threshold: { warning: 80, critical: 90, unit: '%' },
    window: '5m',
    severity: 'warning',
    channels: ['email', 'slack'],
  },
];

export interface HealthCheck {
  name: string;
  endpoint: string;
  interval: number;
  timeout: number;
  expectedStatus: number;
  critical: boolean;
}

export const healthChecks: HealthCheck[] = [
  {
    name: 'API Gateway',
    endpoint: '/health',
    interval: 30,
    timeout: 5,
    expectedStatus: 200,
    critical: true,
  },
  {
    name: 'Database',
    endpoint: '/health/db',
    interval: 60,
    timeout: 10,
    expectedStatus: 200,
    critical: true,
  },
  {
    name: 'Auth Service',
    endpoint: '/health/auth',
    interval: 60,
    timeout: 5,
    expectedStatus: 200,
    critical: true,
  },
  {
    name: 'Payment Service',
    endpoint: '/health/payments',
    interval: 60,
    timeout: 10,
    expectedStatus: 200,
    critical: true,
  },
  {
    name: 'Notification Worker',
    endpoint: '/health/notifications',
    interval: 120,
    timeout: 5,
    expectedStatus: 200,
    critical: false,
  },
];

export interface SLOTarget {
  service: string;
  availability: number;
  latencyP95: number;
  errorBudget: number;
}

export const sloTargets: SLOTarget[] = [
  {
    service: 'API Gateway',
    availability: 99.9,
    latencyP95: 250,
    errorBudget: 0.1,
  },
  {
    service: 'Identity Service',
    availability: 99.95,
    latencyP95: 200,
    errorBudget: 0.05,
  },
  {
    service: 'Ride Matching',
    availability: 99.9,
    latencyP95: 700,
    errorBudget: 0.1,
  },
  {
    service: 'Package Delivery',
    availability: 99.9,
    latencyP95: 400,
    errorBudget: 0.1,
  },
  {
    service: 'Payment Service',
    availability: 99.95,
    latencyP95: 350,
    errorBudget: 0.05,
  },
];

export class ProductionMonitor {
  private metrics: Map<string, number[]> = new Map();
  private alertCallbacks: Map<string, ((alert: AlertRule, value: number) => void)[]> = new Map();

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    const values = this.metrics.get(name)!;
    values.push(value);
    
    if (values.length > 1000) {
      values.shift();
    }

    this.checkAlerts(name, value);
  }

  private checkAlerts(metricName: string, value: number): void {
    const relevantAlerts = productionAlerts.filter(alert => alert.metric === metricName);
    
    for (const alert of relevantAlerts) {
      if (value >= alert.threshold.critical) {
        this.triggerAlert(alert, value);
      } else if (value >= alert.threshold.warning) {
        this.triggerAlert({ ...alert, severity: 'warning' }, value);
      }
    }
  }

  private triggerAlert(alert: AlertRule, value: number): void {
    const callbacks = this.alertCallbacks.get(alert.name) || [];
    callbacks.forEach(callback => callback(alert, value));
  }

  onAlert(alertName: string, callback: (alert: AlertRule, value: number) => void): void {
    if (!this.alertCallbacks.has(alertName)) {
      this.alertCallbacks.set(alertName, []);
    }
    this.alertCallbacks.get(alertName)!.push(callback);
  }

  getMetricStats(name: string): {
    min: number;
    max: number;
    avg: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, val) => acc + val, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  async performHealthChecks(): Promise<{
    healthy: boolean;
    checks: { name: string; status: 'pass' | 'fail'; latency: number }[];
  }> {
    const results = await Promise.all(
      healthChecks.map(async check => {
        const start = Date.now();
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), check.timeout * 1000);

          const response = await fetch(check.endpoint, {
            signal: controller.signal,
          });

          clearTimeout(timeout);
          const latency = Date.now() - start;

          return {
            name: check.name,
            status: response.status === check.expectedStatus ? ('pass' as const) : ('fail' as const),
            latency,
          };
        } catch {
          return {
            name: check.name,
            status: 'fail' as const,
            latency: Date.now() - start,
          };
        }
      }),
    );

    const criticalChecks = results.filter((_, i) => healthChecks[i].critical);
    const healthy = criticalChecks.every(check => check.status === 'pass');

    return { healthy, checks: results };
  }
}

export const monitor = new ProductionMonitor();
