export type SupportTopic =
  | 'ride_booking'
  | 'ride_issue'
  | 'bus_booking'
  | 'package_issue'
  | 'package_dispute'
  | 'verification'
  | 'payment'
  | 'refund'
  | 'cancellation'
  | 'general';

export type SupportStatus =
  | 'open'
  | 'investigating'
  | 'waiting_on_user'
  | 'resolved'
  | 'closed';

export type SupportPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportChannel = 'in_app' | 'operations' | 'phone' | 'email';

export interface SupportTicketEvent {
  id: string;
  status: SupportStatus;
  note: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  topic: SupportTopic;
  subject: string;
  detail: string;
  relatedId?: string;
  routeLabel?: string;
  status: SupportStatus;
  priority: SupportPriority;
  channel: SupportChannel;
  resolutionSummary?: string;
  createdAt: string;
  updatedAt: string;
  history: SupportTicketEvent[];
}

const SUPPORT_KEY = 'wasel-support-tickets';

function readTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SUPPORT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTickets(tickets: SupportTicket[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SUPPORT_KEY, JSON.stringify(tickets.slice(0, 100)));
}

function sortTickets(items: SupportTicket[]) {
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function makeEvent(status: SupportStatus, note: string): SupportTicketEvent {
  return {
    id: `support-event-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    status,
    note,
    createdAt: new Date().toISOString(),
  };
}

function defaultPriority(topic: SupportTopic): SupportPriority {
  switch (topic) {
    case 'payment':
    case 'refund':
    case 'package_dispute':
      return 'high';
    case 'ride_issue':
    case 'cancellation':
      return 'normal';
    default:
      return 'low';
  }
}

export function getSupportTickets(): SupportTicket[] {
  return sortTickets(readTickets());
}

export function getSupportTicketsForRelatedId(relatedId?: string): SupportTicket[] {
  if (!relatedId) return [];
  return getSupportTickets().filter((ticket) => ticket.relatedId === relatedId);
}

export function createSupportTicket(input: {
  topic: SupportTopic;
  subject: string;
  detail: string;
  relatedId?: string;
  routeLabel?: string;
  priority?: SupportPriority;
  channel?: SupportChannel;
}): SupportTicket {
  const now = new Date().toISOString();
  const initialStatus: SupportStatus = input.priority === 'urgent' ? 'investigating' : 'open';
  const ticket: SupportTicket = {
    id: `support-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    topic: input.topic,
    subject: input.subject.trim(),
    detail: input.detail.trim(),
    relatedId: input.relatedId,
    routeLabel: input.routeLabel,
    status: initialStatus,
    priority: input.priority ?? defaultPriority(input.topic),
    channel: input.channel ?? 'in_app',
    createdAt: now,
    updatedAt: now,
    history: [
      makeEvent(initialStatus, input.priority === 'urgent'
        ? 'Operations accepted this ticket immediately.'
        : 'Support ticket created and waiting for review.'),
    ],
  };

  writeTickets([ticket, ...readTickets()]);
  return ticket;
}

export function updateSupportTicketStatus(
  id: string,
  status: SupportStatus,
  options?: {
    note?: string;
    resolutionSummary?: string;
    priority?: SupportPriority;
    channel?: SupportChannel;
  },
): SupportTicket | null {
  const tickets = readTickets();
  const target = tickets.find((ticket) => ticket.id === id);
  if (!target) return null;

  const updated: SupportTicket = {
    ...target,
    status,
    priority: options?.priority ?? target.priority,
    channel: options?.channel ?? target.channel,
    resolutionSummary: options?.resolutionSummary ?? target.resolutionSummary,
    updatedAt: new Date().toISOString(),
    history: [
      ...target.history,
      makeEvent(status, options?.note ?? `Ticket moved to ${status}.`),
    ],
  };

  writeTickets(tickets.map((ticket) => (ticket.id === id ? updated : ticket)));
  return updated;
}
