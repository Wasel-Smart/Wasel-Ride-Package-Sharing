import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing } from '../theme';
import { validateEmail, validatePhone } from '../utils/security';

export default function ProfileEditScreen() {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = useCallback(async () => {
    setError(null);
    if (!name.trim()) { setError('الاسم مطلوب.'); return; }
    if (!email.trim()) { setError('البريد الإلكتروني مطلوب.'); return; }
    if (!validateEmail(email)) { setError('بريد إلكتروني غير صحيح.'); return; }
    if (phone.trim() && !validatePhone(phone)) { setError('رقم الهاتف غير صحيح.'); return; }
    setLoading(true);
    try {
      await updateUser({ name, email, phone: phone.trim() || undefined });
      setSuccess(true);
      Alert.alert('تم الحفظ', 'تم تحديث الملف الشخصي بنجاح.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تحديث الملف الشخصي.');
    } finally {
      setLoading(false);
    }
  }, [name, email, phone, updateUser]);

  return (
    <ScreenShell testID="profile-edit-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader eyebrow="الملف الشخصي" title="تعديل البيانات" body="حدّث اسمك وبريدك ورقم هاتفك." />
        <PremiumPanel>
          <View style={styles.form}>
            <TextInput accessibilityLabel="الاسم الكامل" autoCapitalize="words" onChangeText={setName} placeholder="الاسم الكامل" placeholderTextColor={colors.muted} style={styles.input} testID="edit-name" value={name} />
            <TextInput accessibilityLabel="البريد الإلكتروني" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor={colors.muted} style={styles.input} testID="edit-email" value={email} />
            <TextInput accessibilityLabel="رقم الهاتف" autoCapitalize="none" keyboardType="phone-pad" onChangeText={setPhone} placeholder="+962 79 123 4567" placeholderTextColor={colors.muted} style={styles.input} testID="edit-phone" value={phone} />
          </View>
        </PremiumPanel>
        {error ? <StateNotice icon="warning" title="خطأ" body={error} tone={colors.red} testID="edit-error" /> : null}
        {success ? <StateNotice icon="checkmark-circle" title="تم التحديث" body="تم تحديث الملف الشخصي بنجاح." tone={colors.green} /> : null}
        <PrimaryButton label="حفظ التغييرات" icon="checkmark" loading={loading} disabled={success} onPress={handleSave} testID="save-profile-button" />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
  input: { backgroundColor: colors.surfaceAlt, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, color: colors.ink, fontSize: 16, fontWeight: '700', minHeight: 54, paddingHorizontal: spacing.md },
});