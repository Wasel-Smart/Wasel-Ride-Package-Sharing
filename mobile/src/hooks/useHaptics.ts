import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';

export type HapticFeedbackType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection';

/**
 * useHaptics — central haptic feedback hook.
 * Returns both a generic `trigger(type)` AND convenience shorthands
 * (light, medium, heavy, success, warning, error, selection) so that
 * every screen can destructure exactly what it needs.
 */
export function useHaptics() {
  const trigger = useCallback((type: HapticFeedbackType = 'light') => {
    try {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
          Haptics.selectionAsync();
          break;
      }
    } catch {
      // Haptics not supported on this device — fail silently
    }
  }, []);

  // ── Convenience shorthands ──────────────────────────────────────────────
  const light     = useCallback(() => trigger('light'),     [trigger]);
  const medium    = useCallback(() => trigger('medium'),    [trigger]);
  const heavy     = useCallback(() => trigger('heavy'),     [trigger]);
  const success   = useCallback(() => trigger('success'),   [trigger]);
  const warning   = useCallback(() => trigger('warning'),   [trigger]);
  const error     = useCallback(() => trigger('error'),     [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  return { trigger, light, medium, heavy, success, warning, error, selection };
}

// Standalone convenience hooks
export function useSuccessHaptic() {
  const { trigger } = useHaptics();
  return useCallback(() => trigger('success'), [trigger]);
}

export function useErrorHaptic() {
  const { trigger } = useHaptics();
  return useCallback(() => trigger('error'), [trigger]);
}

export function useSelectionHaptic() {
  const { trigger } = useHaptics();
  return useCallback(() => trigger('selection'), [trigger]);
}
