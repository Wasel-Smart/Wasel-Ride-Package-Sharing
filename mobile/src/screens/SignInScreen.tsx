import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
} from '../components/MobilePrimitives';
import { useAuth } from '../providers/AuthProvider';
import { useLanguage } from '../contexts/LanguageContext';
import { biometricAuth } from '../services/biometricAuth';
import { colors, radii, spacing } from '../theme';
import { validateEmail, validatePhone } from '../utils/security';

const MAX_SIGNIN_ATTEMPTS = 5;
const SIGNIN_WINDOW_MS = 60_000;

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

declare global {
  var __signinRateLimit: Record<string, RateLimitRecord> | undefined;
}

function checkSignInRateLimit(email: string): boolean {
  const key = `signin:${email}`;
  const now = Date.now();
  const store = global.__signinRateLimit ?? {};
  const record = store[key];
  if (!record || now > record.resetAt) {
    global.__signinRateLimit = { ...store, [key]: { count: 1, resetAt: now + SIGNIN_WINDOW_MS } };
    return true;
  }
  record.count += 1;
  if (record.count > MAX_SIGNIN_ATTEMPTS) {
    return false;
  }
  return true;
}

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: colors.muted };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const map = [
    { score: 0, label: '', color: colors.muted },
    { score: 1, label: 'ضعيفة', color: colors.error },
    { score: 2, label: 'متوسطة', color: colors.warning },
    { score: 3, label: 'جيدة', color: colors.primary },
    { score: 4, label: 'قوية', color: colors.green },
    { score: 5, label: 'ممتازة', color: colors.green },
  ];
  return map[Math.min(score, 5)] ?? { score: 0, label: '', color: colors.muted };
}

type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  PhoneAuth: undefined;
};

type AuthNavProp = NativeStackNavigationProp<AuthStackParamList>;

const SignInScreen = React.memo(function SignInScreen() {
  const { signIn, signInWithGoogle, signInWithFacebook, signInWithPhone } = useAuth();
  const { t } = useLanguage();
  const navigation = useNavigation<AuthNavProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'facebook' | null>(null);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordStrength, setShowPasswordStrength] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    void biometricAuth.initialize().then(() => {
      setBiometricAvailable(biometricAuth.isSupported());
    });
  }, []);

  const pwStrength = getPasswordStrength(password);

  const handleBiometricSignIn = useCallback(async () => {
    setBiometricLoading(true);
    setError(null);
    try {
      const success = await biometricAuth.signInWithBiometrics();
      if (!success) {
        setError('فشل التحقق البيومتري.');
      }
    } catch {
      setError('حدث خطأ أثناء التحقق البيومتري.');
    } finally {
      setBiometricLoading(false);
    }
  }, []);

  const handleSignIn = useCallback(async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('أدخل البريد الإلكتروني وكلمة المرور.');
      return;
    }
    if (!validateEmail(email)) {
      setError('أدخل بريدًا إلكترونيًا صحيحًا.');
      return;
    }
    if (!checkSignInRateLimit(email)) {
      setError('محاولات كثيرة جدًا. انتظر دقيقة قبل المحاولة مرة أخرى.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.signInErrorBody');
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [email, password, signIn, t]);

  const handleGoogle = useCallback(async () => {
    setOauthLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.googleError');
      setError(message);
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithGoogle, t]);

  const handleFacebook = useCallback(async () => {
    setOauthLoading('facebook');
    setError(null);
    try {
      await signInWithFacebook();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.facebookError');
      setError(message);
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithFacebook, t]);

  const handlePhoneAuth = useCallback(() => {
    setError(null);
    if (!phone.trim()) {
      setError('أدخل رقم الهاتف أولاً.');
      return;
    }
    if (!validatePhone(phone)) {
      setError('رقم الهاتف لازم يكون بصيغة +962XXXXXXXXX.');
      return;
    }
    setPhoneLoading(true);
    signInWithPhone(phone).then(({ error: phoneError }) => {
      setPhoneLoading(false);
      if (phoneError) {
        setError(phoneError.message || 'فشل إرسال رمز التحقق.');
      }
    }).catch(() => {
      setPhoneLoading(false);
      setError('فشل إرسال رمز التحقق.');
    });
  }, [phone, signInWithPhone]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label={t('auth.signInButton')}
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
          eyebrow={t('auth.signInTitle')}
          title={t('auth.signInSubtitle')}
          body={t('auth.signInSubtitle')}
        />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel={t('auth.emailLabel')}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder={t('auth.emailLabel')}
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="email-input"
              value={email}
            />
            <TextInput
              accessibilityLabel={t('auth.passwordLabel')}
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={text => {
                setPassword(text);
                setShowPasswordStrength(text.length > 0);
              }}
              placeholder="كلمة المرور"
              placeholderTextColor={colors.muted}
              returnKeyType="done"
              secureTextEntry
              style={styles.input}
              testID="password-input"
              value={password}
              onSubmitEditing={handleSignIn}
            />
            {showPasswordStrength && password.length > 0 ? (
              <View style={styles.strengthBar}>
                <View style={[styles.strengthFill, { width: `${(pwStrength.score / 5) * 100}%`, backgroundColor: pwStrength.color }]} />
                {pwStrength.label ? (
                  <Text style={[styles.strengthLabel, { color: pwStrength.color }]}>{pwStrength.label}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </PremiumPanel>

        {error ? (
          <StateNotice
            icon="warning"
            title={t('auth.signInError')}
            body={error}
            tone={colors.red}
            testID="sign-in-error"
          />
        ) : null}

        <SectionHeader
          eyebrow={t('auth.socialLoginTitle')}
          title={t('auth.socialLoginTitle')}
          body={t('auth.socialLoginSubtitle')}
        />

        <PrimaryButton
          label={t('auth.continueWithGoogle')}
          icon="logo-google"
          tone={colors.blue}
          loading={oauthLoading === 'google'}
          disabled={oauthLoading !== null || loading}
          onPress={handleGoogle}
          testID="google-sign-in-button"
        />

        <PrimaryButton
          label={t('auth.continueWithFacebook')}
          icon="logo-facebook"
          tone={colors.lilac}
          loading={oauthLoading === 'facebook'}
          disabled={oauthLoading !== null || loading}
          onPress={handleFacebook}
          testID="facebook-sign-in-button"
        />

        <PrimaryButton
          label="تابع باستخدام الهاتف"
          icon="phone-portrait"
          tone={colors.green}
          loading={phoneLoading}
          disabled={loading}
          onPress={handlePhoneAuth}
          testID="phone-sign-in-button"
        />

        {biometricAvailable ? (
          <PrimaryButton
            label="تسجيل الدخول بالبصمة"
            icon="finger-print"
            tone={colors.amber}
            loading={biometricLoading}
            disabled={loading}
            onPress={handleBiometricSignIn}
            testID="biometric-sign-in-button"
          />
        ) : null}

        <InfoCard
          icon="shield-checkmark"
          title={t('auth.secureSession')}
          body={t('auth.secureSessionBody')}
          tone={colors.green}
        />
        <InfoCard
          icon="moon"
          title={t('auth.guestModeTitle')}
          body={t('auth.guestModeBody')}
          tone={colors.blue}
        />

        <View style={styles.links}>
          <PrimaryButton
            label="ليس لديك حساب؟ أنشئ واحدًا"
            icon="person-add"
            tone={colors.cyan}
            loading={false}
            onPress={() => navigation.navigate('SignUp')}
            testID="sign-up-link"
          />
          <PrimaryButton
            label="نسيت كلمة المرور؟"
            icon="lock-closed"
            tone={colors.textMuted}
            loading={false}
            onPress={() => navigation.navigate('ForgotPassword')}
            testID="forgot-password-link"
          />
        </View>
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
  strengthBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.line,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'right',
  },
  links: { gap: spacing.sm },
});

export default SignInScreen;
