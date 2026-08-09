import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useOffline } from '../hooks/useOffline';
import { colors, hitSlop, radii, spacing } from '../theme';

export const OfflineBanner = React.memo(function OfflineBanner() {
  const { isOnline, queueSize, sync, isSyncing } = useOffline();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const visible = !isOnline || queueSize > 0;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: visible ? 1 : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, visible]);

  const handleSync = React.useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    void sync();
  }, [sync]);

  if (!visible) {
    return null;
  }

  const tone = isOnline ? colors.blue : colors.amber;

  return (
    <Animated.View
      style={[styles.banner, { opacity: fadeAnim, borderBottomColor: `${tone}33` }]}
      testID={isOnline ? 'online-indicator' : 'offline-indicator'}
    >
      <View style={[styles.icon, { backgroundColor: `${tone}16` }]}>
        <Ionicons name={isOnline ? 'sync' : 'cloud-offline'} size={18} color={tone} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{isOnline ? 'تحديثات بانتظار المزامنة' : 'وضع بدون إنترنت'}</Text>
        <Text style={styles.subtitle}>
          {isOnline
            ? `${queueSize} إجراءات جاهزة للمزامنة`
            : `${queueSize} إجراءات محفوظة محلياً`}
        </Text>
      </View>

      {isOnline && queueSize > 0 ? (
        <Pressable
          accessibilityLabel="زامن الإجراءات المعلقة"
          accessibilityRole="button"
          disabled={isSyncing}
          hitSlop={hitSlop}
          onPress={handleSync}
          style={({ pressed }) => [
            styles.button,
            { borderColor: `${tone}44`, opacity: isSyncing ? 0.65 : 1 },
            pressed ? styles.buttonPressed : null,
          ]}
          testID="retry-button"
        >
          <Text style={[styles.buttonText, { color: tone }]}>{isSyncing ? 'جاري المزامنة' : 'مزامنة'}</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  icon: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    alignItems: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
  },
  buttonPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '900',
  },
});
