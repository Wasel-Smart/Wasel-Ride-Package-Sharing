import { useState } from 'react';
import { Mail, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../utils/supabase/client';
import { validateEmail } from '../../utils/security';
import { normalizeEmailInput } from '../../utils/authHelpers';

interface MagicLinkAuthProps {
  onSuccess: (email: string) => void;
  returnTo?: string;
}

export function MagicLinkAuth({ onSuccess, returnTo }: MagicLinkAuthProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const normalized = normalizeEmailInput(email);
    if (!validateEmail(normalized)) {
      setError(t('authPage.errors.invalidEmail'));
      return;
    }

    setLoading(true);
    try {
      if (!supabase) throw new Error('Auth not configured');
      
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: normalized,
        options: {
          emailRedirectTo: returnTo || window.location.origin + '/app',
        },
      });

      if (magicLinkError) throw magicLinkError;
      onSuccess(normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="auth-magic-link"
    >
      <div className="auth-magic-link__header">
        <Sparkles size={20} />
        <h3>{t('auth.magicLink.title')}</h3>
      </div>
      <p className="auth-magic-link__description">
        {t('auth.magicLink.description')}
      </p>
      
      <form onSubmit={handleSendMagicLink} className="auth-magic-link__form">
        <div className="auth-field">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('authPage.fields.email.placeholder')}
            className="auth-field__input"
            disabled={loading}
            required
          />
          <Mail size={16} className="auth-field__icon" />
        </div>
        
        {error && <div className="auth-magic-link__error">{error}</div>}
        
        <button
          type="submit"
          disabled={loading || !email}
          className="auth-magic-link__submit"
        >
          {loading ? t('auth.magicLink.sending') : t('auth.magicLink.send')}
        </button>
      </form>
    </motion.div>
  );
}
