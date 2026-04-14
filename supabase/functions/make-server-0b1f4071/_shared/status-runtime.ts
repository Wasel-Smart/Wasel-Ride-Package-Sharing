export type ComponentHealthStatus = 'healthy' | 'degraded' | 'not_configured';

export interface CommunicationsHealthSnapshot {
  resendConfigured: boolean;
  sendgridConfigured: boolean;
  twilioConfigured: boolean;
  workerSecretConfigured: boolean;
  webhookTokenConfigured: boolean;
}

export interface AutomationHealthSnapshot {
  workerSecretConfigured: boolean;
  runtimeMigrationEndpointsEnabled: boolean;
}

export interface PublicHealthPayload {
  ok: true;
  status: 'ok';
  service: string;
  timestamp: string;
  communications: CommunicationsHealthSnapshot;
  automation: AutomationHealthSnapshot;
  endpoints: {
    health: '/health';
    database: '/health/db';
    auth: '/health/auth';
    storage: '/health/storage';
    kv: '/health/kv';
    jobs: '/jobs/status';
  };
}

export interface ComponentHealthPayload {
  ok: boolean;
  service: string;
  component: string;
  status: ComponentHealthStatus;
  required: boolean;
  timestamp: string;
  detail?: string;
}

export interface JobCatalogItem {
  name: string;
  method: 'GET' | 'POST' | 'PATCH';
  path: string;
  description: string;
  enabled: boolean;
  requiresWorkerSecret: boolean;
  requiresWebhookToken: boolean;
}

export function buildPublicHealthPayload(input: {
  service: string;
  timestamp: string;
  communications: CommunicationsHealthSnapshot;
  automation: AutomationHealthSnapshot;
}): PublicHealthPayload {
  return {
    ok: true,
    status: 'ok',
    service: input.service,
    timestamp: input.timestamp,
    communications: input.communications,
    automation: input.automation,
    endpoints: {
      health: '/health',
      database: '/health/db',
      auth: '/health/auth',
      storage: '/health/storage',
      kv: '/health/kv',
      jobs: '/jobs/status',
    },
  };
}

export function buildComponentHealthPayload(input: {
  service: string;
  component: string;
  status: ComponentHealthStatus;
  required: boolean;
  timestamp: string;
  detail?: string;
}): ComponentHealthPayload {
  return {
    ok: input.status !== 'degraded',
    service: input.service,
    component: input.component,
    status: input.status,
    required: input.required,
    timestamp: input.timestamp,
    ...(input.detail ? { detail: input.detail } : {}),
  };
}

export function buildJobCatalog(input: {
  communicationWorkerSecretConfigured: boolean;
  automationWorkerSecretConfigured: boolean;
  runtimeMigrationEndpointsEnabled: boolean;
  webhookTokenConfigured: boolean;
}): JobCatalogItem[] {
  return [
    {
      name: 'communications.process',
      method: 'POST',
      path: '/communications/process',
      description: 'Process queued communication deliveries.',
      enabled: input.communicationWorkerSecretConfigured,
      requiresWorkerSecret: true,
      requiresWebhookToken: false,
    },
    {
      name: 'automation.process',
      method: 'POST',
      path: '/automation/process',
      description: 'Process queued automation jobs and optional inline communication work.',
      enabled: input.automationWorkerSecretConfigured,
      requiresWorkerSecret: true,
      requiresWebhookToken: false,
    },
    {
      name: 'communications.provider-diagnostics',
      method: 'GET',
      path: '/communications/admin/provider-diagnostics',
      description: 'Inspect outbound provider configuration and connectivity.',
      enabled: input.communicationWorkerSecretConfigured,
      requiresWorkerSecret: true,
      requiresWebhookToken: false,
    },
    {
      name: 'communications.apply-migrations',
      method: 'POST',
      path: '/communications/admin/apply-migrations',
      description: 'Apply communications runtime migrations from the edge function.',
      enabled: input.communicationWorkerSecretConfigured && input.runtimeMigrationEndpointsEnabled,
      requiresWorkerSecret: true,
      requiresWebhookToken: false,
    },
    {
      name: 'automation.apply-migrations',
      method: 'POST',
      path: '/automation/admin/apply-migrations',
      description: 'Apply automation runtime migrations from the edge function.',
      enabled: input.automationWorkerSecretConfigured && input.runtimeMigrationEndpointsEnabled,
      requiresWorkerSecret: true,
      requiresWebhookToken: false,
    },
    {
      name: 'communications.webhook.resend',
      method: 'POST',
      path: '/communications/webhooks/resend',
      description: 'Accept Resend delivery lifecycle callbacks.',
      enabled: input.webhookTokenConfigured,
      requiresWorkerSecret: false,
      requiresWebhookToken: true,
    },
    {
      name: 'communications.webhook.twilio',
      method: 'POST',
      path: '/communications/webhooks/twilio',
      description: 'Accept Twilio delivery lifecycle callbacks.',
      enabled: input.webhookTokenConfigured,
      requiresWorkerSecret: false,
      requiresWebhookToken: true,
    },
  ];
}
