import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface BiometricHook {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: string | null;
  /** Prompt the user; accepts optional prompt message string. */
  authenticate: (promptMessage?: string) => Promise<BiometricResult>;
  isEnabled: boolean;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export function useBiometric(): BiometricHook {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled]   = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isEnabled, setIsEnabled]     = useState(false);

  useEffect(() => {
    checkBiometricAvailability();
    checkBiometricEnabled();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsAvailable(compatible);
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          setBiometricType('Iris');
        }
      }
    } catch (err) {
      console.error('Biometric availability check failed:', err);
    }
  };

  const checkBiometricEnabled = async () => {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled === 'true');
    } catch {
      // ignore
    }
  };

  const authenticate = useCallback(
    async (promptMessage = 'Authenticate to continue'): Promise<BiometricResult> => {
      try {
        if (!isAvailable || !isEnrolled) {
          return { success: false, error: 'Biometrics not available on this device' };
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage,
          fallbackLabel: 'Use passcode',
          disableDeviceFallback: false,
          cancelLabel: 'Cancel',
        });
        if (result.success) return { success: true };
        return { success: false, error: 'Authentication cancelled' };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Authentication failed' };
      }
    },
    [isAvailable, isEnrolled]
  );

  const enableBiometric = useCallback(async () => {
    const result = await authenticate('Enable biometric sign-in');
    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      setIsEnabled(true);
    } else {
      throw new Error(result.error ?? 'Failed to enable biometric');
    }
  }, [authenticate]);

  const disableBiometric = useCallback(async () => {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
    setIsEnabled(false);
  }, []);

  return { isAvailable, isEnrolled, biometricType, authenticate, isEnabled, enableBiometric, disableBiometric };
}

// ── Secure token helpers ────────────────────────────────────────────────────
export async function storeSecureToken(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSecureToken(key: string): Promise<string | null> {
  return SecureStore.getItemAsync(key);
}

export async function deleteSecureToken(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
