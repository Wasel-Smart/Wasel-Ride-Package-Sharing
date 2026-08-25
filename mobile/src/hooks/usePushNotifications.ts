import { useEffect, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
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

type NotificationPreferences = {
  rideUpdates: boolean;
  promotions: boolean;
  chatMessages: boolean;
  systemAlerts: boolean;
};

export function usePushNotifications() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    rideUpdates: true,
    promotions: true,
    chatMessages: true,
    systemAlerts: true,
  });
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      if (!Device.isDevice) {
        console.log('[PushNotifications] Must use physical device');
        setLoading(false);
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        Alert.alert('Notifications', 'Enable notifications for ride updates');
        setLoading(false);
        return;
      }

      const projectId = Constants.easConfig?.projectId;
      const tokenResult = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();
      const token = tokenResult.data;
      if (mounted) setPushToken(token);

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Wasel Ride Updates',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#72C70D',
        });
      }

      const user = mobileAuth.getUser();
      if (user) {
        await apiClient.post('notifications/register', {
          token,
          userId: user.id,
          platform: Platform.OS,
          deviceId: Constants.installationId,
        });
      }

      setInitialized(true);
      setLoading(false);
    }

    void initialize();

    const tokenSubscription = Notifications.addPushTokenListener(({ data }: { data: any }) => {
      if (mounted) setPushToken(data);
    });

    return () => {
      mounted = false;
      tokenSubscription.remove();
    };
  }, []);

  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      const user = mobileAuth.getUser();
      if (!user) return false;

      try {
        await apiClient.patch(`notifications/preferences/${user.id}`, newPreferences);
        setPreferences(prev => ({ ...prev, ...newPreferences }));
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  return {
    preferences,
    loading,
    initialized,
    pushToken,
    updatePreferences,
  };
}
