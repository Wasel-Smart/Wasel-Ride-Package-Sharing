import React from 'react';
import {
  ActivityIndicator,
  GestureResponderEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { colors, hitSlop, radii, shadows, spacing, typography } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

type Tone = 'light' | 'dark';

function triggerLightHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export const ScreenShell = React.memo(function ScreenShell({
  children,
  footer,
  testID,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
  testID?: string;
}) {
  return (
    <View style={styles.shell} testID={testID}>
      <View style={styles.content}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
});

export const SectionHeader = React.memo(function SectionHeader({
  eyebrow,
  title,
  body,
  tone = 'light',
}: {
  eyebrow: string;
  title: string;
  body?: string;
  tone?: Tone;
}) {
  const isDark = tone === 'dark';

  return (
    <View style={styles.header}>
      <Text style={[styles.eyebrow, isDark ? styles.eyebrowDark : null]}>{eyebrow}</Text>
      <Text style={[styles.title, isDark ? styles.titleDark : null]}>{title}</Text>
      {body ? <Text style={[styles.body, isDark ? styles.bodyDark : null]}>{body}</Text> : null}
    </View>
  );
});

export const PremiumPanel = React.memo(function PremiumPanel({
  children,
  style,
  testID,
  tone = 'light',
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  tone?: Tone;
}) {
  return (
    <View
      style={[styles.panel, tone === 'dark' ? styles.panelDark : null, style]}
      testID={testID}
    >
      {children}
    </View>
  );
});

export const InfoCard = React.memo(function InfoCard({
  icon,
  title,
  body,
  tone = colors.cyan,
  style,
}: {
  icon: IconName;
  title: string;
  body: string;
  tone?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconBox, { backgroundColor: `${tone}18`, borderColor: `${tone}44` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
      </View>
    </View>
  );
});

export const MetricTile = React.memo(function MetricTile({
  label,
  value,
  tone = colors.ink,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
});

export const InlineStat = React.memo(function InlineStat({
  label,
  value,
  tone = colors.cyan,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.inlineStat}>
      <Text style={[styles.inlineValue, { color: tone }]}>{value}</Text>
      <Text style={styles.inlineLabel}>{label}</Text>
    </View>
  );
});

export const StatusPill = React.memo(function StatusPill({
  label,
  tone = colors.cyan,
  icon = 'ellipse',
}: {
  label: string;
  tone?: string;
  icon?: IconName;
}) {
  return (
    <View style={[styles.pill, { borderColor: `${tone}55`, backgroundColor: `${tone}12` }]}>
      <Ionicons name={icon} size={12} color={tone} />
      <Text style={[styles.pillText, { color: tone }]}>{label}</Text>
    </View>
  );
});

export const RoutePreview = React.memo(function RoutePreview({
  from,
  to,
  eta,
  distance,
  tone = colors.teal,
}: {
  from: string;
  to: string;
  eta: string;
  distance: string;
  tone?: string;
}) {
  return (
    <View style={styles.routePreview}>
      <View style={styles.routeLine}>
        <View style={[styles.routeDot, { borderColor: tone }]} />
        <View style={[styles.routeConnector, { backgroundColor: `${tone}66` }]} />
        <View style={[styles.routeDot, styles.routeDotFilled, { backgroundColor: tone }]} />
      </View>
      <View style={styles.routeCopy}>
        <View style={styles.routeEndpoints}>
          <Text style={styles.routeCity}>{from}</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.muted} />
          <Text style={styles.routeCity}>{to}</Text>
        </View>
        <View style={styles.routeStats}>
          <InlineStat label="ETA" value={eta} tone={tone} />
          <InlineStat label="Distance" value={distance} tone={colors.blue} />
        </View>
      </View>
    </View>
  );
});

export const StateNotice = React.memo(function StateNotice({
  icon,
  title,
  body,
  tone = colors.cyan,
  loading,
  testID,
}: {
  icon: IconName;
  title: string;
  body?: string;
  tone?: string;
  loading?: boolean;
  testID?: string;
}) {
  return (
    <View style={[styles.notice, { borderColor: `${tone}40`, backgroundColor: `${tone}10` }]} testID={testID}>
      <View style={[styles.noticeIcon, { backgroundColor: `${tone}18` }]}>
        {loading ? <ActivityIndicator color={tone} /> : <Ionicons name={icon} size={20} color={tone} />}
      </View>
      <View style={styles.noticeCopy}>
        <Text style={styles.noticeTitle}>{title}</Text>
        {body ? <Text style={styles.noticeBody}>{body}</Text> : null}
      </View>
    </View>
  );
});

export function PrimaryButton({
  label,
  icon = 'arrow-forward',
  loading,
  disabled,
  tone = colors.teal,
  onPress,
  testID,
}: {
  label: string;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  tone?: string;
  onPress?: (event: GestureResponderEvent) => void;
  testID?: string;
}) {
  const isDisabled = Boolean(disabled || loading);

  const handlePress = React.useCallback(
    (event: GestureResponderEvent) => {
      if (isDisabled) return;
      triggerLightHaptic();
      onPress?.(event);
    },
    [isDisabled, onPress],
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy: Boolean(loading), disabled: isDisabled }}
      disabled={isDisabled}
      hitSlop={hitSlop}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isDisabled ? colors.lineStrong : tone,
          opacity: disabled ? 0.72 : 1,
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
      ]}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text style={styles.buttonText}>{label}</Text>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </>
      )}
    </Pressable>
  );
}

export function ActionRow({
  destructive,
  icon,
  label,
  onPress,
  value,
}: {
  destructive?: boolean;
  icon: IconName;
  label: string;
  onPress: () => void | Promise<void>;
  value?: string;
}) {
  const tone = destructive ? colors.red : colors.text;

  const handlePress = React.useCallback(() => {
    triggerLightHaptic();
    void onPress();
  }, [onPress]);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={hitSlop}
      onPress={handlePress}
      style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
    >
      <Ionicons name={icon} size={18} color={tone} />
      <Text style={[styles.actionText, destructive ? styles.destructiveText : null]}>{label}</Text>
      {value ? <Text style={styles.actionValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.bg,
    flex: 1,
  },
  content: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  footer: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: typography.caption,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  eyebrowDark: {
    color: '#67E8F9',
  },
  title: {
    color: colors.ink,
    fontSize: typography.hero,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
  },
  titleDark: {
    color: '#FFFFFF',
  },
  body: {
    color: colors.muted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  bodyDark: {
    color: '#CBD5E1',
  },
  panel: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: '#FFFFFF',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
  },
  panelDark: {
    ...shadows.lift,
    backgroundColor: colors.navy,
    borderColor: '#213047',
  },
  card: {
    ...shadows.card,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cardText: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '800',
  },
  cardBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  metric: {
    ...shadows.card,
    backgroundColor: colors.surface,
    borderColor: '#FFFFFF',
    borderRadius: radii.lg,
    borderWidth: 1,
    flex: 1,
    minHeight: 84,
    padding: spacing.md,
  },
  metricValue: {
    fontSize: typography.title,
    fontWeight: '900',
    letterSpacing: 0,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: '800',
    marginTop: 5,
    textTransform: 'uppercase',
  },
  inlineStat: {
    gap: 2,
    minWidth: 86,
  },
  inlineValue: {
    fontSize: typography.lead,
    fontWeight: '900',
  },
  inlineLabel: {
    color: colors.muted,
    fontSize: typography.micro,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 32,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillText: {
    fontSize: typography.caption,
    fontWeight: '800',
  },
  routePreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  routeLine: {
    alignItems: 'center',
    paddingTop: 3,
    width: 20,
  },
  routeDot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 2,
    height: 14,
    width: 14,
  },
  routeDotFilled: {
    borderWidth: 0,
  },
  routeConnector: {
    flex: 1,
    marginVertical: 4,
    width: 2,
  },
  routeCopy: {
    flex: 1,
    gap: spacing.md,
  },
  routeEndpoints: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  routeCity: {
    color: colors.ink,
    fontSize: typography.lead,
    fontWeight: '900',
  },
  routeStats: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  notice: {
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  noticeIcon: {
    alignItems: 'center',
    borderRadius: radii.md,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  noticeCopy: {
    flex: 1,
    gap: 3,
  },
  noticeTitle: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '800',
  },
  noticeBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  action: {
    alignItems: 'center',
    borderBottomColor: colors.line,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  actionPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  actionText: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body,
    fontWeight: '800',
  },
  actionValue: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  destructiveText: {
    color: colors.red,
  },
});
