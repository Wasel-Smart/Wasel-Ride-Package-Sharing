/**
 * AIIntelligencePage — /app/ai-intelligence
 *
 * Demand prediction engine, route recommendation intelligence,
 * recurring behavior signals, and credit-adjusted movement pricing.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  ChevronRight,
  Cpu,
  FlaskConical,
  Layers,
  MapPin,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { getCorridorOpportunity } from '../../config/wasel-movement-network';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { buildMiddleEastCorridorProof } from '../../services/middleEastCorridorProof';
import { getGrowthDashboard, type GrowthDashboard } from '../../services/growthEngine';
import { getCorridorMovementQuote } from '../../services/corridorTruth';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
const BG = '#050d1a';
const CARD = 'linear-gradient(180deg, rgba(255,255,255,0.052), rgba(255,255,255,0.018))';
const CARD2 = 'rgba(255,255,255,0.026)';
const BORDER = 'rgba(71,183,230,0.16)';
const CYAN = '#47B7E6';
const GOLD = '#A8D614';
const GREEN = '#6BB515';
const PURPLE = '#a78bfa';
const BLUE = '#3B82F6';
const TEXT = '#EFF6FF';
const SUB = 'rgba(148,163,184,0.82)';
const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

function card(extra?: React.CSSProperties): React.CSSProperties {
  return { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: '20px 20px 18px', ...extra };
}

function getPricePressureColor(pricePressure: string) {
  if (pricePressure === 'surging') return '#f87171';
  if (pricePressure === 'value-window') return GREEN;
  return GOLD;
}

function formatPricePressureLabel(pricePressure: string) {
  if (pricePressure === 'surging') return 'Surging';
  if (pricePressure === 'value-window') return 'Value window';
  return 'Balanced';
}

function formatMembershipActiveDetail(args: {
  activeSince: string | null;
  movementCredits: number;
  locale: string;
}) {
  if (!args.activeSince) {
    return `${args.movementCredits} credits · Recently active`;
  }

  return `${args.movementCredits} credits · Active since ${new Date(args.activeSince).toLocaleDateString(args.locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

/* ─── AI capability cards ────────────────────────────────────────────────────── */

const AI_CAPABILITIES = [
  {
    id: 'demand_pred',
    title: 'Demand Prediction',
    icon: <TrendingUp size={18} />,
    color: CYAN,
    status: 'live',
    desc: 'Forecasts seat demand per corridor per hour using search history, booking velocity, and recurring movement patterns. Accuracy improves as route density compounds.',
    metrics: [
      { label: 'Prediction window', value: '72h ahead' },
      { label: 'Corridor coverage', value: '14 active lanes' },
      { label: 'Accuracy signal', value: 'Calibrating' },
    ],
  },
  {
    id: 'route_rec',
    title: 'Route Recommendations',
    icon: <MapPin size={18} />,
    color: GOLD,
    status: 'live',
    desc: 'Matches riders to the best available route based on departure window, seat fill likelihood, price tier, and historical match speed on the same corridor.',
    metrics: [
      { label: 'Match latency target', value: '< 4 minutes' },
      { label: 'Recommendation sources', value: '6 signals' },
      { label: 'Recurring lane boost', value: '2.4× priority' },
    ],
  },
  {
    id: 'recur_signal',
    title: 'Recurring Behavior Signals',
    icon: <Layers size={18} />,
    color: PURPLE,
    status: 'live',
    desc: 'Identifies Monday-Friday commuters, weekend corridor habits, and seasonal movement arcs. Routes with strong recurring behavior signals get demand-weighted pricing and priority matching.',
    metrics: [
      { label: 'Signal window', value: '28-day rolling' },
      { label: 'Recurrence threshold', value: '3+ same-corridor trips' },
      { label: 'Retention boost', value: 'Active' },
    ],
  },
  {
    id: 'pricing',
    title: 'Credit-Adjusted Pricing',
    icon: <Sparkles size={18} />,
    color: GREEN,
    status: 'live',
    desc: 'Adjusts the effective price per seat based on the rider\'s movement credit balance, loyalty tier, and the corridor\'s current demand pressure. Ensures both sides of the market stay attractive.',
    metrics: [
      { label: 'Credit discount ceiling', value: '15% per trip' },
      { label: 'Demand pressure tiers', value: 'Low / Normal / High' },
      { label: 'Price floor protection', value: 'Enabled' },
    ],
  },
  {
    id: 'anomaly',
    title: 'Anomaly Detection',
    icon: <AlertTriangle size={18} />,
    color: '#f87171',
    status: 'beta',
    desc: 'Flags unusual booking velocity spikes, demand voids on previously active corridors, and trust score deviations. Surfaces alerts to operations before they affect marketplace health.',
    metrics: [
      { label: 'Detection latency', value: '< 15 minutes' },
      { label: 'Alert types', value: '4 categories' },
      { label: 'False positive rate', value: 'Calibrating' },
    ],
  },
  {
    id: 'match_learn',
    title: 'Match Learning Loop',
    icon: <FlaskConical size={18} />,
    color: BLUE,
    status: 'beta',
    desc: 'Each accepted or rejected match is fed back into the route scoring model. Over time, the engine learns which corridor-time-price combinations consistently convert and prioritizes them.',
    metrics: [
      { label: 'Training feedback rate', value: 'Real-time' },
      { label: 'Model update frequency', value: 'Nightly' },
      { label: 'Improvement signal', value: '↑ per 50 matches' },
    ],
  },
];

/* ─── Insight card ───────────────────────────────────────────────────────────── */

function InsightCard({
  label, value, detail, color,
}: {
  label: string; value: string; detail: string; color: string;
}) {
  return (
    <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ color, fontWeight: 900, fontSize: '1.3rem', marginBottom: 4 }}>{value}</div>
      <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.8rem' }}>{label}</div>
      <div style={{ color: SUB, fontSize: '0.72rem', marginTop: 5, lineHeight: 1.55 }}>{detail}</div>
    </div>
  );
}

/* ─── Corridor Intelligence row ──────────────────────────────────────────────── */

function CorridorIntelRow({
  label, ownershipScore, priceJod, forecastDemand, pricePressure,
}: {
  label: string; ownershipScore: number; priceJod: number; forecastDemand: string; pricePressure: string;
}) {
  const pressureColor = getPricePressureColor(pricePressure);
  return (
    <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.84rem' }}>{label}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: CYAN, fontWeight: 900, fontSize: '0.84rem' }}>{priceJod} JOD</span>
          <span style={{ padding: '2px 7px', borderRadius: 6, background: `${pressureColor}15`, border: `1px solid ${pressureColor}30`, color: pressureColor, fontWeight: 700, fontSize: '0.66rem' }}>
            {formatPricePressureLabel(pricePressure)}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div>
          <div style={{ color: SUB, fontSize: '0.67rem', marginBottom: 3 }}>Ownership</div>
          <div style={{ height: 5, width: 80, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ownershipScore}%`, background: CYAN, borderRadius: 3 }} />
          </div>
          <div style={{ color: CYAN, fontSize: '0.68rem', fontWeight: 700, marginTop: 2 }}>{ownershipScore}/100</div>
        </div>
        <div>
          <div style={{ color: SUB, fontSize: '0.67rem', marginBottom: 3 }}>Forecast demand</div>
          <div style={{ color: GOLD, fontWeight: 700, fontSize: '0.73rem', marginTop: 5 }}>{forecastDemand}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function AIIntelligencePage() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const ar = language === 'ar';
  const locale = ar ? 'ar-JO' : 'en-US';
  const routeIntel = useLiveRouteIntelligence();
  const proof = useMemo(() => buildMiddleEastCorridorProof(6), []);
  const membership = useMemo(() => getMovementMembershipSnapshot(), []);
  const [dashboard, setDashboard] = useState<GrowthDashboard | null>(null);

  useEffect(() => {
    void getGrowthDashboard(user?.id).then(setDashboard).catch(() => {});
  }, [user?.id]);

  // Build corridor intelligence data from live signals
  const corridorIntelligence = useMemo(() => {
    return routeIntel.featuredSignals.slice(0, 6).map((signal) => ({
      label: signal.label,
      ownershipScore: signal.routeOwnershipScore,
      priceJod: signal.priceQuote.finalPriceJod,
      forecastDemand: signal.forecastDemandScore > 70
        ? 'High — strong match probability'
        : signal.forecastDemandScore > 40
          ? 'Moderate — regular corridor'
          : 'Building — corridor growing',
      pricePressure: signal.pricePressure,
    }));
  }, [routeIntel.featuredSignals]);

  const priceQuote = useMemo(() => {
    const corridorPlan = getCorridorOpportunity('Amman', 'Aqaba');
    if (!corridorPlan) return null;

    return getCorridorMovementQuote({
      from: corridorPlan.from,
      to: corridorPlan.to,
      basePriceJod: corridorPlan.sharedPriceJod,
      membership,
    }).priceQuote;
  }, [membership]);

  const membershipActiveDetail = useMemo(
    () =>
      formatMembershipActiveDetail({
        activeSince:
          membership.commuterPassStartedAt
          ?? membership.plusStartedAt
          ?? membership.lastActivityDate,
        movementCredits: membership.movementCredits,
        locale,
      }),
    [locale, membership.commuterPassStartedAt, membership.lastActivityDate, membership.movementCredits, membership.plusStartedAt],
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, color: TEXT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 88 }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 16px 0' }}>

        {/* Header */}
        <div style={{ ...card({ background: 'linear-gradient(135deg, rgba(167,139,250,0.14), rgba(71,183,230,0.08))', border: `1px solid ${PURPLE}33`, padding: '26px 24px' }), marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: `${PURPLE}18`, border: `1.5px solid ${PURPLE}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={28} color={PURPLE} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, border: `1px solid ${PURPLE}30`, color: PURPLE, fontWeight: 800, fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
                <Cpu size={11} /> Wasel AI Engine · Live
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.9rem)', fontWeight: 900 }}>AI Intelligence</h1>
              <p style={{ margin: '6px 0 0', color: SUB, fontSize: '0.82rem', lineHeight: 1.55 }}>
                Demand prediction · Route recommendations · Recurring signals · Credit-adjusted pricing
              </p>
            </div>
          </div>
        </div>

        {/* Live intelligence summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 20 }}>
          <InsightCard label="Active corridors modeled" value={String(corridorIntelligence.length || proof.liveOwnedCorridors)} detail="Lanes with enough signal volume for demand prediction" color={CYAN} />
          <InsightCard label="Demand forecast accuracy" value="Calibrating" detail="Improves as recurring movement compounds across corridors" color={PURPLE} />
          <InsightCard label="Avg price saving" value={`${proof.averageSavingsPercent}%`} detail="Credit-adjusted price vs. solo movement benchmark" color={GREEN} />
          <InsightCard label="Loyalty tier" value={membership.loyaltyTier} detail={membershipActiveDetail} color={GOLD} />
          <InsightCard label="Search-to-match latency" value="< 4 min" detail="Target match time on owned corridors during normal demand" color={BLUE} />
          <InsightCard label="Bookings modeled" value={String(dashboard?.funnel.booked ?? 0)} detail="Conversion events feeding the match learning loop" color={CYAN} />
        </div>

        {/* Pricing intelligence spotlight */}
        {priceQuote && (
          <div style={{ ...card({ background: 'linear-gradient(135deg, rgba(168,214,20,0.09), rgba(71,183,230,0.05))', border: `1px solid ${GOLD}28` }), marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Sparkles size={16} color={GOLD} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Credit-Adjusted Pricing · Amman → Aqaba (sample)</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              {[
                { label: 'Base price', value: `${priceQuote.basePriceJod.toFixed(2)} JOD`, color: SUB, detail: 'Before credit adjustment and demand tier' },
                { label: 'Final price', value: `${priceQuote.finalPriceJod.toFixed(2)} JOD`, color: GOLD, detail: 'After movement credit discount' },
                { label: 'Demand pressure', value: formatPricePressureLabel(priceQuote.pricePressure), color: getPricePressureColor(priceQuote.pricePressure), detail: 'Current corridor demand tier' },
                { label: 'Forecast score', value: `${priceQuote.forecastDemandScore}/100`, color: PURPLE, detail: 'AI demand confidence for this corridor' },
              ].map((item) => (
                <div key={item.label} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '13px 15px' }}>
                  <div style={{ color: item.color, fontWeight: 900, fontSize: '1.1rem' }}>{item.value}</div>
                  <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.74rem', marginTop: 4 }}>{item.label}</div>
                  <div style={{ color: SUB, fontSize: '0.69rem', marginTop: 4, lineHeight: 1.5 }}>{item.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Corridor intelligence grid */}
        {corridorIntelligence.length > 0 && (
          <div style={{ ...card(), marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Zap size={16} color={CYAN} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Live Corridor Intelligence</div>
              <span style={{ marginLeft: 'auto', color: SUB, fontSize: '0.71rem' }}>Real-time signal feed</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {corridorIntelligence.map((c) => (
                <CorridorIntelRow key={c.label} {...c} />
              ))}
            </div>
          </div>
        )}

        {/* Capability cards */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ color: SUB, fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.11em', marginBottom: 14 }}>
            AI Capability Modules
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {AI_CAPABILITIES.map((cap) => (
              <div key={cap.id} style={card({ padding: '20px' })}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: `${cap.color}18`, border: `1px solid ${cap.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: cap.color, flexShrink: 0 }}>
                    {cap.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ color: TEXT, fontWeight: 900, fontSize: '0.9rem' }}>{cap.title}</div>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: cap.status === 'live' ? `${GREEN}15` : `${GOLD}15`, border: `1px solid ${cap.status === 'live' ? GREEN : GOLD}30`, color: cap.status === 'live' ? GREEN : GOLD, fontWeight: 800, fontSize: '0.62rem', letterSpacing: '0.08em' }}>
                        {cap.status === 'live' ? 'LIVE' : 'BETA'}
                      </span>
                    </div>
                    <div style={{ color: SUB, fontSize: '0.75rem', lineHeight: 1.6 }}>{cap.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {cap.metrics.map((m) => (
                    <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ color: SUB, fontSize: '0.73rem' }}>{m.label}</span>
                      <span style={{ color: cap.color, fontWeight: 800, fontSize: '0.73rem' }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div style={card({ marginBottom: 20 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Brain size={16} color={PURPLE} />
            <div style={{ color: TEXT, fontWeight: 900 }}>Intelligence Roadmap</div>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { phase: 'Now', label: 'Demand prediction + route matching live on owned corridors', color: GREEN },
              { phase: 'Q2 2026', label: 'Cross-corridor demand bridging — connecting adjacent route demand signals', color: CYAN },
              { phase: 'Q3 2026', label: 'Predictive departure scheduling — AI-suggested departure windows by corridor demand', color: GOLD },
              { phase: 'Q4 2026', label: 'Full dynamic pricing — real-time seat price adjustments driven by demand, credit balance, and fill rate', color: PURPLE },
            ].map((item) => (
              <div key={item.phase} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '13px 16px' }}>
                <span style={{ padding: '3px 9px', borderRadius: 7, background: `${item.color}15`, border: `1px solid ${item.color}30`, color: item.color, fontWeight: 800, fontSize: '0.68rem', flexShrink: 0 }}>{item.phase}</span>
                <span style={{ color: TEXT, fontSize: '0.8rem', lineHeight: 1.55 }}>{item.label}</span>
                <ChevronRight size={14} color={SUB} style={{ flexShrink: 0, marginTop: 2 }} />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
