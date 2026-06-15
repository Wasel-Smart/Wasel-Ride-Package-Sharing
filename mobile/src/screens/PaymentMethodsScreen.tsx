import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';

export default function PaymentMethodsScreen({ navigation }: any) {
  const [paymentMethods] = useState([
    { id: '1', type: 'wallet', name: 'Wasel Wallet', balance: 45.50, primary: true },
    { id: '2', type: 'card', name: 'Visa •••• 4242', primary: false },
    { id: '3', type: 'card', name: 'Mastercard •••• 8888', primary: false },
  ]);

  const handleAddPayment = () => {
    Alert.alert('Add Payment Method', 'Connect to Stripe or other payment provider');
  };

  const handleSetPrimary = (id: string) => {
    Alert.alert('Success', 'Primary payment method updated');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payment Methods</Text>
        <Text style={styles.subtitle}>Manage your payment options</Text>
      </View>

      {paymentMethods.map((method) => (
        <View key={method.id} style={styles.methodCard}>
          <View style={styles.methodInfo}>
            <View style={styles.methodIcon}>
              <Text style={styles.methodIconText}>{method.type === 'wallet' ? '💳' : '🏦'}</Text>
            </View>
            <View style={styles.methodDetails}>
              <Text style={styles.methodName}>{method.name}</Text>
              {method.type === 'wallet' && (
                <Text style={styles.balance}>Balance: JOD {(method.balance ?? 0).toFixed(2)}</Text>
              )}
              {method.primary && <Text style={styles.primaryBadge}>Primary</Text>}
            </View>
          </View>
          
          {!method.primary && (
            <TouchableOpacity onPress={() => handleSetPrimary(method.id)}>
              <Text style={styles.setPrimaryText}>Set as Primary</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity style={styles.addButton} onPress={handleAddPayment}>
        <Text style={styles.addButtonText}>+ Add Payment Method</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, backgroundColor: '#fff', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  methodCard: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginBottom: 12, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  methodInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  methodIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  methodIconText: { fontSize: 24 },
  methodDetails: { flex: 1 },
  methodName: { fontSize: 16, fontWeight: '600', color: '#333' },
  balance: { fontSize: 14, color: '#2ecc71', marginTop: 4 },
  primaryBadge: { fontSize: 12, color: '#3498db', fontWeight: '600', marginTop: 4 },
  setPrimaryText: { fontSize: 14, color: '#3498db', fontWeight: '600' },
  addButton: { backgroundColor: '#3498db', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
