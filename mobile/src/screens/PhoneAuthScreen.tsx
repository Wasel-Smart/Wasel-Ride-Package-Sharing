import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
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
import { validatePhone } from '../utils/security';

export default function PhoneAuthScreen() {
  const { signInWithPhone, verifyOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'enter-phone' | 'verify-otp'>('enter-phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSendOtp = useCallback(async () => {
    setError(null);
    if (!phone.trim()) { setError('رقم الهاتف مطلوب.'); return; }
    if (!validatePhone(phone)) { setError('رقم الهاتف لازم يكون بصيغة +962XXXXXXXXX.'); return; }
    setLoading(true);
    try {
      const { error: otpError } = await signInWithPhone(phone);
      if (otpError) { setError(otpError.message || 'فشل إرسال رمز التحقق.'); return; }
      setStep('verify-otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل إرسال رمز التحقق.');
    } finally {
      setLoading(false);
    }
  }, [phone, signInWithPhone]);

  const handleVerifyOtp = useCallback(async () => {
    setError(null);
    if (!otp.trim()) { setError('رمز التحقق مطلوب.'); return; }
    if (otp.length < 4) { setError('رمز التحقق لازم يكون 4 أرقام على الأقل.'); return; }
    setLoading(true);
    try {
      const { error: verifyError } = await verifyOtp(phone, otp);
      if (verifyError) { setError(verifyError.message || 'رمز التحقق غير صحيح.'); return; }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل التحقق.');
    } finally {
      setLoading(false);
    }
  }, [otp, phone, verifyOtp]);

  const handleResendOtp = useCallback(() => {
    setOtp('');
    setStep('enter-phone');
  }, []);

  return (
    <ScreenShell testID="phone-auth-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader eyebrow="تسجيل الدخول بالهاتف" title="أدخل رقم هاتفك" body="سنرسل لك رمز تحقق عبر SMS لتسجيل الدخول." />
        {step === 'verify-otp' ? (
          <>
            <PremiumPanel>
              <View style={styles.form}>
                <TextInput accessibilityLabel="رمز التحقق" keyboardType="number-pad" onChangeText={setOtp} placeholder="أدخل رمز التحقق" placeholderTextColor={colors.muted} style={styles.input} testID="otp-input" value={otp} />
              </View>
            </PremiumPanel>
            {error ? <StateNotice icon="warning" title="خطأ في التحقق" body={error} tone={colors.red} testID="phone-error" /> : null}
            {success ? <InfoCard icon="checkmark-circle" title="تم التحقق بنجاح" body="تم تسجيل دخولك عبر الهاتف." tone={colors.green} /> : null}
            <View style={styles.buttonRow}>
              <PrimaryButton label="تحقق" icon="checkmark" loading={loading} disabled={success} onPress={handleVerifyOtp} testID="verify-otp-button" />
              <PrimaryButton label="أعد الإرسال" icon="refresh" loading={false} onPress={handleResendOtp} testID="resend-otp-button" />
            </View>
          </>
        ) : (
          <>
            {error ? <StateNotice icon="warning" title="خطأ" body={error} tone={colors.red} testID="phone-error" /> : null}
            <PremiumPanel>
              <View style={styles.form}>
                <TextInput accessibilityLabel="رقم الهاتف" autoCapitalize="none" keyboardType="phone-pad" onChangeText={setPhone} placeholder="+962 79 123 4567" placeholderTextColor={colors.muted} style={styles.input} testID="phone-input" value={phone} />
              </View>
            </PremiumPanel>
            <PrimaryButton label="أرسل رمز التحقق" icon="paper-plane" loading={loading} disabled={success} onPress={handleSendOtp} testID="send-otp-button" />
          </>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
  input: { backgroundColor: colors.surfaceAlt, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, color: colors.ink, fontSize: 16, fontWeight: '700', minHeight: 54, paddingHorizontal: spacing.md },
  buttonRow: { gap: spacing.sm },
});