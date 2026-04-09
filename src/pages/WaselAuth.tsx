import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import {
  AUTH_PROVIDER_META,
  AuthProviderBadge,
  type AuthProvider,
} from '../components/auth/AuthProviderBadge';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { WaselButton } from '../components/wasel-ui/WaselButton';
import { WaselCard } from '../components/wasel-ui/WaselCard';
import { WaselInput } from '../components/wasel-ui/WaselInput';
import { useAuth } from '../contexts/AuthContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { triggerWelcomeEmail } from '../services/transactionalEmailTriggers';
import { friendlyAuthError, pwStrength } from '../utils/authHelpers';
import {
  normalizeAuthReturnTo,
  persistAuthReturnTo,
  readPersistedAuthReturnTo,
} from '../utils/authFlow';
import { getConfig, getWhatsAppSupportUrl } from '../utils/env';
import { checkRateLimit, validateEmail } from '../utils/security';
import { C, F, R, SPACE, TYPE } from '../utils/wasel-ds';

type Tab = 'signin' | 'signup';

const AUTH_FEATURES = [
  'One account for rides, parcels, and live corridors',
  'Google and Facebook stay one tap away',
  'Email sign up stays down to the essentials',
] as const;

function describeReturnTo(path: string) {
  if (path.includes('my-trips')) return 'My trips';
  if (path.includes('wallet')) return 'Wallet';
  if (path.includes('packages')) return 'Packages';
  if (path.includes('notifications')) return 'Notifications';
  return 'Find ride';
}

function StrengthBar({ password }: { password: string }) {
  const strength = pwStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            style={{
              flex: 1,
              height: 4,
              borderRadius: R.full,
              background: index <= strength.score ? strength.color : `${C.text}14`,
            }}
          />
        ))}
      </div>
      <span style={{ color: strength.color, fontSize: TYPE.size.xs }}>
        {strength.label ? `${strength.label} password` : ' '}
      </span>
    </div>
  );
}

function TabSwitcher({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (next: Tab) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        padding: 6,
        borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${C.border}`,
      }}
    >
      {(['signin', 'signup'] as const).map((value) => {
        const active = tab === value;

        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            style={{
              minHeight: 42,
              borderRadius: 14,
              border: active ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${C.border}`,
              background: active
                ? 'linear-gradient(135deg, #18D2F5 0%, #1194FF 56%, #8DF64A 100%)'
                : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015))',
              color: active ? '#032131' : '#D7EAF4',
              fontWeight: active ? TYPE.weight.black : TYPE.weight.semibold,
              fontFamily: F,
              fontSize: TYPE.size.sm,
              cursor: 'pointer',
              transition: 'all 160ms ease',
              boxShadow: active
                ? '0 16px 34px rgba(17,148,255,0.24), inset 0 1px 0 rgba(255,255,255,0.22)'
                : 'inset 0 1px 0 rgba(255,255,255,0.03)',
            }}
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        );
      })}
    </div>
  );
}

function FeedbackBanner({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'notice';
  children: string;
}) {
  const toneStyles = {
    error: {
      background: C.errorDim,
      border: `1px solid ${C.error}40`,
      color: '#FF9BA4',
    },
    success: {
      background: C.greenDim,
      border: `1px solid ${C.green}40`,
      color: '#82F4BF',
    },
    notice: {
      background: C.cyanDim,
      border: `1px solid ${C.cyan}30`,
      color: '#A9F6FF',
    },
  } as const;

  return (
    <WaselCard
      variant="solid"
      padding={`${SPACE[3]} ${SPACE[4]}`}
      radius={R.xl}
      style={toneStyles[tone]}
    >
      <span style={{ fontSize: TYPE.size.sm, lineHeight: 1.6 }}>{children}</span>
    </WaselCard>
  );
}

function SocialButton({
  provider,
  loading,
  disabled,
  onClick,
}: {
  provider: AuthProvider;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const meta = AUTH_PROVIDER_META[provider];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      aria-label={loading ? `Connecting to ${meta.label}...` : `Continue with ${meta.label}`}
      style={{
        minHeight: 54,
        borderRadius: 18,
        border: loading
          ? `1px solid ${meta.accent}66`
          : `1px solid ${meta.accent}38`,
        background: loading
          ? `${meta.accent}1e`
          : `${meta.accent}12`,
        color: C.text,
        fontFamily: F,
        fontWeight: TYPE.weight.black,
        fontSize: TYPE.size.sm,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !loading ? 0.55 : 1,
        transition: 'transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease, border-color 160ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {loading ? (
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            border: `2px solid ${meta.accent}44`,
            borderTop: `2px solid ${meta.accent}`,
            animation: 'social-spin 0.75s linear infinite',
            flexShrink: 0,
          }}
        />
      ) : (
        <AuthProviderBadge provider={provider} size={20} />
      )}
      <span>{loading ? `Connecting ${meta.label}...` : `Continue with ${meta.label}`}</span>
      <style>{`@keyframes social-spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  );
}

export default function WaselAuth() {
  const [params] = useSearchParams();
  const rawTab = params.get('tab')?.toLowerCase();
  const initialTab: Tab =
    rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
  const passwordResetCompleted = params.get('reset') === 'success';

  const [tab, setTab] = useState<Tab>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [notice, setNotice] = useState(
    passwordResetCompleted
      ? 'Password updated. Sign in with your new password.'
      : '',
  );
  const [oauthProvider, setOauthProvider] = useState<AuthProvider | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState('');
  const [resendingConfirmation, setResendingConfirmation] = useState(false);

  const { signIn, register, loading, user } = useLocalAuth();
  const {
    resetPassword,
    resendSignupConfirmation,
    signInWithGoogle,
    signInWithFacebook,
  } = useAuth();
  const navigate = useIframeSafeNavigate();
  const mountedRef = useRef(true);
  const { supportWhatsAppNumber } = getConfig();

  const safeReturnTo = normalizeAuthReturnTo(
    params.get('returnTo') || readPersistedAuthReturnTo(),
    '/app/find-ride',
  );
  const destinationLabel = describeReturnTo(safeReturnTo);
  // Email-form busy state — only blocks the email submit button.
  const emailBusy = loading || success;
  // OAuth busy state — only blocks the social buttons.
  const oauthBusy = Boolean(oauthProvider) || success;
  // Global busy (any async op in flight) — used for misc disabled states.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    persistAuthReturnTo(safeReturnTo);
  }, [safeReturnTo]);

  useEffect(() => {
    if (user && mountedRef.current) {
      navigate(safeReturnTo);
    }
  }, [navigate, safeReturnTo, user]);

  const syncTabParam = (next: Tab) => {
    if (typeof window === 'undefined') {
      return;
    }

    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('tab', next);
    nextParams.set('returnTo', safeReturnTo);
    const nextSearch = nextParams.toString();
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}`,
    );
  };

  const pushSuccessRedirect = () => {
    setSuccess(true);
    setTimeout(() => {
      if (mountedRef.current) {
        navigate(safeReturnTo);
      }
    }, 450);
  };

  const clearStatus = () => {
    setError('');
    setSuccess(false);
    if (!passwordResetCompleted) {
      setNotice('');
    }
  };

  const handleTabChange = (next: Tab) => {
    setTab(next);
    clearStatus();
    syncTabParam(next);
  };

  const handleEmailAuth = async () => {
    clearStatus();

    if (tab === 'signup' && !name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (tab === 'signin') {
      if (
        !checkRateLimit(`signin:${email}`, {
          maxRequests: 5,
          windowMs: 60_000,
        })
      ) {
        setError('Too many attempts. Please wait a minute and try again.');
        return;
      }

      const result = await signIn(email, password);
      if (result.error) {
        const nextError = friendlyAuthError(
          result.error,
          'Sign in failed. Please try again.',
        );
        if (nextError.toLowerCase().includes('confirm your email')) {
          setPendingConfirmationEmail(email.trim());
        }
        setError(
          nextError,
        );
        return;
      }

      setPendingConfirmationEmail('');
      pushSuccessRedirect();
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (
      !checkRateLimit(`signup:${email}`, {
        maxRequests: 3,
        windowMs: 60_000,
      })
    ) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }

    const registration = await register(name, email, password);
    if (registration.error) {
      setError(
        friendlyAuthError(
          registration.error,
          'Sign up failed. Please try again.',
        ),
      );
      return;
    }

    if (registration.requiresEmailConfirmation) {
      setPassword('');
      setPendingConfirmationEmail((registration.email ?? email).trim());
      setNotice(
        `Check ${registration.email ?? email} and activate your email address to finish creating your account.`,
      );
      setTab('signin');
      syncTabParam('signin');
      return;
    }

    setPendingConfirmationEmail('');
    void triggerWelcomeEmail({
      name: name.trim() || email.split('@')[0] || 'Wasel member',
      email,
    });
    pushSuccessRedirect();
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email address above first.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    const result = await resetPassword(email);
    if (result.error) {
      setError(friendlyAuthError(result.error, 'Password reset failed.'));
      return;
    }

    clearStatus();
    setNotice(`If ${email} is registered, a password reset link has been sent.`);
  };

  const handleSocialAuth = async (provider: AuthProvider) => {
    clearStatus();
    setPendingConfirmationEmail('');
    setOauthProvider(provider);

    try {
      const result =
        provider === 'google'
          ? await signInWithGoogle(safeReturnTo)
          : await signInWithFacebook(safeReturnTo);

      if (result.error) {
        setError(
          friendlyAuthError(
            result.error,
            `${AUTH_PROVIDER_META[provider].label} sign-in could not start. Check that the provider is enabled in Supabase and the redirect URL is on the allow-list.`,
          ),
        );
        setOauthProvider(null);
      }
      // If no error, Supabase is navigating the page away — leave the spinner
      // running until the browser leaves this page.
    } catch (err: unknown) {
      setError(
        friendlyAuthError(
          err instanceof Error ? err : new Error(String(err)),
          `${AUTH_PROVIDER_META[provider].label} sign-in failed unexpectedly.`,
        ),
      );
      setOauthProvider(null);
    }
  };

  const handleResendConfirmation = async () => {
    const nextEmail = pendingConfirmationEmail || email.trim();
    if (!nextEmail) {
      setError('Enter your email address first so we can resend the activation email.');
      return;
    }

    setResendingConfirmation(true);
    const result = await resendSignupConfirmation(nextEmail);
    setResendingConfirmation(false);

    if (result.error) {
      setError(
        friendlyAuthError(
          result.error,
          'Confirmation email could not be sent. Please try again.',
        ),
      );
      return;
    }

    setNotice(`A fresh activation email has been sent to ${nextEmail}.`);
    setError('');
    setPendingConfirmationEmail(nextEmail);
  };

  const handleSupportClick = () => {
    if (!supportWhatsAppNumber) {
      return;
    }

    window.open(
      getWhatsAppSupportUrl('Hi Wasel, I need help with access.'),
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: F,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        .auth-shell-form > * {
          width: 100%;
          max-width: 472px;
          margin-left: auto;
          margin-right: auto;
        }
        @media (max-width: 960px) {
          .auth-shell {
            grid-template-columns: 1fr !important;
          }
          .auth-shell-side {
            gap: 14px !important;
            padding-bottom: 22px !important;
          }
          .auth-shell-form {
            padding-top: 28px !important;
          }
          .auth-side-features,
          .auth-side-pills {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .auth-shell-side,
          .auth-shell-form {
            padding: 24px !important;
          }
          .auth-shell-form > * {
            max-width: none !important;
          }
          .auth-social-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(circle at 14% 16%, rgba(85,233,255,0.16), transparent 26%),
            radial-gradient(circle at 82% 12%, rgba(30,124,255,0.16), transparent 24%),
            radial-gradient(circle at 72% 74%, rgba(51,232,95,0.10), transparent 18%)
          `,
        }}
      />

      <div
        style={{
          position: 'relative',
          maxWidth: 1120,
          margin: '0 auto',
          padding: `${SPACE[7]} ${SPACE[5]} ${SPACE[8]}`,
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            minHeight: 42,
            padding: '0 14px',
            borderRadius: 14,
            border: `1px solid ${C.border}`,
            background: 'rgba(255,255,255,0.03)',
            color: C.textSub,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            marginBottom: SPACE[6],
            fontFamily: F,
            fontWeight: TYPE.weight.semibold,
          }}
        >
          <ArrowLeft size={16} />
          Back to landing
        </button>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <WaselCard
            variant="default"
            padding="0"
            radius={R['3xl']}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="auth-shell"
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 0.92fr) minmax(0, 1.08fr)',
              }}
            >
              <div
                className="auth-shell-side"
                style={{
                  padding: 32,
                  background:
                    'linear-gradient(180deg, rgba(11,29,69,0.96), rgba(10,22,40,0.96))',
                  borderRight: `1px solid ${C.border}`,
                  display: 'grid',
                  gap: 18,
                }}
              >
                <WaselLogo size={42} theme="light" variant="full" />

                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      width: 'fit-content',
                      padding: '7px 10px',
                      borderRadius: R.full,
                      background: C.cyanDim,
                      border: `1px solid ${C.borderHov}`,
                      color: C.cyan,
                      fontSize: TYPE.size.xs,
                      fontWeight: TYPE.weight.black,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Wasel Access
                  </div>

                  <h1
                    style={{
                      margin: 0,
                      fontSize: 'clamp(2rem, 4vw, 3.3rem)',
                      lineHeight: 0.96,
                      letterSpacing: '-0.06em',
                    }}
                  >
                    Faster sign-in.
                    <span style={{ display: 'block', color: C.cyan }}>
                      Cleaner start.
                    </span>
                  </h1>

                  <p
                    style={{
                      margin: 0,
                      color: C.textSub,
                      fontSize: TYPE.size.base,
                      lineHeight: TYPE.lineHeight.loose,
                      maxWidth: 420,
                    }}
                  >
                    Google, Facebook, and email now land in one cleaner flow,
                    with less friction before users reach {destinationLabel}.
                  </p>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    width: 'fit-content',
                    padding: '10px 12px',
                    borderRadius: 16,
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${C.border}`,
                    color: C.text,
                    fontSize: TYPE.size.sm,
                    fontWeight: TYPE.weight.bold,
                  }}
                >
                  <Sparkles size={16} color={C.cyan} />
                  Next stop: {destinationLabel}
                </div>

                <div className="auth-side-features" style={{ display: 'grid', gap: 10 }}>
                  {AUTH_FEATURES.map((feature) => (
                    <div
                      key={feature}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '12px 14px',
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${C.border}`,
                        color: C.text,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: C.green,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: TYPE.size.sm,
                          lineHeight: TYPE.lineHeight.relaxed,
                          color: C.textSub,
                        }}
                      >
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  className="auth-side-pills"
                  style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                  }}
                >
                  {['Secure access', 'Low-friction', 'Jordan-first'].map((item) => (
                    <span
                      key={item}
                      style={{
                        padding: '7px 10px',
                        borderRadius: R.full,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${C.border}`,
                        color: C.textMuted,
                        fontSize: TYPE.size.xs,
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div
                className="auth-shell-form"
                style={{
                  padding: 32,
                  display: 'grid',
                  gap: 16,
                  alignContent: 'center',
                  background:
                    'linear-gradient(180deg, rgba(4,12,24,0.92), rgba(6,14,30,0.98))',
                }}
              >
                <TabSwitcher tab={tab} onChange={handleTabChange} />

                <div style={{ display: 'grid', gap: 8 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: TYPE.size['3xl'],
                      letterSpacing: '-0.03em',
                    }}
                  >
                    {tab === 'signin' ? 'Welcome back' : 'Create your Wasel account'}
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      color: C.textMuted,
                      fontSize: TYPE.size.sm,
                      lineHeight: TYPE.lineHeight.relaxed,
                    }}
                  >
                    {tab === 'signin'
                      ? `Choose the quickest way in, then continue straight to ${destinationLabel}.`
                      : 'Start with your name, email, and password. The rest can wait until you are inside Wasel.'}
                  </p>
                </div>

                <div
                  className="auth-social-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                  }}
                >
                  <SocialButton
                    provider="google"
                    loading={oauthProvider === 'google'}
                    disabled={oauthBusy}
                    onClick={() => {
                      void handleSocialAuth('google');
                    }}
                  />
                  <SocialButton
                    provider="facebook"
                    loading={oauthProvider === 'facebook'}
                    disabled={oauthBusy}
                    onClick={() => {
                      void handleSocialAuth('facebook');
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    color: C.textMuted,
                    fontSize: TYPE.size.xs,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span>Or keep it simple with email</span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                <AnimatePresence mode="wait">
                  {notice && !error && !success ? (
                    <motion.div
                      key={`notice-${notice}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <FeedbackBanner tone="notice">{notice}</FeedbackBanner>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {pendingConfirmationEmail ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                      padding: '12px 14px',
                      borderRadius: 14,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <span
                      style={{
                        color: C.textMuted,
                        fontSize: TYPE.size.xs,
                        lineHeight: 1.6,
                      }}
                    >
                      Need a new activation email for {pendingConfirmationEmail}?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        void handleResendConfirmation();
                      }}
                      disabled={resendingConfirmation}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: C.cyan,
                        fontFamily: F,
                        fontWeight: TYPE.weight.bold,
                        cursor: resendingConfirmation ? 'not-allowed' : 'pointer',
                        opacity: resendingConfirmation ? 0.65 : 1,
                        padding: 0,
                      }}
                    >
                      {resendingConfirmation ? 'Sending...' : 'Resend activation email'}
                    </button>
                  </div>
                ) : null}

                <AnimatePresence mode="wait">
                  {error ? (
                    <motion.div
                      key={`error-${error}`}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <FeedbackBanner tone="error">{error}</FeedbackBanner>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                    >
                      <FeedbackBanner tone="success">
                        Signed in successfully. Redirecting now.
                      </FeedbackBanner>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.form
                  key={tab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.16 }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleEmailAuth();
                  }}
                  style={{ display: 'grid', gap: 14 }}
                >
                  {tab === 'signup' ? (
                    <WaselInput
                      id="full-name"
                      label="Full name"
                      description="Shown on your profile"
                      value={name}
                      onChange={setName}
                      placeholder="Ahmad Al-Rashid"
                      icon={<UserRound size={16} />}
                      autoComplete="name"
                    />
                  ) : null}

                  <WaselInput
                    id="auth-email"
                    label="Email address"
                    description="Used for sign in"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    icon={<Mail size={16} />}
                    autoComplete="email"
                    autoFocus={tab === 'signin'}
                  />

                  <WaselInput
                    id="auth-password"
                    label="Password"
                    description={
                      tab === 'signin' ? 'Your account password' : 'Minimum 8 characters'
                    }
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder={
                      tab === 'signin'
                        ? 'Enter your password'
                        : 'Create a secure password'
                    }
                    icon={<Lock size={16} />}
                    autoComplete={
                      tab === 'signin' ? 'current-password' : 'new-password'
                    }
                    hint={
                      tab === 'signup' && password.length > 0 ? (
                        <StrengthBar password={password} />
                      ) : undefined
                    }
                  />

                  {tab === 'signin' ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => {
                          void handleForgotPassword();
                        }}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: C.cyan,
                          padding: 0,
                          fontFamily: F,
                          fontSize: TYPE.size.xs,
                          cursor: 'pointer',
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 12px',
                        borderRadius: 14,
                        background: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${C.border}`,
                        color: C.textMuted,
                        fontSize: TYPE.size.xs,
                        lineHeight: 1.6,
                      }}
                    >
                      <Shield size={14} color={C.cyan} />
                      Add your phone and profile details later inside Wasel.
                    </div>
                  )}

                  <WaselButton
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    disabled={emailBusy}
                    aria-label={
                      tab === 'signin' ? 'Sign in with email' : 'Create account'
                    }
                    iconEnd={<ArrowRight size={16} />}
                  >
                    {tab === 'signin' ? 'Sign in with email' : 'Create account'}
                  </WaselButton>
                </motion.form>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                    paddingTop: 4,
                  }}
                >
                  <span style={{ color: C.textMuted, fontSize: TYPE.size.sm }}>
                    {tab === 'signin'
                      ? "Don't have an account yet?"
                      : 'Already have an account?'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      handleTabChange(tab === 'signin' ? 'signup' : 'signin')
                    }
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: C.cyan,
                      fontFamily: F,
                      fontWeight: TYPE.weight.bold,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {tab === 'signin' ? 'Create one now' : 'Switch to sign in'}
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: 10,
                    paddingTop: 4,
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: C.textMuted,
                      fontSize: TYPE.size.xs,
                      lineHeight: TYPE.lineHeight.relaxed,
                    }}
                  >
                    By continuing, you agree to our{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/terms')}
                      style={{
                        color: C.cyan,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/privacy')}
                      style={{
                        color: C.cyan,
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      Privacy Policy
                    </button>
                    .
                  </p>

                  {supportWhatsAppNumber ? (
                    <button
                      type="button"
                      onClick={handleSupportClick}
                      style={{
                        width: 'fit-content',
                        border: 'none',
                        background: 'transparent',
                        color: C.textSub,
                        padding: 0,
                        fontFamily: F,
                        fontSize: TYPE.size.xs,
                        cursor: 'pointer',
                      }}
                    >
                      Need help? Talk to Wasel support on WhatsApp.
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </WaselCard>
        </motion.div>
      </div>
    </div>
  );
}
