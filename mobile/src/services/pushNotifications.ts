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
  rideUpdates: boolean;
  promotions: boolean;
  chatMessages: boolean;
  systemAlerts: boolean;
}

class PushNotificationsService {
  private expoPushToken: string | null = null;
  private preferences: NotificationPreferences = {
    rideUpdates: true,
    promotions: true,
    chatMessages: true,
    systemAlerts: true,
  };

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

    const token = await Notifications.getExpoPushTokenAsync();
    this.expoPushToken = token.data;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Wasel Ride Updates',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22C55E',
        sound: 'default',
      });
    }

    await this.saveTokenToServer(token.data);

    Notifications.addPushTokenListener(({ data }) =>
      this.handleTokenRefresh(data),
    );

    Notifications.addNotificationReceivedListener((notification) =>
      this.handleNotificationReceived(notification),
    );

    Notifications.addNotificationResponseReceivedListener((response) =>
      this.handleNotificationTap(response),
    );
  }

  private async handleTokenRefresh(token: string): Promise<void> {
    if (token !== this.expoPushToken) {
      this.expoPushToken = token;
      await this.saveTokenToServer(token);
    }
  }

  private handleNotificationReceived(notification: Notifications.Notification) {
    console.log('[PushNotifications] Received:', notification);
  }

  private handleNotificationTap(response: Notifications.NotificationResponse) {
    const data = (response.notification.request.content.data ?? {}) as Record<string, unknown>;
    const screen = typeof data.screen === 'string' ? data.screen : null;

    if (screen) {
      this.navigateToScreen(screen, data);
    }
  }

  private navigateToScreen(screen: string, params?: Record<string, unknown>) {
    if (Platform.OS === 'web') return;
    const query = params
      ? Object.entries(params)
          .filter(([, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&')
      : '';
    const url = `wasel://${screen}${query ? '?' + query : ''}`;
    Linking.openURL(url).catch(error => {
      console.error('[PushNotifications] Navigation failed:', error);
    });
  }

  async saveTokenToServer(token: string): Promise<void> {
    const user = mobileAuth.getUser();
    if (!user) return;

    try {
      await apiClient.post('notifications/register', {
        token,
        userId: user.id,
        platform: Platform.OS,
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
      const response = await apiClient.get<NotificationPreferences>(
        `notifications/preferences/${user.id}`,
      );
      if (response.data) {
        this.preferences = response.data;
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
        `notifications/preferences/${user.id}`,
        preferences,
      );

      if (response.data) {
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