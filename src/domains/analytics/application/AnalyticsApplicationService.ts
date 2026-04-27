import { createDomainEvent, publishDomainEvent } from '@/platform';
import { ANALYTICS_DOMAIN_EVENTS } from '../domain/events';
import { AnalyticsGateway } from '../infrastructure/AnalyticsGateway';

class AnalyticsApplicationService {
  constructor(private readonly gateway: AnalyticsGateway) {}

  async getGrowthDashboard(userId?: string) {
    const dashboard = await this.gateway.getGrowthDashboard(userId);
    await publishDomainEvent(createDomainEvent({
      name: ANALYTICS_DOMAIN_EVENTS.dashboardRead,
      domain: 'analytics',
      payload: { userId: userId ?? null },
    }));
    return dashboard;
  }

  async trackGrowthEvent(...args: Parameters<AnalyticsGateway['trackGrowthEvent']>) {
    await this.gateway.trackGrowthEvent(...args);
    const trackedInput = args[0];
    await publishDomainEvent(createDomainEvent({
      name: ANALYTICS_DOMAIN_EVENTS.eventTracked,
      domain: 'analytics',
      payload: {
        eventName: trackedInput.eventName,
        funnelStage: trackedInput.funnelStage,
        serviceType: trackedInput.serviceType,
      },
    }));
    return undefined;
  }
}

export const analyticsApplicationService = new AnalyticsApplicationService(new AnalyticsGateway());
