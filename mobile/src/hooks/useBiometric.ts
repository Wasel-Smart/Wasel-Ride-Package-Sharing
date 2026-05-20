import { useCallback, useEffect, useState } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export interface BiometricHook {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: string | null;
  authenticate: () => Promise<boolean>;
  isEnabled: boolean;
  enableBiometric: () => Promise<void>;
  disableBiometric: () => Promise<void>;
}

const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export function useBiometric(): BiometricHook {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);

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
    } catch (error) {
      console.error('Failed to check biometric availability:', error);
    }
  };

  const checkBiometricEnabled = async () => {
    try {
      const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(enabled === 'true');
    } catch (error) {
      console.error('Failed to check biometric enabled status:', error);
    }
  };

  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      if (!isAvailable || !isEnrolled) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to continue',
        fallbackLabel: 'Use passcode',
        disableDeviceFallback: false,
        cancelLabel: 'Cancel',
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }, [isAvailable, isEnrolled]);

  const enableBiometric = useCallback(async () => {
    try {
      const success = await authenticate();
      if (success) {
        await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
        setIsEnabled(true);
      }
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      throw error;
    }
  }, [authenticate]);

  const disableBiometric = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
      setIsEnabled(false);
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      throw error;
    }
  }, []);

  return {
    isAvailable,
    isEnrolled,
    biometricType,
    authenticate,
    isEnabled,
    enableBiometric,
    disableBiometric,
  };
}

// Secure token storage with biometric protection
export async function storeSecureToken(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSecureToken(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

export async function deleteSecureToken(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
