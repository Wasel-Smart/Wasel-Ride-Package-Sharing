/**
 * usePushNotifications — Wasel browser-native push notifications hook
 *
 * Uses the Web Notifications API (no VAPID / service-worker push required).
 * Provides permission management + convenience helpers for key trip events.
 *
 * Trip event flow:
 *   1. notifyTripConfirmed   — immediately after booking
 *   2. notifyDriverApproaching — driver ~1 min away
 *   3. notifyDriverArrived   — driver at pickup
 *   4. notifyTripStarted     — ride begins
 *   5. notifyTripCompleted   — arrived at destination
 *
 * ✅ Syncs browser permission state on mount & after request
 * ✅ Persists server-side push preference (fire-and-forget)
 * ✅ Auto-closes notifications after configurable timeout (default 8 s)
 * ✅ Returns `isSupported` so callers can gracefully degrade
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_URL, fetchWithRetry, getAuthDetails } from '../services/core';
import { omitUndefined } from '../utils/object';

export type NotifPermission = 'default' | 'granted' | 'denied';

export interface NotifyOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
  data?: Record<string, unknown>;
  onClick?: () => void;
  /** Auto-close timeout in ms. Default: 8 000 */
  autoCloseMs?: number;
}

const BRAND_ASSET_VERSION = '20260422-premium';
const DEFAULT_ICON = `/icon-192.png?v=${BRAND_ASSET_VERSION}`;
const DEFAULT_BADGE = `/favicon-32x32.png?v=${BRAND_ASSET_VERSION}`;
const DEFAULT_CLOSE_MS = 8_000;

type NotificationInit = ConstructorParameters<typeof Notification>[1];
type NotificationApiLike = {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
};
type NotificationConstructorLike = NotificationApiLike &
  (new (title: string, options?: NotificationInit) => Notification);
type NotificationFactoryLike = NotificationApiLike &
  ((title: string, options?: NotificationInit) => Notification);

export function usePushNotifications() {
  const NotificationApi = (
    typeof globalThis !== 'undefined' && 'Notification' in globalThis
      ? globalThis.Notification
      : undefined
  ) as NotificationConstructorLike | NotificationFactoryLike | undefined;

  const isSupported = typeof NotificationApi !== 'undefined';

  const [permission, setPermission] = useState<NotifPermission>(
    isSupported ? (NotificationApi.permission as NotifPermission) : 'default',
  );

  // Track active notification so we can close it on unmount
  const activeNotif = useRef<Notification | null>(null);

  // Keep permission state in sync with actual browser value
  useEffect(() => {
    if (!isSupported) return;
    setPermission(NotificationApi.permission as NotifPermission);
  }, [isSupported, NotificationApi]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeNotif.current?.close();
    };
  }, []);

  /** Ask the user for notification permission. */
  const requestPermission = useCallback(async (): Promise<NotifPermission> => {
    if (!isSupported) return 'denied';

    const result = await NotificationApi.requestPermission();
    const perm = result as NotifPermission;
    setPermission(perm);

    // Persist preference to server (fire-and-forget)
    try {
      const { token } = await getAuthDetails();
      fetchWithRetry(`${API_URL}/notifications/push-pref`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled: perm === 'granted' }),
      }).catch(() => {}); // intentionally fire-and-forget
    } catch {
      // Not critical — ignore silently
    }

    return perm;
  }, [isSupported, NotificationApi]);

  /** Low-level — fire a native browser notification. */
  const notify = useCallback(
    (options: NotifyOptions): Notification | null => {
      if (!isSupported || permission !== 'granted') return null;

      // Close any existing notification with the same tag to prevent stacking
      if (options.tag && activeNotif.current?.tag === options.tag) {
        activeNotif.current.close();
      }

      const createNotification = () => {
        const init = omitUndefined({
          body: options.body,
          icon: options.icon ?? DEFAULT_ICON,
          badge: DEFAULT_BADGE,
          tag: options.tag,
          silent: options.silent ?? false,
          data: options.data,
        });

        // Some test environments stub Notification with a non-constructible function.
        // Prefer `new`, but gracefully fall back to direct invocation.
        try {
          return new (NotificationApi as NotificationConstructorLike)(options.title, init);
        } catch {
          return (NotificationApi as NotificationFactoryLike)(options.title, init);
        }
      };

      const notif = createNotification();

      if (options.onClick) {
        notif.onclick = () => {
          window.focus();
          options.onClick?.();
          notif.close();
        };
      }

      const closeMs = options.autoCloseMs ?? DEFAULT_CLOSE_MS;
      const timer = setTimeout(() => notif.close(), closeMs);
      notif.onclose = () => clearTimeout(timer);

      activeNotif.current = notif;
      return notif;
    },
    [NotificationApi, isSupported, permission],
  );

  // ── Trip-event helpers ─────────────────────────────────────────────────────

  const notifyBookingRequested = useCallback(
    (driverName: string, routeLabel: string) =>
      notify({
        title:
          '\u23F3 Booking Request Sent \u00B7 \u062A\u0645 \u0625\u0631\u0633\u0627\u0644 \u0637\u0644\u0628 \u0627\u0644\u062D\u062C\u0632',
        body: `${routeLabel} with ${driverName} is being confirmed in Wasel.`,
        tag: 'trip-requested',
      }),
    [notify],
  );

  const notifyTripConfirmed = useCallback(
    (driverName: string, routeLabel: string) =>
      notify({
        title:
          '\u{1F697} Ride Confirmed! \u00B7 \u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0631\u062D\u0644\u0629',
        body: `${routeLabel} with ${driverName} is confirmed in Wasel. Open the app for live trip details.`,
        tag: 'trip-confirmed',
      }),
    [notify],
  );

  const notifyDriverApproaching = useCallback(
    (driverName: string) =>
      notify({
        title:
          '\u{1F4CD} Driver Approaching \u00B7 \u0627\u0644\u0633\u0627\u0626\u0642 \u064A\u0642\u062A\u0631\u0628',
        body: `${driverName} is almost at your pickup location.`,
        tag: 'driver-approaching',
      }),
    [notify],
  );

  const notifyDriverArrived = useCallback(
    (driverName: string) =>
      notify({
        title:
          '\u{1F3C1} Driver Arrived \u00B7 \u0648\u0635\u0644 \u0627\u0644\u0633\u0627\u0626\u0642',
        body: `${driverName} is waiting at your pickup point.`,
        tag: 'driver-arrived',
      }),
    [notify],
  );

  const notifyTripStarted = useCallback(
    () =>
      notify({
        title:
          '\u25B6\uFE0F Trip Started \u00B7 \u0628\u062F\u0623\u062A \u0627\u0644\u0631\u062D\u0644\u0629',
        body: 'Your Wasel trip is underway. Enjoy the journey!',
        tag: 'trip-started',
      }),
    [notify],
  );

  const notifyTripCompleted = useCallback(
    (price: string) =>
      notify({
        title:
          '\u2705 Trip Complete \u00B7 \u0627\u0643\u062A\u0645\u0644\u062A \u0627\u0644\u0631\u062D\u0644\u0629',
        body: `You've arrived! Total: ${price} JOD. Rate your driver?`,
        tag: 'trip-completed',
      }),
    [notify],
  );

  return {
    isSupported,
    permission,
    requestPermission,
    notify,
    // Trip helpers
    notifyBookingRequested,
    notifyTripConfirmed,
    notifyDriverApproaching,
    notifyDriverArrived,
    notifyTripStarted,
    notifyTripCompleted,
  };
}
