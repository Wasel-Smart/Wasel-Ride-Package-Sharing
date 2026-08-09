import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScreenShell } from '../components/MobilePrimitives';
import type { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { colors, spacing, typography } from '../theme';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const SETTINGS_KEY = 'wasel.mobile.settings.v1';
type Preferences = { notificationsEnabled: boolean; locationSharing: boolean };
const initialPreferences: Preferences = { notificationsEnabled: true, locationSharing: true };

export default function SettingsScreen() {
  const navigation = useNavigation<NavProp>();
  const { signOut } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(SETTINGS_KEY)
      .then(value => {
        if (!active || !value) return;
        const saved = JSON.parse(value) as Partial<Preferences>;
        setPreferences({ ...initialPreferences, ...saved });
      })
      .catch(() => { /* Safe defaults are retained when local storage is unavailable. */ })
      .finally(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, []);

  const updatePreference = (key: keyof Preferences, value: boolean) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    void AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {
      Alert.alert('تعذر حفظ الإعداد', 'تم تطبيق التغيير لهذه الجلسة فقط. حاول مرة أخرى لاحقاً.');
    });
  };

  const handleSignOut = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد أنك تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <ScreenShell testID="settings-screen">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>الإعدادات</Text>
        <Section title="الحساب">
          <SettingsLink label="تعديل الملف الشخصي" testID="settings-profile" onPress={() => navigation.navigate('ProfileEdit')} />
          <SettingsLink label="وسائل الدفع" testID="settings-payment-methods" onPress={() => navigation.navigate('PaymentMethods')} />
          <SettingsLink label="إعدادات الأمان" testID="settings-security" onPress={() => navigation.navigate('SecuritySettings')} />
        </Section>
        <Section title="التفضيلات">
          <SettingSwitch label="الإشعارات الفورية" value={preferences.notificationsEnabled} disabled={!isReady} onChange={value => updatePreference('notificationsEnabled', value)} testID="settings-notifications" />
          <SettingSwitch label="مشاركة الموقع أثناء الرحلة" value={preferences.locationSharing} disabled={!isReady} onChange={value => updatePreference('locationSharing', value)} testID="settings-location-sharing" />
        </Section>
        <Section title="الدعم والسلامة">
          <SettingsLink label="مركز الأمان" testID="settings-safety" onPress={() => navigation.navigate('Safety')} />
        </Section>
        <TouchableOpacity accessibilityLabel="تسجيل الخروج" accessibilityRole="button" onPress={handleSignOut} style={[styles.row, styles.signOut]} testID="settings-sign-out">
          <Text style={styles.signOutText}>تسجيل الخروج</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><View style={styles.sectionSurface}>{children}</View></View>;
}

function SettingsLink({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return <TouchableOpacity accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={styles.row} testID={testID}><Text style={styles.rowText}>{label}</Text><Text accessibilityElementsHidden style={styles.chevron}>‹</Text></TouchableOpacity>;
}

function SettingSwitch({ label, value, disabled, onChange, testID }: { label: string; value: boolean; disabled: boolean; onChange: (value: boolean) => void; testID: string }) {
  return <View style={styles.row}><Text style={styles.rowText}>{label}</Text><Switch accessibilityLabel={label} accessibilityRole="switch" accessibilityState={{ checked: value, disabled }} disabled={disabled} onValueChange={onChange} testID={testID} value={value} /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  pageTitle: { color: colors.ink, ...typography.title, fontWeight: '900' },
  section: { gap: spacing.sm },
  sectionTitle: { color: colors.muted, ...typography.caption, fontWeight: '800', paddingHorizontal: spacing.xs },
  sectionSurface: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md },
  rowText: { color: colors.ink, ...typography.body, fontWeight: '700' },
  chevron: { color: colors.teal, fontSize: 30, lineHeight: 30 },
  signOut: { backgroundColor: `${colors.red}10`, borderColor: `${colors.red}40`, borderRadius: 16, borderWidth: 1 },
  signOutText: { color: colors.red, ...typography.body, fontWeight: '900' },
});

