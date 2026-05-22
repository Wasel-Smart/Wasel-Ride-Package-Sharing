/**
 * Production Monitoring Configuration
 * Defines all alerts, thresholds, and monitoring rules
 */

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  condition: string;
  threshold: number;
  window: string;
  channels: ('slack' | 'email' | 'pagerduty' | 'sms')[];
  enabled: boolean;
  runbook?: string;
}

export interface MonitoringConfig {
  alerts: AlertRule[];
  metrics: MetricConfig[];
  dashboards: DashboardConfig[];
}

export interface MetricConfig {
  id: string;
  name: string;
  type: 'counter' | 'gauge' | 'histogram';
  unit: string;
  labels: string[];
}

export interface DashboardConfig {
  id: string;
  name: string;
  description: string;
  panels: PanelConfig[];
}

export interface PanelConfig {
  id: string;
  title: string;
  type: 'graph' | 'stat' | 'table' | 'heatmap';
  query: string;
}

// ============================================================================
// Alert Rules
// ============================================================================

export const alertRules: AlertRule[] = [
  // Critical Alerts
  {
    id: 'error-rate-critical',
    name: 'Critical Error Rate',
    description: 'Error rate exceeds 5% over 5 minutes',
    severity: 'critical',
    condition: 'error_rate > 0.05',
    threshold: 0.05,
    window: '5m',
    channels: ['pagerduty', 'slack', 'sms'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/high-error-rate',
  },
  {
    id: 'api-down',
    name: 'API Unavailable',
    description: 'API health check failing',
    severity: 'critical',
    condition: 'health_check_success_rate < 0.9',
    threshold: 0.9,
    window: '2m',
    channels: ['pagerduty', 'slack', 'sms'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/api-down',
  },
  {
    id: 'database-down',
    name: 'Database Unavailable',
    description: 'Database connection failing',
    severity: 'critical',
    condition: 'db_connection_success_rate < 0.95',
    threshold: 0.95,
    window: '2m',
    channels: ['pagerduty', 'slack', 'sms'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/database-down',
  },
  {
    id: 'payment-failure-critical',
    name: 'Critical Payment Failure Rate',
    description: 'Payment failure rate exceeds 10%',
    severity: 'critical',
    condition: 'payment_failure_rate > 0.1',
    threshold: 0.1,
    window: '10m',
    channels: ['pagerduty', 'slack', 'email'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/payment-failures',
  },

  // High Priority Alerts
  {
    id: 'latency-high',
    name: 'High API Latency',
    description: 'P95 latency exceeds 1000ms',
    severity: 'high',
    condition: 'p95_latency > 1000',
    threshold: 1000,
    window: '5m',
    channels: ['slack', 'email'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/high-latency',
  },
  {
    id: 'error-rate-high',
    name: 'High Error Rate',
    description: 'Error rate exceeds 2% over 10 minutes',
    severity: 'high',
    condition: 'error_rate > 0.02',
    threshold: 0.02,
    window: '10m',
    channels: ['slack', 'email'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/high-error-rate',
  },
  {
    id: 'circuit-breaker-open',
    name: 'Circuit Breaker Open',
    description: 'Circuit breaker has opened',
    severity: 'high',
    condition: 'circuit_breaker_state == "open"',
    threshold: 1,
    window: '1m',
    channels: ['slack', 'email'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/circuit-breaker',
  },
  {
    id: 'memory-high',
    name: 'High Memory Usage',
    description: 'Memory usage exceeds 85%',
    severity: 'high',
    condition: 'memory_usage > 0.85',
    threshold: 0.85,
    window: '5m',
    channels: ['slack', 'email'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/high-memory',
  },
  {
    id: 'cpu-high',
    name: 'High CPU Usage',
    description: 'CPU usage exceeds 80%',
    severity: 'high',
    condition: 'cpu_usage > 0.8',
    threshold: 0.8,
    window: '5m',
    channels: ['slack', 'email'],
    enabled: true,
    runbook: 'https://docs.wasel.jo/runbooks/high-cpu',
  },

  // Medium Priority Alerts
  {
    id: 'booking-failure-rate',
    name: 'Booking Failure Rate',
    description: 'Booking failure rate exceeds 5%',
    severity: 'medium',
    condition: 'booking_failure_rate > 0.05',
    threshold: 0.05,
    window: '15m',
    channels: ['slack', 'email'],
    enabled: true,
  },
  {
    id: 'notification-failure-rate',
    name: 'Notification Failure Rate',
    description: 'Notification delivery failure rate exceeds 10%',
    severity: 'medium',
    condition: 'notification_failure_rate > 0.1',
    threshold: 0.1,
    window: '15m',
    channels: ['slack', 'email'],
    enabled: true,
  },
  {
    id: 'session-timeout-rate',
    name: 'High Session Timeout Rate',
    description: 'Session timeout rate exceeds 20%',
    severity: 'medium',
    condition: 'session_timeout_rate > 0.2',
    threshold: 0.2,
    window: '30m',
    channels: ['slack'],
    enabled: true,
  },
  {
    id: 'cache-miss-rate',
    name: 'High Cache Miss Rate',
    description: 'Cache miss rate exceeds 50%',
    severity: 'medium',
    condition: 'cache_miss_rate > 0.5',
    threshold: 0.5,
    window: '15m',
    channels: ['slack'],
    enabled: true,
  },

  // Low Priority Alerts
  {
    id: 'disk-space-low',
    name: 'Low Disk Space',
    description: 'Disk space below 20%',
    severity: 'low',
    condition: 'disk_space_free < 0.2',
    threshold: 0.2,
    window: '10m',
    channels: ['slack'],
    enabled: true,
  },
  {
    id: 'ssl-cert-expiring',
    name: 'SSL Certificate Expiring',
    description: 'SSL certificate expires in 30 days',
    severity: 'low',
    condition: 'ssl_cert_days_remaining < 30',
    threshold: 30,
    window: '1d',
    channels: ['email'],
    enabled: true,
  },
];

// ============================================================================
// Metrics Configuration
// ============================================================================

export const metrics: MetricConfig[] = [
  // Request Metrics
  {
    id: 'http_requests_total',
    name: 'HTTP Requests Total',
    type: 'counter',
    unit: 'requests',
    labels: ['method', 'endpoint', 'status'],
  },
  {
    id: 'http_request_duration',
    name: 'HTTP Request Duration',
    type: 'histogram',
    unit: 'milliseconds',
    labels: ['method', 'endpoint'],
  },
  {
    id: 'http_errors_total',
    name: 'HTTP Errors Total',
    type: 'counter',
    unit: 'errors',
    labels: ['method', 'endpoint', 'error_code'],
  },

  // Business Metrics
  {
    id: 'bookings_total',
    name: 'Bookings Total',
    type: 'counter',
    unit: 'bookings',
    labels: ['type', 'status'],
  },
  {
    id: 'payments_total',
    name: 'Payments Total',
    type: 'counter',
    unit: 'payments',
    labels: ['method', 'status', 'currency'],
  },
  {
    id: 'revenue_total',
    name: 'Revenue Total',
    type: 'counter',
    unit: 'JOD',
    labels: ['currency', 'payment_method'],
  },
  {
    id: 'active_users',
    name: 'Active Users',
    type: 'gauge',
    unit: 'users',
    labels: ['type'],
  },

  // System Metrics
  {
    id: 'cpu_usage',
    name: 'CPU Usage',
    type: 'gauge',
    unit: 'percent',
    labels: ['instance'],
  },
  {
    id: 'memory_usage',
    name: 'Memory Usage',
    type: 'gauge',
    unit: 'percent',
    labels: ['instance'],
  },
  {
    id: 'disk_usage',
    name: 'Disk Usage',
    type: 'gauge',
    unit: 'percent',
    labels: ['instance', 'mount'],
  },

  // Database Metrics
  {
    id: 'db_connections_active',
    name: 'Active Database Connections',
    type: 'gauge',
    unit: 'connections',
    labels: ['database'],
  },
  {
    id: 'db_query_duration',
    name: 'Database Query Duration',
    type: 'histogram',
    unit: 'milliseconds',
    labels: ['query_type'],
  },
  {
    id: 'db_errors_total',
    name: 'Database Errors Total',
    type: 'counter',
    unit: 'errors',
    labels: ['error_type'],
  },

  // Circuit Breaker Metrics
  {
    id: 'circuit_breaker_state',
    name: 'Circuit Breaker State',
    type: 'gauge',
    unit: 'state',
    labels: ['breaker_name'],
  },
  {
    id: 'circuit_breaker_failures',
    name: 'Circuit Breaker Failures',
    type: 'counter',
    unit: 'failures',
    labels: ['breaker_name'],
  },
];

// ============================================================================
// Dashboard Configuration
// ============================================================================

export const dashboards: DashboardConfig[] = [
  {
    id: 'overview',
    name: 'Wasel Overview',
    description: 'High-level system health and business metrics',
    panels: [
      {
        id: 'requests-per-second',
        title: 'Requests per Second',
        type: 'graph',
        query: 'rate(http_requests_total[5m])',
      },
      {
        id: 'error-rate',
        title: 'Error Rate',
        type: 'graph',
        query: 'rate(http_errors_total[5m]) / rate(http_requests_total[5m])',
      },
      {
        id: 'p95-latency',
        title: 'P95 Latency',
        type: 'graph',
        query: 'histogram_quantile(0.95, http_request_duration)',
      },
      {
        id: 'active-users',
        title: 'Active Users',
        type: 'stat',
        query: 'active_users',
      },
      {
        id: 'bookings-today',
        title: 'Bookings Today',
        type: 'stat',
        query: 'sum(increase(bookings_total[24h]))',
      },
      {
        id: 'revenue-today',
        title: 'Revenue Today',
        type: 'stat',
        query: 'sum(increase(revenue_total[24h]))',
      },
    ],
  },
  {
    id: 'payments',
    name: 'Payment Metrics',
    description: 'Payment processing and revenue metrics',
    panels: [
      {
        id: 'payment-success-rate',
        title: 'Payment Success Rate',
        type: 'graph',
        query: 'sum(rate(payments_total{status="success"}[5m])) / sum(rate(payments_total[5m]))',
      },
      {
        id: 'payment-volume',
        title: 'Payment Volume',
        type: 'graph',
        query: 'sum(rate(payments_total[5m])) by (method)',
      },
      {
        id: 'revenue-by-method',
        title: 'Revenue by Payment Method',
        type: 'graph',
        query: 'sum(rate(revenue_total[5m])) by (payment_method)',
      },
    ],
  },
  {
    id: 'system-health',
    name: 'System Health',
    description: 'Infrastructure and system metrics',
    panels: [
      {
        id: 'cpu-usage',
        title: 'CPU Usage',
        type: 'graph',
        query: 'cpu_usage',
      },
      {
        id: 'memory-usage',
        title: 'Memory Usage',
        type: 'graph',
        query: 'memory_usage',
      },
      {
        id: 'disk-usage',
        title: 'Disk Usage',
        type: 'graph',
        query: 'disk_usage',
      },
      {
        id: 'db-connections',
        title: 'Database Connections',
        type: 'graph',
        query: 'db_connections_active',
      },
    ],
  },
];

// ============================================================================
// Monitoring Initialization
// ============================================================================

export function initializeMonitoring() {
  if (typeof window === 'undefined') {
    return;
  }

  // Initialize Sentry
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (sentryDsn) {
    import('@sentry/react').then(Sentry => {
      Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
        beforeSend(
          // @ts-ignore — Sentry v10 BeforeSend event type not exported from @sentry/react public surface
          event,
        ) {
          // Filter out ignored errors
          const ignoredErrors = [
            'IframeMessageAbortError',
            'message port was destroyed',
            'ResizeObserver loop limit exceeded',
          ];

          if (event.exception?.values?.[0]?.value) {
            const errorMessage = event.exception.values[0].value;
            if (ignoredErrors.some(ignored => errorMessage.includes(ignored))) {
              return null;
            }
          }

          return event;
        },
      });
    });
  }

  // Log monitoring initialization
  console.info('[Monitoring] Initialized with', {
    alerts: alertRules.length,
    metrics: metrics.length,
    dashboards: dashboards.length,
  });
}

// Export configuration
export const monitoringConfig: MonitoringConfig = {
  alerts: alertRules,
  metrics,
  dashboards,
};
