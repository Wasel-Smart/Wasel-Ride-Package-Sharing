import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildAutomationActionUrl,
  buildAutomationFailurePatch,
  buildAutomationNotification,
  describeRoute,
  nextReminderDate,
  splitRouteLabel,
  type AutomationJobRecord,
  type ReminderFrequency,
} from './_shared/automation-runtime.ts';
import { buildIdempotencyKey, determineProviderName } from './_shared/communication-runtime.ts';

const defaultAutomationPreferences = {
  in_app_enabled: true,
  push_enabled: true,
  email_enabled: true,
  sms_enabled: true,
  whatsapp_enabled: false,
  trip_updates_enabled: true,
  promotions_enabled: false,
  critical_alerts_enabled: true,
};

interface AutomationRuntime {
  executeSqlStatements: (sql: string) => Promise<void>;
  getAdminClient: () => SupabaseClient;
  getFunctionBaseUrl: (request: Request) => string;
  hasAutomationWorkerAccess: (request: Request) => boolean;
  json: (data: unknown, status?: number) => Response;
  processQueuedDeliveries: (admin: SupabaseClient, functionBaseUrl: string) => Promise<unknown>;
}

interface AutomationModuleOptions {
  automationRuntimeSql: string;
}

function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  return request.json()
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}))
    .catch(() => ({}));
}

export function createAutomationHandlers(
  runtime: AutomationRuntime,
  options: AutomationModuleOptions,
) {
  async function backfillAutomationJobs(
    admin: SupabaseClient,
    maxRows = 100,
  ) {
    const { data, error } = await admin.rpc('app_backfill_automation_jobs', {
      max_rows: Math.max(1, Math.min(maxRows, 500)),
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as Record<string, number> | null;
  }

  async function claimAutomationJobs(
    admin: SupabaseClient,
    workerName: string,
    limit = 25,
  ) {
    const { data, error } = await admin.rpc('app_claim_automation_jobs', {
      max_jobs: Math.max(1, Math.min(limit, 100)),
      worker_name: workerName,
    });

    if (error) {
      throw new Error(error.message);
    }

    return (Array.isArray(data) ? data : []) as AutomationJobRecord[];
  }

  async function getAutomationUserContext(
    admin: SupabaseClient,
    userId?: string | null,
  ) {
    if (!userId) return null;

    const [{ data: userRow, error: userError }, { data: preferencesRow, error: preferencesError }] = await Promise.all([
      admin
        .from('users')
        .select('id, email, phone_number, full_name')
        .eq('id', userId)
        .maybeSingle(),
      admin
        .from('communication_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (userError) {
      throw new Error(userError.message);
    }

    if (preferencesError) {
      throw new Error(preferencesError.message);
    }

    return {
      user: userRow,
      preferences: {
        ...defaultAutomationPreferences,
        ...(preferencesRow ?? {}),
      },
    };
  }

  function isAutomationTopicEnabled(
    plan: NonNullable<ReturnType<typeof buildAutomationNotification>>,
    preferences: Record<string, unknown>,
  ) {
    if (plan.type === 'promotions') {
      return preferences.promotions_enabled === true;
    }

    if (plan.type === 'critical_alerts') {
      return preferences.critical_alerts_enabled !== false;
    }

    return preferences.trip_updates_enabled !== false;
  }

  async function upsertAutomationNotification(
    admin: SupabaseClient,
    job: AutomationJobRecord,
    plan: NonNullable<ReturnType<typeof buildAutomationNotification>>,
  ) {
    if (!job.user_id) return null;
    const context = await getAutomationUserContext(admin, job.user_id);
    if (!context?.user || !isAutomationTopicEnabled(plan, context.preferences) || context.preferences.in_app_enabled === false) {
      return null;
    }

    const { data: existing, error: existingError } = await admin
      .from('notifications')
      .select('id')
      .eq('user_id', job.user_id)
      .contains('metadata', { automation_job_id: job.job_id })
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.id) {
      return existing;
    }

    const { data, error } = await admin
      .from('notifications')
      .insert({
        user_id: job.user_id,
        title: plan.title,
        message: plan.message,
        type: plan.type,
        read: false,
        is_read: false,
        metadata: {
          priority: plan.priority,
          action_url: plan.actionUrl ?? buildAutomationActionUrl(job),
          automation_job_id: job.job_id,
          automation_job_type: job.job_type,
        },
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  async function queueAutomationDeliveries(
    admin: SupabaseClient,
    job: AutomationJobRecord,
    plan: NonNullable<ReturnType<typeof buildAutomationNotification>>,
    notificationId?: string | null,
  ) {
    const context = await getAutomationUserContext(admin, job.user_id);
    if (!context?.user) {
      return 0;
    }

    if (!isAutomationTopicEnabled(plan, context.preferences)) {
      return 0;
    }

    const requests: Array<Record<string, unknown>> = [];
    const actionUrl = plan.actionUrl ?? buildAutomationActionUrl(job);

    for (const channel of plan.channels) {
      if (channel === 'email' && context.preferences.email_enabled !== false && context.user.email) {
        requests.push({
          user_id: context.user.id,
          notification_id: notificationId ?? null,
          channel,
          delivery_status: 'queued',
          destination: context.user.email,
          subject: plan.title,
          payload: {
            body: plan.message,
            metadata: { automation_job_id: job.job_id, action_url: actionUrl ?? null },
          },
          provider_name: determineProviderName(channel),
          queued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          idempotency_key: buildIdempotencyKey({
            deliveryId: `${job.job_id}:${channel}`,
            channel,
            destination: context.user.email,
            body: plan.message,
          }),
        });
      }

      if (
        (channel === 'sms' || channel === 'whatsapp') &&
        context.user.phone_number &&
        (
          (channel === 'sms' && context.preferences.sms_enabled !== false) ||
          (channel === 'whatsapp' && context.preferences.whatsapp_enabled === true)
        )
      ) {
        requests.push({
          user_id: context.user.id,
          notification_id: notificationId ?? null,
          channel,
          delivery_status: 'queued',
          destination: context.user.phone_number,
          subject: plan.title,
          payload: {
            body: plan.message,
            metadata: { automation_job_id: job.job_id, action_url: actionUrl ?? null },
          },
          provider_name: determineProviderName(channel),
          queued_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          idempotency_key: buildIdempotencyKey({
            deliveryId: `${job.job_id}:${channel}`,
            channel,
            destination: context.user.phone_number,
            body: plan.message,
          }),
        });
      }
    }

    if (requests.length === 0) {
      return 0;
    }

    const { data, error } = await admin
      .from('communication_deliveries')
      .upsert(requests, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      .select('delivery_id');

    if (error) {
      throw new Error(error.message);
    }

    return Array.isArray(data) ? data.length : requests.length;
  }

  async function updateAutomationJob(
    admin: SupabaseClient,
    jobId: string,
    patch: Record<string, unknown>,
  ) {
    const { error } = await admin
      .from('automation_jobs')
      .update(patch)
      .eq('job_id', jobId);

    if (error) {
      throw new Error(error.message);
    }
  }

  async function ensureQueuedReminderDispatch(
    admin: SupabaseClient,
    reminder: Record<string, unknown>,
    nextReminderAt: string,
  ) {
    const reminderId = String(reminder.reminder_id ?? '');
    if (!reminderId) return;

    const { data: existing, error: existingError } = await admin
      .from('automation_jobs')
      .select('job_id')
      .eq('job_type', 'reminder_dispatch')
      .in('job_status', ['queued', 'processing'])
      .contains('payload', { reminderId })
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existing?.job_id) {
      return;
    }

    const { error } = await admin
      .from('automation_jobs')
      .insert({
        user_id: reminder.user_id ?? null,
        job_type: 'reminder_dispatch',
        corridor_id: reminder.corridor_id ?? null,
        corridor_key: reminder.corridor_id ?? null,
        route_scope: null,
        origin_location: reminder.origin_location ?? null,
        destination_location: reminder.destination_location ?? null,
        job_status: 'queued',
        payload: {
          reminderId,
          label: reminder.label ?? null,
          frequency: reminder.frequency ?? null,
          preferredTime: reminder.preferred_time ?? null,
        },
        run_after: nextReminderAt,
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  async function executeReminderDispatch(
    admin: SupabaseClient,
    job: AutomationJobRecord,
  ) {
    const payload = job.payload ?? {};
    const reminderId = String(payload.reminderId ?? '').trim();
    const now = new Date();

    if (!reminderId) {
      return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
    }

    const { data: reminder, error } = await admin
      .from('route_reminders')
      .select('*')
      .eq('reminder_id', reminderId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!reminder || reminder.enabled === false) {
      return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
    }

    const dueAt = new Date(String(reminder.next_reminder_at ?? now.toISOString()));
    if (!Number.isNaN(dueAt.getTime()) && dueAt.getTime() > now.getTime() + 60_000) {
      return {
        patch: {
          job_status: 'queued',
          run_after: dueAt.toISOString(),
          locked_at: null,
          completed_at: null,
          updated_at: now.toISOString(),
        },
        notifications: 0,
        deliveries: 0,
      };
    }

    const frequency = (
      reminder.frequency === 'weekdays' || reminder.frequency === 'weekly'
        ? reminder.frequency
        : 'daily'
    ) as ReminderFrequency;
    const preferredTime = String(reminder.preferred_time ?? '07:30');
    const nextReminderAt = nextReminderDate(frequency, preferredTime, now).toISOString();

    const plan = buildAutomationNotification(
      {
        ...job,
        corridor_id: String(reminder.corridor_id ?? job.corridor_id ?? ''),
        origin_location: String(reminder.origin_location ?? job.origin_location ?? ''),
        destination_location: String(reminder.destination_location ?? job.destination_location ?? ''),
      },
      {
        reminderLabel: String(reminder.label ?? payload.label ?? describeRoute(job)),
      },
    );

    let notificationCount = 0;
    let deliveriesQueued = 0;
    if (plan) {
      const notification = await upsertAutomationNotification(admin, job, plan);
      notificationCount = notification?.id ? 1 : 0;
      deliveriesQueued = await queueAutomationDeliveries(admin, job, plan, notification?.id as string | undefined);
    }

    const { error: updateReminderError } = await admin
      .from('route_reminders')
      .update({
        next_reminder_at: nextReminderAt,
        last_sent_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('reminder_id', reminderId);

    if (updateReminderError) {
      throw new Error(updateReminderError.message);
    }

    await ensureQueuedReminderDispatch(admin, reminder as Record<string, unknown>, nextReminderAt);

    return {
      patch: {
        job_status: 'completed',
        completed_at: now.toISOString(),
        locked_at: null,
        last_error: null,
        updated_at: now.toISOString(),
      },
      notifications: notificationCount,
      deliveries: deliveriesQueued,
    };
  }

  async function executeSupportSla(
    admin: SupabaseClient,
    job: AutomationJobRecord,
  ) {
    const payload = job.payload ?? {};
    const ticketId = String(payload.ticketId ?? '').trim();
    const now = new Date();

    if (!ticketId) {
      return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
    }

    const { data: ticket, error } = await admin
      .from('support_tickets')
      .select('*')
      .eq('ticket_id', ticketId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!ticket || ticket.status === 'resolved' || ticket.status === 'closed') {
      return { patch: { job_status: 'completed', completed_at: now.toISOString(), locked_at: null, updated_at: now.toISOString() }, notifications: 0, deliveries: 0 };
    }

    const slaDueAt = new Date(String(ticket.sla_due_at ?? now.toISOString()));
    if (!Number.isNaN(slaDueAt.getTime()) && slaDueAt.getTime() > now.getTime() + 60_000) {
      return {
        patch: {
          job_status: 'queued',
          run_after: slaDueAt.toISOString(),
          locked_at: null,
          completed_at: null,
          updated_at: now.toISOString(),
        },
        notifications: 0,
        deliveries: 0,
      };
    }

    const escalatedPriority =
      ticket.priority === 'urgent'
        ? 'urgent'
        : ticket.priority === 'high'
          ? 'urgent'
          : 'high';
    const escalatedStatus = ticket.status === 'open' ? 'investigating' : ticket.status;
    const shouldNotify = ticket.status === 'open' || ticket.priority !== escalatedPriority;
    const note = shouldNotify
      ? 'Automation escalated this support request after its SLA threshold.'
      : 'Automation re-checked this open support request after its SLA threshold.';

    if (shouldNotify) {
      const { error: ticketUpdateError } = await admin
        .from('support_tickets')
        .update({
          status: escalatedStatus,
          priority: escalatedPriority,
          latest_note: note,
          updated_at: now.toISOString(),
        })
        .eq('ticket_id', ticketId);

      if (ticketUpdateError) {
        throw new Error(ticketUpdateError.message);
      }

      const { error: eventError } = await admin
        .from('support_ticket_events')
        .insert({
          ticket_id: ticketId,
          status: escalatedStatus,
          note,
          actor_type: 'system',
        });

      if (eventError) {
        throw new Error(eventError.message);
      }
    }

    let notificationCount = 0;
    let deliveriesQueued = 0;
    if (shouldNotify) {
      const route = splitRouteLabel(String(ticket.route_label ?? payload.routeLabel ?? ''));
      const plan = buildAutomationNotification(
        {
          ...job,
          origin_location: route.from ?? job.origin_location ?? undefined,
          destination_location: route.to ?? job.destination_location ?? undefined,
        },
        {
          supportSubject: String(ticket.subject ?? payload.subject ?? 'Support request'),
          supportPriority: escalatedPriority,
        },
      );

      if (plan) {
        const notification = await upsertAutomationNotification(admin, job, plan);
        notificationCount = notification?.id ? 1 : 0;
        deliveriesQueued = await queueAutomationDeliveries(admin, job, plan, notification?.id as string | undefined);
      }
    }

    return {
      patch: {
        job_status: 'queued',
        run_after: new Date(now.getTime() + (6 * 60 * 60_000)).toISOString(),
        locked_at: null,
        completed_at: null,
        last_error: null,
        updated_at: now.toISOString(),
      },
      notifications: notificationCount,
      deliveries: deliveriesQueued,
    };
  }

  async function executeAutomationJob(
    admin: SupabaseClient,
    job: AutomationJobRecord,
  ) {
    if (job.job_type === 'reminder_dispatch') {
      return executeReminderDispatch(admin, job);
    }

    if (job.job_type === 'support_sla') {
      return executeSupportSla(admin, job);
    }

    const now = new Date();
    const plan = buildAutomationNotification(job);
    if (!plan) {
      return {
        patch: {
          job_status: 'completed',
          completed_at: now.toISOString(),
          locked_at: null,
          last_error: null,
          updated_at: now.toISOString(),
        },
        notifications: 0,
        deliveries: 0,
      };
    }

    const notification = await upsertAutomationNotification(admin, job, plan);
    const deliveries = await queueAutomationDeliveries(admin, job, plan, notification?.id as string | undefined);

    return {
      patch: {
        job_status: 'completed',
        completed_at: now.toISOString(),
        locked_at: null,
        last_error: null,
        updated_at: now.toISOString(),
      },
      notifications: notification?.id ? 1 : 0,
      deliveries,
    };
  }

  async function processAutomationQueue(
    admin: SupabaseClient,
    queueOptions: {
      limit?: number;
      backfill?: boolean;
      inlineCommunications?: boolean;
      functionBaseUrl: string;
    },
  ) {
    const workerName = 'edge:automation-process';
    const counts = {
      claimed: 0,
      completed: 0,
      requeued: 0,
      failed: 0,
      notifications: 0,
      deliveriesQueued: 0,
      backfill: null as Record<string, number> | null,
    };

    if (queueOptions.backfill !== false) {
      counts.backfill = await backfillAutomationJobs(admin, 200);
    }

    const jobs = await claimAutomationJobs(admin, workerName, queueOptions.limit ?? 25);
    counts.claimed = jobs.length;

    for (const job of jobs) {
      try {
        const result = await executeAutomationJob(admin, job);
        await updateAutomationJob(admin, job.job_id, result.patch);
        counts.notifications += result.notifications;
        counts.deliveriesQueued += result.deliveries;
        if (result.patch.job_status === 'completed') counts.completed += 1;
        if (result.patch.job_status === 'queued') counts.requeued += 1;
      } catch (error) {
        const patch = buildAutomationFailurePatch({
          attemptsCount: Number(job.attempts_count ?? 1),
          errorMessage: error instanceof Error ? error.message : String(error),
          maxAttempts: Number(Deno.env.get('AUTOMATION_MAX_ATTEMPTS') ?? '5'),
        });
        await updateAutomationJob(admin, job.job_id, patch);
        if (patch.job_status === 'failed') counts.failed += 1;
        else counts.requeued += 1;
      }
    }

    let communicationProcessing = null;
    if (queueOptions.inlineCommunications) {
      communicationProcessing = await runtime.processQueuedDeliveries(admin, queueOptions.functionBaseUrl);
    }

    return {
      ...counts,
      communicationProcessing,
    };
  }

  async function handleProcessAutomationQueue(request: Request) {
    if (!runtime.hasAutomationWorkerAccess(request)) {
      return runtime.json({ error: 'Missing worker secret' }, 401);
    }

    const body = await readJsonBody(request);
    const admin = runtime.getAdminClient();
    try {
      const result = await processAutomationQueue(admin, {
        limit: Number(body.limit ?? 25),
        backfill: body.backfill !== false,
        inlineCommunications:
          body.inlineCommunications === true ||
          Deno.env.get('AUTOMATION_PROCESS_COMMUNICATIONS_INLINE') === 'true',
        functionBaseUrl: runtime.getFunctionBaseUrl(request),
      });
      return runtime.json(result);
    } catch (error) {
      return runtime.json({
        error: error instanceof Error ? error.message : String(error),
        hint: 'Make sure the automation migration has been applied before processing the queue.',
      }, 500);
    }
  }

  async function handleApplyAutomationMigrations(request: Request) {
    if (!runtime.hasAutomationWorkerAccess(request)) {
      return runtime.json({ error: 'Missing worker secret' }, 401);
    }

    await runtime.executeSqlStatements(options.automationRuntimeSql);

    return runtime.json({
      applied: [
        '20260404110000_route_automation_backbone.sql',
        '20260406101500_harden_automation_queue_access_and_support_rpcs.sql',
      ],
    });
  }

  return {
    handleApplyAutomationMigrations,
    handleProcessAutomationQueue,
  };
}
