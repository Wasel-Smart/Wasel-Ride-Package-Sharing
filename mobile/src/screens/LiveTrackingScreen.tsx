import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StatusPill,
} from '../components/MobilePrimitives';
import { colors, radii, shadows, spacing, typography } from '../theme';
import type { Ride } from '../services/ride';

const { width } = Dimensions.get('window');

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

interface LiveRideData {
  id: string;
  driverId: string;
  driverName: string;
  driverRating: number;
  vehicleModel: string;
  licensePlate: string;
  status: 'matching' | 'driver_en_route' | 'driver_arrived' | 'in_progress';
  eta: string;
  distance: string;
  fare: string;
  driverLocation?: DriverLocation;
}

const fetchLiveRide = async (rideId: string): Promise<LiveRideData | null> => {
  const response = await apiClient.get<LiveRideData>(`rides/${rideId}/live`);
  if (response.error) throw new Error(response.error);
  return response.data;
};

const LiveTrackingScreen = React.memo(function LiveTrackingScreen({ route }) {
  const { rideId } = route.params as { rideId: string };
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { data: ride, isLoading, error, refetch } = useQuery({
    queryKey: ['live-ride', rideId],
    queryFn: () => fetchLiveRide(rideId),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
    staleTime: 1000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted || permission.status !== 'granted') {
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (mounted) {
          setUserLocation(position);
        }
      } catch (e) {
        console.error('Location error:', e);
      }
    }

    void loadLocation();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const centerOnDriver = useCallback((mapRef: MapView | null) => {
    if (mapRef && ride?.driverLocation) {
      mapRef.animateToRegion(
        {
          latitude: ride.driverLocation.latitude,
          longitude: ride.driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [ride?.driverLocation]);

  const callDriver = useCallback(() => {
    if (ride?.driverId) {
      Alert.alert('Call Driver', `Calling ${ride.driverName}...`);
    }
  }, [ride]);

  const shareLocation = useCallback(() => {
    Alert.alert('Share Trip', 'Share your live location with emergency contacts');
  }, []);

  if (isLoading || !ride) {
    return (
      <ScreenShell>
        <View style={styles.loadingContainer}>
          <Ionicons name="car" size={48} color={colors.teal} style={{ marginBottom: 16 }} />
          <Text style={styles.loadingText}>Finding your driver...</Text>
        </View>
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={colors.red} />
          <Text style={styles.errorText}>Could not load ride details</Text>
          <PrimaryButton label="Retry" icon="refresh" tone={colors.teal} onPress={() => refetch()} />
        </View>
      </ScreenShell>
    );
  }

  const statusConfig = {
    matching: { label: 'Finding driver', color: colors.amber, icon: 'search' as const },
    driver_en_route: { label: 'Driver on the way', color: colors.blue, icon: 'car' as const },
    driver_arrived: { label: 'Driver arrived', color: colors.green, icon: 'checkmark-circle' as const },
    in_progress: { label: 'Ride in progress', color: colors.teal, icon: 'navigate' as const },
  }[ride.status];

  return (
    <ScreenShell>
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFillObject}
            provider="google"
          initialRegion={ride.driverLocation ? {
            latitude: ride.driverLocation.latitude,
            longitude: ride.driverLocation.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          } : undefined}
          showsUserLocation
          showsMyLocationButton={false}
          pitchEnabled
          rotateEnabled
          onTouchEnd={() => {}}
        >
          {ride.driverLocation && (
            <Marker
              coordinate={{
                latitude: ride.driverLocation.latitude,
                longitude: ride.driverLocation.longitude,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={ride.driverLocation.heading}
            >
              <Animated.View
                style={[
                  styles.driverMarkerPulse,
                  { transform: [{ scale: pulseAnim }] },
                ]}
              />
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={24} color="#FFFFFF" />
              </View>
            </Marker>
          )}
        </MapView>

        <View style={styles.overlay}>
          <StatusPill
            label={statusConfig.label}
            tone={statusConfig.color}
            icon={statusConfig.icon}
          />

          <View style={styles.driverCard}>
            <View style={styles.driverHeader}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {ride.driverName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{ride.driverName}</Text>
                <Text style={styles.driverVehicle}>{ride.vehicleModel}</Text>
                <Text style={styles.driverPlate}>{ride.licensePlate}</Text>
              </View>
              <View style={styles.driverRating}>
                <Ionicons name="star" size={16} color={colors.gold} />
                <Text style={styles.ratingText}>{ride.driverRating.toFixed(1)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.metrics}>
            <MetricTile label="ETA" value={ride.eta} tone={colors.blue} />
            <MetricTile label="Distance" value={ride.distance} tone={colors.teal} />
            <MetricTile label="Fare" value={ride.fare} tone={colors.gold} />
          </View>

          <PrimaryButton
            label={`Call ${ride.driverName.split(' ')[0]}`}
            icon="call"
            tone={colors.green}
            onPress={callDriver}
          />
        </View>

        <InfoCard
          icon="shield-checkmark"
          title="Trip is being recorded"
          body="Your route, driver details, and timestamps are securely logged for safety."
          tone={colors.green}
        />
      </View>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    fontSize: 18,
    color: colors.ink,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: colors.red,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  driverCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.lift,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: colors.ink,
    fontSize: typography.lead,
    fontWeight: '900',
  },
  driverVehicle: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  driverPlate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${colors.gold}22`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  ratingText: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '900',
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  driverMarkerPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: `${colors.blue}40`,
  },
  driverMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.lift,
  },
});

export default LiveTrackingScreen;