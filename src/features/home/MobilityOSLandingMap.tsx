import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Gauge, Route, Sparkles } from 'lucide-react';
import { WaselMap, type WaselMapMarker, type WaselMapRoute } from '../../components/WaselMap';
import { JORDAN_MOBILITY_NETWORK } from '../../config/jordan-mobility-network';
import {
  buildDriverRoutePlan,
  getFeaturedCorridors,
  type CorridorOpportunity,
} from '../../config/wasel-movement-network';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { trackGrowthEvent } from '../../services/growthEngine';

type PeriodId = 'morning' | 'midday' | 'evening';
type PressureId = 'Calm' | 'Steady' | 'Busy';

type CorridorViewModel = {
  id: string;
  from: string;
  fromAr: string;
  to: string;
  toAr: string;
  distanceKm: number;
  score: number;
  speedKph: number;
  pressure: PressureId;
  center: { lat: number; lng: number };
  route: readonly WaselMapRoute[];
  markers: readonly WaselMapMarker[];
  demandScore: number;
  savingsPercent: number;
  attachRatePercent: number;
  fillTargetSeats: number;
  recommendedSeatPriceJod: number;
  packageBonusJod: number;
  intelligenceSignal: string;
  pickupSummary: string;
};

const UI = {
  text: '#EAF7FF',
  muted: 'rgba(234,247,255,0.72)',
  soft: 'rgba(153,184,210,0.58)',
  border: 'rgba(73,190,242,0.14)',
  borderStrong: 'rgba(73,190,242,0.24)',
  cyan: '#16C7F2',
  gold: '#C7FF1A',
  green: '#60C536',
  blue: '#0A74C9',
  panel: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
} as const;

const PERIODS = [
  {
    id: 'morning' as const,
    label: 'Morning',
    labelAr: 'الصباح',
    time: '07:30',
    note: 'Commuter pressure is strongest and group departures tighten fastest.',
    noteAr: 'ضغط التنقل اليومي يبلغ ذروته وتتشكل الرحلات المشتركة بشكل أسرع.',
    demandDelta: 6,
    speedDelta: -6,
  },
  {
    id: 'midday' as const,
    label: 'Midday',
    labelAr: 'الظهيرة',
    time: '13:00',
    note: 'Rider and parcel movement balance out with smoother timing.',
    noteAr: 'حركة الركاب والطرود تصبح أكثر توازنا مع توقيت أكثر هدوءا.',
    demandDelta: -4,
    speedDelta: 5,
  },
  {
    id: 'evening' as const,
    label: 'Evening',
    labelAr: 'المساء',
    time: '18:15',
    note: 'Return movement intensifies and the strongest corridors glow again.',
    noteAr: 'حركة العودة تشتد وتعود الممرات الأقوى إلى الواجهة من جديد.',
    demandDelta: 3,
    speedDelta: -3,
  },
] as const;

const TRANSLATIONS = {
  bestCorridor: { en: 'Best corridor', ar: 'أفضل ممر' },
  pressure: { en: 'Pressure', ar: 'الضغط' },
  savings: { en: 'Savings', ar: 'التوفير' },
  speed: { en: 'Speed', ar: 'السرعة' },
  distance: { en: 'Distance', ar: 'المسافة' },
  routeScore: { en: 'Route score', ar: 'درجة المسار' },
  seatsToFill: { en: 'Seats to fill', ar: 'المقاعد المستهدفة' },
  selectedRoute: { en: 'Selected route', ar: 'المسار المختار' },
  selectedCorridor: { en: 'Selected corridor', ar: 'الممر المختار' },
  liveScore: { en: 'Live score', ar: 'الدرجة الحية' },
  demandRead: { en: 'Demand read', ar: 'قراءة الطلب' },
  packageLift: { en: 'Package lift', ar: 'دعم الطرود' },
  pickupSignal: { en: 'Pickup signal', ar: 'إشارة الالتقاط' },
  mapTitle: { en: 'Mobility OS live map', ar: 'خريطة Mobility OS الحية' },
  mapBody: {
    en: 'Featured corridors now reflect Wasel route intelligence, price planning, and demand signals from the network model.',
    ar: 'الممرات المعروضة الآن تستند إلى ذكاء المسارات والتسعير وإشارات الطلب من نموذج شبكة Wasel.',
  },
  mapOverlay: {
    en: 'The live map mirrors the same corridor intelligence used to open search and pricing flows.',
    ar: 'الخريطة الحية تعرض نفس ذكاء الممرات المستخدم لفتح البحث والتسعير داخل التطبيق.',
  },
  exploreCorridor: { en: 'Explore corridor', ar: 'استكشف الممر' },
  openFullMap: { en: 'Open full map', ar: 'افتح الخريطة الكاملة' },
  networkReady: { en: 'Network ready', ar: 'جاهز للشبكة' },
  routeEconomics: { en: 'Route economics', ar: 'اقتصاديات المسار' },
  corridorRanking: { en: 'Corridor ranking', ar: 'ترتيب الممرات' },
  to: { en: 'to', ar: 'إلى' },
  kmh: { en: 'km/h', ar: 'كم/س' },
  km: { en: 'km', ar: 'كم' },
  jod: { en: 'JOD', ar: 'د.أ' },
  savingsValue: { en: 'saved vs solo', ar: 'توفير مقابل رحلة فردية' },
  mapLoading: {
    en: 'Preparing the live corridor surface...',
    ar: 'يتم تجهيز سطح الممرات الحية...',
  },
} as const;

function t(ar: boolean, copy: { en: string; ar: string }) {
  return ar ? copy.ar : copy.en;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPressure(demandScore: number): PressureId {
  if (demandScore >= 92) return 'Busy';
  if (demandScore >= 78) return 'Steady';
  return 'Calm';
}

function getPressureLabel(ar: boolean, pressure: PressureId) {
  if (ar) {
    if (pressure === 'Busy') return 'مرتفع';
    if (pressure === 'Steady') return 'متوازن';
    return 'هادئ';
  }
  return pressure;
}

function buildRouteGeometry(opportunity: CorridorOpportunity) {
  const routeMeta = JORDAN_MOBILITY_NETWORK.find((route) => route.id === opportunity.id);
  const origin = routeMeta?.coordinates.origin ?? { lat: 31.9454, lng: 35.9284 };
  const destination = routeMeta?.coordinates.destination ?? { lat: 32.0728, lng: 36.0882 };
  const latDelta = destination.lat - origin.lat;
  const lngDelta = destination.lng - origin.lng;
  const curveBias = opportunity.distanceKm > 160 ? 0.18 : opportunity.distanceKm > 80 ? 0.12 : 0.08;

  return {
    origin,
    destination,
    fromAr: routeMeta?.originAr ?? opportunity.from,
    toAr: routeMeta?.destinationAr ?? opportunity.to,
    mid: {
      lat: origin.lat + latDelta * 0.5 + Math.abs(lngDelta) * curveBias,
      lng: origin.lng + lngDelta * 0.5 - Math.abs(latDelta) * curveBias * 0.6,
    },
  };
}

function buildCorridorViewModels(periodId: PeriodId) {
  const period = PERIODS.find((item) => item.id === periodId) ?? PERIODS[0];

  return getFeaturedCorridors(5).map((opportunity) => {
    const routePlan = buildDriverRoutePlan(opportunity.from, opportunity.to, opportunity.fillTargetSeats);
    const geometry = buildRouteGeometry(opportunity);
    const baseSpeed = Math.round((opportunity.distanceKm / Math.max(opportunity.durationMin, 1)) * 60);
    const demandScore = clamp(opportunity.predictedDemandScore + period.demandDelta, 56, 99);
    const score = clamp(
      Math.round(
        demandScore * 0.52
        + opportunity.attachRatePercent * 0.22
        + opportunity.savingsPercent * 0.14
        + Math.min(opportunity.fillTargetSeats * 4, 16),
      ),
      58,
      99,
    );
    const speedKph = clamp(baseSpeed + period.speedDelta, 42, 102);
    const pressure = getPressure(demandScore);

    const route: WaselMapRoute[] = [
      {
        lat: geometry.origin.lat,
        lng: geometry.origin.lng,
        label: opportunity.from,
      },
      {
        lat: geometry.mid.lat,
        lng: geometry.mid.lng,
        label: opportunity.pickupPoints[1] ?? opportunity.label,
      },
      {
        lat: geometry.destination.lat,
        lng: geometry.destination.lng,
        label: opportunity.to,
      },
    ];

    const markers: WaselMapMarker[] = [
      { lat: route[0].lat, lng: route[0].lng, label: opportunity.from, type: 'pickup' },
      { lat: route[route.length - 1].lat, lng: route[route.length - 1].lng, label: opportunity.to, type: 'dropoff' },
    ];

    return {
      id: opportunity.id,
      from: opportunity.from,
      fromAr: geometry.fromAr,
      to: opportunity.to,
      toAr: geometry.toAr,
      distanceKm: opportunity.distanceKm,
      score,
      speedKph,
      pressure,
      center: {
        lat: (route[0].lat + route[route.length - 1].lat) / 2,
        lng: (route[0].lng + route[route.length - 1].lng) / 2,
      },
      route,
      markers,
      demandScore,
      savingsPercent: opportunity.savingsPercent,
      attachRatePercent: opportunity.attachRatePercent,
      fillTargetSeats: opportunity.fillTargetSeats,
      recommendedSeatPriceJod: routePlan?.recommendedSeatPriceJod ?? opportunity.sharedPriceJod,
      packageBonusJod: routePlan?.packageBonusJod ?? opportunity.driverBoostJod,
      intelligenceSignal: opportunity.intelligenceSignals[0] ?? opportunity.routeMoat,
      pickupSummary: opportunity.pickupPoints.slice(0, 2).join(' • '),
    } satisfies CorridorViewModel;
  }).sort((left, right) => right.score - left.score);
}

export function MobilityOSLandingMap({ ar = false }: { ar?: boolean }) {
  const navigate = useIframeSafeNavigate();
  const hostRef = useRef<HTMLElement | null>(null);
  const [periodId, setPeriodId] = useState<PeriodId>('morning');
  const [selectedId, setSelectedId] = useState<string>('');
  const [mapVisible, setMapVisible] = useState(false);

  useEffect(() => {
    const target = hostRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') {
      setMapVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMapVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const corridors = useMemo(() => buildCorridorViewModels(periodId), [periodId]);

  useEffect(() => {
    if (!corridors.some((corridor) => corridor.id === selectedId)) {
      setSelectedId(corridors[0]?.id ?? '');
    }
  }, [corridors, selectedId]);

  const selected = corridors.find((corridor) => corridor.id === selectedId) ?? corridors[0];
  const period = PERIODS.find((item) => item.id === periodId) ?? PERIODS[0];

  if (!selected) return null;

  const routeLabel = `${ar ? selected.fromAr : selected.from} ${t(ar, TRANSLATIONS.to)} ${ar ? selected.toAr : selected.to}`;
  const topStats = [
    { label: t(ar, TRANSLATIONS.bestCorridor), value: routeLabel, accent: UI.green },
    { label: t(ar, TRANSLATIONS.pressure), value: getPressureLabel(ar, selected.pressure), accent: UI.cyan },
    { label: t(ar, TRANSLATIONS.savings), value: `${selected.savingsPercent}%`, accent: UI.gold },
  ] as const;

  const handlePeriodChange = (nextPeriodId: PeriodId) => {
    setPeriodId(nextPeriodId);
    void trackGrowthEvent({
      eventName: 'landing_corridor_period_selected',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: selected.from,
      to: selected.to,
      metadata: { periodId: nextPeriodId, corridorId: selected.id, source: 'landing_map' },
    });
  };

  const handleSelectCorridor = (corridor: CorridorViewModel) => {
    setSelectedId(corridor.id);
    void trackGrowthEvent({
      eventName: 'landing_corridor_selected',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: corridor.from,
      to: corridor.to,
      metadata: { corridorId: corridor.id, demandScore: corridor.demandScore, source: 'landing_map' },
    });
  };

  const handleExploreCorridor = () => {
    void trackGrowthEvent({
      eventName: 'landing_corridor_explored',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: selected.from,
      to: selected.to,
      valueJod: selected.recommendedSeatPriceJod,
      metadata: {
        corridorId: selected.id,
        demandScore: selected.demandScore,
        pricePressure: selected.pressure,
        source: 'landing_map',
      },
    });
    navigate(`/app/find-ride?from=${encodeURIComponent(selected.from)}&to=${encodeURIComponent(selected.to)}&search=1`);
  };

  const handleOpenFullMap = () => {
    void trackGrowthEvent({
      eventName: 'landing_mobility_os_opened',
      funnelStage: 'selected',
      serviceType: 'ride',
      from: selected.from,
      to: selected.to,
      metadata: { corridorId: selected.id, source: 'landing_map' },
    });
    navigate('/app/mobility-os');
  };

  return (
    <section
      ref={hostRef}
      aria-label={t(ar, TRANSLATIONS.mapTitle)}
      style={{
        display: 'grid',
        gap: 16,
        fontFamily: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
      }}
    >
      <style>{`
        .landing-map-layout { display:grid; grid-template-columns:minmax(0, 1.18fr) minmax(290px, 0.82fr); gap:16px; }
        .landing-map-periods { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:10px; }
        .landing-map-stats { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
        .landing-map-ranking { display:grid; gap:10px; }
        .landing-map-frame { min-height: clamp(320px, 44vw, 520px); }
        .landing-map-refresh { animation: landing-map-pulse 1.9s ease-in-out infinite; }
        @keyframes landing-map-pulse {
          0%, 100% { opacity: 0.65; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @media (max-width: 1180px) { .landing-map-layout { grid-template-columns:1fr; } }
        @media (max-width: 760px) {
          .landing-map-periods, .landing-map-stats { grid-template-columns:1fr; }
          .landing-map-frame { min-height: 340px; }
        }
        @media (max-width: 560px) {
          .landing-map-frame { min-height: 300px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-map-refresh { animation: none !important; }
        }
      `}</style>

      <div className="landing-map-stats">
        {topStats.map((item) => (
          <div
            key={item.label}
            style={{
              borderRadius: 20,
              padding: '14px 16px',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.02))',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
              display: 'grid',
              gap: 6,
            }}
          >
            <span
              style={{
                color: UI.soft,
                fontSize: '0.72rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontWeight: 800,
              }}
            >
              {item.label}
            </span>
            <span style={{ color: item.accent, fontSize: '1rem', fontWeight: 900, lineHeight: 1.35 }}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="landing-map-layout">
        <div
          style={{
            borderRadius: 28,
            padding: 18,
            background: 'radial-gradient(circle at 16% 12%, rgba(22,199,242,0.12), rgba(4,18,30,0) 22%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02)), rgba(9,27,43,0.92)',
            boxShadow: '0 28px 72px rgba(0,0,0,0.24)',
            display: 'grid',
            gap: 14,
          }}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                color: UI.cyan,
                fontSize: '0.74rem',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 900,
              }}
            >
              {t(ar, TRANSLATIONS.mapTitle)}
            </div>
            <div
              style={{
                color: UI.text,
                fontSize: 'clamp(1.45rem, 2.8vw, 2.15rem)',
                lineHeight: 1.04,
                letterSpacing: '-0.04em',
                fontWeight: 900,
              }}
            >
              {t(ar, TRANSLATIONS.mapBody)}
            </div>
            <p style={{ margin: 0, color: UI.muted, fontSize: '0.92rem', lineHeight: 1.65 }}>
              {ar ? period.noteAr : period.note}
            </p>
          </div>

          <div className="landing-map-periods" role="tablist" aria-label={t(ar, TRANSLATIONS.demandRead)}>
            {PERIODS.map((item) => {
              const active = item.id === periodId;

              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-pressed={active}
                  aria-label={`${ar ? item.labelAr : item.label} ${item.time}`}
                  onClick={() => handlePeriodChange(item.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 18,
                    border: 'none',
                    background: active
                      ? 'linear-gradient(135deg, rgba(85,233,255,0.14), rgba(30,161,255,0.1))'
                      : 'rgba(255,255,255,0.03)',
                    color: active ? UI.text : UI.muted,
                    textAlign: ar ? 'right' : 'left',
                    cursor: 'pointer',
                    boxShadow: active ? '0 14px 32px rgba(22,199,242,0.16)' : 'inset 0 1px 0 rgba(255,255,255,0.02)',
                  }}
                >
                  <div style={{ fontSize: '0.86rem', fontWeight: 800 }}>{ar ? item.labelAr : item.label}</div>
                  <div style={{ marginTop: 4, color: active ? UI.cyan : UI.soft, fontSize: '0.74rem' }}>
                    {item.time}
                  </div>
                </button>
              );
            })}
          </div>

          <div
            className="landing-map-frame"
            style={{
              position: 'relative',
              borderRadius: 24,
              overflow: 'hidden',
              background: '#06111E',
              boxShadow: '0 20px 48px rgba(0,0,0,0.24)',
            }}
          >
            {mapVisible ? (
              <WaselMap
                compact
                center={selected.center}
                route={[...selected.route]}
                markers={[...selected.markers]}
                height="100%"
                className="landing-map-frame"
              />
            ) : (
              <div
                style={{
                  height: '100%',
                  minHeight: 'inherit',
                  display: 'grid',
                  placeItems: 'center',
                  background: 'radial-gradient(circle at 30% 30%, rgba(22,199,242,0.16), rgba(6,17,30,0) 32%), linear-gradient(180deg, rgba(8,21,36,0.96), rgba(5,13,24,0.98))',
                  color: UI.muted,
                  fontSize: '0.92rem',
                  letterSpacing: '0.02em',
                }}
              >
                {t(ar, TRANSLATIONS.mapLoading)}
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                top: 16,
                left: 16,
                maxWidth: 320,
                padding: '14px 16px',
                borderRadius: 20,
                background: 'rgba(6,22,38,0.86)',
                backdropFilter: 'blur(14px)',
                pointerEvents: 'none',
                boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
              }}
            >
              <div
                style={{
                  color: UI.cyan,
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 900,
                }}
              >
                {t(ar, TRANSLATIONS.selectedRoute)}
              </div>
              <div style={{ marginTop: 8, color: UI.text, fontSize: '1rem', fontWeight: 900 }}>
                {routeLabel}
              </div>
              <div style={{ marginTop: 6, color: UI.muted, fontSize: '0.82rem', lineHeight: 1.55 }}>
                {t(ar, TRANSLATIONS.mapOverlay)}
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 16,
                bottom: 16,
                width: 'min(300px, calc(100% - 32px))',
                padding: '12px 14px',
                borderRadius: 18,
                background: 'rgba(6,22,38,0.84)',
                backdropFilter: 'blur(14px)',
                pointerEvents: 'none',
                boxShadow: '0 16px 36px rgba(0,0,0,0.18)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span
                  style={{
                    color: UI.soft,
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontWeight: 800,
                  }}
                >
                  {t(ar, TRANSLATIONS.liveScore)}
                </span>
                <span style={{ color: UI.green, fontSize: '0.9rem', fontWeight: 900 }}>
                  {selected.score}/100
                </span>
              </div>
              <div
                style={{
                  marginTop: 10,
                  height: 7,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.08)',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="landing-map-refresh"
                  style={{
                    width: `${selected.score}%`,
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${UI.green}, rgba(255,255,255,0.92))`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <aside style={{ display: 'grid', gap: 14 }}>
          <div
            style={{
              borderRadius: 28,
              padding: '18px',
              background: UI.panel,
              border: `1px solid ${UI.borderStrong}`,
              boxShadow: '0 28px 72px rgba(0,0,0,0.24)',
              display: 'grid',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  color: UI.cyan,
                  fontSize: '0.74rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 900,
                }}
              >
                {t(ar, TRANSLATIONS.selectedCorridor)}
              </div>
              <div
                style={{
                  marginTop: 8,
                  color: UI.text,
                  fontSize: '1.35rem',
                  lineHeight: 1.08,
                  letterSpacing: '-0.04em',
                  fontWeight: 900,
                }}
              >
                {routeLabel}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {[
                { label: t(ar, TRANSLATIONS.routeScore), value: `${selected.score}/100`, accent: UI.green, icon: Sparkles },
                { label: t(ar, TRANSLATIONS.speed), value: `${selected.speedKph} ${t(ar, TRANSLATIONS.kmh)}`, accent: UI.cyan, icon: Gauge },
                { label: t(ar, TRANSLATIONS.pressure), value: getPressureLabel(ar, selected.pressure), accent: UI.gold, icon: Route },
                { label: t(ar, TRANSLATIONS.distance), value: `${selected.distanceKm} ${t(ar, TRANSLATIONS.km)}`, accent: UI.blue, icon: Route },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    style={{
                      borderRadius: 18,
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${UI.border}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={14} color={item.accent} />
                      <span style={{ color: UI.soft, fontSize: '0.72rem', fontWeight: 700 }}>
                        {item.label}
                      </span>
                    </div>
                    <div style={{ marginTop: 8, color: item.accent, fontSize: '0.96rem', fontWeight: 900 }}>
                      {item.value}
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                borderRadius: 20,
                padding: '14px 16px',
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${UI.border}`,
                display: 'grid',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <span style={{ color: UI.soft, fontSize: '0.74rem', fontWeight: 800 }}>{t(ar, TRANSLATIONS.routeEconomics)}</span>
                <span style={{ color: UI.green, fontWeight: 900 }}>
                  {selected.recommendedSeatPriceJod.toFixed(2)} {t(ar, TRANSLATIONS.jod)}
                </span>
              </div>
              <div style={{ color: UI.muted, fontSize: '0.82rem', lineHeight: 1.6 }}>
                {selected.intelligenceSignal}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                <div>
                  <div style={{ color: UI.soft, fontSize: '0.7rem' }}>{t(ar, TRANSLATIONS.savingsValue)}</div>
                  <div style={{ color: UI.gold, fontWeight: 900 }}>{selected.savingsPercent}%</div>
                </div>
                <div>
                  <div style={{ color: UI.soft, fontSize: '0.7rem' }}>{t(ar, TRANSLATIONS.seatsToFill)}</div>
                  <div style={{ color: UI.cyan, fontWeight: 900 }}>{selected.fillTargetSeats}</div>
                </div>
                <div>
                  <div style={{ color: UI.soft, fontSize: '0.7rem' }}>{t(ar, TRANSLATIONS.packageLift)}</div>
                  <div style={{ color: UI.green, fontWeight: 900 }}>
                    +{selected.packageBonusJod.toFixed(1)} {t(ar, TRANSLATIONS.jod)}
                  </div>
                </div>
              </div>
              <div style={{ color: UI.soft, fontSize: '0.76rem' }}>
                {t(ar, TRANSLATIONS.pickupSignal)}: {selected.pickupSummary}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
              <button
                type="button"
                aria-label={`${t(ar, TRANSLATIONS.exploreCorridor)} ${routeLabel}`}
                onClick={handleExploreCorridor}
                style={{
                  minHeight: 48,
                  borderRadius: 16,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(135deg, #18D4F7 0%, #1697EF 48%, #C7FF1A 100%)',
                  color: '#041521',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 20px 44px rgba(22,151,239,0.28)',
                }}
              >
                {t(ar, TRANSLATIONS.exploreCorridor)}
                <ArrowRight size={15} />
              </button>
              <button
                type="button"
                aria-label={t(ar, TRANSLATIONS.openFullMap)}
                onClick={handleOpenFullMap}
                style={{
                  minHeight: 48,
                  borderRadius: 16,
                  border: `1px solid ${UI.borderStrong}`,
                  background: 'rgba(255,255,255,0.03)',
                  color: UI.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t(ar, TRANSLATIONS.openFullMap)}
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: 24,
              padding: 16,
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${UI.border}`,
              display: 'grid',
              gap: 10,
            }}
          >
            <div style={{ color: UI.cyan, fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 900 }}>
              {t(ar, TRANSLATIONS.corridorRanking)}
            </div>
            <div className="landing-map-ranking">
              {corridors.map((corridor, index) => {
                const active = corridor.id === selected.id;
                const label = `${ar ? corridor.fromAr : corridor.from} ${t(ar, TRANSLATIONS.to)} ${ar ? corridor.toAr : corridor.to}`;
                return (
                  <button
                    key={corridor.id}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${label} ${corridor.score}/100`}
                    onClick={() => handleSelectCorridor(corridor)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 18,
                      border: `1px solid ${active ? UI.borderStrong : UI.border}`,
                      background: active
                        ? 'linear-gradient(135deg, rgba(85,233,255,0.12), rgba(30,161,255,0.08))'
                        : 'rgba(255,255,255,0.03)',
                      color: UI.text,
                      cursor: 'pointer',
                      display: 'grid',
                      gap: 6,
                      textAlign: ar ? 'right' : 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <span style={{ color: active ? UI.cyan : UI.soft, fontSize: '0.76rem', fontWeight: 900 }}>
                        #{index + 1}
                      </span>
                      <span style={{ color: UI.green, fontSize: '0.8rem', fontWeight: 900 }}>
                        {corridor.score}/100
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900 }}>{label}</div>
                    <div style={{ color: UI.muted, fontSize: '0.76rem', lineHeight: 1.5 }}>
                      {getPressureLabel(ar, corridor.pressure)} | {corridor.speedKph} {t(ar, TRANSLATIONS.kmh)} | {corridor.attachRatePercent}% {t(ar, TRANSLATIONS.networkReady)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
