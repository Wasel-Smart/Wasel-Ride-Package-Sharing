import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

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

interface ReceiptData {
  rideId?: string;
  date?: string;
  origin?: string;
  destination?: string;
  baseFare?: string | number;
  distanceFare?: string | number;
  timeFare?: string | number;
  total?: string | number;
  paymentMethod?: string;
}

interface ReceiptScreenProps {
  route: { params: Partial<RootStackParamList[keyof RootStackParamList]> };
}

export default function ReceiptScreen({ route }: ReceiptScreenProps) {
  const receiptData = (route.params as { receiptData?: ReceiptData } | undefined)?.receiptData;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>الإيصال</Text>
        
        <View style={styles.section}>
          <Text style={styles.label}>رقم المشوار</Text>
          <Text style={styles.value}>{receiptData?.rideId || 'N/A'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>التاريخ</Text>
          <Text style={styles.value}>{receiptData?.date || new Date().toLocaleDateString()}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>من</Text>
          <Text style={styles.value}>{receiptData?.origin || 'موقع الانطلاق'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>إلى</Text>
          <Text style={styles.value}>{receiptData?.destination || 'موقع الوصول'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.label}>الأجرة الأساسية</Text>
          <Text style={styles.value}>JOD {receiptData?.baseFare || '0.00'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>المسافة</Text>
          <Text style={styles.value}>JOD {receiptData?.distanceFare || '0.00'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>الوقت</Text>
          <Text style={styles.value}>JOD {receiptData?.timeFare || '0.00'}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.section}>
          <Text style={styles.totalLabel}>المجموع</Text>
          <Text style={styles.totalValue}>JOD {receiptData?.total || '0.00'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>وسيلة الدفع</Text>
          <Text style={styles.value}>{receiptData?.paymentMethod || 'المحفظة'}</Text>
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
