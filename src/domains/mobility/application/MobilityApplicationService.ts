import { createDomainEvent, publishDomainEvent } from '@/platform';
import { MOBILITY_DOMAIN_EVENTS } from '../domain/events';
import { MobilityGateway } from '../infrastructure/MobilityGateway';

class MobilityApplicationService {
  constructor(private readonly gateway: MobilityGateway) {}

  async createTrip(...args: Parameters<MobilityGateway['createTrip']>) {
    const trip = await this.gateway.createTrip(...args);
    await publishDomainEvent(createDomainEvent({
      name: MOBILITY_DOMAIN_EVENTS.tripCreated,
      domain: 'mobility',
      payload: { tripId: trip.id, from: trip.from, to: trip.to },
    }));
    return trip;
  }

  async searchTrips(...args: Parameters<MobilityGateway['searchTrips']>) {
    const trips = await this.gateway.searchTrips(...args);
    await publishDomainEvent(createDomainEvent({
      name: MOBILITY_DOMAIN_EVENTS.searched,
      domain: 'mobility',
      payload: { criteria: args[0], resultCount: Array.isArray(trips) ? trips.length : 1 },
    }));
    return trips;
  }

  async updateTrip(...args: Parameters<MobilityGateway['updateTrip']>) {
    const trip = await this.gateway.updateTrip(...args);
    await publishDomainEvent(createDomainEvent({
      name: MOBILITY_DOMAIN_EVENTS.tripUpdated,
      domain: 'mobility',
      payload: { tripId: trip.id, status: args[1].status ?? 'active' },
    }));
    return trip;
  }
}

export const mobilityApplicationService = new MobilityApplicationService(new MobilityGateway());
