import type { SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  buildFailurePatch,
  buildIdempotencyKey,
  buildResendPayload,
  buildSendgridPayload,
  buildTwilioRequest,
  determineProviderName,
  hasValidWebhookToken,
  mapResendEventToStatus,
  mapTwilioStatusToLifecycle,
  type CommunicationDeliveryRecord,
  type DeliveryProcessorEnv,
} from './_shared/communication-runtime.ts';
import { getClientIp, takeRateLimitToken } from './_shared/security-runtime.ts';

interface CanonicalUser {
  id: string;
}

type AuthenticatedRequest = {
  admin: SupabaseClient;
  authUser: User;
  canonicalUser: CanonicalUser;
};

type AuthenticationResult = AuthenticatedRequest | { error: Response };

interface CommunicationRuntime {
  authenticateRequest: (request: Request) => Promise<AuthenticationResult>;
  executeSqlStatements: (sql: string) => Promise<void>;
  getAdminClient: () => SupabaseClient;
  getFunctionBaseUrl: (request: Request) => string;
  hasCommunicationWorkerAccess: (request: Request) => boolean;
  json: (data: unknown, status?: number) => Response;
}

interface CommunicationModuleOptions {
  deliveryEnv: DeliveryProcessorEnv;
  communicationsRuntimeSql: string;
  communicationsOperationsSql: string;
}

const DELIVERY_CHANNELS = new Set(['email', 'sms', 'whatsapp', 'push', 'in_app']);
const COMMUNICATION_QUEUE_RATE_LIMIT = { maxRequests: 25, windowMs: 5 * 60_000 };
const COMMUNICATION_DELIVERY_CONCURRENCY = 4;

function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  return request.json()
    .then((body) => (body && typeof body === 'object' && !Array.isArray(body) ? body as Record<string, unknown> : {}))
    .catch(() => ({}));
}

function validateDeliveryChannel(channel: string): string {
  if (!DELIVERY_CHANNELS.has(channel)) {
    throw new Error('Unsupported delivery channel');
  }

  return channel;
}

function sanitizeDeliveryText(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

async function claimQueuedDeliveries(
  admin: SupabaseClient,
  workerName: string,
  limit = 25,
) {
  const { data, error } = await admin.rpc('app_claim_communication_deliveries', {
    max_deliveries: Math.max(1, Math.min(limit, 100)),
    worker_name: workerName,
  });

  if (!error && Array.isArray(data)) {
    return data as CommunicationDeliveryRecord[];
  }

  const now = new Date().toISOString();
  const { data: fallbackRows, error: fallbackError } = await admin
    .from('communication_deliveries')
    .select('*')
    .eq('delivery_status', 'queued')
    .order('queued_at', { ascending: true })
    .limit(Math.max(1, Math.min(limit, 100)));

  if (fallbackError) {
    throw new Error(fallbackError.message);
  }

  const dueRows = (Array.isArray(fallbackRows) ? fallbackRows : []).filter((delivery) => (
    !delivery.next_attempt_at || new Date(delivery.next_attempt_at).getTime() <= Date.now()
  )) as CommunicationDeliveryRecord[];

  const locked: CommunicationDeliveryRecord[] = [];
  for (const delivery of dueRows) {
    const { data: updated, error: updateError } = await admin
      .from('communication_deliveries')
      .update({
        delivery_status: 'processing',
        attempts_count: Number(delivery.attempts_count ?? 0) + 1,
        last_attempt_at: now,
        locked_at: now,
        processed_by: workerName,
        updated_at: now,
      })
      .eq('delivery_id', delivery.delivery_id)
      .eq('delivery_status', 'queued')
      .select('*')
      .maybeSingle();

    if (updateError) {
      throw new Error(updateError.message);
    }

    if (updated) {
      locked.push(updated as CommunicationDeliveryRecord);
    }
  }

  return locked;
}

function buildLifecyclePatch(
  status: 'sent' | 'delivered' | 'failed',
  now: string,
  payload: unknown,
  errorMessage?: string,
) {
  if (status === 'failed') {
    return {
      delivery_status: 'failed',
      failed_at: now,
      error_message: errorMessage ?? null,
      provider_response: payload,
      updated_at: now,
    };
  }

  if (status === 'delivered') {
    return {
      delivery_status: 'delivered',
      delivered_at: now,
      provider_response: payload,
      updated_at: now,
    };
  }

  return {
    delivery_status: 'sent',
    provider_response: payload,
    updated_at: now,
  };
}

export function createCommunicationHandlers(
  runtime: CommunicationRuntime,
  options: CommunicationModuleOptions,
) {
  const { deliveryEnv, communicationsRuntimeSql, communicationsOperationsSql } = options;

  async function handleGetCommunicationPreferences(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const { data, error } = await auth.admin
      .from('communication_preferences')
      .select('*')
      .eq('user_id', auth.canonicalUser.id)
      .maybeSingle();

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    return runtime.json({ preferences: data ?? null });
  }

  async function handlePatchCommunicationPreferences(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;

    const body = await readJsonBody(request);
    const patch = {
      user_id: auth.canonicalUser.id,
      in_app_enabled: body.inApp,
      push_enabled: body.push,
      email_enabled: body.email,
      sms_enabled: body.sms,
      whatsapp_enabled: body.whatsapp,
      trip_updates_enabled: body.tripUpdates,
      booking_requests_enabled: body.bookingRequests,
      messages_enabled: body.messages,
      promotions_enabled: body.promotions,
      prayer_reminders_enabled: body.prayerReminders,
      critical_alerts_enabled: body.criticalAlerts,
      preferred_language: body.preferredLanguage === 'ar' ? 'ar' : 'en',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await auth.admin
      .from('communication_preferences')
      .upsert(patch, { onConflict: 'user_id' })
      .select('*')
      .single();

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    return runtime.json({ preferences: data });
  }

  async function sendDelivery(
    admin: SupabaseClient,
    delivery: CommunicationDeliveryRecord,
    functionBaseUrl: string,
  ) {
    const now = new Date().toISOString();
    const env = { ...deliveryEnv, functionBaseUrl };
    const attemptsCount = Number(delivery.attempts_count ?? 1);

    try {
      let response: Response;
      if (delivery.channel === 'email') {
        const request = env.resendApiKey && env.resendFromEmail
          ? buildResendPayload(delivery, env)
          : buildSendgridPayload(delivery, env);
        response = await fetch(request.url, request.init);
      } else if (delivery.channel === 'sms' || delivery.channel === 'whatsapp') {
        const request = buildTwilioRequest(delivery, env);
        response = await fetch(request.url, request.init);
      } else {
        throw new Error(`Unsupported delivery channel: ${delivery.channel}`);
      }

      const responseBody = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof responseBody?.message === 'string'
            ? responseBody.message
            : typeof responseBody?.error === 'string'
              ? responseBody.error
              : `Provider returned HTTP ${response.status}`,
        );
      }

      const externalReference = String(
        responseBody?.id ??
        responseBody?.data?.id ??
        responseBody?.sid ??
        responseBody?.messageSid ??
        '',
      ) || null;

      await admin
        .from('communication_deliveries')
        .update({
          delivery_status: 'sent',
          sent_at: now,
          locked_at: null,
          next_attempt_at: null,
          error_message: null,
          external_reference: externalReference,
          provider_name:
            delivery.channel === 'email'
              ? (env.resendApiKey && env.resendFromEmail ? 'resend' : 'sendgrid')
              : determineProviderName(String(delivery.channel)),
          provider_response: responseBody,
          updated_at: now,
        })
        .eq('delivery_id', delivery.delivery_id);

      return { ok: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const patch = buildFailurePatch({
        attemptsCount,
        errorMessage,
        maxAttempts: deliveryEnv.maxDeliveryAttempts,
      });

      await admin
        .from('communication_deliveries')
        .update({
          ...patch,
          provider_name:
            delivery.channel === 'email'
              ? (env.resendApiKey && env.resendFromEmail ? 'resend' : 'sendgrid')
              : determineProviderName(String(delivery.channel)),
          processed_by: 'edge:communications-process',
          updated_at: new Date().toISOString(),
        })
        .eq('delivery_id', delivery.delivery_id);

      return { ok: false, error: errorMessage };
    }
  }

  async function processQueuedDeliveries(
    admin: SupabaseClient,
    functionBaseUrl: string,
  ) {
    const dueDeliveries = await claimQueuedDeliveries(admin, 'edge:communications-process', 25);

    let sent = 0;
    let failed = 0;
    for (let index = 0; index < dueDeliveries.length; index += COMMUNICATION_DELIVERY_CONCURRENCY) {
      const batch = dueDeliveries.slice(index, index + COMMUNICATION_DELIVERY_CONCURRENCY);
      const results = await Promise.all(batch.map((delivery) => sendDelivery(admin, delivery, functionBaseUrl)));
      for (const result of results) {
        if (result.ok) sent += 1;
        else failed += 1;
      }
    }

    return {
      processed: dueDeliveries.length,
      sent,
      failed,
      skipped: 0,
    };
  }

  async function handleQueueCommunicationDeliveries(request: Request) {
    const auth = await runtime.authenticateRequest(request);
    if ('error' in auth) return auth.error;
    if (!takeRateLimitToken({
      key: ['communications', auth.canonicalUser.id, getClientIp(request)].join(':'),
      ...COMMUNICATION_QUEUE_RATE_LIMIT,
    })) {
      return runtime.json({ error: 'Too many outbound communication requests. Please wait and try again.' }, 429);
    }

    const body = await readJsonBody(request);
    const deliveries = Array.isArray(body.deliveries) ? body.deliveries : [];
    const now = new Date().toISOString();

    if (deliveries.length === 0) {
      return runtime.json({ queued: 0 });
    }

    let rows;
    try {
      rows = deliveries.map((delivery: Record<string, unknown>, index: number) => {
        const channel = validateDeliveryChannel(String(delivery.channel ?? 'email'));
        const payloadBody = sanitizeDeliveryText(delivery.body, 2_000) ?? '';
        const destination = sanitizeDeliveryText(delivery.destination, 320);
        const subject = sanitizeDeliveryText(delivery.subject, 160);
        return {
          user_id: auth.canonicalUser.id,
          notification_id: typeof body.notificationId === 'string' ? body.notificationId : null,
          channel,
          delivery_status: 'queued',
          destination,
          subject,
          payload: {
            body: payloadBody,
            metadata: delivery.metadata ?? null,
          },
          provider_name: determineProviderName(channel),
          queued_at: now,
          updated_at: now,
          idempotency_key:
            typeof delivery.idempotencyKey === 'string' && delivery.idempotencyKey
              ? delivery.idempotencyKey
              : buildIdempotencyKey({
                  deliveryId: `${body.notificationId ?? 'direct'}-${index}`,
                  channel,
                  destination,
                  body: payloadBody,
                }),
        };
      });
    } catch (error) {
      return runtime.json({ error: error instanceof Error ? error.message : 'Invalid delivery payload' }, 400);
    }

    const { data, error } = await auth.admin
      .from('communication_deliveries')
      .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      .select('*');

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    if (Deno.env.get('COMMUNICATION_PROCESS_INLINE') === 'true' && runtime.hasCommunicationWorkerAccess(request)) {
      await processQueuedDeliveries(auth.admin, runtime.getFunctionBaseUrl(request));
    }

    return runtime.json({ queued: Array.isArray(data) ? data.length : rows.length, deliveries: data ?? [] }, 202);
  }

  async function handleProcessCommunicationQueue(request: Request) {
    if (!runtime.hasCommunicationWorkerAccess(request)) {
      return runtime.json({ error: 'Missing worker secret' }, 401);
    }

    const admin = runtime.getAdminClient();
    const result = await processQueuedDeliveries(admin, runtime.getFunctionBaseUrl(request));
    return runtime.json(result);
  }

  async function handleSendTestCommunication(request: Request) {
    if (!runtime.hasCommunicationWorkerAccess(request)) {
      return runtime.json({ error: 'Missing worker secret' }, 401);
    }

    const body = await readJsonBody(request);
    const channel = String(body.channel ?? 'email');

    if (channel !== 'email') {
      return runtime.json({ error: 'Only email test sends are enabled in the current live configuration.' }, 400);
    }

    const destination =
      typeof body.destination === 'string' && body.destination.trim()
        ? body.destination.trim()
        : deliveryEnv.sendgridFromEmail || deliveryEnv.resendFromEmail || null;

    if (!destination) {
      return runtime.json({ error: 'No destination was provided and no email sender address is configured.' }, 400);
    }

    const delivery: CommunicationDeliveryRecord = {
      delivery_id: crypto.randomUUID(),
      channel: 'email',
      destination,
      subject: typeof body.subject === 'string' && body.subject.trim()
        ? body.subject.trim()
        : 'Wasel live communications test',
      payload: {
        body:
          typeof body.message === 'string' && body.message.trim()
            ? body.message.trim()
            : `Live communications test from Wasel at ${new Date().toISOString()}`,
      },
      provider_name: deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail ? 'resend' : 'sendgrid',
      external_reference: null,
      attempts_count: 0,
    };

    try {
      const providerRequest = deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail
        ? buildResendPayload(delivery, deliveryEnv)
        : buildSendgridPayload(delivery, deliveryEnv);

      const response = await fetch(providerRequest.url, providerRequest.init);
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        return runtime.json({
          success: false,
          channel,
          destination,
          provider: delivery.provider_name,
          error:
            typeof responseBody?.message === 'string'
              ? responseBody.message
              : typeof responseBody?.error === 'string'
                ? responseBody.error
                : `Provider returned HTTP ${response.status}`,
          response: responseBody,
        }, 502);
      }

      return runtime.json({
        success: true,
        channel,
        destination,
        provider: delivery.provider_name,
        response: responseBody,
      });
    } catch (error) {
      return runtime.json({
        success: false,
        channel,
        destination,
        provider: delivery.provider_name,
        error: error instanceof Error ? error.message : String(error),
      }, 500);
    }
  }

  async function handleProviderDiagnostics(request: Request) {
    if (!runtime.hasCommunicationWorkerAccess(request)) {
      return runtime.json({ error: 'Missing worker secret' }, 401);
    }

    const diagnostics: Record<string, unknown> = {
      resend: {
        configured: Boolean(deliveryEnv.resendApiKey && deliveryEnv.resendFromEmail),
      },
      sendgrid: {
        configured: Boolean(deliveryEnv.sendgridApiKey && deliveryEnv.sendgridFromEmail),
      },
      twilio: {
        configured: Boolean(deliveryEnv.twilioAccountSid && deliveryEnv.twilioAuthToken),
        messagingServiceConfigured: Boolean(deliveryEnv.twilioMessagingServiceSid),
        smsFromConfigured: Boolean(deliveryEnv.twilioSmsFrom),
        whatsappFromConfigured: Boolean(deliveryEnv.twilioWhatsappFrom),
      },
    };

    if (deliveryEnv.sendgridApiKey) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/user/account', {
          headers: {
            Authorization: `Bearer ${deliveryEnv.sendgridApiKey}`,
          },
        });
        diagnostics.sendgrid = {
          ...(diagnostics.sendgrid as Record<string, unknown>),
          authOk: response.ok,
          status: response.status,
          response: await response.json().catch(() => null),
        };
      } catch (error) {
        diagnostics.sendgrid = {
          ...(diagnostics.sendgrid as Record<string, unknown>),
          authOk: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    if (deliveryEnv.twilioAccountSid && deliveryEnv.twilioAuthToken) {
      const authHeader = `Basic ${btoa(`${deliveryEnv.twilioAccountSid}:${deliveryEnv.twilioAuthToken}`)}`;
      try {
        const accountResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${deliveryEnv.twilioAccountSid}.json`,
          { headers: { Authorization: authHeader } },
        );

        const numbersResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${deliveryEnv.twilioAccountSid}/IncomingPhoneNumbers.json?PageSize=20`,
          { headers: { Authorization: authHeader } },
        );

        const messagingServicesResponse = await fetch(
          'https://messaging.twilio.com/v1/Services?PageSize=20',
          { headers: { Authorization: authHeader } },
        );

        diagnostics.twilio = {
          ...(diagnostics.twilio as Record<string, unknown>),
          authOk: accountResponse.ok,
          accountStatus: accountResponse.status,
          incomingNumbersStatus: numbersResponse.status,
          messagingServicesStatus: messagingServicesResponse.status,
          incomingNumbers: numbersResponse.ok
            ? ((await numbersResponse.json().catch(() => ({})))?.incoming_phone_numbers ?? [])
                .map((item: Record<string, unknown>) => ({
                  phone_number: item.phone_number,
                  sms_url: item.sms_url,
                  capabilities: item.capabilities,
                }))
            : [],
          messagingServices: messagingServicesResponse.ok
            ? ((await messagingServicesResponse.json().catch(() => ({})))?.services ?? [])
                .map((item: Record<string, unknown>) => ({
                  sid: item.sid,
                  friendly_name: item.friendly_name,
                }))
            : [],
        };
      } catch (error) {
        diagnostics.twilio = {
          ...(diagnostics.twilio as Record<string, unknown>),
          authOk: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return runtime.json(diagnostics);
  }

  async function handleApplyCommunicationMigrations(request: Request) {
    if (!runtime.hasCommunicationWorkerAccess(request)) {
      return runtime.json({ error: 'Missing worker secret' }, 401);
    }

    await runtime.executeSqlStatements(communicationsRuntimeSql);
    await runtime.executeSqlStatements(communicationsOperationsSql);

    return runtime.json({
      applied: [
        '20260401223000_communications_runtime_contract.sql',
        '20260401233000_communication_delivery_operations.sql',
      ],
    });
  }

  async function handleResendWebhook(request: Request) {
    const url = new URL(request.url);
    if (!hasValidWebhookToken(url, deliveryEnv.communicationWebhookToken)) {
      return runtime.json({ error: 'Invalid webhook token' }, 401);
    }

    const payload = await readJsonBody(request);
    const eventType = String(payload?.type ?? '');
    const externalReference = String(
      payload?.data?.email_id ??
      payload?.data?.id ??
      payload?.data?.email?.id ??
      '',
    );

    if (!externalReference) {
      return runtime.json({ received: true, ignored: true });
    }

    const status = mapResendEventToStatus(eventType);
    const now = new Date().toISOString();
    const admin = runtime.getAdminClient();
    const patch = buildLifecyclePatch(status, now, payload, eventType);

    const { error } = await admin
      .from('communication_deliveries')
      .update(patch)
      .eq('external_reference', externalReference)
      .eq('provider_name', 'resend');

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    return runtime.json({ received: true, status });
  }

  async function handleTwilioWebhook(request: Request) {
    const url = new URL(request.url);
    if (!hasValidWebhookToken(url, deliveryEnv.communicationWebhookToken)) {
      return runtime.json({ error: 'Invalid webhook token' }, 401);
    }

    const form = await request.formData();
    const externalReference = String(form.get('MessageSid') ?? '');
    const rawStatus = String(form.get('MessageStatus') ?? '');

    if (!externalReference) {
      return runtime.json({ received: true, ignored: true });
    }

    const status = mapTwilioStatusToLifecycle(rawStatus);
    const now = new Date().toISOString();
    const payload = Object.fromEntries(form.entries());
    const admin = runtime.getAdminClient();
    const patch = buildLifecyclePatch(status, now, payload, rawStatus);

    const { error } = await admin
      .from('communication_deliveries')
      .update(patch)
      .eq('external_reference', externalReference)
      .eq('provider_name', 'twilio');

    if (error) {
      return runtime.json({ error: error.message }, 500);
    }

    return runtime.json({ received: true, status });
  }

  return {
    handleApplyCommunicationMigrations,
    handleGetCommunicationPreferences,
    handlePatchCommunicationPreferences,
    handleProcessCommunicationQueue,
    handleProviderDiagnostics,
    handleQueueCommunicationDeliveries,
    handleResendWebhook,
    handleSendTestCommunication,
    handleTwilioWebhook,
    processQueuedDeliveries,
  };
}
