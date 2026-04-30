import { useState } from 'react';
import { Shield, Copy, Check, Download, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { enable2FA, verify2FACode } from '../../utils/security';
import { toast } from 'sonner';

interface TwoFactorSetupProps {
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function TwoFactorSetup({ userId, onComplete, onSkip }: TwoFactorSetupProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup'>('intro');
  const [loading, setLoading] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const setup = await enable2FA(userId);
      setSecret(setup.secret);
      setQrUrl(setup.otpauthUrl);
      setBackupCodes(setup.backupCodes);
      setStep('setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup 2FA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) {
      setError(t('auth.twoFactor.invalidCode'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      const isValid = await verify2FACode(userId, verificationCode);
      if (isValid) {
        setStep('backup');
      } else {
        setError(t('auth.twoFactor.verificationFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success(t('auth.twoFactor.secretCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const content = backupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wasel-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('auth.twoFactor.backupCodesDownloaded'));
  };

  return (
    <div className="auth-2fa-setup">
      <AnimatePresence mode="wait">
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="auth-2fa-setup__intro"
          >
            <div className="auth-2fa-setup__icon">
              <Shield size={48} />
            </div>
            <h2>{t('auth.twoFactor.title')}</h2>
            <p>{t('auth.twoFactor.description')}</p>
            
            <div className="auth-2fa-setup__benefits">
              <div className="auth-2fa-setup__benefit">
                <Check size={16} />
                <span>{t('auth.twoFactor.benefit1')}</span>
              </div>
              <div className="auth-2fa-setup__benefit">
                <Check size={16} />
                <span>{t('auth.twoFactor.benefit2')}</span>
              </div>
              <div className="auth-2fa-setup__benefit">
                <Check size={16} />
                <span>{t('auth.twoFactor.benefit3')}</span>
              </div>
            </div>

            <div className="auth-2fa-setup__actions">
              <button
                onClick={handleStartSetup}
                disabled={loading}
                className="auth-2fa-setup__button auth-2fa-setup__button--primary"
              >
                {loading ? t('common.loading') : t('auth.twoFactor.enable')}
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="auth-2fa-setup__button auth-2fa-setup__button--secondary"
                >
                  {t('auth.twoFactor.skip')}
                </button>
              )}
            </div>
          </motion.div>
        )}

        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="auth-2fa-setup__qr"
          >
            <h3>{t('auth.twoFactor.scanQR')}</h3>
            <p>{t('auth.twoFactor.scanInstructions')}</p>

            <div className="auth-2fa-setup__qr-code">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`}
                alt="2FA QR Code"
              />
            </div>

            <div className="auth-2fa-setup__secret">
              <label>{t('auth.twoFactor.manualEntry')}</label>
              <div className="auth-2fa-setup__secret-box">
                <code>{secret}</code>
                <button onClick={handleCopySecret} className="auth-2fa-setup__copy">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="auth-2fa-setup__button auth-2fa-setup__button--primary"
            >
              {t('auth.twoFactor.continue')}
            </button>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="auth-2fa-setup__verify"
          >
            <h3>{t('auth.twoFactor.verifyTitle')}</h3>
            <p>{t('auth.twoFactor.verifyInstructions')}</p>

            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="auth-2fa-setup__code-input"
              maxLength={6}
              autoFocus
            />

            {error && (
              <div className="auth-2fa-setup__error">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={loading || verificationCode.length !== 6}
              className="auth-2fa-setup__button auth-2fa-setup__button--primary"
            >
              {loading ? t('common.verifying') : t('auth.twoFactor.verify')}
            </button>
          </motion.div>
        )}

        {step === 'backup' && (
          <motion.div
            key="backup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="auth-2fa-setup__backup"
          >
            <div className="auth-2fa-setup__icon auth-2fa-setup__icon--success">
              <Check size={48} />
            </div>
            <h3>{t('auth.twoFactor.backupTitle')}</h3>
            <p>{t('auth.twoFactor.backupInstructions')}</p>

            <div className="auth-2fa-setup__backup-codes">
              {backupCodes.map((code, index) => (
                <div key={index} className="auth-2fa-setup__backup-code">
                  <code>{code}</code>
                </div>
              ))}
            </div>

            <button
              onClick={handleDownloadBackupCodes}
              className="auth-2fa-setup__button auth-2fa-setup__button--secondary"
            >
              <Download size={16} />
              {t('auth.twoFactor.downloadCodes')}
            </button>

            <button
              onClick={onComplete}
              className="auth-2fa-setup__button auth-2fa-setup__button--primary"
            >
              {t('auth.twoFactor.complete')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function TwoFactorPrompt({ userId, onVerified, onCancel }: {
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setLoading(true);
    setError('');
    try {
      const isValid = await verify2FACode(userId, code);
      if (isValid) {
        onVerified();
      } else {
        setError(t('auth.twoFactor.invalidCode'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-2fa-prompt">
      <Shield size={32} />
      <h3>{t('auth.twoFactor.promptTitle')}</h3>
      <p>{t('auth.twoFactor.promptDescription')}</p>

      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        className="auth-2fa-prompt__input"
        maxLength={6}
        autoFocus
      />

      {error && <div className="auth-2fa-prompt__error">{error}</div>}

      <div className="auth-2fa-prompt__actions">
        <button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="auth-2fa-prompt__button auth-2fa-prompt__button--primary"
        >
          {loading ? t('common.verifying') : t('auth.twoFactor.verify')}
        </button>
        <button
          onClick={onCancel}
          className="auth-2fa-prompt__button auth-2fa-prompt__button--secondary"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
