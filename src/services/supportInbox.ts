import {
  createDirectSupportTicket,
  getDirectSupportTickets,
  updateDirectSupportTicketStatus,
} from './directSupabase';

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

type DirectSupportTicketRow = {
  id?: string;
  topic?: string | null;
  subject?: string | null;
  detail?: string | null;
  related_id?: string | null;
  route_label?: string | null;
  status?: string | null;
  priority?: string | null;
  channel?: string | null;
  resolution_summary?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type DirectSupportTicketEventRow = {
  id?: string;
  ticket_id?: string;
  status?: string | null;
  note?: string | null;
  created_at?: string | null;
};

const SUPPORT_KEY = 'wasel-support-tickets';

function storageKeyFor(userId?: string | null) {
  return `${SUPPORT_KEY}:${userId || 'guest'}`;
}

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function readTicketArray(key: string): SupportTicket[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed as SupportTicket[] : [];
  } catch {
    return [];
  }
}

function readTickets(userId?: string | null): SupportTicket[] {
  const scoped = readTicketArray(storageKeyFor(userId));
  if (scoped.length > 0) {
    return scoped;
  }

  return readTicketArray(SUPPORT_KEY);
}

function writeTickets(userId: string | null | undefined, tickets: SupportTicket[]) {
  if (typeof window === 'undefined') return;

  const trimmed = sortTickets(tickets).slice(0, 100);
  window.localStorage.setItem(storageKeyFor(userId), JSON.stringify(trimmed));

  if (!userId) {
    window.localStorage.setItem(SUPPORT_KEY, JSON.stringify(trimmed));
  }
}

function sortTickets(items: SupportTicket[]) {
  return [...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

function makeEvent(
  status: SupportStatus,
  note: string,
  options?: { id?: string; createdAt?: string },
): SupportTicketEvent {
  return {
    id: options?.id ?? generateId('support-event'),
    status,
    note,
    createdAt: options?.createdAt ?? new Date().toISOString(),
  };
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

function normalizeStatus(value: string | null | undefined): SupportStatus {
  switch (value) {
    case 'investigating':
    case 'waiting_on_user':
    case 'resolved':
    case 'closed':
      return value;
    default:
      return 'open';
  }
}

function normalizePriority(value: string | null | undefined, fallbackTopic?: SupportTopic): SupportPriority {
  switch (value) {
    case 'normal':
    case 'high':
    case 'urgent':
      return value;
    case 'low':
      return 'low';
    default:
      return defaultPriority(fallbackTopic ?? 'general');
  }
}

function normalizeChannel(value: string | null | undefined): SupportChannel {
  switch (value) {
    case 'operations':
    case 'phone':
    case 'email':
      return value;
    default:
      return 'in_app';
  }
}

function upsertLocalTicket(userId: string | null | undefined, ticket: SupportTicket): SupportTicket {
  const existing = readTickets(userId);
  writeTickets(
    userId,
    [ticket, ...existing.filter((item) => item.id !== ticket.id)],
  );
  return ticket;
}

function mapDirectEvent(row: DirectSupportTicketEventRow): SupportTicketEvent {
  const status = normalizeStatus(row.status);
  return makeEvent(
    status,
    typeof row.note === 'string' && row.note.trim().length > 0
      ? row.note
      : `Ticket moved to ${status}.`,
    {
      id: row.id ? String(row.id) : undefined,
      createdAt: row.created_at ?? undefined,
    },
  );
}

function mapDirectTicket(
  row: DirectSupportTicketRow,
  history: SupportTicketEvent[],
): SupportTicket {
  const topic = normalizeTopic(row.topic);
  const status = normalizeStatus(row.status);
  const safeHistory = history.length > 0
    ? [...history].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [makeEvent(status, 'Support ticket created and waiting for review.', { createdAt: row.created_at ?? undefined })];

  return {
    id: row.id ? String(row.id) : generateId('support'),
    topic,
    subject: typeof row.subject === 'string' && row.subject.trim().length > 0 ? row.subject.trim() : 'Support request',
    detail: typeof row.detail === 'string' ? row.detail.trim() : '',
    relatedId: row.related_id ?? undefined,
    routeLabel: row.route_label ?? undefined,
    status,
    priority: normalizePriority(row.priority, topic),
    channel: normalizeChannel(row.channel),
    resolutionSummary: row.resolution_summary ?? undefined,
    createdAt: row.created_at ?? safeHistory[0]?.createdAt ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    history: safeHistory,
  };
}

function buildDirectTicketList(payload: Awaited<ReturnType<typeof getDirectSupportTickets>>): SupportTicket[] {
  const eventsByTicketId = new Map<string, SupportTicketEvent[]>();

  for (const event of payload.events as DirectSupportTicketEventRow[]) {
    const ticketId = String(event.ticket_id ?? '');
    if (!ticketId) continue;
    const history = eventsByTicketId.get(ticketId) ?? [];
    history.push(mapDirectEvent(event));
    eventsByTicketId.set(ticketId, history);
  }

  const tickets = (payload.tickets as DirectSupportTicketRow[]).map((ticket) => {
    const ticketId = String(ticket.id ?? '');
    return mapDirectTicket(ticket, eventsByTicketId.get(ticketId) ?? []);
  });

  return sortTickets(tickets);
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

export async function getSupportTickets(userId?: string | null): Promise<SupportTicket[]> {
  const local = sortTickets(readTickets(userId));
  if (!userId) {
    return local;
  }

  try {
    const payload = await getDirectSupportTickets(userId);
    const remote = buildDirectTicketList(payload);
    writeTickets(userId, remote);
    return remote;
  } catch {
    return local;
  }
}

export async function getSupportTicketsForRelatedId(
  userId?: string | null,
  relatedId?: string,
): Promise<SupportTicket[]> {
  if (!relatedId) return [];
  const tickets = await getSupportTickets(userId);
  return tickets.filter((ticket) => ticket.relatedId === relatedId);
}

export async function createSupportTicket(
  userId: string | null | undefined,
  input: {
    topic: SupportTopic;
    subject: string;
    detail: string;
    relatedId?: string;
    routeLabel?: string;
    priority?: SupportPriority;
    channel?: SupportChannel;
  },
): Promise<SupportTicket> {
  const now = new Date().toISOString();
  const priority = input.priority ?? defaultPriority(input.topic);
  const initialStatus: SupportStatus = priority === 'urgent' ? 'investigating' : 'open';
  const fallbackTicket: SupportTicket = {
    id: generateId('support'),
    topic: input.topic,
    subject: input.subject.trim(),
    detail: input.detail.trim(),
    relatedId: input.relatedId,
    routeLabel: input.routeLabel,
    status: initialStatus,
    priority,
    channel: input.channel ?? 'in_app',
    createdAt: now,
    updatedAt: now,
    history: [
      makeEvent(
        initialStatus,
        priority === 'urgent'
          ? 'Operations accepted this ticket immediately.'
          : 'Support ticket created and waiting for review.',
        { createdAt: now },
      ),
    ],
  };

  if (!userId) {
    return upsertLocalTicket(userId, fallbackTicket);
  }

  try {
    const direct = await createDirectSupportTicket(userId, {
      topic: input.topic,
      subject: input.subject,
      detail: input.detail,
      relatedId: input.relatedId,
      routeLabel: input.routeLabel,
      priority: input.priority,
      channel: input.channel,
    });
    return upsertLocalTicket(
      userId,
      mapDirectTicket(
        direct.ticket as DirectSupportTicketRow,
        [mapDirectEvent(direct.event as DirectSupportTicketEventRow)],
      ),
    );
  } catch {
    return upsertLocalTicket(userId, fallbackTicket);
  }
}

export async function updateSupportTicketStatus(
  userId: string | null | undefined,
  id: string,
  status: SupportStatus,
  options?: {
    note?: string;
    resolutionSummary?: string;
    priority?: SupportPriority;
    channel?: SupportChannel;
  },
): Promise<SupportTicket | null> {
  const existing = readTickets(userId);
  const current = existing.find((ticket) => ticket.id === id);
  const fallbackUpdated = current
    ? {
        ...current,
        status,
        priority: options?.priority ?? current.priority,
        channel: options?.channel ?? current.channel,
        resolutionSummary: options?.resolutionSummary ?? current.resolutionSummary,
        updatedAt: new Date().toISOString(),
        history: [
          ...current.history,
          makeEvent(status, options?.note ?? `Ticket moved to ${status}.`),
        ],
      }
    : null;

  if (!userId) {
    if (!fallbackUpdated) return null;
    return upsertLocalTicket(userId, fallbackUpdated);
  }

  try {
    const direct = await updateDirectSupportTicketStatus(userId, id, status, options);
    const history = current
      ? [...current.history, mapDirectEvent(direct.event as DirectSupportTicketEventRow)]
      : [mapDirectEvent(direct.event as DirectSupportTicketEventRow)];
    return upsertLocalTicket(
      userId,
      mapDirectTicket(direct.ticket as DirectSupportTicketRow, history),
    );
  } catch {
    if (!fallbackUpdated) return null;
    return upsertLocalTicket(userId, fallbackUpdated);
  }
}
