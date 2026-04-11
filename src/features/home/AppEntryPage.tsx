import { useState, type CSSProperties } from 'react';
import { ArrowRight, Car, LogIn, Package, Search, type LucideIcon } from 'lucide-react';
import { WaselMark } from '../../components/wasel-ds/WaselLogo';
import {
  WaselBusinessFooter,
  WaselContactActionRow,
  WaselProofOfLifeBlock,
} from '../../components/system/WaselPresence';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { getWaselPresenceProfile } from '../../domains/trust/waselPresence';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { trackGrowthEvent } from '../../services/growthEngine';
import { friendlyAuthError } from '../../utils/authHelpers';
import { buildAuthPagePath } from '../../utils/authFlow';
import { C, F, TYPE } from '../../utils/wasel-ds';
import { DeferredLandingMap } from './DeferredLandingMap';
import { LANDING_DISPLAY, LANDING_FONT } from './landingConstants';

type ActionCard = {
  icon: LucideIcon;
  title: string;
  detail: string;
  path: string;
  color: string;
};

const panelStyle: CSSProperties = {
  borderRadius: 32,
  border: '1px solid rgba(244,198,81,0.16)',
  background:
    'linear-gradient(180deg, rgba(255,247,229,0.05), rgba(255,247,229,0.02)), rgba(12,20,30,0.86)',
  boxShadow: '0 30px 70px rgba(1,10,18,0.36)',
  backdropFilter: 'blur(24px)',
};

const outlineButtonStyle: CSSProperties = {
  minHeight: 52,
  padding: '0 20px',
  borderRadius: 18,
  border: '1px solid rgba(244,198,81,0.2)',
  background: 'rgba(255,247,229,0.04)',
  color: '#F8EFD6',
  fontSize: TYPE.size.sm,
  fontWeight: TYPE.weight.black,
  fontFamily: F,
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 52,
  padding: '0 22px',
  borderRadius: 18,
  border: 'none',
  background: 'linear-gradient(135deg, #FFF0C1 0%, #F4C651 44%, #C5831F 100%)',
  color: '#120D04',
  fontSize: TYPE.size.sm,
  fontWeight: TYPE.weight.ultra,
  fontFamily: F,
  cursor: 'pointer',
  boxShadow: '0 24px 64px rgba(197,131,31,0.24)',
};

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const { signInWithGoogle, signInWithFacebook } = useAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const [authError, setAuthError] = useState('');
  const [oauthProvider, setOauthProvider] = useState<'google' | 'facebook' | null>(null);
  const ar = language === 'ar';

  const profile = getWaselPresenceProfile();
  const defaultReturnTo = '/app/find-ride';
  const signInPath = buildAuthPagePath('signin', defaultReturnTo);
  const signUpPath = buildAuthPagePath('signup', defaultReturnTo);

  const buildPath = (path: string, requiresAuth = false) =>
    !requiresAuth || user ? path : buildAuthPagePath('signin', path);

  const handleLandingNavigate = (path: string) => {
    const eventMap = [
      { match: '/app/find-ride', eventName: 'landing_find_ride_opened', serviceType: 'ride' as const },
      { match: '/app/offer-ride', eventName: 'landing_offer_ride_opened', serviceType: 'ride' as const },
      { match: '/app/packages', eventName: 'landing_packages_opened', serviceType: 'package' as const },
      { match: 'tab=signup', eventName: 'landing_signup_opened', serviceType: 'referral' as const },
      { match: 'tab=signin', eventName: 'landing_signin_opened', serviceType: 'referral' as const },
    ].find(item => path.includes(item.match));

    const payload = {
      eventName: eventMap?.eventName ?? 'landing_navigation',
      funnelStage: 'selected',
      serviceType: eventMap?.serviceType ?? 'ride',
      metadata: {
        path,
        authState: user ? 'authenticated' : 'guest',
        locale: language,
      },
    } as const;

    void trackGrowthEvent(user?.id ? { userId: user.id, ...payload } : payload);

    navigate(path);
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setAuthError('');
    setOauthProvider(provider);
    const result =
      provider === 'google'
        ? await signInWithGoogle(defaultReturnTo)
        : await signInWithFacebook(defaultReturnTo);

    if (result.error) {
      setAuthError(
        friendlyAuthError(
          result.error,
          provider === 'google' ? 'Google sign in failed.' : 'Facebook sign in failed.',
        ),
      );
      setOauthProvider(null);
    }
  };

  const actionCards: readonly ActionCard[] = [
    {
      icon: Search,
      title: ar ? '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u062d\u0644\u0629' : 'Find a ride',
      detail: ar
        ? '\u0642\u0627\u0631\u0646 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062a \u0627\u0644\u062d\u064a\u0629 \u0641\u064a \u062b\u0648\u0627\u0646'
        : 'Compare live routes fast',
      path: buildPath('/app/find-ride'),
      color: C.cyan,
    },
    {
      icon: Car,
      title: ar ? '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u0629' : 'Create a ride',
      detail: ar
        ? '\u0628\u0639 \u0627\u0644\u0645\u0642\u0627\u0639\u062f\u060c \u0648\u0627\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f\u060c \u0648\u0627\u0641\u062a\u062d \u062f\u062e\u0644\u064b\u0627 \u0623\u0643\u0628\u0631 \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0631\u062d\u0644\u0629'
        : 'Sell seats and carry packages',
      path: buildPath('/app/offer-ride', true),
      color: C.gold,
    },
    {
      icon: Package,
      title: ar ? '\u0623\u0631\u0633\u0644 \u0637\u0631\u062f\u0627' : 'Send a package',
      detail: ar
        ? '\u062d\u0631\u0643 \u0627\u0644\u0637\u0631\u0648\u062f \u0639\u0628\u0631 \u0646\u0641\u0633 \u0627\u0644\u0634\u0628\u0643\u0629'
        : 'Send on the live network',
      path: buildPath('/app/packages'),
      color: C.green,
    },
  ] as const;

  const heroBadgeText = ar
    ? '\u0634\u0628\u0643\u0629 \u062d\u064a\u0629 \u0644\u0644\u0631\u062d\u0644\u0627\u062a \u0648\u0627\u0644\u0637\u0631\u0648\u062f'
    : 'Live mobility network';
  const heroTitleLead = ar
    ? '\u0627\u0641\u062a\u062d \u0627\u0644\u0634\u0628\u0643\u0629 \u0623\u0648\u0644\u0627\u064b.'
    : 'Open the network first.';
  const heroTitleAccent = ar
    ? '\u0627\u062e\u062a\u0631 \u0627\u0644\u062d\u0631\u0643\u0629 \u0628\u062f\u0642\u0629 \u0648\u0633\u0631\u0639\u0629.'
    : 'Choose movement with clarity.';
  const heroDescription = ar
    ? '\u0648\u0627\u0635\u0644 \u062a\u062c\u0645\u0639 \u0627\u0644\u0631\u062d\u0644\u0627\u062a \u0648\u0627\u0644\u0637\u0631\u0648\u062f \u0641\u064a \u062a\u062f\u0641\u0642 \u0648\u0627\u062d\u062f\u060c \u062d\u062a\u0649 \u0645\u064f\u0646\u0634\u0626 \u0627\u0644\u0631\u062d\u0644\u0629 \u064a\u0642\u062f\u0631 \u064a\u0628\u064a\u0639 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0648\u064a\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f \u0641\u064a \u0646\u0641\u0633 \u0627\u0644\u0645\u0634\u0648\u0627\u0631.'
    : 'Rides, buses, packages, and wallet access in one network.';
  const supplyTitle = ar
    ? '\u0631\u062d\u0644\u0629 \u0648\u0627\u062d\u062f\u0629\u060c \u0623\u0643\u062b\u0631 \u0645\u0646 \u0645\u0635\u062f\u0631 \u062f\u062e\u0644.'
    : 'One trip. More value.';
  const supplyBody = ar
    ? '\u0644\u0645\u0627 \u062a\u0646\u0634\u0626 \u0631\u062d\u0644\u0629 \u0639\u0628\u0631 \u0648\u0627\u0635\u0644\u060c \u062a\u0642\u062f\u0631 \u062a\u0639\u0631\u0636 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0644\u0644\u0628\u064a\u0639 \u0644\u0644\u0631\u0643\u0627\u0628 \u0648\u0628\u0646\u0641\u0633 \u0627\u0644\u0648\u0642\u062a \u062a\u0641\u0639\u0644 \u0648\u0636\u0639 \u0627\u0633\u062a\u0644\u0627\u0645 \u0627\u0644\u0637\u0631\u0648\u062f \u0648\u062a\u0633\u0644\u064a\u0645\u0647\u0627 \u0639\u0644\u0649 \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631.'
    : 'Open seats and package carrying on the same route.';
  const supplyPills = ar
    ? [
        '\u0628\u064a\u0639 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0644\u0644\u0631\u0643\u0627\u0628',
        '\u0627\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f \u0639\u0644\u0649 \u0646\u0641\u0633 \u0627\u0644\u0631\u062d\u0644\u0629',
        '\u0627\u0631\u0641\u0639 \u0642\u064a\u0645\u0629 \u0643\u0644 \u0645\u0634\u0648\u0627\u0631',
      ]
    : [
        'Sell seats to riders',
        'Carry packages on the same ride',
        'Increase earnings per departure',
      ];
  const heroSignals = ar
    ? [
        '\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0623\u0648\u0644\u0627\u064b',
        '\u0631\u062d\u0644\u0627\u062a + \u0637\u0631\u0648\u062f',
        '\u062f\u0639\u0645 \u0645\u062d\u0644\u064a',
      ]
    : ['Map first', 'Rides + packages', 'Ready support'];
  const quickPills = ar
    ? [
        '\u062d\u0631\u0643\u0629 \u062d\u064a\u0629',
        '\u0645\u0633\u0627\u0631\u0627\u062a \u0623\u0630\u0643\u0649',
        '\u0648\u0635\u0648\u0644 \u0623\u0628\u0633\u0637',
      ]
    : ['Live routes', 'Simple booking', 'Fast delivery'];
  const mapTitle = ar
    ? '\u0631\u0627\u0642\u0628 \u0627\u0644\u062d\u0631\u0643\u0629 \u0642\u0628\u0644 \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u062e\u062f\u0645\u0629.'
    : 'See the network first.';
  const mapBody = ar
    ? '\u0645\u0639\u0627\u064a\u0646\u0629 \u0648\u0627\u062d\u062f\u0629 \u062a\u0638\u0647\u0631 \u0627\u0644\u0634\u0628\u0643\u0629 \u0643\u0627\u0645\u0644\u0629\u060c \u062b\u0645 \u062a\u0641\u062a\u062d \u0627\u0644\u0631\u062d\u0644\u0629 \u0623\u0648 \u0627\u0644\u0637\u0631\u062f \u0627\u0644\u0645\u0646\u0627\u0633\u0628 \u0641\u0648\u0631\u0627\u064b.'
    : 'Scan movement, then open the right ride or package flow.';

  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 0% 0%, rgba(255,232,160,0.14), transparent 28%), radial-gradient(circle at 100% 0%, rgba(244,198,81,0.12), transparent 24%), radial-gradient(circle at 70% 60%, rgba(219,159,44,0.08), transparent 26%), linear-gradient(180deg, #07111B 0%, #09131F 52%, #050C15 100%)',
        color: '#F8EFD6',
        fontFamily: LANDING_FONT,
      }}
    >
      <style>{`
        .entry-shell,
        .entry-shell * { box-sizing: border-box; }
        .entry-shell button:focus-visible,
        .entry-shell a:focus-visible {
          outline: 2px solid rgba(244,198,81,0.92);
          outline-offset: 3px;
        }
        @media (max-width: 1120px) {
          .entry-main-grid,
          .entry-actions,
          .entry-meta {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 960px) {
          .entry-topbar {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
          .entry-visual-focus {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 640px) {
          .entry-shell { padding: 16px 14px 72px !important; }
          .entry-cta-row,
          .entry-auth-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .entry-cta-row > button,
          .entry-auth-row > button {
            width: 100%;
          }
        }
      `}</style>

      <div
        className="entry-shell"
        style={{ maxWidth: 1340, margin: '0 auto', padding: '24px 18px 84px' }}
      >
        <section
          style={{
            ...panelStyle,
            position: 'relative',
            overflow: 'hidden',
            padding: 22,
            background:
              'radial-gradient(circle at 18% 18%, rgba(255,232,160,0.12), rgba(8,19,31,0) 28%), radial-gradient(circle at 86% 18%, rgba(244,198,81,0.12), rgba(8,19,31,0) 24%), linear-gradient(180deg, rgba(255,247,229,0.03), rgba(255,247,229,0.015)), rgba(11,19,29,0.9)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 18%, rgba(255,255,255,0) 82%, rgba(255,255,255,0.03) 100%)',
              pointerEvents: 'none',
            }}
          />

          <header
            className="entry-topbar"
            style={{
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              marginBottom: 22,
            }}
          >
            <button
              type="button"
              onClick={() => handleLandingNavigate(user ? '/app/find-ride' : '/')}
              aria-label={ar ? '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629' : 'Home'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                background: 'transparent',
                border: 'none',
                color: '#F8EFD6',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              <WaselMark
                size={78}
                style={{
                  filter:
                    'drop-shadow(0 22px 38px rgba(1,10,18,0.32)) drop-shadow(0 0 28px rgba(244,198,81,0.14))',
                }}
              />
              <div style={{ display: 'grid', gap: 8, textAlign: ar ? 'right' : 'left' }}>
                <span
                  style={{
                    fontFamily: LANDING_DISPLAY,
                    fontSize: 'clamp(2.1rem, 4vw, 3.6rem)',
                    fontWeight: 700,
                    letterSpacing: '-0.08em',
                    lineHeight: 0.88,
                    background: 'linear-gradient(180deg, #FFF6DB 0%, #F6D874 58%, #D39019 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 14px 34px rgba(8, 17, 29, 0.24)',
                  }}
                >
                  Wasel
                </span>
                <span
                  style={{
                    color: 'rgba(243, 226, 185, 0.82)',
                    fontSize: 'clamp(0.94rem, 1.5vw, 1.08rem)',
                    fontWeight: TYPE.weight.bold,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.2,
                  }}
                >
                  {'\u0623\u0646\u0627 \u0648\u0627\u0635\u0644\u060c \u0623\u0646\u062a\u061f'}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 148,
                    maxWidth: '100%',
                    height: 4,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #FFF0C1 0%, #F4C651 54%, #C5831F 100%)',
                    boxShadow: '0 0 24px rgba(244,198,81,0.16)',
                  }}
                />
              </div>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <WaselContactActionRow ar={ar} compact />
              {user ? (
                <button
                  type="button"
                  onClick={() => handleLandingNavigate('/app/find-ride')}
                  style={primaryButtonStyle}
                >
                  {ar ? '\u0627\u0641\u062a\u062d \u0648\u0627\u0635\u0644' : 'Open Wasel'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleLandingNavigate(signInPath)}
                    style={outlineButtonStyle}
                  >
                    {ar ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' : 'Sign in'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLandingNavigate(signUpPath)}
                    style={primaryButtonStyle}
                  >
                    {ar ? '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646' : 'Open Wasel'}
                  </button>
                </>
              )}
            </div>
          </header>

          <div
            className="entry-main-grid"
            style={{
              position: 'relative',
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 0.96fr) minmax(360px, 1.04fr)',
              gap: 18,
              alignItems: 'stretch',
            }}
          >
            <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  width: 'fit-content',
                  padding: '10px 14px',
                  borderRadius: 999,
                  border: '1px solid rgba(244,198,81,0.16)',
                  background: 'rgba(244,198,81,0.08)',
                  color: '#F4C651',
                  fontSize: '0.76rem',
                  fontWeight: TYPE.weight.ultra,
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: C.gold,
                    boxShadow: `0 0 14px ${C.gold}`,
                  }}
                />
                {heroBadgeText}
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <h1
                  style={{
                    margin: 0,
                    maxWidth: 720,
                    fontFamily: LANDING_DISPLAY,
                    fontSize: 'clamp(3rem, 5.2vw, 5.4rem)',
                    lineHeight: 0.92,
                    letterSpacing: '-0.08em',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ display: 'block', color: '#F5FAFF' }}>{heroTitleLead}</span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 10,
                      background: 'linear-gradient(135deg, #FFF0C1 0%, #F4C651 46%, #C5831F 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {heroTitleAccent}
                  </span>
                </h1>

                <p
                  style={{
                    margin: 0,
                    maxWidth: 660,
                    color: 'rgba(228,214,180,0.78)',
                    fontSize: '1.02rem',
                    lineHeight: 1.76,
                  }}
                >
                  {heroDescription}
                </p>
              </div>

              <div className="entry-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleLandingNavigate(user ? '/app/find-ride' : signUpPath)}
                  style={{
                    ...primaryButtonStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  {user
                    ? ar
                      ? '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646'
                      : 'Start now'
                    : ar
                      ? '\u0623\u0646\u0634\u0626 \u062d\u0633\u0627\u0628\u0643'
                      : 'Create account'}
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleLandingNavigate(signInPath)}
                  style={{
                    ...outlineButtonStyle,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <LogIn size={16} />
                  {ar ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644' : 'Sign in'}
                </button>
              </div>

              {!user ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div className="entry-auth-row" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      void handleOAuth('google');
                    }}
                    aria-label={ar ? 'المتابعة باستخدام Google' : 'Continue with Google'}
                    disabled={oauthProvider !== null}
                    style={{
                        ...outlineButtonStyle,
                        minHeight: 46,
                        borderColor: 'rgba(105,215,247,0.2)',
                        color: '#F8EFD6',
                        opacity: oauthProvider === 'facebook' ? 0.55 : 1,
                      }}
                    >
                      {oauthProvider === 'google'
                        ? ar
                          ? '\u062c\u0627\u0631\u064a \u0627\u0644\u0641\u062a\u062d...'
                          : 'Opening...'
                        : 'Google'}
                    </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleOAuth('facebook');
                    }}
                    aria-label={ar ? 'المتابعة باستخدام Facebook' : 'Continue with Facebook'}
                    disabled={oauthProvider !== null}
                    style={{
                        ...outlineButtonStyle,
                        minHeight: 46,
                        borderColor: 'rgba(219,159,44,0.22)',
                        color: '#F8EFD6',
                        opacity: oauthProvider === 'google' ? 0.55 : 1,
                      }}
                    >
                      {oauthProvider === 'facebook'
                        ? ar
                          ? '\u062c\u0627\u0631\u064a \u0627\u0644\u0641\u062a\u062d...'
                          : 'Opening...'
                        : 'Facebook'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLandingNavigate(signInPath)}
                      aria-label={ar ? 'المتابعة باستخدام البريد الإلكتروني' : 'Continue with email'}
                      style={{ ...outlineButtonStyle, minHeight: 46 }}
                    >
                      {ar ? '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a' : 'Email'}
                    </button>
                  </div>
                  {authError ? (
                    <div
                      role="alert"
                      style={{
                        borderRadius: 18,
                        padding: '12px 14px',
                        background: 'rgba(255,100,106,0.10)',
                        border: '1px solid rgba(255,100,106,0.24)',
                        color: '#FFD5D7',
                        fontSize: '0.84rem',
                        lineHeight: 1.55,
                      }}
                    >
                      {authError}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div
                className="entry-meta"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}
              >
                {quickPills.map(pill => (
                  <div
                    key={pill}
                    style={{
                      borderRadius: 18,
                      padding: '14px 16px',
                      border: '1px solid rgba(244,198,81,0.14)',
                      background:
                        'linear-gradient(180deg, rgba(255,247,229,0.05), rgba(255,247,229,0.025))',
                      fontSize: '0.82rem',
                      fontWeight: TYPE.weight.black,
                      color: '#F8EFD6',
                      textAlign: ar ? 'right' : 'left',
                      lineHeight: 1.45,
                    }}
                  >
                    {pill}
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 24,
                  padding: '18px 18px 16px',
                  border: '1px solid rgba(244,198,81,0.16)',
                  background:
                    'radial-gradient(circle at 12% 12%, rgba(244,198,81,0.12), transparent 30%), linear-gradient(180deg, rgba(255,247,229,0.05), rgba(255,247,229,0.02))',
                  display: 'grid',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    width: 'fit-content',
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'rgba(244,198,81,0.10)',
                    border: '1px solid rgba(244,198,81,0.18)',
                    color: '#F4C651',
                    fontSize: '0.74rem',
                    fontWeight: TYPE.weight.ultra,
                    letterSpacing: '0.11em',
                    textTransform: 'uppercase',
                  }}
                >
                  {ar ? '\u0639\u0631\u0636 \u0627\u0644\u0631\u062d\u0644\u0629' : 'Create and earn'}
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div
                    style={{
                      color: '#F5FAFF',
                      fontFamily: LANDING_DISPLAY,
                      fontSize: 'clamp(1.3rem, 2.4vw, 2rem)',
                      lineHeight: 1,
                      letterSpacing: '-0.04em',
                      fontWeight: 700,
                    }}
                  >
                    {supplyTitle}
                  </div>
                  <div
                    style={{
                      color: 'rgba(228,214,180,0.72)',
                      fontSize: '0.9rem',
                      lineHeight: 1.7,
                      maxWidth: 560,
                    }}
                  >
                    {supplyBody}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {supplyPills.map((pill) => (
                    <span
                      key={pill}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 999,
                        border: '1px solid rgba(244,198,81,0.16)',
                        background: 'rgba(255,247,229,0.04)',
                        color: '#F8EFD6',
                        fontSize: '0.8rem',
                        fontWeight: TYPE.weight.black,
                      }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                <div className="entry-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleLandingNavigate(buildPath('/app/offer-ride', true))}
                    style={{
                      ...primaryButtonStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    {ar ? '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643 \u0648\u0627\u0628\u062f\u0623 \u0628\u0627\u0644\u0628\u064a\u0639' : 'Create ride and start selling seats'}
                    <ArrowRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLandingNavigate(buildPath('/app/packages'))}
                    style={{
                      ...outlineButtonStyle,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Package size={16} />
                    {ar ? '\u0627\u0639\u0631\u0641 \u0643\u064a\u0641 \u062a\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f' : 'See how package carrying works'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  color: 'rgba(228,214,180,0.62)',
                  fontSize: '0.82rem',
                }}
              >
                <span>{supportLine}</span>
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'rgba(240,246,255,0.28)',
                  }}
                />
                <span>{businessAddress}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <div
                style={{
                  ...panelStyle,
                  padding: 16,
                  background:
                    'radial-gradient(circle at 20% 16%, rgba(255,232,160,0.14), rgba(8,19,31,0) 30%), radial-gradient(circle at 82% 12%, rgba(244,198,81,0.1), rgba(8,19,31,0) 26%), linear-gradient(180deg, rgba(255,247,229,0.03), rgba(255,247,229,0.015)), rgba(11,19,29,0.94)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 10,
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {heroSignals.map(signal => (
                      <span
                        key={signal}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 999,
                          border: '1px solid rgba(244,198,81,0.16)',
                          background: 'rgba(255,247,229,0.04)',
                          color: '#F8EFD6',
                          fontSize: '0.8rem',
                          fontWeight: TYPE.weight.black,
                        }}
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleLandingNavigate('/app/mobility-os')}
                    aria-label={ar ? '\u0627\u0641\u062a\u062d \u0627\u0644\u062e\u0631\u064a\u0637\u0629' : 'Open map'}
                    style={{
                      minHeight: 42,
                      padding: '0 16px',
                      borderRadius: 16,
                      border: '1px solid rgba(244,198,81,0.18)',
                      background: 'rgba(255,247,229,0.04)',
                      color: '#F8EFD6',
                      fontWeight: TYPE.weight.black,
                      cursor: 'pointer',
                    }}
                  >
                    {ar ? '\u0627\u0633\u062a\u0643\u0634\u0641 \u0627\u0644\u062e\u0631\u064a\u0637\u0629' : 'Explore map'}
                  </button>
                </div>

                <div
                  className="entry-visual-focus"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(220px, 0.82fr) minmax(0, 1.18fr)',
                    gap: 14,
                    alignItems: 'center',
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      minHeight: 260,
                      borderRadius: 28,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'radial-gradient(circle at center, rgba(244,198,81,0.14), rgba(8,19,31,0) 62%), linear-gradient(180deg, rgba(255,247,229,0.03), rgba(255,247,229,0.015))',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        inset: '12% 16%',
                        borderRadius: '50%',
                        background:
                          'radial-gradient(circle, rgba(244,198,81,0.2) 0%, rgba(244,198,81,0.04) 48%, rgba(8,19,31,0) 74%)',
                        filter: 'blur(12px)',
                      }}
                    />
                    <WaselMark
                      size={208}
                      style={{
                        position: 'relative',
                        filter:
                          'drop-shadow(0 32px 54px rgba(1,10,18,0.38)) drop-shadow(0 0 36px rgba(244,198,81,0.14))',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gap: 10 }}>
                    <div
                      style={{
                        color: '#F4C651',
                        fontSize: '0.74rem',
                        fontWeight: TYPE.weight.ultra,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {ar ? '\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062d\u064a\u0629' : 'Live map'}
                    </div>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: LANDING_DISPLAY,
                        fontSize: 'clamp(1.5rem, 2.7vw, 2.3rem)',
                        lineHeight: 1,
                        letterSpacing: '-0.05em',
                        color: '#F5FAFF',
                      }}
                    >
                      {mapTitle}
                    </h2>
                    <p
                      style={{
                        margin: 0,
                        color: 'rgba(228,214,180,0.68)',
                        fontSize: '0.9rem',
                        lineHeight: 1.7,
                        maxWidth: 460,
                      }}
                    >
                      {mapBody}
                    </p>
                  </div>
                </div>

                <div style={{ borderRadius: 26, overflow: 'hidden' }}>
                  <DeferredLandingMap ar={ar} />
                </div>
              </div>

              <div
                className="entry-actions"
                style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}
              >
                {actionCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleLandingNavigate(card.path)}
                      style={{
                        ...panelStyle,
                        padding: '16px',
                        display: 'grid',
                        gap: 10,
                        textAlign: ar ? 'right' : 'left',
                        cursor: 'pointer',
                        background:
                          'linear-gradient(180deg, rgba(255,247,229,0.05), rgba(255,247,229,0.02)), rgba(14,24,36,0.84)',
                      }}
                    >
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: 14,
                          display: 'grid',
                          placeItems: 'center',
                          background: `${card.color}15`,
                          border: `1px solid ${card.color}33`,
                          boxShadow: `0 14px 28px ${card.color}18`,
                        }}
                      >
                        <Icon size={18} color={card.color} />
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: TYPE.weight.ultra, color: '#F8EFD6' }}>
                        {card.title}
                      </div>
                      <div
                        style={{
                          color: 'rgba(228,214,180,0.62)',
                          fontSize: '0.82rem',
                          lineHeight: 1.55,
                        }}
                      >
                        {card.detail}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <div style={{ marginTop: 16 }}>
          <WaselProofOfLifeBlock ar={ar} compact />
        </div>

        <div style={{ marginTop: 16 }}>
          <WaselBusinessFooter ar={ar} />
        </div>
      </div>
    </div>
  );
}
