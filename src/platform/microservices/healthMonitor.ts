/**
 * Service Health Monitor — Microservices Observability
 * 
 * Continuously monitors health of all microservices and reports status.
 */

import type { ServiceRegistry } from './serviceRegistry';
import { SERVICE_REGISTRY } from './serviceRegistry';
import { apiGateway } from './apiGateway';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
  responseTime: number;
  uptime: number;
}

export type HealthReport = Record<keyof ServiceRegistry, ServiceHealth>;

class ServiceHealthMonitor {
  private healthStatus: Map<string, ServiceHealth> = new Map();
  private monitoringInterval: number | null = null;
  private readonly CHECK_INTERVAL = 30000; // 30s

  async checkServiceHealth(serviceName: keyof ServiceRegistry): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const isHealthy = await apiGateway.healthCheck(serviceName);
      const responseTime = Date.now() - startTime;
      
      const status: ServiceHealth = {
        name: serviceName,
        status: isHealthy ? 'healthy' : 'down',
        lastCheck: Date.now(),
        responseTime,
        uptime: isHealthy ? 100 : 0,
      };
      
      this.healthStatus.set(serviceName, status);
      return status;
    } catch {
      const status: ServiceHealth = {
        name: serviceName,
        status: 'down',
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        uptime: 0,
      };
      
      this.healthStatus.set(serviceName, status);
      return status;
    }
  }

  async checkAllServices(): Promise<HealthReport> {
    const services = Object.keys(SERVICE_REGISTRY) as Array<keyof ServiceRegistry>;
    const checks = await Promise.all(
      services.map(service => this.checkServiceHealth(service)),
    );
    
    return checks.reduce((report, health) => {
      report[health.name as keyof ServiceRegistry] = health;
      return report;
    }, {} as HealthReport);
  }

  startMonitoring(): void {
    if (this.monitoringInterval) return;
    
    this.checkAllServices();
    this.monitoringInterval = window.setInterval(() => {
      this.checkAllServices();
    }, this.CHECK_INTERVAL);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  getHealthStatus(serviceName: keyof ServiceRegistry): ServiceHealth | undefined {
    return this.healthStatus.get(serviceName);
  }

  getAllHealthStatus(): HealthReport {
    const services = Object.keys(SERVICE_REGISTRY) as Array<keyof ServiceRegistry>;
    return services.reduce((report, service) => {
      const health = this.healthStatus.get(service);
      if (health) {
        report[service] = health;
      }
      return report;
    }, {} as HealthReport);
  }

  isServiceHealthy(serviceName: keyof ServiceRegistry): boolean {
    const health = this.healthStatus.get(serviceName);
    return health?.status === 'healthy';
  }
}

export const serviceHealthMonitor = new ServiceHealthMonitor();
