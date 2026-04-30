/**
 * ModerationPage — /app/moderation
 *
 * Trust oversight, incident queue, route quality control,
 * user flag management, and safety enforcement dashboard.
 * Accessible only to authenticated users; full data visible to ops/admin roles.
 */

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  Flag,
  Route,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  UserX,
  X,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { buildAuthPagePath } from '../../utils/authFlow';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { buildMiddleEastCorridorProof } from '../../services/middleEastCorridorProof';

/* ─── Design tokens ──────────────────────────────────────────────────────────── */
const BG = 'var(--wasel-service-bg)';
const CARD = 'var(--wasel-service-card)';
const CARD2 = 'var(--wasel-service-card-2)';
const BORDER = 'var(--wasel-service-border)';
const TRACK = 'var(--surface-muted-strong)';
const CYAN = 'var(--wasel-app-blue)';
const GOLD = 'var(--wasel-app-sky)';
const GREEN = 'var(--wasel-app-teal)';
const RED = '#ef4444';
const ORANGE = '#f97316';
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

/* ─── Types ──────────────────────────────────────────────────────────────────── */

type Severity = 'critical' | 'high' | 'medium' | 'low';
type IncidentStatus = 'open' | 'under_review' | 'resolved' | 'dismissed';
type FlagCategory = 'behaviour' | 'route_deviation' | 'vehicle' | 'package' | 'payment' | 'trust_score' | 'no_show';

interface ModerationIncident {
  id: string;
  category: FlagCategory;
  description: string;
  reportedAt: string;
  corridor: string;
  severity: Severity;
  status: IncidentStatus;
  trustScoreImpact: number;
}

interface RouteQualitySignal {
  corridor: string;
  ownershipScore: number;
  qualityFlags: string[];
  status: 'healthy' | 'watch' | 'degraded';
  lastActivity: string;
}

/* ─── Initial incident queue ────────────────────────────────────────────────── */

const INITIAL_INCIDENTS: ModerationIncident[] = [
  { id: 'inc-001', category: 'behaviour', description: 'Rider reported driver was using phone while driving on Amman–Aqaba corridor.', reportedAt: '2026-04-11T07:14:00Z', corridor: 'Amman → Aqaba', severity: 'high', status: 'under_review', trustScoreImpact: -15 },
  { id: 'inc-002', category: 'route_deviation', description: 'Driver deviated from agreed corridor — took a 22-minute detour not communicated to passengers.', reportedAt: '2026-04-10T18:42:00Z', corridor: 'Amman → Irbid', severity: 'medium', status: 'open', trustScoreImpact: -8 },
  { id: 'inc-003', category: 'package', description: 'Package arrived with visible damage. Sender filed claim within 12 hours of delivery.', reportedAt: '2026-04-10T12:05:00Z', corridor: 'Zarqa → Aqaba', severity: 'medium', status: 'open', trustScoreImpact: -6 },
  { id: 'inc-004', category: 'no_show', description: 'Driver confirmed booking then did not appear at pickup window. No cancellation notice sent.', reportedAt: '2026-04-09T09:30:00Z', corridor: 'Amman → Zarqa', severity: 'high', status: 'resolved', trustScoreImpact: -12 },
  { id: 'inc-005', category: 'payment', description: 'Rider claims they were charged twice for the same booking. Wallet shows two debit entries.', reportedAt: '2026-04-09T06:18:00Z', corridor: 'Amman → Karak', severity: 'critical', status: 'under_review', trustScoreImpact: 0 },
  { id: 'inc-006', category: 'trust_score', description: 'Account flagged for 3 cancellations within 7 days. Trust score dropped below 40.', reportedAt: '2026-04-08T14:20:00Z', corridor: 'Amman → Salt', severity: 'low', status: 'resolved', trustScoreImpact: -18 },
  { id: 'inc-007', category: 'vehicle', description: 'Vehicle plate did not match the plate shown in booking confirmation. Reported by two riders.', reportedAt: '2026-04-07T11:45:00Z', corridor: 'Amman → Aqaba', severity: 'critical', status: 'dismissed', trustScoreImpact: -20 },
];

const ENFORCEMENT_RULES = [
  { rule: 'Three no-shows in 30 days → automatic suspension pending review', tier: 'critical' },
  { rule: 'Trust score below 35 → route posting blocked until cleared', tier: 'critical' },
  { rule: 'Verified plate mismatch reported by 2+ riders → immediate flag for ops review', tier: 'critical' },
  { rule: 'Route deviation over 15 minutes without rider acknowledgement → incident auto-created', tier: 'high' },
  { rule: 'Payment discrepancy reported → wallet operations frozen pending resolution', tier: 'high' },
  { rule: 'Package damage claim within 24h of delivery → carrier trust score adjusted', tier: 'medium' },
  { rule: 'Two behaviour reports in 14 days → warning message + ops notification', tier: 'medium' },
];

const QUALITY_ACTIONS = [
  { label: 'Verified driver re-check', desc: 'Trigger re-verification on drivers with score < 60 on active corridors.', action: 'Run check', color: CYAN },
  { label: 'Route deviation sweep', desc: 'Cross-reference GPS traces against booked routes for the last 7 days.', action: 'Run sweep', color: GOLD },
  { label: 'Package carrier audit', desc: 'Review all carriers with 2+ damage flags in the last 30 days.', action: 'Run audit', color: ORANGE },
  { label: 'Wallet anomaly scan', desc: 'Identify accounts with duplicate charge patterns or unusual payout velocity.', action: 'Run scan', color: GREEN },
];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function severityColor(s: Severity): string {
  return s === 'critical' ? RED : s === 'high' ? ORANGE : s === 'medium' ? GOLD : CYAN;
}

function statusColor(s: IncidentStatus): string {
  return s === 'resolved' ? GREEN : s === 'dismissed' ? SUB : s === 'under_review' ? GOLD : RED;
}

function categoryIcon(c: FlagCategory): React.ReactNode {
  switch (c) {
    case 'behaviour': return <UserX size={13} />;
    case 'route_deviation': return <Route size={13} />;
    case 'vehicle': return <Truck size={13} />;
    case 'package': return <Flag size={13} />;
    case 'payment': return <AlertTriangle size={13} />;
    case 'trust_score': return <Shield size={13} />;
    case 'no_show': return <Clock size={13} />;
  }
}

function categoryLabel(c: FlagCategory): string {
  return c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

/* ─── Subcomponents ──────────────────────────────────────────────────────────── */

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ color, fontWeight: 900, fontSize: '1.5rem', lineHeight: 1 }}>{value}</div>
      <div style={{ color: TEXT, fontWeight: 800, fontSize: '0.76rem', marginTop: 6 }}>{label}</div>
    </div>
  );
}

function IncidentRow({
  incident, onAction,
}: {
  incident: ModerationIncident;
  onAction: (id: string, action: 'resolve' | 'dismiss' | 'escalate') => void;
}) {
  const sc = severityColor(incident.severity);
  const stc = statusColor(incident.status);
  const isOpen = incident.status === 'open' || incident.status === 'under_review';

  return (
    <div style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '15px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ padding: '3px 8px', borderRadius: 7, background: `${sc}14`, border: `1px solid ${sc}30`, color: sc, fontWeight: 800, fontSize: '0.66rem', display: 'flex', alignItems: 'center', gap: 4 }}>
            {categoryIcon(incident.category)}{categoryLabel(incident.category)}
          </span>
          <span style={{ padding: '3px 8px', borderRadius: 7, background: `${sc}14`, border: `1px solid ${sc}30`, color: sc, fontWeight: 800, fontSize: '0.64rem' }}>
            {incident.severity.toUpperCase()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ color: TEXT, fontSize: '0.8rem', lineHeight: 1.55 }}>{incident.description}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ color: CYAN, fontSize: '0.69rem' }}>{incident.corridor}</span>
            <span style={{ color: SUB, fontSize: '0.69rem' }}>{new Date(incident.reportedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {incident.trustScoreImpact !== 0 && (
              <span style={{ color: RED, fontSize: '0.69rem', fontWeight: 700 }}>Trust impact: {incident.trustScoreImpact}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: stc, fontWeight: 800, fontSize: '0.7rem' }}>{incident.status.replace('_', ' ')}</span>
          {isOpen && (
            <>
              <button
                onClick={() => onAction(incident.id, 'resolve')}
                style={{ height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${GREEN}35`, background: `${GREEN}10`, color: GREEN, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <CheckCircle2 size={11} /> Resolve
              </button>
              <button
                onClick={() => onAction(incident.id, 'dismiss')}
                style={{ height: 28, padding: '0 10px', borderRadius: 7, border: `1px solid ${BORDER}`, background: 'transparent', color: SUB, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <X size={11} /> Dismiss
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────────── */

export default function ModerationPage() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const nav = useIframeSafeNavigate();
  const ar = language === 'ar';
  const routeIntel = useLiveRouteIntelligence();
  const proof = useMemo(() => buildMiddleEastCorridorProof(6), []);

  const [incidents, setIncidents] = useState<ModerationIncident[]>(INITIAL_INCIDENTS);
  const [filterStatus, setFilterStatus] = useState<IncidentStatus | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT }}>
        <button
          onClick={() => nav(buildAuthPagePath('signin', '/app/moderation'))}
          style={{ height: 48, padding: '0 24px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg, ${CYAN}, #1E5FAE)`, color: '#041018', fontWeight: 800, cursor: 'pointer', fontFamily: FONT }}
        >
          Sign in to access Moderation
        </button>
      </div>
    );
  }

  function handleAction(id: string, action: 'resolve' | 'dismiss' | 'escalate') {
    setIncidents((prev) =>
      prev.map((inc) =>
        inc.id === id
          ? { ...inc, status: action === 'resolve' ? 'resolved' : action === 'dismiss' ? 'dismissed' : 'under_review' }
          : inc,
      ),
    );
    setActionFeedback(
      action === 'resolve' ? 'Incident marked as resolved.' : action === 'dismiss' ? 'Incident dismissed.' : 'Escalated for review.',
    );
    setTimeout(() => setActionFeedback(null), 3000);
  }

  const filtered = incidents.filter((inc) => {
    if (filterStatus !== 'all' && inc.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && inc.severity !== filterSeverity) return false;
    return true;
  });

  const openCount = incidents.filter((i) => i.status === 'open').length;
  const reviewCount = incidents.filter((i) => i.status === 'under_review').length;
  const resolvedCount = incidents.filter((i) => i.status === 'resolved').length;
  const criticalCount = incidents.filter((i) => i.severity === 'critical' && (i.status === 'open' || i.status === 'under_review')).length;

  // Build route quality signals from live data
  const routeQuality: RouteQualitySignal[] = routeIntel.featuredSignals.slice(0, 4).map((signal) => ({
    corridor: signal.label,
    ownershipScore: signal.routeOwnershipScore,
    qualityFlags: signal.routeOwnershipScore < 50
      ? ['Low ownership density', 'Monitor for demand drops']
      : signal.routeOwnershipScore < 75
        ? ['Growing corridor — watch for supply gaps']
        : [],
    status: signal.routeOwnershipScore >= 75 ? 'healthy' : signal.routeOwnershipScore >= 50 ? 'watch' : 'degraded',
    lastActivity: 'Today',
  }));

  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: FONT, color: TEXT, direction: ar ? 'rtl' : 'ltr', paddingBottom: 88 }}>
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 16px 0' }}>

        {/* Header */}
        <div style={{ ...card({ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(71,183,230,0.06))', border: `1px solid ${RED}28`, padding: '24px 24px' }), marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 54, height: 54, borderRadius: 17, background: `${RED}14`, border: `1.5px solid ${RED}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={26} color={RED} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 900 }}>Moderation & Safety</h1>
              <p style={{ margin: '5px 0 0', color: SUB, fontSize: '0.82rem' }}>
                Trust oversight · Incident queue · Route quality · Enforcement
              </p>
            </div>
            {criticalCount > 0 && (
              <div style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: 12, background: `${RED}14`, border: `1px solid ${RED}30`, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} color={RED} />
                <span style={{ color: RED, fontWeight: 800, fontSize: '0.8rem' }}>{criticalCount} critical incident{criticalCount > 1 ? 's' : ''} open</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 20 }}>
          <StatBadge label="Open incidents" value={openCount} color={RED} />
          <StatBadge label="Under review" value={reviewCount} color={GOLD} />
          <StatBadge label="Resolved (all time)" value={resolvedCount} color={GREEN} />
          <StatBadge label="Critical open" value={criticalCount} color={RED} />
          <StatBadge label="Monitored corridors" value={proof.liveOwnedCorridors} color={CYAN} />
          <StatBadge label="Enforcement rules" value={ENFORCEMENT_RULES.length} color={GOLD} />
        </div>

        {/* Action feedback toast */}
        {actionFeedback && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12, background: `${GREEN}14`, border: `1px solid ${GREEN}30`, color: GREEN, fontWeight: 700, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckCircle2 size={15} /> {actionFeedback}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.6fr)', gap: 18, marginBottom: 20 }}>
          {/* Incident queue */}
          <div style={card()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Flag size={16} color={RED} />
              <div style={{ color: TEXT, fontWeight: 900 }}>Incident Queue</div>
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
                {/* Status filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as IncidentStatus | 'all')}
                  style={{ height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD2, color: TEXT, padding: '0 8px', fontFamily: FONT, fontSize: '0.72rem', outline: 'none' }}
                >
                  {(['all', 'open', 'under_review', 'resolved', 'dismissed'] as const).map((s) => (
                    <option key={s} value={s} style={{ background: '#0F172A' }}>{s === 'all' ? 'All status' : s.replace('_', ' ')}</option>
                  ))}
                </select>
                {/* Severity filter */}
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value as Severity | 'all')}
                  style={{ height: 30, borderRadius: 8, border: `1px solid ${BORDER}`, background: CARD2, color: TEXT, padding: '0 8px', fontFamily: FONT, fontSize: '0.72rem', outline: 'none' }}
                >
                  {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
                    <option key={s} value={s} style={{ background: '#0F172A' }}>{s === 'all' ? 'All severity' : s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.length === 0 ? (
                <div style={{ color: SUB, fontSize: '0.8rem', padding: '16px 0', textAlign: 'center' }}>
                  No incidents match the current filter.
                </div>
              ) : filtered.map((inc) => (
                <IncidentRow key={inc.id} incident={inc} onAction={handleAction} />
              ))}
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
            {/* Route quality */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <ShieldCheck size={15} color={GREEN} />
                <div style={{ color: TEXT, fontWeight: 900, fontSize: '0.88rem' }}>Route Quality Signals</div>
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                {routeQuality.map((rq) => {
                  const sc = rq.status === 'healthy' ? GREEN : rq.status === 'watch' ? GOLD : RED;
                  return (
                    <div key={rq.corridor} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 11, padding: '11px 13px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                        <div style={{ color: TEXT, fontWeight: 700, fontSize: '0.77rem' }}>{rq.corridor}</div>
                        <span style={{ color: sc, fontWeight: 800, fontSize: '0.67rem' }}>{rq.status}</span>
                      </div>
                      <div style={{ height: 4, background: TRACK, borderRadius: 3, marginBottom: 6 }}>
                        <div style={{ height: '100%', width: `${rq.ownershipScore}%`, background: sc, borderRadius: 3 }} />
                      </div>
                      {rq.qualityFlags.map((f) => (
                        <div key={f} style={{ color: GOLD, fontSize: '0.67rem', lineHeight: 1.45 }}>⚠ {f}</div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick moderation actions */}
            <div style={card()}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Eye size={15} color={CYAN} />
                <div style={{ color: TEXT, fontWeight: 900, fontSize: '0.88rem' }}>Quality Actions</div>
              </div>
              <div style={{ display: 'grid', gap: 9 }}>
                {QUALITY_ACTIONS.map((qa) => (
                  <div key={qa.label} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 11, padding: '11px 13px' }}>
                    <div style={{ color: TEXT, fontWeight: 700, fontSize: '0.76rem', marginBottom: 3 }}>{qa.label}</div>
                    <div style={{ color: SUB, fontSize: '0.68rem', lineHeight: 1.5, marginBottom: 8 }}>{qa.desc}</div>
                    <button
                      style={{ height: 28, padding: '0 11px', borderRadius: 7, border: `1px solid ${qa.color}30`, background: `${qa.color}10`, color: qa.color, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      {qa.action} <ChevronRight size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enforcement rules */}
        <div style={{ ...card(), marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <BadgeCheck size={16} color={CYAN} />
            <div style={{ color: TEXT, fontWeight: 900 }}>Non-Negotiable Enforcement Rules</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
            {ENFORCEMENT_RULES.map((rule) => {
              const rc = rule.tier === 'critical' ? RED : rule.tier === 'high' ? ORANGE : GOLD;
              return (
                <div key={rule.rule} style={{ background: `${rc}08`, border: `1px solid ${rc}25`, borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <Shield size={13} color={rc} style={{ flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: TEXT, fontSize: '0.77rem', lineHeight: 1.6 }}>{rule.rule}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust score overview */}
        <div style={card({ marginBottom: 20 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Shield size={16} color={GREEN} />
            <div style={{ color: TEXT, fontWeight: 900 }}>Your Trust Standing</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Trust score', value: `${user.trustScore ?? 0}/100`, color: (user.trustScore ?? 0) >= 75 ? GREEN : (user.trustScore ?? 0) >= 50 ? GOLD : RED },
              { label: 'Verification', value: user.verified ? 'Verified' : 'Pending', color: user.verified ? GREEN : GOLD },
              { label: 'Wallet status', value: user.walletStatus === 'active' ? 'Active' : 'Restricted', color: user.walletStatus === 'active' ? GREEN : RED },
              { label: 'Account role', value: user.role ?? 'rider', color: CYAN },
            ].map((item) => (
              <div key={item.label} style={{ background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '13px 15px' }}>
                <div style={{ color: item.color, fontWeight: 900, fontSize: '1.05rem' }}>{item.value}</div>
                <div style={{ color: SUB, fontSize: '0.72rem', marginTop: 5 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => nav('/app/trust')} style={{ height: 38, padding: '0 16px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${CYAN}, #1E5FAE)`, color: '#041018', fontWeight: 800, cursor: 'pointer', fontFamily: FONT, fontSize: '0.78rem' }}>
              Open Trust Center
            </button>
            <button onClick={() => nav('/app/safety')} style={{ height: 38, padding: '0 16px', borderRadius: 10, border: `1px solid ${BORDER}`, background: CARD2, color: TEXT, fontWeight: 700, cursor: 'pointer', fontFamily: FONT, fontSize: '0.78rem' }}>
              Safety Center
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
