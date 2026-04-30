import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MapPinned,
  Package,
  Phone,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { WaselHeroMark, WaselLogo } from '../components/wasel-ds/WaselLogo';
import { useLanguage } from '../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { useAuthProviderAvailability } from '../hooks/useAuthProviderAvailability';
import { APP_ROUTES } from '../router/paths';
import { checkPasswordStrength, checkRateLimit, validateEmail } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { getAuthPersistencePreference, setAuthPersistencePreference } from '../utils/authStorage';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';
import {
  type PasswordRequirement,
  friendlyAuthError,
  getPasswordRequirements,
  normalizeEmailInput,
  pwStrength,
} from '../utils/authHelpers';
import { normalizeAuthReturnTo } from '../utils/authFlow';
import { WaselAuthNetworkMap } from './shared/WaselAuthNetworkMap';
import './WaselAuth.css';

type Tab = 'signin' | 'signup';
type PendingAction = 'google' | 'facebook' | 'reset' | 'whatsapp' | null;

const PASSWORD_REQUIREMENT_LABEL_KEYS: Record<PasswordRequirement['key'], string> = {
  length: 'authPage.password.requirements.length',
  lowercase: 'authPage.password.requirements.lowercase',
  uppercase: 'authPage.password.requirements.uppercase',
  number: 'authPage.password.requirements.number',
  special: 'authPage.password.requirements.special',
};

const PASSWORD_STRENGTH_LABEL_KEYS = [
  '',
  'authPage.password.strength.weak',
  'authPage.password.strength.fair',
  'authPage.password.strength.good',
  'authPage.password.strength.strong',
  'authPage.password.strength.excellent',
] as const;

const RETURN_LABEL_KEYS: Array<[string, string]> = [
  [APP_ROUTES.findRide.full, 'authPage.returnLabels.findRide'],
  [APP_ROUTES.offerRide.full, 'authPage.returnLabels.offerRide'],
  [APP_ROUTES.packages.full, 'authPage.returnLabels.packages'],
  [APP_ROUTES.wallet.full, 'authPage.returnLabels.wallet'],
  [APP_ROUTES.payments.full, 'authPage.returnLabels.payments'],
];

function interpolate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
}

function translateAuthErrorMessage(t: (key: string) => string, message: string): string {
  const normalized = message.trim();
  const map: Record<string, string> = {
    'Incorrect email or password.': t('authPage.errors.invalidCredentials'),
    'Please confirm your email before signing in.': t('authPage.errors.confirmEmailBeforeSignIn'),
    'This account is temporarily locked. Please wait a little and try again, or contact support if this keeps happening.':
      t('authPage.errors.accountLocked'),
    'This account is currently disabled. Please contact support for help.':
      t('authPage.errors.accountDisabled'),
    'An account with this email already exists. Sign in instead, or reset your password if you need access.':
      t('authPage.errors.accountAlreadyExists'),
    'Choose a stronger password with at least 8 characters, plus uppercase, lowercase, a number, and a symbol.':
      t('authPage.errors.weakPassword'),
    'Enter a valid email address.': t('authPage.errors.invalidEmail'),
    'Too many attempts right now. Please wait a moment and try again.':
      t('authPage.errors.rateLimited'),
    'Account creation is blocked by the current Supabase signup trigger. Apply the latest auth signup migration, then try again.':
      t('authPage.errors.signupUnavailable'),
    'This sign-in option is not available in this environment.':
      t('authPage.errors.providerUnavailable'),
    'Sign-in was canceled before it finished. Please try again when you are ready.':
      t('authPage.errors.signInCancelled'),
    'Your social account did not share an email address, so we could not finish sign-in.':
      t('authPage.errors.socialMissingEmail'),
    'This email is already linked to a different sign-in method. Use the original provider or email sign-in for this account.':
      t('authPage.errors.differentProvider'),
    'This sign-in link has expired or is no longer valid. Please start again from the sign-in page.':
      t('authPage.errors.expiredSignInLink'),
    'We could not reach the server. Check your connection and try again.':
      t('authPage.errors.networkUnavailable'),
    'Authentication is not configured for this environment yet.':
      t('authPage.errors.authNotConfigured'),
  };

  return map[normalized] ?? normalized;
}

function getRememberMe(): boolean {
  return getAuthPersistencePreference();
}

function setRememberMe(remember: boolean): void {
  setAuthPersistencePreference(remember);
}

function PasswordRequirementsVisible() {
  const { t } = useLanguage();

  return (
    <div className="auth-password-requirements">
      <div className="auth-password-requirements__title">
        <Shield size={12} />
        {t('authPage.password.title')}
      </div>
      <div className="auth-password-requirements__list">
        <div className="auth-password-requirements__item">{t('authPage.password.requirements.length')}</div>
        <div className="auth-password-requirements__item">{t('authPage.password.requirements.uppercase')}</div>
        <div className="auth-password-requirements__item">{t('authPage.password.requirements.lowercase')}</div>
        <div className="auth-password-requirements__item">{t('authPage.password.requirements.number')}</div>
        <div className="auth-password-requirements__item">{t('authPage.password.requirements.special')}</div>
      </div>
    </div>
  );
}

function RememberMeCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useLanguage();

  return (
    <label className="auth-remember-me">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="auth-remember-me__checkbox"
      />
      <span className="auth-remember-me__checkmark" />
      <span className="auth-remember-me__label">{t('auth.rememberMe')}</span>
    </label>
  );
}

const BRAND_FEATURES = [
  { icon: <MapPinned size={14} />, key: 'authPage.hero.features.cityPairs' },
  { icon: <Package size={14} />, key: 'authPage.hero.features.overlays' },
  { icon: <Shield size={14} />, key: 'authPage.hero.features.routing' },
] as const;

const HERO_METRICS = [
  { value: '12', key: 'authPage.hero.metrics.cityNodes' },
  { value: '27', key: 'authPage.hero.metrics.smartCorridors' },
  { value: '24/7', key: 'authPage.hero.metrics.rebalancing' },
] as const;

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  description?: string;
  error?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  onChange: (value: string) => void;
}

function AuthField({
  label,
  description,
  error,
  hint,
  icon,
  type = 'text',
  onChange,
  id,
  ...rest
}: AuthFieldProps) {
  const { t } = useLanguage();
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={`auth-field${focused ? ' is-focused' : ''}${error ? ' is-error' : ''}`}>
      <span className="auth-field__meta">
        <label className="auth-field__label" htmlFor={id}>
          {label}
        </label>
        {description ? <span className="auth-field__description">{description}</span> : null}
      </span>

      <span className="auth-field__control">
        {icon ? <span className="auth-field__icon">{icon}</span> : null}
        <input
          {...rest}
          id={id}
          type={resolvedType}
          className="auth-field__input"
          aria-invalid={Boolean(error)}
          onChange={event => onChange(event.target.value)}
          onFocus={event => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={event => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
        />
        {isPassword ? (
          <button
            type="button"
            className="auth-field__toggle"
            aria-label={showPassword ? t('authPage.password.hide') : t('authPage.password.show')}
            onClick={() => setShowPassword(current => !current)}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </span>

      {error ? <span className="auth-field__error">{error}</span> : null}
      {hint && !error ? <div className="auth-field__hint">{hint}</div> : null}
    </div>
  );
}

function BrandPanel({ tab, returnLabel }: { tab: Tab; returnLabel: string }) {
  const { t } = useLanguage();

  return (
    <div className="auth-landing__hero-panel">
      <div className="auth-landing__hero-scrim" aria-hidden="true" />
      <div className="auth-landing__hero-orb auth-landing__hero-orb--one" aria-hidden="true" />
      <div className="auth-landing__hero-orb auth-landing__hero-orb--two" aria-hidden="true" />
      <div className="auth-landing__hero-mark" aria-hidden="true">
        <WaselHeroMark size={136} />
      </div>

        <div className="auth-landing__hero-copy">
          <div className="auth-landing__hero-intro">
            <div className="auth-landing__eyebrow">
              <Sparkles size={15} />
              {t('authPage.hero.eyebrow')}
            </div>

            <WaselLogo
            size={50}
            theme="auto"
            variant="full"
            showWordmark
            subtitle=""
            framed={false}
          />

          <h1 className="auth-landing__hero-title">
            {t('authPage.hero.title')}
          </h1>

          <p className="auth-landing__hero-body">
            {tab === 'signin'
              ? t('authPage.hero.signInBody')
              : t('authPage.hero.signUpBody')}
          </p>

          <div className="auth-landing__hero-utility">
            <div className="auth-landing__hero-signal">
              <MapPinned size={16} />
              {interpolate(t('authPage.hero.returnCorridor'), {
                returnLabel: returnLabel || t('authPage.returnLabels.findRide'),
              })}
            </div>

            <div className="auth-landing__hero-metrics">
              {HERO_METRICS.map(metric => (
                <div key={metric.key} className="auth-landing__hero-metric">
                  <strong>{metric.value}</strong>
                  <span>{t(metric.key)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="auth-landing__hero-stage">
          <WaselAuthNetworkMap />
        </div>

        <div className="auth-landing__trust-row">
          {BRAND_FEATURES.map(item => (
            <div key={item.key} className="auth-landing__trust-chip">
              <span className="auth-landing__trust-icon">{item.icon}</span>
              <span>{t(item.key)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const { t } = useLanguage();
  const strength = pwStrength(password);

  if (!password) return null;

  const toneClass =
    strength.score <= 1
      ? 'auth-strength--weak'
      : strength.score === 2
        ? 'auth-strength--fair'
        : strength.score === 3
          ? 'auth-strength--good'
          : 'auth-strength--strong';

  return (
    <div className={`auth-strength auth-strength--score-${strength.score} ${toneClass}`}>
      <div className="auth-strength__bars">
        {[1, 2, 3, 4, 5].map(value => (
          <div key={value} className="auth-strength__bar" />
        ))}
      </div>
      {strength.score > 0 ? (
        <span className="auth-strength__label">
          {t(PASSWORD_STRENGTH_LABEL_KEYS[Math.min(strength.score, 5)])}
        </span>
      ) : null}
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const { t } = useLanguage();
  const requirements = getPasswordRequirements(password);

  return (
    <div className="auth-password-checklist">
      {requirements.map(requirement => (
        <div
          key={requirement.key}
          className={`auth-password-checklist__item${requirement.met ? ' is-met' : ''}`}
        >
          <span className="auth-password-checklist__dot" />
          <span>{t(PASSWORD_REQUIREMENT_LABEL_KEYS[requirement.key])}</span>
        </div>
      ))}
    </div>
  );
}

function TabSwitcher({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const { t } = useLanguage();

  return (
    <div className="auth-landing__tabs" role="tablist" aria-label={t('authPage.tabs.ariaLabel')}>
      {(['signin', 'signup'] as Tab[]).map(value => {
        const active = tab === value;

        return (
          <motion.button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={
              value === 'signin'
                ? t('authPage.tabs.switchToSignIn')
                : t('authPage.tabs.switchToCreateAccount')
            }
            whileTap={{ scale: 0.98 }}
            className={`auth-landing__tab${active ? ' is-active' : ''}`}
            onClick={() => onChange(value)}
          >
            {value === 'signin' ? t('authPage.tabs.signIn') : t('authPage.tabs.createAccount')}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function WaselAuth() {
  const { t, dir } = useLanguage();
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab')?.toLowerCase();
  const initialTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
  const passwordResetCompleted = params.get('reset') === 'success';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [notice, setNotice] = useState('');
  const [rememberMe, setRememberMeState] = useState(getRememberMe);

  const {
    signIn,
    signUp,
    resetPassword,
    signInWithGoogle,
    signInWithFacebook,
    loading,
    user,
  } = useAuth();
  const authProviders = useAuthProviderAvailability();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { supportWhatsAppNumber } = getConfig();

  const safeReturnTo = normalizeAuthReturnTo(params.get('returnTo'), APP_ROUTES.findRide.full);

  const returnLabel = useMemo(() => {
    const [path] = safeReturnTo.split('?');
    const cleaned = path
      .replace(/^\/app\//, '')
      .replace(/^\/+/, '')
      .replace(/-/g, ' ')
      .replace(/\//g, ' ')
      .trim();

    if (!cleaned) return t('authPage.returnLabels.findRide');

    const fallbackLabel = cleaned.replace(/\b\w/g, letter => letter.toUpperCase());
    const matchedKey = RETURN_LABEL_KEYS.find(([route]) => route === path)?.[1];
    return matchedKey ? t(matchedKey) : fallbackLabel;
  }, [safeReturnTo, t]);

  const normalizedEmail = useMemo(() => normalizeEmailInput(email), [email]);
  const normalizedPhone = useMemo(() => phone.trim().replace(/[^\d+]/g, ''), [phone]);
  const isBusy = loading || pendingAction !== null || success;
  const supportUrl = useMemo(
    () => getWhatsAppSupportUrl(t('authPage.social.whatsAppGreeting')),
    [t],
  );

  const validatePhoneNumber = (value: string): string | null => {
    if (!value) return null;
    if (value.length < 8) return t('authPage.errors.invalidPhone');
    return null;
  };

  const validateFullNameField = (value: string): string | null => {
    const trimmed = value.trim().replace(/\s+/g, ' ');
    if (!trimmed) return t('authPage.errors.enterFullName');
    if (trimmed.length < 2) return t('authPage.errors.fullNameTooShort');
    return null;
  };

  const validatePasswordField = (value: string): string | null => {
    if (!value) return t('authPage.errors.enterPassword');
    if (!checkPasswordStrength(value).isValid) return t('authPage.errors.weakPassword');
    return null;
  };

  const nameError = tab === 'signup' && name.trim() ? validateFullNameField(name) : '';
  const emailError =
    normalizedEmail && !validateEmail(normalizedEmail) ? t('authPage.errors.invalidEmail') : '';
  const passwordError = tab === 'signup' && password ? (validatePasswordField(password) ?? '') : '';
  const phoneError =
    tab === 'signup' && phone.trim() ? (validatePhoneNumber(normalizedPhone) ?? '') : '';
  const hasSocialButtons =
    authProviders.google.enabled || authProviders.facebook.enabled || authProviders.whatsapp.enabled;
  const hasOAuthButtons = authProviders.google.enabled || authProviders.facebook.enabled;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const nextTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
    setTab(current => (current === nextTab ? current : nextTab));
  }, [rawTab]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    next.set('tab', tab);
    next.set('returnTo', safeReturnTo);
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, safeReturnTo, setParams, tab]);

  useEffect(() => {
    if (user && mountedRef.current) nav(safeReturnTo);
  }, [user, nav, safeReturnTo]);

  useEffect(() => {
    if (passwordResetCompleted) {
      setNotice(t('authPage.messages.passwordUpdated'));
    }
  }, [passwordResetCompleted, t]);

  useEffect(() => {
    setRememberMe(rememberMe);
  }, [rememberMe]);

  const handleRememberMeChange = (value: boolean) => {
    setRememberMeState(value);
  };

  const pushSuccessRedirect = () => {
    setSuccess(true);
    setTimeout(() => {
      if (mountedRef.current) nav(safeReturnTo);
    }, 700);
  };

  const handleTabChange = (next: Tab) => {
    setTab(next);
    setError('');
    setSuccess(false);
    if (!passwordResetCompleted) {
      setNotice('');
    }
  };

  const handleSignIn = async () => {
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    if (!normalizedEmail) {
      setError(t('authPage.errors.enterEmail'));
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError(t('authPage.errors.invalidEmail'));
      return;
    }
    if (!password) {
      setError(t('authPage.errors.enterPassword'));
      return;
    }
    if (!checkRateLimit(`signin:${normalizedEmail}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError(t('authPage.errors.tooManyAttempts'));
      return;
    }
    setAuthPersistencePreference(rememberMe);
    const { error: signInError } = await signIn(normalizedEmail, password);
    if (signInError) {
      setError(
        translateAuthErrorMessage(
          t,
          friendlyAuthError(signInError, t('authPage.errors.signInFailed')),
        ),
      );
      return;
    }
    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    const fullNameError = validateFullNameField(name);
    if (fullNameError) {
      setError(fullNameError);
      return;
    }
    if (!normalizedEmail) {
      setError(t('authPage.errors.enterEmail'));
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError(t('authPage.errors.invalidEmail'));
      return;
    }
    const nextPasswordError = validatePasswordField(password);
    if (nextPasswordError) {
      setError(nextPasswordError);
      return;
    }
    const phoneValidationError = validatePhoneNumber(normalizedPhone);
    if (phoneValidationError) {
      setError(phoneValidationError);
      return;
    }
    if (!checkRateLimit(`signup:${normalizedEmail}`, { maxRequests: 3, windowMs: 60_000 })) {
      setError(t('authPage.errors.tooManyAttempts'));
      return;
    }
    setAuthPersistencePreference(true);
    const registration = await signUp(normalizedEmail, password, name.trim(), normalizedPhone || undefined);
    if (registration.error) {
      const normalizedFriendly = friendlyAuthError(
        registration.error,
        t('authPage.errors.signUpFailed'),
      );
      const friendly = translateAuthErrorMessage(
        t,
        normalizedFriendly,
      );
      if (normalizedFriendly === 'An account with this email already exists. Sign in instead, or reset your password if you need access.') {
        setTab('signin');
        setNotice(
          interpolate(t('authPage.messages.accountExists'), { email: normalizedEmail }),
        );
        setError('');
        return;
      }
      setError(friendly);
      return;
    }
    if (registration.requiresEmailConfirmation) {
      setPassword('');
      setPhone('');
      setNotice(
        interpolate(t('authPage.messages.confirmEmail'), {
          email: registration.email ?? normalizedEmail,
        }),
      );
      setTab('signin');
      return;
    }
    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!normalizedEmail) {
      setError(t('authPage.errors.enterEmailFirst'));
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError(t('authPage.errors.invalidEmail'));
      return;
    }
    setPendingAction('reset');
    const { error: resetError } = await resetPassword(normalizedEmail);
    setPendingAction(null);
    if (resetError) {
      setError(
        translateAuthErrorMessage(
          t,
          friendlyAuthError(resetError, t('authPage.errors.passwordResetFailed')),
        ),
      );
      return;
    }
    setError('');
    const resetNotice = interpolate(t('authPage.messages.resetLinkSent'), {
      email: normalizedEmail,
    });
    setNotice(resetNotice);
    toast.success(resetNotice);
  };

  const handleGoogleSignIn = async () => {
    if (!authProviders.google.enabled) {
      setError(t('authPage.errors.googleUnavailable'));
      return;
    }
    setError('');
    setPendingAction('google');
    let oauthError: unknown = null;
    try {
      ({ error: oauthError } = await signInWithGoogle(safeReturnTo));
    } finally {
      setPendingAction(null);
    }
    if (oauthError) {
      setError(
        translateAuthErrorMessage(
          t,
          friendlyAuthError(oauthError, t('authPage.errors.googleSignInFailed')),
        ),
      );
    }
  };

  const handleFacebookSignIn = async () => {
    if (!authProviders.facebook.enabled) {
      setError(t('authPage.errors.facebookUnavailable'));
      return;
    }
    setError('');
    setPendingAction('facebook');
    let oauthError: unknown = null;
    try {
      ({ error: oauthError } = await signInWithFacebook(safeReturnTo));
    } finally {
      setPendingAction(null);
    }
    if (oauthError) {
      setError(
        translateAuthErrorMessage(
          t,
          friendlyAuthError(oauthError, t('authPage.errors.facebookSignInFailed')),
        ),
      );
    }
  };

  const handleWhatsAppHelp = () => {
    if (!supportWhatsAppNumber || !supportUrl) {
      setError(t('authPage.errors.whatsAppUnavailable'));
      return;
    }
    setPendingAction('whatsapp');
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => {
      if (mountedRef.current) setPendingAction(null);
    }, 300);
  };

  const socialButtons = [
    ...(authProviders.google.enabled
      ? [{ key: 'google', label: 'Google', cta: t('auth.continueWithGoogle'), onClick: handleGoogleSignIn }]
      : []),
    ...(authProviders.facebook.enabled
      ? [{ key: 'facebook', label: 'Facebook', cta: t('auth.continueWithFacebook'), onClick: handleFacebookSignIn }]
      : []),
    ...(authProviders.whatsapp.enabled
      ? [{ key: 'whatsapp', label: 'WhatsApp', cta: t('authPage.social.whatsAppCta'), onClick: handleWhatsAppHelp }]
      : []),
  ] as const;

  return (
    <div className="auth-landing" dir={dir}>
      <div className="auth-landing__shell">
        <header className="auth-landing__header">
          <button type="button" className="auth-landing__brand" onClick={() => nav('/')}>
            <WaselLogo
              size={40}
              theme="dark"
              variant="compact"
              showWordmark
              subtitle=""
              framed={false}
            />
          </button>

          <div className="auth-landing__header-actions">
            <button type="button" className="auth-landing__ghost-action" onClick={() => nav('/')}>
              {t('authPage.actions.backToLanding')}
            </button>
          </div>
        </header>

        <section className="auth-landing__hero-shell">
          <BrandPanel tab={tab} returnLabel={returnLabel} />

          <div className="auth-landing__form-column">
            <div className="auth-landing__form-card">
              <div className="auth-landing__mobile-brand">
                <WaselHeroMark size={72} />
              </div>

              <TabSwitcher tab={tab} onChange={handleTabChange} />

              <div className="auth-landing__form-heading">
                <div className="auth-landing__eyebrow auth-landing__eyebrow--light">
                  <Sparkles size={14} />
                  {t('authPage.heading.eyebrow')}
                </div>
                <h2>
                  {tab === 'signin'
                    ? t('authPage.heading.signInTitle')
                    : t('authPage.heading.createAccountTitle')}
                </h2>
                <p>
                  {tab === 'signin'
                    ? t('authPage.heading.signInBody')
                    : t('authPage.heading.createAccountBody')}
                </p>
                <div className="auth-landing__switch-copy">
                  <span>
                    {tab === 'signin'
                      ? t('authPage.heading.newToWasel')
                      : t('authPage.heading.alreadyHaveAccount')}
                  </span>
                  <button
                    type="button"
                    className="auth-landing__inline-link"
                    onClick={() => handleTabChange(tab === 'signin' ? 'signup' : 'signin')}
                  >
                    {tab === 'signin'
                      ? t('authPage.actions.createAccount')
                      : t('authPage.actions.signIn')}
                  </button>
                </div>
              </div>

              <div className="auth-landing__return-chip">
                <span className="auth-landing__return-label">{t('authPage.returnPath.label')}</span>
                <strong>{interpolate(t('authPage.returnPath.value'), { returnLabel })}</strong>
              </div>

              <AnimatePresence>
                {notice && !error && !success ? (
                  <motion.div
                    className="auth-landing__alert auth-landing__alert--notice"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {notice}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {error ? (
                  <motion.div
                    className="auth-landing__alert auth-landing__alert--error"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    {error}
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence>
                {success ? (
                  <motion.div
                    className="auth-landing__alert auth-landing__alert--success"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                  >
                    <CheckCircle2 size={16} />
                    <span>{t('authPage.messages.successRedirecting')}</span>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <AnimatePresence mode="wait">
                <motion.form
                  key={tab}
                  className="auth-landing__form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.15 }}
                  onSubmit={event => {
                    event.preventDefault();
                    void (tab === 'signin' ? handleSignIn() : handleSignUp());
                  }}
                >
                  {tab === 'signup' ? (
                    <AuthField
                      id="full-name"
                      label={t('authPage.fields.fullName.label')}
                      description={t('common.required')}
                      value={name}
                      onChange={setName}
                      placeholder={t('authPage.fields.fullName.placeholder')}
                      icon={<UserRound size={16} />}
                      autoComplete="name"
                      error={nameError || undefined}
                    />
                  ) : null}

                  <AuthField
                    id="auth-email"
                    label={t('authPage.fields.email.label')}
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder={t('authPage.fields.email.placeholder')}
                    icon={<Mail size={16} />}
                    autoComplete="email"
                    error={emailError || undefined}
                  />

                  <AuthField
                    id="auth-password"
                    label={t('auth.password')}
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder={
                      tab === 'signin'
                        ? t('authPage.fields.password.signInPlaceholder')
                        : t('authPage.fields.password.signUpPlaceholder')
                    }
                    icon={<Lock size={16} />}
                    autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                    error={passwordError || undefined}
                    hint={
                      tab === 'signup' ? (
                        <div>
                          <PasswordRequirementsVisible />
                          {password ? <StrengthBar password={password} /> : null}
                          <PasswordChecklist password={password} />
                        </div>
                      ) : undefined
                    }
                  />

                  {tab === 'signin' ? (
                    <div className="auth-landing__remember-row">
                      <RememberMeCheckbox checked={rememberMe} onChange={handleRememberMeChange} />
                    </div>
                  ) : null}

                  {tab === 'signup' ? (
                    <AuthField
                      id="auth-phone"
                      label={t('auth.phoneNumber')}
                      description={t('common.optional')}
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder={t('authPage.fields.phone.placeholder')}
                      icon={<Phone size={16} />}
                      autoComplete="tel"
                      error={phoneError || undefined}
                      hint={<span>{t('authPage.fields.phone.hint')}</span>}
                    />
                  ) : null}

                  {tab === 'signin' ? (
                    <div className="auth-landing__forgot-row">
                      <button
                        type="button"
                        className="auth-landing__inline-link"
                        onClick={handleForgotPassword}
                        disabled={isBusy}
                      >
                        {pendingAction === 'reset'
                          ? t('authPage.actions.sendingResetLink')
                          : t('auth.forgotPassword')}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="auth-landing__submit"
                    disabled={isBusy}
                    aria-label={
                      tab === 'signin'
                        ? t('authPage.actions.submitSignInAria')
                        : t('authPage.actions.submitCreateAccountAria')
                    }
                  >
                    <span>
                      {loading
                        ? t('authPage.actions.pleaseWait')
                        : tab === 'signin'
                          ? t('authPage.actions.signInToWasel')
                          : t('authPage.actions.createAccount')}
                    </span>
                    <ArrowRight
                      size={16}
                      style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}
                    />
                  </button>

                  {hasSocialButtons ? (
                    <div className="auth-landing__divider">
                      <span />
                      <p>{t('auth.orContinueWith')}</p>
                      <span />
                    </div>
                  ) : null}

                  <div className="auth-landing__social-grid">
                    {socialButtons.map(social => (
                      <motion.button
                        key={social.key}
                        type="button"
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className={`auth-landing__social-button auth-landing__social-button--${social.key}`}
                        aria-label={social.key === 'whatsapp' ? t('authPage.social.whatsAppLabel') : social.cta}
                        disabled={isBusy}
                        onClick={() => {
                          void social.onClick();
                        }}
                      >
                        <div className="auth-landing__social-icon">{social.label.slice(0, 1)}</div>
                        <div className="auth-landing__social-copy">
                          <strong>{social.label}</strong>
                          <span>
                            {pendingAction === social.key
                              ? t('authPage.social.openingSecureFlow')
                              : social.cta}
                          </span>
                        </div>
                        <ChevronRight
                          size={14}
                          className="auth-landing__social-chevron"
                          style={{ transform: dir === 'rtl' ? 'scaleX(-1)' : undefined }}
                        />
                      </motion.button>
                    ))}
                    {tab === 'signin' && hasOAuthButtons ? (
                      <div className="auth-landing__social-link-hint">
                        <button
                          type="button"
                          className="auth-landing__inline-link"
                          onClick={() => {
                            setNotice(t('authPage.messages.linkSocialAccount'));
                            setTimeout(() => setNotice(''), 5000);
                          }}
                        >
                          {t('authPage.social.linkAccount')}
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="auth-landing__support-bar">
                    <div>
                      {tab === 'signin' ? t('authPage.support.signIn') : t('authPage.support.signUp')}
                    </div>
                    <div className="auth-landing__support-status">
                      <Shield size={12} />
                      {t('authPage.support.status')}
                    </div>
                  </div>
                </motion.form>
              </AnimatePresence>

              <p className="auth-landing__legal">
                {t('authPage.legal.prefix')}{' '}
                <button
                  type="button"
                  className="auth-landing__legal-link"
                  onClick={() => nav(APP_ROUTES.terms.full)}
                >
                  {t('authPage.legal.terms')}
                </button>{' '}
                {t('authPage.legal.and')}{' '}
                <button
                  type="button"
                  className="auth-landing__legal-link"
                  onClick={() => nav(APP_ROUTES.privacy.full)}
                >
                  {t('authPage.legal.privacy')}
                </button>
                {t('authPage.legal.suffix')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

