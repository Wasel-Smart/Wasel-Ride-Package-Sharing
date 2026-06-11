/**
 * Service Coordinator - Central orchestration for all backend services
 * Ensures all services start/stop gracefully with health monitoring
 */

import { RideMatchingService } from '../ride-matching/service-production';
import { PaymentReconciliationService } from '../payment-reconciliation/service-production';
import { OpsAnalyticsWorker } from '../ops-analytics/service-production';
import { eventBroker } from '../../../src/platform/event-broker-redis-production';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopped';
  lastCheck: string;
  uptime: number;
}

export class ServiceCoordinator {
  private services: Map<string, any> = new Map();
  private startTimes: Map<string, number> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  async startAll(): Promise<void> {
    console.log('[Coordinator] Starting all services...');

    try {
      const rideMatching = new RideMatchingService();
      await rideMatching.start();
      this.services.set('ride-matching', rideMatching);
      this.startTimes.set('ride-matching', Date.now());

      const paymentRecon = new PaymentReconciliationService();
      await paymentRecon.start();
      this.services.set('payment-reconciliation', paymentRecon);
      this.startTimes.set('payment-reconciliation', Date.now());

      const opsAnalytics = new OpsAnalyticsWorker();
      await opsAnalytics.start();
      this.services.set('ops-analytics', opsAnalytics);
      this.startTimes.set('ops-analytics', Date.now());

      this.startHealthMonitoring();

      console.log('[Coordinator] All services started successfully');
    } catch (error) {
      console.error('[Coordinator] Failed to start services:', error);
      await this.stopAll();
      throw error;
    }
  }

  async stopAll(): Promise<void> {
    console.log('[Coordinator] Stopping all services...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const [name, service] of this.services.entries()) {
      try {
        await service.stop();
        console.log(`[Coordinator] Stopped ${name}`);
      } catch (error) {
        console.error(`[Coordinator] Error stopping ${name}:`, error);
      }
    }

    await eventBroker.disconnect();
    this.services.clear();
    this.startTimes.clear();

    console.log('[Coordinator] All services stopped');
  }

  async getServiceHealth(): Promise<ServiceHealth[]> {
    const health: ServiceHealth[] = [];

    for (const [name, service] of this.services.entries()) {
      const startTime = this.startTimes.get(name) || Date.now();
      const uptime = Date.now() - startTime;

      let status: 'healthy' | 'unhealthy' = 'unhealthy';
      try {
        const isHealthy = await service.healthCheck();
        status = isHealthy ? 'healthy' : 'unhealthy';
      } catch (error) {
        console.error(`[Coordinator] Health check failed for ${name}:`, error);
      }

      health.push({
        name,
        status,
        lastCheck: new Date().toISOString(),
        uptime,
      });
    }

    return health;
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.getServiceHealth();
      const unhealthy = health.filter(h => h.status === 'unhealthy');

      if (unhealthy.length > 0) {
        console.warn('[Coordinator] Unhealthy services:', unhealthy.map(h => h.name).join(', '));
      }
    }, 30000);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const coordinator = new ServiceCoordinator();

  process.on('SIGTERM', async () => {
    console.log('[Coordinator] SIGTERM received');
    await coordinator.stopAll();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[Coordinator] SIGINT received');
    await coordinator.stopAll();
    process.exit(0);
  });

  coordinator.startAll().catch(error => {
    console.error('[Coordinator] Fatal error:', error);
    process.exit(1);
  });
}
