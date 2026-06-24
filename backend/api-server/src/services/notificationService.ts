import { notificationRepository } from '../repositories/notificationRepository.js';
import { getRedis } from '@wasel/backend-shared/redis';
import { logger } from '@wasel/backend-shared/logging/logger';

interface NotificationInput {
  userId: string;
  type: string;
  title: string;
  titleAr?: string;
  message: string;
  messageAr?: string;
  data?: Record<string, unknown>;
  channel?: string;
}

export class NotificationService {
  private redis = getRedis();

  async create(input: NotificationInput) {
    const notification = await notificationRepository.create(input.userId, input);

    if (input.channel === 'push' || input.channel === 'in_app') {
      await this.queuePushNotification(notification);
    }

    return notification;
  }

  async notifyUser(userId: string, input: Omit<NotificationInput, 'userId'>) {
    return this.create({ ...input, userId });
  }

  async getNotifications(userId: string, page: number, limit: number) {
    return notificationRepository.findForUser(userId, page, limit);
  }

  async markAsRead(notificationId: string, userId: string) {
    const notification = await notificationRepository.markAsRead(notificationId, userId);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  private async queuePushNotification(notification: { id: string; user_id: string; title: string; message: string; data: Record<string, unknown> }) {
    try {
      await this.redis.xadd('notifications:dispatch', '*',
        'notificationId', notification.id,
        'userId', notification.user_id,
        'title', notification.title,
        'message', notification.message,
        'data', JSON.stringify(notification.data || {})
      );
    } catch (error) {
      logger.error({ error, notificationId: notification.id }, 'Failed to queue push notification');
    }
  }
}

export const notificationService = new NotificationService();
