import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { useAuth } from '../providers/AuthProvider';

// Primary tab screens
import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import PackagesScreen from '../screens/PackagesScreen';
import NetworksScreen from '../screens/NetworksScreen';
import MapScreen from '../screens/MapScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Secondary stack screens
import SafetyScreen from '../screens/SafetyScreen';
import TripsScreen from '../screens/TripsScreen';
import BusScreen from '../screens/BusScreen';
import DriverScreen from '../screens/DriverScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import ChatScreen from '../screens/ChatScreen';
import AdvancedSearchScreen from '../screens/AdvancedSearchScreen';
import RateRideScreen from '../screens/RateRideScreen';
import SignInScreen from '../screens/SignInScreen';
import ScheduledRideScreen from '../screens/ScheduledRideScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Rides: 'car',
  Packages: 'cube',
  Networks: 'git-network',
  Map: 'map',
  Wallet: 'card',
  Profile: 'person',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name={iconByRoute[route.name] ?? 'ellipse'} size={size} color={color} />
        ),
        freezeOnBlur: true,
        headerStyle: { backgroundColor: colors.bg, shadowColor: 'transparent' },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontWeight: '900' },
        lazy: true,
        tabBarActiveTintColor: colors.teal,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'transparent',
          elevation: 6,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Wasel' }} />
      <Tab.Screen name="Rides" component={RideRequestScreen} options={{ title: 'Find a Ride' }} />
      <Tab.Screen name="Packages" component={PackagesScreen} options={{ title: 'Packages' }} />
      <Tab.Screen name="Networks" component={NetworksScreen} options={{ title: 'Networks' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

export const AppNavigator = React.memo(function AppNavigator() {
  const { user, loading } = useAuth();

  // While session is being restored, render nothing (or a splash could go here)
  if (loading) return null;

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: colors.ink, fontWeight: '900' },
        headerTintColor: colors.teal,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      {/* Auth gate — show sign-in if no session */}
      {!user ? (
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ title: 'Sign in to Wasel', headerShown: false }}
        />
      ) : (
        <>
          {/* Main app */}
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />

          {/* Utility screens */}
          <Stack.Screen name="Safety" component={SafetyScreen} options={{ title: 'Safety center' }} />
          <Stack.Screen name="Trips" component={TripsScreen} options={{ title: 'My trips' }} />
          <Stack.Screen name="Bus" component={BusScreen} options={{ title: 'Bus routes' }} />
          <Stack.Screen name="Driver" component={DriverScreen} options={{ title: 'Driver setup' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />

          {/* Ride lifecycle screens — previously orphaned, now wired */}
          <Stack.Screen
            name="LiveTracking"
            component={LiveTrackingScreen}
            options={{ title: 'Live tracking', headerShown: false }}
          />
          <Stack.Screen
            name="Chat"
            component={ChatScreen}
            options={{ title: 'Message driver' }}
          />
          <Stack.Screen
            name="RateRide"
            component={RateRideScreen}
            options={{ title: 'Rate your ride' }}
          />

          {/* Advanced search — previously orphaned, now wired */}
          <Stack.Screen
            name="AdvancedSearch"
            component={AdvancedSearchScreen}
            options={{ title: 'Smart ride search' }}
          />

          {/* Scheduled rides — new screen */}
          <Stack.Screen
            name="ScheduledRide"
            component={ScheduledRideScreen}
            options={{ title: 'Schedule ride' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
});
