import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { colors, radii, spacing } from '../theme';
import { validateEmail } from '../utils/security';

export default function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = useCallback(async () => {
    setError(null);
    if (!email.trim()) { setError('أدخل البريد الإلكتروني أولاً.'); return; }
    if (!validateEmail(email)) { setError('أدخل بريدًا إلكترونيًا صحيحًا.'); return; }
    setLoading(true);
    try {
      const { error: resetError } = await resetPassword(email);
      if (resetError) { setError(resetError.message || 'فشل إعادة تعيين كلمة المرور.'); return; }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إعادة تعيين كلمة المرور.');
    } finally {
      setLoading(false);
    }
  }, [email, resetPassword]);

  return (
    <ScreenShell testID="forgot-password-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader eyebrow="نسيت كلمة المرور؟" title="أعد تعيين كلمة المرور" body="أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين." />
        <PremiumPanel>
          <View style={styles.form}>
            <TextInput accessibilityLabel="البريد الإلكتروني" autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="البريد الإلكتروني" placeholderTextColor={colors.muted} style={styles.input} testID="forgot-email" value={email} />
          </View>
        </PremiumPanel>
        {error ? <StateNotice icon="warning" title="خطأ" body={error} tone={colors.red} testID="forgot-error" /> : null}
        {success ? <StateNotice icon="checkmark-circle" title="تم الإرسال" body="إذا كان البريد مسجلاً، ستصلك رسالة إعادة التعيين خلال دقائق." tone={colors.green} /> : null}
        <PrimaryButton label="أرسل رابط إعادة التعيين" icon="lock-closed" loading={loading} disabled={success} onPress={handleReset} testID="forgot-reset-button" />
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
  input: { backgroundColor: colors.surfaceAlt, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, color: colors.ink, fontSize: 16, fontWeight: '700', minHeight: 54, paddingHorizontal: spacing.md },
});