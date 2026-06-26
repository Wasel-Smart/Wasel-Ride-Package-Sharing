import { getRedis } from '@wasel/backend-shared/redis';
import { logger } from '@wasel/backend-shared/logging/logger';
import { loadConfig } from '@wasel/backend-shared/config';

const config = loadConfig();

export interface PushNotificationPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  platform?: 'ios' | 'android';
}

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export interface NotificationDeliveryResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export abstract class NotificationProvider {
  abstract getName(): string;
  abstract send(payload: unknown): Promise<NotificationDeliveryResult>;
}

export class PushNotificationProvider extends NotificationProvider {
  getName() { return 'push'; }

  async send(payload: PushNotificationPayload): Promise<NotificationDeliveryResult> {
    try {
      const redis = getRedis();
      await redis.xadd('notifications:push:outbox', '*',
        'token', payload.token,
        'title', payload.title,
        'body', payload.body,
        'platform', payload.platform || 'android',
        'data', JSON.stringify(payload.data || {})
      );
      return { success: true };
    } catch (error) {
      logger.error({ error, payload }, 'Push notification delivery failed');
      return { success: false, error: (error as Error).message };
    }
  }
}

export class SMSNotificationProvider extends NotificationProvider {
  getName() { return 'sms'; }

  async send(payload: SMSMessage): Promise<NotificationDeliveryResult> {
    try {
      const redis = getRedis();
      await redis.xadd('notifications:sms:outbox', '*',
        'to', payload.to,
        'body', payload.body,
        'from', payload.from || config.twilio.fromNumber
      );
      return { success: true };
    } catch (error) {
      logger.error({ error, payload }, 'SMS notification delivery failed');
      return { success: false, error: (error as Error).message };
    }
  }
}

export class EmailNotificationProvider extends NotificationProvider {
  getName() { return 'email'; }

  async send(payload: EmailMessage): Promise<NotificationDeliveryResult> {
    try {
      const redis = getRedis();
      await redis.xadd('notifications:email:outbox', '*',
        'to', payload.to,
        'subject', payload.subject,
        'body', payload.body,
        'from', payload.from || config.sendgrid.fromEmail
      );
      return { success: true };
    } catch (error) {
      logger.error({ error, payload }, 'Email notification delivery failed');
      return { success: false, error: (error as Error).message };
    }
  }
}

export class WhatsAppNotificationProvider extends NotificationProvider {
  getName() { return 'whatsapp'; }

  async send(payload: SMSMessage): Promise<NotificationDeliveryResult> {
    try {
      const redis = getRedis();
      await redis.xadd('notifications:whatsapp:outbox', '*',
        'to', payload.to,
        'body', payload.body
      );
      return { success: true };
    } catch (error) {
      logger.error({ error, payload }, 'WhatsApp notification delivery failed');
      return { success: false, error: (error as Error).message };
    }
  }
}

export class NotificationGateway {
  private providers: Map<string, NotificationProvider> = new Map();

  constructor() {
    this.providers.set('push', new PushNotificationProvider());
    this.providers.set('sms', new SMSNotificationProvider());
    this.providers.set('email', new EmailNotificationProvider());
    this.providers.set('whatsapp', new WhatsAppNotificationProvider());
  }

  async dispatch(channel: string, payload: unknown): Promise<NotificationDeliveryResult> {
    const provider = this.providers.get(channel);
    if (!provider) {
      return { success: false, error: `Unknown notification channel: ${channel}` };
    }

    try {
      const result = await provider.send(payload);
      logger.info({ channel, success: result.success, providerMessageId: result.providerMessageId }, 'Notification dispatched');
      return result;
    } catch (error) {
      logger.error({ channel, error }, 'Notification dispatch exception');
      return { success: false, error: (error as Error).message };
    }
  }

  async dispatchMulti(channels: string[], payload: Record<string, unknown>): Promise<Map<string, NotificationDeliveryResult>> {
    const results = new Map<string, NotificationDeliveryResult>();
    await Promise.allSettled(
      channels.map(async (channel) => {
        const result = await this.dispatch(channel, payload);
        results.set(channel, result);
      })
    );
    return results;
  }
}

export const notificationGateway = new NotificationGateway();
