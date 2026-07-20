import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { queryClient } from './lib/queryClient';
import { waselMobileConfig } from './lib/config';
import { AuthProvider } from './providers/AuthProvider';
import { AppNavigator } from './navigation/AppNavigator';
import { OfflineBanner } from './components/OfflineBanner';
import { colors } from './theme';

enableScreens(true);
enableFreeze(true);

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider
        publishableKey={waselMobileConfig.stripePublishableKey}
        merchantIdentifier="merchant.jo.wasel"
        urlScheme="wasel"
      >
        <AuthProvider>
          <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={colors.bg} barStyle="dark-content" />
            <OfflineBanner />
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </SafeAreaView>
        </AuthProvider>
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
