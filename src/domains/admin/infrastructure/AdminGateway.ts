import {
  createSupportTicket,
  getSupportTickets,
  updateSupportTicketStatus,
} from '@/services/supportInbox';

export class AdminGateway {
  createSupportTicket(...args: Parameters<typeof createSupportTicket>) {
    return createSupportTicket(...args);
  }

  getSupportTickets() {
    return getSupportTickets();
  }

  updateSupportTicketStatus(...args: Parameters<typeof updateSupportTicketStatus>) {
    return updateSupportTicketStatus(...args);
  }
}
