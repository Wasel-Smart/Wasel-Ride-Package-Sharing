/**
 * Production Metrics Collector & SLO Validator
 * Collects real production data and validates against SLO targets
 */

export interface ProductionMetrics {
  timestamp: number;
  period: '1min' | '5min' | '15min' | '1hour' | '24hour';
  
  // API Metrics
  api: {
    requestCount: number;
    errorCount: number;
    errorRate: number;
    latency: {
      p50: number;
      p95: number;
      p99: number;
      max: number;
    };
  };
  
  // Service-Level Metrics
  services: {
    [serviceName: string]: {
      requestCount: number;
      successCount: number;
      failureCount: number;
      availability: number; // percentage
      latency: {
        p50: number;
        p95: number;
        p99: number;
      };
      sloCompliance: boolean;
      sloTarget: {
        availability: string;
        p95Latency: string;
      };
    };
  };
  
  // Queue Metrics
  queues: {
    [topicName: string]: {
      depth: number;
      processedCount: number;
      failedCount: number;
      avgProcessingTimeMs: number;
      lagMs: number;
    };
  };
  
  // Worker Metrics
  workers: {
    [workerName: string]: {
      status: 'healthy' | 'degraded' | 'down';
      processedCount: number;
      failedCount: number;
      retryCount: number;
      circuitBreakerState: 'closed' | 'open' | 'half-open';
      avgProcessingTimeMs: number;
    };
  };
  
  // Business Metrics
  business: {
    activeUsers: number;
    ridesRequested: number;
    ridesCompleted: number;
    packagesCreated: number;
    packagesDelivered: number;
    paymentsAuthorized: number;
    paymentsCaptured: number;
    revenueJOD: number;
  };
  
  // Web Vitals
  webVitals: {
    cls: number;
    fid: number;
    lcp: number;
    fcp: number;
    ttfb: number;
    inp: number;
  };
}

type SLOTarget = {
  availability: number;
  p95Latency?: number;
  freshnessMs?: number;
};

class ProductionMetricsCollector {
  private metricsBuffer: Map<string, number[]> = new Map();
  private sloViolations: Array<{
    service: string;
    metric: string;
    target: number;
    actual: number;
    timestamp: number;
  }> = [];

  // SLO Targets from reliability-slos.md
  private readonly SLO_TARGETS: Record<string, SLOTarget> = {
    'api-gateway': { availability: 99.9, p95Latency: 250 },
    'identity-service': { availability: 99.95, p95Latency: 200 },
    'ride-matching-service': { availability: 99.9, p95Latency: 700 },
    'package-delivery-service': { availability: 99.9, p95Latency: 400 },
    'payment-service': { availability: 99.95, p95Latency: 350 },
    'notification-worker': { availability: 99.9, freshnessMs: 2000 },
    'matching-worker': { availability: 99.9, freshnessMs: 15000 },
    'package-worker': { availability: 99.9, freshnessMs: 10000 },
    'payment-worker': { availability: 99.95, freshnessMs: 30000 },
    'ops-worker': { availability: 99.5, freshnessMs: 300000 },
  };

  recordMetric(name: string, value: number): void {
    if (!this.metricsBuffer.has(name)) {
      this.metricsBuffer.set(name, []);
    }
    this.metricsBuffer.get(name)!.push(value);
    
    // Keep only last 1000 data points per metric
    const buffer = this.metricsBuffer.get(name)!;
    if (buffer.length > 1000) {
      buffer.shift();
    }
  }

  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] ?? 0;
  }

  calculateAvailability(successCount: number, totalCount: number): number {
    if (totalCount === 0) return 100;
    return (successCount / totalCount) * 100;
  }

  validateSLO(
    service: string,
    metric: 'availability' | 'p95Latency' | 'freshnessMs',
    actual: number,
  ): boolean {
    const target = this.SLO_TARGETS[service];
    if (!target) return true;

    let isCompliant = true;
    let targetValue = 0;

    switch (metric) {
      case 'availability':
        targetValue = target.availability;
        isCompliant = actual >= targetValue;
        break;
      case 'p95Latency':
        targetValue = target.p95Latency ?? 0;
        isCompliant = actual <= targetValue;
        break;
      case 'freshnessMs':
        targetValue = target.freshnessMs ?? 0;
        isCompliant = actual <= targetValue;
        break;
    }

    if (!isCompliant) {
      this.sloViolations.push({
        service,
        metric,
        target: targetValue,
        actual,
        timestamp: Date.now(),
      });
    }

    return isCompliant;
  }

  async collectProductionMetrics(period: ProductionMetrics['period']): Promise<ProductionMetrics> {
    const now = Date.now();
    
    // API Metrics
    const apiLatencies = this.metricsBuffer.get('api.latency') || [];
    const apiErrors = this.metricsBuffer.get('api.errors') || [];
    const apiRequests = this.metricsBuffer.get('api.requests') || [];
    
    const apiMetrics = {
      requestCount: apiRequests.length,
      errorCount: apiErrors.length,
      errorRate: apiRequests.length > 0 ? apiErrors.length / apiRequests.length : 0,
      latency: {
        p50: this.calculatePercentile(apiLatencies, 50),
        p95: this.calculatePercentile(apiLatencies, 95),
        p99: this.calculatePercentile(apiLatencies, 99),
        max: Math.max(...apiLatencies, 0),
      },
    };

    // Service Metrics
    const services: ProductionMetrics['services'] = {};
    
    for (const [serviceName, sloTarget] of Object.entries(this.SLO_TARGETS)) {
      const latencies = this.metricsBuffer.get(`${serviceName}.latency`) || [];
      const successes = this.metricsBuffer.get(`${serviceName}.success`) || [];
      const failures = this.metricsBuffer.get(`${serviceName}.failure`) || [];
      
      const totalRequests = successes.length + failures.length;
      const availability = this.calculateAvailability(successes.length, totalRequests);
      const p95Latency = this.calculatePercentile(latencies, 95);
      
      const availabilitySLO = this.validateSLO(serviceName, 'availability', availability);
      const latencySLO = sloTarget.p95Latency 
        ? this.validateSLO(serviceName, 'p95Latency', p95Latency)
        : true;
      
      services[serviceName] = {
        requestCount: totalRequests,
        successCount: successes.length,
        failureCount: failures.length,
        availability,
        latency: {
          p50: this.calculatePercentile(latencies, 50),
          p95: p95Latency,
          p99: this.calculatePercentile(latencies, 99),
        },
        sloCompliance: availabilitySLO && latencySLO,
        sloTarget: {
          availability: `${sloTarget.availability}%`,
          p95Latency: sloTarget.p95Latency ? `${sloTarget.p95Latency}ms` : 'N/A',
        },
      };
    }

    // Queue Metrics
    const queues: ProductionMetrics['queues'] = {
      'rides.requested': this.getQueueMetrics('rides.requested'),
      'packages.created': this.getQueueMetrics('packages.created'),
      'payments.authorized': this.getQueueMetrics('payments.authorized'),
      'notifications.dispatch': this.getQueueMetrics('notifications.dispatch'),
    };

    // Worker Metrics
    const workers: ProductionMetrics['workers'] = {
      'matching-worker': this.getWorkerMetrics('matching-worker'),
      'package-worker': this.getWorkerMetrics('package-worker'),
      'payment-worker': this.getWorkerMetrics('payment-worker'),
      'notification-worker': this.getWorkerMetrics('notification-worker'),
      'ops-worker': this.getWorkerMetrics('ops-worker'),
    };

    // Business Metrics
    const business: ProductionMetrics['business'] = {
      activeUsers: (this.metricsBuffer.get('users.active') || []).length,
      ridesRequested: (this.metricsBuffer.get('rides.requested') || []).length,
      ridesCompleted: (this.metricsBuffer.get('rides.completed') || []).length,
      packagesCreated: (this.metricsBuffer.get('packages.created') || []).length,
      packagesDelivered: (this.metricsBuffer.get('packages.delivered') || []).length,
      paymentsAuthorized: (this.metricsBuffer.get('payments.authorized') || []).length,
      paymentsCaptured: (this.metricsBuffer.get('payments.captured') || []).length,
      revenueJOD: (this.metricsBuffer.get('revenue.jod') || []).reduce((a, b) => a + b, 0),
    };

    // Web Vitals
    const webVitals: ProductionMetrics['webVitals'] = {
      cls: this.calculatePercentile(this.metricsBuffer.get('web_vital.cls') || [], 75),
      fid: this.calculatePercentile(this.metricsBuffer.get('web_vital.fid') || [], 75),
      lcp: this.calculatePercentile(this.metricsBuffer.get('web_vital.lcp') || [], 75),
      fcp: this.calculatePercentile(this.metricsBuffer.get('web_vital.fcp') || [], 75),
      ttfb: this.calculatePercentile(this.metricsBuffer.get('web_vital.ttfb') || [], 75),
      inp: this.calculatePercentile(this.metricsBuffer.get('web_vital.inp') || [], 75),
    };

    return {
      timestamp: now,
      period,
      api: apiMetrics,
      services,
      queues,
      workers,
      business,
      webVitals,
    };
  }

  private getQueueMetrics(topic: string): ProductionMetrics['queues'][string] {
    const depths = this.metricsBuffer.get(`queue.${topic}.depth`) || [];
    const processed = this.metricsBuffer.get(`queue.${topic}.processed`) || [];
    const failed = this.metricsBuffer.get(`queue.${topic}.failed`) || [];
    const times = this.metricsBuffer.get(`queue.${topic}.time`) || [];
    const lags = this.metricsBuffer.get(`queue.${topic}.lag`) || [];

    return {
      depth: depths[depths.length - 1] || 0,
      processedCount: processed.length,
      failedCount: failed.length,
      avgProcessingTimeMs: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
      lagMs: lags[lags.length - 1] || 0,
    };
  }

  private getWorkerMetrics(worker: string): ProductionMetrics['workers'][string] {
    const processed = this.metricsBuffer.get(`worker.${worker}.processed`) || [];
    const failed = this.metricsBuffer.get(`worker.${worker}.failed`) || [];
    const retried = this.metricsBuffer.get(`worker.${worker}.retried`) || [];
    const times = this.metricsBuffer.get(`worker.${worker}.time`) || [];
    const cbState = this.metricsBuffer.get(`worker.${worker}.circuit_breaker`) || [0];

    const failureRate = processed.length > 0 ? failed.length / processed.length : 0;
    const status: 'healthy' | 'degraded' | 'down' =
      failureRate > 0.2 ? 'down' : failureRate > 0.05 ? 'degraded' : 'healthy';

    const circuitBreakerMetric = cbState.at(-1) ?? 0;
    const circuitBreakerState: 'closed' | 'open' | 'half-open' =
      circuitBreakerMetric === 2 ? 'half-open' : circuitBreakerMetric === 1 ? 'open' : 'closed';

    return {
      status,
      processedCount: processed.length,
      failedCount: failed.length,
      retryCount: retried.length,
      circuitBreakerState,
      avgProcessingTimeMs: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    };
  }

  getSLOViolations(): typeof this.sloViolations {
    return [...this.sloViolations];
  }

  clearSLOViolations(): void {
    this.sloViolations = [];
  }

  async publishMetrics(metrics: ProductionMetrics): Promise<void> {
    // Send to monitoring backend (Prometheus, Grafana, CloudWatch, etc.)
    try {
      await fetch('/api/metrics/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metrics),
      });
    } catch (error) {
      console.error('Failed to publish metrics:', error);
    }
  }

  generateSLOReport(): string {
    const violations = this.getSLOViolations();
    const last24h = violations.filter((v) => Date.now() - v.timestamp < 86400000);

    let report = '# SLO Compliance Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Period: Last 24 hours\n`;
    report += `Total Violations: ${last24h.length}\n\n`;

    if (last24h.length === 0) {
      report += '✅ **All SLOs are in compliance**\n';
    } else {
      report += '## Violations\n\n';
      
      const grouped = last24h.reduce((acc, v) => {
        const serviceViolations = acc[v.service] ?? [];
        serviceViolations.push(v);
        acc[v.service] = serviceViolations;
        return acc;
      }, {} as Record<string, typeof violations>);

      for (const [service, serviceViolations] of Object.entries(grouped)) {
        report += `### ${service}\n`;
        for (const v of serviceViolations) {
          report += `- ${v.metric}: Target ${v.target}, Actual ${v.actual.toFixed(2)}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }
}

export const productionMetricsCollector = new ProductionMetricsCollector();

// Auto-collect metrics every 5 minutes in production
if (import.meta.env.MODE === 'production') {
  setInterval(async () => {
    const metrics = await productionMetricsCollector.collectProductionMetrics('5min');
    await productionMetricsCollector.publishMetrics(metrics);
    
    console.log('📊 Production metrics collected and published');
    console.log(`SLO Compliance: ${Object.values(metrics.services).every(s => s.sloCompliance) ? '✅' : '❌'}`);
  }, 300000); // Every 5 minutes
}
