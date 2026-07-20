import type { Driver } from '../services/ride';

export type RootStackParamList = {
  SignIn: undefined;
  RateRide: { rideId: string; driverName: string; driverId?: string; tripId?: string };
  ReportIssue: { rideId?: string; driverName?: string };
  RateDriver: { route?: keyof RootStackParamList };
  Chat: { rideId: string; driverName: string; driverId?: string; tripId?: string };
  LiveTracking: { rideId: string };
  AdvancedSearch: undefined;
  ScheduledRide: undefined;
  Safety: undefined;
  Trips: undefined;
  Bus: undefined;
  Driver: undefined;
  Notifications: undefined;
  DriverProfile: { driverId: string; driver?: Driver };
};

export type RootStackRoute = keyof RootStackParamList;
