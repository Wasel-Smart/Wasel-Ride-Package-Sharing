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
import { C, F, SH, TYPE } from '../../utils/wasel-ds';
import { DeferredLandingMap } from './DeferredLandingMap';
import { LANDING_DISPLAY, LANDING_FONT } from './landingConstants';

type ActionCard = {
  icon: LucideIcon;
  title: string;
  detail: string;
  path: string;
  color: string;
};

const surfaceStyle: CSSProperties = {
  borderRadius: 28,
  border: `1px solid rgba(93,150,210,0.18)`,
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02)), rgba(9,28,45,0.82)',
  boxShadow: '0 24px 60px rgba(1,10,18,0.26)',
  backdropFilter: 'blur(22px)',
};

const outlineButtonStyle: CSSProperties = {
  minHeight: 52,
  padding: '0 20px',
  borderRadius: 18,
  border: '1px solid rgba(93,150,210,0.24)',
  background: 'rgba(255,255,255,0.04)',
  color: '#EAF7FF',
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
  background: 'linear-gradient(135deg, #1BD4F6 0%, #1597FF 52%, #8AF54A 100%)',
  color: '#031722',
  fontSize: TYPE.size.sm,
  fontWeight: TYPE.weight.ultra,
  fontFamily: F,
  cursor: 'pointer',
  boxShadow: SH.cyanL,
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
    ].find((item) => path.includes(item.match));

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
      title: ar ? 'ابحث عن رحلة' : 'Find a ride',
      detail: ar ? 'رحلات جاهزة الآن' : 'Live routes now',
      path: buildPath('/app/find-ride'),
      color: C.cyan,
    },
    {
      icon: Car,
      title: ar ? 'أنشئ رحلة' : 'Create a ride',
      detail: ar ? 'شارك المقاعد' : 'Share seats',
      path: buildPath('/app/offer-ride', true),
      color: C.gold,
    },
    {
      icon: Package,
      title: ar ? 'أرسل طردا' : 'Send a package',
      detail: ar ? 'على نفس الشبكة' : 'On the same network',
      path: buildPath('/app/packages'),
      color: C.green,
    },
  ] as const;

  const quickPills = ar
    ? ['رحلات', 'طرود', 'خريطة حية']
    : ['Rides', 'Packages', 'Live map'];

  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at top left, rgba(71,183,230,0.20), transparent 28%), radial-gradient(circle at top right, rgba(138,245,74,0.14), transparent 24%), linear-gradient(180deg, #061426 0%, #071B2B 52%, #04111C 100%)',
        color: '#EAF7FF',
        fontFamily: LANDING_FONT,
      }}
    >
      <style>{`
        .entry-shell,
        .entry-shell * { box-sizing: border-box; }
        .entry-shell button:focus-visible,
        .entry-shell a:focus-visible {
          outline: 2px solid rgba(71,183,230,0.92);
          outline-offset: 3px;
        }
        @media (max-width: 960px) {
          .entry-header,
          .entry-hero,
          .entry-actions,
          .entry-meta {
            grid-template-columns: 1fr !important;
          }
          .entry-topbar {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
        @media (max-width: 640px) {
          .entry-shell { padding: 18px 14px 72px !important; }
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
        style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 18px 84px' }}
      >
        <header
          className="entry-topbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 14,
            marginBottom: 18,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => handleLandingNavigate(user ? '/app/find-ride' : '/')}
            aria-label={ar ? 'الصفحة الرئيسية' : 'Home'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              background: 'transparent',
              border: 'none',
              color: '#EAF7FF',
              padding: 0,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                display: 'grid',
                placeItems: 'center',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(93,150,210,0.18)',
                boxShadow: '0 18px 42px rgba(1,10,18,0.18)',
              }}
            >
              <WaselMark size={28} />
            </span>
            <span style={{ display: 'grid', gap: 4 }}>
              <span
                style={{
                  fontFamily: LANDING_DISPLAY,
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  letterSpacing: '-0.04em',
                }}
              >
                Wasel
              </span>
              <span style={{ color: 'rgba(234,247,255,0.66)', fontSize: '0.78rem', fontWeight: 700 }}>
                {ar ? 'تنقل أبسط' : 'Simpler mobility'}
              </span>
            </span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <WaselContactActionRow ar={ar} compact />
            {user ? (
              <button
                type="button"
                onClick={() => handleLandingNavigate('/app/find-ride')}
                style={primaryButtonStyle}
              >
                {ar ? 'افتح التطبيق' : 'Open app'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleLandingNavigate(signInPath)}
                  style={outlineButtonStyle}
                >
                  {ar ? 'تسجيل الدخول' : 'Sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => handleLandingNavigate(signUpPath)}
                  style={primaryButtonStyle}
                >
                  {ar ? 'إنشاء حساب' : 'Sign up'}
                </button>
              </>
            )}
          </div>
        </header>

        <section
          className="entry-hero"
          style={{
            ...surfaceStyle,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(340px, 0.95fr)',
            gap: 18,
            padding: 18,
          }}
        >
          <div
            style={{
              display: 'grid',
              gap: 18,
              padding: '8px 6px 8px 4px',
              alignContent: 'start',
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
                border: '1px solid rgba(93,150,210,0.16)',
                background: 'rgba(71,183,230,0.08)',
                color: C.cyan,
                fontSize: '0.72rem',
                fontWeight: TYPE.weight.ultra,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: C.green,
                  boxShadow: `0 0 12px ${C.green}`,
                }}
              />
              {ar ? 'الأردن أولا' : 'Jordan first'}
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <h1
                style={{
                  margin: 0,
                  fontFamily: LANDING_DISPLAY,
                  fontSize: 'clamp(2.6rem, 5vw, 4.9rem)',
                  lineHeight: 0.94,
                  letterSpacing: '-0.07em',
                  fontWeight: 700,
                }}
              >
                {ar ? 'رحلات وطرود.' : 'Rides and packages.'}
                <span
                  style={{
                    display: 'block',
                    marginTop: 8,
                    background: 'linear-gradient(135deg, #47B7E6 0%, #72D0EF 48%, #A8D614 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {ar ? 'بشكل أبسط.' : 'Made simple.'}
                </span>
              </h1>

              <p
                style={{
                  margin: 0,
                  maxWidth: 640,
                  color: 'rgba(234,247,255,0.74)',
                  fontSize: '1rem',
                  lineHeight: 1.7,
                }}
              >
                {ar
                  ? 'ابدأ من الخريطة، ثم اختر الرحلة أو الطرد بسرعة.'
                  : 'Start from the map, then choose rides or packages fast.'}
              </p>
            </div>

            <div className="entry-cta-row" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleLandingNavigate(user ? '/app/find-ride' : signUpPath)}
                style={primaryButtonStyle}
              >
                {user ? (ar ? 'ابدأ الآن' : 'Start now') : ar ? 'إنشاء حساب' : 'Create account'}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleLandingNavigate(signInPath)}
                style={{ ...outlineButtonStyle, display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <LogIn size={16} />
                {ar ? 'تسجيل الدخول' : 'Sign in'}
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
                    disabled={oauthProvider !== null}
                    style={{
                      ...outlineButtonStyle,
                      minHeight: 46,
                      borderColor: 'rgba(66,133,244,0.30)',
                      color: '#DCEBFF',
                      opacity: oauthProvider === 'facebook' ? 0.55 : 1,
                    }}
                  >
                    {oauthProvider === 'google'
                      ? ar
                        ? 'جاري الفتح...'
                        : 'Opening...'
                      : 'Google'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleOAuth('facebook');
                    }}
                    disabled={oauthProvider !== null}
                    style={{
                      ...outlineButtonStyle,
                      minHeight: 46,
                      borderColor: 'rgba(24,119,242,0.30)',
                      color: '#DCEBFF',
                      opacity: oauthProvider === 'google' ? 0.55 : 1,
                    }}
                  >
                    {oauthProvider === 'facebook'
                      ? ar
                        ? 'جاري الفتح...'
                        : 'Opening...'
                      : 'Facebook'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLandingNavigate(signInPath)}
                    style={{ ...outlineButtonStyle, minHeight: 46 }}
                  >
                    {ar ? 'البريد الإلكتروني' : 'Email'}
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

            <div className="entry-meta" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {quickPills.map((pill) => (
                <div
                  key={pill}
                  style={{
                    borderRadius: 18,
                    padding: '14px 16px',
                    border: '1px solid rgba(93,150,210,0.14)',
                    background: 'rgba(255,255,255,0.03)',
                    fontSize: '0.86rem',
                    fontWeight: TYPE.weight.black,
                    color: '#EAF7FF',
                    textAlign: ar ? 'right' : 'left',
                  }}
                >
                  {pill}
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
                color: 'rgba(234,247,255,0.62)',
                fontSize: '0.82rem',
              }}
            >
              <span>{supportLine}</span>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(234,247,255,0.28)' }} />
              <span>{businessAddress}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                borderRadius: 26,
                overflow: 'hidden',
                border: '1px solid rgba(93,150,210,0.18)',
                background:
                  'radial-gradient(circle at top left, rgba(71,183,230,0.16), transparent 26%), linear-gradient(180deg, rgba(6,22,36,0.92), rgba(7,27,43,0.92))',
                boxShadow: '0 22px 54px rgba(1,10,18,0.22)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  padding: '14px 16px 0',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ color: C.cyan, fontSize: '0.72rem', fontWeight: TYPE.weight.ultra, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    {ar ? 'الخريطة الحية' : 'Live map'}
                  </div>
                  <div style={{ marginTop: 6, fontSize: '1rem', fontWeight: TYPE.weight.ultra }}>
                    {ar ? 'ابدأ من الرؤية الكاملة.' : 'Start from the full view.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLandingNavigate('/app/mobility-os')}
                  style={{
                    minHeight: 42,
                    padding: '0 16px',
                    borderRadius: 16,
                    border: '1px solid rgba(93,150,210,0.18)',
                    background: 'rgba(255,255,255,0.04)',
                    color: '#EAF7FF',
                    fontWeight: TYPE.weight.black,
                    cursor: 'pointer',
                  }}
                >
                  {ar ? 'افتح الخريطة' : 'Open map'}
                </button>
              </div>
              <div style={{ padding: 12 }}>
                <DeferredLandingMap ar={ar} />
              </div>
            </div>

            <div className="entry-actions" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {actionCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.title}
                    type="button"
                    onClick={() => handleLandingNavigate(card.path)}
                    style={{
                      ...surfaceStyle,
                      padding: '16px',
                      display: 'grid',
                      gap: 10,
                      textAlign: ar ? 'right' : 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        display: 'grid',
                        placeItems: 'center',
                        background: `${card.color}14`,
                        border: `1px solid ${card.color}2e`,
                        boxShadow: `0 14px 28px ${card.color}18`,
                      }}
                    >
                      <Icon size={18} color={card.color} />
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: TYPE.weight.ultra, color: '#EAF7FF' }}>
                      {card.title}
                    </div>
                    <div style={{ color: 'rgba(234,247,255,0.62)', fontSize: '0.82rem', lineHeight: 1.55 }}>
                      {card.detail}
                    </div>
                  </button>
                );
              })}
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
