// VehicleFormScreen – allows driver to add or edit car information
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { apiClient } from '../lib/api';
import { colors, spacing } from '../theme';
import { useAuth } from '../providers/AuthProvider';

// Types for navigation
type RootStackParamList = {
  VehicleForm: { vehicleId?: string }; // optional existing vehicle id for edit mode
};

type NavProp = NativeStackNavigationProp<RootStackParamList, 'VehicleForm'>;

type RouteProps = RouteProp<RootStackParamList, 'VehicleForm'>;

export default function VehicleFormScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { user } = useAuth();
  const { vehicleId } = route.params || {};

  const isEdit = Boolean(vehicleId);

  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');
  const [plate, setPlate] = useState('');
  const [registrationStatus, setRegistrationStatus] = useState('pending');

  // Load existing vehicle data when editing
  useEffect(() => {
    if (isEdit && vehicleId) {
      // fetch vehicle details – endpoint assumed to be /vehicles/:id
      apiClient
        .get(`vehicles/${vehicleId}`)
        .then(res => {
          const v = res.data;
          setMake(v.make ?? '');
          setModel(v.model ?? '');
          setYear(String(v.year ?? ''));
          setColor(v.color ?? '');
          setPlate(v.plate ?? '');
          setRegistrationStatus(v.registration_status ?? 'pending');
        })
        .catch(() => {
          Alert.alert('خطأ', 'تعذر جلب معلومات المركبة');
        });
    }
  }, [isEdit, vehicleId]);

  const submit = async () => {
    if (!user?.id) {
      Alert.alert('خطأ', 'المستخدم غير مسجّل');
      return;
    }
    const payload = {
      make,
      model,
      year: Number(year),
      color,
      plate,
      registration_status: registrationStatus,
    };
    try {
      if (isEdit) {
        await apiClient.patch(`vehicles/${vehicleId}`, payload);
      } else {
        await apiClient.post('vehicles', { driver_id: user.id, ...payload });
      }
      // Notify parent screen (DriverScreen) to refresh steps
      navigation.navigate('DriverScreen' as any);
    } catch (e) {
      Alert.alert('خطأ', 'فشل حفظ بيانات المركبة');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{isEdit ? 'تعديل المركبة' : 'إضافة مركبة'}</Text>
      <View style={styles.field}>
        <Text style={styles.label}>الشركة</Text>
        <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="مثال: Toyota" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>الموديل</Text>
        <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="مثال: Corolla" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>السنة</Text>
        <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2022" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>اللون</Text>
        <TextInput style={styles.input} value={color} onChangeText={setColor} placeholder="أبيض" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>رقم اللوحة</Text>
        <TextInput style={styles.input} value={plate} onChangeText={setPlate} placeholder="AB‑1234" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>حالة التسجيل</Text>
        <TextInput style={styles.input} value={registrationStatus} onChangeText={setRegistrationStatus} placeholder="pending|approved|rejected" />
      </View>
      <Text style={styles.saveButton} onPress={submit}>حفظ</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg },
  title: { fontSize: 22, fontWeight: '900', marginBottom: spacing.md, color: colors.ink },
  field: { marginBottom: spacing.md },
  label: { fontSize: 15, color: colors.muted, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: spacing.sm, fontSize: 15, color: colors.text },
  saveButton: { backgroundColor: colors.teal, color: colors.white, textAlign: 'center', padding: spacing.md, borderRadius: 6, marginTop: spacing.lg },
});
