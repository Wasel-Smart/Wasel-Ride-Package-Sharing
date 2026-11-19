import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowRight,
  Bus,
  Check,
  CheckCircle2,
  Lock,
  Mail,
  Package,
  Phone,
  Shield,
  UserRound,
  Zap,
} from 'lucide-react';
import { WaselHeroMark, WaselLogo } from '../components/wasel-ui/WaselLogo';
import { WaselButton } from '../components/wasel-ui/WaselButton';
import { WaselInput } from '../components/wasel-ui/WaselInput';
import { WaselCard } from '../components/wasel-ui/WaselCard';
import { WaselAmbientGlow } from '../components/wasel-ui/WaselStatCard';
import { WaselStatsGrid } from '../components/wasel-ui';
import { useLanguage } from '../contexts/LanguageContext';
import { useLocalAuth } from '../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../hooks/useIframeSafeNavigate';
import { checkRateLimit, resetRateLimit, validateEmail, validatePhone } from '../utils/security';
import { useAuth } from '../contexts/AuthContext';
import type { AuthOperationError } from '../contexts/authContextHelpers';
import { getAuthCallbackUrl, getWhatsAppSupportUrl, normalizeReturnToPath, resolveAuthRedirectOrigin } from '../utils/env';
import { friendlyAuthError, getPasswordRuleIssue, pwStrength } from '../utils/authHelpers';
import { fetchEnabledOAuthProviders, getProviderSetupInstructions } from '../utils/oauthValidator';
import { supabase } from '../utils/supabase/client';

import { C, R, TYPE, F, SPACE } from '../utils/wasel-ds';
import { tx } from '../locales/tx';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'signin' | 'signup';

// ─── Shared validation helpers ────────────────────────────────────────────────
// Password rules live in utils/authHelpers (getPasswordRuleIssue) so sign-up,
// password reset and the strength meter can never drift apart.

/** Strip spaces/dashes/brackets so "+962 79 123 4567" is accepted and sent as E.164. */
function normalizePhoneInput ( value: string ): string {
  return value.replace( /[\s\-().]/g, '' );
}

// ─── Feature list for the brand panel ────────────────────────────────────────
const BRAND_FEATURES = [
  { icon: <Zap size={ 14 } />, text: 'Live route graph', color: C.cyan },
  { icon: <Package size={ 14 } />, text: 'Parcels on route', color: C.gold },
  { icon: <Bus size={ 14 } />, text: 'Scheduled lanes', color: C.green },
  { icon: <Shield size={ 14 } />, text: 'Trust by default', color: C.purple },
] as const;

const BRAND_FEATURES_AR = [
  { icon: <Zap size={ 14 } />, text: 'رسم المسارات المباشر', color: C.cyan },
  { icon: <Package size={ 14 } />, text: 'طرود على نفس المسار', color: C.gold },
  { icon: <Bus size={ 14 } />, text: 'خطوط مجدولة', color: C.green },
  { icon: <Shield size={ 14 } />, text: 'الثقة من البداية', color: C.purple },
] as const;

const BRAND_METRICS = [
  { value: '3', label: 'mobility surfaces', accent: C.cyan },
  { value: '1', label: 'trusted account', accent: C.gold },
  { value: 'Live', label: 'route intelligence', accent: C.green },
];

const BRAND_METRICS_AR = [
  { value: '٣', label: 'أسطح تنقل', accent: C.cyan },
  { value: '١', label: 'حساب موثوق', accent: C.gold },
  { value: 'مباشر', label: 'ذكاء المسار', accent: C.green },
];

const BRAND_PILLS = [ 'Verified', 'Fast', 'Clear' ] as const;
const BRAND_PILLS_AR = [ 'موثّق', 'سريع', 'واضح' ] as const;

const BRAND_EYEBROW = "Jordan's mobility OS";
const BRAND_EYEBROW_AR = 'نظام التنقّل الأول في الأردن';

// ─── Brand panel (left column) ────────────────────────────────────────────────
function BrandPanel () {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const metrics = ar ? BRAND_METRICS_AR : BRAND_METRICS;
  const features = ar ? BRAND_FEATURES_AR : BRAND_FEATURES;
  const pills = ar ? BRAND_PILLS_AR : BRAND_PILLS;

  return (
    <div
      className="auth-brand-panel"
      style={ {
        background: `linear-gradient(145deg, ${ C.navy } 0%, ${ C.navyMid } 48%, ${ C.cardSolid } 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: `${ SPACE[ 16 ] } ${ SPACE[ 12 ] }`,
        position: 'relative',
        overflow: 'hidden',
      } }
    >
      <WaselAmbientGlow position="top-right" color={C.cyanGlow} size={460} />
      <WaselAmbientGlow position="bottom-left" color={C.blueDim} size={420} />

      <div style={ { position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 380 } }>
        <div
          style={ { margin: `0 0 ${ SPACE[ 6 ] }`, display: 'flex', justifyContent: 'center' } }
        >
          <WaselHeroMark size={ 110 } />
        </div>

        <div
          style={ {
            display: 'inline-flex',
            alignItems: 'center',
            gap: SPACE[ 2 ],
            padding: '6px 14px',
            borderRadius: R.full,
            background: `${ C.cyan }12`,
            border: `1px solid ${ C.cyan }30`,
            marginBottom: SPACE[ 5 ],
          } }
        >
          <span
            style={ {
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: C.cyan,
              boxShadow: `0 0 8px ${ C.cyan }`,
              animation: 'pulse-dot 2s ease-in-out infinite',
              flexShrink: 0,
            } }
          />
          <span
            style={ {
              fontSize: TYPE.size.xs,
              fontWeight: TYPE.weight.bold,
              color: C.cyan,
              textTransform: 'uppercase',
              letterSpacing: TYPE.letterSpacing.widest,
            } }
          >
            { ar ? BRAND_EYEBROW_AR : BRAND_EYEBROW }
          </span>
        </div>

        <h2
          style={ {
            fontSize: TYPE.size[ '3xl' ],
            fontWeight: TYPE.weight.ultra,
            color: C.text,
            letterSpacing: '-0.04em',
            margin: `0 0 ${ SPACE[ 3 ] }`,
            lineHeight: 1.12,
          } }
        >
          <span style={ { display: 'block' } }>{ tx( 'waselAuth.one_identity' ) }</span>
          <span
            style={ {
              display: 'block',
              background: 'linear-gradient(90deg, #00E5FF, #58DDFF)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            } }
          >
            { tx( 'waselAuth.for_every_route' ) }
          </span>
        </h2>

        <p
          style={ {
            fontSize: TYPE.size.base,
            color: C.textMuted,
            lineHeight: TYPE.lineHeight.loose,
            marginBottom: SPACE[ 6 ],
          } }
        >
          { tx( 'waselAuth.rides_parcels_buses_trust_and_support_stay_under_one_clear_account' ) }
        </p>

        <WaselStatsGrid stats={metrics} />

        <div style={ { display: 'flex', flexDirection: 'column', gap: SPACE[ 3 ], textAlign: 'left' } }>
          { features.map( item => (
            <div key={ item.text } style={ { display: 'flex', alignItems: 'center', gap: SPACE[ 3 ] } }>
              <div
                style={ {
                  width: 30,
                  height: 30,
                  borderRadius: R.sm,
                  background: `${ item.color }15`,
                  border: `1px solid ${ item.color }28`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.color,
                  flexShrink: 0,
                } }
              >
                { item.icon }
              </div>
              <span style={ { fontSize: TYPE.size.sm, color: `${ C.text }99` } }>{ item.text }</span>
            </div>
          ) ) }
        </div>

        <div
          style={ {
            display: 'flex',
            gap: SPACE[ 3 ],
            justifyContent: 'center',
            marginTop: SPACE[ 8 ],
            flexWrap: 'wrap',
          } }
        >
          { pills.map( label => (
            <span
              key={ label }
              style={ {
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: TYPE.size.xs,
                fontWeight: TYPE.weight.semibold,
                color: `${ C.text }99`,
                background: `${ C.text }0a`,
                border: `1px solid ${ C.text }18`,
                borderRadius: R.full,
                padding: '4px 12px 4px 8px',
              } }
            >
              <Check size={ 11 } color={ C.green } strokeWidth={ 3 } />
              { label }
            </span>
          ) ) }
        </div>
      </div>
    </div>
  );
}

// ─── Password strength bar ────────────────────────────────────────────────────
function StrengthBar ( { password }: { password: string } ) {
  const strength = pwStrength( password );
  if ( !password ) { return null; }
  return (
    <div>
      <div style={ { display: 'flex', gap: SPACE[ 1 ], marginBottom: SPACE[ 1 ] } }>
        { [ 1, 2, 3, 4, 5 ].map( n => (
          <div
            key={ n }
            style={ {
              flex: 1,
              height: 3,
              borderRadius: R.full,
              background: n <= strength.score ? strength.color : `${ C.text }14`,
              transition: 'background 200ms ease',
            } }
          />
        ) ) }
      </div>
      { strength.label && (
        <span style={ { fontSize: TYPE.size.xs, color: strength.color, fontFamily: F } }>
          { strength.label }
        </span>
      ) }
    </div>
  );
}

// ─── Tab switcher ─────────────────────────────────────────────────────────────
function TabSwitcher ( { tab, onChange }: { tab: Tab; onChange: ( t: Tab ) => void } ) {
  const { language } = useLanguage();
  const ar = language === 'ar';

  return (
    <div
      style={ {
        display: 'flex',
        background: C.cardSolid,
        borderRadius: R.xl,
        padding: 4,
        marginBottom: SPACE[ 7 ],
        border: `1px solid ${ C.border }`,
      } }
    >
      { ( [ 'signin', 'signup' ] as Tab[] ).map( value => {
        const active = tab === value;
        return (
          <motion.button
            key={ value }
            onClick={ () => onChange( value ) }
            aria-label={
              value === 'signin'
                ? ar
                  ? 'التبديل إلى تسجيل الدخول'
                  : 'Switch to sign in'
                : ar
                  ? 'التبديل إلى إنشاء حساب'
                  : 'Switch to create account'
            }
            whileTap={ { scale: 0.97 } }
            style={ {
              flex: 1,
              height: 42,
              borderRadius: R.lg,
              border: 'none',
              cursor: 'pointer',
              fontSize: TYPE.size.sm,
              fontWeight: active ? TYPE.weight.black : TYPE.weight.semibold,
              fontFamily: F,
              background: active
                ? 'linear-gradient(135deg, #00E5FF 0%, #0e5cb0 100%)'
                : 'transparent',
              color: active ? C.bg : C.textMuted,
              boxShadow: active ? `0 2px 12px ${ C.cyanGlow }` : 'none',
              transition: 'all 150ms ease',
            } }
          >
            { value === 'signin'
              ? ar
                ? 'تسجيل الدخول'
                : 'Sign in'
              : ar
                ? 'إنشاء حساب'
                : 'Create account' }
          </motion.button>
        );
      } ) }
    </div>
  );
}

// ─── Provider brand icons (inline SVG, no network) ───────────────────────────
function GoogleIcon () {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function FacebookIcon () {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.34l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WaselAuth () {
  const [ params ] = useSearchParams();
  const rawTab = params.get( 'tab' )?.toLowerCase();
  const initialTab: Tab = rawTab === 'signup' || rawTab === 'register' ? 'signup' : 'signin';
  const passwordResetCompleted = params.get( 'reset' ) === 'success';
  const { language } = useLanguage();
  const ar = language === 'ar';

  const [ tab, setTab ] = useState<Tab>( initialTab );
  const [ email, setEmail ] = useState( '' );
  const [ password, setPassword ] = useState( '' );
  const [ name, setName ] = useState( '' );
  const [ phone, setPhone ] = useState( '' );
  const [ error, setError ] = useState( '' );
  const [ success, setSuccess ] = useState( false );
  const [ notice, setNotice ] = useState(
    passwordResetCompleted
      ? ar
        ? 'تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.'
        : 'Password updated. Sign in with your new password.'
      : '',
  );
  const [ emailError, setEmailError ] = useState( '' );
  const [ passwordError, setPasswordError ] = useState( '' );
  const [ nameError, setNameError ] = useState( '' );
  const [ phoneError, setPhoneError ] = useState( '' );
  const [ needsConfirmation, setNeedsConfirmation ] = useState( false );
  const [ resending, setResending ] = useState( false );

  const { signIn, register, loading, isSubmitting, user } = useLocalAuth();
  const busy = loading || Boolean( isSubmitting );

  const { resetPassword, signInWithGoogle, signInWithFacebook } = useAuth();
  const nav = useIframeSafeNavigate();
  const mountedRef = useRef( true );
  // Guards against the `user` effect and the post-success timer both navigating.
  const redirectedRef = useRef( false );
  const [ oauthConfigWarning, setOauthConfigWarning ] = useState( '' );
  const [ providerAvailability, setProviderAvailability ] = useState<Record<string, boolean>>( {} );
  const [ activeProvider, setActiveProvider ] = useState<null | 'google' | 'facebook' | never>( null );

  const safeReturnTo = normalizeReturnToPath( params.get( 'returnTo' ) );

  const validateEmailRealtime = ( value: string ) => {
    if ( !value.trim() ) {
      setEmailError( ar ? 'البريد الإلكتروني مطلوب' : 'Email is required' );
      return false;
    }
    if ( !validateEmail( value ) ) {
      setEmailError( ar ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format' );
      return false;
    }
    setEmailError( '' );
    return true;
  };

  const validatePasswordRealtime = ( value: string ) => {
    if ( tab === 'signup' && value.length > 0 ) {
      const issue = getPasswordRuleIssue( value );
      if ( issue === 'min_length' ) {
        setPasswordError( tx( 'waselAuth.error_password_min_length' ) );
        return false;
      }
      if ( issue === 'requirements' ) {
        setPasswordError( tx( 'waselAuth.error_password_requirements' ) );
        return false;
      }
    }
    setPasswordError( '' );
    return true;
  };

  const validateNameRealtime = ( value: string ) => {
    if ( tab === 'signup' && !value.trim() ) {
      setNameError( ar ? 'الاسم الكامل مطلوب' : 'Full name is required' );
      return false;
    }
    setNameError( '' );
    return true;
  };

  const validatePhoneRealtime = ( value: string ) => {
    if ( tab === 'signup' && value.trim() && !validatePhone( normalizePhoneInput( value ) ) ) {
      setPhoneError( ar ? 'صيغة رقم الهاتف غير صحيحة (مثال: +962791234567)' : 'Invalid phone format (e.g. +962791234567)' );
      return false;
    }
    setPhoneError( '' );
    return true;
  };

  useEffect( () => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, [] );

  useEffect( () => {
    if ( user && mountedRef.current && !redirectedRef.current ) {
      redirectedRef.current = true;
      nav( safeReturnTo );
    }
  }, [ user, nav, safeReturnTo ] );

  // Real provider availability check (public GET /auth/v1/settings). Buttons of
  // providers that are not enabled are disabled up-front instead of failing after
  // a redirect round-trip. Unknown/unreachable => assume enabled.
  useEffect( () => {
    let cancelled = false;
    void fetchEnabledOAuthProviders().then( external => {
      if ( cancelled || !external ) { return; }
      setProviderAvailability( external );
      const disabled = ( [ 'google', 'facebook' ] as const ).filter( key => external[ key ] === false );
      if ( disabled.length > 0 ) {
        const names = disabled.map( key => ( key === 'google' ? 'Google' : 'Facebook' ) ).join( ' / ' );
        setOauthConfigWarning(
          ar
            ? `تسجيل الدخول عبر ${ names } غير مفعّل حالياً. استخدم البريد الإلكتروني وكلمة المرور.`
            : `${ names } sign-in is not enabled yet. Use email and password instead.`,
        );
      }
    } );
    return () => { cancelled = true; };
  }, [ ar ] );

  // Surface failures that Supabase or /api/auth/callback redirect back with
  // (?error=... in the query string, or #error=... in the hash).
  useEffect( () => {
    const hash = new URLSearchParams( window.location.hash.replace( /^#/, '' ) );
    const raw =
      params.get( 'error_description' ) ||
      params.get( 'error' ) ||
      hash.get( 'error_description' ) ||
      hash.get( 'error' );
    if ( !raw ) { return; }
    const cancelled = params.get( 'error' ) === 'access_denied' || hash.get( 'error' ) === 'access_denied';
    const clean = raw
      .replace( /[<>"'`]/g, '' )
      // eslint-disable-next-line no-control-regex
      .replace( /[\x00-\x1f\x7f]/g, '' )
      .slice( 0, 200 );
    if ( cancelled ) {
      setError( ar ? 'تم إلغاء تسجيل الدخول. يمكنك المحاولة مرة أخرى.' : 'Sign-in was cancelled. You can try again.' );
    } else if ( clean ) {
      setError( clean );
    }
  }, [ params, ar ] );

  // Returning via the browser back button restores this page from bfcache with
  // the provider spinner still active; unlock the buttons.
  useEffect( () => {
    const onPageShow = ( event: PageTransitionEvent ) => {
      if ( event.persisted ) { setActiveProvider( null ); }
    };
    window.addEventListener( 'pageshow', onPageShow );
    return () => window.removeEventListener( 'pageshow', onPageShow );
  }, [] );

  const pushSuccessRedirect = () => {
    setSuccess( true );
    setTimeout( () => {
      if ( mountedRef.current && !redirectedRef.current ) {
        redirectedRef.current = true;
        nav( safeReturnTo );
      }
    }, 700 );
  };

  const handleFormSubmit = async ( e: React.FormEvent ) => {
    e.preventDefault();
    if ( tab === 'signin' ) {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  };

  const handleTabChange = ( next: Tab ) => {
    setTab( next );
    setError( '' );
    setSuccess( false );
    if ( !passwordResetCompleted ) {
      setNotice( '' );
    }
  };

  const handleSignIn = async () => {
    setError( '' );
    if ( !passwordResetCompleted ) {
      setNotice( '' );
    }
    if ( !email.trim() ) {
      setError( tx( 'waselAuth.error_enter_email' ) );
      return;
    }
    if ( !validateEmail( email ) ) {
      setError( tx( 'waselAuth.error_enter_valid_email' ) );
      return;
    }
    if ( !password ) {
      setError( tx( 'waselAuth.error_enter_password' ) );
      return;
    }
    if ( !checkRateLimit( `signin:${ email }`, { maxRequests: 5, windowMs: 60_000 } ) ) {
      setError( tx( 'waselAuth.error_too_many_attempts' ) );
      return;
    }
    const { error: signInError } = await signIn( email, password );
    if ( signInError ) {
      setError( friendlyAuthError( signInError, tx( 'waselAuth.error_signin_failed' ) ) );
      setNeedsConfirmation( signInError.toLowerCase().includes( 'confirm your email' ) );
      return;
    }
    resetRateLimit( `signin:${ email }` );
    pushSuccessRedirect();
  };

  const handleSignUp = async () => {
    setError( '' );
    if ( !passwordResetCompleted ) {
      setNotice( '' );
    }
    if ( !name.trim() ) {
      setError( tx( 'waselAuth.error_enter_full_name' ) );
      return;
    }
    if ( !email.trim() ) {
      setError( tx( 'waselAuth.error_enter_email' ) );
      return;
    }
    if ( !validateEmail( email ) ) {
      setError( tx( 'waselAuth.error_enter_valid_email' ) );
      return;
    }
    const passwordIssue = getPasswordRuleIssue( password );
    if ( passwordIssue === 'min_length' ) {
      setError( tx( 'waselAuth.error_password_min_length' ) );
      return;
    }
    if ( passwordIssue === 'requirements' ) {
      setError( tx( 'waselAuth.error_password_requirements' ) );
      return;
    }
    const normalizedPhone = normalizePhoneInput( phone );
    if ( normalizedPhone && !validatePhone( normalizedPhone ) ) {
      setError( ar ? 'صيغة رقم الهاتف غير صحيحة (مثال: +962791234567)' : 'Invalid phone format (e.g. +962791234567)' );
      return;
    }
    if ( !checkRateLimit( `signup:${ email }`, { maxRequests: 3, windowMs: 60_000 } ) ) {
      setError( tx( 'waselAuth.error_too_many_attempts' ) );
      return;
    }
    const registration = await register({ name: name.trim(), email, password, phone: normalizedPhone, returnTo: safeReturnTo });
    if ( registration.error ) {
      setError( friendlyAuthError( registration.error, tx( 'waselAuth.error_signup_failed' ) ) );
      return;
    }
    if ( registration.requiresEmailConfirmation ) {
      setNeedsConfirmation( true );
      setPassword( '' );
      setNotice(
        tx( 'waselAuth.confirm_email_notice', { email: registration.email ?? email } ),
      );
      setTab( 'signin' );
      resetRateLimit( `signup:${ email }` );
      return;
    }
    resetRateLimit( `signup:${ email }` );
    pushSuccessRedirect();
  };

  const handleResendConfirmation = async () => {
    if ( !supabase ) {
      setError( ar ? 'الخدمة غير مهيأة حالياً.' : 'Sign-in service is not configured.' );
      return;
    }
    if ( !email.trim() || !validateEmail( email ) ) {
      setError( tx( 'waselAuth.error_enter_valid_email' ) );
      return;
    }
    if ( !checkRateLimit( `resend:${ email }`, { maxRequests: 2, windowMs: 60_000 } ) ) {
      setError( tx( 'waselAuth.error_too_many_attempts' ) );
      return;
    }
    setResending( true );
    try {
      const { error: resendError } = await supabase.auth.resend( {
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getAuthCallbackUrl(
            resolveAuthRedirectOrigin(),
            safeReturnTo ? { returnTo: safeReturnTo } : undefined,
          ),
        },
      } );
      if ( resendError ) {
        setError( friendlyAuthError( resendError, ar ? 'تعذر إرسال رسالة التأكيد.' : 'Could not resend the confirmation email.' ) );
        return;
      }
      setError( '' );
      toast.success( ar ? `تم إرسال رسالة التأكيد إلى ${ email }` : `Confirmation email sent to ${ email }` );
    } catch {
      setError( ar ? 'تعذر إرسال رسالة التأكيد.' : 'Could not resend the confirmation email.' );
    } finally {
      if ( mountedRef.current ) { setResending( false ); }
    }
  };

  const handleForgotPassword = async () => {
    if ( !email.trim() ) {
      setError( tx( 'waselAuth.error_enter_email_first' ) );
      return;
    }
    if ( !validateEmail( email ) ) {
      setError( tx( 'waselAuth.error_enter_valid_email' ) );
      return;
    }
    const { error: resetError } = await resetPassword( email, safeReturnTo );
    if ( resetError ) {
      setError( friendlyAuthError( resetError, tx( 'waselAuth.error_reset_failed' ) ) );
      return;
    }
    setError( '' );
    toast.success( tx( 'waselAuth.reset_link_sent', { email } ) );
  };

  const runOAuth = async (
    provider: 'google' | 'facebook' | never,
    signIn: ( returnTo?: string ) => Promise<{ error: AuthOperationError }>,
  ) => {
    setError( '' );
    setActiveProvider( provider );
    try {
      const { error: oauthError } = await signIn( safeReturnTo );
      if ( oauthError ) {
        if ( mountedRef.current ) {
          const enhancedMessage = enhanceOAuthError( oauthError.message, provider );
          setError( friendlyAuthError( enhancedMessage, tx( `waselAuth.error_${ provider }_failed` ) ) );
          setActiveProvider( null );
        }
      }
      // On success the browser is navigating to the provider. Keep the buttons
      // locked until then so a double-click can't start a second PKCE flow.
    } catch ( unexpected ) {
      if ( mountedRef.current ) {
        setError( friendlyAuthError( unexpected, tx( `waselAuth.error_${ provider }_failed` ) ) );
        setActiveProvider( null );
      }
    }
  };

  const handleGoogleSignIn = () => {
    void runOAuth( 'google', signInWithGoogle );
  };

  const handleFacebookSignIn = () => {
    void runOAuth( 'facebook', signInWithFacebook );
  };

  // Empty when the number or the WhatsApp feature flag isn't configured, so the
  // help link is only rendered when it will actually open something.
  const whatsAppSupportUrl = getWhatsAppSupportUrl( ar ? 'مرحبا واصل' : 'Hi Wasel' );

  const handleWhatsAppHelp = () => {
    if ( !whatsAppSupportUrl ) {
      setError( tx( 'waselAuth.error_whatsapp_not_configured' ) );
      return;
    }
    window.open( whatsAppSupportUrl, '_blank', 'noopener,noreferrer' );
  };

  /**
   * Enhance OAuth error messages with actionable recovery steps
   */
  const enhanceOAuthError = ( error: string, provider: 'google' | 'facebook' | never ): string => {
    const lower = error.toLowerCase();
    const providerName = provider.charAt( 0 ).toUpperCase() + provider.slice( 1 );

    if ( lower.includes( 'redirect_uri' ) || lower.includes( 'uri not allowed' ) || lower.includes( 'invalid redirect' ) ) {
      const instructions = getProviderSetupInstructions( provider );
      return `${ providerName } sign-in is not configured correctly. To fix this:\n\n${ instructions.steps.map( ( s, i ) => `${ i + 1 }. ${ s }` ).join( '\n' ) }`;
    }

    if ( lower.includes( 'client' ) && ( lower.includes( 'invalid' ) || lower.includes( 'not found' ) ) ) {
      return `${ providerName } authentication credentials are missing or invalid. Check Supabase Dashboard > Authentication > Providers > ${ providerName }.`;
    }

    return error;
  };

  const socialButtons: Array<{
    key: 'google' | 'facebook';
    label: string;
    color: string;
    icon: React.ReactNode;
    onClick: () => void;
  }> = [
    {
      key: 'google',
      label: ar ? 'المتابعة عبر Google' : 'Continue with Google',
      color: '#4285F4',
      icon: <GoogleIcon />,
      onClick: handleGoogleSignIn,
    },
    {
      key: 'facebook',
      label: ar ? 'المتابعة عبر Facebook' : 'Continue with Facebook',
      color: '#1877F2',
      icon: <FacebookIcon />,
      onClick: handleFacebookSignIn,
    },
  ];

  // While the session is still resolving, show a spinner instead of the form
  // so an already-authenticated user never sees a flash of the sign-in UI.
  // Placed after every hook so the rules-of-hooks order stays stable.
  if ( loading && !user ) {
    return (
      <div
        style={ {
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          gap: 16,
        } }
      >
        <div
          aria-hidden="true"
          style={ {
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '3px solid rgba(0,229,255,0.18)',
            borderTopColor: '#00E5FF',
            animation: 'wasel-spin 0.8s linear infinite',
          } }
        />
      </div>
    );
  }

  return (
    <div
      className="auth-grid"
      style={ {
        minHeight: '100vh',
        background: C.bg,
        color: C.text,
        fontFamily: F,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
      } }
    >
      <style>{ `
        @media(max-width:768px){
          .auth-grid{grid-template-columns:1fr!important}
          .auth-brand-panel{display:none!important}
          .auth-form-panel{padding:${ SPACE[ 7 ] } ${ SPACE[ 5 ] }!important;align-items:flex-start!important}
          .auth-mobile-header{display:flex!important}
        }
        @keyframes pulse-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(0.85)}}
      `}</style>

      <BrandPanel />

      {/* ── Form panel ─────────────────────────────────────────────────── */ }
      <div
        className="auth-form-panel"
        style={ {
          background: `linear-gradient(180deg, ${ C.bg } 0%, ${ C.bgAlt } 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: `${ SPACE[ 16 ] } ${ SPACE[ 12 ] }`,
          overflowY: 'auto',
        } }
      >
        <div style={ { width: '100%', maxWidth: 440 } }>
          {/* Mobile header (hidden on desktop) */ }
          <div
            className="auth-mobile-header"
            style={ {
              display: 'none',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              marginBottom: SPACE[ 7 ],
              paddingBottom: SPACE[ 6 ],
              borderBottom: `1px solid ${ C.border }`,
            } }
          >
            <WaselLogo size={ 44 } theme="light" variant="full" />
            <h2
              style={ {
                fontSize: TYPE.size.xl,
                fontWeight: TYPE.weight.ultra,
                color: C.text,
                marginTop: SPACE[ 4 ],
                marginBottom: SPACE[ 2 ],
                letterSpacing: '-0.03em',
              } }
            >
              <span style={ { color: C.cyan } }>{ tx( 'waselAuth.one_identity_2' ) }</span>
            </h2>
            <p style={ { fontSize: TYPE.size.sm, color: C.textMuted, marginBottom: SPACE[ 3 ] } }>
              { tx( 'waselAuth.sign_in_once_for_rides_parcels_buses_and_trust' ) }
            </p>
          </div>

          <TabSwitcher tab={ tab } onChange={ handleTabChange } />

          {/* Heading */ }
          <div style={ { marginBottom: SPACE[ 6 ] } }>
            <h3
              style={ {
                fontSize: TYPE.size[ '2xl' ],
                fontWeight: TYPE.weight.ultra,
                color: C.text,
                margin: `0 0 ${ SPACE[ 2 ] }`,
                letterSpacing: '-0.02em',
              } }
            >
              { ar
                ? tab === 'signin'
                  ? 'مرحباً بعودتك إلى واصل'
                  : 'أنشئ حسابك في واصل'
                : tab === 'signin'
                  ? 'Welcome back to Wasel'
                  : 'Create your Wasel account' }
            </h3>
            <p
              style={ {
                fontSize: TYPE.size.sm,
                color: C.textMuted,
                margin: 0,
                lineHeight: TYPE.lineHeight.relaxed,
              } }
            >
              { tab === 'signin'
                ? tx( 'waselAuth.subtitle_signin' )
                : tx( 'waselAuth.subtitle_signup' ) }
            </p>
          </div>

          {/* Error banner */ }
          <AnimatePresence>
            { oauthConfigWarning && !error && (
              <motion.div
                initial={ { opacity: 0, height: 0 } }
                animate={ { opacity: 1, height: 'auto' } }
                exit={ { opacity: 0, height: 0 } }
                style={ { overflow: 'hidden', marginBottom: SPACE[ 5 ] } }
              >
                <WaselCard
                  variant="solid"
                  padding={ `${ SPACE[ 3 ] } ${ SPACE[ 4 ] }` }
                  radius={ R.lg }
                  style={ { background: 'rgba(255,190,92,0.08)', border: '1px solid rgba(255,190,92,0.28)' } }
                >
                  <div style={ { display: 'flex', alignItems: 'flex-start', gap: SPACE[ 2 ] } }>
                    <AlertCircle size={ 16 } color="#FFBE5C" style={ { flexShrink: 0, marginTop: 2 } } />
                    <span style={ { fontSize: TYPE.size.sm, color: 'rgba(248,251,255,0.86)', fontFamily: F } }>
                      { oauthConfigWarning }
                    </span>
                  </div>
                </WaselCard>
              </motion.div>
            ) }
          </AnimatePresence>

          <AnimatePresence>
            { notice && !error && !success && (
              <motion.div
                initial={ { opacity: 0, height: 0 } }
                animate={ { opacity: 1, height: 'auto' } }
                exit={ { opacity: 0, height: 0 } }
                style={ { overflow: 'hidden', marginBottom: SPACE[ 5 ] } }
              >
                <WaselCard
                  variant="solid"
                  padding={ `${ SPACE[ 3 ] } ${ SPACE[ 4 ] }` }
                  radius={ R.lg }
                  style={ { background: C.greenDim, border: `1px solid ${ C.green }40` } }
                >
                  <span style={ { fontSize: TYPE.size.sm, color: C.green, fontFamily: F } }>
                    { notice }
                  </span>
                </WaselCard>
              </motion.div>
            ) }
          </AnimatePresence>

          <AnimatePresence>
            { error && (
              <motion.div
                initial={ { opacity: 0, height: 0 } }
                animate={ { opacity: 1, height: 'auto' } }
                exit={ { opacity: 0, height: 0 } }
                style={ { overflow: 'hidden', marginBottom: SPACE[ 5 ] } }
              >
                <WaselCard
                  variant="solid"
                  padding={ `${ SPACE[ 3 ] } ${ SPACE[ 4 ] }` }
                  radius={ R.lg }
                  style={ { background: C.errorDim, border: `1px solid ${ C.error }40` } }
                >
                  <div style={ { display: 'flex', alignItems: 'flex-start', gap: SPACE[ 2 ] } }>
                    { error.includes( '\n' ) && (
                      <AlertCircle size={ 16 } color={ C.error } style={ { flexShrink: 0, marginTop: 2 } } />
                    ) }
                    <span
                      role="alert"
                      style={ {
                        fontSize: TYPE.size.sm,
                        color: C.error,
                        fontFamily: F,
                        whiteSpace: 'pre-line',
                        lineHeight: TYPE.lineHeight.relaxed,
                      } }
                    >
                      { error }
                    </span>
                  </div>
                </WaselCard>
              </motion.div>
            ) }
          </AnimatePresence>

          { tab === 'signin' && needsConfirmation && !success && (
            <div style={ { marginBottom: SPACE[ 5 ], textAlign: 'center' } }>
              <button
                type="button"
                onClick={ () => { void handleResendConfirmation(); } }
                disabled={ resending || busy }
                style={ {
                  background: 'none',
                  border: 'none',
                  color: C.cyan,
                  fontSize: TYPE.size.sm,
                  fontFamily: F,
                  cursor: resending || busy ? 'not-allowed' : 'pointer',
                  opacity: resending || busy ? 0.6 : 1,
                  padding: 0,
                  textDecoration: 'underline',
                } }
              >
                { resending
                  ? ( ar ? 'جارٍ الإرسال...' : 'Sending...' )
                  : ( ar ? 'لم تصلك رسالة التأكيد؟ أعد الإرسال' : "Didn't get the email? Resend confirmation" ) }
              </button>
            </div>
          ) }

          {/* Success banner */ }
          <AnimatePresence>
            { success && (
              <motion.div
                initial={ { opacity: 0, scale: 0.96 } }
                animate={ { opacity: 1, scale: 1 } }
                style={ { marginBottom: SPACE[ 5 ] } }
              >
                <WaselCard
                  variant="solid"
                  padding={ `${ SPACE[ 3 ] } ${ SPACE[ 4 ] }` }
                  radius={ R.lg }
                  style={ { background: C.greenDim, border: `1px solid ${ C.green }40` } }
                >
                  <div style={ { display: 'flex', alignItems: 'center', gap: SPACE[ 2 ] } }>
                    <CheckCircle2 size={ 16 } color={ C.green } />
                    <span style={ { fontSize: TYPE.size.sm, color: C.green, fontFamily: F } }>
                      { tx( 'waselAuth.signed_in_successfully_redirecting_now' ) }
                    </span>
                  </div>
                </WaselCard>
              </motion.div>
            ) }
          </AnimatePresence>

          {/* Fields */ }
          <AnimatePresence mode="wait">
            <motion.div
              key={ tab }
              initial={ { opacity: 0, x: 12 } }
              animate={ { opacity: 1, x: 0 } }
              exit={ { opacity: 0, x: -12 } }
              transition={ { duration: 0.15 } }
            >
              <form
                onSubmit={ handleFormSubmit }
                style={ { display: 'flex', flexDirection: 'column', gap: SPACE[ 4 ] } }
              >
                { tab === 'signup' && (
                  <div>
                    <WaselInput
                      id="full-name"
                      label={ tx( 'auth.fullName' ) }
                      description={ tx( 'waselAuth.as_shown_on_your_profile' ) }
                      value={ name }
                      onChange={ value => { setName( value ); validateNameRealtime( value ); } }
                      placeholder={ tx( 'waselAuth.ahmad_al_rashid' ) }
                      icon={ <UserRound size={ 16 } /> }
                    />
                    { nameError && (
                      <span style={ { color: C.error, fontSize: TYPE.size.xs, marginTop: 4, display: 'block' } }>
                        { nameError }
                      </span>
                    ) }
                  </div>
                ) }

                <div>
                  <WaselInput
                    id="auth-email"
                    label={ tx( 'common.email' ) }
                    description={ tx( 'waselAuth.used_for_sign_in' ) }
                    type="email"
                    value={ email }
                    onChange={ value => { const next = value.trim(); setEmail( next ); validateEmailRealtime( next ); } }
                    placeholder={ tx( 'waselAuth.you_example_com' ) }
                    icon={ <Mail size={ 16 } /> }
                  />
                  { emailError && (
                    <span style={ { color: C.error, fontSize: TYPE.size.xs, marginTop: 4, display: 'block' } }>
                      { emailError }
                    </span>
                  ) }
                </div>

                <div>
                  <WaselInput
                    id="auth-password"
                    label={ tx( 'auth.password' ) }
                    description={
                      tab === 'signin'
                        ? tx( 'waselAuth.your_account_password' )
                        : tx( 'waselAuth.minimum_8_characters' )
                    }
                    type="password"
                    value={ password }
                    onChange={ value => { setPassword( value ); validatePasswordRealtime( value ); } }
                    placeholder={
                      tab === 'signin'
                        ? tx( 'waselAuth.enter_your_password' )
                        : tx( 'waselAuth.create_a_secure_password' )
                    }
                    icon={ <Lock size={ 16 } /> }
                    hint={
                      tab === 'signup' && password.length > 0 ? (
                        <StrengthBar password={ password } />
                      ) : undefined
                    }
                  />
                  { passwordError && (
                    <span style={ { color: C.error, fontSize: TYPE.size.xs, marginTop: 4, display: 'block' } }>
                      { passwordError }
                    </span>
                  ) }
                </div>

                { tab === 'signup' && (
                  <div>
                    <WaselInput
                      id="auth-phone"
                      label={ tx( 'auth.phoneNumber' ) }
                      description={ tx( 'common.optional' ) }
                      type="tel"
                      value={ phone }
                      onChange={ value => { setPhone( value ); validatePhoneRealtime( value ); } }
                      placeholder="+962 79 123 4567"
                      icon={ <Phone size={ 16 } /> }
                    />
                    { phoneError && (
                      <span style={ { color: C.error, fontSize: TYPE.size.xs, marginTop: 4, display: 'block' } }>
                        { phoneError }
                      </span>
                    ) }
                  </div>
                ) }

                { tab === 'signin' && (
                  <div style={ { textAlign: 'right' } }>
                    <button
                      type="button"
                      onClick={ handleForgotPassword }
                      style={ {
                        background: 'none',
                        border: 'none',
                        color: C.cyan,
                        fontSize: TYPE.size.xs,
                        cursor: 'pointer',
                        fontFamily: F,
                        padding: 0,
                      } }
                    >
                      { tx( 'waselAuth.forgot_password' ) }
                    </button>
                  </div>
                ) }

                <WaselButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={ busy }
                  disabled={ success }
                  type="submit"
                  aria-label={ tab === 'signin' ? tx( 'waselAuth.submit_signin' ) : tx( 'waselAuth.submit_signup' ) }
                  iconEnd={ <ArrowRight size={ 16 } /> }
                >
                  { tab === 'signin' ? tx( 'waselAuth.sign_in' ) : tx( 'waselAuth.create_account' ) }
                </WaselButton>

                {/* Divider */ }
                <div style={ { display: 'flex', alignItems: 'center', gap: SPACE[ 3 ] } }>
                  <div style={ { flex: 1, height: 1, background: C.border } } />
                  <span style={ { fontSize: TYPE.size.xs, color: C.textMuted } }>
                    { tx( 'waselAuth.or_continue_with' ) }
                  </span>
                  <div style={ { flex: 1, height: 1, background: C.border } } />
                </div>

                {/* Social buttons */ }
                <div style={ { display: 'flex', gap: SPACE[ 2 ], flexWrap: 'wrap' } }>
                  { socialButtons.map( social => {
                    const isActive = activeProvider === social.key;
                    const providerOff = providerAvailability[ social.key ] === false;
                    const disabled = busy || success || providerOff || ( activeProvider !== null && !isActive );
                    return (
                      <motion.button
                        key={ social.key }
                        whileHover={ disabled ? undefined : { scale: 1.02 } }
                        whileTap={ disabled ? undefined : { scale: 0.97 } }
                        type="button"
                        disabled={ disabled }
                        aria-label={ social.label }
                        aria-busy={ isActive }
                        title={ providerOff ? ( ar ? 'غير مفعّل حالياً' : 'Not enabled yet' ) : undefined }
                        data-provider={ social.key }
                        onClick={ () => {
                          social.onClick();
                        } }
                        style={ {
                          flex: '1 1 100%',
                          minWidth: 0,
                          height: 44,
                          borderRadius: R.lg,
                          border: `1px solid ${ social.color }30`,
                          background: `${ social.color }0C`,
                          color: social.color,
                          fontWeight: TYPE.weight.black,
                          fontSize: TYPE.size.sm,
                          fontFamily: F,
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.55 : 1,
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: SPACE[ 2 ],
                        } }
                      >
                        { isActive ? (
                          <span
                            aria-hidden="true"
                            style={ {
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              border: `2px solid ${ social.color }40`,
                              borderTopColor: social.color,
                              animation: 'wasel-spin 0.8s linear infinite',
                              display: 'inline-block',
                            } }
                          />
                        ) : social.icon }
                        <span>{ social.label }</span>
                      </motion.button>
                    );
                  } ) }
                </div>

                { whatsAppSupportUrl && (
                  <div style={ { textAlign: 'center' } }>
                    <button
                      type="button"
                      onClick={ handleWhatsAppHelp }
                      style={ {
                        background: 'none',
                        border: 'none',
                        color: C.textMuted,
                        fontSize: TYPE.size.xs,
                        fontFamily: F,
                        cursor: 'pointer',
                        padding: 0,
                        textDecoration: 'underline',
                      } }
                    >
                      { tx( 'waselAuth.need_help_whatsapp' ) }
                    </button>
                  </div>
                ) }
              </form>
            </motion.div>
          </AnimatePresence>

          {/* Legal */ }
          <p
            style={ {
              fontSize: TYPE.size.xs,
              color: C.textMuted,
              textAlign: 'center',
              marginTop: SPACE[ 6 ],
              lineHeight: TYPE.lineHeight.relaxed,
            } }
          >
            { tx( 'waselAuth.by_continuing_you_agree_to_our' ) }{ ' ' }
            <button
              type="button"
              onClick={ () => nav( '/terms' ) }
              style={ {
                color: C.cyan,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
              } }
            >
              { tx( 'sidebar.terms' ) }
            </button>{ ' ' }
            { tx( 'waselAuth.and' ) }{ ' ' }
            <button
              type="button"
              onClick={ () => nav( '/privacy' ) }
              style={ {
                color: C.cyan,
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                font: 'inherit',
              } }
            >
              { tx( 'sidebar.privacy' ) }
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}


