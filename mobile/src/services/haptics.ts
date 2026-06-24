/**
 * Haptics Service - Native tactile feedback
 */
import * as Haptics from 'expo-haptics';

export type HapticType =
  | 'selection'
  | 'impactLight'
  | 'impactMedium'
  | 'impactHeavy'
  | 'notificationSuccess'
  | 'notificationWarning'
  | 'notificationError'
  | 'buttonTap'
  | 'rideSuccess'
  | 'rideError';

class HapticsService {
  private enabled = true;
  private hapticMap: Record<HapticType, () => Promise<void>> = {
    selection: () => Haptics.selectionAsync(),
    impactLight: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    impactMedium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    impactHeavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
    notificationSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    notificationWarning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    notificationError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
    buttonTap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    rideSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    rideError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  };

  isSupported(): boolean {
    return true;
  }

  tap(): void {
    this.trigger('buttonTap');
  }

  selection(): void {
    this.trigger('selection');
  }

  success(): void {
    this.trigger('notificationSuccess');
  }

  warning(): void {
    this.trigger('notificationWarning');
  }

  error(): void {
    this.trigger('notificationError');
  }

  impact(style: 'light' | 'medium' | 'heavy' = 'light'): void {
    this.trigger(`impact${style.charAt(0).toUpperCase() + style.slice(1)}` as HapticType);
  }

  private trigger(type: HapticType): void {
    if (!this.enabled) return;

    const handler = this.hapticMap[type];
    if (handler) {
      handler().catch(console.error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export const haptics = new HapticsService();