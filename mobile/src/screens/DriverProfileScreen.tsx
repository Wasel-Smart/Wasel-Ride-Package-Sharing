import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '../theme';
import { apiClient } from '../lib/api';
import { useAuth } from '../providers/AuthProvider';

interface Driver {
  id: string;
  name: string;
  photo: string | null;
  rating: number;
  totalTrips: number;
  yearsActive: number;
  vehicle: {
    make: string;
    model: string;
    year: number;
    color: string;
    plate: string;
  };
  bio: string;
  languages: string[];
}

function DriverProfileSkeleton() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarPlaceholder} />
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLineShort} />
      </View>
      <View style={styles.section}>
        <View style={styles.skeletonLine} />
        <View style={styles.skeletonLine} />
      </View>
    </ScrollView>
  );
}

export default function DriverProfileScreen({ route }: { route: { params: { driverId: string } } }) {
  const { driverId } = route.params || {};
  const { loading: authLoading } = useAuth();

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: async () => {
      if (!driverId) throw new Error('Missing driver ID');
      const response = await apiClient.get<Driver>(`drivers/${driverId}`);
      if (!response.data || response.error) throw new Error(response.error || 'Driver not found');
      return response.data;
    },
    enabled: Boolean(driverId),
    staleTime: 5 * 60 * 1000,
  });

  if (authLoading || isLoading) return <DriverProfileSkeleton />;

  if (error || !driver) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.name}>Driver not found</Text>
          <Text style={styles.errorText}>Unable to load driver profile. Please try again.</Text>
        </View>
      </ScrollView>
    );
  }

  const photoUri = driver.photo || undefined;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {driver.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.name}>{driver.name}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {driver.rating.toFixed(1)}</Text>
          <Text style={styles.trips}>{driver.totalTrips.toLocaleString()} trips</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{driver.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Make & Model:</Text>
          <Text style={styles.value}>
            {driver.vehicle.make} {driver.vehicle.model}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Year:</Text>
          <Text style={styles.value}>{driver.vehicle.year}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Color:</Text>
          <Text style={styles.value}>{driver.vehicle.color}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Plate:</Text>
          <Text style={styles.value}>{driver.vehicle.plate}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Driver Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Years Active:</Text>
          <Text style={styles.value}>{driver.yearsActive}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Languages:</Text>
          <Text style={styles.value}>{driver.languages.join(', ')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { backgroundColor: colors.surface, alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.muted,
  },
  name: { fontSize: 24, fontWeight: '900', color: colors.ink, marginBottom: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rating: { fontSize: 18, fontWeight: '800', color: colors.gold },
  trips: { fontSize: 14, color: colors.muted, fontWeight: '700' },
  section: { backgroundColor: colors.surface, marginTop: 12, padding: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginBottom: 12 },
  bio: { fontSize: 15, color: colors.text, lineHeight: 22 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  label: { fontSize: 15, color: colors.muted, fontWeight: '700' },
  value: { fontSize: 15, color: colors.ink, fontWeight: '800' },
  errorText: { fontSize: 15, color: colors.red, textAlign: 'center', marginTop: 8 },
  skeletonLine: {
    height: 16,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 8,
    marginBottom: 12,
    width: '80%',
    alignSelf: 'center',
  },
  skeletonLineShort: {
    height: 14,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 7,
    marginBottom: 12,
    width: '40%',
    alignSelf: 'center',
  },
});
