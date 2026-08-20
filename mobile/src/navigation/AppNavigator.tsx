import React from 'react';
import { createBottomTabNavigator, type BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme';
import { useAuth } from '../providers/AuthProvider';

import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import PackagesScreen from '../screens/PackagesScreen';
import NetworksScreen from '../screens/NetworksScreen';
import MapScreen from '../screens/MapScreen';
import AppLoadingScreen from '../screens/AppLoadingScreen';
import WalletScreen from '../screens/WalletScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SafetyScreen from '../screens/SafetyScreen';
import TripsScreen from '../screens/TripsScreen';
import BusScreen from '../screens/BusScreen';
import DriverScreen from '../screens/DriverScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
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
  SignIn: 'log-in',
  SignUp: 'person-add',
  ForgotPassword: 'lock-closed',
  PhoneAuth: 'phone-portrait',
  ProfileEdit: 'create',
  SecuritySettings: 'shield-checkmark',
  Settings: 'settings',
};

const screenOptions = ({ route }: { route: { name: string } }): BottomTabNavigationOptions => ({
  tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name={iconByRoute[route.name] ?? 'ellipse'} size={size} color={color} />,
  freezeOnBlur: true,
  headerStyle: { backgroundColor: colors.bg, shadowColor: 'transparent' },
  headerShadowVisible: false,
  headerTitleStyle: { color: colors.ink, fontWeight: '900' },
  lazy: true,
  tabBarActiveTintColor: colors.teal,
  tabBarHideOnKeyboard: true,
  tabBarInactiveTintColor: colors.muted,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '800' },
  tabBarStyle: { backgroundColor: colors.surface, borderTopColor: 'transparent', elevation: 6, height: 70, paddingBottom: 10, paddingTop: 8 },
});

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
      <Tab.Screen name="Networks" component={NetworksScreen} options={{ title: 'الشبكات' }} />
      <Tab.Screen name="Map" component={MapScreen} options={{ title: 'الخريطة' }} />
      <Tab.Screen name="Wallet" component={WalletScreen} options={{ title: 'المحفظة' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'حسابي' }} />
    </Tab.Navigator>
  );
}

const stackOptions = {
  headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false,
  headerTitleStyle: { color: colors.ink, fontWeight: '900' }, headerTintColor: colors.teal,
  contentStyle: { backgroundColor: colors.bg },
} as const;

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
        <>
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: 'تسجيل الدخول إلى واصل', headerShown: false }}
          />
          <Stack.Screen
            name="SignUp"
            component={SignUpScreen}
            options={{ title: 'إنشاء حساب', headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: 'إعادة تعيين كلمة المرور', headerShown: false }}
          />
          <Stack.Screen
            name="PhoneAuth"
            component={PhoneAuthScreen}
            options={{ title: 'تسجيل الدخول بالهاتف', headerShown: false }}
          />
        </>
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
          <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} options={{ title: 'تعديل الملف الشخصي', headerShown: false }} />
          <Stack.Screen name="SecuritySettings" component={SecuritySettingsScreen} options={{ title: 'إعدادات الأمان', headerShown: false }} />
          <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ title: 'طرق الدفع' }} />
          <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ title: 'إيصال الدفع' }} />
          <Stack.Screen name="ReportIssue" component={ReportIssueScreen} options={{ title: 'الإبلاغ عن مشكلة' }} />
          <Stack.Screen name="DriverProfile" component={DriverProfileScreen} options={{ title: 'ملف السائق' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'الإعدادات' }} />
        </>
      )}
    </Stack.Navigator>
  );
});
