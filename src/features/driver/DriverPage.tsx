import { useEffect, type ReactNode } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { PAGE_DS } from '../../styles/wasel-page-theme';

const DS = PAGE_DS;
const r = (px = 12) => `${px}px`;

function Protected({ children }: { children: ReactNode }) {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/app/auth?returnTo=/app/driver');
    }
  }, [user, navigate]);

  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16, background: DS.bg,
      }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <div style={{ color: DS.sub, fontFamily: DS.F }}>Redirecting to sign in...</div>
      </div>
    );
  }

  return <>{children}</>;
}

const METRICS = [
  { label: 'Driver approval', val: 'Review-based', icon: '🛡️', color: DS.green },
  { label: 'Identity level', val: 'Level 2+', icon: '🪪', color: DS.cyan },
  { label: 'Package carry', val: 'Level 3', icon: '📦', color: DS.gold },
  { label: 'Payout ready', val: 'Verified email', icon: '💳', color: DS.blue },
];

export default function DriverPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  if (!user) return null;

  const readiness = getDriverReadinessSummary(user);

  return (
    <Protected>
      <div style={{ minHeight: '100vh', background: DS.bg, fontFamily: DS.F }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>
          <div style={{
            background: DS.gradNav, borderRadius: r(20), padding: '24px',
            marginBottom: 20, border: `1px solid ${DS.blue}18`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: r(16),
                background: `${DS.blue}18`, border: `1.5px solid ${DS.blue}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.9rem',
              }}>
                🧭
              </div>
              <div>
                <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  Driver Onboarding
                </h1>
                <p style={{ color: DS.sub, margin: '4px 0 0', fontSize: '0.82rem' }}>
                  Review your approval status, trust readiness, and the exact steps needed to operate.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {METRICS.map((m) => (
              <div key={m.label} style={{
                background: DS.card, borderRadius: r(16), padding: '20px 18px',
                border: `1px solid ${DS.border}`,
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: 8 }}>{m.icon}</div>
                <div style={{ color: m.color, fontWeight: 900, fontSize: '1.05rem' }}>{m.val}</div>
                <div style={{ color: DS.muted, fontSize: '0.75rem', marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 0.95fr', gap: 18 }}>
            <div style={{
              background: DS.card, borderRadius: r(20), padding: '24px',
              border: `1px solid ${DS.border}`,
            }}>
              <h3 style={{ color: '#fff', fontWeight: 900, margin: '0 0 10px', fontSize: '1.15rem' }}>
                {readiness.headline}
              </h3>
              <p style={{ color: DS.sub, margin: '0 0 18px', lineHeight: 1.6, fontSize: '0.84rem' }}>
                {readiness.detail}
              </p>

              <div style={{ display: 'grid', gap: 12 }}>
                {readiness.steps.map((step) => (
                  <div key={step.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    background: DS.card2,
                    borderRadius: r(14),
                    padding: '14px 16px',
                    border: `1px solid ${step.complete ? `${DS.green}33` : DS.border}`,
                  }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: r(10),
                      background: step.complete ? `${DS.green}18` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${step.complete ? `${DS.green}33` : DS.border}`,
                      color: step.complete ? DS.green : DS.muted,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}>
                      {step.complete ? 'OK' : '...'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{step.label}</div>
                      <div style={{ color: DS.muted, fontSize: '0.76rem', marginTop: 4, lineHeight: 1.55 }}>{step.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 18 }}>
              <div style={{
                background: DS.card, borderRadius: r(20), padding: '22px',
                border: `1px solid ${DS.border}`,
              }}>
                <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>Capability matrix</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    {
                      label: 'Post rides',
                      ready: readiness.canOfferRide,
                    },
                    {
                      label: 'Carry packages',
                      ready: readiness.canCarryPackages,
                    },
                    {
                      label: 'Receive payouts',
                      ready: user.emailVerified && (user.verificationLevel === 'level_2' || user.verificationLevel === 'level_3'),
                    },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>{item.label}</div>
                      <span style={{ color: item.ready ? DS.green : DS.gold, fontWeight: 800, fontSize: '0.75rem' }}>
                        {item.ready ? 'Ready' : 'Blocked'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{
                background: DS.card, borderRadius: r(20), padding: '22px',
                border: `1px solid ${DS.border}`,
              }}>
                <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>Next actions</div>
                <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 14 }}>
                  Use the pages below to complete the missing parts of driver onboarding and unlock ride posting.
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <button onClick={() => navigate('/app/settings')} style={{ height: 44, borderRadius: '999px', border: 'none', background: DS.gradC, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    Open Settings
                  </button>
                  <button onClick={() => navigate('/app/trust')} style={{ height: 44, borderRadius: '999px', border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    Open Trust Center
                  </button>
                  <button onClick={() => navigate('/app/offer-ride')} style={{ height: 44, borderRadius: '999px', border: `1px solid ${DS.border}`, background: DS.card2, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    Try Offer Ride
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}
