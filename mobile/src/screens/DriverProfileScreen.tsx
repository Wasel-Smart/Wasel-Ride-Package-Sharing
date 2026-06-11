import React from 'react';
import { View, Text, Image, ScrollView, StyleSheet } from 'react-native';

export default function DriverProfileScreen({ route }: any) {
  const { driver } = route.params || {};

  const defaultDriver = {
    name: driver?.name || 'Ahmad Al-Hassan',
    rating: driver?.rating || 4.8,
    totalTrips: driver?.totalTrips || 1234,
    yearsActive: driver?.yearsActive || 3,
    vehicle: driver?.vehicle || { make: 'Toyota', model: 'Camry', year: 2020, color: 'White', plate: 'ABC-123' },
    bio: driver?.bio || 'Professional driver with excellent safety record.',
    languages: driver?.languages || ['Arabic', 'English'],
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: driver?.photo || 'https://via.placeholder.com/120' }}
          style={styles.avatar}
        />
        <Text style={styles.name}>{defaultDriver.name}</Text>
        <View style={styles.ratingContainer}>
          <Text style={styles.rating}>⭐ {defaultDriver.rating.toFixed(1)}</Text>
          <Text style={styles.trips}>{defaultDriver.totalTrips} trips</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{defaultDriver.bio}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vehicle Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Make & Model:</Text>
          <Text style={styles.value}>{defaultDriver.vehicle.make} {defaultDriver.vehicle.model}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Year:</Text>
          <Text style={styles.value}>{defaultDriver.vehicle.year}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Color:</Text>
          <Text style={styles.value}>{defaultDriver.vehicle.color}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Plate Number:</Text>
          <Text style={styles.value}>{defaultDriver.vehicle.plate}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experience</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Years Active:</Text>
          <Text style={styles.value}>{defaultDriver.yearsActive} years</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Languages:</Text>
          <Text style={styles.value}>{defaultDriver.languages.join(', ')}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#fff', alignItems: 'center', paddingVertical: 32 },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 16 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  rating: { fontSize: 18, fontWeight: '600', color: '#f39c12', marginRight: 12 },
  trips: { fontSize: 14, color: '#666' },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  bio: { fontSize: 15, color: '#666', lineHeight: 22 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  label: { fontSize: 15, color: '#666' },
  value: { fontSize: 15, color: '#333', fontWeight: '500' },
});
