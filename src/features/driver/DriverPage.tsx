import { useMemo } from 'react';
import { Brain, Network, ShieldCheck, Truck } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  CoreExperienceBanner,
  DS,
  PageShell,
  Protected,
  r,
  SectionHead,
} from '../../pages/waselServiceShared';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';
import {
  buildDriverRoutePlan,
  getMarketplaceNodes,
  getMovementDefensibilityLines,
} from '../../config/wasel-movement-network';

export default function DriverPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  const membership = useMemo(() => getMovementMembershipSnapshot(), []);
  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(1), []);
  const defensibility = useMemo(() => getMovementDefensibilityLines(), []);

  if (!user) return null;

  const readiness = getDriverReadinessSummary(user);
  const completedSteps = readiness.steps.filter(step => step.complete).length;
  const readinessPercent = Math.round((completedSteps / Math.max(1, readiness.steps.length)) * 100);
  const primaryCorridor = membership.dailyRoute;
  const driverPlan = primaryCorridor
    ? buildDriverRoutePlan(
        primaryCorridor.from,
        primaryCorridor.to,
        primaryCorridor.fillTargetSeats,
      )
    : null;

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Driver"
          title="Driver Readiness"
          titleAr="جاهزية السائق"
          sub="Finish checks and open your route."
          color={DS.blue}
          action={{ label: 'Offer a ride', onClick: () => navigate('/app/offer-ride') }}
        />

        <CoreExperienceBanner
          title="Get ready to drive."
          detail="This page should tell drivers what is ready, what is blocked, and which route gives them the best chance of earning today."
          tone={DS.blue}
        />

        <div
          className="sp-4col"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}
        >
          {[
            {
              label: 'Readiness',
              value: `${readinessPercent}%`,
              detail: `${completedSteps}/${readiness.steps.length} checks done`,
              color: DS.green,
            },
            {
              label: 'Best route',
              value: primaryCorridor?.label ?? 'No route yet',
              detail: 'Suggested corridor',
              color: DS.cyan,
            },
            {
              label: 'Full trip',
              value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
              detail: 'If seats fill',
              color: DS.gold,
            },
            {
              label: 'Tier',
              value: membership.loyaltyTier,
              detail: `${membership.movementCredits} credits`,
              color: DS.blue,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))',
                borderRadius: r(18),
                padding: '18px 18px 16px',
                border: `1px solid ${DS.border}`,
                boxShadow: '0 12px 28px rgba(0,0,0,0.16)',
              }}
            >
              <div
                style={{ color: item.color, fontWeight: 900, fontSize: '1.18rem', marginBottom: 4 }}
              >
                {item.value}
              </div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>
                {item.label}
              </div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4, lineHeight: 1.45 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 18, marginBottom: 18 }}
        >
          <div
            style={{
              background: DS.card,
              borderRadius: r(20),
              padding: '24px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldCheck size={18} color={DS.green} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Readiness</div>
            </div>
            <h3 style={{ color: '#fff', fontWeight: 900, margin: '0 0 10px', fontSize: '1.15rem' }}>
              {readiness.headline}
            </h3>
            <p style={{ color: DS.sub, margin: '0 0 18px', lineHeight: 1.6, fontSize: '0.84rem' }}>
              {readiness.detail}
            </p>

            <div style={{ display: 'grid', gap: 12 }}>
              {readiness.steps.map(step => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    background: DS.card2,
                    borderRadius: r(14),
                    padding: '14px 16px',
                    border: `1px solid ${step.complete ? `${DS.green}33` : DS.border}`,
                  }}
                >
                  <div
                    style={{
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
                    }}
                  >
                    {step.complete ? 'OK' : '...'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>
                      {step.label}
                    </div>
                    <div
                      style={{
                        color: DS.muted,
                        fontSize: '0.76rem',
                        marginTop: 4,
                        lineHeight: 1.55,
                      }}
                    >
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: '22px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Brain size={18} color={DS.cyan} />
                <div style={{ color: '#fff', fontWeight: 900 }}>Route tips</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  driverPlan?.waselBrainNote ?? 'Pick a route to see earnings tips.',
                  driverPlan
                    ? `Pickup: ${driverPlan.corridor.pickupPoints[0] ?? 'Trusted point'}. ${driverPlan.corridor.autoGroupWindow}`
                    : 'Shared matching starts when demand builds.',
                  driverPlan
                    ? `Packages can add about ${driverPlan.packageBonusJod} JOD.`
                    : 'Packages can add more income.',
                ].map(item => (
                  <div
                    key={item}
                    style={{
                      background: DS.card2,
                      borderRadius: r(12),
                      padding: '12px 14px',
                      border: `1px solid ${DS.border}`,
                      color: '#fff',
                      fontSize: '0.8rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: DS.card,
                borderRadius: r(20),
                padding: '22px',
                border: `1px solid ${DS.border}`,
              }}
            >
              <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>
                Capability matrix
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  { label: 'Post ride', ready: readiness.canOfferRide },
                  { label: 'Carry packages', ready: readiness.canCarryPackages },
                  {
                    label: 'Receive payouts',
                    ready:
                      user.emailVerified &&
                      (user.verificationLevel === 'level_2' ||
                        user.verificationLevel === 'level_3'),
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: DS.card2,
                      borderRadius: r(12),
                      padding: '12px 14px',
                      border: `1px solid ${DS.border}`,
                    }}
                  >
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                      {item.label}
                    </div>
                    <span
                      style={{
                        color: item.ready ? DS.green : DS.gold,
                        fontWeight: 800,
                        fontSize: '0.75rem',
                      }}
                    >
                      {item.ready ? 'Ready' : 'Blocked'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}
        >
          <div
            style={{
              background: DS.card,
              borderRadius: r(20),
              padding: '22px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Network size={18} color={DS.green} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Extra demand</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {marketplaceNodes.map(node => (
                <div
                  key={node.id}
                  style={{
                    background: DS.card2,
                    borderRadius: r(12),
                    padding: '12px 14px',
                    border: `1px solid ${DS.border}`,
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
                    {node.title}
                  </div>
                  <div
                    style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.55, marginTop: 4 }}
                  >
                    {node.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: DS.card,
              borderRadius: r(20),
              padding: '22px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Truck size={18} color={DS.gold} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Why it works</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {defensibility.map(line => (
                <div
                  key={line}
                  style={{
                    background: DS.card2,
                    borderRadius: r(12),
                    padding: '12px 14px',
                    border: `1px solid ${DS.border}`,
                    color: '#fff',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: DS.card,
            borderRadius: r(20),
            padding: '22px',
            border: `1px solid ${DS.border}`,
          }}
        >
          <div style={{ color: '#fff', fontWeight: 900, marginBottom: 10 }}>Next steps</div>
          <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.6, marginBottom: 14 }}>
            Finish checks, choose your route, then post your ride.
          </div>
          <div
            style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}
          >
            <button
              onClick={() => navigate('/app/settings')}
              style={{
                height: 44,
                borderRadius: '999px',
                border: 'none',
                background: DS.gradC,
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Open settings
            </button>
            <button
              onClick={() => navigate('/app/trust')}
              style={{
                height: 44,
                borderRadius: '999px',
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Open trust center
            </button>
            <button
              onClick={() => navigate('/app/offer-ride')}
              style={{
                height: 44,
                borderRadius: '999px',
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Offer a ride
            </button>
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}
