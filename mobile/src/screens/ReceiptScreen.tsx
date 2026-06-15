import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

export default function ReceiptScreen({ route }: any) {
  const { receiptData } = route.params || {};

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Receipt</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>Ride ID</Text>
          <Text style={styles.value}>{receiptData?.rideId || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Date</Text>
          <Text style={styles.value}>{receiptData?.date || new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>From</Text>
          <Text style={styles.value}>{receiptData?.origin || 'Origin Location'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>To</Text>
          <Text style={styles.value}>{receiptData?.destination || 'Destination Location'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>Base Fare</Text>
          <Text style={styles.value}>JOD {receiptData?.baseFare || '0.00'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Distance</Text>
          <Text style={styles.value}>JOD {receiptData?.distanceFare || '0.00'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>JOD {receiptData?.timeFare || '0.00'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>JOD {receiptData?.total || '0.00'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Payment Method</Text>
          <Text style={styles.value}>{receiptData?.paymentMethod || 'Wallet'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  section: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 14, color: '#666' },
  value: { fontSize: 14, color: '#333', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 12 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
});
