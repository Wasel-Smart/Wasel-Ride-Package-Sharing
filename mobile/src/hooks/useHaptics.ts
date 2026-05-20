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
    } catch (error) {
      // Haptics not supported on this device
      console.warn('Haptics not supported:', error);
    }
  }, []);

  return { trigger };
}

// Convenience hooks for specific feedback types
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
