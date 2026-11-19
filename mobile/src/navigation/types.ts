import type { Driver } from '../services/ride';

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  PhoneAuth: undefined;
  ProfileEdit: undefined;
  SecuritySettings: undefined;
  RateRide: { rideId: string; driverName: string; driverId?: string; tripId?: string };
  ReportIssue: { rideId?: string; driverName?: string };
  Chat: { rideId: string; driverName: string; driverId?: string; tripId?: string };
  LiveTracking: { rideId: string };
  AdvancedSearch: undefined;
  ScheduledRide: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
  Tabs: undefined;
  Map: undefined;
  Networks: undefined;
  Wallet: undefined;
  Packages: undefined;
  DriverProfile: { driverId: string; driver?: Driver };
  PaymentMethods: undefined;
  Receipt: { paymentId: string };
  Settings: undefined;
  TrustCenter: undefined;
};

export type RootStackRoute = keyof RootStackParamList;
