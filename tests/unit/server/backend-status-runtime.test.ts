import { describe, expect, it } from 'vitest';

import {
  buildComponentHealthPayload,
  buildJobCatalog,
  buildPublicHealthPayload,
} from '../../../supabase/functions/make-server-0b1f4071/_shared/status-runtime';

describe('backend status runtime helpers', () => {
  it('builds the public health payload with stable route metadata', () => {
    const payload = buildPublicHealthPayload({
      service: 'make-server-0b1f4071',
      timestamp: '2026-04-15T00:00:00.000Z',
      communications: {
        resendConfigured: false,
        sendgridConfigured: true,
        twilioConfigured: false,
        workerSecretConfigured: true,
        webhookTokenConfigured: true,
      },
      automation: {
        workerSecretConfigured: true,
        runtimeMigrationEndpointsEnabled: false,
      },
    });

    expect(payload.ok).toBe(true);
    expect(payload.status).toBe('ok');
    expect(payload.communications.sendgridConfigured).toBe(true);
    expect(payload.endpoints.jobs).toBe('/jobs/status');
    expect(payload.endpoints.database).toBe('/health/db');
  });

  it('treats optional not-configured checks as non-failing', () => {
    const payload = buildComponentHealthPayload({
      service: 'make-server-0b1f4071',
      component: 'kv',
      status: 'not_configured',
      required: false,
      timestamp: '2026-04-15T00:00:00.000Z',
      detail: 'No dedicated key-value backend is configured for this runtime.',
    });

    expect(payload.ok).toBe(true);
    expect(payload.status).toBe('not_configured');
    expect(payload.required).toBe(false);
  });

  it('marks gated jobs as disabled when their prerequisites are missing', () => {
    const jobs = buildJobCatalog({
      communicationWorkerSecretConfigured: true,
      automationWorkerSecretConfigured: false,
      runtimeMigrationEndpointsEnabled: false,
      webhookTokenConfigured: true,
    });

    expect(jobs.find((job) => job.path === '/communications/process')?.enabled).toBe(true);
    expect(jobs.find((job) => job.path === '/automation/process')?.enabled).toBe(false);
    expect(jobs.find((job) => job.path === '/automation/admin/apply-migrations')?.enabled).toBe(false);
    expect(jobs.find((job) => job.path === '/communications/webhooks/resend')?.enabled).toBe(true);
  });
});
