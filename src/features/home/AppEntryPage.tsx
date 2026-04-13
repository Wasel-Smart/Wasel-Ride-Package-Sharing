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

const ENTRY_TEXT = '#E9F5F7';
const ENTRY_TEXT_SOFT = 'rgba(198,223,227,0.82)';
const ENTRY_TEXT_MUTED = 'rgba(170,191,196,0.72)';
const ENTRY_BORDER = 'rgba(25,231,187,0.16)';
const ENTRY_BORDER_SOFT = 'rgba(152,255,228,0.12)';
const ENTRY_PANEL =
  'linear-gradient(180deg, rgba(220,255,248,0.06), rgba(220,255,248,0.015)), rgba(10,18,31,0.88)';
const ENTRY_PANEL_ALT =
  'linear-gradient(180deg, rgba(220,255,248,0.05), rgba(220,255,248,0.02)), rgba(16,28,41,0.72)';
const ENTRY_PANEL_STRONG =
  'linear-gradient(180deg, rgba(220,255,248,0.04), rgba(220,255,248,0.01)), rgba(8,16,27,0.9)';
const ENTRY_ACCENT = '#19E7BB';
const ENTRY_MINT = '#A2FFE7';
const ENTRY_DEEP = '#041019';

const panelStyle: CSSProperties = {
  borderRadius: 34,
  border: `1px solid ${ENTRY_BORDER_SOFT}`,
  background: ENTRY_PANEL,
  boxShadow: 'inset 0 1px 0 rgba(220,255,248,0.05), 0 28px 72px rgba(1,10,18,0.34)',
  backdropFilter: 'blur(26px)',
};

const outlineButtonStyle: CSSProperties = {
  minHeight: 50,
  padding: '0 22px',
  borderRadius: 18,
  border: `1px solid ${ENTRY_BORDER}`,
  background: ENTRY_PANEL_ALT,
  color: ENTRY_TEXT,
  fontSize: TYPE.size.sm,
  fontWeight: TYPE.weight.black,
  fontFamily: F,
  cursor: 'pointer',
  boxShadow: '0 16px 38px rgba(1,10,18,0.18)',
};

const primaryButtonStyle: CSSProperties = {
  minHeight: 50,
  padding: '0 24px',
  borderRadius: 18,
  border: 'none',
  background: 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 44%, #48CFFF 100%)',
  color: ENTRY_DEEP,
  fontSize: TYPE.size.sm,
  fontWeight: TYPE.weight.ultra,
  fontFamily: F,
  cursor: 'pointer',
  boxShadow: '0 22px 56px rgba(25,231,187,0.26)',
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
      {
        match: '/app/find-ride',
        eventName: 'landing_find_ride_opened',
        serviceType: 'ride' as const,
      },
      {
        match: '/app/offer-ride',
        eventName: 'landing_offer_ride_opened',
        serviceType: 'ride' as const,
      },
      {
        match: '/app/packages',
        eventName: 'landing_packages_opened',
        serviceType: 'package' as const,
      },
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
  const quickPills = ar
    ? [
        '\u062d\u0631\u0643\u0629 \u062d\u064a\u0629',
        '\u0645\u0633\u0627\u0631\u0627\u062a \u0623\u0630\u0643\u0649',
        '\u0648\u0635\u0648\u0644 \u0623\u0628\u0633\u0637',
      ]
    : ['Live routes', 'Simple booking', 'Fast delivery'];

  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 50% 18%, rgba(25,231,187,0.22), transparent 14%), radial-gradient(circle at 86% 84%, rgba(151,164,173,0.18), transparent 28%), radial-gradient(circle at 16% 88%, rgba(72,207,255,0.12), transparent 20%), linear-gradient(135deg, #040816 0%, #071022 36%, #121d32 62%, #65717A 100%)',
        color: ENTRY_TEXT,
        fontFamily: LANDING_FONT,
      }}
    >
      <style>{`
        .entry-shell,
        .entry-shell * { box-sizing: border-box; }
        .entry-shell button:focus-visible,
        .entry-shell a:focus-visible {
          outline: 2px solid rgba(25,231,187,0.92);
          outline-offset: 3px;
        }
        @media (max-width: 1280px) {
          .entry-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 1120px) {
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
        style={{ maxWidth: 1560, margin: '0 auto', padding: 'clamp(18px, 2vw, 28px) 22px 84px' }}
      >
        <section
          style={{
            ...panelStyle,
            position: 'relative',
            overflow: 'hidden',
            padding: 'clamp(18px, 2vw, 30px)',
            minHeight: 'clamp(700px, 88vh, 860px)',
            background:
              'radial-gradient(circle at 50% 14%, rgba(25,231,187,0.18), rgba(8,19,31,0) 22%), radial-gradient(circle at 88% 12%, rgba(101,225,255,0.12), rgba(8,19,31,0) 20%), radial-gradient(circle at 82% 100%, rgba(151,164,173,0.12), rgba(8,19,31,0) 28%), linear-gradient(140deg, rgba(15,27,41,0.97) 0%, rgba(9,18,30,0.97) 48%, rgba(11,18,31,0.98) 72%, rgba(78,89,99,0.94) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0) 16%, rgba(255,255,255,0) 84%, rgba(255,255,255,0.02) 100%), linear-gradient(rgba(25,231,187,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(25,231,187,0.035) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 72px 72px, 72px 72px',
              pointerEvents: 'none',
              opacity: 0.6,
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
              marginBottom: 24,
            }}
          >
            <button
              type="button"
              onClick={() => handleLandingNavigate(user ? '/app/find-ride' : '/')}
              aria-label={
                ar
                  ? '\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629'
                  : 'Home'
              }
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 16,
                background: ENTRY_PANEL_ALT,
                border: `1px solid ${ENTRY_BORDER_SOFT}`,
                color: ENTRY_TEXT,
                padding: '12px 18px 12px 12px',
                borderRadius: 28,
                cursor: 'pointer',
                boxShadow: '0 18px 42px rgba(1,10,18,0.24)',
              }}
            >
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 24,
                  display: 'grid',
                  placeItems: 'center',
                  background:
                    'radial-gradient(circle at 30% 24%, rgba(25,231,187,0.18), rgba(25,231,187,0) 28%), linear-gradient(180deg, rgba(220,255,248,0.04), rgba(220,255,248,0.01)), rgba(9,21,35,0.88)',
                  border: `1px solid ${ENTRY_BORDER_SOFT}`,
                  boxShadow: 'inset 0 1px 0 rgba(220,255,248,0.06), 0 16px 36px rgba(1,10,18,0.24)',
                }}
              >
                <WaselMark
                  size={60}
                  style={{
                    filter:
                      'drop-shadow(0 18px 28px rgba(1,10,18,0.28)) drop-shadow(0 0 24px rgba(25,231,187,0.16))',
                  }}
                />
              </div>
              <div style={{ display: 'grid', gap: 8, textAlign: ar ? 'right' : 'left' }}>
                <span
                  style={{
                    fontFamily: LANDING_DISPLAY,
                    fontSize: 'clamp(2.35rem, 4vw, 4rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.075em',
                    lineHeight: 0.84,
                    background: 'linear-gradient(180deg, #D8FFF7 0%, #3AE9C2 56%, #089D7E 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 14px 30px rgba(8, 17, 29, 0.18)',
                  }}
                >
                  Wasel
                </span>
                <span
                  style={{
                    color: 'rgba(233, 245, 247, 0.9)',
                    fontSize: 'clamp(0.98rem, 1.35vw, 1.1rem)',
                    fontWeight: TYPE.weight.bold,
                    letterSpacing: '-0.015em',
                    lineHeight: 1.2,
                  }}
                >
                  {'\u0623\u0646\u0627 \u0648\u0627\u0635\u0644\u060c \u0623\u0646\u062a\u061f'}
                </span>
                <span
                  aria-hidden="true"
                  style={{
                    width: 170,
                    maxWidth: '100%',
                    height: 4,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg, #DCFFF8 0%, #19E7BB 54%, #48CFFF 100%)',
                    boxShadow: '0 0 28px rgba(25,231,187,0.18)',
                  }}
                />
              </div>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
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
                    {ar
                      ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644'
                      : 'Sign in'}
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
              gridTemplateColumns: 'minmax(0, 0.9fr) minmax(460px, 1.1fr)',
              gap: 24,
              alignItems: 'stretch',
            }}
          >
            <div
              style={{
                display: 'grid',
                gap: 16,
                alignContent: 'start',
                paddingTop: 6,
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  width: 'fit-content',
                  padding: '10px 16px',
                  borderRadius: 999,
                  border: `1px solid ${ENTRY_BORDER}`,
                  background:
                    'linear-gradient(180deg, rgba(162,255,231,0.12), rgba(25,231,187,0.08))',
                  color: ENTRY_MINT,
                  fontSize: '0.76rem',
                  fontWeight: TYPE.weight.ultra,
                  letterSpacing: '0.11em',
                  textTransform: 'uppercase',
                  boxShadow: '0 16px 28px rgba(1,10,18,0.14)',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: C.cyan,
                    boxShadow: `0 0 14px ${C.cyan}`,
                  }}
                />
                {heroBadgeText}
              </div>

              <div style={{ display: 'grid', gap: 14 }}>
                <h1
                  style={{
                    margin: 0,
                    maxWidth: 760,
                    fontFamily: LANDING_DISPLAY,
                    fontSize: 'clamp(2.95rem, 4.6vw, 5rem)',
                    lineHeight: 0.9,
                    letterSpacing: '-0.075em',
                    fontWeight: 800,
                    textWrap: 'balance',
                  }}
                >
                  <span style={{ display: 'block', color: '#F5FAFF' }}>{heroTitleLead}</span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 12,
                      background: 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 44%, #48CFFF 100%)',
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
                    maxWidth: 620,
                    color: ENTRY_TEXT_SOFT,
                    fontSize: 'clamp(1rem, 1.15vw, 1.08rem)',
                    lineHeight: 1.7,
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
                  {ar
                    ? '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644'
                    : 'Sign in'}
                </button>
              </div>

              {!user ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div
                    className="entry-auth-row"
                    style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
                  >
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
                        color: ENTRY_TEXT,
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
                        borderColor: 'rgba(162,255,231,0.22)',
                        color: ENTRY_TEXT,
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
                      aria-label={
                        ar ? 'المتابعة باستخدام البريد الإلكتروني' : 'Continue with email'
                      }
                      style={{ ...outlineButtonStyle, minHeight: 46 }}
                    >
                      {ar
                        ? '\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a'
                        : 'Email'}
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
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
              >
                {quickPills.map(pill => (
                  <div
                    key={pill}
                    style={{
                      borderRadius: 18,
                      padding: '14px 16px',
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      background:
                        'linear-gradient(180deg, rgba(220,255,248,0.05), rgba(220,255,248,0.025))',
                      fontSize: '0.82rem',
                      fontWeight: TYPE.weight.black,
                      color: ENTRY_TEXT,
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
                  border: `1px solid ${ENTRY_BORDER}`,
                  background:
                    'radial-gradient(circle at 12% 12%, rgba(25,231,187,0.12), transparent 30%), linear-gradient(180deg, rgba(220,255,248,0.05), rgba(220,255,248,0.02))',
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
                    background: 'rgba(25,231,187,0.10)',
                    border: `1px solid ${ENTRY_BORDER}`,
                    color: ENTRY_ACCENT,
                    fontSize: '0.74rem',
                    fontWeight: TYPE.weight.ultra,
                    letterSpacing: '0.11em',
                    textTransform: 'uppercase',
                  }}
                >
                  {ar
                    ? '\u0639\u0631\u0636 \u0627\u0644\u0631\u062d\u0644\u0629'
                    : 'Create and earn'}
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
                      color: ENTRY_TEXT_MUTED,
                      fontSize: '0.9rem',
                      lineHeight: 1.7,
                      maxWidth: 560,
                    }}
                  >
                    {supplyBody}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {supplyPills.map(pill => (
                    <span
                      key={pill}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 999,
                        border: `1px solid ${ENTRY_BORDER}`,
                        background: 'rgba(220,255,248,0.04)',
                        color: ENTRY_TEXT,
                        fontSize: '0.8rem',
                        fontWeight: TYPE.weight.black,
                      }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                <div
                  className="entry-cta-row"
                  style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
                >
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
                    {ar
                      ? '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643 \u0648\u0627\u0628\u062f\u0623 \u0628\u0627\u0644\u0628\u064a\u0639'
                      : 'Create ride'}
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
                    {ar
                      ? '\u0627\u0639\u0631\u0641 \u0643\u064a\u0641 \u062a\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f'
                      : 'Open packages'}
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  color: ENTRY_TEXT_MUTED,
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
                  padding: 18,
                  background:
                    'radial-gradient(circle at 18% 14%, rgba(25,231,187,0.15), rgba(8,19,31,0) 24%), radial-gradient(circle at 86% 10%, rgba(101,225,255,0.08), rgba(8,19,31,0) 22%), linear-gradient(180deg, rgba(220,255,248,0.03), rgba(220,255,248,0.015)), rgba(11,19,29,0.95)',
                }}
              >
                <div style={{ position: 'relative', paddingTop: 18 }}>
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 20,
                      zIndex: 2,
                      width: 108,
                      height: 108,
                      borderRadius: 34,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'radial-gradient(circle at 32% 28%, rgba(25,231,187,0.14), rgba(25,231,187,0) 28%), linear-gradient(180deg, rgba(220,255,248,0.06), rgba(220,255,248,0.02)), rgba(10,20,31,0.9)',
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      boxShadow:
                        'inset 0 1px 0 rgba(220,255,248,0.06), 0 28px 52px rgba(1,10,18,0.28)',
                      backdropFilter: 'blur(22px)',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: -18,
                        borderRadius: 40,
                        background:
                          'radial-gradient(circle, rgba(25,231,187,0.2) 0%, rgba(25,231,187,0.05) 48%, rgba(8,19,31,0) 74%)',
                        filter: 'blur(18px)',
                      }}
                    />
                    <WaselMark
                      size={74}
                      style={{
                        position: 'relative',
                        filter:
                          'drop-shadow(0 20px 30px rgba(1,10,18,0.26)) drop-shadow(0 0 26px rgba(25,231,187,0.16))',
                      }}
                    />
                  </div>

                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 26,
                      right: 26,
                      zIndex: 2,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    {[64, 42, 24].map((width, index) => (
                      <span
                        key={width}
                        style={{
                          width,
                          height: index === 2 ? 10 : 6,
                          borderRadius: 999,
                          background:
                            index === 2
                              ? 'linear-gradient(135deg, #DCFFF8 0%, #19E7BB 100%)'
                              : 'linear-gradient(90deg, rgba(162,255,231,0.56), rgba(162,255,231,0.12))',
                          boxShadow: index === 2 ? '0 0 18px rgba(25,231,187,0.24)' : 'none',
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      borderRadius: 32,
                      padding: 12,
                      background: ENTRY_PANEL_STRONG,
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      boxShadow:
                        'inset 0 1px 0 rgba(220,255,248,0.04), 0 28px 64px rgba(1,10,18,0.24)',
                      overflow: 'hidden',
                    }}
                  >
                    <DeferredLandingMap ar={ar} />
                  </div>
                </div>
              </div>

              <div
                className="entry-actions"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 10,
                }}
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
                          'linear-gradient(180deg, rgba(220,255,248,0.05), rgba(220,255,248,0.018)), rgba(14,24,36,0.86)',
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
                      <div
                        style={{
                          fontSize: '0.95rem',
                          fontWeight: TYPE.weight.ultra,
                          color: ENTRY_TEXT,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          color: ENTRY_TEXT_MUTED,
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
