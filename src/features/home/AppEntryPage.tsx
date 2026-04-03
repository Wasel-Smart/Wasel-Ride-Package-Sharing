import { Gauge, Package, Search } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getWaselPresenceProfile } from '../../domains/trust/waselPresence';
import {
  LANDING_COLORS,
  type LandingActionCard,
  type LandingRowDefinition,
  type LandingSignalCard,
  LandingFooterSlot,
  LandingHeader,
  LandingHeroSection,
  LandingMapSection,
  LandingPageFrame,
  LandingSignalSection,
  LandingSlotRows,
  LandingTrustSection,
  LandingWhySlot,
} from './LandingSections';

const LANDING_ROWS: readonly LandingRowDefinition[] = [
  {
    id: 'main',
    className: 'landing-main-grid',
    style: {
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 0.92fr) minmax(0, 1.08fr)',
      gap: 24,
      alignItems: 'start',
    },
    slots: ['hero', 'map'],
  },
  {
    id: 'signals',
    className: 'landing-signal-grid',
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
      gap: 12,
      marginTop: 18,
    },
    slots: ['signals'],
  },
  {
    id: 'trust',
    className: 'landing-bottom-grid',
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 14,
      marginTop: 18,
    },
    slots: ['why', 'trust'],
  },
  {
    id: 'footer',
    style: { marginTop: 18 },
    slots: ['footer'],
  },
] as const;

export default function AppEntryPage() {
  const { user } = useLocalAuth();
  const { language } = useLanguage();
  const navigate = useIframeSafeNavigate();
  const ar = language === 'ar';
  const profile = getWaselPresenceProfile();

  const buildPath = (path: string, requiresAuth = false) =>
    !requiresAuth || user
      ? path
      : `/app/auth?returnTo=${encodeURIComponent(path)}`;

  const primaryActions: readonly LandingActionCard[] = [
    {
      title: ar ? 'ابحث عن المسار' : 'Search routes',
      detail: ar
        ? 'افتح المسارات الحية وشاهد السعر المشترك قبل الحجز.'
        : 'Open live corridors, compare departures, and see the shared price before booking.',
      path: buildPath('/app/find-ride'),
      icon: Search,
      color: LANDING_COLORS.cyan,
    },
    {
      title: ar ? 'افتح Mobility OS' : 'Open Mobility OS',
      detail: ar
        ? 'راقب ازدحام المدن والممرات الأقوى وأهدأ الساعات.'
        : 'Watch the busiest lanes, the strongest corridors, and the calmest hours.',
      path: '/app/mobility-os',
      icon: Gauge,
      color: LANDING_COLORS.gold,
    },
    {
      title: ar ? 'أرسل طردا' : 'Send package',
      detail: ar
        ? 'حرّك الطرود على نفس شبكة الرحلات بين المدن.'
        : 'Attach parcels to the same city-to-city network without leaving the route graph.',
      path: '/app/packages',
      icon: Package,
      color: LANDING_COLORS.blue,
    },
  ] as const;

  const signalCards: readonly LandingSignalCard[] = [
    {
      title: ar ? 'اقرأ الضغط' : 'Read route pressure',
      detail: ar
        ? 'اعرف متى تكون الممرات مزدحمة ومتى تكون أسهل للحجز.'
        : 'See when routes are busy, when they cool down, and where matching is strongest.',
      accent: LANDING_COLORS.cyan,
    },
    {
      title: ar ? 'قارن المدن' : 'Compare city corridors',
      detail: ar
        ? 'الشبكة تعرض الحركة بين المدن بدل البحث الأعمى رحلة برحلة.'
        : 'The map shows movement between cities first, so users understand the lane before the listing.',
      accent: LANDING_COLORS.gold,
    },
    {
      title: ar ? 'تحرك من القرار' : 'Move from insight to action',
      detail: ar
        ? 'من نفس الرؤية يمكنك الحجز أو التتبع أو إرسال الطرود.'
        : 'From the same view, users can book a seat, track a trip, or send a package.',
      accent: LANDING_COLORS.green,
    },
  ] as const;

  const heroBullets = [
    ar
      ? 'اكتشف أكثر الممرات ازدحاما وأفضلها للحجز.'
      : 'Spot the busiest lanes and the best corridors for matching.',
    ar
      ? 'افهم كيف تتحرك الطرود مع الركاب على نفس الخريطة.'
      : 'Understand how packages move on the same graph as riders.',
    ar
      ? 'انتقل من الرؤية إلى الإجراء بدون تغيير السياق.'
      : 'Move from corridor insight to action without changing context.',
  ] as const;

  const openAppLabel = user ? (ar ? 'افتح التطبيق' : 'Open app') : (ar ? 'ابدأ الآن' : 'Get started');
  const primaryAppPath = buildPath('/app/find-ride');
  const supportLine = profile.supportPhoneDisplay || profile.supportEmail || 'Wasel';
  const businessAddress = ar ? profile.businessAddressAr : profile.businessAddress;

  return (
    <LandingPageFrame>
      <LandingHeader ar={ar} />
      <LandingSlotRows
        rows={LANDING_ROWS}
        slots={{
          hero: (
            <LandingHeroSection
              ar={ar}
              openAppLabel={openAppLabel}
              primaryAppPath={primaryAppPath}
              mobilityOsPath="/app/mobility-os"
              myTripsPath={buildPath('/app/my-trips', true)}
              supportLine={supportLine}
              businessAddress={businessAddress}
              heroBullets={heroBullets}
              primaryActions={primaryActions}
              onNavigate={navigate}
            />
          ),
          map: <LandingMapSection ar={ar} />,
          signals: <LandingSignalSection cards={signalCards} />,
          why: <LandingWhySlot ar={ar} />,
          trust: <LandingTrustSection ar={ar} />,
          footer: <LandingFooterSlot ar={ar} />,
        }}
      />
    </LandingPageFrame>
  );
}
