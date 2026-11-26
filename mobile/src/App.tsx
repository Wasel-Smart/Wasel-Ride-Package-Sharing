import React, { useEffect } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from './lib/queryClient';
import { waselMobileConfig } from './lib/config';
import { AuthProvider } from './providers/AuthProvider';
import { WaselThemeProvider, useTheme } from './providers/ThemeProvider';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppNavigator } from './navigation/AppNavigator';
import { navigationRef } from './navigation/ref';
import { OfflineBanner } from './components/OfflineBanner';
import { MobileErrorBoundary } from './components/MobileErrorBoundary';
import { RTLProvider } from './utils/rtl';
import { colors } from './theme';
import * as SplashScreen from 'expo-splash-screen';
import { biometricAuth } from './services/biometricAuth';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
} from '@expo-google-fonts/cairo';

// Keep the native splash visible until the brand font is ready (no flash of system font).
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

enableScreens(true);
enableFreeze(true);

const APP_SCHEME = process.env.EXPO_PUBLIC_APP_SCHEME ?? 'wasel';
const APP_DOMAIN = process.env.EXPO_PUBLIC_APP_DOMAIN ?? 'wasel.app';

const linking = {
  prefixes: [`${APP_SCHEME}://`, `https://${APP_DOMAIN}`],
  config: {
    screens: {
      SignIn: 'auth/signin',
      SignUp: 'auth/signup',
      ForgotPassword: 'auth/forgot-password',
      PhoneAuth: 'auth/phone',
      Home: '',
      RideRequest: 'rides/find',
      Packages: 'packages',
      Wallet: 'wallet',
      Profile: 'profile',
      Settings: 'settings',
      SecuritySettings: 'settings/security',
      ProfileEdit: 'profile/edit',
    },
  },
};

const App = () => {
  // Auth deep links (OAuth callbacks) are handled once, inside MobileAuthService.initialize(),
  // which covers both cold start (getInitialURL) and warm start (url event). A second listener
  // here would exchange the same one-time PKCE code twice.
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  useEffect(() => {
    // Prime the biometric service before any screen renders so the sign-in
    // screen never shows the biometric button in a stale state.
    void biometricAuth.initialize().catch(() => undefined);

    // On a font error we still continue (system font fallback) rather than block the app.
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!waselMobileConfig.hasSupabase) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.configurationError}>
          <Text style={styles.configurationErrorTitle}>تعذّر إعداد التطبيق</Text>
          <Text style={styles.configurationErrorBody}>
            لا تتوفر إعدادات الاتصال الآمنة اللازمة لبدء واصل. يرجى تحديث التطبيق أو التواصل مع الدعم.
          </Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider
        publishableKey={waselMobileConfig.stripePublishableKey}
        merchantIdentifier={process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID ?? 'merchant.jo.wasel'}
        urlScheme={APP_SCHEME}
      >
        <SafeAreaProvider>
          <WaselThemeProvider>
            <MobileErrorBoundary>
              <LanguageProvider>
                <RTLProvider>
                  <AuthProvider>
                    <AppShell linking={linking} />
                  </AuthProvider>
                </RTLProvider>
              </LanguageProvider>
            </MobileErrorBoundary>
          </WaselThemeProvider>
        </SafeAreaProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
};

/** Inner shell — lives inside WaselThemeProvider so it can call useTheme(). */
function AppShell({ linking }: { linking: Parameters<typeof NavigationContainer>[0]['linking'] }) {
  const { colors: themeColors, isDark } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.bg }} edges={['top', 'left', 'right']}>
      <StatusBar
        backgroundColor={themeColors.bg}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <OfflineBanner />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <NavigationContainer linking={linking} fallback={<View style={{ flex: 1, backgroundColor: themeColors.bg }} />} {...({ ref: navigationRef } as any)}>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  configurationError: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.bg,
  },
  configurationErrorTitle: {
    marginBottom: 12,
    color: colors.error,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  configurationErrorBody: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});

export default App;
