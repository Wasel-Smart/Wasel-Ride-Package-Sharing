import { notificationRepository } from '../repositories/notificationRepository.js';
import { getRedis } from '@wasel/backend-shared/redis';
import { logger } from '@wasel/backend-shared/logging/logger';
export class NotificationService {
    redis = getRedis();
    async create(input) {
        const notification = await notificationRepository.create(input.userId, input);
        if (input.channel === 'push' || input.channel === 'in_app') {
            await this.queuePushNotification(notification);
        }
        return notification;
    }
    async notifyUser(userId, input) {
        return this.create({ ...input, userId });
    }
    async getNotifications(userId, page, limit) {
        return notificationRepository.findForUser(userId, page, limit);
    }
    async markAsRead(notificationId, userId) {
        const notification = await notificationRepository.markAsRead(notificationId, userId);
        if (!notification) {
            throw new Error('Notification not found');
        }
        return notification;
    }
    async queuePushNotification(notification) {
        try {
            await this.redis.xadd('notifications:dispatch', '*', 'notificationId', notification.id, 'userId', notification.user_id, 'title', notification.title, 'message', notification.message, 'data', JSON.stringify(notification.data || {}));
        }
        catch (error) {
            logger.error({ error, notificationId: notification.id }, 'Failed to queue push notification');
        }
    }
}
export const notificationService = new NotificationService();
