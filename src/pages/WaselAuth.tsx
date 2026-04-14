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
  BusFront,
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
  WalletCards,
} from 'lucide-react';
import { WaselHeroMark, WaselLogo } from '../components/wasel-ds/WaselLogo';
import { DeferredLandingMap } from '../features/home/DeferredLandingMap';
import { LANDING_DISPLAY, LANDING_FONT } from '../features/home/landingConstants';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, validateEmail } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';
import {
  friendlyAuthError,
  getPasswordRequirements,
  normalizeEmailInput,
  pwStrength,
  validateFullName,
  validatePassword,
} from '../utils/authHelpers';
import './WaselAuth.css';

type Tab = 'signin' | 'signup';
type PendingAction = 'google' | 'facebook' | 'reset' | 'whatsapp' | null;

const AUTH_LANDING = {
  bg: 'var(--auth-landing-bg)',
  hero: 'var(--auth-landing-hero)',
  heroScrim: 'var(--auth-landing-hero-scrim)',
  text: 'var(--auth-landing-text)',
} as const;

const BRAND_FEATURES = [
  { icon: <Shield size={14} />, text: 'Secure access' },
  { icon: <Mail size={14} />, text: 'One account' },
] as const;

const SERVICE_TILES = [
  { icon: MapPinned, title: 'Rides', detail: 'Resume routes, timing, and seat search.' },
  { icon: Package, title: 'Packages', detail: 'Use the same corridor for parcel delivery.' },
  { icon: BusFront, title: 'Buses', detail: 'Keep transit access inside the same account.' },
  { icon: WalletCards, title: 'Wallet', detail: 'Payments and balances stay in one place.' },
] as const;

const SOCIAL_META: Record<string, { accent: string; bg: string; border: string }> = {
  Google: {
    accent: 'var(--auth-social-google)',
    bg: 'var(--auth-social-google-bg)',
    border: 'var(--auth-social-google-border)',
  },
  Facebook: {
    accent: 'var(--auth-social-facebook)',
    bg: 'var(--auth-social-facebook-bg)',
    border: 'var(--auth-social-facebook-border)',
  },
  WhatsApp: {
    accent: 'var(--auth-social-whatsapp)',
    bg: 'var(--auth-social-whatsapp-bg)',
    border: 'var(--auth-social-whatsapp-border)',
  },
};

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
            aria-label={showPassword ? 'Hide password' : 'Show password'}
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
  return (
    <div className="auth-landing__hero-panel" style={{ background: AUTH_LANDING.hero }}>
      <div className="auth-landing__hero-map" aria-hidden="true">
        <div className="auth-landing__hero-map-scale">
          <DeferredLandingMap />
        </div>
      </div>
      <div
        className="auth-landing__hero-scrim"
        aria-hidden="true"
        style={{ background: AUTH_LANDING.heroScrim }}
      />
      <div className="auth-landing__hero-orb auth-landing__hero-orb--one" aria-hidden="true" />
      <div className="auth-landing__hero-orb auth-landing__hero-orb--two" aria-hidden="true" />
      <div className="auth-landing__hero-mark" aria-hidden="true">
        <WaselHeroMark size={136} />
      </div>

      <div className="auth-landing__hero-copy">
        <div className="auth-landing__eyebrow">
          <Sparkles size={15} />
          One Wasel access layer
        </div>

        <WaselLogo size={50} theme="auto" variant="full" showWordmark subtitle="" framed={false} />

        <h1 className="auth-landing__hero-title" style={{ fontFamily: LANDING_DISPLAY }}>
          One account that looks and feels like the landing page.
        </h1>

        <p className="auth-landing__hero-body">
          {tab === 'signin'
            ? 'Sign back in and continue across rides, packages, buses, and wallet from the same Wasel network shell.'
            : 'Create one account and step into every Wasel service with the same landing-page experience from the first screen.'}
        </p>

        <div className="auth-landing__hero-signal">
          <MapPinned size={16} />
          {`Returning to ${returnLabel || 'find ride'}`}
        </div>

        <div className="auth-landing__service-grid">
          {SERVICE_TILES.map(tile => {
            const Icon = tile.icon;

            return (
              <div key={tile.title} className="auth-landing__service-card">
                <span className="auth-landing__service-icon">
                  <Icon size={18} />
                </span>
                <strong>{tile.title}</strong>
                <span>{tile.detail}</span>
              </div>
            );
          })}
        </div>

        <div className="auth-landing__trust-row">
          {BRAND_FEATURES.map(item => (
            <div key={item.text} className="auth-landing__trust-chip">
              <span className="auth-landing__trust-icon">{item.icon}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrengthBar({ password }: { password: string }) {
  const strength = pwStrength(password);

  if (!password) return null;

  return (
    <div className="auth-strength">
      <div className="auth-strength__bars">
        {[1, 2, 3, 4, 5].map(value => (
          <div
            key={value}
            className="auth-strength__bar"
            style={{
              background: value <= strength.score ? strength.color : 'var(--surface-divider)',
            }}
          />
        ))}
      </div>
      {strength.label ? (
        <span className="auth-strength__label" style={{ color: strength.color }}>
          {strength.label}
        </span>
      ) : null}
    </div>
  );
}

function PasswordChecklist({ password }: { password: string }) {
  const requirements = getPasswordRequirements(password);

  return (
    <div className="auth-password-checklist">
      {requirements.map(requirement => (
        <div
          key={requirement.key}
          className={`auth-password-checklist__item${requirement.met ? ' is-met' : ''}`}
        >
          <span className="auth-password-checklist__dot" />
          <span>{requirement.label}</span>
        </div>
      ))}
    </div>
  );
}

function TabSwitcher({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="auth-landing__tabs" role="tablist" aria-label="Authentication tabs">
      {(['signin', 'signup'] as Tab[]).map(value => {
        const active = tab === value;

        return (
          <motion.button
            key={value}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={value === 'signin' ? 'Switch to sign in' : 'Switch to create account'}
            whileTap={{ scale: 0.98 }}
            className={`auth-landing__tab${active ? ' is-active' : ''}`}
            onClick={() => onChange(value)}
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function WaselAuth() {
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
  const [notice, setNotice] = useState(
    passwordResetCompleted ? 'Password updated. Sign in with your new password.' : '',
  );

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { supportWhatsAppNumber } = getConfig();

  const safeReturnTo = (() => {
    const raw = params.get('returnTo') || '/app/find-ride';
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/find-ride';
  })();

  const returnLabel = useMemo(() => {
    const [path] = safeReturnTo.split('?');
    const cleaned = path
      .replace(/^\/app\//, '')
      .replace(/^\/+/, '')
      .replace(/-/g, ' ')
      .replace(/\//g, ' ')
      .trim();

    if (!cleaned) return 'find ride';

    return cleaned.replace(/\b\w/g, letter => letter.toUpperCase());
  }, [safeReturnTo]);

  const normalizedEmail = useMemo(() => normalizeEmailInput(email), [email]);
  const normalizedPhone = useMemo(() => phone.trim().replace(/[^\d+]/g, ''), [phone]);
  const isBusy = loading || pendingAction !== null || success;

  const validatePhoneNumber = (value: string): string | null => {
    if (!value) return null;
    if (value.length < 8) return 'Enter a valid phone number or leave it blank.';
    return null;
  };

  const nameError = tab === 'signup' && name.trim() ? validateFullName(name) : '';
  const emailError =
    normalizedEmail && !validateEmail(normalizedEmail) ? 'Please enter a valid email address.' : '';
  const passwordError = tab === 'signup' && password ? (validatePassword(password) ?? '') : '';
  const phoneError =
    tab === 'signup' && phone.trim() ? (validatePhoneNumber(normalizedPhone) ?? '') : '';

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
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
  }, [params, setParams, tab]);

  useEffect(() => {
    if (user && mountedRef.current) nav(safeReturnTo);
  }, [user, nav, safeReturnTo]);

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
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    if (!checkRateLimit(`signin:${normalizedEmail}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }
    const { error: signInError } = await signIn(normalizedEmail, password);
    if (signInError) {
      setError(friendlyAuthError(signInError, 'Sign in failed. Please try again.'));
      return;
    }
    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    const fullNameError = validateFullName(name);
    if (fullNameError) {
      setError(fullNameError);
      return;
    }
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    const nextPasswordError = validatePassword(password);
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
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }
    const registration = await register(
      name.trim(),
      normalizedEmail,
      password,
      normalizedPhone || undefined,
    );
    if (registration.error) {
      const friendly = friendlyAuthError(registration.error, 'Sign up failed. Please try again.');
      if (friendly.includes('already exists')) {
        setTab('signin');
        setNotice(
          `An account already exists for ${normalizedEmail}. Sign in instead or reset your password.`,
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
        `Check ${registration.email ?? normalizedEmail} and confirm your email address to finish creating your account.`,
      );
      setTab('signin');
      return;
    }
    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!normalizedEmail) {
      setError('Enter your email address above first.');
      return;
    }
    if (!validateEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }
    setPendingAction('reset');
    const { error: resetError } = await resetPassword(normalizedEmail);
    setPendingAction(null);
    if (resetError) {
      setError(friendlyAuthError(resetError, 'Password reset failed.'));
      return;
    }
    setError('');
    setNotice(`If ${normalizedEmail} is registered, a password reset link has been sent.`);
    toast.success(`If ${normalizedEmail} is registered, a password reset link has been sent.`);
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setPendingAction('google');
    let oauthError: unknown = null;
    try {
      ({ error: oauthError } = await signInWithGoogle(safeReturnTo));
    } finally {
      setPendingAction(null);
    }
    if (oauthError) setError(friendlyAuthError(oauthError, 'Google sign-in failed.'));
  };

  const handleFacebookSignIn = async () => {
    setError('');
    setPendingAction('facebook');
    let oauthError: unknown = null;
    try {
      ({ error: oauthError } = await signInWithFacebook(safeReturnTo));
    } finally {
      setPendingAction(null);
    }
    if (oauthError) setError(friendlyAuthError(oauthError, 'Facebook sign-in failed.'));
  };

  const handleWhatsAppHelp = () => {
    const supportUrl = getWhatsAppSupportUrl('Hi Wasel');
    if (!supportWhatsAppNumber || !supportUrl) {
      setError('WhatsApp support is not configured yet.');
      return;
    }
    setPendingAction('whatsapp');
    window.open(supportUrl, '_blank', 'noopener,noreferrer');
    window.setTimeout(() => {
      if (mountedRef.current) setPendingAction(null);
    }, 300);
  };

  const socialButtons = [
    { label: 'Google', onClick: handleGoogleSignIn },
    { label: 'Facebook', onClick: handleFacebookSignIn },
    ...(supportWhatsAppNumber ? [{ label: 'WhatsApp', onClick: handleWhatsAppHelp }] : []),
  ] as const;

  return (
    <div
      className="auth-landing"
      style={{
        minHeight: '100vh',
        background: AUTH_LANDING.bg,
        color: AUTH_LANDING.text,
        fontFamily: LANDING_FONT,
      }}
    >
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
              Back to landing
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
                  Premium access
                </div>
                <h2 style={{ fontFamily: LANDING_DISPLAY }}>
                  {tab === 'signin' ? 'Sign in to Wasel' : 'Create your Wasel account'}
                </h2>
                <p>
                  {tab === 'signin'
                    ? 'Continue with the same landing-page design across every Wasel service.'
                    : 'Start once, then move between rides, packages, buses, and wallet without a design break.'}
                </p>
                <div className="auth-landing__switch-copy">
                  <span>{tab === 'signin' ? 'New to Wasel?' : 'Already have an account?'}</span>
                  <button
                    type="button"
                    className="auth-landing__inline-link"
                    onClick={() => handleTabChange(tab === 'signin' ? 'signup' : 'signin')}
                  >
                    {tab === 'signin' ? 'Create account' : 'Sign in'}
                  </button>
                </div>
              </div>

              <div className="auth-landing__return-chip">
                <span className="auth-landing__return-label">Return path</span>
                <strong>{`Back to ${returnLabel}`}</strong>
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
                    <span>Success. Redirecting.</span>
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
                      label="Full name"
                      description="Required"
                      value={name}
                      onChange={setName}
                      placeholder="Ahmad Al-Rashid"
                      icon={<UserRound size={16} />}
                      autoComplete="name"
                      error={nameError || undefined}
                    />
                  ) : null}

                  <AuthField
                    id="auth-email"
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    icon={<Mail size={16} />}
                    autoComplete="email"
                    error={emailError || undefined}
                  />

                  <AuthField
                    id="auth-password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder={
                      tab === 'signin' ? 'Enter your password' : 'Create a secure password'
                    }
                    icon={<Lock size={16} />}
                    autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                    error={passwordError || undefined}
                    hint={
                      tab === 'signup' ? (
                        <div>
                          {password ? <StrengthBar password={password} /> : null}
                          <PasswordChecklist password={password} />
                        </div>
                      ) : undefined
                    }
                  />

                  {tab === 'signup' ? (
                    <AuthField
                      id="auth-phone"
                      label="Phone number"
                      description="Optional"
                      type="tel"
                      value={phone}
                      onChange={setPhone}
                      placeholder="+962 79 123 4567"
                      icon={<Phone size={16} />}
                      autoComplete="tel"
                      error={phoneError || undefined}
                      hint={<span>Add it now or skip it.</span>}
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
                        {pendingAction === 'reset' ? 'Sending reset link...' : 'Forgot password?'}
                      </button>
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="auth-landing__submit"
                    disabled={isBusy}
                    aria-label={tab === 'signin' ? 'Submit sign in' : 'Submit sign up'}
                  >
                    <span>
                      {loading
                        ? 'Please wait...'
                        : tab === 'signin'
                          ? 'Sign in to Wasel'
                          : 'Create account'}
                    </span>
                    <ArrowRight size={16} />
                  </button>

                  <div className="auth-landing__divider">
                    <span />
                    <p>or continue with</p>
                    <span />
                  </div>

                  <div className="auth-landing__social-grid">
                    {socialButtons.map(social => (
                      <motion.button
                        key={social.label}
                        type="button"
                        whileHover={{ scale: 1.01, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        className="auth-landing__social-button"
                        aria-label={
                          social.label === 'WhatsApp' ? 'WhatsApp' : `Continue with ${social.label}`
                        }
                        disabled={isBusy}
                        onClick={() => {
                          void social.onClick();
                        }}
                        style={{
                          borderColor: SOCIAL_META[social.label].border,
                          background: `linear-gradient(180deg, ${SOCIAL_META[social.label].bg}, var(--bg-secondary))`,
                        }}
                      >
                        <div
                          className="auth-landing__social-icon"
                          style={{
                            color: SOCIAL_META[social.label].accent,
                            borderColor: SOCIAL_META[social.label].border,
                            background: SOCIAL_META[social.label].bg,
                          }}
                        >
                          {social.label.slice(0, 1)}
                        </div>
                        <div className="auth-landing__social-copy">
                          <strong>{social.label}</strong>
                          <span>
                            {pendingAction === social.label.toLowerCase()
                              ? 'Opening secure flow...'
                              : `Continue with ${social.label}`}
                          </span>
                        </div>
                        <ChevronRight size={14} color={SOCIAL_META[social.label].accent} />
                      </motion.button>
                    ))}
                  </div>

                  <div className="auth-landing__support-bar">
                    <div>
                      {tab === 'signin'
                        ? 'One account across Wasel services.'
                        : 'Name, email, and password are enough to start.'}
                    </div>
                    <div className="auth-landing__support-status">
                      <Shield size={12} />
                      Secure recovery active
                    </div>
                  </div>
                </motion.form>
              </AnimatePresence>

              <p className="auth-landing__legal">
                By continuing, you agree to the{' '}
                <button
                  type="button"
                  className="auth-landing__legal-link"
                  onClick={() => nav('/app/terms')}
                >
                  Terms of Service
                </button>{' '}
                and{' '}
                <button
                  type="button"
                  className="auth-landing__legal-link"
                  onClick={() => nav('/app/privacy')}
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
