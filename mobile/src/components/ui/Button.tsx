import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle,
} from 'react-native';
import { C, R } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

const BG: Record<Variant, string> = {
  primary:   C.cyan,
  secondary: C.card2,
  outline:   'transparent',
  ghost:     'transparent',
  danger:    C.redDim,
};

const TEXT_COLOR: Record<Variant, string> = {
  primary:   '#fff',
  secondary: C.text,
  outline:   C.cyan,
  ghost:     C.sub,
  danger:    C.red,
};

const BORDER: Record<Variant, string> = {
  primary:   'transparent',
  secondary: C.border,
  outline:   C.cyanBorder,
  ghost:     'transparent',
  danger:    'rgba(255,77,106,0.35)',
};

const HEIGHT: Record<Size, number> = { sm: 38, md: 48, lg: 56 };
const FONT_SIZE: Record<Size, number> = { sm: 13, md: 15, lg: 16 };
const PH: Record<Size, number> = { sm: 14, md: 20, lg: 24 };

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, fullWidth = true,
  style, textStyle, accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.82}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        {
          height:            HEIGHT[size],
          backgroundColor:   BG[variant],
          borderColor:       BORDER[variant],
          paddingHorizontal: PH[size],
          alignSelf:         fullWidth ? 'stretch' : 'flex-start',
          opacity:           isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={TEXT_COLOR[variant]} />
      ) : (
        <Text
          style={[
            styles.label,
            { fontSize: FONT_SIZE[size], color: TEXT_COLOR[variant] },
            textStyle,
          ]}
        >
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: R.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
