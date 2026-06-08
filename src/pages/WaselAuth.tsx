import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import {
  ArrowRight,
  Bus,
  CheckCircle2,
  Lock,
  Mail,
  Package,
  Phone,
  Shield,
  UserRound,
  Zap,
} from 'lucide-react';
import { WaselLogo } from '../components/wasel-ds/WaselLogo';
import { WaselButton } from '../components/wasel-ui/WaselButton';
import { WaselInput } from '../components/wasel-ui/WaselInput';
import { WaselCard } from '../components/wasel-ui/WaselCard';
import { AuthCaptcha, isAuthCaptchaConfigured } from '../components/AuthCaptcha';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, validateEmail } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import { normalizeReturnToPath } from '../utils/env';
import { friendlyAuthError, pwStrength } from '../utils/authHelpers';

import { C, R, TYPE, F, SPACE, GRAD, GRAD_SIGNAL } from '../utils/wasel-ds';

// Types
type Tab = 'signin' | 'signup';
type PhoneOtpChannel = 'sms' | 'whatsapp';
type AuthAction =
  | 'signin'
  | 'signup'
  | 'forgot-password'
  | 'google'
  | 'facebook'
  | 'sms-otp'
  | 'whatsapp-otp'
  | 'verify-phone';

// Feature list for the brand panel
const BRAND_FEATURES = [
  { icon: <Zap size={14} />, text: 'Live route graph', color: C.cyan },
  { icon: <Package size={14} />, text: 'Parcels on route', color: C.gold },
  { icon: <Bus size={14} />, text: 'Scheduled lanes', color: C.green },
  { icon: <Shield size={14} />, text: 'Trust by default', color: C.purple },
] as const;

const BRAND_METRICS = [
  { value: '3', label: 'mobility surfaces', accent: C.cyan },
  { value: '1', label: 'trusted account', accent: C.gold },
  { value: 'Live', label: 'route intelligence', accent: C.green },
] as const;

const BRAND_PILLS = ['Verified', 'Fast', 'Clear'] as const;
const PASSWORD_POLICY_MESSAGE =
  'Password must include lowercase, uppercase, number, and special character.';

function meetsPasswordPolicy(value: string) {
  return (
    value.length >= 8 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

function normalizePhoneForOtp(value: string) {
  const compact = value.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) return `+${compact.slice(2)}`;
  if (compact.startsWith('0')) return `+962${compact.slice(1)}`;
  return compact;
}

function isValidOtpPhone(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value);
}

function isLocalCaptchaBypassActive() {
  return import.meta.env.VITE_E2E_LOCAL_AUTH === 'true';
}

function isAccountProtectionError(error: unknown) {
  const message = String(error ?? '').toLowerCase();
  return (
    message.includes('captcha') ||
    message.includes('account protection') ||
    message.includes('request disallowed')
  );
}

// Brand panel
function BrandPanel() {
  return (
    <div
      className="auth-brand-panel"
      style={{
        background: `linear-gradient(145deg, ${C.navy} 0%, ${C.navyMid} 48%, ${C.cardSolid} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${SPACE[16]} ${SPACE[12]}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glows */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `linear-gradient(${C.borderFaint} 1px, transparent 1px), linear-gradient(90deg, ${C.borderFaint} 1px, transparent 1px)`,
          backgroundSize: '68px 68px',
          opacity: 0.1,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <WaselLogo size={44} theme="light" variant="full" />
        </div>
        <h2
          style={{
            fontSize: TYPE.size['3xl'],
            fontWeight: TYPE.weight.ultra,
            color: C.text,
            letterSpacing: 0,
            margin: `${SPACE[8]} 0 ${SPACE[3]}`,
            lineHeight: 1.12,
          }}
        >
          <span style={{ display: 'block' }}>One identity</span>
          <span
            style={{
              display: 'block',
              background: GRAD_SIGNAL,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            for every route
          </span>
        </h2>

        <p
          style={{
            fontSize: TYPE.size.base,
            color: C.textMuted,
            lineHeight: TYPE.lineHeight.loose,
            marginBottom: SPACE[6],
          }}
        >
          Rides, parcels, buses, trust, and support stay under one clear account.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: SPACE[3],
            marginBottom: SPACE[6],
          }}
        >
          {BRAND_METRICS.map(item => (
            <div
              key={item.label}
              style={{
                borderRadius: R.xl,
                border: `1px solid ${item.accent}24`,
                background: `${item.accent}12`,
                padding: `${SPACE[3]} ${SPACE[4]}`,
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  color: C.text,
                  fontSize: TYPE.size.lg,
                  fontWeight: TYPE.weight.ultra,
                  lineHeight: TYPE.lineHeight.tight,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: C.textMuted,
                  fontSize: TYPE.size.xs,
                  textTransform: 'uppercase',
                  letterSpacing: 0,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[3], textAlign: 'left' }}>
          {BRAND_FEATURES.map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: R.sm,
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}28`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <span style={{ fontSize: TYPE.size.sm, color: `${C.text}99` }}>{item.text}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            gap: SPACE[3],
            justifyContent: 'center',
            marginTop: SPACE[8],
            flexWrap: 'wrap',
          }}
        >
          {BRAND_PILLS.map(label => (
            <span
              key={label}
              style={{
                fontSize: TYPE.size.xs,
                color: `${C.text}66`,
                background: `${C.text}0a`,
                border: `1px solid ${C.text}18`,
                borderRadius: R.full,
                padding: '4px 10px',
              }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Password strength bar
function StrengthBar({ password }: { password: string }) {
  const strength = pwStrength(password);
  if (!password) return null;
  return (
    <div>
      <div style={{ display: 'flex', gap: SPACE[1], marginBottom: SPACE[1] }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div
            key={n}
            style={{
              flex: 1,
              height: 3,
              borderRadius: R.full,
              background: n <= strength.score ? strength.color : `${C.text}14`,
              transition: 'background 200ms ease',
            }}
          />
        ))}
      </div>
      {strength.label && (
        <span style={{ fontSize: TYPE.size.xs, color: strength.color, fontFamily: F }}>
          {strength.label}
        </span>
      )}
    </div>
  );
}

// Tab switcher
function TabSwitcher({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div
      style={{
        display: 'flex',
        background: C.cardSolid,
        borderRadius: R.xl,
        padding: 4,
        marginBottom: SPACE[7],
        border: `1px solid ${C.border}`,
      }}
    >
      {(['signin', 'signup'] as Tab[]).map(value => {
        const active = tab === value;
        return (
          <motion.button
            key={value}
            onClick={() => onChange(value)}
            aria-label={value === 'signin' ? 'Switch to sign in' : 'Switch to create account'}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              height: 42,
              borderRadius: R.lg,
              border: 'none',
              cursor: 'pointer',
              fontSize: TYPE.size.sm,
              fontWeight: active ? TYPE.weight.black : TYPE.weight.semibold,
              fontFamily: F,
              background: active ? GRAD : 'transparent',
              color: active ? C.bg : C.textMuted,
              boxShadow: active ? `0 2px 12px ${C.cyanGlow}` : 'none',
              transition: 'all 150ms ease',
            }}
          >
            {value === 'signin' ? 'Sign in' : 'Create account'}
          </motion.button>
        );
      })}
    </div>
  );
}

// Main component
export default function WaselAuth() {
  const [params] = useSearchParams();
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
  const [notice, setNotice] = useState(
    passwordResetCompleted ? 'Password updated. Sign in with your new password.' : '',
  );
  const [phoneOtpChannel, setPhoneOtpChannel] = useState<PhoneOtpChannel | null>(null);
  const [phoneOtpCode, setPhoneOtpCode] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaResetSignal, setCaptchaResetSignal] = useState(0);
  const [activeAuthAction, setActiveAuthAction] = useState<AuthAction | null>(null);

  const { signIn, register, loading, user } = useLocalAuth();
  const { resetPassword, signInWithGoogle, signInWithFacebook, startPhoneOtp, verifyPhoneOtp } =
    useAuth();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef(true);

  const safeReturnTo = normalizeReturnToPath(params.get('returnTo'));
  const localCaptchaBypassActive = isLocalCaptchaBypassActive();
  const authBusy = loading || activeAuthAction !== null;
  const resetCaptcha = () => setCaptchaResetSignal(value => value + 1);
  const handleCaptchaTokenChange = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const getCaptchaTokenForSubmit = () => {
    // Only require captcha if it's actually configured
    if (isAuthCaptchaConfigured && !captchaToken) {
      setError('Please complete the verification check below.');
      return null;
    }

    // If captcha is not configured, proceed without token
    return isAuthCaptchaConfigured ? captchaToken : undefined;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
    setPhoneOtpChannel(null);
    setPhoneOtpSent(false);
    setPhoneOtpCode('');
    resetCaptcha();
    if (!passwordResetCompleted) {
      setNotice('');
    }
  };

  const handleSignIn = async () => {
    if (authBusy) return;
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
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
    if (!checkRateLimit(`signin:${email}`, { maxRequests: 5, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }
    const token = getCaptchaTokenForSubmit();
    if (token === null) return;

    setActiveAuthAction('signin');
    try {
      const { error: signInError } = await signIn(email, password, token);
      resetCaptcha();
      if (signInError) {
        if (!isAuthCaptchaConfigured && isAccountProtectionError(signInError)) {
          setError(
            'Account protection is enabled on Supabase, but this build has no captcha site key. Configure VITE_AUTH_CAPTCHA_PROVIDER and VITE_AUTH_CAPTCHA_SITE_KEY to match your Supabase captcha settings, or disable captcha protection for this local Supabase project.',
          );
          return;
        }
        setError(friendlyAuthError(signInError, 'Sign in failed. Please try again.'));
        return;
      }
      pushSuccessRedirect();
    } finally {
      setActiveAuthAction(null);
    }
  };

  const handleSignUp = async () => {
    if (authBusy) return;
    setError('');
    if (!passwordResetCompleted) {
      setNotice('');
    }
    if (!name.trim()) {
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
    if (!meetsPasswordPolicy(password)) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    if (!checkRateLimit(`signup:${email}`, { maxRequests: 3, windowMs: 60_000 })) {
      setError('Too many attempts. Please wait a minute and try again.');
      return;
    }
    const token = getCaptchaTokenForSubmit();
    if (token === null) return;

    setActiveAuthAction('signup');
    try {
      const registration = await register(name, email, password, phone, safeReturnTo, token);
      resetCaptcha();
      if (registration.error) {
        if (!isAuthCaptchaConfigured && isAccountProtectionError(registration.error)) {
          setError(
            'Account protection is enabled on Supabase, but this build has no captcha site key. Configure VITE_AUTH_CAPTCHA_PROVIDER and VITE_AUTH_CAPTCHA_SITE_KEY to match your Supabase captcha settings, or disable captcha protection for this local Supabase project.',
          );
          return;
        }
        setError(friendlyAuthError(registration.error, 'Sign up failed. Please try again.'));
        return;
      }
      if (registration.requiresEmailConfirmation) {
        setPassword('');
        setNotice(
          `Check ${registration.email ?? email} and confirm your email address to finish creating your account.`,
        );
        setTab('signin');
        return;
      }
      pushSuccessRedirect();
    } finally {
      setActiveAuthAction(null);
    }
  };

  const handleForgotPassword = async () => {
    if (authBusy) return;
    if (!email.trim()) {
      setError('Enter your email address above first.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    const token = getCaptchaTokenForSubmit();
    if (token === null) return;

    setActiveAuthAction('forgot-password');
    try {
      const { error: resetError } = await resetPassword(email, safeReturnTo, token);
      resetCaptcha();
      if (resetError) {
        setError(friendlyAuthError(resetError, 'Password reset failed.'));
        return;
      }
      setError('');
      toast.success(`If ${email} is registered, a password reset link has been sent.`);
    } finally {
      setActiveAuthAction(null);
    }
  };

  const handleGoogleSignIn = async () => {
    if (authBusy) return;
    setError('');
    setActiveAuthAction('google');
    const { error: oauthError } = await signInWithGoogle(safeReturnTo);

    if (oauthError) {
      setError(friendlyAuthError(oauthError, 'Google sign in failed. Please try again.'));
      setActiveAuthAction(null);
    }
  };

  const handleFacebookSignIn = async () => {
    if (authBusy) return;
    setError('');
    setActiveAuthAction('facebook');
    const { error: oauthError } = await signInWithFacebook(safeReturnTo);

    if (oauthError) {
      setError(friendlyAuthError(oauthError, 'Facebook sign in failed. Please try again.'));
      setActiveAuthAction(null);
    }
  };

  const handleStartPhoneOtp = async (channel: PhoneOtpChannel) => {
    if (authBusy) return;
    setError('');
    setNotice('');

    const normalizedPhone = normalizePhoneForOtp(phone);
    if (!isValidOtpPhone(normalizedPhone)) {
      setError('Enter a valid phone number in international format, for example +962791234567.');
      return;
    }

    const token = getCaptchaTokenForSubmit();
    if (token === null) return;

    setActiveAuthAction(channel === 'sms' ? 'sms-otp' : 'whatsapp-otp');
    try {
      const { error: otpError } = await startPhoneOtp(normalizedPhone, channel, token);
      resetCaptcha();
      if (otpError) {
        setError(
          friendlyAuthError(
            otpError,
            `${channel === 'sms' ? 'SMS' : 'WhatsApp'} code failed. Please try again.`,
          ),
        );
        return;
      }

      setPhone(normalizedPhone);
      setPhoneOtpChannel(channel);
      setPhoneOtpSent(true);
      setNotice(
        `Code sent by ${channel === 'sms' ? 'SMS' : 'WhatsApp'}. Enter it below to finish.`,
      );
    } finally {
      setActiveAuthAction(null);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (authBusy) return;
    setError('');

    const normalizedPhone = normalizePhoneForOtp(phone);
    const token = phoneOtpCode.replace(/\D/g, '');
    if (!isValidOtpPhone(normalizedPhone)) {
      setError('Enter a valid phone number in international format, for example +962791234567.');
      return;
    }
    if (token.length < 6) {
      setError('Enter the 6 digit verification code.');
      return;
    }

    const captcha = getCaptchaTokenForSubmit();
    if (captcha === null) return;

    setActiveAuthAction('verify-phone');
    try {
      const { error: verifyError } = await verifyPhoneOtp(
        normalizedPhone,
        token,
        safeReturnTo,
        captcha,
      );
      resetCaptcha();
      if (verifyError) {
        setError(friendlyAuthError(verifyError, 'Phone verification failed. Please try again.'));
        return;
      }

      pushSuccessRedirect();
    } finally {
      setActiveAuthAction(null);
    }
  };

  const socialButtons = [
    { label: 'Google', color: C.cyan, onClick: handleGoogleSignIn },
    { label: 'Facebook', color: C.navyLight, onClick: handleFacebookSignIn },
  ] as const;

  return (
    <div
      className="auth-grid"
      style={{
        minHeight: 'var(--app-min-height)',
        background: C.bg,
        color: C.text,
        fontFamily: F,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      }}
    >
      <style>{`
        @media(max-width:768px){
          .auth-grid{grid-template-columns:1fr!important}
          .auth-brand-panel{display:none!important}
          .auth-form-panel{padding:${SPACE[7]} ${SPACE[5]}!important;align-items:flex-start!important}
          .auth-mobile-header{display:flex!important}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <BrandPanel />

      {/* Form panel */}
      <div
        className="auth-form-panel"
        style={{
          background: `linear-gradient(180deg, ${C.bg} 0%, ${C.bgAlt} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${SPACE[16]} ${SPACE[12]}`,
          overflowY: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Mobile header (hidden on desktop) */}
          <div
            className="auth-mobile-header"
            style={{
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: SPACE[7],
              paddingBottom: SPACE[6],
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <h2
              style={{
                fontSize: TYPE.size.xl,
                fontWeight: TYPE.weight.ultra,
                color: C.text,
                marginTop: 0,
                marginBottom: SPACE[2],
                letterSpacing: 0,
              }}
            >
              <span style={{ color: C.cyan }}>One identity</span>
            </h2>
            <p style={{ fontSize: TYPE.size.sm, color: C.textMuted, marginBottom: SPACE[3] }}>
              Sign in once for rides, parcels, buses, and trust.
            </p>
          </div>

          <TabSwitcher tab={tab} onChange={handleTabChange} />

          {localCaptchaBypassActive && (
            <WaselCard
              variant="solid"
              padding={`${SPACE[3]} ${SPACE[4]}`}
              radius={R.lg}
              style={{
                marginBottom: SPACE[5],
                background: C.cyanDim,
                border: `1px solid ${C.cyan}35`,
              }}
            >
              <span style={{ fontSize: TYPE.size.xs, color: C.cyan, fontFamily: F }}>
                Test auth is active because VITE_E2E_LOCAL_AUTH is enabled. Accounts are stored only
                in this browser.
              </span>
            </WaselCard>
          )}

          {/* Heading */}
          <div style={{ marginBottom: SPACE[6] }}>
            <h3
              style={{
                fontSize: TYPE.size['2xl'],
                fontWeight: TYPE.weight.ultra,
                color: C.text,
                margin: `0 0 ${SPACE[2]}`,
                letterSpacing: 0,
              }}
            >
              {tab === 'signin' ? 'Back into Wasel' : 'Create your Wasel account'}
            </h3>
            <p
              style={{
                fontSize: TYPE.size.sm,
                color: C.textMuted,
                margin: 0,
                lineHeight: TYPE.lineHeight.relaxed,
              }}
            >
              {tab === 'signin'
                ? 'Open your routes, wallet, and trip state from one sign-in.'
                : 'Unlock rides, parcels, buses, and trust with one account.'}
            </p>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {notice && !error && !success && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: SPACE[5] }}
              >
                <WaselCard
                  variant="solid"
                  padding={`${SPACE[3]} ${SPACE[4]}`}
                  radius={R.lg}
                  style={{ background: C.greenDim, border: `1px solid ${C.green}40` }}
                >
                  <span style={{ fontSize: TYPE.size.sm, color: C.green, fontFamily: F }}>
                    {notice}
                  </span>
                </WaselCard>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden', marginBottom: SPACE[5] }}
              >
                <WaselCard
                  variant="solid"
                  padding={`${SPACE[3]} ${SPACE[4]}`}
                  radius={R.lg}
                  style={{ background: C.errorDim, border: `1px solid ${C.error}40` }}
                >
                  <span style={{ fontSize: TYPE.size.sm, color: C.error, fontFamily: F }}>
                    {error}
                  </span>
                </WaselCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success banner */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ marginBottom: SPACE[5] }}
              >
                <WaselCard
                  variant="solid"
                  padding={`${SPACE[3]} ${SPACE[4]}`}
                  radius={R.lg}
                  style={{ background: C.greenDim, border: `1px solid ${C.green}40` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[2] }}>
                    <CheckCircle2 size={16} color={C.green} />
                    <span style={{ fontSize: TYPE.size.sm, color: C.green, fontFamily: F }}>
                      Signed in successfully. Redirecting now.
                    </span>
                  </div>
                </WaselCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Fields */}
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.15 }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE[4] }}>
                {tab === 'signup' && (
                  <WaselInput
                    id="full-name"
                    label="Full name"
                    description="As shown on your profile"
                    value={name}
                    onChange={setName}
                    placeholder="Ahmad Al-Rashid"
                    icon={<UserRound size={16} />}
                  />
                )}

                <WaselInput
                  id="auth-email"
                  label="Email address"
                  description="Used for sign in"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                  icon={<Mail size={16} />}
                />

                <WaselInput
                  id="auth-password"
                  label="Password"
                  description={
                    tab === 'signin'
                      ? 'Your account password'
                      : 'Lowercase, uppercase, number, and special character'
                  }
                  type="password"
                  value={password}
                  onChange={setPassword}
                  placeholder={
                    tab === 'signin' ? 'Enter your password' : 'Create a secure password'
                  }
                  icon={<Lock size={16} />}
                  hint={
                    tab === 'signup' && password.length > 0 ? (
                      <StrengthBar password={password} />
                    ) : undefined
                  }
                />

                {tab === 'signup' && (
                  <WaselInput
                    id="auth-phone"
                    label="Phone number"
                    description="Optional"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="+962 79 123 4567"
                    icon={<Phone size={16} />}
                  />
                )}

                {tab === 'signin' && (
                  <div style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: C.cyan,
                        fontSize: TYPE.size.xs,
                        cursor: 'pointer',
                        fontFamily: F,
                        padding: 0,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <AuthCaptcha
                  onTokenChange={handleCaptchaTokenChange}
                  resetSignal={captchaResetSignal}
                />

                <WaselButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={activeAuthAction === 'signin' || activeAuthAction === 'signup'}
                  disabled={authBusy || success}
                  onClick={tab === 'signin' ? handleSignIn : handleSignUp}
                  aria-label={tab === 'signin' ? 'Submit sign in' : 'Submit sign up'}
                  iconEnd={<ArrowRight size={16} />}
                >
                  {tab === 'signin' ? 'Sign in' : 'Create account'}
                </WaselButton>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE[3] }}>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: TYPE.size.xs, color: C.textMuted }}>
                    or continue with
                  </span>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                </div>

                {/* Social buttons */}
                <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap' }}>
                  {socialButtons.map(social => (
                    <motion.button
                      key={social.label}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={authBusy || success}
                      onClick={() => {
                        void social.onClick();
                      }}
                      style={{
                        flex: '1 1 120px',
                        height: 44,
                        borderRadius: R.lg,
                        border: `1px solid ${social.color}30`,
                        background: `${social.color}0C`,
                        color: social.color,
                        fontWeight: TYPE.weight.black,
                        fontSize: TYPE.size.sm,
                        fontFamily: F,
                        cursor: authBusy || success ? 'not-allowed' : 'pointer',
                        opacity: authBusy || success ? 0.55 : 1,
                        transition: 'all 150ms ease',
                      }}
                    >
                      {activeAuthAction === social.label.toLowerCase()
                        ? 'Connecting...'
                        : social.label}
                    </motion.button>
                  ))}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gap: SPACE[3],
                    padding: SPACE[4],
                    borderRadius: R.lg,
                    border: `1px solid ${C.border}`,
                    background: `${C.text}06`,
                  }}
                >
                  <WaselInput
                    id="phone-otp"
                    label="Phone sign in"
                    description="SMS or WhatsApp one-time code"
                    type="tel"
                    value={phone}
                    onChange={value => {
                      setPhone(value);
                      setPhoneOtpSent(false);
                      setPhoneOtpCode('');
                    }}
                    placeholder="+962 79 123 4567"
                    icon={<Phone size={16} />}
                  />

                  {phoneOtpSent && (
                    <WaselInput
                      id="phone-otp-code"
                      label="Verification code"
                      description={`Sent by ${phoneOtpChannel === 'whatsapp' ? 'WhatsApp' : 'SMS'}`}
                      type="text"
                      value={phoneOtpCode}
                      onChange={setPhoneOtpCode}
                      placeholder="123456"
                      icon={<Shield size={16} />}
                    />
                  )}

                  <div style={{ display: 'flex', gap: SPACE[2], flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={authBusy || success}
                      onClick={() => {
                        void handleStartPhoneOtp('sms');
                      }}
                      style={{
                        flex: '1 1 110px',
                        minHeight: 42,
                        borderRadius: R.lg,
                        border: `1px solid ${C.cyan}30`,
                        background: `${C.cyan}0C`,
                        color: C.cyan,
                        fontWeight: TYPE.weight.black,
                        fontSize: TYPE.size.sm,
                        fontFamily: F,
                        cursor: authBusy || success ? 'not-allowed' : 'pointer',
                        opacity: authBusy || success ? 0.55 : 1,
                      }}
                    >
                      {activeAuthAction === 'sms-otp' ? 'Sending...' : 'Send SMS'}
                    </button>
                    <button
                      type="button"
                      disabled={authBusy || success}
                      onClick={() => {
                        void handleStartPhoneOtp('whatsapp');
                      }}
                      style={{
                        flex: '1 1 110px',
                        minHeight: 42,
                        borderRadius: R.lg,
                        border: `1px solid ${C.greenDim}`,
                        background: C.greenDim,
                        color: C.green,
                        fontWeight: TYPE.weight.black,
                        fontSize: TYPE.size.sm,
                        fontFamily: F,
                        cursor: authBusy || success ? 'not-allowed' : 'pointer',
                        opacity: authBusy || success ? 0.55 : 1,
                      }}
                    >
                      {activeAuthAction === 'whatsapp-otp' ? 'Sending...' : 'Send WhatsApp'}
                    </button>
                    {phoneOtpSent && (
                      <button
                        type="button"
                        disabled={authBusy || success}
                        onClick={() => {
                          void handleVerifyPhoneOtp();
                        }}
                        style={{
                          flex: '1 1 100%',
                          minHeight: 42,
                          borderRadius: R.lg,
                          border: 'none',
                          background: GRAD,
                          color: C.bg,
                          fontWeight: TYPE.weight.black,
                          fontSize: TYPE.size.sm,
                          fontFamily: F,
                          cursor: authBusy || success ? 'not-allowed' : 'pointer',
                          opacity: authBusy || success ? 0.55 : 1,
                        }}
                      >
                        {activeAuthAction === 'verify-phone' ? 'Verifying...' : 'Verify phone code'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Legal */}
          <p
            style={{
              fontSize: TYPE.size.xs,
              color: C.textMuted,
              textAlign: 'center',
              marginTop: SPACE[6],
              lineHeight: TYPE.lineHeight.relaxed,
            }}
          >
            By continuing, you agree to our{' '}
            <button
              type="button"
              onClick={() => nav('/terms')}
              style={{
                color: C.cyan,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
              }}
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={() => nav('/privacy')}
              style={{
                color: C.cyan,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
              }}
            >
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
