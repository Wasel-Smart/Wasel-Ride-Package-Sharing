import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import PackagesScreen from '../screens/PackagesScreen';
import MapScreen from '../screens/MapScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home: 'home',
  Rides: 'car',
  Packages: 'cube',
  Map: 'map',
  Wallet: 'card',
  Profile: 'person',
};

export const AppNavigator = React.memo(function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          return <Ionicons name={iconByRoute[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
        freezeOnBlur: true,
        headerStyle: {
          backgroundColor: colors.bg,
          shadowColor: 'transparent',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: colors.ink,
          fontWeight: '900',
        },
        lazy: true,
        tabBarActiveTintColor: colors.teal,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '800',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: 'transparent',
          elevation: 6,
          height: 70,
          paddingBottom: 10,
          paddingTop: 8,
        },
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Wasel' }} />
      <Tab.Screen name="Rides" component={RideRequestScreen} options={{ title: 'Find a ride' }} />
      <Tab.Screen name="Packages" component={PackagesScreen} options={{ title: 'Packages' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
});
