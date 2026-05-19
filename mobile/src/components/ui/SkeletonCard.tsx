import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { C, R } from '../../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = R.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonRideCard() {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton width={44} height={44} borderRadius={12} />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton height={14} width="50%" />
          <Skeleton height={12} width="30%" />
        </View>
        <Skeleton width={50} height={28} borderRadius={8} />
      </View>
      <View style={styles.routeRow}>
        <Skeleton height={14} width="35%" />
        <Skeleton height={1} style={{ flex: 1 }} />
        <Skeleton height={14} width="35%" />
      </View>
      <View style={styles.chips}>
        <Skeleton width={70} height={26} borderRadius={8} />
        <Skeleton width={70} height={26} borderRadius={8} />
        <Skeleton width={80} height={26} borderRadius={8} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: C.card2,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 14,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
  },
});
