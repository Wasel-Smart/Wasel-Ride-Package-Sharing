import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, shadows, spacing, typography } from '../../theme';

export interface DriverInfo {
  name: string;
  photoUrl?: string;
  rating: number;
  isVerified?: boolean;
  completedTrips?: number;
  trustScore?: number;
}

export interface VehicleInfo {
  brand: string;
  model: string;
  color: string;
  plate: string;
}

export interface TripInfo {
  from: string;
  to: string;
  distance: string;
  departureTime: string;
  availableSeats: number;
  packageCapacityKg?: number;
}

export interface RideCardProps {
  driver: DriverInfo;
  vehicle: VehicleInfo;
  trip: TripInfo;
  onReserve?: () => void;
  onPress?: () => void;
  testID?: string;
}

export const RideCard = React.memo(function RideCard({
  driver,
  vehicle,
  trip,
  onReserve,
  onPress,
  testID,
}: RideCardProps) {
  return (
    <Pressable
      style={styles.card}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`رحلة من ${trip.from} إلى ${trip.to}`}
    >
      <View style={styles.cardContent}>
        <View style={styles.driverRow}>
          {driver.photoUrl ? (
            <Image source={{ uri: driver.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={24} color={colors.textSecondary} />
            </View>
          )}
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={14} color={colors.amber} />
              <Text style={styles.rating}>{driver.rating.toFixed(1)}</Text>
              {driver.completedTrips ? (
                <Text style={styles.tripCount}>({driver.completedTrips} رحلة)</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>{trip.availableSeats} مقعد</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.routeRow}>
          <View style={styles.routePoint}>
            <View style={styles.routeDot} />
            <Text style={styles.routeLocation} numberOfLines={1}>
              {trip.from}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.routeDot, styles.routeDotDestination]} />
            <Text style={styles.routeLocation} numberOfLines={1}>
              {trip.to}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.tripMeta}>
            <Text style={styles.tripDetail}>{trip.distance}</Text>
            <Text style={styles.tripDetail}>🕐 {trip.departureTime}</Text>
            {trip.packageCapacityKg ? (
              <Text style={styles.tripDetail}>📦 {trip.packageCapacityKg} كغ</Text>
            ) : null}
          </View>
          {onReserve ? (
            <Pressable
              style={styles.reserveButton}
              onPress={onReserve}
              accessibilityLabel="احجز الآن"
              accessibilityRole="button"
            >
              <Text style={styles.reserveText}>احجز</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
  },
  avatarPlaceholder: {
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverInfo: {
    flex: 1,
    gap: 2,
  },
  driverName: {
    ...typography.body,
    fontWeight: '800' as const,
    color: colors.ink,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rating: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  tripCount: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: 6,
  },
  priceBadge: {
    backgroundColor: `${colors.primary}20`,
    borderRadius: radii.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceText: {
    ...typography.caption,
    fontWeight: '800' as const,
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
    marginVertical: spacing.xs,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  routePoint: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textMuted,
  },
  routeDotDestination: {
    backgroundColor: colors.primary,
  },
  routeLine: {
    flex: 1,
    height: 2,
    borderLeftWidth: 2,
    borderLeftColor: colors.line,
    marginLeft: 3,
  },
  routeLocation: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  tripMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  tripDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  reserveButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reserveText: {
    ...typography.caption,
    fontWeight: '800' as const,
    color: colors.bg,
  },
});
