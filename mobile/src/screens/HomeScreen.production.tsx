import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { locationService } from '../services/location';
import { authService } from '../services/auth';

interface Location {
  latitude: number;
  longitude: number;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      // Get current user
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      // Get current location
      const location = await locationService.getCurrentPosition();
      setCurrentLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      // Start location tracking
      locationService.startTracking((newLocation) => {
        setCurrentLocation({
          latitude: newLocation.latitude,
          longitude: newLocation.longitude,
        });
      });
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRideRequest = () => {
    if (!destination.trim()) {
      alert('Please enter a destination');
      return;
    }

    navigation.navigate('RideRequest', {
      origin: currentLocation,
      destination: destination,
    });
  };

  const handlePackageDelivery = () => {
    navigation.navigate('PackageDelivery');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22C55E" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={
          currentLocation
            ? {
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                latitudeDelta: 0.0922,
                longitudeDelta: 0.0421,
              }
            : undefined
        }
        showsUserLocation
        showsMyLocationButton
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            pinColor="#22C55E"
          />
        )}
      </MapView>

      {/* Search Overlay */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <TextInput
            style={styles.searchInput}
            placeholder="Where to?"
            placeholderTextColor="#9CA3AF"
            value={destination}
            onChangeText={setDestination}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRideRequest}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🚗</Text>
            <Text style={styles.actionText}>Request Ride</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handlePackageDelivery}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>📦</Text>
            <Text style={styles.actionText}>Send Package</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Bus')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionIcon}>🚌</Text>
            <Text style={styles.actionText}>Bus Routes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* User Info Bar */}
      {user && (
        <View style={styles.userBar}>
          <Text style={styles.welcomeText}>
            Welcome, {user.name || 'User'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Wallet')}>
            <Text style={styles.balanceText}>Balance: JOD 0.00</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
  },
  searchBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  searchInput: {
    fontSize: 16,
    color: '#1F2937',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
  userBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  welcomeText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
  },
  balanceText: {
    fontSize: 14,
    color: '#22C55E',
    fontWeight: '600',
  },
});
