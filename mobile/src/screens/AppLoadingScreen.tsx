import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { colors, spacing, typography } from '../theme';

const AppLoadingScreen = React.memo(function AppLoadingScreen() {
  return (
    <View
      accessibilityLabel="جاري تجهيز تطبيق واصل"
      accessibilityLiveRegion="polite"
      style={styles.container}
      testID="app-loading-screen"
    >
      <StatusBar style="light" />
      <View style={styles.mark} accessibilityElementsHidden>
        <Text style={styles.markText}>واصل</Text>
      </View>
      <Text style={styles.title}>واصل | Wasel</Text>
      <Text style={styles.subtitle}>نجهّز رحلتك بأمان</Text>
      <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.bg,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: 'rgba(248, 251, 255, 0.16)',
    borderRadius: 28,
    borderWidth: 1,
    height: 88,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 88,
  },
  markText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.display.fontSize,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
});

export default AppLoadingScreen;
