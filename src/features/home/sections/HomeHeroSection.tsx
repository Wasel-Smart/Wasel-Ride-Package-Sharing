import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  CircleDollarSign,
  Clock,
  MapPinned,
  PackageCheck,
  Route,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { WaselLogo } from '../../../components/wasel-ui';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../../contexts/LanguageContext';

import { C, InlineCurrencySwitcher } from '../HomePageShared';

const MobilityOSLandingMap = lazy(() =>
  import('../MobilityOSLandingMap').then(m => ({ default: m.MobilityOSLandingMap })),
);
import type { TripMode } from './types';

interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string, source?: string) => void;
  primaryTripPath: string;
}

interface TripModeCardProps {
  ar: boolean;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
}

const heroProof = [
  {
    icon: BadgeCheck,
    label: 'Verified handoff',
    detail: 'Identity checks, escrowed payments, route proof, and support context stay attached.',
    accent: C.green,
  },
  {
    icon: CircleDollarSign,
    label: 'Transparent value',
    detail: 'Compare ride, parcel, and bus fallback choices with one clear corridor price story.',
    accent: C.gold,
  },
  {
    icon: Clock,
    label: 'Calm journey control',
    detail: 'Booking, approvals, live tracking, and escalation happen in one premium flow.',
    accent: C.cyan,
  },
] as const;

const heroProofAr = [
  {
    icon: BadgeCheck,
    label: 'تسليم موثق',
    detail: 'تبقى الهوية والدفع المحجوز وإثبات المسار وسياق الدعم مرتبطة.',
    accent: C.green,
  },
  {
    icon: CircleDollarSign,
    label: 'قيمة شفافة',
    detail: 'قارن الرحلات والطرود وبديل الباص بقصة سعر واضحة لكل مسار.',
    accent: C.gold,
  },
  {
    icon: Clock,
    label: 'تحكم هادئ بالرحلة',
    detail: 'الحجز والموافقات والتتبع المباشر والتصعيد تحدث في تجربة راقية واحدة.',
    accent: C.cyan,
  },
] as const;

const liveTimeline = [
  { label: 'Seat price', value: '8.00 JOD', accent: C.cyan },
  { label: 'Driver trust', value: '4.9 rating', accent: C.green },
  { label: 'Parcel option', value: '1 slot', accent: C.gold },
  { label: 'Bus fallback', value: '18:40', accent: C.blueLight },
] as const;

const liveTimelineAr = [
  { label: 'سعر المقعد', value: '8.00 د.أ', accent: C.cyan },
  { label: 'ثقة السائق', value: 'تقييم 4.9', accent: C.green },
  { label: 'خيار الطرد', value: 'مكان واحد', accent: C.gold },
  { label: 'بديل الباص', value: '18:40', accent: C.blueLight },
] as const;

function TripModeCard({ ar, tripMode, onTripModeChange }: TripModeCardProps) {
  const { t } = useLanguage();
  const options = [
    {
      key: 'one-way' as const,
      title: ar ? 'ذهاب فقط' : 'One way',
      desc: ar ? 'بحث مباشر على مسار واحد' : 'Direct search on one corridor',
    },
    {
      key: 'round' as const,
      title: ar ? 'ذهاب وعودة' : 'Round trip',
      desc: ar ? 'احتفظ بالاتجاهين في تدفق واحد' : 'Keep both directions in one flow',
    },
  ];

  return (
    <div className="wasel-home-start-panel">
      <div className="wasel-home-start-copy">
        <div className="wasel-home-kicker">{ar ? 'نوع الرحلة' : 'Trip type'}</div>
        <div className="wasel-home-start-text">
          {ar
            ? 'اختر مرة واحدة، وسيستخدم زر المسارات هذا الاختيار.'
            : 'Choose once. The route button follows this selection.'}
        </div>
      </div>

      <div
        className="wasel-home-mode-grid"
        role="group"
        aria-label={t('homeHeroSection.trip_mode')}
      >
        {options.map(option => {
          const selected = tripMode === option.key;
          return (
            <button
              type="button"
              aria-pressed={selected}
              key={option.key}
              onClick={() => onTripModeChange(option.key)}
              className="wasel-home-mode-button"
              style={{
                background: selected ? C.cyanDim : 'transparent',
                borderColor: selected ? C.borderHov : 'rgba(20,127,228,0.12)',
                color: C.text,
              }}
            >
              <span>
                <strong>{option.title}</strong>
                <small>{option.desc}</small>
              </span>
              {selected ? <CheckCircle size={15} color={C.cyan} /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductCommandPreview({ ar }: { ar: boolean }) {
  const { t } = useLanguage();
  const timeline = ar ? liveTimelineAr : liveTimeline;

  return (
    <div
      className="wasel-home-preview-panel"
      aria-label={t('homeHeroSection.wasel_product_preview')}
    >
      <div className="wasel-home-preview-top">
        <div>
          <div className="wasel-home-kicker">{ar ? 'معاينة المسار' : 'Route preview'}</div>
          <div className="wasel-home-preview-title">
            {ar ? 'عمان إلى العقبة اليوم' : 'Amman to Aqaba today'}
          </div>
        </div>
        <div className="wasel-home-live-chip">
          <span />
          {ar ? 'مقاعد + باص' : 'Seats + bus'}
        </div>
      </div>

      <div className="wasel-home-map-frame">
        <Suspense fallback={<div className="wasel-home-map-frame" style={{ minHeight: 330 }} />}>
          <MobilityOSLandingMap
            focusRouteId="amman-aqaba"
            focusLabel={ar ? 'عمان إلى العقبة' : 'Amman to Aqaba'}
            demandPressure={1.62}
            utilization={0.78}
            preferredHeight={330}
            minimalText
            showOverlay={false}
          />
        </Suspense>
      </div>

      <div className="wasel-home-product-stage">
        <div className="wasel-home-product-window">
          <div className="wasel-home-window-toolbar">
            <span />
            <span />
            <span />
            <strong>{ar ? 'الخيار الأفضل' : 'Best option'}</strong>
          </div>
          <div className="wasel-home-window-route">
            <span>
              <MapPinned size={16} color={C.cyan} />
              {ar ? 'عمان' : 'Amman'}
            </span>
            <ArrowRight size={14} color={C.textDim} />
            <span>{ar ? 'العقبة' : 'Aqaba'}</span>
          </div>
          <div className="wasel-home-window-grid">
            {timeline.map(item => (
              <div key={item.label}>
                <small>{item.label}</small>
                <strong style={{ color: item.accent }}>{item.value}</strong>
              </div>
            ))}
          </div>
          <div className="wasel-home-window-progress">
            <span style={{ width: '78%' }} />
          </div>
        </div>

        <div className="wasel-home-phone-frame">
          <div className="wasel-home-phone-notch" />
          <div className="wasel-home-phone-screen">
            <div className="wasel-home-phone-status">
              <PackageCheck size={15} color={C.gold} />
              {ar ? 'تمت مطابقة الطرد' : 'Parcel matched'}
            </div>
            <strong>{ar ? 'الاستلام خلال 22 دقيقة' : 'Pickup in 22 min'}</strong>
            <p>
              {ar
                ? 'السائق والمسار والسعر وسجل الدعم مرتبطة مسبقا.'
                : 'Driver, route, fare, and support record are already linked.'}
            </p>
            <div className="wasel-home-phone-tags">
              <span>{ar ? 'المبلغ محجوز' : 'Wallet held'}</span>
              <span>{ar ? 'الإثبات مطلوب' : 'Proof required'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  return (
    <button
      type="button"
      onClick={() => setLanguage(ar ? 'en' : 'ar')}
      title={ar ? 'Switch to English' : 'التبديل إلى العربية'}
      className="wasel-home-section-action"
      style={{ height: 34, padding: '0 12px', fontSize: '0.75rem' }}
    >
      {ar ? 'EN' : 'AR'}
    </button>
  );
}

export function HomeHeroSection({
  ar,
  user,
  firstName,
  tripMode,
  onTripModeChange,
  onNavigate,
  primaryTripPath,
}: HomeHeroSectionProps) {
  const proofItems = ar ? heroProofAr : heroProof;

  return (
    <motion.section className="wasel-home-hero" initial={false}>
      <div className="wasel-home-hero-copy">
        <div className="wasel-home-nav">
          <div className="wasel-home-nav-left">
            <div className="wasel-home-brand-stack">
              <div className="wasel-home-eyebrow">
                <Shield size={13} color={C.cyan} />
                {ar ? 'واصل — ثقة تتحرك معك' : 'Wasel — trust moves with you'}
              </div>
              <WaselLogo size={80} theme="light" variant="full" />
            </div>
          </div>
          <div className="wasel-home-nav-actions">
            <LangToggle />
            {user ? <InlineCurrencySwitcher ar={ar} /> : null}
          </div>
        </div>

        <h1 className="wasel-home-title">
          {ar ? 'واصل يحوّل كل رحلة إلى تجربة موثوقة وواضحة' : 'Wasel turns every route into a trusted, transparent journey'}
        </h1>

        <p className="wasel-home-lead">
          {ar
            ? firstName
              ? `أهلا بعودتك، ${firstName}. واصل يجمع السعر العادل، إثبات التسليم، الثقة، والدعم الفوري في كل مسار.`
              : 'واصل منصة تنقل وتوصيل مصممة لتشعر بالسيطرة: سعر واضح، سائقون موثقون، طرود قابلة للتتبع، وخيار باص احتياطي قبل أن تؤكد.'
            : firstName
              ? `Welcome back, ${firstName}. Wasel brings fair pricing, proof of handoff, trust signals, and instant support into every route.`
              : 'Wasel is the mobility and package-sharing brand built for confidence: clear pricing, verified drivers, trackable parcels, and bus fallback before you commit.'}
        </p>

        <div className="wasel-home-brand-promise" aria-label={ar ? 'وعد علامة واصل' : 'Wasel brand promise'}>
          <Sparkles size={17} color={C.gold} />
          <span>{ar ? 'علامة واحدة للتنقل اليومي: موثوقة، إنسانية، سريعة، وجاهزة للتوسع.' : 'One daily mobility brand: trusted, human, fast, and ready to scale.'}</span>
        </div>

        <div className="wasel-home-proof-row">
          {proofItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="wasel-home-proof-pill">
                <span className="wasel-home-proof-pill-icon" style={{ color: item.accent, background: `${item.accent}14` }}>
                  <Icon size={16} />
                </span>
                <div>
                  <strong style={{ color: C.text }}>{item.label}</strong>
                  <small style={{ color: C.textMuted }}>{item.detail}</small>
                </div>
              </div>
            );
          })}
        </div>

        <div className="wasel-home-hero-actions">
          <WaselButton
            type="button"
            onClick={() => onNavigate(primaryTripPath, 'hero_primary_route')}
            variant="primary"
            size="lg"
            icon={<Route size={17} />}
            iconEnd={<ArrowRight size={16} />}
          >
            {ar ? 'ابدأ رحلة موثوقة' : 'Start a trusted journey'}
          </WaselButton>
          <WaselButton
            type="button"
            onClick={() => onNavigate('/offer-ride', 'hero_offer_seats')}
            variant="outline"
            size="lg"
            icon={<CircleDollarSign size={17} />}
            style={{ background: C.elevated, color: C.text }}
          >
            {ar ? 'شارك مقاعدك بثقة' : 'Share seats with confidence'}
          </WaselButton>
        </div>

        <TripModeCard ar={ar} tripMode={tripMode} onTripModeChange={onTripModeChange} />
      </div>

      <div className="wasel-home-hero-aside">
        <ProductCommandPreview ar={ar} />
      </div>
    </motion.section>
  );
}
