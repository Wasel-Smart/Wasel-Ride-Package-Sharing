import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Animated, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import {
  InfoCard,
  MetricTile,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { colors, radii, shadows, spacing, typography } from '../theme';

const { width } = Dimensions.get('window');

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
}

interface TripDetails {
  id: string;
  driverName: string;
  vehicleModel: string;
  licensePlate: string;
  eta: string;
  distance: string;
  fare: string;
  status: 'matching' | 'driver_en_route' | 'driver_arrived' | 'in_progress' | 'completed';
}

const MOCK_DRIVER_START: DriverLocation = {
  latitude: 31.9539,
  longitude: 35.9106,
  heading: 45,
  speed: 30,
};

const MOCK_TRIP: TripDetails = {
  id: 'trip-12345',
  driverName: 'Ahmad Khalil',
  vehicleModel: 'Toyota Camry 2021',
  licensePlate: 'AMN 1234',
  eta: '12 min',
  distance: '4.2 km',
  fare: '5.50 JOD',
  status: 'driver_en_route',
};

const STATUS_CONFIG = {
  matching: { label: 'Finding driver', color: colors.amber, icon: 'search' as const },
  driver_en_route: { label: 'Driver on the way', color: colors.blue, icon: 'car' as const },
  driver_arrived: { label: 'Driver arrived', color: colors.green, icon: 'checkmark-circle' as const },
  in_progress: { label: 'Ride in progress', color: colors.teal, icon: 'navigate' as const },
  completed: { label: 'Ride completed', color: colors.green, icon: 'checkmark-done' as const },
};

const LiveTrackingScreen = React.memo(function LiveTrackingScreen() {
  const [driverLocation, setDriverLocation] = useState<DriverLocation>(MOCK_DRIVER_START);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [trip] = useState<TripDetails>(MOCK_TRIP);
  const [showDetails, setShowDetails] = useState(true);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<MapView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Simulate driver movement
  useEffect(() => {
    const interval = setInterval(() => {
      setDriverLocation(prev => ({
        ...prev,
        latitude: prev.latitude + (Math.random() - 0.5) * 0.001,
        longitude: prev.longitude + (Math.random() - 0.5) * 0.001,
        heading: (prev.heading || 0) + (Math.random() - 0.5) * 10,
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Get user location
  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!mounted || permission.status !== 'granted') {
          setLoading(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        if (mounted) {
          setUserLocation(position);
          setLoading(false);
        }
      } catch {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadLocation();
    return () => {
      mounted = false;
    };
  }, []);

  // Pulse animation for driver marker
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

  const centerOnDriver = useCallback(() => {
    if (mapRef.current && driverLocation) {
      mapRef.current.animateToRegion(
        {
          latitude: driverLocation.latitude,
          longitude: driverLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500,
      );
    }
  }, [driverLocation]);

  const callDriver = useCallback(() => {
    Alert.alert('Call Driver', `Calling ${trip.driverName}...`);
  }, [trip.driverName]);

  const shareTrip = useCallback(() => {
    Alert.alert('Share Trip', 'Share your live location with emergency contacts');
  }, []);

  const statusConfig = STATUS_CONFIG[trip.status];

  const region = {
    latitude: driverLocation.latitude,
    longitude: driverLocation.longitude,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };

  return (
    <ScreenShell testID="live-tracking-screen">
      <View style={styles.container}>
        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={region}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass
            pitchEnabled
            rotateEnabled
          >
            {/* Driver Marker */}
            <Marker
              coordinate={driverLocation}
              anchor={{ x: 0.5, y: 0.5 }}
              rotation={driverLocation.heading}
            >
              <Animated.View
                style={[
                  styles.driverMarkerPulse,
                  {
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <View style={styles.driverMarker}>
                <Ionicons name="car" size={24} color="#FFFFFF" />
              </View>
            </Marker>

            {/* Destination Marker */}
            {userLocation && (
              <Marker
                coordinate={{
                  latitude: userLocation.coords.latitude,
                  longitude: userLocation.coords.longitude,
                }}
                pinColor={colors.teal}
              />
            )}

            {/* Route Line */}
            {userLocation && (
              <Polyline
                coordinates={[
                  driverLocation,
                  {
                    latitude: userLocation.coords.latitude,
                    longitude: userLocation.coords.longitude,
                  },
                ]}
                strokeColor={colors.teal}
                strokeWidth={4}
                lineDashPattern={[10, 5]}
              />
            )}
          </MapView>

          {/* Floating Controls */}
          <View style={styles.floatingControls}>
            <StatusPill
              label={statusConfig.label}
              tone={statusConfig.color}
              icon={statusConfig.icon}
            />
            <View style={styles.controlButtons}>
              <PressableControl
                icon="locate"
                onPress={centerOnDriver}
                color={colors.blue}
              />
              <PressableControl
                icon="share-social"
                onPress={shareTrip}
                color={colors.green}
              />
            </View>
          </View>

          {/* Toggle Details Button */}
          <View style={styles.toggleButton}>
            <PressableControl
              icon={showDetails ? 'chevron-down' : 'chevron-up'}
              onPress={() => setShowDetails(!showDetails)}
              color={colors.ink}
            />
          </View>
        </View>

        {/* Trip Details Panel */}
        {showDetails && (
          <ScrollView
            style={styles.detailsPanel}
            contentContainerStyle={styles.detailsContent}
            showsVerticalScrollIndicator={false}
          >
            <PremiumPanel tone="dark" style={styles.driverCard}>
              <View style={styles.driverHeader}>
                <View style={styles.driverAvatar}>
                  <Text style={styles.driverAvatarText}>
                    {trip.driverName.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={styles.driverInfo}>
                  <Text style={styles.driverName}>{trip.driverName}</Text>
                  <Text style={styles.driverVehicle}>{trip.vehicleModel}</Text>
                  <Text style={styles.driverPlate}>{trip.licensePlate}</Text>
                </View>
                <View style={styles.driverRating}>
                  <Ionicons name="star" size={16} color={colors.gold} />
                  <Text style={styles.ratingText}>4.9</Text>
                </View>
              </View>
            </PremiumPanel>

            <View style={styles.metrics}>
              <MetricTile label="ETA" value={trip.eta} tone={colors.blue} />
              <MetricTile label="Distance" value={trip.distance} tone={colors.teal} />
              <MetricTile label="Fare" value={trip.fare} tone={colors.gold} />
            </View>

            <PrimaryButton
              label={`Call ${trip.driverName.split(' ')[0]}`}
              icon="call"
              tone={colors.green}
              onPress={callDriver}
              testID="call-driver-button"
            />

            <PrimaryButton
              label="Send message"
              icon="chatbubble"
              tone={colors.blue}
              testID="message-driver-button"
            />

            <InfoCard
              icon="shield-checkmark"
              title="Trip is being recorded"
              body="Your route, driver details, and timestamps are securely logged for safety."
              tone={colors.green}
            />

            <InfoCard
              icon="share-social"
              title="Share live location"
              body="Emergency contacts can see your real-time location during the ride."
              tone={colors.teal}
            />
          </ScrollView>
        )}
      </View>
    </ScreenShell>
  );
});

function PressableControl({
  icon,
  onPress,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color: string;
}) {
  return (
    <View style={[styles.control, { backgroundColor: color }]}>
      <Ionicons name={icon} size={22} color="#FFFFFF" onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingControls: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  controlButtons: {
    gap: spacing.sm,
  },
  control: {
    ...shadows.lift,
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButton: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.lg,
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
  detailsPanel: {
    maxHeight: '50%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.lift,
  },
  detailsContent: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  driverCard: {
    marginBottom: spacing.sm,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  driverAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  driverInfo: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: typography.lead,
    fontWeight: '900',
  },
  driverVehicle: {
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '700',
  },
  driverPlate: {
    color: '#94A3B8',
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
});

export default LiveTrackingScreen;
