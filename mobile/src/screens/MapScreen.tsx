import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import { InfoCard, ScreenShell, SectionHeader, StatusPill } from '../components/MobilePrimitives';
import { waselMobileConfig } from '../lib/config';
import { colors, spacing } from '../theme';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const AMMAN_REGION: Region = {
  latitude: 31.9539,
  longitude: 35.9106,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const MapScreen = () => {
  const [region, setRegion] = useState<Region>(AMMAN_REGION);
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!mounted) return;

      if (permission.status !== 'granted') {
        setPermissionState('denied');
        return;
      }

      setPermissionState('granted');
      const position = await Location.getCurrentPositionAsync({});
      if (!mounted) return;
      setRegion({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      });
    }

    void loadLocation();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <ScreenShell testID="map-screen">
      <View style={styles.container}>
        <View style={styles.header}>
          <StatusPill
            label={waselMobileConfig.hasMaps ? 'Maps ready' : 'Maps key missing'}
            tone={waselMobileConfig.hasMaps ? colors.green : colors.amber}
            icon="map"
          />
          <SectionHeader
            eyebrow="Routes"
            title="Live corridor map"
            body="Native map view for dispatch, pickup, and route context."
          />
        </View>

        <MapView
          provider="google"
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          showsUserLocation={permissionState === 'granted'}
          showsMyLocationButton
        >
          <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title="Wasel" />
        </MapView>

        {permissionState === 'denied' ? (
          <InfoCard
            icon="location"
            title="Location permission"
            body="Enable location access to center the dispatch map on the phone."
            tone={colors.amber}
          />
        ) : null}
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  header: {
    gap: spacing.md,
  },
  map: {
    borderRadius: 14,
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
  },
});

export default MapScreen;
