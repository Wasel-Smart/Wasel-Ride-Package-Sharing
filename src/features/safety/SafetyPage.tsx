/**
 * SafetyPage — /app/safety
 * ID verification · SOS · Insurance · Cultural intelligence
 *
 * Fix: Protected now calls useIframeSafeNavigate so unauthenticated
 * users are actually redirected to /app/auth instead of stuck on
 * the lock screen forever.
 */
import { useEffect, type ReactNode } from 'react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { PAGE_DS } from '../../styles/wasel-page-theme';

const DS = PAGE_DS;
const r = (px = 12) => `${px}px`;

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/app/auth?returnTo=/app/safety');
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16, background: DS.bg,
      }}>
        <div style={{ color: '#fff', fontWeight: 800, fontFamily: DS.F }}>Checking your Wasel session...</div>
        <div style={{ color: DS.sub, fontFamily: DS.F }}>Safety tools open once we confirm your trusted account.</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 16, background: DS.bg,
      }}>
        <div style={{ fontSize: '3rem' }}>🔒</div>
        <div style={{ color: DS.sub, fontFamily: DS.F }}>Redirecting to sign in…</div>
      </div>
    );
  }

  return <>{children}</>;
}

const SAFETY_FEATURES = [
  {
    emoji: '🪪',
    title: 'Gov-ID Verification',
    desc: 'All drivers verified with Jordan Sanad eKYC system',
    color: DS.cyan,
  },
  {
    emoji: '🆘',
    title: 'SOS Emergency',
    desc: 'One tap to share location with emergency contacts',
    color: '#EF4444',
  },
  {
    emoji: '📋',
    title: 'Trip Insurance',
    desc: 'Up to JOD 1,000 coverage per trip',
    color: DS.gold,
  },
  {
    emoji: '🕌',
    title: 'Cultural Intelligence',
    desc: 'Prayer stops, gender preferences, Ramadan mode',
    color: DS.blue,
  },
];

export default function SafetyPage() {
  return (
    <Protected>
      <div style={{ minHeight: '100vh', background: DS.bg, fontFamily: DS.F }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 16px' }}>

          {/* Header */}
          <div style={{
            background: DS.gradNav, borderRadius: r(20), padding: '24px',
            marginBottom: 20, border: `1px solid ${DS.green}18`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 56, height: 56, borderRadius: r(16),
                background: `${DS.green}18`, border: `1.5px solid ${DS.green}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.9rem',
              }}>
                🛡️
              </div>
              <div>
                <h1 style={{ fontSize: '1.55rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  Safety Center
                </h1>
                <p style={{ color: DS.sub, margin: '4px 0 0', fontSize: '0.82rem' }}>
                  ID-verified drivers · SOS · Trip insurance
                </p>
              </div>
            </div>
          </div>

          {/* Info banner */}
          <div style={{
            background: `${DS.green}08`, border: `1px solid ${DS.green}20`,
            borderRadius: r(18), padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ color: DS.green, fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>
              Trust should feel built in, not added later
            </div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.6 }}>
              Safety is presented here as a system-wide product layer: verified identity,
              emergency support, insurance, and cultural comfort cues that support every
              ride, package, and scheduled trip.
            </div>
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {SAFETY_FEATURES.map(f => (
              <div key={f.title} style={{
                background: DS.card, borderRadius: r(20), padding: '24px 22px',
                border: `1px solid ${DS.border}`,
              }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>{f.emoji}</div>
                <h3 style={{ color: '#fff', fontWeight: 800, margin: '0 0 8px', fontSize: '1rem' }}>
                  {f.title}
                </h3>
                <p style={{ color: DS.sub, fontSize: '0.82rem', margin: 0, lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </Protected>
  );
}
