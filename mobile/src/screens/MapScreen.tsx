import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

import {
  InfoCard,
  MetricTile,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
} from '../components/MobilePrimitives';
import { waselMobileConfig } from '../lib/config';
import { colors, radii, shadows, spacing } from '../theme';

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

const MapScreen = React.memo(function MapScreen() {
  const [region, setRegion] = useState<Region>(AMMAN_REGION);
  const [permissionState, setPermissionState] = useState<'checking' | 'granted' | 'denied' | 'error'>('checking');

  useEffect(() => {
    let mounted = true;

    async function loadLocation() {
      try {
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
      } catch {
        if (mounted) {
          setPermissionState('error');
        }
      }
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
            body="Dispatch, pickup context, and route health are framed for fast scanning."
          />
        </View>

        <View style={styles.metrics}>
          <MetricTile label="Center" value="Amman" tone={colors.teal} />
          <MetricTile label="Mode" value={permissionState === 'granted' ? 'Live' : 'Fallback'} tone={colors.blue} />
        </View>

        {permissionState === 'checking' ? (
          <StateNotice
            icon="location"
            title="Checking location"
            body="Preparing the route map around the current device context."
            loading
            tone={colors.blue}
          />
        ) : null}

        <View style={styles.mapFrame}>
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
        </View>

        {permissionState === 'denied' ? (
          <InfoCard
            icon="location"
            title="Location permission"
            body="Enable location access to center the dispatch map on the phone."
            tone={colors.amber}
          />
        ) : null}

        {permissionState === 'error' ? (
          <InfoCard
            icon="warning"
            title="Location unavailable"
            body="The app is using the Amman fallback region until device location responds."
            tone={colors.red}
          />
        ) : null}
      </View>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.md,
  },
  header: {
    gap: spacing.md,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mapFrame: {
    ...shadows.lift,
    backgroundColor: colors.surface,
    borderColor: '#FFFFFF',
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: 420,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});

export default MapScreen;
