/**
 * Analytics Service - Firebase Analytics + Sentry Integration
 */
import analytics from '@react-native-firebase/analytics';
import crashlytics from '@react-native-firebase/crashlytics';
import { Platform } from 'react-native';

interface AnalyticsEvent {
  name: string;
  params?: Record<string, string | number | boolean | null> | undefined;
}

interface CrashContext {
  screen?: string;
  action?: string;
  userId?: string;
}

class AnalyticsService {
  private enabled = true;
  private eventQueue: AnalyticsEvent[] = [];
  private isOnline = true;

  initialize(): void {
    if (!this.enabled) return;

    analytics()
      .setAnalyticsCollectionEnabled(true)
      .catch(console.error);
  }

  setUserId(userId: string): void {
    if (!this.enabled) return;
    analytics().setUserId(userId).catch(console.error);
    crashlytics().setAttribute('user_id', userId).catch(console.error);
  }

  setCurrentScreen(screenName: string): void {
    if (!this.enabled) return;
    analytics().logScreen(screenName).catch(console.error);
  }

  logEvent(name: string, params?: Record<string, string | number | boolean | null>): void {
    const event: AnalyticsEvent = { name, params };

    if (!this.enabled) return;
    if (!this.isOnline) {
      this.eventQueue.push(event);
      return;
    }

    analytics().logEvent(name, params).catch(console.error);
  }

  logRideRequested(origin: string, destination: string): void {
    this.logEvent('ride_requested', {
      origin,
      destination,
      platform: Platform.OS,
    });
  }

  logDriverMatched(driverId: string, eta: string): void {
    this.logEvent('driver_matched', { driverId, eta });
  }

  logRideStarted(rideId: string): void {
    this.logEvent('ride_started', { rideId });
  }

  logRideCompleted(rideId: string, fare: number): void {
    this.logEvent('ride_completed', { rideId, fare });
  }

  logPaymentSuccess(paymentId: string, amount: number): void {
    this.logEvent('payment_success', { paymentId, amount });
  }

  logPaymentFailed(error: string, retryable: boolean): void {
    this.logEvent('payment_failed', { error, retryable });
  }

  logLoginSuccess(method: string): void {
    this.logEvent('login_success', { method });
  }

  logLoginFailed(error: string): void {
    this.logEvent('login_failed', { error });
  }

  logNotificationReceived(type: string): void {
    this.logEvent('notification_received', { type });
  }

  setAttribute(key: string, value: string): void {
    crashlytics().setAttribute(key, value).catch(console.error);
  }

  recordCrash(error: Error, context?: CrashContext): void {
    if (context?.screen) {
      crashlytics().setAttribute('screen', context.screen);
    }
    if (context?.action) {
      crashlytics().setAttribute('action', context.action);
    }
    crashlytics().recordError(error);
  }

  async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    for (const event of this.eventQueue) {
      await analytics().logEvent(event.name, event.params).catch(console.error);
    }
    this.eventQueue = [];
  }
}

export const analyticsService = new AnalyticsService();

// Auto-initialize
analyticsService.initialize();