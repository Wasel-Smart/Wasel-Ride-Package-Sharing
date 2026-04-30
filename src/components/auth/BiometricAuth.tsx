import { useState } from 'react';
import { Fingerprint, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';

interface BiometricAuthProps {
  userId: string;
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function BiometricAuth({ userId: _userId, onSuccess, onError }: BiometricAuthProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const isSupported = typeof window !== 'undefined' && 
    'credentials' in navigator && 
    'PublicKeyCredential' in window;

  const handleBiometricSignIn = async () => {
    if (!isSupported) {
      onError(t('auth.biometric.notSupported'));
      return;
    }

    setLoading(true);
    try {
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
        },
      });

      if (credential) {
        toast.success(t('auth.biometric.signInSuccess'));
        onSuccess();
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Biometric authentication failed';
      onError(error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="auth-biometric auth-biometric--unsupported">
        <Shield size={16} />
        <span>{t('auth.biometric.notAvailable')}</span>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleBiometricSignIn}
      disabled={loading}
      className="auth-biometric"
    >
      <Fingerprint size={20} />
      <span>{loading ? t('auth.biometric.verifying') : t('auth.biometric.signIn')}</span>
    </motion.button>
  );
}

export function BiometricSetup({ userId, onComplete }: { userId: string; onComplete: () => void }) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: { name: 'Wasel', id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: 'Wasel User',
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },
            { alg: -257, type: 'public-key' },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
          },
          timeout: 60000,
          attestation: 'none',
        },
      });

      if (credential) {
        localStorage.setItem(`wasel_biometric_${userId}`, 'enabled');
        toast.success(t('auth.biometric.setupComplete'));
        onComplete();
      }
    } catch {
      toast.error(t('auth.biometric.setupFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-biometric-setup">
      <div className="auth-biometric-setup__icon">
        <Fingerprint size={48} />
      </div>
      <h3>{t('auth.biometric.setupTitle')}</h3>
      <p>{t('auth.biometric.setupDescription')}</p>
      <button
        onClick={handleSetup}
        disabled={loading}
        className="auth-biometric-setup__button"
      >
        {loading ? t('auth.biometric.setting') : t('auth.biometric.enable')}
      </button>
    </div>
  );
}
