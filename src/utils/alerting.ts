/**
 * Alerting System
 * Monitors metrics and triggers alerts based on thresholds
 */

import { logger } from './monitoring';

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  condition: (value: number) => boolean;
  severity: AlertSeverity;
  message: string;
  cooldownMs: number;
}

export interface MetricValue {
  metric: string;
  value: number;
  timestamp: number;
}

class AlertingSystem {
  private alerts: Alert[] = [];
  private rules: Map<string, AlertRule> = new Map();
  private lastAlertTime: Map<string, number> = new Map();
  private listeners: Array<(alert: Alert) => void> = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    // Error rate alerts
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      metric: 'error_rate',
      condition: value => value > 0.05, // 5% error rate
      severity: AlertSeverity.ERROR,
      message: 'Error rate exceeded 5%',
      cooldownMs: 5 * 60 * 1000, // 5 minutes
    });

    this.addRule({
      id: 'critical-error-rate',
      name: 'Critical Error Rate',
      metric: 'error_rate',
      condition: value => value > 0.1, // 10% error rate
      severity: AlertSeverity.CRITICAL,
      message: 'Error rate exceeded 10%',
      cooldownMs: 5 * 60 * 1000,
    });

    // Latency alerts
    this.addRule({
      id: 'high-latency',
      name: 'High API Latency',
      metric: 'api_latency_p95',
      condition: value => value > 1000, // 1 second
      severity: AlertSeverity.WARNING,
      message: 'P95 latency exceeded 1 second',
      cooldownMs: 10 * 60 * 1000, // 10 minutes
    });

    this.addRule({
      id: 'critical-latency',
      name: 'Critical API Latency',
      metric: 'api_latency_p95',
      condition: value => value > 3000, // 3 seconds
      severity: AlertSeverity.CRITICAL,
      message: 'P95 latency exceeded 3 seconds',
      cooldownMs: 5 * 60 * 1000,
    });

    // Memory alerts
    this.addRule({
      id: 'high-memory',
      name: 'High Memory Usage',
      metric: 'memory_usage_percent',
      condition: value => value > 80,
      severity: AlertSeverity.WARNING,
      message: 'Memory usage exceeded 80%',
      cooldownMs: 15 * 60 * 1000, // 15 minutes
    });

    this.addRule({
      id: 'critical-memory',
      name: 'Critical Memory Usage',
      metric: 'memory_usage_percent',
      condition: value => value > 90,
      severity: AlertSeverity.CRITICAL,
      message: 'Memory usage exceeded 90%',
      cooldownMs: 5 * 60 * 1000,
    });

    // Business metric alerts
    this.addRule({
      id: 'low-booking-rate',
      name: 'Low Booking Rate',
      metric: 'booking_success_rate',
      condition: value => value < 0.7, // 70% success rate
      severity: AlertSeverity.WARNING,
      message: 'Booking success rate below 70%',
      cooldownMs: 30 * 60 * 1000, // 30 minutes
    });

    this.addRule({
      id: 'payment-failures',
      name: 'High Payment Failure Rate',
      metric: 'payment_failure_rate',
      condition: value => value > 0.1, // 10% failure rate
      severity: AlertSeverity.ERROR,
      message: 'Payment failure rate exceeded 10%',
      cooldownMs: 10 * 60 * 1000,
    });
  }

  /**
   * Add a new alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
    logger.info('Alert rule added', { ruleId: rule.id, name: rule.name });
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
    logger.info('Alert rule removed', { ruleId });
  }

  /**
   * Check metric against all rules
   */
  checkMetric(metric: MetricValue): void {
    this.rules.forEach(rule => {
      if (rule.metric === metric.metric) {
        this.evaluateRule(rule, metric);
      }
    });
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: AlertRule, metric: MetricValue): void {
    // Check if rule condition is met
    if (!rule.condition(metric.value)) {
      return;
    }

    // Check cooldown period
    const lastAlert = this.lastAlertTime.get(rule.id);
    if (lastAlert && Date.now() - lastAlert < rule.cooldownMs) {
      return;
    }

    // Create alert
    const alert: Alert = {
      id: `${rule.id}-${Date.now()}`,
      severity: rule.severity,
      title: rule.name,
      message: rule.message,
      metric: metric.metric,
      value: metric.value,
      timestamp: Date.now(),
      acknowledged: false,
    };

    this.triggerAlert(alert);
    this.lastAlertTime.set(rule.id, Date.now());
  }

  /**
   * Trigger an alert
   */
  private triggerAlert(alert: Alert): void {
    this.alerts.push(alert);

    // Log alert
    const logLevel =
      alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.ERROR
        ? 'error'
        : 'warning';

    logger[logLevel]('Alert triggered', {
      alertId: alert.id,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metric: alert.metric,
      value: alert.value,
    });

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(alert);
      } catch (error) {
        logger.error('Alert listener error', error);
      }
    });
  }

  /**
   * Subscribe to alerts
   */
  subscribe(listener: (alert: Alert) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(options?: {
    severity?: AlertSeverity;
    acknowledged?: boolean;
    limit?: number;
  }): Alert[] {
    let filtered = [...this.alerts];

    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }

    if (options?.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === options.acknowledged);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info('Alert acknowledged', { alertId });
    }
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAgeMs = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;
    const before = this.alerts.length;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
    const removed = before - this.alerts.length;

    if (removed > 0) {
      logger.info('Old alerts cleared', { removed });
    }
  }

  /**
   * Get alert statistics
   */
  getStats(): {
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    unacknowledged: number;
  } {
    const stats = {
      total: this.alerts.length,
      bySeverity: {
        [AlertSeverity.INFO]: 0,
        [AlertSeverity.WARNING]: 0,
        [AlertSeverity.ERROR]: 0,
        [AlertSeverity.CRITICAL]: 0,
      },
      unacknowledged: 0,
    };

    this.alerts.forEach(alert => {
      stats.bySeverity[alert.severity]++;
      if (!alert.acknowledged) {
        stats.unacknowledged++;
      }
    });

    return stats;
  }
}

// Export singleton instance
export const alerting = new AlertingSystem();

// Auto-cleanup old alerts every hour
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      alerting.clearOldAlerts();
    },
    60 * 60 * 1000,
  );
}
