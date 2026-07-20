import { useCallback, useState } from 'react';
import { notificationsAPI } from '../../../services/notifications.js';
import { logger } from '../../../utils/monitoring';

export function useNotifications() {
  const [notificationError, setNotificationError] = useState<string | null>(null);

  const notifyBooking = useCallback(async (title: string, message: string, bookingId: string) => {
    try {
      await notificationsAPI.createNotification({
        title,
        message,
        type: 'booking',
        priority: 'high',
        action_url: `/app/my-trips?tab=rides&booking=${bookingId}`,
      });
    } catch (error) {
      logger.warning('Ride notification creation failed', { bookingId, title });
      setNotificationError(error instanceof Error ? error.message : 'Notification failed');
    }
  }, []);

  return { notificationError, notifyBooking };
}
