import { createNavigationContainerRef } from '@react-navigation/core';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Screens a push notification or external event is allowed to deep-link into.
 * Keep this list in sync with the authenticated stack in AppNavigator.tsx.
 * Every screen in the authenticated Stack.Navigator that makes sense as a
 * notification target should appear here.
 */
const ALLOWED_TARGETS = new Set<string>([
  'Notifications',
  'LiveTracking',
  'Chat',
  'RateRide',
  'Trips',
  'Receipt',
  'Safety',
  'Wallet',
  'Packages',
  'TrustCenter',
  'AdvancedSearch',
  'ScheduledRide',
  'DriverProfile',
  'PaymentMethods',
  'ReportIssue',
  'Settings',
]);

/** Screens that live inside the BottomTab navigator and must be opened via Tabs > screen. */
const TAB_TARGETS = new Set<string>(['Wallet', 'Packages']);

/**
 * Navigates from outside React (push taps). Returns false when the target is
 * not allowed or the navigator is not ready, so callers can fall back.
 */
export function navigateFromOutside(screen: string, params?: Record<string, unknown>): boolean {
  if (!ALLOWED_TARGETS.has(screen) || !navigationRef.isReady()) return false;
  const safeParams = params
    ? (Object.fromEntries(
        Object.entries(params).filter(([, v]) => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'),
      ) as Record<string, object | undefined>)
    : undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav = navigationRef as any;
  if (TAB_TARGETS.has(screen)) {
    nav.navigate('Tabs', { screen, params: safeParams });
  } else {
    nav.navigate(screen, safeParams);
  }
  return true;
}
