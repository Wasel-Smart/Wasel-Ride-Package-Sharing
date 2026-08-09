import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing } from '../theme';
import { validateEmail, validatePhone } from '../utils/security';

export default function SignUpScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!name.trim()) { setError('الاسم الكامل مطلوب.'); return; }
    if (!email.trim()) { setError('البريد الإلكتروني مطلوب.'); return; }
    if (!validateEmail(email)) { setError('يرجى إدخال بريد إلكتروني صحيح.'); return; }
    if (password.length < 8) { setError('كلمة المرور لازم تكون 8 أحرف على الأقل.'); return; }
    if (phone.trim() && !validatePhone(phone)) { setError('رقم الهاتف لازم يكون بصيغة +962XXXXXXXXX.'); return; }
    setLoading(true);
    try {
      await signUp(email, password, name, phone || undefined);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إنشاء الحساب.');
    } finally {
      setLoading(false);
    }
  }, [name, email, password, phone, signUp]);

  return (
    <ScreenShell testID="sign-up-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader eyebrow="إنشاء حساب" title="سجّل في واصل" body="أنشئ حسابك وافتح المشاوير والطرود والشبكات." />
        <PremiumPanel>
          <View style={styles.form}>
            <TextInput accessibilityLabel="الاسم الكامل" autoCapitalize="words" onChangeText={setName} placeholder="الاسم الكامل" placeholderTextColor={colors.muted} style={styles.input} testID="sign-up-name" value={name} />
            <TextInput accessibilityLabel="البريد الإلكتروني" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor={colors.muted} style={styles.input} testID="sign-up-email" value={email} />
            <TextInput accessibilityLabel="كلمة المرور" autoCapitalize="none" autoComplete="password" onChangeText={setPassword} placeholder="كلمة المرور (8 أحرف على الأقل)" placeholderTextColor={colors.muted} secureTextEntry style={styles.input} testID="sign-up-password" value={password} />
            <TextInput accessibilityLabel="رقم الهاتف" autoCapitalize="none" keyboardType="phone-pad" onChangeText={setPhone} placeholder="+962 79 123 4567" placeholderTextColor={colors.muted} style={styles.input} testID="sign-up-phone" value={phone} />
          </View>
        </PremiumPanel>
        {error ? <StateNotice icon="warning" title="خطأ في إنشاء الحساب" body={error} tone={colors.red} testID="sign-up-error" /> : null}
        {success ? <InfoCard icon="checkmark-circle" title="تم إنشاء الحساب" body="تم إنشاء حسابك بنجاح. سجّل دخولك الآن." tone={colors.green} /> : null}
        <PrimaryButton label="إنشاء حساب" icon="person-add" loading={loading} disabled={success} onPress={handleSubmit} testID="sign-up-button" />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
  input: { backgroundColor: colors.surfaceAlt, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, color: colors.ink, fontSize: 16, fontWeight: '700', minHeight: 54, paddingHorizontal: spacing.md },
});