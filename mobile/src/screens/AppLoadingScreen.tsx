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
        <Text style={styles.markText}>W</Text>
      </View>
      <Text style={styles.title}>واصل</Text>
      <Text style={styles.subtitle}>نجهّز رحلتك بأمان</Text>
      <ActivityIndicator color={colors.cyan} size="large" style={styles.loader} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.navy,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 28,
    height: 88,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 88,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: '900',
  },
  title: {
    color: '#FFFFFF',
    fontSize: typography.display.fontSize,
    fontWeight: '900',
  },
  subtitle: {
    color: '#CBD5E1',
    fontSize: typography.body.fontSize,
    marginTop: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
});

export default AppLoadingScreen;
