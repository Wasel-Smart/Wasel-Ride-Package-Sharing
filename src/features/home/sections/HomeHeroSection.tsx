import { motion } from 'motion/react';
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
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { WaselLogo } from '../../../components/wasel-ds/WaselLogo';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';

import { C, InlineCurrencySwitcher } from '../HomePageShared';
import { MobilityOSLandingMap } from '../MobilityOSLandingMap';
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
    detail: 'Identity, wallet, route, and support context stay attached.',
    accent: C.green,
  },
  {
    icon: CircleDollarSign,
    label: 'Price discipline',
    detail: 'Seat, parcel, and bus fallback decisions share one corridor logic.',
    accent: C.gold,
  },
  {
    icon: Clock,
    label: 'Less coordination',
    detail: 'Booking, approval, tracking, and escalation happen in one flow.',
    accent: C.cyan,
  },
] as const;

const heroProofAr = [
  {
    icon: BadgeCheck,
    label: 'تسليم موثق',
    detail: 'تبقى الهوية والمحفظة والمسار وسياق الدعم مرتبطة.',
    accent: C.green,
  },
  {
    icon: CircleDollarSign,
    label: 'وضوح السعر',
    detail: 'المقاعد والطرود وخيار الباص الاحتياطي تعمل بمنطق مسار واحد.',
    accent: C.gold,
  },
  {
    icon: Clock,
    label: 'تنسيق أقل',
    detail: 'الحجز والموافقة والتتبع والتصعيد تحدث في تدفق واحد.',
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

function TripModeCard({
  ar,
  tripMode,
  onTripModeChange,
}: TripModeCardProps) {
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

      <div className="wasel-home-mode-grid" role="group" aria-label="Trip mode">
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
                borderColor: selected ? C.borderHov : C.borderFaint,
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
  const timeline = ar ? liveTimelineAr : liveTimeline;

  return (
    <div className="wasel-home-preview-panel" aria-label="Wasel product preview">
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
        <MobilityOSLandingMap
          focusRouteId="amman-aqaba"
          focusLabel={ar ? 'عمان إلى العقبة' : 'Amman to Aqaba'}
          demandPressure={1.62}
          utilization={0.78}
          preferredHeight={330}
          minimalText
        />
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
        <div className="wasel-home-identity-row">
          <div className="wasel-home-brand-stack">
            <div className="wasel-home-eyebrow">
              <Shield size={13} color={C.cyan} />
              {ar ? 'شبكة مسارات الأردن' : 'Jordan route network'}
            </div>
            <WaselLogo size={36} theme="light" variant="full" />
          </div>
          {user ? <InlineCurrencySwitcher ar={ar} /> : null}
        </div>

        <h1 className="wasel-home-title">
          {ar ? 'تحرك في الأردن بتكلفة أقل' : 'Move across Jordan for less'}
        </h1>

        <p className="wasel-home-lead">
          {ar
            ? firstName
              ? `أهلا بعودتك، ${firstName}. يحافظ Wasel على وضوح السعر والإثبات والثقة والدعم في كل مسار.`
              : 'يجمع Wasel الركاب والسائقين والطرود وخيار الباص في تدفق مسار موثوق، لتبدأ كل حركة بوضوح السعر والإثبات وسياق الدعم.'
            : firstName
            ? `Welcome back, ${firstName}. Compare seats, prices, parcel handoff, and bus fallback from one trusted route flow.`
            : 'Compare lower-cost rides, trusted drivers, parcel handoff, and scheduled bus fallback before you commit.'}
        </p>

        <div className="wasel-home-proof-row">
          {proofItems.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="wasel-home-proof-item">
                <span style={{ color: item.accent, background: `${item.accent}14` }}>
                  <Icon size={16} />
                </span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
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
            {ar ? 'اعرض المسارات المتاحة' : 'Find a lower-cost route'}
          </WaselButton>
          <WaselButton
            type="button"
            onClick={() => onNavigate('/offer-ride', 'hero_offer_seats')}
            variant="outline"
            size="lg"
            icon={<CircleDollarSign size={17} />}
            style={{ background: C.elevated, color: C.text }}
          >
            {ar ? 'اعرض مقاعد فارغة' : 'Offer empty seats'}
          </WaselButton>
        </div>

        <TripModeCard
          ar={ar}
          tripMode={tripMode}
          onTripModeChange={onTripModeChange}
        />
      </div>

      <div className="wasel-home-hero-aside">
        <ProductCommandPreview ar={ar} />
      </div>
    </motion.section>
  );
}
