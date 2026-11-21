import { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  CircleDollarSign,
  Clock,
  MapPinned,
  Pause,
  PackageCheck,
  Play,
  Route,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { WaselLogo } from '../../../components/wasel-ui';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { ThemeToggle } from '../../../components/wasel-ui/ThemeToggle';
import { useLanguage } from '../../../contexts/LanguageContext';
import { tx } from '../../../locales/tx';
import { API_URL } from '../../../services/core';
import { buildLivePreview, STATIC_PREVIEW, type LivePreviewData, type PublicSnapshot } from './livePreview';

import { C, InlineCurrencySwitcher } from '../HomePageShared';

const MobilityOSLandingMap = lazy( () =>
  import( '../MobilityOSLandingMap' ).then( m => ( { default: m.MobilityOSLandingMap } ) ),
);
interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  onNavigate: ( path: string, source?: string ) => void;
  primaryTripPath: string;
  tickerItems?: HeroTickerItem[];
}

export interface HeroTickerItem {
  key: string;
  route: string;
  price: string;
  stat: string;
}

/** Seamless marquee: the item list is rendered twice so the
 *  translateX(±50%) loop has an exact copy to land on. */
function CorridorTicker ( { items, ar }: { items: HeroTickerItem[]; ar: boolean } ) {
  const { t } = useLanguage();
  const [ isPaused, setIsPaused ] = useState( false );
  if ( items.length === 0 ) { return null; }
  const loop = [ ...items, ...items ];
  const pauseLabel = t( isPaused ? 'homeHeroSection.ticker_resume' : 'homeHeroSection.ticker_pause' );
  return (
    <div className="wasel-ticker" role="region" aria-label={ t( 'homeHeroSection.ticker_live_label' ) }>
      <span className="wasel-ticker-label">
        <span aria-hidden="true" />
        { t( 'homeHeroSection.ticker_live_label' ) }
      </span>
      <button
        type="button"
        className="wasel-ticker-toggle"
        aria-pressed={ isPaused }
        aria-label={ pauseLabel }
        onClick={ () => setIsPaused( paused => !paused ) }
      >
        { isPaused ? <Play size={ 14 } aria-hidden="true" /> : <Pause size={ 14 } aria-hidden="true" /> }
        <span>{ pauseLabel }</span>
      </button>
      <div className="wasel-ticker-viewport">
        <div className={ `wasel-ticker-track${ isPaused ? ' is-paused' : '' }` }>
          { loop.map( ( item, index ) => (
            <span
              key={ `${ item.key }-${ index }` }
              className="wasel-ticker-item"
              aria-hidden={ index >= items.length }
            >
              <span className="wasel-ticker-route">{ item.route }</span>
              <small>{ item.price }</small>
              <small>{ item.stat }</small>
              <span className="wasel-ticker-sep" aria-hidden="true">{ ar ? '←' : '→' }</span>
            </span>
          ) ) }
        </div>
      </div>
    </div>
  );
}

const heroProof = [
  {
    icon: BadgeCheck,
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
    accent: 'var(--primary)',
  },
] as const;

function useLiveRoutePreview(): { data: LivePreviewData; isLive: boolean } {
  const [data, setData] = useState<LivePreviewData>(STATIC_PREVIEW);
  // Stays false until the public snapshot actually answers with a real
  // Amman -> Aqaba price, so the hero never claims "LIVE" over sample numbers.
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_URL) {return;}
    const controller = new AbortController();
    fetch(`${API_URL}/mobility-os/public-snapshot`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(r => (r.ok ? r.json() : null))
      .then((json: PublicSnapshot | null) => {
        const live = buildLivePreview(json);
        if (!live) {return;}
        setData(live);
        setIsLive(true);
      })
      .catch(() => { /* keep the labelled sample */ });
    return () => controller.abort();
  }, []);

  return { data, isLive };
}

function ProductCommandPreview ( { ar }: { ar: boolean } ) {
  const { t } = useLanguage();
  const { data: live, isLive } = useLiveRoutePreview();

  const liveTimeline = [
    { labelKey: 'homeHeroSection.timeline_seat_price_label', value: live.priceJod, accent: 'var(--primary)' },
    { labelKey: 'homeHeroSection.timeline_driver_trust_label', value: ar ? `تقييم ${live.rating}` : `${live.rating} rating`, accent: C.green },
    { labelKey: 'homeHeroSection.timeline_parcel_option_label', value: ar ? `${live.parcelSlots} مكان` : `${live.parcelSlots} slot`, accent: C.gold },
    { labelKey: 'homeHeroSection.timeline_bus_fallback_label', value: live.nextDeparture, accent: C.blueLight },
  ];

  // The public snapshot carries no driver rating, departure time or parcel
  // capacity, so in live mode those rows are omitted rather than faked.
  const timeline = liveTimeline.filter( item =>
    !( live.rating === '' && item.labelKey === 'homeHeroSection.timeline_driver_trust_label' ) &&
    !( live.parcelSlots === '' && item.labelKey === 'homeHeroSection.timeline_parcel_option_label' ) &&
    !( live.nextDeparture === '' && item.labelKey === 'homeHeroSection.timeline_bus_fallback_label' ),
  );

  return (
    <div
      className="wasel-home-preview-panel"
      aria-label={ t( 'homeHeroSection.wasel_product_preview' ) }
    >
      <div className="wasel-home-preview-top">
        <div>
          <div className="wasel-home-kicker">{ tx( 'homeHeroSection.route_preview_kicker' ) }</div>
          <div className="wasel-home-preview-title">
            { tx( 'homeHeroSection.route_preview_title' ) }
          </div>
        </div>
        <div
          className={ isLive ? 'wasel-home-live-chip' : 'wasel-home-live-chip wasel-home-live-chip--sample' }
          title={ isLive
            ? undefined
            : ( ar ? 'أرقام توضيحية لحين تحميل البيانات المباشرة' : 'Illustrative figures until live data loads' ) }
        >
          <span />
          { isLive
            ? tx( 'homeHeroSection.live_chip_label' )
            : ( ar ? 'عيّنة' : 'Sample' ) }
        </div>
      </div>

      <div className="wasel-home-map-frame">
        <Suspense fallback={ <div className="wasel-home-map-frame" style={ { minHeight: 330 } } /> }>
          <MobilityOSLandingMap
            focusRouteId="amman-aqaba"
            focusLabel={ ar ? 'عمان إلى العقبة' : 'Amman to Aqaba' }
            demandPressure={ live.demandPressure }
            utilization={ live.utilization }
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
            <strong>{ tx( 'homeHeroSection.window_best_option' ) }</strong>
          </div>
          <div className="wasel-home-window-route">
            <span>
              <MapPinned size={ 16 } color={ 'var(--primary)' } />
              { tx( 'homeHeroSection.window_origin' ) }
            </span>
            { ar ? <ArrowLeft size={ 14 } color={ 'var(--muted-foreground)' } /> : <ArrowRight size={ 14 } color={ 'var(--muted-foreground)' } /> }
            <span>{ tx( 'homeHeroSection.window_destination' ) }</span>
          </div>
          <div className="wasel-home-window-grid">
            { timeline.map( item => (
              <div key={ item.labelKey }>
                <small>{ tx( item.labelKey ) }</small>
                <strong style={ { color: item.accent } }>{ item.value }</strong>
              </div>
            ) ) }
          </div>
          <div className="wasel-home-window-progress">
            <span style={ { width: `${ Math.round( Math.min( 1, Math.max( 0, live.utilization ) ) * 100 ) }%` } } />
          </div>
        </div>

        <div className="wasel-home-phone-frame">
          <div className="wasel-home-phone-notch" />
          <div className="wasel-home-phone-screen">
            <div className="wasel-home-phone-status">
              <PackageCheck size={ 15 } color={ C.gold } />
              { tx( 'homeHeroSection.phone_parcel_matched' ) }
            </div>
            <strong>{ tx( 'homeHeroSection.phone_pickup_eta' ) }</strong>
            <p>{ tx( 'homeHeroSection.phone_linked_desc' ) }</p>
            <div className="wasel-home-phone-tags">
              <span>{ tx( 'homeHeroSection.phone_tag_wallet' ) }</span>
              <span>{ tx( 'homeHeroSection.phone_tag_proof' ) }</span>
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
      onClick={ () => setLanguage( ar ? 'en' : 'ar' ) }
      title={ tx( 'homeHeroSection.lang_toggle_title' ) }
      className="wasel-home-section-action"
      style={ { height: 34, padding: '0 12px', fontSize: '0.8125rem' } }
    >
      { ar ? 'EN' : 'AR' }
    </button>
  );
}

export function HomeHeroSection ( {
  ar,
  user,
  firstName,
  onNavigate,
  primaryTripPath,
  tickerItems = [],
}: HomeHeroSectionProps ) {
  const proofItems = heroProof;

  return (
    <motion.section className="wasel-home-hero" initial={ false }>
      <span className="wasel-home-aurora wasel-home-aurora-cyan" aria-hidden="true" />
      <span className="wasel-home-aurora wasel-home-aurora-green" aria-hidden="true" />
      <span className="wasel-home-aurora wasel-home-aurora-orange" aria-hidden="true" />
      <span className="wasel-home-aurora wasel-home-aurora-gold" aria-hidden="true" />

      <div className="wasel-home-hero-copy">
        <div className="wasel-home-nav">
          <div className="wasel-home-nav-left">
            <div className="wasel-home-brand-stack">
              <div className="wasel-home-eyebrow">
                <Shield size={ 13 } color={ 'var(--primary)' } />
                { tx( 'homeHeroSection.eyebrow_network' ) }
              </div>
              <WaselLogo size={ 44 } theme="light" variant="full" />
            </div>
          </div>
          <div className="wasel-home-nav-actions">
            <LangToggle />
            <ThemeToggle ar={ ar } />
            { user ? <InlineCurrencySwitcher ar={ ar } /> : null }
          </div>
        </div>

        <div style={ { marginTop: 26 } }>
          <span className="wasel-first-only-badge">
            <span className="wasel-first-only-badge-dot" aria-hidden="true" />
            <span className="wasel-first-only-badge-label">
              <ShieldCheck size={ 14 } color={ 'var(--primary)' } aria-hidden="true" />
              <strong>{ tx( 'homeHeroSection.first_only_badge' ) }</strong>
            </span>
          </span>
        </div>

        <h1 className="wasel-home-title wasel-home-hero-title">
          { tx( 'homeHeroSection.hero_title' ) }
        </h1>

        <p className="wasel-home-lead">
          { firstName
            ? tx( 'homeHeroSection.hero_lead_user' ).replace( '{name}', firstName )
            : tx( 'homeHeroSection.hero_lead_guest' ) }
        </p>

        <div className="wasel-home-proof-row">
          { proofItems.map( item => {
            const Icon = item.icon;
            return (
              <div key={ item.labelKey } className="wasel-home-proof-pill">
                <span className="wasel-home-proof-pill-icon" style={ { color: item.accent, background: `${ item.accent }14` } }>
                  <Icon size={ 16 } />
                </span>
                <div>
                  <strong style={ { color: 'var(--foreground)' } }>{ tx( item.labelKey ) }</strong>
                  <small style={ { color: 'var(--muted-foreground)' } }>{ tx( item.detailKey ) }</small>
                </div>
              </div>
            );
          } ) }
        </div>

        <div className="wasel-home-hero-actions">
          <WaselButton
            type="button"
            onClick={ () => onNavigate( primaryTripPath, 'hero_primary_route' ) }
            variant="primary"
            size="lg"
            icon={ <Route size={ 17 } /> }
            iconEnd={ ar ? <ArrowLeft size={ 16 } /> : <ArrowRight size={ 16 } /> }
          >
            { tx( 'homeHeroSection.cta_find_route' ) }
          </WaselButton>
          <WaselButton
            type="button"
            onClick={ () => onNavigate( '/offer-ride', 'hero_offer_seats' ) }
            variant="outline"
            size="lg"
            icon={ <CircleDollarSign size={ 17 } /> }
            style={ { background: 'var(--secondary)', color: 'var(--foreground)' } }
          >
            { tx( 'homeHeroSection.cta_offer_seats' ) }
          </WaselButton>
        </div>

        <CorridorTicker items={ tickerItems } ar={ ar } />
      </div>

      <div className="wasel-home-hero-aside">
        <ProductCommandPreview ar={ ar } />
      </div>
    </motion.section>
  );
}
