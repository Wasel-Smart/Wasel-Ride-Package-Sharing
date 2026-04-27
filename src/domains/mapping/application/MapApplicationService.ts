import { createDomainEvent, publishDomainEvent } from '@/platform';
import { MAPPING_DOMAIN_EVENTS } from '../domain/events';
import { MapProviderGateway } from '../infrastructure/MapProviderGateway';

class MapApplicationService {
  constructor(private readonly gateway: MapProviderGateway) {}

  async fetchRoutePath(...args: Parameters<MapProviderGateway['fetchRoutePath']>) {
    const path = await this.gateway.fetchRoutePath(...args);
    await publishDomainEvent(createDomainEvent({
      name: MAPPING_DOMAIN_EVENTS.routeResolved,
      domain: 'mapping',
      payload: { points: path.length },
    }));
    return path;
  }

  async fetchPointsOfInterest(...args: Parameters<MapProviderGateway['fetchPointsOfInterest']>) {
    const items = await this.gateway.fetchPointsOfInterest(...args);
    await publishDomainEvent(createDomainEvent({
      name: MAPPING_DOMAIN_EVENTS.pointsOfInterestFetched,
      domain: 'mapping',
      payload: { type: args[0], count: items.length },
    }));
    return items;
  }

  resolveTiles(...args: Parameters<MapProviderGateway['resolveTiles']>) {
    return this.gateway.resolveTiles(...args);
  }
}

export const mapApplicationService = new MapApplicationService(new MapProviderGateway());
