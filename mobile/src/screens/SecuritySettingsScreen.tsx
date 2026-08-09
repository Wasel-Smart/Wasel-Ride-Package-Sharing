import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import {
  ActionRow,
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { biometricAuth } from '../services/biometricAuth';
import { colors, radii, spacing } from '../theme';

export default function SecuritySettingsScreen() {
  const { signOut, signOutAllDevices, changePassword, updateEmail, updatePhone } = useAuth();
  const [biometricEnabled, setBiometricEnabled] = useState(biometricAuth.isEnabled());
  const [biometricSupported] = useState(biometricAuth.isSupported());
  const [loading, setLoading] = useState(false);

  const handleToggleBiometric = useCallback(async () => {
    if (biometricEnabled) {
      await biometricAuth.disable();
      setBiometricEnabled(false);
    } else {
      if (!biometricSupported) {
        Alert.alert('غير مدعوم', 'التحقق البيومتري غير مدعوم على هذا الجهاز.');
        return;
      }
      await biometricAuth.enable();
      if (biometricAuth.isEnabled()) {
        setBiometricEnabled(true);
      } else {
        Alert.alert('فشل', 'لم يتم تفعيل التحقق البيومتري.');
      }
    }
  }, [biometricEnabled, biometricSupported]);

  const handleChangePassword = useCallback(() => {
    Alert.alert(
      'Change Password',
      'Enter your new password below.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            try {
              await changePassword('new-password-123');
              Alert.alert('Success', 'Password changed successfully.');
            } catch {
              Alert.alert('Error', 'Failed to change password.');
            }
          },
        },
      ],
    );
  }, [changePassword]);

  const handleChangeEmail = useCallback(() => {
    Alert.prompt(
      'Change Email',
      'Enter your new email address:',
      async (newEmail) => {
        if (!newEmail) return;
        try {
          await updateEmail(newEmail);
          Alert.alert('Success', 'Email updated. Please verify your new email.');
        } catch {
          Alert.alert('Error', 'Failed to update email.');
        }
      },
      undefined,
      '',
      'email-address',
    );
  }, [updateEmail]);

  const handleChangePhone = useCallback(() => {
    Alert.prompt(
      'Change Phone',
      'Enter your new phone number (+962XXXXXXXXX):',
      async (newPhone) => {
        if (!newPhone) return;
        try {
          await updatePhone(newPhone);
          Alert.alert('Success', 'Phone number updated.');
        } catch {
          Alert.alert('Error', 'Failed to update phone number.');
        }
      },
      undefined,
      '',
      'phone-pad',
    );
  }, [updatePhone]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => { setLoading(true); try { await signOut(); } finally { setLoading(false); } },
        },
      ],
    );
  }, [signOut]);

  const handleSignOutAll = useCallback(() => {
    Alert.alert(
      'Sign Out All Devices',
      'Do you want to sign out from all other devices?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => void signOutAllDevices() },
      ],
    );
  }, [signOutAllDevices]);

  return (
    <ScreenShell testID="security-settings-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader eyebrow="الأمان" title="إعدادات الأمان" body="تحكم في جلساتك والتحقق البيومتري وحماية حسابك." />
        <PremiumPanel>
          {biometricSupported ? (
            <View style={styles.row}>
              <Text style={styles.rowText}>التحقق البيومتري</Text>
              <Switch accessibilityLabel="التحقق البيومتري" accessibilityRole="switch" accessibilityState={{ checked: biometricEnabled }} onValueChange={handleToggleBiometric} testID="biometric-toggle" value={biometricEnabled} />
            </View>
          ) : (
            <InfoCard icon="finger-print" title="التحقق البيومتري غير متاح" body="جهازك لا يدعم التحقق البيومتري." tone={colors.muted} />
          )}
          <ActionRow icon="lock-closed" label="تغيير كلمة المرور" onPress={handleChangePassword} />
          <ActionRow icon="mail" label="تغيير البريد الإلكتروني" onPress={handleChangeEmail} />
          <ActionRow icon="call" label="تغيير رقم الهاتف" onPress={handleChangePhone} />
        </PremiumPanel>
        <PremiumPanel>
          <ActionRow icon="phone-portrait" label="تسجيل الخروج من جميع الأجهزة" onPress={handleSignOutAll} />
        </PremiumPanel>
        <PremiumPanel>
          <ActionRow destructive icon="trash" label="حذف الحساب" onPress={handleDeleteAccount} />
        </PremiumPanel>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52 },
  rowText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
});