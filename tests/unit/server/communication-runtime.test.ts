import { describe, expect, it } from 'vitest';

import {
  buildFailurePatch,
  buildResendPayload,
  buildRetrySchedule,
  buildTwilioRequest,
  determineProviderName,
  hasValidWebhookToken,
  mapResendEventToStatus,
  mapTwilioStatusToLifecycle,
  normalizePhoneDestination,
} from '../../../supabase/functions/make-server-0b1f4071/_shared/communication-runtime';

describe('communication runtime helpers', () => {
  it('maps channels to providers', () => {
    expect(determineProviderName('email')).toBe('email_provider');
    expect(determineProviderName('sms')).toBe('twilio');
    expect(determineProviderName('whatsapp')).toBe('twilio');
  });

  it('normalizes phone destinations', () => {
    expect(normalizePhoneDestination('0790 000 000')).toBe('+0790000000');
    expect(normalizePhoneDestination('+962790000000')).toBe('+962790000000');
  });

  it('builds a retry schedule with exponential backoff', () => {
    const schedule = buildRetrySchedule({
      attemptsCount: 2,
      now: new Date('2026-04-01T00:00:00.000Z'),
      maxAttempts: 5,
    });

    expect(schedule.shouldRetry).toBe(true);
    expect(schedule.nextAttemptAt).toBe('2026-04-01T00:10:00.000Z');
  });

  it('marks failures terminally when attempts are exhausted', () => {
    const patch = buildFailurePatch({
      attemptsCount: 5,
      errorMessage: 'provider failure',
      now: new Date('2026-04-01T00:00:00.000Z'),
      maxAttempts: 5,
    });

    expect(patch.delivery_status).toBe('failed');
    expect(patch.failed_at).toBe('2026-04-01T00:00:00.000Z');
  });

  it('builds resend payloads with subject and body', () => {
    const request = buildResendPayload(
      {
        delivery_id: 'd1',
        channel: 'email',
        destination: 'user@example.com',
        subject: 'Hello',
        payload: { body: 'Body text' },
        provider_name: 'resend',
        external_reference: null,
        attempts_count: 0,
      },
      {
        resendApiKey: 're_test',
        resendFromEmail: 'Wasel <hello@wasel.jo>',
      },
    );

    expect(request.url).toContain('api.resend.com');
    expect(String(request.init.body)).toContain('user@example.com');
    expect(String(request.init.body)).toContain('Body text');
  });

  it('builds twilio requests for whatsapp', () => {
    const request = buildTwilioRequest(
      {
        delivery_id: 'd2',
        channel: 'whatsapp',
        destination: '+962790000000',
        subject: 'Hello',
        payload: { body: 'Body text' },
        provider_name: 'twilio',
        external_reference: null,
        attempts_count: 0,
      },
      {
        twilioAccountSid: 'AC123',
        twilioAuthToken: 'secret',
        twilioWhatsappFrom: 'whatsapp:+14155238886',
        communicationWebhookToken: 'token-123',
        functionBaseUrl: 'https://example.supabase.co/functions/v1/make-server-0b1f4071',
      },
    );

    expect(request.url).toContain('/Messages.json');
    expect(String(request.init.body)).toContain('whatsapp%3A%2B962790000000');
    expect(String(request.init.body)).toContain('StatusCallback=');
  });

  it('maps webhook states into lifecycle states', () => {
    expect(mapResendEventToStatus('email.delivered')).toBe('delivered');
    expect(mapResendEventToStatus('email.bounced')).toBe('failed');
    expect(mapTwilioStatusToLifecycle('delivered')).toBe('delivered');
    expect(mapTwilioStatusToLifecycle('undelivered')).toBe('failed');
  });

  it('validates webhook tokens from the url', () => {
    const url = new URL('https://example.com/webhook?token=secret');
    expect(hasValidWebhookToken(url, 'secret')).toBe(true);
    expect(hasValidWebhookToken(url, 'other')).toBe(false);
  });
});
