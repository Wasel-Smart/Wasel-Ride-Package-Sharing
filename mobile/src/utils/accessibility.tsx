import React from 'react';
import { PixelRatio, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

const scale = PixelRatio.getFontScale();

export function getFontSize(size: number): number {
  return size * scale;
}

export const accessibilityStyles = StyleSheet.create({
  screenReaderOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  focusRing: {
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'solid',
  },
  touchTargetMinimum: {
    minHeight: 48,
    minWidth: 48,
  },
  highContrastText: {
    color: '#07111F',
    fontWeight: '900',
  },
});

export const accessibilityLabels = {
  rideMap: 'Interactive map showing your ride location',
  driverMarker: 'Driver location marker',
  destinationMarker: 'Destination location marker',
  callDriver: 'Call your driver',
  shareLocation: 'Share your live location',
  refreshRide: 'Refresh ride status',
};

export function AccessibleText({
  children,
  style,
  accessibilityLabel,
  accessibilityHint,
  accessible = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessible?: boolean;
}) {
  return (
    <Text
      style={style}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {children}
    </Text>
  );
}

export function AccessibleView({
  children,
  style,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  accessible = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityState?: Record<string, unknown>;
  accessible?: boolean;
}) {
  return (
    <View
      style={style}
      accessible={accessible}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole as unknown as never}
      accessibilityState={accessibilityState as unknown as never}
    >
      {children}
    </View>
  );
}