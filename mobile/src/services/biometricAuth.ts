/**
 * Biometric Authentication Service
 */
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { mobileAuth } from './auth';
import { analyticsService } from './analytics';

const BIOMETRIC_KEY = 'wasel_biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'wasel_biometric_token';

class BiometricAuthService {
  private supported = false;
  private enabled = false;

  async initialize(): Promise<void> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    this.supported = compatible && enrolled;

    if (this.supported) {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_KEY);
      this.enabled = stored === 'true';
    }
  }

  isSupported(): boolean {
    return this.supported;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async enable(): Promise<void> {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable biometric login for Wasel',
      disableFallback: true,
    });

    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_KEY, 'true');
      this.enabled = true;
      analyticsService.logEvent('biometric_enabled');
    }
  }

  async disable(): Promise<void> {
    await SecureStore.deleteItemAsync(BIOMETRIC_KEY);
    await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
    this.enabled = false;
    analyticsService.logEvent('biometric_disabled');
  }

  async authenticate(): Promise<boolean> {
    if (!this.supported || !this.enabled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to Wasel',
      cancelLabel: 'Use password',
      disableFallback: false,
    });

    if (result.success) {
      analyticsService.logEvent('biometric_auth_success');
      return true;
    }

    analyticsService.logEvent('biometric_auth_failed', {
      error: result.error ?? 'unknown',
    });
    return false;
  }

  async signInWithBiometrics(): Promise<boolean> {
    const authenticated = await this.authenticate();
    if (!authenticated) {
      return false;
    }

    const session = await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY);
    if (!session) return false;

    try {
      const token = JSON.parse(session) as {
        accessToken: string;
        refreshToken: string;
      };

      const restored = await mobileAuth.restoreSession?.(token);
      return restored ?? false;
    } catch {
      return false;
    }
  }

  async storeSessionForBiometric(accessToken: string, refreshToken: string): Promise<void> {
    if (!this.supported || !this.enabled) return;

    await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, JSON.stringify({
      accessToken,
      refreshToken,
    }));
  }
}

export const biometricAuth = new BiometricAuthService();