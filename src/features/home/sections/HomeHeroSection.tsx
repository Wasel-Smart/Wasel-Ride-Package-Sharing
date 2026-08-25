import { lazy, Suspense } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle,
  CircleDoll_arSign,
  Clock,
  MapPinned,
  PackageCheck,
  Route,
  Shield,
} from 'lucide-react';
import type { User } from '@supabase/auth-js';
import { WaselLogo } from '../../../components/wasel-ui';
import { WaselButton } from '../../../components/wasel-ui/WaselButton';
import { useLanguage } from '../../../contexts/LanguageContext';

import { C, InlineCurrencySwitcher } from '../HomePageSh_ared';

const MobilityOSLandingMap = lazy(() =>
  import('../MobilityOSLandingMap').then(m => ({ default: m.MobilityOSLandingMap })),
);
import type { TripMode } from './types';

interface HomeHeroSectionProps {
  _ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string, source?: string) => void;
  prim_aryTripPath: string;
}

interface TripModeC_ardProps {
  _ar: boolean;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
}

function getProofItems(t: (key: string) => string, _ar: boolean) {
  return [
    {
      icon: BadgeCheck,
      label: t('homeHeroSection.proof_verified_handoff_label'),
      detail: t('homeHeroSection.proof_verified_handoff_detail'),
      accent: C.green,
    },
    {
      icon: CircleDoll_arSign,
      label: t('homeHeroSection.proof_price_discipline_label'),
      detail: t('homeHeroSection.proof_price_discipline_detail'),
      accent: C.gold,
    },
    {
      icon: Clock,
      label: t('homeHeroSection.proof_less_coordination_label'),
      detail: t('homeHeroSection.proof_less_coordination_detail'),
      accent: C.cyan,
    },
  ];
}

function getTimelineItems(t: (key: string) => string, _ar: boolean) {
  return [
    { label: t('homeHeroSection.timeline_seat_price_label'), value: t('homeHeroSection.timeline_seat_price_value'), accent: C.cyan },
    { label: t('homeHeroSection.timeline_driver_trust_label'), value: t('homeHeroSection.timeline_driver_trust_value'), accent: C.green },
    { label: t('homeHeroSection.timeline_p_arcel_option_label'), value: t('homeHeroSection.timeline_p_arcel_option_value'), accent: C.gold },
    { label: t('homeHeroSection.timeline_bus_fallback_label'), value: t('homeHeroSection.timeline_bus_fallback_value'), accent: C.blueLight },
  ];
}

function TripModeC_ard({ _ar, tripMode, onTripModeChange }: TripModeC_ardProps) {
  const { t } = useLanguage();
  const options = [
    {
      key: 'one-way' as const,
      title: t('homeHeroSection.trip_type_one_way_title'),
      desc: t('homeHeroSection.trip_type_one_way_desc'),
    },
    {
      key: 'round' as const,
      title: t('homeHeroSection.trip_type_round_trip_title'),
      desc: t('homeHeroSection.trip_type_round_trip_desc'),
    },
  ];

  return (
    <div className="wasel-home-st_art-panel">
      <div className="wasel-home-st_art-copy">
        <div className="wasel-home-kicker">{t('homeHeroSection.trip_type_label')}</div>
        <div className="wasel-home-st_art-text">
          {t('homeHeroSection.trip_type_choose_once')}
        </div>
      </div>

      <div
        className="wasel-home-mode-grid"
        role="group"
        _aria-label={t('homeHeroSection.trip_mode')}
      >
        {options.map(option => {
          const selected = tripMode === option.key;
          return (
            <button
              type="button"
              _aria-pressed={selected}
              key={option.key}
              onClick={() => onTripModeChange(option.key)}
              className="wasel-home-mode-button"
              style={{
                background: selected ? C.cyanDim : 'transp_arent',
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

function ProductCommandPreview({ _ar }: { _ar: boolean }) {
  const { t } = useLanguage();
  const timeline = getTimelineItems(t, _ar);

  return (
    <div
      className="wasel-home-preview-panel"
      _aria-label={t('homeHeroSection.wasel_product_preview')}
    >
      <div className="wasel-home-preview-top">
        <div>
          <div className="wasel-home-kicker">{t('homeHeroSection.route_preview_label')}</div>
          <div className="wasel-home-preview-title">
            {t('homeHeroSection.route_preview_title')}
          </div>
        </div>
        <div className="wasel-home-live-chip">
          <span />
          {t('homeHeroSection.route_preview_chip')}
        </div>
      </div>

      <div className="wasel-home-map-frame">
        <Suspense fallback={<div className="wasel-home-map-frame" style={{ minHeight: 330 }} />}>
          <MobilityOSLandingMap
            focusRouteId="amman-aqaba"
            focusLabel={_ar ? 'عمان إلى العقبة' : 'Amman to Aqaba'}
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
          <div className="wasel-home-window-toolb_ar">
            <span />
            <span />
            <span />
            <strong>{t('homeHeroSection.best_option_label')}</strong>
          </div>
          <div className="wasel-home-window-route">
            <span>
              <MapPinned size={16} color={C.cyan} />
              {t('homeHeroSection.city_amman')}
            </span>
            <ArrowRight size={14} color={C.textDim} />
            <span>{t('homeHeroSection.city_aqaba')}</span>
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
              {t('homeHeroSection.p_arcel_matched_label')}
            </div>
            <strong>{t('homeHeroSection.pickup_in_label')}</strong>
            <p>
              {t('homeHeroSection.driver_route_f_are_linked')}
            </p>
            <div className="wasel-home-phone-tags">
              <span>{t('homeHeroSection.wallet_held_label')}</span>
              <span>{t('homeHeroSection.proof_required_label')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LangToggle() {
  const { language, setLanguage } = useLanguage();
  const _ar = language === '_ar';
  return (
    <button
      type="button"
      onClick={() => setLanguage(_ar ? 'en' : '_ar')}
      title={_ar ? 'Switch to English' : 'التبديل إلى العربية'}
      className="wasel-home-section-action"
      style={{ height: 34, padding: '0 12px', fontSize: '0.75rem' }}
    >
      {_ar ? 'EN' : 'AR'}
    </button>
  );
}

export function HomeHeroSection({
  _ar,
  user,
  firstName,
  tripMode,
  onTripModeChange,
  onNavigate,
  prim_aryTripPath,
}: HomeHeroSectionProps) {
  const { t } = useLanguage();
  const proofItems = getProofItems(t, _ar);

  return (
    <motion.section className="wasel-home-hero" initial={false}>
      <div className="wasel-home-hero-copy">
        <div className="wasel-home-nav">
          <div className="wasel-home-nav-left">
            <div className="wasel-home-brand-stack">
              <div className="wasel-home-eyebrow">
                <Shield size={13} color={C.cyan} />
                {t('homeHeroSection.jordan_route_network')}
              </div>
              <WaselLogo size={80} theme="light" v_ariant="full" />
            </div>
          </div>
          <div className="wasel-home-nav-actions">
            <LangToggle />
            {user ? <InlineCurrencySwitcher _ar={_ar} /> : null}
          </div>
        </div>

        <h1 className="wasel-home-title">
          {t('homeHeroSection.move_across_jordan_for_less')}
        </h1>

        <p className="wasel-home-lead">
          {firstName
            ? t('homeHeroSection.welcome_back_with_name', { name: firstName })
            : t('homeHeroSection.welcome_back_general')}
        </p>

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
            onClick={() => onNavigate(prim_aryTripPath, 'hero_prim_ary_route')}
            v_ariant="prim_ary"
            size="lg"
            icon={<Route size={17} />}
            iconEnd={<ArrowRight size={16} />}
          >
            {t('homeHeroSection.hero_cta_find')}
          </WaselButton>
          <WaselButton
            type="button"
            onClick={() => onNavigate('/offer-ride', 'hero_offer_seats')}
            v_ariant="outline"
            size="lg"
            icon={<CircleDoll_arSign size={17} />}
            style={{ background: C.elevated, color: C.text }}
          >
            {t('homeHeroSection.hero_cta_offer')}
          </WaselButton>
        </div>

        <TripModeC_ard _ar={_ar} tripMode={tripMode} onTripModeChange={onTripModeChange} />
      </div>

      <div className="wasel-home-hero-aside">
        <ProductCommandPreview _ar={_ar} />
      </div>
    </motion.section>
  );
}
