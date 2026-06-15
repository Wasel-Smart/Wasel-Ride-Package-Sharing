import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../providers/AuthProvider';

type RootStackParamList = {
  Tabs: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
  LiveTracking: { rideId: string };
  Chat: { rideId: string; driverName: string };
  RateRide: { rideId: string; driverName: string };
  AdvancedSearch: undefined;
  SignIn: undefined;
  Settings: undefined;
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [locationSharing, setLocationSharing] = React.useState(true);

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Profile' as never)}>
          <Text style={styles.itemText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>Payment Methods</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>Saved Addresses</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>Push Notifications</Text>
          <Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} />
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>Share Location</Text>
          <Switch value={locationSharing} onValueChange={setLocationSharing} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Safety' as never)}>
          <Text style={styles.itemText}>Safety Center</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>Help & Support</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item}>
          <Text style={styles.itemText}>Legal</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={[styles.item, styles.dangerItem]}>
          <Text style={styles.dangerText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  section: { backgroundColor: '#fff', marginTop: 12, paddingVertical: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#666', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemText: { fontSize: 16, color: '#333' },
  dangerItem: { marginTop: 24 },
  dangerText: { fontSize: 16, color: '#e74c3c', fontWeight: '600' },
});
