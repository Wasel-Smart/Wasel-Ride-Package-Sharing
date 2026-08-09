import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { queryClient } from './lib/queryClient';
import { waselMobileConfig } from './lib/config';
import { AuthProvider } from './providers/AuthProvider';
import { LanguageProvider } from './contexts/LanguageContext';
import { AppNavigator } from './navigation/AppNavigator';
import { OfflineBanner } from './components/OfflineBanner';
import { MobileErrorBoundary } from './components/MobileErrorBoundary';
import { RTLProvider } from './utils/rtl';
import { colors } from './theme';
import { mobileAuth } from './services/auth';
import * as Linking from 'expo-linking';

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
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      setDeepLinkUrl(url);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (deepLinkUrl) {
      void mobileAuth.completeAuthFromUrl(deepLinkUrl).catch(() => {
        console.warn('[App] Deep link auth handling failed');
      });
    }
  }, [deepLinkUrl]);

  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider
        publishableKey={waselMobileConfig.stripePublishableKey}
        merchantIdentifier={process.env.EXPO_PUBLIC_STRIPE_MERCHANT_ID ?? 'merchant.jo.wasel'}
        urlScheme={APP_SCHEME}
      >
        <SafeAreaProvider>
          <MobileErrorBoundary>
            <RTLProvider>
              <AuthProvider>
                <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
                  <StatusBar backgroundColor={colors.bg} barStyle="light-content" />
                  <OfflineBanner />
                  <NavigationContainer linking={linking} fallback={<View style={{ flex: 1, backgroundColor: colors.bg }} />}>
                    <AppNavigator />
                  </NavigationContainer>
                </SafeAreaView>
              </AuthProvider>
            </RTLProvider>
          </MobileErrorBoundary>
        </SafeAreaProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});

export default App;
