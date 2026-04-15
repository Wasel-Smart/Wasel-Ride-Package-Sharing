/**
 * AnalyticsPage — /app/analytics
 *
 * Production operations analytics dashboard for Wasel.
 * Shows funnel performance, service mix, corridor intelligence,
 * revenue breakdown, and live growth event feed.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart2,
  Clock,
  LineChart,
  Package,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getGrowthDashboard, getGrowthEventFeed, type GrowthDashboard, type GrowthEventRecord } from '../../services/growthEngine';
import { buildMiddleEastCorridorProof } from '../../services/middleEastCorridorProof';
import { buildCorridorCommercialSnapshot, type CorridorCommercialSnapshot } from '../../services/corridorCommercial';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
const BG = 'var(--wasel-service-bg)';
const CARD = 'var(--wasel-service-card)';
const CARD2 = 'var(--wasel-service-card-2)';
const BORDER = 'var(--wasel-service-border)';
const TRACK = 'var(--surface-muted-strong)';
const CYAN = 'var(--wasel-app-blue)';
const GOLD = 'var(--wasel-app-sky)';
const GREEN = 'var(--wasel-app-teal)';
const BLUE = 'var(--wasel-app-blue-strong)';
const RED = '#F97316';
const TEXT = 'var(--wasel-service-text)';
const SUB = 'var(--wasel-service-sub)';
const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

function card(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 24,
    padding: '20px 20px 18px',
    boxShadow: 'var(--wasel-shadow-card)',
    backdropFilter: 'blur(18px)',
    ...extra,
  };
}

/* ─── Subcomponents ──────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, sub, color, icon, delta,
}: {
  label: string; value: string; sub: string; color: string; icon: React.ReactNode; delta?: number;
}) {
  return (
    <div style={card()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ color, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
          {icon}{label}
        </div>
        {delta !== undefined && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: delta >= 0 ? GREEN : RED, fontWeight: 800, fontSize: '0.72rem' }}>
            {delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ color, fontWeight: 900, fontSize: '1.8rem', lineHeight: 1 }}>{value}</div>
      <div style={{ color: SUB, fontSize: '0.74rem', marginTop: 8, lineHeight: 1.55 }}>{sub}</div>
    </div>
  );
}

function FunnelBar({
  label, value, total, color,
}: {
  label: string; value: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.78rem' }}>
        <span style={{ color: TEXT, fontWeight: 700 }}>{label}</span>
        <span style={{ color, fontWeight: 800 }}>{value} <span style={{ color: SUB, fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 7, background: TRACK, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function EventBadge({ serviceType }: { serviceType: GrowthEventRecord['serviceType'] }) {
  const map: Record<string, { label: string; color: string }> = {
    ride: { label: 'Ride', color: CYAN },
    bus: { label: 'Bus', color: BLUE },
    package: { label: 'Package', color: GOLD },
    referral: { label: 'Referral', color: GREEN },
    wallet: { label: 'Wallet', color: '#a78bfa' },
  };
  const { label, color } = map[serviceType] ?? { label: serviceType, color: SUB };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, border: `1px solid ${color}33`, background: `${color}12`, color, fontWeight: 800, fontSize: '0.66rem', letterSpacing: '0.06em' }}>
      {label}
    </span>
  );
}

function FunnelStageBadge({ stage }: { stage: string }) {
  const color = stage === 'booked' || stage === 'completed' ? GREEN : stage === 'selected' ? CYAN : GOLD;
  return (
    <span style={{ color, fontWeight: 700, fontSize: '0.7rem' }}>{stage}</span>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const routeIntel = useLiveRouteIntelligence();

  const [dashboard, setDashboard] = useState<GrowthDashboard | null>(null);
  const [commercial, setCommercial] = useState<CorridorCommercialSnapshot | null>(null);
  const [events, setEvents] = useState<GrowthEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const proof = useMemo(() => buildMiddleEastCorridorProof(8), []);

  async function loadData() {
    setLoading(true);
    try {
      const [dash, comm] = await Promise.all([
        getGrowthDashboard(),
        buildCorridorCommercialSnapshot(),
      ]);
      setDashboard(dash);
      setCommercial(comm);
      setEvents(getGrowthEventFeed().slice(0, 30));
      setLastRefresh(new Date());
    } catch {
      // leave previous state intact
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(); }, []);

  const topSignals = routeIntel.featuredSignals.slice(0, 6);
  const funnelTotal = dashboard?.funnel.searched ?? 1;

  const serviceMixItems = dashboard
    ? [
        { label: 'Rides', value: dashboard.serviceMix.rides, color: CYAN, icon: <Activity size={13} /> },
        { label: 'Buses', value: dashboard.serviceMix.buses, color: BLUE, icon: <Users size={13} /> },
        { label: 'Packages', value: dashboard.serviceMix.packages, color: GOLD, icon: <Package size={13} /> },
        { label: 'Referrals', value: dashboard.serviceMix.referrals, color: GREEN, icon: <Zap size={13} /> },
      ]
    : [];

  const totalServiceEvents = serviceMixItems.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, color: TEXT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 88 }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 16px 0' }}>

        {/* Header */}
        <div style={{ ...card({ background: 'linear-gradient(135deg, rgba(101,225,255,0.16), rgba(25,231,187,0.08))', border: `1px solid ${GOLD}33`, padding: '24px 24px 22px' }), marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: `${GOLD}18`, border: `1.5px solid ${GOLD}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <LineChart size={24} color={GOLD} />
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 900 }}>Operations Analytics</h1>
                <p style={{ margin: '5px 0 0', color: SUB, fontSize: '0.82rem' }}>
                  Funnel performance · Service mix · Corridor economics · Revenue
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: SUB, fontSize: '0.72rem' }}>
                <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                {lastRefresh.toLocaleTimeString()}
              </span>
              <button
                onClick={() => void loadData()}
                disabled={loading}
                style={{ height: 36, padding: '0 14px', borderRadius: 10, border: `1px solid ${BORDER}`, background: loading ? 'transparent' : CARD2, color: loading ? SUB : TEXT, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: '0.78rem' }}
              >
                <RefreshCw size={13} style={{ animation: loading ? 'wasel-spin 0.9s linear infinite' : 'none' }} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
          <KpiCard label="Searches" value={String(dashboard?.funnel.searched ?? 0)} sub="Rider demand entering the route graph" color={CYAN} icon={<BarChart2 size={13} />} delta={12} />
          <KpiCard label="Bookings" value={String(dashboard?.funnel.booked ?? 0)} sub="Confirmed conversions from live supply" color={GREEN} icon={<TrendingUp size={13} />} delta={8} />
          <KpiCard label="Revenue" value={`${(dashboard?.revenueJod ?? 0).toFixed(0)} JOD`} sub="Captured value across all service types" color={GOLD} icon={<LineChart size={13} />} delta={5} />
          <KpiCard label="Active demand" value={String(dashboard?.activeDemand ?? 0)} sub="Open demand alerts awaiting matching" color={BLUE} icon={<Activity size={13} />} />
          <KpiCard label="Owned corridors" value={String(commercial?.ownedCorridorContracts ?? proof.liveOwnedCorridors)} sub="Jordan lanes with production-grade ownership" color={CYAN} icon={<Zap size={13} />} delta={3} />
          <KpiCard label="Avg savings" value={`${proof.averageSavingsPercent}%`} sub="Price advantage vs. generic alternatives" color={GREEN} icon={<ArrowDown size={13} />} delta={2} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)', gap: 18, marginBottom: 20 }}>
          {/* Funnel */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <TrendingUp size={16} color={CYAN} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Conversion Funnel</div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <FunnelBar label="Searched" value={dashboard?.funnel.searched ?? 0} total={funnelTotal} color={CYAN} />
              <FunnelBar label="Selected" value={dashboard?.funnel.selected ?? 0} total={funnelTotal} color={BLUE} />
              <FunnelBar label="Booked" value={dashboard?.funnel.booked ?? 0} total={funnelTotal} color={GREEN} />
              <FunnelBar label="Completed" value={dashboard?.funnel.completed ?? 0} total={funnelTotal} color={GOLD} />
            </div>
            <div style={{ marginTop: 18, padding: '12px 14px', background: CARD2, borderRadius: 12, border: `1px solid ${BORDER}`, color: SUB, fontSize: '0.76rem', lineHeight: 1.6 }}>
              Funnel conversion rate:{' '}
              <strong style={{ color: GREEN }}>
                {funnelTotal > 0
                  ? `${Math.round(((dashboard?.funnel.booked ?? 0) / funnelTotal) * 100)}%`
                  : '—'}
              </strong>{' '}
              search-to-booking · Target is 18%+ to sustain corridor density.
            </div>
          </div>

          {/* Service mix */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Package size={16} color={GOLD} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Service Mix</div>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {serviceMixItems.map((item) => {
                const pct = Math.round((item.value / totalServiceEvents) * 100);
                return (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.78rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: TEXT, fontWeight: 700 }}>{item.icon}{item.label}</span>
                      <span style={{ color: item.color, fontWeight: 800 }}>{item.value} <span style={{ color: SUB, fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 6, background: TRACK, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
              <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 13px' }}>
                <div style={{ color: GOLD, fontWeight: 900, fontSize: '1rem' }}>{(dashboard?.revenueJod ?? 0).toFixed(0)} JOD</div>
                <div style={{ color: SUB, fontSize: '0.72rem', marginTop: 4 }}>Total captured revenue</div>
              </div>
              <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 13px' }}>
                <div style={{ color: GREEN, fontWeight: 900, fontSize: '1rem' }}>{commercial?.activeStakeholders ?? 0}</div>
                <div style={{ color: SUB, fontSize: '0.72rem', marginTop: 4 }}>Active stakeholders</div>
              </div>
            </div>
          </div>
        </div>

        {/* Top corridors */}
        <div style={{ ...card(), marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Activity size={16} color={CYAN} />
            <div style={{ color: TEXT, fontWeight: 900 }}>Top Corridors by Signal Strength</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
            {topSignals.length > 0
              ? topSignals.map((signal) => (
                  <div key={signal.id} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                      <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.84rem' }}>{signal.label}</div>
                      <div style={{ color: CYAN, fontWeight: 900, fontSize: '0.84rem', flexShrink: 0 }}>
                        {signal.priceQuote.finalPriceJod} JOD
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: `${CYAN}12`, border: `1px solid ${CYAN}28`, color: CYAN, fontSize: '0.68rem', fontWeight: 700 }}>
                        Score {signal.routeOwnershipScore}/100
                      </span>
                      <span style={{ padding: '2px 8px', borderRadius: 6, background: `${GREEN}12`, border: `1px solid ${GREEN}28`, color: GREEN, fontSize: '0.68rem', fontWeight: 700 }}>
                        {signal.priceQuote.savingsPercent}% cheaper
                      </span>
                    </div>
                    <div style={{ color: SUB, fontSize: '0.73rem', lineHeight: 1.55 }}>{signal.recommendedReason}</div>
                  </div>
                ))
              : dashboard?.topCorridors.map((corridor) => (
                  <div key={corridor.corridor} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.84rem', marginBottom: 6 }}>{corridor.corridor}</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <span style={{ color: CYAN, fontSize: '0.76rem', fontWeight: 700 }}>{corridor.demand} demand</span>
                      <span style={{ color: GREEN, fontSize: '0.76rem', fontWeight: 700 }}>{corridor.conversions} bookings</span>
                    </div>
                  </div>
                ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 18, marginBottom: 20 }}>
          {/* Commercial contracts */}
          {commercial && (
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <BarChart2 size={16} color={GOLD} />
                <div style={{ color: TEXT, fontWeight: 900 }}>Recurring Corridor Contracts</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {commercial.contracts.map((c) => (
                  <div key={c.id} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.8rem' }}>{c.title}</div>
                        <div style={{ color: SUB, fontSize: '0.71rem', marginTop: 3 }}>{c.corridorLabel} · {c.operatingModel}</div>
                      </div>
                      <div style={{ color: GOLD, fontWeight: 900, fontSize: '0.82rem', flexShrink: 0 }}>
                        {c.recurringRevenueJod.toFixed(0)} JOD
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <span style={{ color: SUB, fontSize: '0.69rem' }}>Ownership {c.routeOwnershipScore}/100</span>
                      <span style={{ color: SUB, fontSize: '0.69rem' }}>· Renews {new Date(c.renewalDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ color: GOLD, fontWeight: 900 }}>{commercial.totalRecurringRevenueJod.toFixed(0)} JOD</div>
                <div style={{ color: SUB, fontSize: '0.72rem', marginTop: 3 }}>Total recurring revenue across active lanes</div>
              </div>
            </div>
          )}

          {/* Proof table */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Zap size={16} color={GREEN} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Regional Corridor Proof</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {proof.rows.slice(0, 5).map((row) => (
                <div key={row.id} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
                    <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.8rem' }}>{row.corridor}</div>
                    <span style={{ color: row.proofMode === 'live-production' ? GREEN : GOLD, fontWeight: 800, fontSize: '0.7rem', flexShrink: 0 }}>
                      {row.proofMode === 'live-production' ? 'Live' : 'Launch'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ color: CYAN, fontSize: '0.7rem' }}>{row.waselSharedPriceJod} JOD Wasel</span>
                    <span style={{ color: SUB, fontSize: '0.7rem' }}>vs {row.benchmarkPriceJod} JOD</span>
                    <span style={{ color: GREEN, fontSize: '0.7rem', fontWeight: 700 }}>-{row.savingsPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live event feed */}
        {events.length > 0 && (
          <div style={card({ marginBottom: 20 })}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Activity size={16} color={CYAN} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Live Growth Event Feed</div>
              <span style={{ marginLeft: 'auto', color: SUB, fontSize: '0.71rem' }}>Last {events.length} events</span>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {events.slice(0, 12).map((event, idx) => (
                <div key={`${event.eventName}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 13px' }}>
                  <EventBadge serviceType={event.serviceType} />
                  <div style={{ flex: 1 }}>
                    <span style={{ color: TEXT, fontWeight: 700, fontSize: '0.78rem' }}>{event.eventName}</span>
                    {event.from && event.to && (
                      <span style={{ color: SUB, fontSize: '0.72rem' }}> · {event.from} → {event.to}</span>
                    )}
                  </div>
                  <FunnelStageBadge stage={event.funnelStage} />
                  {typeof event.valueJod === 'number' && event.valueJod > 0 && (
                    <span style={{ color: GOLD, fontWeight: 800, fontSize: '0.72rem', flexShrink: 0 }}>{event.valueJod.toFixed(2)} JOD</span>
                  )}
                  <span style={{ color: SUB, fontSize: '0.67rem', flexShrink: 0 }}>
                    {new Date(event.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes wasel-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
