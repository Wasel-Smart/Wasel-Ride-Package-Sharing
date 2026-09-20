jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('../services/auth', () => ({
  mobileAuth: {
    restoreSession: jest.fn(),
  },
}));

jest.mock('../services/analytics', () => ({
  analyticsService: {
    logEvent: jest.fn(),
  },
}));

import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { mobileAuth } from '../services/auth';
import { analyticsService } from '../services/analytics';
import { biometricAuth } from '../services/biometricAuth';

const BIOMETRIC_KEY = 'wasel_biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'wasel_biometric_token';

describe('BiometricAuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('marks unsupported when hardware is missing, and does not read stored state', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);

      await biometricAuth.initialize();

      expect(biometricAuth.isSupported()).toBe(false);
      expect(biometricAuth.isEnabled()).toBe(false);
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('marks unsupported when hardware exists but nothing is enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      await biometricAuth.initialize();

      expect(biometricAuth.isSupported()).toBe(false);
      expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    });

    it('reads the stored enabled flag when supported', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');

      await biometricAuth.initialize();

      expect(biometricAuth.isSupported()).toBe(true);
      expect(biometricAuth.isEnabled()).toBe(true);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith(BIOMETRIC_KEY);
    });

    it('treats any non-"true" stored value as disabled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      await biometricAuth.initialize();

      expect(biometricAuth.isEnabled()).toBe(false);
    });
  });

  describe('enable', () => {
    beforeEach(async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
      await biometricAuth.initialize();
    });

    it('persists the enabled flag and logs an event on successful prompt', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      await biometricAuth.enable();

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(BIOMETRIC_KEY, 'true');
      expect(biometricAuth.isEnabled()).toBe(true);
      expect(analyticsService.logEvent).toHaveBeenCalledWith('biometric_enabled');
    });

    it('does not persist or flip state when the prompt is declined/fails', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      await biometricAuth.enable();

      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(biometricAuth.isEnabled()).toBe(false);
      expect(analyticsService.logEvent).not.toHaveBeenCalledWith('biometric_enabled');
    });
  });

  describe('disable', () => {
    it('clears both the enabled flag and any stored session token', async () => {
      await biometricAuth.disable();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(BIOMETRIC_KEY);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(BIOMETRIC_TOKEN_KEY);
      expect(biometricAuth.isEnabled()).toBe(false);
      expect(analyticsService.logEvent).toHaveBeenCalledWith('biometric_disabled');
    });
  });

  describe('authenticate', () => {
    it('short-circuits to false without prompting when not supported/enabled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      await biometricAuth.initialize();

      const result = await biometricAuth.authenticate();

      expect(result).toBe(false);
      expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    });

    it('returns true and logs success when the prompt succeeds', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      await biometricAuth.initialize();
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const result = await biometricAuth.authenticate();

      expect(result).toBe(true);
      expect(analyticsService.logEvent).toHaveBeenCalledWith('biometric_auth_success');
    });

    it('returns false and logs the failure reason when the prompt fails', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      await biometricAuth.initialize();
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'lockout',
      });

      const result = await biometricAuth.authenticate();

      expect(result).toBe(false);
      expect(analyticsService.logEvent).toHaveBeenCalledWith('biometric_auth_failed', {
        error: 'lockout',
      });
    });
  });

  describe('signInWithBiometrics', () => {
    beforeEach(async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      await biometricAuth.initialize();
    });

    it('returns false when the biometric prompt itself fails, without touching stored tokens', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: false });

      const result = await biometricAuth.signInWithBiometrics();

      expect(result).toBe(false);
      expect(mobileAuth.restoreSession).not.toHaveBeenCalled();
    });

    it('returns false when no session token was ever stored', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
        key === BIOMETRIC_TOKEN_KEY ? Promise.resolve(null) : Promise.resolve('true'),
      );

      const result = await biometricAuth.signInWithBiometrics();

      expect(result).toBe(false);
      expect(mobileAuth.restoreSession).not.toHaveBeenCalled();
    });

    it('returns false without throwing when the stored token is malformed JSON', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) =>
        key === BIOMETRIC_TOKEN_KEY ? Promise.resolve('not-json') : Promise.resolve('true'),
      );

      const result = await biometricAuth.signInWithBiometrics();

      expect(result).toBe(false);
      expect(mobileAuth.restoreSession).not.toHaveBeenCalled();
    });

    it('restores the session and returns true when everything lines up', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === BIOMETRIC_TOKEN_KEY) {
          return Promise.resolve(JSON.stringify({ accessToken: 'a', refreshToken: 'r' }));
        }
        return Promise.resolve('true');
      });
      (mobileAuth.restoreSession as jest.Mock).mockResolvedValue(true);

      const result = await biometricAuth.signInWithBiometrics();

      expect(result).toBe(true);
      expect(mobileAuth.restoreSession).toHaveBeenCalledWith({ accessToken: 'a', refreshToken: 'r' });
    });

    it('returns false when the token parses but the session restore itself fails', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      (SecureStore.getItemAsync as jest.Mock).mockImplementation((key: string) => {
        if (key === BIOMETRIC_TOKEN_KEY) {
          return Promise.resolve(JSON.stringify({ accessToken: 'a', refreshToken: 'r' }));
        }
        return Promise.resolve('true');
      });
      (mobileAuth.restoreSession as jest.Mock).mockResolvedValue(false);

      const result = await biometricAuth.signInWithBiometrics();

      expect(result).toBe(false);
    });
  });

  describe('storeSessionForBiometric', () => {
    it('does nothing when biometrics are unsupported or disabled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      await biometricAuth.initialize();

      await biometricAuth.storeSessionForBiometric('a', 'r');

      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('stores the token pair as JSON when supported and enabled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('true');
      await biometricAuth.initialize();

      await biometricAuth.storeSessionForBiometric('access-1', 'refresh-1');

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        BIOMETRIC_TOKEN_KEY,
        JSON.stringify({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
      );
    });
  });
});
