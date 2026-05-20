import React from 'react';
import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native';

export function announceForAccessibility(message: string) {
  AccessibilityInfo.announceForAccessibility(message);
}

export async function isScreenReaderEnabled(): Promise<boolean> {
  return await AccessibilityInfo.isScreenReaderEnabled();
}

export function setAccessibilityFocus(ref: React.RefObject<any>) {
  if (ref.current) {
    const reactTag = findNodeHandle(ref.current);
    if (reactTag) {
      AccessibilityInfo.setAccessibilityFocus(reactTag);
    }
  }
}

export function getButtonA11yProps(label: string, hint?: string) {
  return {
    accessible: true,
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityState: { disabled: false },
  };
}

export function getLinkA11yProps(label: string, hint?: string) {
  return {
    accessible: true,
    accessibilityRole: 'link' as const,
    accessibilityLabel: label,
    accessibilityHint: hint,
  };
}

export function getImageA11yProps(label: string) {
  return {
    accessible: true,
    accessibilityRole: 'image' as const,
    accessibilityLabel: label,
  };
}

export function getInputA11yProps(label: string, hint?: string, required?: boolean) {
  return {
    accessible: true,
    accessibilityLabel: label,
    accessibilityHint: hint,
    accessibilityRequired: required,
  };
}

export function getHeadingA11yProps(label: string, level: 1 | 2 | 3 | 4 | 5 | 6 = 1) {
  return {
    accessible: true,
    accessibilityRole: 'header' as const,
    accessibilityLabel: label,
    ...(Platform.OS === 'ios' && { accessibilityTraits: ['header'] }),
  };
}

export function useScreenReader() {
  const [isEnabled, setIsEnabled] = React.useState(false);

  React.useEffect(() => {
    isScreenReaderEnabled().then(setIsEnabled);

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsEnabled
    );

    return () => subscription.remove();
  }, []);

  return isEnabled;
}

export const MIN_TOUCH_TARGET = 44;
