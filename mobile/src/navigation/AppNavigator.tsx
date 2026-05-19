import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../hooks/useAuth';
import HomeScreen from '../screens/HomeScreen';
import FindRideScreen from '../screens/FindRideScreen';
import OfferRideScreen from '../screens/OfferRideScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import RideDetailScreen from '../screens/RideDetailScreen';

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  RideDetail: { rideId: string };
};

export type MainTabParamList = {
  Home: undefined;
  FindRide: undefined;
  OfferRide: undefined;
  Wallet: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const WASEL_CYAN = '#00C8E8';
const WASEL_DARK = '#0A1628';
const WASEL_CARD = '#0E1D35';
const WASEL_MUTED = '#5A7A9A';

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: WASEL_CARD,
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 24,
          paddingTop: 8,
        },
        tabBarActiveTintColor: WASEL_CYAN,
        tabBarInactiveTintColor: WASEL_MUTED,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size, focused }) => {
          const icons: Record<string, [string, string]> = {
            Home: ['home', 'home-outline'],
            FindRide: ['search', 'search-outline'],
            OfferRide: ['car', 'car-outline'],
            Wallet: ['wallet', 'wallet-outline'],
            Profile: ['person', 'person-outline'],
          };
          const [filled, outline] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return (
            <Ionicons
              name={(focused ? filled : outline) as any}
              size={size}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="FindRide" component={FindRideScreen} options={{ tabBarLabel: 'Find Ride' }} />
      <Tab.Screen name="OfferRide" component={OfferRideScreen} options={{ tabBarLabel: 'Offer Ride' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ tabBarLabel: 'Wallet' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={WASEL_CYAN} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="RideDetail"
              component={RideDetailScreen}
              options={{
                headerShown: true,
                headerStyle: { backgroundColor: WASEL_DARK },
                headerTintColor: '#fff',
                headerTitle: 'Ride Details',
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0A1628',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
