import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '../src/components/OfflineBanner';
import { AuthProvider } from '../src/providers/AuthProvider';
import '../src/styles/global.css';
import { colors } from '../src/theme';

const queryClient = new QueryClient();

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home',
  rides: 'car',
  packages: 'cube',
  profile: 'person',
};

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <OfflineBanner />
          <Tabs
            screenOptions={({ route }) => ({
              headerStyle: {
                backgroundColor: colors.surface,
                shadowColor: 'transparent',
              },
              headerTitleStyle: {
                color: colors.ink,
                fontWeight: '800',
              },
              tabBarActiveTintColor: colors.teal,
              tabBarInactiveTintColor: colors.muted,
              tabBarIcon: ({ color, size }: { color: string; size: number }) => (
                <Ionicons name={iconByRoute[route.name] ?? 'ellipse'} size={size} color={color} />
              ),
              tabBarLabelStyle: {
                fontSize: 12,
                fontWeight: '700',
              },
              tabBarStyle: {
                backgroundColor: colors.surface,
                borderTopColor: colors.line,
                height: 64,
                paddingBottom: 8,
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
            <Tabs.Screen name="operations" options={{ href: null }} />
          </Tabs>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
