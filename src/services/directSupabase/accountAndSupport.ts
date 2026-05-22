import { getDb } from './helpers';
import { readRuntimeState, writeRuntimeState } from '../../utils/runtimeStore';

type DirectSupportTicketRow = {
  id?: string;
  user_id?: string;
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

type DirectUserSettingsRow = {
  user_id?: string;
  locale?: string | null;
  currency?: string | null;
  theme?: string | null;
  profile_visible?: boolean | null;
  photo_hidden?: boolean | null;
  location_sharing_enabled?: boolean | null;
  analytics_enabled?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const SUPPORT_TICKETS_KEY = 'wasel.direct.supportTickets';
const SUPPORT_EVENTS_KEY = 'wasel.direct.supportTicketEvents';
const USER_SETTINGS_KEY = 'wasel.direct.userSettings';

function readStore<T>(key: string): T[] {
  const stored = readRuntimeState<unknown>(key, []);
  return Array.isArray(stored) ? (stored as T[]) : [];
}

function writeStore<T>(key: string, value: T[]) {
  writeRuntimeState(key, value);
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sortByDateDesc<T extends { updated_at?: string | null; created_at?: string | null }>(
  rows: T[],
) {
  return [...rows].sort((a, b) => {
    const left = new Date(a.updated_at ?? a.created_at ?? 0).getTime();
    const right = new Date(b.updated_at ?? b.created_at ?? 0).getTime();
    return right - left;
  });
}

async function trySelectTickets(userId: string) {
  const db = getDb();
  const { data, error } = await db
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DirectSupportTicketRow[];
}

async function trySelectTicketEvents(ticketIds: string[]) {
  if (ticketIds.length === 0) return [] as DirectSupportTicketEventRow[];
  const db = getDb();
  const { data, error } = await db
    .from('support_ticket_events')
    .select('*')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DirectSupportTicketEventRow[];
}

export async function createDirectSupportTicket(
  userId: string,
  input: {
    topic: string;
    subject: string;
    detail: string;
    relatedId?: string;
    routeLabel?: string;
    priority?: string;
    channel?: string;
  },
) {
  const now = new Date().toISOString();
  const ticket: DirectSupportTicketRow = {
    id: makeId('support'),
    user_id: userId,
    topic: input.topic,
    subject: input.subject,
    detail: input.detail,
    related_id: input.relatedId ?? null,
    route_label: input.routeLabel ?? null,
    status: input.priority === 'urgent' ? 'investigating' : 'open',
    priority: input.priority ?? 'normal',
    channel: input.channel ?? 'in_app',
    resolution_summary: null,
    created_at: now,
    updated_at: now,
  };
  const event: DirectSupportTicketEventRow = {
    id: makeId('support-event'),
    ticket_id: ticket.id,
    status: ticket.status,
    note:
      ticket.priority === 'urgent'
        ? 'Operations accepted this ticket immediately.'
        : 'Support ticket created and waiting for review.',
    created_at: now,
  };

  try {
    const db = getDb();
    const { data, error } = await db.from('support_tickets').insert(ticket).select('*').single();
    if (error) throw error;
    const persistedTicket = (data as DirectSupportTicketRow | null) ?? ticket;
    const { data: eventData, error: eventError } = await db
      .from('support_ticket_events')
      .insert({ ...event, ticket_id: persistedTicket.id })
      .select('*')
      .single();
    if (eventError) throw eventError;
    return {
      ticket: persistedTicket,
      event: (eventData as DirectSupportTicketEventRow | null) ?? event,
    };
  } catch {
    const tickets = readStore<DirectSupportTicketRow>(SUPPORT_TICKETS_KEY);
    const events = readStore<DirectSupportTicketEventRow>(SUPPORT_EVENTS_KEY);
    writeStore(SUPPORT_TICKETS_KEY, [ticket, ...tickets]);
    writeStore(SUPPORT_EVENTS_KEY, [event, ...events]);
    return { ticket, event };
  }
}

export async function getDirectSupportTickets(userId: string) {
  try {
    const tickets = await trySelectTickets(userId);
    const events = await trySelectTicketEvents(
      tickets.map(ticket => String(ticket.id ?? '')).filter(Boolean),
    );
    return { tickets, events };
  } catch {
    const tickets = sortByDateDesc(
      readStore<DirectSupportTicketRow>(SUPPORT_TICKETS_KEY).filter(
        ticket => ticket.user_id === userId,
      ),
    );
    const ticketIds = new Set(tickets.map(ticket => String(ticket.id ?? '')));
    const events = readStore<DirectSupportTicketEventRow>(SUPPORT_EVENTS_KEY).filter(event =>
      ticketIds.has(String(event.ticket_id ?? '')),
    );
    return { tickets, events };
  }
}

export async function updateDirectSupportTicketStatus(
  userId: string,
  ticketId: string,
  status: string,
  options?: { note?: string; resolutionSummary?: string },
) {
  const now = new Date().toISOString();
  const event: DirectSupportTicketEventRow = {
    id: makeId('support-event'),
    ticket_id: ticketId,
    status,
    note: options?.note ?? `Ticket moved to ${status}.`,
    created_at: now,
  };

  try {
    const db = getDb();
    const { data, error } = await db
      .from('support_tickets')
      .update({
        status,
        resolution_summary: options?.resolutionSummary,
        updated_at: now,
      })
      .eq('id', ticketId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw error;
    const { data: eventData, error: eventError } = await db
      .from('support_ticket_events')
      .insert(event)
      .select('*')
      .single();
    if (eventError) throw eventError;
    return {
      ticket: data as DirectSupportTicketRow,
      event: (eventData as DirectSupportTicketEventRow | null) ?? event,
    };
  } catch {
    const tickets = readStore<DirectSupportTicketRow>(SUPPORT_TICKETS_KEY);
    const nextTickets = tickets.map(ticket =>
      ticket.id === ticketId && ticket.user_id === userId
        ? {
            ...ticket,
            status,
            resolution_summary: options?.resolutionSummary ?? ticket.resolution_summary ?? null,
            updated_at: now,
          }
        : ticket,
    );
    const updatedTicket =
      nextTickets.find(ticket => ticket.id === ticketId && ticket.user_id === userId) ?? null;
    if (!updatedTicket) {
      throw new Error('Support ticket not found');
    }
    const events = readStore<DirectSupportTicketEventRow>(SUPPORT_EVENTS_KEY);
    writeStore(SUPPORT_TICKETS_KEY, nextTickets);
    writeStore(SUPPORT_EVENTS_KEY, [...events, event]);
    return { ticket: updatedTicket, event };
  }
}

export async function getDirectUserSettings(userId: string) {
  try {
    const db = getDb();
    const { data, error } = await db
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return (data as DirectUserSettingsRow | null) ?? null;
  } catch {
    return (
      readStore<DirectUserSettingsRow>(USER_SETTINGS_KEY).find(row => row.user_id === userId) ??
      null
    );
  }
}

export async function upsertDirectUserSettings(
  userId: string,
  updates: Partial<DirectUserSettingsRow>,
) {
  const now = new Date().toISOString();
  const nextRow: DirectUserSettingsRow = {
    ...(await getDirectUserSettings(userId)),
    user_id: userId,
    ...updates,
    updated_at: now,
  };

  try {
    const db = getDb();
    const { data, error } = await db
      .from('user_settings')
      .upsert(nextRow, { onConflict: 'user_id' })
      .select('*')
      .single();
    if (error) throw error;
    return (data as DirectUserSettingsRow | null) ?? nextRow;
  } catch {
    const rows = readStore<DirectUserSettingsRow>(USER_SETTINGS_KEY);
    const filtered = rows.filter(row => row.user_id !== userId);
    writeStore(USER_SETTINGS_KEY, [...filtered, nextRow]);
    return nextRow;
  }
}
