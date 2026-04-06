import {
  createDirectSupportTicket,
  getDirectSupportTickets,
  updateDirectSupportTicketStatus as updateDirectSupportTicketStatusRemote,
} from './directSupabase';
import { buildSupportSlaDueAt } from '../utils/automationScheduling';

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
  backendId?: string;
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
  syncedAt?: string;
  slaDueAt?: string;
  history: SupportTicketEvent[];
}

const SUPPORT_KEY = 'wasel-support-tickets';

function readTickets(): SupportTicket[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SUPPORT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as SupportTicket[] : [];
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

function upsertTickets(items: SupportTicket[]) {
  const current = readTickets();
  const merged = [...current];

  for (const item of items) {
    const index = merged.findIndex((ticket) =>
      ticket.id === item.id ||
      (ticket.backendId && item.backendId && ticket.backendId === item.backendId) ||
      Boolean(ticket.relatedId && item.relatedId && ticket.relatedId === item.relatedId && ticket.subject === item.subject),
    );

    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        ...item,
        history: item.history.length > 0 ? item.history : merged[index].history,
      };
    } else {
      merged.unshift(item);
    }
  }

  writeTickets(sortTickets(merged));
  return getSupportTickets();
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

function normalizeStatus(value: string | null | undefined): SupportStatus {
  if (value === 'investigating' || value === 'waiting_on_user' || value === 'resolved' || value === 'closed') {
    return value;
  }
  return 'open';
}

function normalizePriority(value: string | null | undefined): SupportPriority {
  if (value === 'normal' || value === 'high' || value === 'urgent') return value;
  return 'low';
}

function normalizeChannel(value: string | null | undefined): SupportChannel {
  if (value === 'operations' || value === 'phone' || value === 'email') return value;
  return 'in_app';
}

function normalizeTopic(value: string | null | undefined): SupportTopic {
  switch (value) {
    case 'ride_booking':
    case 'ride_issue':
    case 'bus_booking':
    case 'package_issue':
    case 'package_dispute':
    case 'verification':
    case 'payment':
    case 'refund':
    case 'cancellation':
      return value;
    default:
      return 'general';
  }
}

function mapRemoteTicket(input: {
  ticket: Record<string, unknown>;
  events: Array<Record<string, unknown>>;
}): SupportTicket {
  const history = input.events.map((event) => ({
    id: String(event.event_id ?? event.id ?? `support-event-${Math.random()}`),
    status: normalizeStatus(String(event.status ?? 'open')),
    note: String(event.note ?? '').trim() || 'Support activity recorded.',
    createdAt: String(event.created_at ?? new Date().toISOString()),
  }));

  const ticket = input.ticket;
  const fallbackNote = String(ticket.latest_note ?? ticket.detail ?? 'Support activity recorded.');
  const normalizedHistory = history.length > 0 ? history : [makeEvent(normalizeStatus(String(ticket.status ?? 'open')), fallbackNote)];

  return {
    id: String(ticket.ticket_id ?? ''),
    backendId: String(ticket.ticket_id ?? ''),
    topic: normalizeTopic(String(ticket.topic ?? 'general')),
    subject: String(ticket.subject ?? 'Support request'),
    detail: String(ticket.detail ?? ''),
    relatedId: String(ticket.related_id ?? '').trim() || undefined,
    routeLabel: String(ticket.route_label ?? '').trim() || undefined,
    status: normalizeStatus(String(ticket.status ?? 'open')),
    priority: normalizePriority(String(ticket.priority ?? 'low')),
    channel: normalizeChannel(String(ticket.channel ?? 'in_app')),
    resolutionSummary: String(ticket.resolution_summary ?? '').trim() || undefined,
    createdAt: String(ticket.created_at ?? new Date().toISOString()),
    updatedAt: String(ticket.updated_at ?? ticket.created_at ?? new Date().toISOString()),
    syncedAt: new Date().toISOString(),
    slaDueAt: String(ticket.sla_due_at ?? '').trim() || undefined,
    history: normalizedHistory,
  };
}

export function getSupportTickets(): SupportTicket[] {
  return sortTickets(readTickets());
}

export async function hydrateSupportTickets(userId?: string): Promise<SupportTicket[]> {
  if (!userId) {
    return getSupportTickets();
  }

  try {
    const remote = await getDirectSupportTickets(userId);
    const mapped = remote.map((item) => mapRemoteTicket(item as unknown as {
      ticket: Record<string, unknown>;
      events: Array<Record<string, unknown>>;
    }));
    return upsertTickets(mapped);
  } catch {
    return getSupportTickets();
  }
}

export function getSupportTicketsForRelatedId(relatedId?: string): SupportTicket[] {
  if (!relatedId) return [];
  return getSupportTickets().filter((ticket) => ticket.relatedId === relatedId);
}

export function createSupportTicket(input: {
  userId?: string;
  topic: SupportTopic;
  subject: string;
  detail: string;
  relatedId?: string;
  routeLabel?: string;
  priority?: SupportPriority;
  channel?: SupportChannel;
}): SupportTicket {
  const now = new Date().toISOString();
  const resolvedPriority = input.priority ?? defaultPriority(input.topic);
  const initialStatus: SupportStatus = resolvedPriority === 'urgent' ? 'investigating' : 'open';
  const initialNote = resolvedPriority === 'urgent'
    ? 'Operations accepted this ticket immediately.'
    : 'Support ticket created and waiting for review.';

  const ticket: SupportTicket = {
    id: `support-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    topic: input.topic,
    subject: input.subject.trim(),
    detail: input.detail.trim(),
    relatedId: input.relatedId,
    routeLabel: input.routeLabel,
    status: initialStatus,
    priority: resolvedPriority,
    channel: input.channel ?? 'in_app',
    createdAt: now,
    updatedAt: now,
    slaDueAt: buildSupportSlaDueAt(resolvedPriority, new Date(now)),
    history: [makeEvent(initialStatus, initialNote)],
  };

  upsertTickets([ticket]);

  if (input.userId) {
    void createDirectSupportTicket(input.userId, {
      topic: ticket.topic,
      subject: ticket.subject,
      detail: ticket.detail,
      relatedId: ticket.relatedId,
      routeLabel: ticket.routeLabel,
      status: ticket.status,
      priority: ticket.priority,
      channel: ticket.channel,
      note: initialNote,
    })
      .then((remote) => {
        const synced = mapRemoteTicket(remote as unknown as {
          ticket: Record<string, unknown>;
          events: Array<Record<string, unknown>>;
        });
        upsertTickets([{ ...synced, id: synced.id || ticket.id }]);
      })
      .catch(() => {});
  }

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
  const target = tickets.find((ticket) => ticket.id === id || ticket.backendId === id);
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

  upsertTickets([updated]);

  if (target.backendId) {
    void updateDirectSupportTicketStatusRemote(target.backendId, {
      status,
      note: options?.note ?? `Ticket moved to ${status}.`,
      resolutionSummary: options?.resolutionSummary,
      priority: options?.priority,
      channel: options?.channel,
    })
      .then((remote) => {
        upsertTickets([
          mapRemoteTicket(remote as unknown as {
            ticket: Record<string, unknown>;
            events: Array<Record<string, unknown>>;
          }),
        ]);
      })
      .catch(() => {});
  }

  return updated;
}
