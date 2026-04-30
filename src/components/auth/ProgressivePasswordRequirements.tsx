import { useMemo } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { checkPasswordStrength } from '../../utils/security';

interface ProgressivePasswordRequirementsProps {
  password: string;
  showOnFocus?: boolean;
  isFocused?: boolean;
}

export function ProgressivePasswordRequirements({ 
  password, 
  showOnFocus = false,
  isFocused = true 
}: ProgressivePasswordRequirementsProps) {
  const { t } = useLanguage();

  const analysis = useMemo(() => {
    const strength = checkPasswordStrength(password);
    
    return {
      strength,
      requirements: [
        {
          key: 'length',
          label: t('authPage.password.requirements.length'),
          met: password.length >= 8,
          critical: true,
        },
        {
          key: 'uppercase',
          label: t('authPage.password.requirements.uppercase'),
          met: /[A-Z]/.test(password),
          critical: true,
        },
        {
          key: 'lowercase',
          label: t('authPage.password.requirements.lowercase'),
          met: /[a-z]/.test(password),
          critical: true,
        },
        {
          key: 'number',
          label: t('authPage.password.requirements.number'),
          met: /[0-9]/.test(password),
          critical: true,
        },
        {
          key: 'special',
          label: t('authPage.password.requirements.special'),
          met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
          critical: true,
        },
        {
          key: 'length12',
          label: t('authPage.password.requirements.length12'),
          met: password.length >= 12,
          critical: false,
        },
        {
          key: 'noCommon',
          label: t('authPage.password.requirements.noCommon'),
          met: !/password|123456|qwerty|admin|letmein/i.test(password),
          critical: false,
        },
        {
          key: 'noRepeat',
          label: t('authPage.password.requirements.noRepeat'),
          met: !/(.)\\1{2,}/.test(password),
          critical: false,
        },
      ],
    };
  }, [password, t]);

  const feedbackItems = useMemo(
    () =>
      analysis.strength.feedback.filter((feedback) => {
        const normalizedFeedback = feedback.trim().toLowerCase();
        return !analysis.requirements.some(
          (req) => req.label.trim().toLowerCase() === normalizedFeedback,
        );
      }),
    [analysis.requirements, analysis.strength.feedback],
  );

  const shouldShow = !showOnFocus || (showOnFocus && isFocused && password.length > 0);

  if (!shouldShow) return null;

  const criticalMet = analysis.requirements.filter(r => r.critical && r.met).length;
  const criticalTotal = analysis.requirements.filter(r => r.critical).length;
  const progress = (criticalMet / criticalTotal) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="progressive-password-requirements"
      >
        <div className="progressive-password-requirements__header">
          <span className="progressive-password-requirements__title">
            {t('authPage.password.strengthTitle')}
          </span>
          <span className={`progressive-password-requirements__score progressive-password-requirements__score--${analysis.strength.score}`}>
            {t(`authPage.password.strength.${['weak', 'weak', 'fair', 'good', 'strong'][analysis.strength.score]}`)}
          </span>
        </div>

        <div className="progressive-password-requirements__progress">
          <motion.div
            className="progressive-password-requirements__progress-bar"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
            style={{
              width: `${progress}%`,
              backgroundColor: 
                progress === 100 ? '#10b981' :
                progress >= 60 ? '#eab308' :
                '#ef4444'
            }}
          />
        </div>

        <div className="progressive-password-requirements__list">
          {analysis.requirements.map((req) => (
            <motion.div
              key={req.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`progressive-password-requirements__item ${
                req.met ? 'is-met' : password.length > 0 ? 'is-unmet' : ''
              } ${req.critical ? 'is-critical' : 'is-optional'}`}
            >
              <span className="progressive-password-requirements__icon">
                {req.met ? (
                  <Check size={14} />
                ) : password.length > 0 ? (
                  <X size={14} />
                ) : (
                  <AlertCircle size={14} />
                )}
              </span>
              <span className="progressive-password-requirements__label">
                {req.label}
                {!req.critical && (
                  <span className="progressive-password-requirements__badge">
                    {t('common.optional')}
                  </span>
                )}
              </span>
            </motion.div>
          ))}
        </div>

        {feedbackItems.length > 0 && password.length > 0 && (
          <div className="progressive-password-requirements__feedback">
            {feedbackItems.map((feedback, i) => (
              <div key={i} className="progressive-password-requirements__feedback-item">
                <AlertCircle size={12} />
                {feedback}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
