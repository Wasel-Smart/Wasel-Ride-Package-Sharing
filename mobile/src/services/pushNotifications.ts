/**
 * Push Notifications Service - FCM/APNs integration
 * Handles ride status notifications and deep linking
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert, Linking } from 'react-native';
import { apiClient } from '../lib/api';
import { mobileAuth } from '../services/auth';
import { sanitizeLogValue } from '../utils/sanitize';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationPreferences {
  inApp: boolean;
  push: boolean;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  tripUpdates: boolean;
  bookingRequests: boolean;
  messages: boolean;
  promotions: boolean;
  prayerReminders: boolean;
  criticalAlerts: boolean;
  preferredLanguage: 'en' | 'ar';
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  inApp: true,
  push: true,
  email: false,
  sms: false,
  whatsapp: false,
  tripUpdates: true,
  bookingRequests: true,
  messages: true,
  promotions: false,
  prayerReminders: true,
  criticalAlerts: true,
  preferredLanguage: 'en',
};

function normalizePreferences(row: Record<string, unknown> | null | undefined): NotificationPreferences {
  if (!row) return { ...DEFAULT_PREFERENCES };
  return {
    inApp: row.in_app_enabled !== false,
    push: row.push_enabled !== false,
    email: row.email_enabled === true,
    sms: row.sms_enabled === true,
    whatsapp: row.whatsapp_enabled === true,
    tripUpdates: row.trip_updates_enabled !== false,
    bookingRequests: row.booking_requests_enabled !== false,
    messages: row.messages_enabled !== false,
    promotions: row.promotions_enabled === true,
    prayerReminders: row.prayer_reminders_enabled !== false,
    criticalAlerts: row.critical_alerts_enabled !== false,
    preferredLanguage: row.preferred_language === 'ar' ? 'ar' : 'en',
  };
}

class PushNotificationsService {
  private expoPushToken: string | null = null;
  private preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };
  // Store subscription handles so they can be removed when the service is torn down.
  private receivedSub: ReturnType<typeof Notifications.addNotificationReceivedListener> | null = null;
  private responseSub: ReturnType<typeof Notifications.addNotificationResponseReceivedListener> | null = null;
  private tokenSub: ReturnType<typeof Notifications.addPushTokenListener> | null = null;

  async initialize(): Promise<void> {
    if (!Device.isDevice) {
      console.log('[PushNotifications] Must use physical device for push tokens');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Push notifications', 'Enable notifications to receive ride updates');
      return;
    }

    const projectId = Constants.easConfig?.projectId;
    const token = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    this.expoPushToken = token.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Wasel Ride Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#72C70D',
        sound: 'default',
      });
    }

    await this.saveTokenToServer(token.data);

    // Store subscriptions so they can be properly removed via destroy().
    this.tokenSub = Notifications.addPushTokenListener((data: any) =>
      this.handleTokenRefresh(data),
    );

    this.receivedSub = Notifications.addNotificationReceivedListener((notification: any) =>
      this.handleNotificationReceived(notification),
    );

    this.responseSub = Notifications.addNotificationResponseReceivedListener((response: any) =>
      this.handleNotificationTap(response),
    );
  }

  /**
   * Removes all notification listeners. Call this if the service is re-initialized
   * (e.g. after sign-out) to avoid accumulating duplicate listeners.
   */
  destroy(): void {
    this.tokenSub?.remove();
    this.receivedSub?.remove();
    this.responseSub?.remove();
    this.tokenSub = null;
    this.receivedSub = null;
    this.responseSub = null;
  }

  private async handleTokenRefresh(token: string): Promise<void> {
    if (token !== this.expoPushToken) {
      this.expoPushToken = token;
      await this.saveTokenToServer(token);
    }
  }

  private handleNotificationReceived(notification: any) {
    console.log('[PushNotifications] Received:', sanitizeLogValue(notification));
  }

  private handleNotificationTap(response: any) {
    const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
    const screen = typeof data.screen === 'string' ? data.screen : null;

    if (screen) {
      this.navigateToScreen(screen, data);
    }
  }

  private navigateToScreen(screen: string, params?: Record<string, unknown>) {
    if (Platform.OS === 'web') return;
    // Use the in-process navigation ref first (available once the navigator is mounted).
    // This avoids relying on a cold deep-link URL which can race with app startup.
    const { navigateFromOutside } = require('../navigation/ref') as typeof import('../navigation/ref');
    if (navigateFromOutside(screen, params)) return;

    // Fallback: open via deep-link URL (handles the case where the navigator
    // is not yet mounted when the notification tap triggers app launch).
    const query = params
      ? Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&')
      : '';
    const url = `wasel://${screen}${query ? '?' + query : ''}`;
    Linking.openURL(url).catch((error: any) => {
      console.error('[PushNotifications] Navigation failed:', sanitizeLogValue(error));
    });
  }

  async saveTokenToServer(token: string): Promise<void> {
    const user = mobileAuth.getUser();
    if (!user) return;

    try {
      await apiClient.post('notifications/push-token', {
        token,
        userId: user.id,
        platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web',
        deviceId: Constants.installationId,
      });
    } catch (error) {
      console.error('[PushNotifications] Failed to save token:', error);
    }
  }

  async getPreferences(): Promise<NotificationPreferences> {
    const user = mobileAuth.getUser();
    if (!user) return this.preferences;

    try {
      const response = await apiClient.get<{ preferences: Record<string, unknown> | null }>('communications/preferences');
      if (response.data?.preferences) {
        this.preferences = normalizePreferences(response.data.preferences);
      }
    } catch (error) {
      console.error('[PushNotifications] Failed to load preferences:', error);
    }

    return this.preferences;
  }

  async updatePreferences(
    preferences: Partial<NotificationPreferences>,
  ): Promise<boolean> {
    const user = mobileAuth.getUser();
    if (!user) return false;

    try {
      const response = await apiClient.patch(
        'communications/preferences',
        preferences,
      );

      if (!response.error) {
        this.preferences = { ...this.preferences, ...preferences };
        return true;
      }
    } catch (error) {
      console.error('[PushNotifications] Failed to update preferences:', error);
    }

    return false;
  }

  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }

  scheduleLocalNotification(
    title: string,
    body: string,
    data?: Record<string, unknown>,
    delayMs = 0,
  ): void {
    Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: (data ?? {}) as Record<string, any>,
        sound: true,
        badge: 1,
      },
      trigger: delayMs > 0 ? { seconds: Math.ceil(delayMs / 1000) } : null,
    }).catch(console.error);
  }

  cancelAllNotifications(): void {
    Notifications.cancelAllScheduledNotificationsAsync().catch(console.error);
  }

  setBadgeCount(count: number): void {
    if (Platform.OS === 'ios') {
      Notifications.setBadgeCountAsync(count).catch(console.error);
    }
  }
}

export const pushNotifications = new PushNotificationsService();
