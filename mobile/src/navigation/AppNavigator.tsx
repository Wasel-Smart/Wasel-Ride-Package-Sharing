import React, { useCallback, useEffect, useState } from 'react';
import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { colors } from '../theme';
import { useAuth } from '../providers/AuthProvider';
import { useLanguage } from '../contexts/LanguageContext';
import { authReadyPromise } from '../services/auth';

import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import PackagesScreen from '../screens/PackagesScreen';
import NetworksScreen from '../screens/NetworksScreen';
import MapScreen from '../screens/MapScreen';
import AppLoadingScreen from '../screens/AppLoadingScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SafetyScreen from '../screens/SafetyScreen';
import TripsScreen from '../screens/TripsScreen';
import BusScreen from '../screens/BusScreen';
import DriverScreen from '../screens/DriverScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import VehicleFormScreen from '../screens/VehicleFormScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import LiveTrackingScreen from '../screens/LiveTrackingScreen';
import ChatScreen from '../screens/ChatScreen';
import AdvancedSearchScreen from '../screens/AdvancedSearchScreen';
import RateRideScreen from '../screens/RateRideScreen';
import SignInScreen from '../screens/SignInScreen';
import ScheduledRideScreen from '../screens/ScheduledRideScreen';
import PaymentMethodsScreen from '../screens/PaymentMethodsScreen';
import ReceiptScreen from '../screens/ReceiptScreen';
import ReportIssueScreen from '../screens/ReportIssueScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PhoneAuthScreen from '../screens/PhoneAuthScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import SecuritySettingsScreen from '../screens/SecuritySettingsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TrustCenterScreen from '../screens/TrustCenterScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const ONBOARDING_KEY = 'wasel.onboarding.v1';

// [inactive, active] icon pair — filled icon marks the selected tab so state
// never relies on color alone.
const iconByRoute: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home-outline', 'home'],
  Rides: ['car-outline', 'car'],
  Packages: ['cube-outline', 'cube'],
  Wallet: ['card-outline', 'card'],
  Profile: ['person-outline', 'person'],
};

const getTabScreenOptions = ({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
  tabBarAccessibilityLabel: route.name,
  tabBarIcon: ({ color, size, focused }: { color: string; size: number; focused: boolean }) => {
    const pair = iconByRoute[route.name] ?? ['ellipse-outline', 'ellipse'];
    return <Ionicons name={focused ? pair[1] : pair[0]} size={size} color={color} />;
  },
  freezeOnBlur: true,
  headerStyle: { backgroundColor: colors.bg, shadowColor: 'transparent' },
  headerShadowVisible: false,
  headerTitleAlign: 'center',
  headerTitleStyle: { color: colors.ink, fontWeight: '900' },
  lazy: true,
  tabBarActiveTintColor: colors.primary,
  tabBarHideOnKeyboard: true,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.line,
    borderTopWidth: 1,
    elevation: 8,
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
  },
});

// Five tabs is the usable maximum on a phone. Map and Networks stay reachable
// from Home (quick action + service card) via the stack below.
function TabNavigator() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator initialRouteName="Home" screenOptions={getTabScreenOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('nav.home'), headerShown: false, tabBarButtonTestID: 'home-tab' }}
      />
      <Tab.Screen name="Rides" component={RideRequestScreen} options={{ title: t('nav.rides'), tabBarButtonTestID: 'rides-tab' }} />
      <Tab.Screen name="Packages" component={PackagesScreen} options={{ title: t('nav.packages'), tabBarButtonTestID: 'packages-tab' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: t('nav.wallet'), tabBarButtonTestID: 'wallet-tab' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: t('nav.profile'), tabBarButtonTestID: 'profile-tab' }} />
    </Tab.Navigator>
  );
}

// Auth sub-screens render their own large title, so the native header is only
// a back affordance (it used to be hidden entirely, leaving no visible way back on iOS).
const authBackOnly = { headerShown: true, title: '', headerTransparent: false } as const;

export const AppNavigator = React.memo(function AppNavigator() {
  const { user, loading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const { t } = useLanguage();

  // Wait for both auth session restoration and biometric initialization before
  // rendering any screen. This prevents biometricAuth.isEnabled() from returning
  // a stale false on fast cold starts.
  useEffect(() => {
    let alive = true;
    authReadyPromise.then(() => {
      if (alive) setAuthReady(true);
    }).catch(() => {
      // Should not happen — authReadyPromise never rejects — but be safe.
      if (alive) setAuthReady(true);
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value: string | null) => {
        if (alive) setOnboarded(value === 'done');
      })
      .catch(() => {
        // Storage failure must never trap the user behind onboarding.
        if (alive) setOnboarded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const finishOnboarding = useCallback(() => {
    setOnboarded(true);
    void AsyncStorage.setItem(ONBOARDING_KEY, 'done').catch(() => undefined);
  }, []);

  if (loading || onboarded === null || !authReady) return <AppLoadingScreen />;

  return (
    <Stack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg },
        headerBackTitleVisible: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.primary,
        headerTitleAlign: 'center',
        headerTitleStyle: { color: colors.ink, fontWeight: '900' },
      }}
    >
      {!user ? (
        <>
          {!onboarded ? (
            <Stack.Screen name="Onboarding" options={{ headerShown: false, animation: 'fade' }}>
              {() => <OnboardingScreen onDone={finishOnboarding} />}
            </Stack.Screen>
          ) : null}
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: t('nav.signIn'), headerShown: false }}
          />
          <Stack.Screen name="SignUp" component={SignUpScreen} options={authBackOnly} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={authBackOnly} />
          <Stack.Screen name="PhoneAuth" component={PhoneAuthScreen} options={authBackOnly} />
        </>
      ) : (
        <>
          <Stack.Screen name="Tabs" component={TabNavigator} options={{ headerShown: false }} />
          <Stack.Screen name="Map" component={MapScreen} options={{ title: t('nav.map') }} />
          <Stack.Screen name="Networks" component={NetworksScreen} options={{ title: t('nav.networks') }} />
          <Stack.Screen name="Safety" component={SafetyScreen} options={{ title: t('nav.safety') }} />
          <Stack.Screen name="Trips" component={TripsScreen} options={{ title: t('nav.trips') }} />
          <Stack.Screen name="Bus" component={BusScreen} options={{ title: t('nav.bus') }} />
          <Stack.Screen name="Driver" component={DriverScreen} options={{ title: t('nav.driver') }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: t('nav.notifications') }} />
          <Stack.Screen
            name="LiveTracking"
            component={LiveTrackingScreen}
            options={{ title: t('nav.liveTracking'), headerShown: false }}
          />
          <Stack.Screen name="Chat" component={ChatScreen} options={{ title: t('nav.chat') }} />
          <Stack.Screen name="RateRide" component={RateRideScreen} options={{ title: t('nav.rateRide') }} />
          <Stack.Screen
            name="AdvancedSearch"
            component={AdvancedSearchScreen}
            options={{ title: t('nav.advancedSearch') }}
          />
          <Stack.Screen
            name="ScheduledRide"
            component={ScheduledRideScreen}
            options={{ title: t('nav.scheduledRide') }}
          />
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: t('nav.profileEdit'), headerShown: false }} />
          <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} options={{ title: t('nav.securitySettings'), headerShown: false }} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: t('nav.paymentMethods') }} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: t('nav.receipt') }} />
          <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: t('nav.reportIssue') }} />
          <Stack.Screen name="DriverProfile" component={DriverProfileScreen} options={{ title: t('nav.driverProfile') }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: t('nav.settings') }} />
          <Stack.Screen name="TrustCenter" component={TrustCenterScreen} options={{ title: t('nav.trustCenter') }} />
        </>
      )}
    </Stack.Navigator>
  );
});
