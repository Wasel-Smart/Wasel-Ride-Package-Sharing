import { createDomainEvent, publishDomainEvent } from '@/platform';
import { ADMIN_DOMAIN_EVENTS } from '../domain/events';
import { AdminGateway } from '../infrastructure/AdminGateway';

class AdminApplicationService {
  constructor(private readonly gateway: AdminGateway) {}

  createSupportTicket(...args: Parameters<AdminGateway['createSupportTicket']>) {
    const ticket = this.gateway.createSupportTicket(...args);
    void publishDomainEvent(createDomainEvent({
      name: ADMIN_DOMAIN_EVENTS.supportTicketCreated,
      domain: 'admin',
      payload: { ticketId: ticket.id, priority: ticket.priority, topic: ticket.topic },
    }));
    return ticket;
  }

  updateSupportTicketStatus(...args: Parameters<AdminGateway['updateSupportTicketStatus']>) {
    const ticket = this.gateway.updateSupportTicketStatus(...args);
    if (ticket) {
      void publishDomainEvent(createDomainEvent({
        name: ADMIN_DOMAIN_EVENTS.supportTicketUpdated,
        domain: 'admin',
        payload: { ticketId: ticket.id, status: ticket.status },
      }));
    }
    return ticket;
  }
}

export const adminApplicationService = new AdminApplicationService(new AdminGateway());
