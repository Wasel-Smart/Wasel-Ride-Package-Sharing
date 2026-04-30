import { useEffect, useState } from 'react';
import { Shield, HelpCircle, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { toast } from 'sonner';

interface SecurityQuestion {
  id: string;
  question: string;
}

const SECURITY_QUESTIONS: SecurityQuestion[] = [
  { id: 'pet', question: 'auth.recovery.questions.pet' },
  { id: 'city', question: 'auth.recovery.questions.city' },
  { id: 'school', question: 'auth.recovery.questions.school' },
  { id: 'book', question: 'auth.recovery.questions.book' },
  { id: 'teacher', question: 'auth.recovery.questions.teacher' },
];

interface AccountRecoverySetupProps {
  userId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export function AccountRecoverySetup({ userId, onComplete, onSkip }: AccountRecoverySetupProps) {
  const { t } = useLanguage();
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>(['', '']);
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [backupEmail, setBackupEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!selectedQuestions[0] || !selectedQuestions[1] || !answers[0] || !answers[1]) {
      toast.error(t('auth.recovery.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const questions = await Promise.all(
        selectedQuestions.map(async (question, index) => ({
          question,
          answerHash: await hashAnswer(answers[index]),
        })),
      );

      // Store recovery options (in production, this would be encrypted and stored server-side)
      const recoveryData = {
        userId,
        questions,
        backupEmail: backupEmail || undefined,
        createdAt: new Date().toISOString(),
      };

      localStorage.setItem(`wasel_recovery_${userId}`, JSON.stringify(recoveryData));
      toast.success(t('auth.recovery.setupComplete'));
      onComplete();
    } catch {
      toast.error(t('auth.recovery.setupFailed'));
    } finally {
      setLoading(false);
    }
  };

  const hashAnswer = async (answer: string): Promise<string> => {
    const normalized = answer.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  return (
    <div className="auth-recovery-setup">
      <div className="auth-recovery-setup__header">
        <Shield size={32} />
        <h2>{t('auth.recovery.title')}</h2>
        <p>{t('auth.recovery.description')}</p>
      </div>

      <div className="auth-recovery-setup__form">
        <div className="auth-recovery-setup__section">
          <label>
            <HelpCircle size={16} />
            {t('auth.recovery.question1')}
          </label>
          <select
            value={selectedQuestions[0]}
            onChange={(e) => setSelectedQuestions([e.target.value, selectedQuestions[1]])}
            className="auth-recovery-setup__select"
          >
            <option value="">{t('auth.recovery.selectQuestion')}</option>
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q.id} value={q.id} disabled={selectedQuestions[1] === q.id}>
                {t(q.question)}
              </option>
            ))}
          </select>
          {selectedQuestions[0] && (
            <input
              type="text"
              value={answers[0]}
              onChange={(e) => setAnswers([e.target.value, answers[1]])}
              placeholder={t('auth.recovery.answerPlaceholder')}
              className="auth-recovery-setup__input"
            />
          )}
        </div>

        <div className="auth-recovery-setup__section">
          <label>
            <HelpCircle size={16} />
            {t('auth.recovery.question2')}
          </label>
          <select
            value={selectedQuestions[1]}
            onChange={(e) => setSelectedQuestions([selectedQuestions[0], e.target.value])}
            className="auth-recovery-setup__select"
          >
            <option value="">{t('auth.recovery.selectQuestion')}</option>
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q.id} value={q.id} disabled={selectedQuestions[0] === q.id}>
                {t(q.question)}
              </option>
            ))}
          </select>
          {selectedQuestions[1] && (
            <input
              type="text"
              value={answers[1]}
              onChange={(e) => setAnswers([answers[0], e.target.value])}
              placeholder={t('auth.recovery.answerPlaceholder')}
              className="auth-recovery-setup__input"
            />
          )}
        </div>

        <div className="auth-recovery-setup__section">
          <label>
            <Lock size={16} />
            {t('auth.recovery.backupEmail')} ({t('common.optional')})
          </label>
          <input
            type="email"
            value={backupEmail}
            onChange={(e) => setBackupEmail(e.target.value)}
            placeholder={t('auth.recovery.backupEmailPlaceholder')}
            className="auth-recovery-setup__input"
          />
        </div>
      </div>

      <div className="auth-recovery-setup__actions">
        <button
          onClick={handleSave}
          disabled={loading || !selectedQuestions[0] || !selectedQuestions[1] || !answers[0] || !answers[1]}
          className="auth-recovery-setup__button auth-recovery-setup__button--primary"
        >
          {loading ? t('common.saving') : t('auth.recovery.save')}
        </button>
        {onSkip && (
          <button
            onClick={onSkip}
            className="auth-recovery-setup__button auth-recovery-setup__button--secondary"
          >
            {t('auth.recovery.skip')}
          </button>
        )}
      </div>
    </div>
  );
}

export function AccountRecoveryVerify({ 
  userId, 
  onVerified, 
  onCancel 
}: { 
  userId: string; 
  onVerified: () => void; 
  onCancel: () => void;
}) {
  const { t } = useLanguage();
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<SecurityQuestion[]>([]);

  useEffect(() => {
    const recoveryData = localStorage.getItem(`wasel_recovery_${userId}`);
    if (recoveryData) {
      const parsed = JSON.parse(recoveryData);
      const qs = parsed.questions.map((q: { question: string }) =>
        SECURITY_QUESTIONS.find(sq => sq.id === q.question)
      ).filter(Boolean);
      setQuestions(qs);
    }
  }, [userId]);

  const hashAnswer = async (answer: string): Promise<string> => {
    const normalized = answer.toLowerCase().trim();
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');

    try {
      const recoveryData = localStorage.getItem(`wasel_recovery_${userId}`);
      if (!recoveryData) {
        setError(t('auth.recovery.noRecoveryData'));
        return;
      }

      const parsed = JSON.parse(recoveryData);
      const hashes = await Promise.all(answers.map(a => hashAnswer(a)));
      
      const isValid = hashes.every((hash, i) => hash === parsed.questions[i].answerHash);
      
      if (isValid) {
        toast.success(t('auth.recovery.verified'));
        onVerified();
      } else {
        setError(t('auth.recovery.incorrectAnswers'));
      }
    } catch {
      setError(t('auth.recovery.verificationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="auth-recovery-verify"
    >
      <Shield size={32} />
      <h3>{t('auth.recovery.verifyTitle')}</h3>
      <p>{t('auth.recovery.verifyDescription')}</p>

      {questions.map((q, i) => (
        <div key={i} className="auth-recovery-verify__question">
          <label>{t(q.question)}</label>
          <input
            type="text"
            value={answers[i]}
            onChange={(e) => {
              const newAnswers = [...answers];
              newAnswers[i] = e.target.value;
              setAnswers(newAnswers);
            }}
            placeholder={t('auth.recovery.answerPlaceholder')}
            className="auth-recovery-verify__input"
          />
        </div>
      ))}

      {error && <div className="auth-recovery-verify__error">{error}</div>}

      <div className="auth-recovery-verify__actions">
        <button
          onClick={handleVerify}
          disabled={loading || answers.some(a => !a)}
          className="auth-recovery-verify__button auth-recovery-verify__button--primary"
        >
          {loading ? t('common.verifying') : t('auth.recovery.verify')}
        </button>
        <button
          onClick={onCancel}
          className="auth-recovery-verify__button auth-recovery-verify__button--secondary"
        >
          {t('common.cancel')}
        </button>
      </div>
    </motion.div>
  );
}
