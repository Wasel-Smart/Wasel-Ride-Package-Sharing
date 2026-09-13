import { lazy, Suspense } from 'react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  CheckCircle,
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

const MobilityOSLandingMap = lazy( () =>
  import( '../MobilityOSLandingMap' ).then( m => ( { default: m.MobilityOSLandingMap } ) ),
);
import type { TripMode } from './types';

interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: ( mode: TripMode ) => void;
  onNavigate: ( path: string, source?: string ) => void;
  primaryTripPath: string;
  primaryTripPath?: string;
}

interface TripModeCardProps {
  ar: boolean;
  tripMode: TripMode;
  onTripModeChange: ( mode: TripMode ) => void;
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

function getRouteEstimate ( from: string, to: string ): RouteMeta {
  const key = `${ from }-${ to }`;
  if ( ROUTE_DATA[ key ] ) {
    return ROUTE_DATA[ key ];
  }
  return { distKm: 90, durationEn: '~1h 15m', durationAr: '~ساعة وربع', priceJod: 4.0, mapRouteId: 'amman-irbid', dailyTrips: 40 };
}

const heroProof = [
  {
    icon: BadgeCheck,
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

function TripModeCard ( { ar, tripMode, onTripModeChange }: TripModeCardProps ) {
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
        <div className="wasel-home-kicker">{ ar ? 'نوع الرحلة' : 'Trip type' }</div>
        <div className="wasel-home-start-text">
          { ar
            ? 'اختر مرة واحدة، وسيستخدم زر المسارات هذا الاختيار.'
            : 'Choose once. The route button follows this selection.' }
        </div>
      </div>

      <div
        className="wasel-home-mode-grid"
        role="group"
        aria-label={ t( 'homeHeroSection.trip_mode' ) }
      >
        { options.map( option => {
          const selected = tripMode === option.key;
          return (
            <button
              type="button"
              aria-pressed={ selected }
              key={ option.key }
              onClick={ () => { void onTripModeChange( option.key ); } }
              className="wasel-home-mode-button"
              style={ {
                background: selected ? C.cyanDim : 'transparent',
                borderColor: selected ? C.borderHov : 'rgba(20,127,228,0.12)',
                color: C.text,
              } }
            >
              <span>
                <strong>{ option.title }</strong>
                <small>{ option.desc }</small>
              </span>
              { selected ? <CheckCircle size={ 15 } color={ C.cyan } /> : null }
            </button>
          );
        } ) }
      </div>
    </div>
  );
}

function ProductCommandPreview ( { ar }: { ar: boolean } ) {
  const { t } = useLanguage();
  const timeline = ar ? liveTimelineAr : liveTimeline;

  return (
    <div
      className="wasel-home-preview-panel"
      aria-label={ t( 'homeHeroSection.wasel_product_preview' ) }
    >
      <div className="wasel-home-preview-top">
        <div>
          <div className="wasel-home-kicker">{ ar ? 'معاينة المسار' : 'Route preview' }</div>
          <div className="wasel-home-preview-title">
            { ar ? 'عمان إلى العقبة اليوم' : 'Amman to Aqaba today' }
          </div>
        </div>
        <div className="wasel-home-live-chip">
          <span />
          { ar ? 'مقاعد + باص' : 'Seats + bus' }
        </div>
      </div>

      <div className="wasel-home-map-frame">
        <Suspense fallback={ <div className="wasel-home-map-frame" style={ { minHeight: 330 } } /> }>
          <MobilityOSLandingMap
            focusRouteId="amman-aqaba"
            focusLabel={ ar ? 'عمان إلى العقبة' : 'Amman to Aqaba' }
            demandPressure={ 1.62 }
            utilization={ 0.78 }
            preferredHeight={ 330 }
            minimalText
            showOverlay={ false }
          />
        </Suspense>
      </div>

      <div className="wasel-home-product-stage">
        <div className="wasel-home-product-window">
          <div className="wasel-home-window-toolbar">
            <span />
            <span />
            <span />
            <strong>{ ar ? 'الخيار الأفضل' : 'Best option' }</strong>
          </div>
          <div className="wasel-home-window-route">
            <span>
              <MapPinned size={ 16 } color={ C.cyan } />
              { ar ? 'عمان' : 'Amman' }
            </span>
            { ar ? <ArrowLeft size={ 14 } color={ C.textDim } /> : <ArrowRight size={ 14 } color={ C.textDim } /> }
            <span>{ ar ? 'العقبة' : 'Aqaba' }</span>
          </div>
          <div className="wasel-home-window-grid">
            { timeline.map( item => (
              <div key={ item.label }>
                <small>{ item.label }</small>
                <strong style={ { color: item.accent } }>{ item.value }</strong>
              </div>
            ) ) }
          </div>
          <div className="wasel-home-window-progress">
            <span style={ { width: '78%' } } />
          </div>
        </div>

        <div className="wasel-home-phone-frame">
          <div className="wasel-home-phone-notch" />
          <div className="wasel-home-phone-screen">
            <div className="wasel-home-phone-status">
              <PackageCheck size={ 15 } color={ C.gold } />
              { ar ? 'تمت مطابقة الطرد' : 'Parcel matched' }
            </div>
            <strong>{ ar ? 'الاستلام خلال 22 دقيقة' : 'Pickup in 22 min' }</strong>
            <p>
              { ar
                ? 'السائق والمسار والسعر وسجل الدعم مرتبطة مسبقا.'
                : 'Driver, route, fare, and support record are already linked.' }
            </p>
            <div className="wasel-home-phone-tags">
              <span>{ ar ? 'المبلغ محجوز' : 'Wallet held' }</span>
              <span>{ ar ? 'الإثبات مطلوب' : 'Proof required' }</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LangToggle () {
  const { language, setLanguage } = useLanguage();
  const ar = language === 'ar';
  return (
    <button
      type="button"
      onClick={ () => { void setLanguage( ar ? 'en' : 'ar' ); } }
      title={ ar ? 'Switch to English' : 'التبديل إلى العربية' }
      className="wasel-home-section-action"
      style={ { height: 34, padding: '0 12px', fontSize: '0.75rem' } }
      style={ {
        height: 36,
        padding: '0 14px',
        fontSize: '0.8rem',
        fontWeight: 800,
        background: 'rgba(0, 229, 255, 0.08)',
        border: '1px solid rgba(0, 229, 255, 0.24)',
        color: '#00E5FF',
        borderRadius: 9999,
      } }
    >
      { ar ? 'EN' : 'AR' }
      { ar ? 'English' : 'عربي' }
    </button>
  );
}

export function HomeHeroSection ( {
  ar,
  user,
  firstName,
  tripMode,
  onTripModeChange,
  onNavigate,
  primaryTripPath,
  primaryTripPath: _primaryTripPath,
}: HomeHeroSectionProps ) {
  const proofItems = heroProof;
  const [ origin, setOrigin ] = useState<string>( 'Amman' );
  const [ destination, setDestination ] = useState<string>( 'Irbid' );

  const currentRouteMeta = useMemo(
    () => getRouteEstimate( origin, destination ),
    [ origin, destination ],
  );

  const handleSwap = () => {
    setOrigin( destination );
    setDestination( origin );
  };

  const getCityLabel = ( cityName: string ) => {
    const found = JORDAN_CITIES.find( c => c.en === cityName );
    return ar && found ? found.ar : cityName;
  };

  const handleQuickRoute = ( from: string, to: string ) => {
    setOrigin( from );
    setDestination( to );
  };

  const findRidesPath = `/find-ride?from=${ encodeURIComponent( origin ) }&to=${ encodeURIComponent( destination ) }&mode=${ tripMode }&search=1`;
  const offerRidePath = `/offer-ride?from=${ encodeURIComponent( origin ) }&to=${ encodeURIComponent( destination ) }`;

  return (
    <motion.section className="wasel-home-hero" initial={ false }>
      {/* Ambient glowing auroras behind hero */ }
      <div className="wasel-home-aurora wasel-home-aurora-cyan" />
      <div className="wasel-home-aurora wasel-home-aurora-orange" />

      <div className="wasel-home-hero-copy">
        {/* Top Header Bar */ }
        <div className="wasel-home-nav">
          <div className="wasel-home-nav-left">
            <div className="wasel-home-brand-stack">
              <div className="wasel-home-eyebrow">
                <Shield size={ 13 } color={ C.cyan } />
                { ar ? 'شبكة مسارات الأردن' : 'Jordan route network' }
                <span
                  style={ {
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#72C70D',
                    boxShadow: '0 0 10px #72C70D',
                  } }
                />
                <Shield size={ 12 } color={ C.cyan } />
                { ar ? 'المنصة الوطنية للتنقل التشاركي' : 'Jordan National Mobility Network' }
              </div>
              <WaselLogo size={ 80 } theme="light" variant="full" />
              <WaselLogo size={ 84 } theme="light" variant="full" />
            </div>
          </div>
          <div className="wasel-home-nav-actions">
            <LangToggle />
            { user ? <InlineCurrencySwitcher ar={ ar } /> : null }
          </div>
        </div>

        {/* Hero Title */ }
        <h1 className="wasel-home-title">
          { ar ? 'تحرك في الأردن بتكلفة أقل' : 'Move across Jordan for less' }
          { ar ? (
            <>
              تنقّل عبر الأردن{ ' ' }
              <span className="wasel-home-title-accent">بأقل تكلفة وأعلى ثقة</span>
            </>
          ) : (
            <>
              Move Across Jordan for Less,{ ' ' }
              <span className="wasel-home-title-accent">With Total Confidence</span>
            </>
          ) }
        </h1>

        {/* Hero Subtitle */ }
        <p className="wasel-home-lead">
          { ar
            ? firstName
              ? `أهلا بعودتك، ${ firstName }. يحافظ Wasel على وضوح السعر والإثبات والثقة والدعم في كل مسار.`
              : 'يجمع Wasel الركاب والسائقين والطرود وخيار الباص في تدفق مسار موثوق، لتبدأ كل حركة بوضوح السعر والإثبات وسياق الدعم.'
                ? `مرحباً بعودتك، ${ firstName }. قارن المقاعد المتاحة، طرود نفس اليوم، وبدائل الباص مع أسعار معلنة وحماية ضمان الدفع.`
                : 'منصة واصل تجمع الركاب والسائقين والطرود معاً في مسارات يومية موثوقة عبر المملكة — وفر حتى 65% من تكاليف السفر مع توثيق سند والحماية المالية الشاملة.'
            : firstName
              ? `Welcome back, ${ firstName }. Compare seats, prices, parcel handoff, and bus fallback from one trusted route flow.`
              : 'Compare lower-cost rides, trusted drivers, parcel handoff, and scheduled bus fallback before you commit.' }
          ? `Welcome back, ${ firstName }. Compare available seats, same-day parcels, and scheduled bus fallback with upfront pricing and escrow protection.`
              : 'Connect with verified drivers and riders across Amman, Irbid, Aqaba, and Zarqa. Save up to 65% on intercity travel with Sanad ID verification and guaranteed escrow safety.'}
        </p>

        <div className="wasel-home-proof-row">
          { proofItems.map( item => {
            const Icon = item.icon;
            return (
              <div key={ item.labelKey } className="wasel-home-proof-pill">
                <span className="wasel-home-proof-pill-icon" style={ { color: item.accent, background: `${ item.accent }14` } }>
                  <Icon size={ 16 } />
                  {/* Interactive Jordan Route Planner Widget */ }
                  <div className="wasel-home-route-planner">
                    <div className="wasel-home-planner-header">
                      <div style={ { display: 'flex', alignItems: 'center', gap: 8 } }>
                        <Compass size={ 16 } color={ C.cyan } />
                        <span style={ { fontSize: '0.85rem', fontWeight: 800, color: '#f8fbff' } }>
                          { ar ? 'مخطط المسارات التفاعلي' : 'Live Jordan Route Selector' }
                        </span>
                      </div>

                      {/* One-Way / Round-Trip Tabs */ }
                      <div className="wasel-home-planner-tabs" role="tablist">
                        <button
                          type="button"
                          className={ `wasel-home-planner-tab ${ tripMode === 'one-way' ? 'active' : '' }` }
                          onClick={ () => onTripModeChange( 'one-way' ) }
                        >
                          { ar ? 'ذهاب فقط' : 'One Way' }
                        </button>
                        <button
                          type="button"
                          className={ `wasel-home-planner-tab ${ tripMode === 'round' ? 'active' : '' }` }
                          onClick={ () => onTripModeChange( 'round' ) }
                        >
                          { ar ? 'ذهاب وعودة' : 'Round Trip' }
                        </button>
                      </div>
                    </div>

                    {/* City Selection Inputs */ }
                    <div className="wasel-home-planner-inputs">
                      {/* Origin */ }
                      <div className="wasel-home-planner-node">
                        <div style={ { display: 'flex', alignItems: 'center', gap: 6 } }>
                          <MapPin size={ 13 } color={ C.cyan } />
                          <span style={ { fontSize: '0.72rem', color: C.textDim, fontWeight: 700 } }>
                            { ar ? 'نقطة الانطلاق' : 'Origin' }
                          </span>
                          <div>
                            <strong style={ { color: C.text } }>{ tx( item.labelKey ) }</strong>
                            <small style={ { color: C.textMuted } }>{ tx( item.detailKey ) }</small>
                          </div>
                        </div>
                        );
          })}
                        <select
                          value={ origin }
                          onChange={ e => setOrigin( e.target.value ) }
                          style={ {
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fbff',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%',
                          } }
                        >
                          { JORDAN_CITIES.map( c => (
                            <option key={ c.en } value={ c.en } style={ { background: '#081d39', color: '#fff' } }>
                              { ar ? c.ar : c.en }
                            </option>
                          ) ) }
                        </select>
                      </div>

                      {/* Swap Button */ }
                      <button
                        type="button"
                        onClick={ handleSwap }
                        className="wasel-home-planner-swap"
                        title={ ar ? 'تبديل الاتجاه' : 'Swap direction' }
                        aria-label={ ar ? 'تبديل الاتجاه' : 'Swap direction' }
                      >
                        <ArrowUpDown size={ 16 } />
                      </button>

                      {/* Destination */ }
                      <div className="wasel-home-planner-node">
                        <div style={ { display: 'flex', alignItems: 'center', gap: 6 } }>
                          <MapPinned size={ 13 } color={ C.green } />
                          <span style={ { fontSize: '0.72rem', color: C.textDim, fontWeight: 700 } }>
                            { ar ? 'الوجهة' : 'Destination' }
                          </span>
                        </div>
                        <select
                          value={ destination }
                          onChange={ e => setDestination( e.target.value ) }
                          style={ {
                            background: 'transparent',
                            border: 'none',
                            color: '#f8fbff',
                            fontWeight: 800,
                            fontSize: '0.95rem',
                            outline: 'none',
                            cursor: 'pointer',
                            width: '100%',
                          } }
                        >
                          { JORDAN_CITIES.map( c => (
                            <option key={ c.en } value={ c.en } style={ { background: '#081d39', color: '#fff' } }>
                              { ar ? c.ar : c.en }
                            </option>
                          ) ) }
                        </select>
                      </div>
                    </div>

                    {/* Dynamic Estimate Strip */ }
                    <div className="wasel-home-planner-estimate">
                      <div style={ { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } }>
                        <div style={ { display: 'flex', alignItems: 'baseline', gap: 4 } }>
                          <span style={ { fontSize: '0.72rem', color: C.textMuted } }>
                            { ar ? 'يبدأ من' : 'From' }
                          </span>
                          <strong style={ { color: '#00E5FF', fontSize: '1.25rem', fontWeight: 950 } }>
                            { currentRouteMeta.priceJod.toFixed( 2 ) } { ar ? 'د.أ' : 'JOD' }
                          </strong>
                          <span style={ { fontSize: '0.72rem', color: C.textMuted } }>
                            { ar ? '/ مقعد' : '/ seat' }
                          </span>
                        </div>

                        <span style={ { width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' } } />

                        <div style={ { fontSize: '0.8rem', color: C.textSub, display: 'inline-flex', alignItems: 'center', gap: 4 } }>
                          <Clock size={ 13 } color={ C.textMuted } />
                          { ar ? currentRouteMeta.durationAr : currentRouteMeta.durationEn }
                        </div>

                        <span style={ { width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' } } />

                        <div style={ { fontSize: '0.8rem', color: C.green, display: 'inline-flex', alignItems: 'center', gap: 4 } }>
                          <Zap size={ 13 } />
                          { currentRouteMeta.dailyTrips } { ar ? 'رحلة يومية' : 'rides today' }
                        </div>
                      </div>

                      {/* Quick action button inside planner */ }
                      <WaselButton
                        type="button"
                        variant="primary"
                        size="md"
                        icon={ <Route size={ 16 } /> }
                        iconEnd={ ar ? <ArrowLeft size={ 15 } /> : <ArrowRight size={ 15 } /> }
                        onClick={ () => onNavigate( findRidesPath, 'hero_planner_find' ) }
                      >
                        { ar ? 'ابحث عن رحلات' : 'Find Rides' }
                      </WaselButton>
                    </div>

                    {/* Quick Popular Corridor Chips */ }
                    <div style={ { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } }>
                      <span style={ { fontSize: '0.72rem', color: C.textDim, fontWeight: 700 } }>
                        { ar ? 'المسارات الشائعة:' : 'Popular routes:' }
                      </span>
                      { [
                        { from: 'Amman', to: 'Irbid', labelAr: 'عمّان ⇄ إربد (3 د.أ)', labelEn: 'Amman ⇄ Irbid (3 JOD)' },
                        { from: 'Amman', to: 'Aqaba', labelAr: 'عمّان ⇄ العقبة (8 د.أ)', labelEn: 'Amman ⇄ Aqaba (8 JOD)' },
                        { from: 'Amman', to: 'Dead Sea', labelAr: 'عمّان ⇄ البحر الميت (5 د.أ)', labelEn: 'Amman ⇄ Dead Sea (5 JOD)' },
                        { from: 'Amman', to: 'Zarqa', labelAr: 'عمّان ⇄ الزرقاء (2 د.أ)', labelEn: 'Amman ⇄ Zarqa (2 JOD)' },
                      ].map( item => {
                        const active = origin === item.from && destination === item.to;
                        return (
                          <button
                            type="button"
                            key={ `${ item.from }-${ item.to }` }
                            onClick={ () => handleQuickRoute( item.from, item.to ) }
                            style={ {
                              background: active ? 'rgba(0, 229, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                              border: `1px solid ${ active ? '#00E5FF' : 'rgba(20, 127, 228, 0.15)' }`,
                              color: active ? '#00E5FF' : C.textSub,
                              borderRadius: 9999,
                              padding: '4px 10px',
                              fontSize: '0.72rem',
                              fontWeight: 750,
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                            } }
                          >
                            { ar ? item.labelAr : item.labelEn }
                          </button>
                        );
                      } ) }
                    </div>
                  </div>

                  {/* Primary and Secondary CTA Buttons */ }
                  <div className="wasel-home-hero-actions">
                    <WaselButton
                      type="button"
                      onClick={ () => { void onNavigate( primaryTripPath, 'hero_primary_route' ); } }
                      onClick={ () => { void onNavigate( findRidesPath, 'hero_primary_route' ); } }
                      variant="primary"
                      size="lg"
                      icon={ <Route size={ 17 } /> }
                      icon={ <Route size={ 18 } /> }
                      iconEnd={ ar ? <ArrowLeft size={ 16 } /> : <ArrowRight size={ 16 } /> }
                    >
                      { ar ? 'اعرض المسارات المتاحة' : 'Find a lower-cost route' }
                      { ar ? 'احجز مقعدك الآن' : 'Book Your Seat Now' }
                    </WaselButton>

                    <WaselButton
                      type="button"
                      onClick={ () => { void onNavigate( '/offer-ride', 'hero_offer_seats' ); } }
                      onClick={ () => { void onNavigate( offerRidePath, 'hero_offer_seats' ); } }
                      variant="outline"
                      size="lg"
                      icon={ <CircleDollarSign size={ 17 } /> }
                      style={ { background: C.elevated, color: C.text } }
                      icon={ <CircleDollarSign size={ 18 } /> }
                      style={ {
                        background: 'rgba(8, 29, 57, 0.65)',
                        color: C.text,
                        border: '1px solid rgba(255, 190, 92, 0.35)',
                      } }
                    >
                      { ar ? 'اعرض مقاعد فارغة' : 'Offer empty seats' }
                      { ar ? 'اعرض مقاعدك واربح من مشوارك' : 'Offer Seats & Earn on Fuel' }
                    </WaselButton>
                  </div>

                  <TripModeCard ar={ ar } tripMode={ tripMode } onTripModeChange={ onTripModeChange } />
                  {/* Proof Pills */ }
                  <div className="wasel-home-proof-row">
                    { heroProof.map( item => {
                      const Icon = item.icon;
                      return (
                        <div key={ item.labelKey } className="wasel-home-proof-pill">
                          <span
                            className="wasel-home-proof-pill-icon"
                            style={ { color: item.accent, background: `${ item.accent }14` } }
                          >
                            <Icon size={ 18 } />
                          </span>
                          <div>
                            <strong style={ { color: C.text, display: 'block', fontSize: '0.88rem' } }>
                              { tx( item.labelKey ) }
                            </strong>
                            <small style={ { color: C.textMuted, fontSize: '0.75rem', lineHeight: 1.4, display: 'block', marginTop: 2 } }>
                              { tx( item.detailKey ) }
                            </small>
                          </div>
                        </div>
                      );
                    } ) }
                  </div>

                  {/* Social Proof Trust Bar */ }
                  <div
                    style={ {
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      marginTop: 18,
                      padding: '10px 14px',
                      borderRadius: 14,
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(20, 127, 228, 0.1)',
                      flexWrap: 'wrap',
                    } }
                  >
                    <div style={ { display: 'flex', gap: 2 } }>
                      { [ 1, 2, 3, 4, 5 ].map( i => (
                        <Star key={ i } size={ 14 } fill="#FF8A0B" color="#FF8A0B" />
                      ) ) }
                    </div>
                    <span style={ { fontSize: '0.78rem', fontWeight: 800, color: '#f8fbff' } }>
                      { ar ? 'تقييم 4.9 من 5' : '4.9/5 Rating' }
                    </span>
                    <span style={ { color: C.textDim, fontSize: '0.78rem' } }>•</span>
                    <span style={ { fontSize: '0.78rem', color: C.textMuted } }>
                      { ar
                        ? 'أكثر من 2,800 مستخدم نشط أسبوعياً في الأردن'
                        : '2,800+ weekly commuters across Jordan' }
                    </span>
                    <span style={ { color: C.textDim, fontSize: '0.78rem' } }>•</span>
                    <span style={ { fontSize: '0.78rem', color: '#72C70D', display: 'inline-flex', alignItems: 'center', gap: 4 } }>
                      <CheckCircle2 size={ 13 } />
                      { ar ? 'توثيق الهوية وسند' : 'Sanad & Civil ID Verified' }
                    </span>
                  </div>
              </div>

      {/* Right Column: Next-Gen Command Stage Visual */ }
            <div className="wasel-home-hero-aside">
              <ProductCommandPreview ar={ ar } />
              <div className="wasel-home-preview-panel">
                {/* Header Bar with Live Network Indicator */ }
                <div className="wasel-home-preview-top">
                  <div>
                    <div className="wasel-home-kicker">
                      <Sparkles size={ 11 } color={ C.cyan } />
                      { ar ? 'خريطة الشبكة الحية' : 'Live Network Radar' }
                    </div>
                    <div className="wasel-home-preview-title">
                      { ar
                        ? `${ getCityLabel( origin ) } إلى ${ getCityLabel( destination ) }`
                        : `${ origin } to ${ destination }` }
                    </div>
                  </div>
                  <div className="wasel-home-live-chip">
                    <span />
                    { ar ? 'حركة نشطة الآن' : 'Live Corridor' }
                  </div>
                </div>

                {/* Interactive Map Component */ }
                <div className="wasel-home-map-frame">
                  <Suspense fallback={ <div className="wasel-home-map-frame" style={ { minHeight: 330 } } /> }>
                    <MobilityOSLandingMap
                      focusRouteId={ currentRouteMeta.mapRouteId }
                      focusOrigin={ origin }
                      focusDestination={ destination }
                      focusLabel={ ar ? `${ getCityLabel( origin ) } إلى ${ getCityLabel( destination ) }` : `${ origin } to ${ destination }` }
                      demandPressure={ 1.65 }
                      utilization={ 0.82 }
                      preferredHeight={ 330 }
                      minimalText
                      showOverlay={ false }
                    />
                  </Suspense>
                </div>

                {/* Floating Telemetry & Proof Stage */ }
                <div className="wasel-home-product-stage">
                  {/* Route Status Card */ }
                  <div className="wasel-home-product-window">
                    <div className="wasel-home-window-toolbar">
                      <span />
                      <span />
                      <span />
                      <strong>{ ar ? 'الخيار الأفضل اليوم' : 'Optimal Choice Today' }</strong>
                    </div>

                    <div className="wasel-home-window-route">
                      <span>
                        <MapPinned size={ 16 } color={ C.cyan } />
                        { getCityLabel( origin ) }
                      </span>
                      { ar ? <ArrowLeft size={ 14 } color={ C.textDim } /> : <ArrowRight size={ 14 } color={ C.textDim } /> }
                      <span>{ getCityLabel( destination ) }</span>
                    </div>

                    <div className="wasel-home-window-grid">
                      <div>
                        <small style={ { color: C.textDim, fontSize: '0.68rem', display: 'block' } }>
                          { ar ? 'سعر المقعد' : 'Seat price' }
                        </small>
                        <strong style={ { color: '#00E5FF', fontSize: '0.95rem' } }>
                          { currentRouteMeta.priceJod.toFixed( 2 ) } { ar ? 'د.أ' : 'JOD' }
                        </strong>
                      </div>

                      <div>
                        <small style={ { color: C.textDim, fontSize: '0.68rem', display: 'block' } }>
                          { ar ? 'ثقة السائق' : 'Driver Trust' }
                        </small>
                        <strong style={ { color: '#72C70D', fontSize: '0.95rem' } }>
                          4.9 ★ { ar ? 'موثق' : 'Sanad' }
                        </strong>
                      </div>

                      <div>
                        <small style={ { color: C.textDim, fontSize: '0.68rem', display: 'block' } }>
                          { ar ? 'طرد سريع' : 'Parcel Slot' }
                        </small>
                        <strong style={ { color: '#FFBE5C', fontSize: '0.95rem' } }>
                          { ar ? 'متاح الآن' : 'Available' }
                        </strong>
                      </div>

                      <div>
                        <small style={ { color: C.textDim, fontSize: '0.68rem', display: 'block' } }>
                          { ar ? 'بديل الباص' : 'Bus Fallback' }
                        </small>
                        <strong style={ { color: '#58DDFF', fontSize: '0.95rem' } }>
                          { ar ? 'مجدول اليوم' : 'Scheduled' }
                        </strong>
                      </div>
                    </div>

                    <div className="wasel-home-window-progress" style={ { marginTop: 10 } }>
                      <span style={ { width: '84%' } } />
                    </div>
                  </div>

                  {/* Courier / Protection Card */ }
                  <div className="wasel-home-phone-frame">
                    <div className="wasel-home-phone-notch" />
                    <div className="wasel-home-phone-screen">
                      <div className="wasel-home-phone-status">
                        <PackageCheck size={ 15 } color={ C.gold } />
                        { ar ? 'توصيل طرود مؤمن' : 'Protected Courier' }
                      </div>
                      <strong>{ ar ? 'مطابقة في 22 دقيقة' : 'Matched in 22 min' }</strong>
                      <p>
                        { ar
                          ? 'الحسابات موثقة، والمدفوعات محفوظة بالضمان حتى تأكيد الاستلام.'
                          : 'Profiles verified, escrow funds held safely until drop-off proof.' }
                      </p>
                      <div className="wasel-home-phone-tags">
                        <span>{ ar ? 'ضمان مالي كامل' : 'Escrow Protected' }</span>
                        <span>{ ar ? 'تتبع لحظي' : 'Live Tracking' }</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
    </motion.section>
        );
}
