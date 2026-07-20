import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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

const SignInScreen = React.memo(function SignInScreen() {
  const { signIn, signInWithGoogle, signInWithFacebook } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('بيانات ناقصة', 'اكتب البريد الإلكتروني وكلمة المرور.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل تسجيل الدخول. جرّب مرة ثانية.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn]);

  const handleGoogle = useCallback(async () => {
    setOauthLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل الدخول عبر Google.';
      setError(message);
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithGoogle]);

  const handleFacebook = useCallback(async () => {
    setOauthLoading('facebook');
    setError(null);
    try {
      await signInWithFacebook();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'فشل الدخول عبر Facebook.';
      setError(message);
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithFacebook]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label="تسجيل الدخول"
          icon="log-in"
          loading={loading}
          disabled={!email.trim() || !password.trim()}
          tone={colors.teal}
          onPress={handleSignIn}
          testID="sign-in-button"
        />
      }
      testID="sign-in-screen"
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <SectionHeader
          eyebrow="أهلاً في واصل"
          title="سجّل دخولك لحسابك"
          body="افتح المشاوير والطرود والشبكات وسجل رحلاتك الكامل."
        />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="البريد الإلكتروني"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="البريد الإلكتروني"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="email-input"
              value={email}
            />
            <TextInput
              accessibilityLabel="كلمة المرور"
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="كلمة المرور"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              testID="password-input"
              value={password}
              onSubmitEditing={handleSignIn}
            />
          </View>
        </PremiumPanel>

        {error ? (
          <StateNotice
            icon="warning"
            title="خطأ بتسجيل الدخول"
            body={error}
            tone={colors.red}
            testID="sign-in-error"
          />
        ) : null}

        <SectionHeader
          eyebrow="أو تابع باستخدام"
          title="تسجيل دخول اجتماعي"
          body="استخدم حساب Google أو Facebook الحالي."
        />

        <PrimaryButton
          label="تابع باستخدام Google"
          icon="logo-google"
          tone={colors.blue}
          loading={oauthLoading === 'google'}
          disabled={oauthLoading !== null || loading}
          onPress={handleGoogle}
          testID="google-sign-in-button"
        />

        <PrimaryButton
          label="تابع باستخدام Facebook"
          icon="logo-facebook"
          tone={colors.lilac}
          loading={oauthLoading === 'facebook'}
          disabled={oauthLoading !== null || loading}
          onPress={handleFacebook}
          testID="facebook-sign-in-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="آمن وموثق"
          body="جلستك مشفرة ومحفوظة بأمان على الجهاز عبر Supabase Auth."
          tone={colors.green}
        />
        <InfoCard
          icon="moon"
          title="الدخول كزائر متاح"
          body="استعرض الخطوط والأسعار بدون حساب. سجّل دخولك للحجز وتتبع السجل."
          tone={colors.blue}
        />
      </ScrollView>
    </ScreenShell>
  );
});

const styles = StyleSheet.create({
  scroll: { gap: spacing.lg, paddingBottom: spacing.xxl },
  form: { gap: spacing.sm },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.line,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '700',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
});

export default SignInScreen;
