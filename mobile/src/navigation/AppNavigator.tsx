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

export const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
        tabBarIcon: ({ color, size }: { color: string; size: number }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Rides') iconName = 'car';
          else if (route.name === 'Packages') iconName = 'cube';
          else if (route.name === 'Map') iconName = 'map';
          else if (route.name === 'Wallet') iconName = 'card';
          else if (route.name === 'Profile') iconName = 'person';
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
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
      })}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Wasel' }} />
      <Tab.Screen name="Rides" component={RideRequestScreen} options={{ title: 'Find a ride' }} />
      <Tab.Screen name="Packages" component={PackagesScreen} options={{ title: 'Packages' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'Map' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};
