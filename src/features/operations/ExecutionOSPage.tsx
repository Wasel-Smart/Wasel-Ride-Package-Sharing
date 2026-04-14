import { useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  Gauge,
  LineChart,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getExecutionOperatingSystemSnapshot } from '../../services/executionOperatingSystem';

const BG = 'var(--wasel-service-bg)';
const PANEL = 'var(--wasel-service-card)';
const BORDER = 'var(--wasel-service-border)';
const CYAN = 'var(--wasel-app-blue)';
const GREEN = 'var(--wasel-app-teal)';
const GOLD = 'var(--wasel-app-sky)';
const RED = '#F97316';
const FONT = "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)";

function cardStyle() {
  return {
    background: PANEL,
    border: `1px solid ${BORDER}`,
    borderRadius: 24,
    padding: '18px 18px 16px',
    boxShadow: 'var(--wasel-shadow-card)',
    backdropFilter: 'blur(18px)',
  } as const;
}

export default function ExecutionOSPage() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const snapshot = useMemo(() => getExecutionOperatingSystemSnapshot(), []);

  const maturityDelta = snapshot.targetScore - snapshot.maturityScore;
  const engineeringKpis = snapshot.kpis.filter((kpi) => kpi.area === 'engineering');
  const revenueKpis = snapshot.kpis.filter((kpi) => kpi.area === 'commercial');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BG,
        fontFamily: FONT,
        color: '#EFF6FF',
        direction: ar ? 'rtl' : 'ltr',
        paddingBottom: 72,
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 16px 0' }}>
        <section
          style={{
            ...cardStyle(),
            background: 'linear-gradient(135deg, rgba(101,225,255,0.16), rgba(25,231,187,0.08))',
            border: '1px solid rgba(71,183,230,0.24)',
            padding: '24px 22px 22px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: 760 }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: CYAN,
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <Gauge size={15} />
                Execution Operating System
              </div>
              <h1 style={{ margin: '16px 0 10px', fontSize: 'clamp(1.8rem, 4vw, 2.7rem)', fontWeight: 900 }}>
                Turn Wasel from a strong product into a fully managed execution machine
              </h1>
              <p style={{ margin: 0, color: 'rgba(226,232,240,0.82)', lineHeight: 1.7, fontSize: '0.98rem' }}>
                This surface makes ownership, operating cadence, KPI discipline, and enforcement visible.
                It is the execution layer needed to move Wasel from {snapshot.maturityScore.toFixed(1)}/10 to
                a repeatable 10/10 operating standard.
              </p>
            </div>

            <div
              style={{
                minWidth: 250,
                ...cardStyle(),
                padding: '16px 18px',
                background: 'rgba(5,19,33,0.42)',
              }}
            >
              <div style={{ color: 'rgba(226,232,240,0.72)', fontSize: '0.8rem', fontWeight: 700 }}>
                Maturity score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                <span style={{ color: CYAN, fontSize: '2.3rem', fontWeight: 900 }}>
                  {snapshot.maturityScore.toFixed(1)}
                </span>
                <span style={{ color: 'rgba(226,232,240,0.72)', fontWeight: 700 }}>/ {snapshot.targetScore}</span>
              </div>
              <div style={{ marginTop: 8, color: GOLD, fontWeight: 800, fontSize: '0.84rem' }}>
                Current level: {snapshot.maturityLevel}
              </div>
              <div style={{ marginTop: 10, color: 'rgba(226,232,240,0.76)', fontSize: '0.84rem', lineHeight: 1.6 }}>
                Remaining gap: {maturityDelta.toFixed(1)} points, closed through governance, quality gates,
                KPI review, and leadership inspection.
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: 'grid',
            gap: 14,
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <div style={cardStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: CYAN, fontWeight: 800 }}>
              <Users size={18} />
              Owners
            </div>
            <div style={{ marginTop: 10, fontSize: '1.5rem', fontWeight: 900 }}>{snapshot.owners.length}</div>
            <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: '0.82rem' }}>
              Every operating domain has one accountable role.
            </div>
          </div>
          <div style={cardStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GREEN, fontWeight: 800 }}>
              <LineChart size={18} />
              KPIs
            </div>
            <div style={{ marginTop: 10, fontSize: '1.5rem', fontWeight: 900 }}>{snapshot.kpis.length}</div>
            <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: '0.82rem' }}>
              Performance is measured across product, commercial, operations, and engineering.
            </div>
          </div>
          <div style={cardStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: GOLD, fontWeight: 800 }}>
              <Activity size={18} />
              Cadences
            </div>
            <div style={{ marginTop: 10, fontSize: '1.5rem', fontWeight: 900 }}>{snapshot.cadences.length}</div>
            <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: '0.82rem' }}>
              Weekly, biweekly, and monthly review loops keep execution visible.
            </div>
          </div>
          <div style={cardStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: RED, fontWeight: 800 }}>
              <AlertTriangle size={18} />
              Enforcement
            </div>
            <div style={{ marginTop: 10, fontSize: '1.5rem', fontWeight: 900 }}>{snapshot.enforcementRules.length}</div>
            <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: '0.82rem' }}>
              Execution drifts only when rules are optional. Here they are explicit.
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'minmax(0, 1.25fr) minmax(0, 0.95fr)',
          }}
        >
          <div style={cardStyle()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: CYAN, fontWeight: 900 }}>
              <ShieldCheck size={18} />
              Execution Principles
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 14 }}>
              {snapshot.executionPrinciples.map((principle) => (
                <div
                  key={principle}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.028)',
                    padding: '12px 14px',
                    color: 'rgba(226,232,240,0.86)',
                    lineHeight: 1.65,
                    fontSize: '0.88rem',
                  }}
                >
                  {principle}
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ color: GOLD, fontWeight: 900, fontSize: '0.96rem' }}>KPI focus now</div>
            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {[...engineeringKpis, ...revenueKpis].map((kpi) => (
                <div
                  key={kpi.id}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.028)',
                  }}
                >
                  <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.88rem' }}>{kpi.title}</div>
                  <div style={{ marginTop: 4, color: 'rgba(226,232,240,0.72)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    {kpi.definition}
                  </div>
                  <div style={{ marginTop: 8, color: CYAN, fontWeight: 800, fontSize: '0.78rem' }}>
                    Target: {kpi.target}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          }}
        >
          <div style={cardStyle()}>
            <div style={{ color: CYAN, fontWeight: 900, fontSize: '0.96rem' }}>Governance and accountability</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {snapshot.owners.map((owner) => (
                <div
                  key={owner.domain}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.024)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.88rem' }}>{owner.domain}</div>
                  <div style={{ marginTop: 4, color: CYAN, fontWeight: 700, fontSize: '0.8rem' }}>
                    {owner.accountableRole}
                  </div>
                  <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    Scope: {owner.scope}
                  </div>
                  <div style={{ marginTop: 6, color: GREEN, fontWeight: 700, fontSize: '0.78rem' }}>
                    Success metric: {owner.successMetric}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ color: GREEN, fontWeight: 900, fontSize: '0.96rem' }}>Operating cadence</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {snapshot.cadences.map((cadence) => (
                <div
                  key={cadence.title}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.024)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.88rem' }}>{cadence.title}</div>
                  <div style={{ marginTop: 4, color: GOLD, fontWeight: 700, fontSize: '0.8rem' }}>
                    {cadence.frequency}
                  </div>
                  <div style={{ marginTop: 6, color: 'rgba(226,232,240,0.72)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                    {cadence.purpose}
                  </div>
                  <div style={{ marginTop: 10, color: CYAN, fontWeight: 700, fontSize: '0.78rem' }}>
                    Inputs: {cadence.requiredInputs.join(' | ')}
                  </div>
                  <div style={{ marginTop: 6, color: GREEN, fontWeight: 700, fontSize: '0.78rem' }}>
                    Outputs: {cadence.mandatoryOutputs.join(' | ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ color: GOLD, fontWeight: 900, fontSize: '0.96rem' }}>Playbooks and gates</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {snapshot.playbooks.map((playbook) => (
                <div
                  key={playbook.title}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.024)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.88rem' }}>{playbook.title}</div>
                  <div style={{ marginTop: 4, color: 'rgba(226,232,240,0.72)', fontSize: '0.8rem' }}>
                    Owner: {playbook.owner}
                  </div>
                  <div style={{ marginTop: 6, color: CYAN, fontWeight: 700, fontSize: '0.78rem' }}>
                    Trigger: {playbook.trigger}
                  </div>
                  <div style={{ marginTop: 8, color: GREEN, fontSize: '0.78rem', lineHeight: 1.7 }}>
                    Exit: {playbook.exitCriteria.join(' | ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: 18,
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          }}
        >
          <div style={cardStyle()}>
            <div style={{ color: CYAN, fontWeight: 900, fontSize: '0.96rem' }}>Continuous improvement loop</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {snapshot.improvementLoop.map((step, index) => (
                <div
                  key={step.phase}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '36px minmax(0, 1fr)',
                    gap: 12,
                    alignItems: 'start',
                    padding: '10px 0',
                    borderTop: index === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      background: 'rgba(71,183,230,0.14)',
                      border: '1px solid rgba(71,183,230,0.22)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: CYAN,
                      fontWeight: 900,
                    }}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <div style={{ color: '#EFF6FF', fontWeight: 800, fontSize: '0.88rem' }}>{step.phase}</div>
                    <div style={{ marginTop: 4, color: 'rgba(226,232,240,0.72)', fontSize: '0.8rem', lineHeight: 1.6 }}>
                      {step.objective}
                    </div>
                    <div style={{ marginTop: 6, color: GREEN, fontWeight: 700, fontSize: '0.78rem' }}>
                      Deliverable: {step.deliverable}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={cardStyle()}>
            <div style={{ color: RED, fontWeight: 900, fontSize: '0.96rem' }}>Non-negotiable enforcement</div>
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              {snapshot.enforcementRules.map((rule) => (
                <div
                  key={rule}
                  style={{
                    borderRadius: 14,
                    border: '1px solid rgba(249,115,22,0.18)',
                    background: 'rgba(249,115,22,0.06)',
                    padding: '12px 14px',
                    color: 'rgba(255,237,213,0.9)',
                    fontSize: '0.84rem',
                    lineHeight: 1.6,
                  }}
                >
                  {rule}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
