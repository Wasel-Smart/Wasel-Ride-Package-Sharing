import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import {
  InfoCard,
  PremiumPanel,
  PrimaryButton,
  ScreenShell,
  SectionHeader,
  StateNotice,
  StatusPill,
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
      Alert.alert('Missing details', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in failed. Please try again.';
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
      const message = err instanceof Error ? err.message : 'Google sign-in failed.';
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
      const message = err instanceof Error ? err.message : 'Facebook sign-in failed.';
      setError(message);
    } finally {
      setOauthLoading(null);
    }
  }, [signInWithFacebook]);

  return (
    <ScreenShell
      footer={
        <PrimaryButton
          label="Sign in"
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
          eyebrow="Welcome to Wasel"
          title="Sign in to your account"
          body="Access rides, packages, networks, and your full trip history."
        />

        <PremiumPanel>
          <View style={styles.form}>
            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              returnKeyType="next"
              style={styles.input}
              testID="email-input"
              value={email}
            />
            <TextInput
              accessibilityLabel="Password"
              autoCapitalize="none"
              autoComplete="password"
              onChangeText={setPassword}
              placeholder="Password"
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
            title="Sign-in error"
            body={error}
            tone={colors.red}
            testID="sign-in-error"
          />
        ) : null}

        <SectionHeader
          eyebrow="Or continue with"
          title="Social sign-in"
          body="Use your existing Google or Facebook account."
        />

        <PrimaryButton
          label="Continue with Google"
          icon="logo-google"
          tone={colors.blue}
          loading={oauthLoading === 'google'}
          disabled={oauthLoading !== null || loading}
          onPress={handleGoogle}
          testID="google-sign-in-button"
        />

        <PrimaryButton
          label="Continue with Facebook"
          icon="logo-facebook"
          tone={colors.lilac}
          loading={oauthLoading === 'facebook'}
          disabled={oauthLoading !== null || loading}
          onPress={handleFacebook}
          testID="facebook-sign-in-button"
        />

        <InfoCard
          icon="shield-checkmark"
          title="Secure & verified"
          body="Your session is encrypted and persisted securely on-device with Supabase Auth."
          tone={colors.green}
        />
        <InfoCard
          icon="moon"
          title="Guest access available"
          body="Browse routes and check pricing without an account. Sign in to book rides and track history."
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
