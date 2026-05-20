import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

const C = {
  card: '#0E1D35',
  shimmer: 'rgba(255, 255, 255, 0.05)',
};

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 8, style }: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function RideCardSkeleton() {
  return (
    <View style={styles.rideCard}>
      <View style={styles.rideAccent} />
      <View style={styles.rideBody}>
        <View style={styles.rideTop}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Skeleton width={60} height={24} />
            <Skeleton width={40} height={10} />
          </View>
        </View>

        <View style={styles.routeRow}>
          <Skeleton width="45%" height={14} />
          <Skeleton width={40} height={1} />
          <Skeleton width="45%" height={14} />
        </View>

        <View style={styles.metaRow}>
          <Skeleton width={80} height={24} borderRadius={8} />
          <Skeleton width={70} height={24} borderRadius={8} />
          <Skeleton width={60} height={24} borderRadius={8} />
        </View>
      </View>
    </View>
  );
}

export function ServiceCardSkeleton() {
  return (
    <View style={styles.serviceCard}>
      <Skeleton width={52} height={52} borderRadius={14} />
      <Skeleton width="70%" height={14} />
    </View>
  );
}

export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <RideCardSkeleton key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: C.card,
  },
  rideCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rideAccent: {
    height: 3,
    backgroundColor: C.shimmer,
  },
  rideBody: {
    padding: 16,
    gap: 14,
  },
  rideTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  serviceCard: {
    width: 160,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 10,
  },
});
