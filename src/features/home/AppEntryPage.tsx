import { useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  Car,
  ChevronRight,
  LogIn,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
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

type InsightCard = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  detail: string;
  color: string;
};

const ENTRY_TEXT = '#F4FBFF';
const ENTRY_TEXT_SOFT = 'rgba(222,240,247,0.86)';
const ENTRY_TEXT_MUTED = 'rgba(183,205,214,0.78)';
const ENTRY_BORDER = 'rgba(34,229,188,0.18)';
const ENTRY_BORDER_SOFT = 'rgba(179,255,237,0.14)';
const ENTRY_PANEL =
  'linear-gradient(180deg, rgba(248,255,255,0.08), rgba(248,255,255,0.018)), rgba(7,16,28,0.82)';
const ENTRY_PANEL_ALT =
  'linear-gradient(180deg, rgba(248,255,255,0.06), rgba(248,255,255,0.02)), rgba(10,20,34,0.74)';
const ENTRY_PANEL_STRONG =
  'linear-gradient(180deg, rgba(248,255,255,0.08), rgba(248,255,255,0.02)), rgba(6,15,26,0.92)';
const ENTRY_ACCENT = '#22E5BC';
const ENTRY_MINT = '#CCFFF4';
const ENTRY_PRIMARY_GRAD = 'linear-gradient(135deg, #6FE8FF 0%, #18D7C2 38%, #1668FF 100%)';
const ENTRY_PRIMARY_GLOW = '0 24px 64px rgba(22,104,255,0.24), 0 16px 44px rgba(24,215,194,0.16)';

const panelStyle: CSSProperties = {
  borderRadius: 34,
  border: `1px solid ${ENTRY_BORDER_SOFT}`,
  background: ENTRY_PANEL,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 30px 80px rgba(1,10,18,0.34)',
  backdropFilter: 'blur(26px)',
};

const outlineButtonStyle: CSSProperties = {
  minHeight: 52,
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
  minHeight: 52,
  padding: '0 24px',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.14)',
  background: ENTRY_PRIMARY_GRAD,
  color: '#F7FDFF',
  fontSize: TYPE.size.sm,
  fontWeight: TYPE.weight.ultra,
  fontFamily: F,
  cursor: 'pointer',
  boxShadow: ENTRY_PRIMARY_GLOW,
};

type EntryBrandLockupProps = {
  ar: boolean;
  iconSize: number;
  titleSize: string;
  arabicSize: string;
  metaSize: string;
  showChip?: boolean;
};

function EntryBrandLockup({
  ar,
  iconSize,
  titleSize,
  arabicSize,
  metaSize,
  showChip = true,
}: EntryBrandLockupProps) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(12, Math.round(iconSize * 0.24)),
        textAlign: ar ? 'right' : 'left',
      }}
    >
      <div
        style={{
          width: Math.round(iconSize * 1.16),
          minHeight: Math.round(iconSize * 1.08),
          display: 'grid',
          placeItems: 'center',
          background: 'none',
          border: 'none',
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
        <WaselMark
          size={iconSize}
          animated
          style={{
            filter:
              'drop-shadow(0 12px 24px rgba(1,10,18,0.22)) drop-shadow(0 0 22px rgba(25,231,187,0.18))',
          }}
        />
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: LANDING_DISPLAY,
              fontSize: titleSize,
              fontWeight: 800,
              letterSpacing: '-0.045em',
              lineHeight: 0.92,
              background: 'linear-gradient(180deg, #E8FFF9 0%, #7CF4DA 58%, #22DAB6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Wasel
          </span>
          {showChip ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 12px',
                borderRadius: 999,
                border: `1px solid ${ENTRY_BORDER_SOFT}`,
                background: 'rgba(255,255,255,0.04)',
                color: ENTRY_MINT,
                fontSize: '0.72rem',
                fontWeight: TYPE.weight.ultra,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <Sparkles size={12} />
              Mobility OS
            </span>
          ) : null}
        </div>
        <span
          style={{
            color: '#1EE4B5',
            fontSize: arabicSize,
            fontWeight: 800,
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          {'\u0648\u0627\u0635\u0644'}
        </span>
        <span
          style={{
            color: 'rgba(214,231,237,0.76)',
            fontSize: metaSize,
            fontWeight: TYPE.weight.medium,
            letterSpacing: '-0.01em',
            lineHeight: 1.2,
          }}
        >
          {ar
            ? '\u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631 \u064a\u0645\u0643\u0646 \u0623\u0646 \u064a\u062d\u0645\u0644 \u0631\u0627\u0643\u0628\u0627\u064b \u0648\u0637\u0631\u062f\u0627\u064b \u0648\u0642\u064a\u0645\u0629 \u0623\u0643\u0628\u0631.'
            : 'One corridor can carry riders, parcels, and more value.'}
        </span>
      </div>
    </div>
  );
}

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
        ? '\u0634\u0627\u0647\u062f \u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u062d\u064a \u0648\u0627\u062e\u062a\u0631 \u0623\u0633\u0631\u0639 \u0642\u0631\u0627\u0631'
        : 'See the live corridor and choose fast',
      path: buildPath('/app/find-ride'),
      color: C.cyan,
    },
    {
      icon: Car,
      title: ar ? '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u0629' : 'Create a ride',
      detail: ar
        ? '\u0628\u0639 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0648\u0627\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f \u0639\u0644\u0649 \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631'
        : 'Sell seats and carry packages together',
      path: buildPath('/app/offer-ride', true),
      color: C.gold,
    },
    {
      icon: Package,
      title: ar ? '\u0623\u0631\u0633\u0644 \u0637\u0631\u062f\u0627' : 'Send a package',
      detail: ar
        ? '\u062d\u0631\u0651\u0643 \u0627\u0644\u0637\u0631\u0648\u062f \u0639\u0628\u0631 \u0646\u0641\u0633 \u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u062d\u064a\u0629'
        : 'Move parcels through the same network',
      path: buildPath('/app/packages'),
      color: C.green,
    },
  ] as const;

  const signalCards: readonly InsightCard[] = [
    {
      icon: MapPinned,
      eyebrow: ar
        ? '\u0634\u0628\u0643\u0629 \u0648\u0627\u062d\u062f\u0629'
        : 'One operating surface',
      title: ar
        ? '\u0627\u0644\u0642\u0631\u0627\u0631 \u064a\u0628\u062f\u0623 \u0645\u0646 \u0627\u0644\u062e\u0631\u064a\u0637\u0629'
        : 'Every decision starts from the map',
      detail: ar
        ? '\u0627\u0644\u0631\u0627\u0643\u0628 \u0648\u0627\u0644\u0633\u0627\u0626\u0642 \u0648\u0627\u0644\u0637\u0631\u062f \u064a\u0631\u0648\u0646 \u0646\u0641\u0633 \u0627\u0644\u0645\u0634\u0647\u062f \u0627\u0644\u062d\u064a.'
        : 'Riders, drivers, and parcels all start from one live corridor view.',
      color: '#6FE8FF',
    },
    {
      icon: WalletCards,
      eyebrow: ar
        ? '\u0642\u064a\u0645\u0629 \u0623\u0639\u0644\u0649'
        : 'More yield per departure',
      title: ar
        ? '\u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0648\u0627\u0644\u0637\u0631\u0648\u062f \u0639\u0644\u0649 \u0646\u0641\u0633 \u0627\u0644\u0631\u062d\u0644\u0629'
        : 'Seats and parcels monetize the same trip',
      detail: ar
        ? '\u0648\u0627\u0635\u0650\u0644 \u062a\u0631\u0641\u0639 \u0642\u064a\u0645\u0629 \u0643\u0644 \u0627\u0646\u0637\u0644\u0627\u0642\u0647 \u0628\u062f\u0648\u0646 \u062a\u0634\u062a\u064a\u062a \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645.'
        : 'Wasel compounds route value without making the product feel crowded.',
      color: '#22E5BC',
    },
    {
      icon: ShieldCheck,
      eyebrow: ar ? '\u062b\u0642\u0629 \u0648\u0627\u0636\u062d\u0629' : 'Trust in plain sight',
      title: ar
        ? '\u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0644\u0647\u0648\u064a\u0629 \u0638\u0627\u0647\u0631\u0627\u0646 \u062f\u0627\u0626\u0645\u0627\u064b'
        : 'Support and identity stay visible',
      detail: ar
        ? '\u0627\u0644\u0647\u0627\u062a\u0641 \u0648\u0648\u0627\u062a\u0633\u0627\u0628 \u0648\u0627\u0644\u0628\u0631\u064a\u062f \u062d\u0627\u0636\u0631\u0629 \u0645\u0646 \u0623\u0648\u0644 \u0634\u0627\u0634\u0629.'
        : 'Call, WhatsApp, and email are all visible from the first screen.',
      color: '#A7FFE9',
    },
  ] as const;

  const heroBadgeText = ar
    ? '\u0634\u0628\u0643\u0629 \u0627\u0644\u062d\u0631\u0643\u0629 \u0627\u0644\u062d\u064a\u0629 \u0644\u0644\u0623\u0631\u062f\u0646'
    : 'Jordan live mobility network';
  const heroTitleLead = ar
    ? '\u0627\u0641\u062a\u062d \u0627\u0644\u0634\u0628\u0643\u0629 \u0623\u0648\u0644\u0627\u064b.'
    : 'Open the network first.';
  const heroTitleAccent = ar
    ? '\u0643\u0644 \u0645\u0633\u0627\u0631 \u064a\u0635\u0628\u062d \u0623\u0648\u0636\u062d \u0648\u0623\u0643\u062b\u0631 \u0642\u064a\u0645\u0629.'
    : 'Make every route clearer and more valuable.';
  const heroDescription = ar
    ? '\u0648\u0627\u0635\u0650\u0644 \u062a\u0628\u062f\u0623 \u0628\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0627\u0644\u062d\u064a\u0629\u060c \u062b\u0645 \u062a\u062a\u064a\u062d \u0644\u0644\u0631\u0627\u0643\u0628 \u0627\u0644\u062d\u062c\u0632\u060c \u0648\u0644\u0644\u0633\u0627\u0626\u0642 \u0628\u064a\u0639 \u0627\u0644\u0645\u0642\u0627\u0639\u062f \u0648\u062d\u0645\u0644 \u0627\u0644\u0637\u0631\u0648\u062f\u060c \u0645\u0639 \u0628\u0642\u0627\u0621 \u0627\u0644\u062f\u0639\u0645 \u0648\u0627\u0636\u062d\u0627\u064b \u0645\u0646 \u0623\u0648\u0644 \u0634\u0627\u0634\u0629.'
    : 'Wasel opens with the live corridor, then lets riders book, drivers monetize seats and parcels, and support stay visible from the first screen.';
  const supplyTitle = ar
    ? '\u0627\u0644\u0645\u0633\u0627\u0631 \u0627\u0644\u0648\u0627\u062d\u062f \u064a\u0628\u064a\u0639 \u0645\u0642\u0627\u0639\u062f \u0648\u064a\u062d\u0631\u0643 \u0637\u0631\u0648\u062f\u0627\u064b.'
    : 'One route can sell seats and move packages at once.';
  const supplyBody = ar
    ? '\u0647\u0630\u0627 \u0647\u0648 \u0627\u0644\u0641\u0631\u0642 \u0641\u064a \u0648\u0627\u0635\u0650\u0644: \u0627\u0644\u0645\u0633\u0627\u0631 \u0623\u0648\u0636\u062d \u0644\u0644\u0631\u0627\u0643\u0628\u060c \u0648\u0623\u0643\u062b\u0631 \u0631\u0628\u062d\u0627\u064b \u0644\u0644\u0633\u0627\u0626\u0642\u060c \u0648\u0623\u0633\u0647\u0644 \u0634\u0631\u062d\u0627\u064b \u0644\u0644\u0645\u0633\u062a\u062b\u0645\u0631.'
    : 'That is the product edge: clearer demand for riders, more value for drivers, and a sharper story for investors.';
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
        '\u0631\u062d\u0644\u0627\u062a \u062d\u064a\u0629',
        '\u0637\u0631\u0648\u062f \u0639\u0644\u0649 \u0646\u0641\u0633 \u0627\u0644\u0645\u0633\u0627\u0631',
        '\u062f\u0639\u0645 \u0638\u0627\u0647\u0631',
      ]
    : ['Live rides', 'Package flow', 'Visible support'];
  const mapEyebrow = ar
    ? '\u0645\u0634\u0647\u062f \u0627\u0644\u0634\u0628\u0643\u0629 \u0627\u0644\u062d\u064a'
    : 'Live network canvas';
  const mapTitle = ar
    ? '\u0634\u0627\u0634\u0629 \u0648\u0627\u062d\u062f\u0629 \u062a\u0634\u0631\u062d \u0627\u0644\u0645\u0646\u062a\u062c \u0643\u0644\u0647.'
    : 'One screen explains the whole product.';
  const mapDescription = ar
    ? '\u0627\u0644\u062e\u0631\u064a\u0637\u0629 \u0644\u064a\u0633\u062a \u062e\u0644\u0641\u064a\u0629\u060c \u0628\u0644 \u0647\u064a \u0623\u0648\u0644 \u0642\u0631\u0627\u0631 \u0641\u064a \u0627\u0644\u062a\u062c\u0631\u0628\u0629: \u0623\u064a\u0646 \u0627\u0644\u062d\u0631\u0643\u0629\u060c \u0648\u0623\u064a \u062e\u062f\u0645\u0629 \u062a\u0646\u0627\u0633\u0628\u0647\u0627\u060c \u0648\u0643\u064a\u0641 \u062a\u0628\u0642\u0649 \u0627\u0644\u062b\u0642\u0629 \u0638\u0627\u0647\u0631\u0629.'
    : 'The map is not decoration. It is the first product surface: where movement is happening, which service fits, and how trust stays visible.';
  const mapCalloutLabel = ar
    ? '\u062c\u0627\u0647\u0632 \u0644\u0644\u0639\u0631\u0636'
    : 'Pitch-ready';
  const mapCalloutBody = ar
    ? '\u0645\u0646 \u0623\u0648\u0644 \u0646\u0638\u0631\u0629 \u064a\u0641\u0647\u0645 \u0627\u0644\u0645\u0634\u0627\u0647\u062f \u0623\u0646 \u0648\u0627\u0635\u0650\u0644 \u0644\u064a\u0633\u062a \u062e\u062f\u0645\u0629 \u0648\u0627\u062d\u062f\u0629\u060c \u0628\u0644 \u0634\u0628\u0643\u0629 \u062a\u0634\u063a\u064a\u0644 \u0643\u0627\u0645\u0644\u0629.'
    : 'At a glance, the room sees that Wasel is not a single feature. It is a movement system.';
  const mapFooterNote = ar
    ? '\u062e\u0631\u064a\u0637\u0629\u060c \u0642\u0631\u0627\u0631\u060c \u062e\u062f\u0645\u0629\u060c \u0648\u062f\u0639\u0645 \u0641\u064a \u0646\u0641\u0633 \u0627\u0644\u0645\u0634\u0647\u062f.'
    : 'Map, decision, service, and support in the same view.';

  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(circle at 16% 12%, rgba(27,215,194,0.18), transparent 20%), radial-gradient(circle at 88% 12%, rgba(22,104,255,0.16), transparent 24%), radial-gradient(circle at 78% 82%, rgba(111,232,255,0.10), transparent 20%), linear-gradient(135deg, #030816 0%, #071121 28%, #0c1c33 58%, #162843 78%, #5f6873 100%)',
        color: ENTRY_TEXT,
        fontFamily: LANDING_FONT,
      }}
    >
      <style>{`
        .entry-shell,
        .entry-shell * { box-sizing: border-box; }
        .entry-shell button:focus-visible,
        .entry-shell a:focus-visible {
          outline: 2px solid rgba(34,229,188,0.92);
          outline-offset: 3px;
        }
        .entry-float-card {
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }
        .entry-live-dot {
          animation: entryPulse 1.9s ease-in-out infinite;
        }
        @keyframes entryPulse {
          0%, 100% { opacity: 0.58; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @media (hover: hover) and (pointer: fine) {
          .entry-float-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 26px 64px rgba(1,10,18,0.3);
          }
        }
        @media (max-width: 1280px) {
          .entry-main-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 1120px) {
          .entry-actions,
          .entry-meta,
          .entry-signal-grid,
          .entry-route-band {
            grid-template-columns: 1fr !important;
          }
          .entry-route-actions {
            justify-content: flex-start !important;
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
          .entry-map-legend,
          .entry-map-footer,
          .entry-meta-line {
            flex-direction: column !important;
            align-items: flex-start !important;
          }
        }
        @media (max-width: 640px) {
          .entry-shell { padding: 16px 14px 72px !important; }
          .entry-cta-row,
          .entry-auth-row,
          .entry-pill-row {
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
            minHeight: 'clamp(760px, 92vh, 940px)',
            background:
              'radial-gradient(circle at 18% 12%, rgba(34,229,188,0.16), rgba(8,18,32,0) 22%), radial-gradient(circle at 88% 14%, rgba(111,232,255,0.11), rgba(8,18,32,0) 18%), radial-gradient(circle at 76% 82%, rgba(22,104,255,0.15), rgba(8,18,32,0) 24%), linear-gradient(145deg, rgba(8,18,30,0.98) 0%, rgba(8,19,31,0.96) 38%, rgba(9,24,41,0.95) 68%, rgba(68,83,99,0.92) 100%)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 14%, rgba(255,255,255,0) 86%, rgba(255,255,255,0.024) 100%), linear-gradient(rgba(34,229,188,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,229,188,0.03) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 76px 76px, 76px 76px',
              pointerEvents: 'none',
              opacity: 0.62,
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
              marginBottom: 26,
              padding: '14px 16px',
              borderRadius: 28,
              border: `1px solid ${ENTRY_BORDER_SOFT}`,
              background: 'rgba(255,255,255,0.035)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
              backdropFilter: 'blur(18px)',
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
                gap: 14,
                background: 'none',
                border: 'none',
                color: ENTRY_TEXT,
                padding: 0,
                borderRadius: 0,
                cursor: 'pointer',
                boxShadow: 'none',
              }}
            >
              <EntryBrandLockup
                ar={ar}
                iconSize={58}
                titleSize="clamp(1.78rem, 2.45vw, 2.55rem)"
                arabicSize="clamp(1.08rem, 1.3vw, 1.4rem)"
                metaSize="clamp(0.74rem, 0.9vw, 0.86rem)"
              />
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
                    {ar ? '\u0627\u0628\u062f\u0623 \u0627\u0644\u0622\u0646' : 'Create account'}
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
                  className="entry-live-dot"
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
                    maxWidth: 820,
                    fontFamily: LANDING_DISPLAY,
                    fontSize: 'clamp(3.2rem, 4.9vw, 5.7rem)',
                    lineHeight: 0.9,
                    letterSpacing: '-0.08em',
                    fontWeight: 800,
                  }}
                >
                  <span style={{ display: 'block', color: '#F7FCFF' }}>{heroTitleLead}</span>
                  <span
                    style={{
                      display: 'block',
                      marginTop: 12,
                      background: ENTRY_PRIMARY_GRAD,
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
                    color: ENTRY_TEXT_SOFT,
                    fontSize: 'clamp(1rem, 1.16vw, 1.08rem)',
                    lineHeight: 1.78,
                  }}
                >
                  {heroDescription}
                </p>
              </div>

              <div className="entry-pill-row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {quickPills.map(pill => (
                  <span
                    key={pill}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 12px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.034)',
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      color: ENTRY_TEXT,
                      fontSize: '0.76rem',
                      fontWeight: TYPE.weight.black,
                      boxShadow: '0 10px 24px rgba(1,10,18,0.12)',
                    }}
                  >
                    <span
                      className="entry-live-dot"
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: ENTRY_ACCENT,
                        boxShadow: `0 0 12px ${ENTRY_ACCENT}`,
                      }}
                    />
                    {pill}
                  </span>
                ))}
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
                    style={{
                      color: ENTRY_TEXT_MUTED,
                      fontSize: '0.72rem',
                      fontWeight: TYPE.weight.ultra,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {ar
                      ? '\u0623\u0648 \u062a\u0627\u0628\u0639 \u0628\u0648\u0627\u0633\u0637\u0629'
                      : 'Or continue with'}
                  </div>
                  <div
                    className="entry-auth-row"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                      gap: 10,
                    }}
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
                        minHeight: 42,
                        padding: '0 14px',
                        borderColor: 'rgba(105,215,247,0.2)',
                        color: ENTRY_TEXT,
                        opacity: oauthProvider === 'facebook' ? 0.55 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        boxShadow: '0 12px 28px rgba(1,10,18,0.12)',
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
                        minHeight: 42,
                        padding: '0 14px',
                        borderColor: 'rgba(162,255,231,0.22)',
                        color: ENTRY_TEXT,
                        opacity: oauthProvider === 'google' ? 0.55 : 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        boxShadow: '0 12px 28px rgba(1,10,18,0.12)',
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
                      style={{
                        ...outlineButtonStyle,
                        minHeight: 42,
                        padding: '0 14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.78rem',
                        boxShadow: '0 12px 28px rgba(1,10,18,0.12)',
                      }}
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
                className="entry-meta entry-signal-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                {signalCards.map(card => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.title}
                      className="entry-float-card"
                      style={{
                        borderRadius: 22,
                        padding: '14px 14px 13px',
                        border: `1px solid ${card.color}33`,
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.014)), rgba(9,18,31,0.76)',
                        boxShadow: `0 14px 34px ${card.color}10`,
                        display: 'grid',
                        gap: 8,
                        textAlign: ar ? 'right' : 'left',
                      }}
                    >
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 14,
                          display: 'grid',
                          placeItems: 'center',
                          background: `${card.color}18`,
                          border: `1px solid ${card.color}36`,
                          boxShadow: `0 10px 22px ${card.color}12`,
                        }}
                      >
                        <Icon size={18} color={card.color} />
                      </div>
                      <div
                        style={{
                          color: card.color,
                          fontSize: '0.68rem',
                          fontWeight: TYPE.weight.ultra,
                          letterSpacing: '0.11em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {card.eyebrow}
                      </div>
                      <div
                        style={{
                          color: ENTRY_TEXT,
                          fontFamily: LANDING_DISPLAY,
                          fontSize: '0.94rem',
                          lineHeight: 1.04,
                          letterSpacing: '-0.03em',
                          fontWeight: 700,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          color: ENTRY_TEXT_MUTED,
                          fontSize: '0.78rem',
                          lineHeight: 1.55,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {card.detail}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="entry-meta-line"
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
                className="entry-float-card"
                style={{
                  ...panelStyle,
                  padding: 18,
                  background:
                    'radial-gradient(circle at 18% 14%, rgba(34,229,188,0.14), rgba(8,19,31,0) 24%), radial-gradient(circle at 86% 10%, rgba(111,232,255,0.1), rgba(8,19,31,0) 20%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015)), rgba(7,16,27,0.95)',
                }}
              >
                <div
                  className="entry-map-legend"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 16,
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ maxWidth: 640 }}>
                    <div
                      style={{
                        color: '#6FE8FF',
                        fontSize: '0.74rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.14em',
                        fontWeight: TYPE.weight.ultra,
                      }}
                    >
                      {mapEyebrow}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        color: ENTRY_TEXT,
                        fontFamily: LANDING_DISPLAY,
                        fontSize: 'clamp(1.28rem, 2.1vw, 1.95rem)',
                        lineHeight: 0.98,
                        letterSpacing: '-0.04em',
                        fontWeight: 700,
                      }}
                    >
                      {mapTitle}
                    </div>
                    <p
                      style={{
                        margin: '10px 0 0',
                        color: ENTRY_TEXT_MUTED,
                        fontSize: '0.9rem',
                        lineHeight: 1.7,
                        maxWidth: 700,
                      }}
                    >
                      {mapDescription}
                    </p>
                  </div>

                  <div
                    style={{
                      minWidth: 230,
                      maxWidth: 280,
                      borderRadius: 22,
                      padding: '14px 16px',
                      background:
                        'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      boxShadow: '0 16px 32px rgba(1,10,18,0.18)',
                    }}
                  >
                    <div
                      style={{
                        color: ENTRY_MINT,
                        fontSize: '0.72rem',
                        fontWeight: TYPE.weight.ultra,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        marginBottom: 8,
                      }}
                    >
                      {mapCalloutLabel}
                    </div>
                    <div
                      style={{
                        color: ENTRY_TEXT,
                        fontSize: '0.9rem',
                        lineHeight: 1.62,
                        fontWeight: TYPE.weight.black,
                      }}
                    >
                      {mapCalloutBody}
                    </div>
                  </div>
                </div>

                <div style={{ position: 'relative', paddingTop: 4 }}>
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 'clamp(18px, 2.4vw, 30px)',
                      insetInlineStart: 'clamp(18px, 2.4vw, 30px)',
                      width: 'min(280px, calc(100% - 44px))',
                      padding: '14px 16px',
                      borderRadius: 26,
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      background:
                        'linear-gradient(180deg, rgba(14,31,44,0.94), rgba(8,17,30,0.9)), rgba(8,17,30,0.92)',
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.06), 0 22px 46px rgba(1,10,18,0.28), 0 0 0 1px rgba(255,255,255,0.02)',
                      backdropFilter: 'blur(18px)',
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <EntryBrandLockup
                      ar={ar}
                      iconSize={44}
                      titleSize="clamp(1.45rem, 1.7vw, 1.8rem)"
                      arabicSize="clamp(0.96rem, 1.05vw, 1.12rem)"
                      metaSize="clamp(0.68rem, 0.82vw, 0.74rem)"
                    />
                  </div>
                  <div
                    style={{
                      borderRadius: 32,
                      padding: 12,
                      background: ENTRY_PANEL_STRONG,
                      border: `1px solid ${ENTRY_BORDER_SOFT}`,
                      boxShadow:
                        'inset 0 1px 0 rgba(255,255,255,0.04), 0 28px 64px rgba(1,10,18,0.24)',
                      overflow: 'hidden',
                    }}
                  >
                    <DeferredLandingMap ar={ar} />
                  </div>

                  <div style={{ position: 'absolute', left: 24, right: 24, bottom: 24, zIndex: 2 }}>
                    <div
                      className="entry-map-footer"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        padding: '14px 16px',
                        borderRadius: 22,
                        background: 'rgba(5,13,23,0.72)',
                        border: `1px solid ${ENTRY_BORDER_SOFT}`,
                        backdropFilter: 'blur(18px)',
                        boxShadow: '0 18px 42px rgba(1,10,18,0.28)',
                      }}
                    >
                      <div style={{ display: 'grid', gap: 6 }}>
                        <span
                          style={{
                            color: ENTRY_MINT,
                            fontSize: '0.72rem',
                            fontWeight: TYPE.weight.ultra,
                            letterSpacing: '0.12em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {ar
                            ? '\u0625\u0634\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062a\u062c'
                            : 'Product signal'}
                        </span>
                        <span style={{ color: ENTRY_TEXT, fontSize: '0.88rem', fontWeight: 700 }}>
                          {mapFooterNote}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          color: ENTRY_TEXT_SOFT,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        <span
                          className="entry-live-dot"
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: ENTRY_ACCENT,
                            boxShadow: `0 0 12px ${ENTRY_ACCENT}`,
                          }}
                        />
                        <span>{supportLine}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 6,
                  marginBottom: 2,
                }}
              >
                <div
                  style={{
                    color: ENTRY_MINT,
                    fontSize: '0.74rem',
                    fontWeight: TYPE.weight.ultra,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {ar ? '\u0627\u062e\u062a\u0631 \u0645\u0633\u0627\u0631\u0643' : 'Choose your flow'}
                </div>
                <div style={{ color: ENTRY_TEXT_MUTED, fontSize: '0.82rem' }}>
                  {ar
                    ? '\u062b\u0644\u0627\u062b \u0628\u0648\u0627\u0628\u0627\u062a \u0648\u0627\u0636\u062d\u0629 \u062a\u0628\u062f\u0623 \u0645\u0646 \u0646\u0641\u0633 \u0627\u0644\u0634\u0628\u0643\u0629'
                    : 'Three clear entry points into the same network'}
                </div>
              </div>

              <div
                className="entry-actions"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                }}
              >
                {actionCards.map(card => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleLandingNavigate(card.path)}
                      className="entry-float-card"
                      style={{
                        ...panelStyle,
                        padding: '18px',
                        display: 'grid',
                        gap: 12,
                        textAlign: ar ? 'right' : 'left',
                        cursor: 'pointer',
                        background:
                          'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.018)), rgba(10,19,32,0.88)',
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 16,
                          display: 'grid',
                          placeItems: 'center',
                          background: `${card.color}16`,
                          border: `1px solid ${card.color}33`,
                          boxShadow: `0 14px 28px ${card.color}16`,
                        }}
                      >
                        <Icon size={20} color={card.color} />
                      </div>
                      <div
                        style={{
                          fontSize: '0.98rem',
                          fontWeight: TYPE.weight.ultra,
                          color: ENTRY_TEXT,
                          lineHeight: 1.08,
                        }}
                      >
                        {card.title}
                      </div>
                      <div
                        style={{
                          color: ENTRY_TEXT_MUTED,
                          fontSize: '0.84rem',
                          lineHeight: 1.6,
                        }}
                      >
                        {card.detail}
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          color: card.color,
                          fontSize: '0.8rem',
                          fontWeight: TYPE.weight.black,
                        }}
                      >
                        {ar
                          ? '\u0627\u0641\u062a\u062d \u0627\u0644\u0645\u0633\u0627\u0631'
                          : 'Open flow'}
                        <ChevronRight size={14} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div
                className="entry-route-band"
                style={{
                  ...panelStyle,
                  marginTop: 14,
                  padding: '18px 20px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.95fr) auto',
                  gap: 16,
                  alignItems: 'center',
                  background:
                    'radial-gradient(circle at 12% 12%, rgba(25,231,187,0.12), transparent 30%), linear-gradient(180deg, rgba(220,255,248,0.05), rgba(220,255,248,0.02))',
                }}
              >
                <div style={{ display: 'grid', gap: 8 }}>
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
                      ? '\u0627\u0642\u062a\u0635\u0627\u062f \u0627\u0644\u0645\u0633\u0627\u0631'
                      : 'Route economics'}
                  </div>
                  <div
                    style={{
                      color: '#F7FCFF',
                      fontFamily: LANDING_DISPLAY,
                      fontSize: 'clamp(1.28rem, 2vw, 1.76rem)',
                      lineHeight: 0.98,
                      letterSpacing: '-0.05em',
                      fontWeight: 700,
                    }}
                  >
                    {supplyTitle}
                  </div>
                  <div
                    style={{
                      color: ENTRY_TEXT_MUTED,
                      fontSize: '0.88rem',
                      lineHeight: 1.68,
                      maxWidth: 620,
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
                        fontSize: '0.78rem',
                        fontWeight: TYPE.weight.black,
                      }}
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                <div
                  className="entry-route-actions"
                  style={{
                    display: 'flex',
                    gap: 12,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
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
                      ? '\u0623\u0646\u0634\u0626 \u0631\u062d\u0644\u062a\u0643'
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
