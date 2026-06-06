/**
 * OfflineBanner Component
 * Displays offline status and sync actions
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useOffline } from '../hooks/useOffline';

export function OfflineBanner() {
  const { isOnline, queueSize, sync, isSyncing } = useOffline();
  const [fadeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: !isOnline || queueSize > 0 ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, isOnline, queueSize]);

  if (isOnline && queueSize === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.banner,
        { opacity: fadeAnim },
        !isOnline ? styles.offline : styles.syncing,
      ]}
      testID={isOnline ? 'online-indicator' : 'offline-indicator'}
    >
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {!isOnline ? 'Offline mode' : 'Queued updates'}
          </Text>
          <Text style={styles.subtitle}>
            {!isOnline
              ? `${queueSize} action${queueSize !== 1 ? 's' : ''} queued`
              : 'Syncing queued actions...'}
          </Text>
        </View>

        {isOnline && queueSize > 0 && (
          <TouchableOpacity
            style={styles.button}
            onPress={sync}
            disabled={isSyncing}
            testID="retry-button"
          >
            <Text style={styles.buttonText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  offline: {
    backgroundColor: '#ff9800',
  },
  syncing: {
    backgroundColor: '#2196f3',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
