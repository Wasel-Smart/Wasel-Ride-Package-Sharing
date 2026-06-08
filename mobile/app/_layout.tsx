import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '../src/components/OfflineBanner';
import { queryClient } from '../src/lib/queryClient';
import { waselMobileConfig } from '../src/lib/config';
import { AuthProvider } from '../src/providers/AuthProvider';
import '../src/styles/global.css';
import { colors, radii, shadows } from '../src/theme';

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  rides: 'car',
  packages: 'cube',
  map: 'map',
  wallet: 'card',
  profile: 'person',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StripeProvider
        publishableKey={waselMobileConfig.stripePublishableKey}
        merchantIdentifier="merchant.jo.wasel"
        urlScheme="wasel"
      >
        <AuthProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <OfflineBanner />
            <Tabs
              screenOptions={({ route }) => ({
                freezeOnBlur: true,
                headerShadowVisible: false,
                headerStyle: {
                  backgroundColor: colors.bg,
                  shadowColor: 'transparent',
                },
                headerTitleStyle: {
                  color: colors.ink,
                  fontWeight: '900',
                },
                lazy: true,
                tabBarActiveTintColor: colors.teal,
                tabBarInactiveTintColor: colors.muted,
                tabBarHideOnKeyboard: true,
                tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                  <Ionicons name={iconByRoute[route.name] ?? 'ellipse'} size={size} color={color} />
                ),
                tabBarItemStyle: {
                  borderRadius: radii.lg,
                  marginHorizontal: 3,
                },
                tabBarLabelStyle: {
                  fontSize: 12,
                  fontWeight: '800',
                },
                tabBarStyle: {
                  ...shadows.card,
                  backgroundColor: colors.surface,
                  borderTopColor: 'transparent',
                  height: 70,
                  paddingBottom: 10,
                  paddingTop: 8,
                },
              })}
            >
              <Tabs.Screen
                name="index"
                options={{
                  title: 'Wasel',
                  tabBarTestID: 'home-tab',
                  tabBarAccessibilityLabel: 'Home tab',
                }}
              />
              <Tabs.Screen
                name="rides"
                options={{
                  title: 'Find a ride',
                  tabBarTestID: 'rides-tab',
                  tabBarAccessibilityLabel: 'Rides tab',
                }}
              />
              <Tabs.Screen
                name="packages"
                options={{
                  title: 'Packages',
                  tabBarTestID: 'packages-tab',
                  tabBarAccessibilityLabel: 'Packages tab',
                }}
              />
              <Tabs.Screen
                name="profile"
                options={{
                  title: 'Profile',
                  tabBarTestID: 'profile-tab',
                  tabBarAccessibilityLabel: 'Profile tab',
                }}
              />
              <Tabs.Screen name="map" options={{ href: null, title: 'Map' }} />
              <Tabs.Screen name="wallet" options={{ href: null, title: 'Wallet' }} />
              <Tabs.Screen name="operations" options={{ href: null }} />
            </Tabs>
          </SafeAreaProvider>
        </AuthProvider>
      </StripeProvider>
    </QueryClientProvider>
  );
}
