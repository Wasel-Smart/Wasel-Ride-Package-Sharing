import { createDomainEvent, publishDomainEvent } from '@/platform';
import { NOTIFICATIONS_DOMAIN_EVENTS } from '../domain/events';
import { NotificationsGateway } from '../infrastructure/NotificationsGateway';

class NotificationsApplicationService {
  constructor(private readonly gateway: NotificationsGateway) {}

  async createNotification(...args: Parameters<NotificationsGateway['createNotification']>) {
    const result = await this.gateway.createNotification(...args);
    await publishDomainEvent(createDomainEvent({
      name: NOTIFICATIONS_DOMAIN_EVENTS.notificationCreated,
      domain: 'notifications',
      payload: {
        source: result.source,
        deliveriesQueued: result.deliveriesQueued ?? 0,
      },
    }));
    return result;
  }

  async getNotifications() {
    const notifications = await this.gateway.getNotifications();
    await publishDomainEvent(createDomainEvent({
      name: NOTIFICATIONS_DOMAIN_EVENTS.notificationsFetched,
      domain: 'notifications',
      payload: { count: notifications.notifications.length },
    }));
    return notifications;
  }

  async markAsRead(notificationId: string) {
    await this.gateway.markAsRead(notificationId);
    await publishDomainEvent(createDomainEvent({
      name: NOTIFICATIONS_DOMAIN_EVENTS.notificationRead,
      domain: 'notifications',
      payload: { notificationId },
    }));
  }
}

export const notificationsApplicationService = new NotificationsApplicationService(
  new NotificationsGateway(),
);
