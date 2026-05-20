import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/Button';
import { C, S, R, T } from '../theme';

type Tab = 'signin' | 'signup';

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [tab,      setTab]      = useState<Tab>('signin');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (tab === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const result = tab === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password, name.trim());
    setLoading(false);
    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View style={styles.logoMark}>
              <Ionicons name="navigate" size={28} color={C.cyan} />
            </View>
            <Text style={styles.logoText}>Wasel</Text>
            <Text style={styles.logoSub}>Jordan's ride-sharing platform</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Tab switcher */}
            <View style={styles.tabs}>
              {(['signin', 'signup'] as Tab[]).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tab, tab === t && styles.tabActive]}
                  onPress={() => { setTab(t); setError(null); }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                    {t === 'signin' ? 'Sign in' : 'Create account'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fields}>
              {/* Full name (sign up only) */}
              {tab === 'signup' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Full name</Text>
                  <View style={styles.fieldWrap}>
                    <Ionicons name="person-outline" size={18} color={C.muted} style={styles.fieldIcon} />
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder="Your full name"
                      placeholderTextColor={C.muted}
                      autoCapitalize="words"
                      autoComplete="name"
                      selectionColor={C.cyan}
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email address</Text>
                <View style={styles.fieldWrap}>
                  <Ionicons name="mail-outline" size={18} color={C.muted} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={C.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    selectionColor={C.cyan}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.fieldWrap}>
                  <Ionicons name="lock-closed-outline" size={18} color={C.muted} style={styles.fieldIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={C.muted}
                    secureTextEntry={!showPw}
                    autoCapitalize="none"
                    autoComplete={tab === 'signup' ? 'new-password' : 'password'}
                    selectionColor={C.cyan}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPw(p => !p)} style={styles.eyeBtn}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.muted} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Error */}
            {error !== null && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={C.red} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit */}
            <Button
              label={tab === 'signin' ? 'Sign in to Wasel' : 'Create my account'}
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={{ marginTop: S.md }}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.divLine} />
              <Text style={styles.divText}>or</Text>
              <View style={styles.divLine} />
            </View>

            {/* Google — coming soon, shown as disabled with clear label */}
            <View style={styles.socialBtnDisabled} accessible accessibilityRole="button" accessibilityState={{ disabled: true }}>
              <Ionicons name="logo-google" size={20} color={C.muted} />
              <Text style={styles.socialTextDisabled}>Google sign-in — coming soon</Text>
            </View>
          </View>

          <Text style={styles.legalText}>
            By continuing you agree to Wasel's Terms of Service and Privacy Policy.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: C.bg },
  content:     { flexGrow: 1, padding: S.xl, justifyContent: 'center' },

  logoSection: { alignItems: 'center', marginBottom: S['3xl'] },
  logoMark: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: C.cyanDim, borderWidth: 1.5, borderColor: C.cyanBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: S.md,
  },
  logoText:  { ...T.h1, fontSize: 32, letterSpacing: -1 },
  logoSub:   { ...T.small, marginTop: 4, textAlign: 'center' },

  card: {
    backgroundColor: C.card, borderRadius: R.xl,
    borderWidth: 1, borderColor: C.border, padding: S.xl,
  },

  tabs:          { flexDirection: 'row', backgroundColor: C.card2, borderRadius: R.md, padding: 4, marginBottom: S.xl },
  tab:           { flex: 1, height: 38, borderRadius: R.sm - 2, alignItems: 'center', justifyContent: 'center' },
  tabActive:     { backgroundColor: C.cyan },
  tabText:       { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: '#fff' },

  fields: { gap: S.lg },
  fieldGroup: { gap: S.xs + 2 },
  fieldLabel: { ...T.label },
  fieldWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.card2, borderRadius: R.md,
    borderWidth: 1, borderColor: C.border, paddingHorizontal: S.md,
    height: 52,
  },
  fieldIcon: { marginRight: S.sm },
  input:     { flex: 1, fontSize: 15, color: C.text },
  eyeBtn:    { padding: S.xs },

  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: S.sm,
    backgroundColor: C.redDim, borderRadius: R.sm,
    padding: S.md, marginTop: S.sm,
    borderWidth: 1, borderColor: 'rgba(255,77,106,0.30)',
  },
  errorText: { flex: 1, fontSize: 13, color: C.red },

  divider:  { flexDirection: 'row', alignItems: 'center', gap: S.md, marginVertical: S.lg },
  divLine:  { flex: 1, height: 0.5, backgroundColor: C.border },
  divText:  { fontSize: 13, color: C.muted },

  socialBtnDisabled: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: S.md, height: 50, borderRadius: R.md,
    backgroundColor: C.card2, borderWidth: 1, borderColor: C.border,
    opacity: 0.45,
  },
  socialTextDisabled: { fontSize: 14, fontWeight: '500', color: C.muted },

  legalText: { fontSize: 11, color: C.dim, textAlign: 'center', marginTop: S.xl, lineHeight: 16 },
});
