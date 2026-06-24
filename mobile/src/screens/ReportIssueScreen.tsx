import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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
};

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface ReportIssueProps {
  route: { params?: Partial<RootStackParamList[keyof RootStackParamList]> };
  navigation: NavProp;
}

export default function ReportIssueScreen({ route, navigation }: ReportIssueProps) {
  const { rideId } = route.params || {};
  const [selectedIssue, setSelectedIssue] = useState('');
  const [description, setDescription] = useState('');

  const issues = [
    'Driver was late',
    'Incorrect fare charged',
    'Driver was unprofessional',
    'Vehicle condition poor',
    'Safety concern',
    'Other',
  ];

  const handleSubmit = () => {
    if (!selectedIssue) {
      Alert.alert('Error', 'Please select an issue type');
      return;
    }
    Alert.alert('Success', 'Your report has been submitted. We will review it shortly.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Report an Issue</Text>
        <Text style={styles.subtitle}>Help us improve your experience</Text>

        {rideId && (
          <View style={styles.rideInfo}>
            <Text style={styles.rideLabel}>Ride ID:</Text>
            <Text style={styles.rideValue}>{rideId}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>What went wrong?</Text>
        {issues.map((issue) => (
          <TouchableOpacity
            key={issue}
            style={[styles.issueItem, selectedIssue === issue && styles.issueItemSelected]}
            onPress={() => setSelectedIssue(issue)}
          >
            <Text style={[styles.issueText, selectedIssue === issue && styles.issueTextSelected]}>
              {issue}
            </Text>
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Additional Details</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe the issue in detail..."
          multiline
          numberOfLines={6}
          value={description}
          onChangeText={setDescription}
        />

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>Submit Report</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  rideInfo: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 20 },
  rideLabel: { fontSize: 14, color: '#666', marginRight: 8 },
  rideValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 16, marginBottom: 12 },
  issueItem: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: '#fff' },
  issueItemSelected: { borderColor: '#3498db', backgroundColor: '#e3f2fd' },
  issueText: { fontSize: 15, color: '#333' },
  issueTextSelected: { color: '#3498db', fontWeight: '600' },
  textArea: { backgroundColor: '#fff', padding: 12, borderRadius: 8, fontSize: 15, textAlignVertical: 'top', minHeight: 120 },
  submitButton: { backgroundColor: '#3498db', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
