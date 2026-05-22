/**
 * supportInbox.ts
 *
 * Architecture:
 *  - Supabase `support_tickets` table is the PRIMARY store (via directSupabase).
 *  - An in-memory cache provides instant reads for the current session.
 *  - localStorage is NOT used. Support tickets are financial/legal records;
 *    browser-local persistence is a data-integrity and compliance risk.
 *  - Unauthenticated (guest) users get an in-memory-only experience.
 *    Their tickets ARE written to Supabase (anonymously where possible).
 *  - On sign-out, call clearSupportTicketCache() to wipe the cache.
 */

import {
  createDirectSupportTicket,
  getDirectSupportTickets,
  updateDirectSupportTicketStatus,
} from './directSupabase';
import {
  readPendingSyncRecords,
  replacePendingSyncRecords,
  upsertPendingSyncRecord,
  type PendingSyncRecord,
} from './pendingSyncBuffer';

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

export type SupportStatus = 'open' | 'investigating' | 'waiting_on_user' | 'resolved' | 'closed';

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

type PendingSupportOperation =
  | {
      kind: 'create';
      userId: string;
      localTicketId: string;
      input: {
        topic: SupportTopic;
        subject: string;
        detail: string;
        relatedId?: string;
        routeLabel?: string;
        priority?: SupportPriority;
        channel?: SupportChannel;
      };
    }
  | {
      kind: 'update';
      userId: string;
      ticketId: string;
      status: SupportStatus;
      options?: {
        note?: string;
        resolutionSummary?: string;
        priority?: SupportPriority;
        channel?: SupportChannel;
      };
    };

const SUPPORT_SYNC_QUEUE = 'support-tickets';

// ── In-memory cache (keyed by userId or 'guest') ──────────────────────────────

const ticketCache = new Map<string, SupportTicket[]>();

function cacheKey(userId?: string | null): string {
  return userId ? String(userId) : 'guest';
}

function readTickets(userId?: string | null): SupportTicket[] {
  return ticketCache.get(cacheKey(userId)) ?? [];
}

function writeTickets(userId: string | null | undefined, tickets: SupportTicket[]): void {
  ticketCache.set(cacheKey(userId), sortTickets(tickets).slice(0, 100));
}

function upsertTicket(userId: string | null | undefined, ticket: SupportTicket): SupportTicket {
  const existing = readTickets(userId);
  writeTickets(userId, [ticket, ...existing.filter(item => item.id !== ticket.id)]);
  return ticket;
}

function replaceTicket(
  userId: string | null | undefined,
  previousId: string,
  ticket: SupportTicket,
): SupportTicket {
  const existing = readTickets(userId);
  writeTickets(
    userId,
    [ticket, ...existing.filter(item => item.id !== previousId && item.id !== ticket.id)],
  );
  return ticket;
}

/** Clear the in-memory cache. Call on sign-out. */
export function clearSupportTicketCache(): void {
  ticketCache.clear();
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function sortTickets(items: SupportTicket[]) {
  return [...items].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
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

function normalizePriority(
  value: string | null | undefined,
  fallbackTopic?: SupportTopic,
): SupportPriority {
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
  const safeHistory =
    history.length > 0
      ? [...history].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
      : [
          makeEvent(status, 'Support ticket created and waiting for review.', {
            createdAt: row.created_at ?? undefined,
          }),
        ];

  return {
    id: row.id ? String(row.id) : generateId('support'),
    topic,
    subject:
      typeof row.subject === 'string' && row.subject.trim().length > 0
        ? row.subject.trim()
        : 'Support request',
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

function buildDirectTicketList(
  payload: Awaited<ReturnType<typeof getDirectSupportTickets>>,
): SupportTicket[] {
  const eventsByTicketId = new Map<string, SupportTicketEvent[]>();

  for (const event of payload.events as DirectSupportTicketEventRow[]) {
    const ticketId = String(event.ticket_id ?? '');
    if (!ticketId) continue;
    const history = eventsByTicketId.get(ticketId) ?? [];
    history.push(mapDirectEvent(event));
    eventsByTicketId.set(ticketId, history);
  }

  const tickets = (payload.tickets as DirectSupportTicketRow[]).map(ticket => {
    const ticketId = String(ticket.id ?? '');
    return mapDirectTicket(ticket, eventsByTicketId.get(ticketId) ?? []);
  });

  return sortTickets(tickets);
}

async function flushPendingSupportOperations(): Promise<void> {
  const records = readPendingSyncRecords<PendingSupportOperation>(SUPPORT_SYNC_QUEUE);
  if (records.length === 0) return;

  const remaining: PendingSyncRecord<PendingSupportOperation>[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;

    try {
      const payload = record.payload;

      if (payload.kind === 'create') {
        const direct = await createDirectSupportTicket(payload.userId, payload.input);
        const persisted = replaceTicket(
          payload.userId,
          payload.localTicketId,
          mapDirectTicket(direct.ticket as DirectSupportTicketRow, [
            mapDirectEvent(direct.event as DirectSupportTicketEventRow),
          ]),
        );

        for (let cursor = index + 1; cursor < records.length; cursor += 1) {
          const pending = records[cursor];
          if (!pending) continue;
          if (
            pending.payload.kind === 'update' &&
            pending.payload.userId === payload.userId &&
            pending.payload.ticketId === payload.localTicketId
          ) {
            records[cursor] = {
              ...pending,
              payload: {
                ...pending.payload,
                ticketId: persisted.id,
              },
            };
          }
        }

        continue;
      }

      const direct = await updateDirectSupportTicketStatus(
        payload.userId,
        payload.ticketId,
        payload.status,
        payload.options,
      );
      const current = readTickets(payload.userId).find(ticket => ticket.id === payload.ticketId);
      const history = current
        ? [...current.history, mapDirectEvent(direct.event as DirectSupportTicketEventRow)]
        : [mapDirectEvent(direct.event as DirectSupportTicketEventRow)];
      upsertTicket(
        payload.userId,
        mapDirectTicket(direct.ticket as DirectSupportTicketRow, history),
      );
    } catch (error) {
      remaining.push({
        ...record,
        attempts: record.attempts + 1,
        updatedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : 'Support sync failed',
      });
    }
  }

  replacePendingSyncRecords(SUPPORT_SYNC_QUEUE, remaining);
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

// ── Public API ────────────────────────────────────────────────────────────────

export async function getSupportTickets(userId?: string | null): Promise<SupportTicket[]> {
  const cached = sortTickets(readTickets(userId));
  if (!userId) {
    return cached;
  }

  try {
    await flushPendingSupportOperations();
    const payload = await getDirectSupportTickets(userId);
    const remote = buildDirectTicketList(payload);
    writeTickets(userId, remote);
    return remote;
  } catch {
    return cached;
  }
}

export async function getSupportTicketsForRelatedId(
  userId?: string | null,
  relatedId?: string,
): Promise<SupportTicket[]> {
  if (!relatedId) return [];
  const tickets = await getSupportTickets(userId);
  return tickets.filter(ticket => ticket.relatedId === relatedId);
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
    // Guest: in-memory only for this session
    return upsertTicket(userId, fallbackTicket);
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
    return upsertTicket(
      userId,
      mapDirectTicket(direct.ticket as DirectSupportTicketRow, [
        mapDirectEvent(direct.event as DirectSupportTicketEventRow),
      ]),
    );
  } catch {
    upsertPendingSyncRecord(SUPPORT_SYNC_QUEUE, {
      kind: 'create',
      userId,
      localTicketId: fallbackTicket.id,
    input: {
      topic: input.topic,
      subject: input.subject,
      detail: input.detail,
      relatedId: input.relatedId,
      routeLabel: input.routeLabel,
      priority: input.priority,
      channel: input.channel,
    },
    });
    // Supabase write failed: surface in-memory copy for the session.
    return upsertTicket(userId, fallbackTicket);
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
  const current = existing.find(ticket => ticket.id === id);
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
    return upsertTicket(userId, fallbackUpdated);
  }

  try {
    const direct = await updateDirectSupportTicketStatus(userId, id, status, options);
    const history = current
      ? [...current.history, mapDirectEvent(direct.event as DirectSupportTicketEventRow)]
      : [mapDirectEvent(direct.event as DirectSupportTicketEventRow)];
    return upsertTicket(
      userId,
      mapDirectTicket(direct.ticket as DirectSupportTicketRow, history),
    );
  } catch {
    if (!fallbackUpdated) return null;
    upsertPendingSyncRecord(
      SUPPORT_SYNC_QUEUE,
      {
        kind: 'update',
        userId,
        ticketId: id,
        status,
        options,
      },
      record =>
        record.payload.kind === 'update' &&
        record.payload.userId === userId &&
        record.payload.ticketId === id,
    );
    return upsertTicket(userId, fallbackUpdated);
  }
}
