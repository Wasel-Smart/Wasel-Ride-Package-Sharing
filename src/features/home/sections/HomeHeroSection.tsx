import { lazy, Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  ArrowUpDown,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Compass,
  MapPin,
  MapPinned,
  PackageCheck,
  Route,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { WaselLogo } from '../../../components/wasel-ui';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../../contexts/LanguageContext';
import { tx } from '../../../locales/tx';
import { C, InlineCurrencySwitcher } from '../HomePageShared';
import type { TripMode } from './types';

const MobilityOSLandingMap = lazy(() =>
  import('../MobilityOSLandingMap').then(m => ({ default: m.MobilityOSLandingMap })),
);

interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string, source?: string) => void;
  primaryTripPath?: string;
}

interface CityOption {
  en: string;
  ar: string;
  hub?: boolean;
}

const JORDAN_CITIES: CityOption[] = [
  { en: 'Amman', ar: 'عمّان', hub: true },
  { en: 'Irbid', ar: 'إربد', hub: true },
  { en: 'Aqaba', ar: 'العقبة', hub: true },
  { en: 'Dead Sea', ar: 'البحر الميت' },
  { en: 'Zarqa', ar: 'الزرقاء' },
  { en: 'Petra', ar: 'البتراء' },
  { en: 'Jerash', ar: 'جرش' },
  { en: 'Madaba', ar: 'مادبا' },
];

interface RouteMeta {
  distKm: number;
  durationEn: string;
  durationAr: string;
  priceJod: number;
  mapRouteId: string;
  dailyTrips: number;
}

const ROUTE_DATA: Record<string, RouteMeta> = {
  'Amman-Irbid': { distKm: 85, durationEn: '~1h 10m', durationAr: '~ساعة و10 د', priceJod: 3.0, mapRouteId: 'amman-irbid', dailyTrips: 142 },
  'Irbid-Amman': { distKm: 85, durationEn: '~1h 10m', durationAr: '~ساعة و10 د', priceJod: 3.0, mapRouteId: 'amman-irbid', dailyTrips: 142 },
  'Amman-Aqaba': { distKm: 330, durationEn: '~3h 40m', durationAr: '~3 ساعات ونصف', priceJod: 8.0, mapRouteId: 'amman-aqaba', dailyTrips: 58 },
  'Aqaba-Amman': { distKm: 330, durationEn: '~3h 40m', durationAr: '~3 ساعات ونصف', priceJod: 8.0, mapRouteId: 'amman-aqaba', dailyTrips: 58 },
  'Amman-Dead Sea': { distKm: 60, durationEn: '~50m', durationAr: '~50 دقيقة', priceJod: 5.0, mapRouteId: 'amman-madaba', dailyTrips: 46 },
  'Dead Sea-Amman': { distKm: 60, durationEn: '~50m', durationAr: '~50 دقيقة', priceJod: 5.0, mapRouteId: 'amman-madaba', dailyTrips: 46 },
  'Amman-Zarqa': { distKm: 30, durationEn: '~35m', durationAr: '~35 دقيقة', priceJod: 2.0, mapRouteId: 'amman-zarqa', dailyTrips: 180 },
  'Zarqa-Amman': { distKm: 30, durationEn: '~35m', durationAr: '~35 دقيقة', priceJod: 2.0, mapRouteId: 'amman-zarqa', dailyTrips: 180 },
  'Amman-Petra': { distKm: 250, durationEn: '~3h 15m', durationAr: '~3 ساعات وربع', priceJod: 12.0, mapRouteId: 'amman-maan', dailyTrips: 32 },
  'Petra-Amman': { distKm: 250, durationEn: '~3h 15m', durationAr: '~3 ساعات وربع', priceJod: 12.0, mapRouteId: 'amman-maan', dailyTrips: 32 },
  'Irbid-Aqaba': { distKm: 415, durationEn: '~4h 45m', durationAr: '~4 ساعات و45 د', priceJod: 11.0, mapRouteId: 'amman-aqaba', dailyTrips: 24 },
  'Aqaba-Irbid': { distKm: 415, durationEn: '~4h 45m', durationAr: '~4 ساعات و45 د', priceJod: 11.0, mapRouteId: 'amman-aqaba', dailyTrips: 24 },
};

function getRouteEstimate(from: string, to: string): RouteMeta {
  const key = `${from}-${to}`;
  if (ROUTE_DATA[key]) {
    return ROUTE_DATA[key];
  }
  return { distKm: 90, durationEn: '~1h 15m', durationAr: '~ساعة وربع', priceJod: 4.0, mapRouteId: 'amman-irbid', dailyTrips: 40 };
}

const heroProof = [
  {
    icon: ShieldCheck,
    labelKey: 'homeContent.proof_verified_label',
    detailKey: 'homeContent.proof_verified_detail',
    accent: C.green,
  },
  {
    icon: CircleDollarSign,
    labelKey: 'homeContent.proof_price_label',
    detailKey: 'homeContent.proof_price_detail',
    accent: C.gold,
  },
  {
    icon: Clock,
    labelKey: 'homeContent.proof_coordination_label',
    detailKey: 'homeContent.proof_coordination_detail',
    accent: C.cyan,
  },
] as const;

function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  return (
    <button
      type="button"
      onClick={() => { void setLanguage(ar ? 'en' : 'ar'); }}
      title={ar ? 'Switch to English' : 'التبديل إلى العربية'}
      className="wasel-home-section-action"
      style={{
        height: 36,
        padding: '0 14px',
        fontSize: '0.8rem',
        fontWeight: 800,
        background: 'rgba(0, 229, 255, 0.08)',
        border: '1px solid rgba(0, 229, 255, 0.24)',
        color: '#00E5FF',
        borderRadius: 9999,
      }}
    >
      {ar ? 'English' : 'عربي'}
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
  primaryTripPath: _primaryTripPath,
}: HomeHeroSectionProps) {
  const [origin, setOrigin] = useState<string>('Amman');
  const [destination, setDestination] = useState<string>('Irbid');

  const currentRouteMeta = useMemo(
    () => getRouteEstimate(origin, destination),
    [origin, destination],
  );

  const handleSwap = () => {
    setOrigin(destination);
    setDestination(origin);
  };

  const getCityLabel = (cityName: string) => {
    const found = JORDAN_CITIES.find(c => c.en === cityName);
    return ar && found ? found.ar : cityName;
  };

  const handleQuickRoute = (from: string, to: string) => {
    setOrigin(from);
    setDestination(to);
  };

  const findRidesPath = `/find-ride?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}&mode=${tripMode}&search=1`;
  const offerRidePath = `/offer-ride?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`;

  return (
    <motion.section className="wasel-home-hero" initial={false}>
      {/* Ambient glowing auroras behind hero */}
      <div className="wasel-home-aurora wasel-home-aurora-cyan" />
      <div className="wasel-home-aurora wasel-home-aurora-orange" />

      <div className="wasel-home-hero-copy">
        {/* Top Header Bar */}
        <div className="wasel-home-nav">
          <div className="wasel-home-nav-left">
            <div className="wasel-home-brand-stack">
              <div className="wasel-home-eyebrow">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#72C70D',
                    boxShadow: '0 0 10px #72C70D',
                  }}
                />
                <Shield size={12} color={C.cyan} />
                {ar ? 'المنصة الوطنية للتنقل التشاركي' : 'Jordan National Mobility Network'}
              </div>
              <WaselLogo size={84} theme="light" variant="full" />
            </div>
          </div>
          <div className="wasel-home-nav-actions">
            <LangToggle />
            {user ? <InlineCurrencySwitcher ar={ar} /> : null}
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="wasel-home-title">
          {ar ? (
            <>
              تنقّل عبر الأردن{' '}
              <span className="wasel-home-title-accent">بأقل تكلفة وأعلى ثقة</span>
            </>
          ) : (
            <>
              Move Across Jordan for Less,{' '}
              <span className="wasel-home-title-accent">With Total Confidence</span>
            </>
          )}
        </h1>

        {/* Hero Subtitle */}
        <p className="wasel-home-lead">
          {ar
            ? firstName
              ? `مرحباً بعودتك، ${firstName}. قارن المقاعد المتاحة، طرود نفس اليوم، وبدائل الباص مع أسعار معلنة وحماية ضمان الدفع.`
              : 'منصة واصل تجمع الركاب والسائقين والطرود معاً في مسارات يومية موثوقة عبر المملكة — وفر حتى 65% من تكاليف السفر مع توثيق سند والحماية المالية الشاملة.'
            : firstName
              ? `Welcome back, ${firstName}. Compare available seats, same-day parcels, and scheduled bus fallback with upfront pricing and escrow protection.`
              : 'Connect with verified drivers and riders across Amman, Irbid, Aqaba, and Zarqa. Save up to 65% on intercity travel with Sanad ID verification and guaranteed escrow safety.'}
        </p>

        {/* Interactive Jordan Route Planner Widget */}
        <div className="wasel-home-route-planner">
          <div className="wasel-home-planner-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Compass size={16} color={C.cyan} />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f8fbff' }}>
                {ar ? 'مخطط المسارات التفاعلي' : 'Live Jordan Route Selector'}
              </span>
            </div>

            {/* One-Way / Round-Trip Tabs */}
            <div className="wasel-home-planner-tabs" role="tablist">
              <button
                type="button"
                className={`wasel-home-planner-tab ${tripMode === 'one-way' ? 'active' : ''}`}
                onClick={() => onTripModeChange('one-way')}
              >
                {ar ? 'ذهاب فقط' : 'One Way'}
              </button>
              <button
                type="button"
                className={`wasel-home-planner-tab ${tripMode === 'round' ? 'active' : ''}`}
                onClick={() => onTripModeChange('round')}
              >
                {ar ? 'ذهاب وعودة' : 'Round Trip'}
              </button>
            </div>
          </div>

          {/* City Selection Inputs */}
          <div className="wasel-home-planner-inputs">
            {/* Origin */}
            <div className="wasel-home-planner-node">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color={C.cyan} />
                <span style={{ fontSize: '0.72rem', color: C.textDim, fontWeight: 700 }}>
                  {ar ? 'نقطة الانطلاق' : 'Origin'}
                </span>
              </div>
              <select
                value={origin}
                onChange={e => setOrigin(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fbff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {JORDAN_CITIES.map(c => (
                  <option key={c.en} value={c.en} style={{ background: '#081d39', color: '#fff' }}>
                    {ar ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={handleSwap}
              className="wasel-home-planner-swap"
              title={ar ? 'تبديل الاتجاه' : 'Swap direction'}
              aria-label={ar ? 'تبديل الاتجاه' : 'Swap direction'}
            >
              <ArrowUpDown size={16} />
            </button>

            {/* Destination */}
            <div className="wasel-home-planner-node">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPinned size={13} color={C.green} />
                <span style={{ fontSize: '0.72rem', color: C.textDim, fontWeight: 700 }}>
                  {ar ? 'الوجهة' : 'Destination'}
                </span>
              </div>
              <select
                value={destination}
                onChange={e => setDestination(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fbff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                {JORDAN_CITIES.map(c => (
                  <option key={c.en} value={c.en} style={{ background: '#081d39', color: '#fff' }}>
                    {ar ? c.ar : c.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Estimate Strip */}
          <div className="wasel-home-planner-estimate">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: '0.72rem', color: C.textMuted }}>
                  {ar ? 'يبدأ من' : 'From'}
                </span>
                <strong style={{ color: '#00E5FF', fontSize: '1.25rem', fontWeight: 950 }}>
                  {currentRouteMeta.priceJod.toFixed(2)} {ar ? 'د.أ' : 'JOD'}
                </strong>
                <span style={{ fontSize: '0.72rem', color: C.textMuted }}>
                  {ar ? '/ مقعد' : '/ seat'}
                </span>
              </div>

              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />

              <div style={{ fontSize: '0.8rem', color: C.textSub, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Clock size={13} color={C.textMuted} />
                {ar ? currentRouteMeta.durationAr : currentRouteMeta.durationEn}
              </div>

              <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />

              <div style={{ fontSize: '0.8rem', color: C.green, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Zap size={13} />
                {currentRouteMeta.dailyTrips} {ar ? 'رحلة يومية' : 'rides today'}
              </div>
            </div>

            {/* Quick action button inside planner */}
            <WaselButton
              type="button"
              variant="primary"
              size="md"
              icon={<Route size={16} />}
              iconEnd={ar ? <ArrowLeft size={15} /> : <ArrowRight size={15} />}
              onClick={() => onNavigate(findRidesPath, 'hero_planner_find')}
            >
              {ar ? 'ابحث عن رحلات' : 'Find Rides'}
            </WaselButton>
          </div>

          {/* Quick Popular Corridor Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.72rem', color: C.textDim, fontWeight: 700 }}>
              {ar ? 'المسارات الشائعة:' : 'Popular routes:'}
            </span>
            {[
              { from: 'Amman', to: 'Irbid', labelAr: 'عمّان ⇄ إربد (3 د.أ)', labelEn: 'Amman ⇄ Irbid (3 JOD)' },
              { from: 'Amman', to: 'Aqaba', labelAr: 'عمّان ⇄ العقبة (8 د.أ)', labelEn: 'Amman ⇄ Aqaba (8 JOD)' },
              { from: 'Amman', to: 'Dead Sea', labelAr: 'عمّان ⇄ البحر الميت (5 د.أ)', labelEn: 'Amman ⇄ Dead Sea (5 JOD)' },
              { from: 'Amman', to: 'Zarqa', labelAr: 'عمّان ⇄ الزرقاء (2 د.أ)', labelEn: 'Amman ⇄ Zarqa (2 JOD)' },
            ].map(item => {
              const active = origin === item.from && destination === item.to;
              return (
                <button
                  type="button"
                  key={`${item.from}-${item.to}`}
                  onClick={() => handleQuickRoute(item.from, item.to)}
                  style={{
                    background: active ? 'rgba(0, 229, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${active ? '#00E5FF' : 'rgba(20, 127, 228, 0.15)'}`,
                    color: active ? '#00E5FF' : C.textSub,
                    borderRadius: 9999,
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: 750,
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  {ar ? item.labelAr : item.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Primary and Secondary CTA Buttons */}
        <div className="wasel-home-hero-actions">
          <WaselButton
            type="button"
            onClick={() => { void onNavigate(findRidesPath, 'hero_primary_route'); }}
            variant="primary"
            size="lg"
            icon={<Route size={18} />}
            iconEnd={ar ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
          >
            {ar ? 'احجز مقعدك الآن' : 'Book Your Seat Now'}
          </WaselButton>

          <WaselButton
            type="button"
            onClick={() => { void onNavigate(offerRidePath, 'hero_offer_seats'); }}
            variant="outline"
            size="lg"
            icon={<CircleDollarSign size={18} />}
            style={{
              background: 'rgba(8, 29, 57, 0.65)',
              color: C.text,
              border: '1px solid rgba(255, 190, 92, 0.35)',
            }}
          >
            {ar ? 'اعرض مقاعدك واربح من مشوارك' : 'Offer Seats & Earn on Fuel'}
          </WaselButton>
        </div>

        {/* Proof Pills */}
        <div className="wasel-home-proof-row">
          {heroProof.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.labelKey} className="wasel-home-proof-pill">
                <span
                  className="wasel-home-proof-pill-icon"
                  style={{ color: item.accent, background: `${item.accent}14` }}
                >
                  <Icon size={18} />
                </span>
                <div>
                  <strong style={{ color: C.text, display: 'block', fontSize: '0.88rem' }}>
                    {tx(item.labelKey)}
                  </strong>
                  <small style={{ color: C.textMuted, fontSize: '0.75rem', lineHeight: 1.4, display: 'block', marginTop: 2 }}>
                    {tx(item.detailKey)}
                  </small>
                </div>
              </div>
            );
          })}
        </div>

        {/* Social Proof Trust Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginTop: 18,
            padding: '10px 14px',
            borderRadius: 14,
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(20, 127, 228, 0.1)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 2 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <Star key={i} size={14} fill="#FF8A0B" color="#FF8A0B" />
            ))}
          </div>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#f8fbff' }}>
            {ar ? 'تقييم 4.9 من 5' : '4.9/5 Rating'}
          </span>
          <span style={{ color: C.textDim, fontSize: '0.78rem' }}>•</span>
          <span style={{ fontSize: '0.78rem', color: C.textMuted }}>
            {ar
              ? 'أكثر من 2,800 مستخدم نشط أسبوعياً في الأردن'
              : '2,800+ weekly commuters across Jordan'}
          </span>
          <span style={{ color: C.textDim, fontSize: '0.78rem' }}>•</span>
          <span style={{ fontSize: '0.78rem', color: '#72C70D', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} />
            {ar ? 'توثيق الهوية وسند' : 'Sanad & Civil ID Verified'}
          </span>
        </div>
      </div>

      {/* Right Column: Next-Gen Command Stage Visual */}
      <div className="wasel-home-hero-aside">
        <div className="wasel-home-preview-panel">
          {/* Header Bar with Live Network Indicator */}
          <div className="wasel-home-preview-top">
            <div>
              <div className="wasel-home-kicker">
                <Sparkles size={11} color={C.cyan} />
                {ar ? 'خريطة الشبكة الحية' : 'Live Network Radar'}
              </div>
              <div className="wasel-home-preview-title">
                {ar
                  ? `${getCityLabel(origin)} إلى ${getCityLabel(destination)}`
                  : `${origin} to ${destination}`}
              </div>
            </div>
            <div className="wasel-home-live-chip">
              <span />
              {ar ? 'حركة نشطة الآن' : 'Live Corridor'}
            </div>
          </div>

          {/* Interactive Map Component */}
          <div className="wasel-home-map-frame">
            <Suspense fallback={<div className="wasel-home-map-frame" style={{ minHeight: 330 }} />}>
              <MobilityOSLandingMap
                focusRouteId={currentRouteMeta.mapRouteId}
                focusOrigin={origin}
                focusDestination={destination}
                focusLabel={ar ? `${getCityLabel(origin)} إلى ${getCityLabel(destination)}` : `${origin} to ${destination}`}
                demandPressure={1.65}
                utilization={0.82}
                preferredHeight={330}
                minimalText
                showOverlay={false}
              />
            </Suspense>
          </div>

          {/* Floating Telemetry & Proof Stage */}
          <div className="wasel-home-product-stage">
            {/* Route Status Card */}
            <div className="wasel-home-product-window">
              <div className="wasel-home-window-toolbar">
                <span />
                <span />
                <span />
                <strong>{ar ? 'الخيار الأفضل اليوم' : 'Optimal Choice Today'}</strong>
              </div>

              <div className="wasel-home-window-route">
                <span>
                  <MapPinned size={16} color={C.cyan} />
                  {getCityLabel(origin)}
                </span>
                {ar ? <ArrowLeft size={14} color={C.textDim} /> : <ArrowRight size={14} color={C.textDim} />}
                <span>{getCityLabel(destination)}</span>
              </div>

              <div className="wasel-home-window-grid">
                <div>
                  <small style={{ color: C.textDim, fontSize: '0.68rem', display: 'block' }}>
                    {ar ? 'سعر المقعد' : 'Seat price'}
                  </small>
                  <strong style={{ color: '#00E5FF', fontSize: '0.95rem' }}>
                    {currentRouteMeta.priceJod.toFixed(2)} {ar ? 'د.أ' : 'JOD'}
                  </strong>
                </div>

                <div>
                  <small style={{ color: C.textDim, fontSize: '0.68rem', display: 'block' }}>
                    {ar ? 'ثقة السائق' : 'Driver Trust'}
                  </small>
                  <strong style={{ color: '#72C70D', fontSize: '0.95rem' }}>
                    4.9 ★ {ar ? 'موثق' : 'Sanad'}
                  </strong>
                </div>

                <div>
                  <small style={{ color: C.textDim, fontSize: '0.68rem', display: 'block' }}>
                    {ar ? 'طرد سريع' : 'Parcel Slot'}
                  </small>
                  <strong style={{ color: '#FFBE5C', fontSize: '0.95rem' }}>
                    {ar ? 'متاح الآن' : 'Available'}
                  </strong>
                </div>

                <div>
                  <small style={{ color: C.textDim, fontSize: '0.68rem', display: 'block' }}>
                    {ar ? 'بديل الباص' : 'Bus Fallback'}
                  </small>
                  <strong style={{ color: '#58DDFF', fontSize: '0.95rem' }}>
                    {ar ? 'مجدول اليوم' : 'Scheduled'}
                  </strong>
                </div>
              </div>

              <div className="wasel-home-window-progress" style={{ marginTop: 10 }}>
                <span style={{ width: '84%' }} />
              </div>
            </div>

            {/* Courier / Protection Card */}
            <div className="wasel-home-phone-frame">
              <div className="wasel-home-phone-notch" />
              <div className="wasel-home-phone-screen">
                <div className="wasel-home-phone-status">
                  <PackageCheck size={15} color={C.gold} />
                  {ar ? 'توصيل طرود مؤمن' : 'Protected Courier'}
                </div>
                <strong>{ar ? 'مطابقة في 22 دقيقة' : 'Matched in 22 min'}</strong>
                <p>
                  {ar
                    ? 'الحسابات موثقة، والمدفوعات محفوظة بالضمان حتى تأكيد الاستلام.'
                    : 'Profiles verified, escrow funds held safely until drop-off proof.'}
                </p>
                <div className="wasel-home-phone-tags">
                  <span>{ar ? 'ضمان مالي كامل' : 'Escrow Protected'}</span>
                  <span>{ar ? 'تتبع لحظي' : 'Live Tracking'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
