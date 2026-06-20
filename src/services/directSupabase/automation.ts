import { getDb } from './helpers';
import { buildUserContext } from './userContext';
import type {
  RawAutomationJob,
  RawPricingSnapshot,
  RawRouteReminder,
  RawSupportTicket,
  RawSupportTicketEvent,
} from './types';
import {
  buildJordanCorridorKey,
  getJordanRouteScope,
  normalizeJordanLocation,
} from '../../utils/jordanLocations';
import { buildSupportSlaDueAt } from '../../utils/automationScheduling';
import {
  pricingSnapshotPayloadSchema,
  withDataIntegrity,
} from '../dataIntegrity';

type SupportTicketRpcResult = {
  ticket: Record<string, unknown>;
  events: Array<Record<string, unknown>>;
};

function normalizeRoute(from?: string | null, to?: string | null) {
  const origin = from ? normalizeJordanLocation(from, from) : null;
  const destination = to ? normalizeJordanLocation(to, to) : null;
  return {
    origin,
    destination,
    routeScope: origin && destination ? getJordanRouteScope(origin, destination) : null,
    corridorKey: origin && destination ? buildJordanCorridorKey(origin, destination) : null,
  };
}

function unwrapRpcData(data: unknown) {
  if (Array.isArray(data)) {
    return data[0] ?? null;
  }
  return data;
}

function isMissingRpcError(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : error instanceof Error
        ? error.message
        : String(error ?? '');

  return (
    code === 'PGRST202' ||
    message.includes('Could not find the function') ||
    message.includes('function public.app_')
  );
}

function parseAutomationJobRpcResult(data: unknown): RawAutomationJob {
  const parsed = unwrapRpcData(data);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as RawAutomationJob;
  }

  throw new Error('Unexpected automation job RPC response');
}

function parseSupportTicketRpcResult(data: unknown): SupportTicketRpcResult {
  const parsed = unwrapRpcData(data);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Unexpected support ticket RPC response');
  }

  const record = parsed as Record<string, unknown>;
  const ticket =
    record.ticket && typeof record.ticket === 'object' && !Array.isArray(record.ticket)
      ? (record.ticket as Record<string, unknown>)
      : null;
  const events = Array.isArray(record.events)
    ? record.events.filter((event): event is Record<string, unknown> => Boolean(event) && typeof event === 'object' && !Array.isArray(event))
    : [];

  if (!ticket) {
    throw new Error('Support ticket RPC did not return a ticket payload');
  }

  return {
    ticket,
    events,
  };
}

export async function getDirectRouteReminders(userId: string) {
  const db = getDb();
  const context = await buildUserContext(userId);
  const { data, error } = await db
    .from('route_reminders')
    .select('*')
    .eq('user_id', context.user.id)
    .order('next_reminder_at', { ascending: true })
    .limit(50);
  if (error) {throw error;}
  return Array.isArray(data) ? (data as RawRouteReminder[]) : [];
}

export async function upsertDirectRouteReminder(userId: string, input: {
  corridorId: string;
  label: string;
  from: string;
  to: string;
  frequency: string;
  preferredTime: string;
  nextReminderAt: string;
  enabled?: boolean;
}) {
  const db = getDb();
  const context = await buildUserContext(userId);
  const route = normalizeRoute(input.from, input.to);
  const { data, error } = await db
    .from('route_reminders')
    .upsert({
      user_id: context.user.id,
      corridor_id: input.corridorId,
      label: input.label,
      origin_location: route.origin,
      destination_location: route.destination,
      frequency: input.frequency,
      preferred_time: input.preferredTime,
      next_reminder_at: input.nextReminderAt,
      enabled: input.enabled ?? true,
    }, { onConflict: 'user_id,corridor_id' })
    .select('*')
    .single();
  if (error) {throw error;}
  return data as RawRouteReminder;
}

export async function markDirectRouteReminderDelivered(reminderId: string, input: {
  nextReminderAt: string;
  lastSentAt: string;
}) {
  const db = getDb();
  const { error } = await db
    .from('route_reminders')
    .update({
      next_reminder_at: input.nextReminderAt,
      last_sent_at: input.lastSentAt,
      updated_at: new Date().toISOString(),
    })
    .eq('reminder_id', reminderId);
  if (error) {throw error;}
}

export async function createDirectPricingSnapshot(input: {
  userId?: string;
  corridorId?: string | null;
  from: string;
  to: string;
  basePriceJod: number;
  finalPriceJod: number;
  demandScore?: number;
  pricePressure?: string;
  sourceContext?: string;
  metadata?: Record<string, unknown>;
}) {
  return withDataIntegrity({
    operation: 'pricing.snapshot.direct',
    schema: pricingSnapshotPayloadSchema,
    payload: input,
    execute: async ({ payload }) => {
      const db = getDb();
      const context = payload.userId ? await buildUserContext(payload.userId).catch(() => null) : null;
      const route = normalizeRoute(payload.from, payload.to);
      const { data, error } = await db
        .from('pricing_snapshots')
        .insert({
          user_id: context?.user.id ?? null,
          corridor_id: payload.corridorId ?? null,
          corridor_key: route.corridorKey,
          route_scope: route.routeScope,
          origin_location: route.origin,
          destination_location: route.destination,
          base_price_jod: payload.basePriceJod,
          final_price_jod: payload.finalPriceJod,
          demand_score: payload.demandScore ?? null,
          price_pressure: payload.pricePressure ?? null,
          source_context: payload.sourceContext ?? 'app_runtime',
          metadata: payload.metadata ?? null,
        })
        .select('*')
        .single();
      if (error) {throw error;}
      return data as RawPricingSnapshot;
    },
  });
}

async function enqueueDirectAutomationJobLegacy(input: {
  userId?: string;
  jobType: string;
  corridorId?: string | null;
  from?: string | null;
  to?: string | null;
  payload?: Record<string, unknown>;
  runAfter?: string;
}) {
  const db = getDb();
  const context = input.userId ? await buildUserContext(input.userId).catch(() => null) : null;
  const route = normalizeRoute(input.from, input.to);
  const { data, error } = await db
    .from('automation_jobs')
    .insert({
      user_id: context?.user.id ?? null,
      job_type: input.jobType,
      corridor_id: input.corridorId ?? null,
      corridor_key: route.corridorKey ?? input.corridorId ?? null,
      route_scope: route.routeScope ?? null,
      origin_location: route.origin ?? null,
      destination_location: route.destination ?? null,
      payload: input.payload ?? null,
      run_after: input.runAfter ?? new Date().toISOString(),
      job_status: 'queued',
    })
    .select('*')
    .single();
  if (error) {throw error;}
  return data as RawAutomationJob;
}

export async function enqueueDirectAutomationJob(input: {
  userId?: string;
  jobType: string;
  corridorId?: string | null;
  from?: string | null;
  to?: string | null;
  payload?: Record<string, unknown>;
  runAfter?: string;
}): Promise<RawAutomationJob | null> {
  if (!input.userId) {
    return null;
  }

  const db = getDb();
  const route = normalizeRoute(input.from, input.to);

  try {
    const { data, error } = await db.rpc('app_enqueue_automation_job', {
      p_job_type: input.jobType,
      p_corridor_id: input.corridorId ?? null,
      p_corridor_key: route.corridorKey ?? input.corridorId ?? null,
      p_route_scope: route.routeScope ?? null,
      p_origin_location: route.origin ?? null,
      p_destination_location: route.destination ?? null,
      p_payload: input.payload ?? {},
      p_run_after: input.runAfter ?? null,
    });
    if (error) {throw error;}
    return parseAutomationJobRpcResult(data);
  } catch (error) {
    if (!isMissingRpcError(error)) {
      throw error;
    }

    return enqueueDirectAutomationJobLegacy(input);
  }
}

export async function getDirectSupportTickets(userId: string) {
  const db = getDb();
  const context = await buildUserContext(userId);
  const { data, error } = await db
    .from('support_tickets')
    .select('*')
    .eq('user_id', context.user.id)
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) {throw error;}

  const tickets = Array.isArray(data) ? (data as RawSupportTicket[]) : [];
  const ticketIds = tickets.map((ticket) => String(ticket.ticket_id ?? '')).filter(Boolean);
  if (ticketIds.length === 0) {
    return tickets.map((ticket) => ({ ticket, events: [] as RawSupportTicketEvent[] }));
  }

  const { data: eventRows, error: eventError } = await db
    .from('support_ticket_events')
    .select('*')
    .in('ticket_id', ticketIds)
    .order('created_at', { ascending: true });
  if (eventError) {throw eventError;}

  const eventMap = new Map<string, RawSupportTicketEvent[]>();
  for (const event of Array.isArray(eventRows) ? (eventRows as RawSupportTicketEvent[]) : []) {
    const key = String(event.ticket_id ?? '');
    const existing = eventMap.get(key) ?? [];
    existing.push(event);
    eventMap.set(key, existing);
  }

  return tickets.map((ticket) => ({
    ticket,
    events: eventMap.get(String(ticket.ticket_id ?? '')) ?? [],
  }));
}

async function createDirectSupportTicketLegacy(userId: string, input: {
  topic: string;
  subject: string;
  detail: string;
  relatedId?: string;
  routeLabel?: string;
  status: string;
  priority: string;
  channel: string;
  note: string;
}) {
  const db = getDb();
  const context = await buildUserContext(userId);
  const slaDueAt = buildSupportSlaDueAt(
    input.priority === 'urgent' || input.priority === 'high' || input.priority === 'normal'
      ? input.priority
      : 'low',
  );
  const { data, error } = await db
    .from('support_tickets')
    .insert({
      user_id: context.user.id,
      topic: input.topic,
      subject: input.subject,
      detail: input.detail,
      related_id: input.relatedId ?? null,
      route_label: input.routeLabel ?? null,
      status: input.status,
      priority: input.priority,
      channel: input.channel,
      latest_note: input.note,
      sla_due_at: slaDueAt,
    })
    .select('*')
    .single();
  if (error) {throw error;}

  const ticket = data as RawSupportTicket;
  const { data: eventData, error: eventError } = await db
    .from('support_ticket_events')
    .insert({
      ticket_id: ticket.ticket_id,
      status: input.status,
      note: input.note,
      actor_type: 'system',
    })
    .select('*')
    .single();
  if (eventError) {throw eventError;}

  return {
    ticket,
    events: [eventData as RawSupportTicketEvent],
  };
}

export async function createDirectSupportTicket(userId: string, input: {
  topic: string;
  subject: string;
  detail: string;
  relatedId?: string;
  routeLabel?: string;
  status: string;
  priority: string;
  channel: string;
  note: string;
}) {
  const db = getDb();

  try {
    const { data, error } = await db.rpc('app_create_support_ticket', {
      p_topic: input.topic,
      p_subject: input.subject,
      p_detail: input.detail,
      p_related_id: input.relatedId ?? null,
      p_route_label: input.routeLabel ?? null,
      p_status: input.status,
      p_priority: input.priority,
      p_channel: input.channel,
      p_note: input.note,
    });
    if (error) {throw error;}

    const result = parseSupportTicketRpcResult(data);
    return {
      ticket: result.ticket as RawSupportTicket,
      events: result.events as RawSupportTicketEvent[],
    };
  } catch (error) {
    if (!isMissingRpcError(error)) {
      throw error;
    }

    return createDirectSupportTicketLegacy(userId, input);
  }
}

async function updateDirectSupportTicketStatusLegacy(ticketId: string, input: {
  status: string;
  note: string;
  resolutionSummary?: string;
  priority?: string;
  channel?: string;
}) {
  const db = getDb();
  const { data, error } = await db
    .from('support_tickets')
    .update({
      status: input.status,
      priority: input.priority ?? undefined,
      channel: input.channel ?? undefined,
      latest_note: input.note,
      resolution_summary: input.resolutionSummary ?? undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('ticket_id', ticketId)
    .select('*')
    .single();
  if (error) {throw error;}

  const ticket = data as RawSupportTicket;
  const { data: eventData, error: eventError } = await db
    .from('support_ticket_events')
    .insert({
      ticket_id: ticket.ticket_id,
      status: input.status,
      note: input.note,
      actor_type: 'system',
    })
    .select('*')
    .single();
  if (eventError) {throw eventError;}

  return {
    ticket,
    events: [eventData as RawSupportTicketEvent],
  };
}

export async function updateDirectSupportTicketStatus(ticketId: string, input: {
  status: string;
  note: string;
  resolutionSummary?: string;
  priority?: string;
  channel?: string;
}) {
  const db = getDb();

  try {
    const { data, error } = await db.rpc('app_update_support_ticket_status', {
      p_ticket_id: ticketId,
      p_status: input.status,
      p_note: input.note,
      p_resolution_summary: input.resolutionSummary ?? null,
      p_priority: input.priority ?? null,
      p_channel: input.channel ?? null,
    });
    if (error) {throw error;}

    const result = parseSupportTicketRpcResult(data);
    return {
      ticket: result.ticket as RawSupportTicket,
      events: result.events as RawSupportTicketEvent[],
    };
  } catch (error) {
    if (!isMissingRpcError(error)) {
      throw error;
    }

    return updateDirectSupportTicketStatusLegacy(ticketId, input);
  }
}
