import { notificationsAPI } from '@/services/notifications';

export class NotificationsGateway {
  createNotification(...args: Parameters<typeof notificationsAPI.createNotification>) {
    return notificationsAPI.createNotification(...args);
  }

  getNotifications() {
    return notificationsAPI.getNotifications();
  }

  markAsRead(notificationId: string) {
    return notificationsAPI.markAsRead(notificationId);
  }
}
