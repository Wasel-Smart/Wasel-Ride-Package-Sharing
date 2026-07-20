import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import { useAuth } from '../providers/AuthProvider';

import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import PackagesScreen from '../screens/PackagesScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AppLoadingScreen from '../screens/AppLoadingScreen';

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
import NetworksScreen from '../screens/NetworksScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Rides: 'car',
  Packages: 'cube',
  Wallet: 'card',
  Profile: 'person',
};

function TabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        tabBarAccessibilityLabel: route.name,
        tabBarIcon: ({ color, size }: { color: string; size: number }) => (
          <Ionicons name={iconByRoute[route.name] ?? 'ellipse'} size={size} color={color} />
        ),
        freezeOnBlur: true,
        headerStyle: { backgroundColor: colors.bg, shadowColor: 'transparent' },
        headerShadowVisible: false,
        headerTitleAlign: 'center',
        headerTitleStyle: { color: colors.ink, fontWeight: '900' },
        lazy: true,
        tabBarActiveTintColor: colors.teal,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '800' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          elevation: 8,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'الرئيسية' }} />
      <Tab.Screen name="Rides" component={RideRequestScreen} options={{ title: 'المشاوير' }} />
      <Tab.Screen name="Packages" component={PackagesScreen} options={{ title: 'الطرود' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'المحفظة' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'حسابي' }} />
    </Tab.Navigator>
  );
}

export const AppNavigator = React.memo(function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return <AppLoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.teal,
        headerTitleAlign: 'center',
        headerTitleStyle: { color: colors.ink, fontWeight: '900' },
      }}
    >
      {!user ? (
        <Stack.Screen
          name="SignIn"
          component={SignInScreen}
          options={{ title: 'تسجيل الدخول إلى واصل', headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: 'الخريطة' }} />
          <Stack.Screen name="Networks" component={NetworksScreen} options={{ title: 'الشبكات' }} />
          <Stack.Screen name="Safety" component={SafetyScreen} options={{ title: 'مركز الأمان' }} />
          <Stack.Screen name="Trips" component={TripsScreen} options={{ title: 'مشاويري' }} />
          <Stack.Screen name="Bus" component={BusScreen} options={{ title: 'خطوط الباصات' }} />
          <Stack.Screen name="Driver" component={DriverScreen} options={{ title: 'تجهيز السائق' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'الإشعارات' }} />
          <Stack.Screen
            name="LiveTracking"
            component={LiveTrackingScreen}
            options={{ title: 'التتبع المباشر', headerShown: false }}
          />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'مراسلة السائق' }} />
          <Stack.Screen name="RateRide" component={RateRideScreen} options={{ title: 'قيّم المشوار' }} />
          <Stack.Screen
            name="AdvancedSearch"
            component={AdvancedSearchScreen}
            options={{ title: 'بحث ذكي عن مشوار' }}
          />
          <Stack.Screen
            name="ScheduledRide"
            component={ScheduledRideScreen}
            options={{ title: 'جدولة مشوار' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
});
