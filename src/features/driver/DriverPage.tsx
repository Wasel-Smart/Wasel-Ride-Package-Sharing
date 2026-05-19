import { useMemo } from 'react';
import { Brain, Network, ShieldCheck, Truck } from 'lucide-react';
import { ProtectedPagePreview } from '../../components/system/ProtectedPagePreview';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';
import { buildDriverRoutePlan, getMarketplaceNodes } from '../../config/wasel-movement-network';

export default function DriverPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();

  const membership = useMemo(() => getMovementMembershipSnapshot(), []);
  const marketplaceNodes = useMemo(() => getMarketplaceNodes().slice(1, 4), []);

  if (!user) return <ProtectedPagePreview pathname="/app/driver" />;

  const readiness = getDriverReadinessSummary(user);
  const completedSteps = readiness.steps.filter(step => step.complete).length;
  const pendingSteps = readiness.steps.filter(step => !step.complete).slice(0, 4);
  const readinessPercent = Math.round((completedSteps / Math.max(1, readiness.steps.length)) * 100);
  const primaryCorridor = membership.dailyRoute;
  const driverPlan = primaryCorridor
    ? buildDriverRoutePlan(
        primaryCorridor.from,
        primaryCorridor.to,
        primaryCorridor.fillTargetSeats,
      )
    : null;

  const capabilityCards = [
    {
      label: 'Readiness',
      value: `${readinessPercent}%`,
      detail: `${completedSteps}/${readiness.steps.length} checks`,
      color: DS.green,
    },
    {
      label: 'Full trip',
      value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
      detail: 'Seats filled',
      color: DS.gold,
    },
    {
      label: 'Package add-on',
      value: driverPlan ? `${driverPlan.packageBonusJod} JOD` : '--',
      detail: 'Extra lane',
      color: DS.cyan,
    },
  ];

  const capabilityMatrix = [
    { label: 'Post ride', ready: readiness.canOfferRide },
    { label: 'Carry packages', ready: readiness.canCarryPackages },
    {
      label: 'Receive payouts',
      ready:
        user.emailVerified &&
        (user.verificationLevel === 'level_2' || user.verificationLevel === 'level_3'),
    },
  ];

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="Driver"
          title="Driver Console"
          titleAr="ÙˆØ§Ø¬Ù‡Ø© Ø§Ù„Ø³Ø§Ø¦Ù‚"
          sub="Route, earnings, readiness."
          color={DS.blue}
          action={{ label: 'Offer a ride', onClick: () => navigate('/app/offer-ride') }}
        />

        <div
          className="sp-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.18fr 0.82fr',
            gap: 18,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              background: `linear-gradient(135deg, rgba(0,200,232,0.12), rgba(8,18,35,0.96) 58%, rgba(240,168,48,0.08))`,
              borderRadius: r(24),
              padding: '24px',
              border: `1px solid ${DS.border}`,
              boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    color: DS.cyan,
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  Best live lane
                </div>
                <h2
                  style={{
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: '2rem',
                    lineHeight: 1.05,
                    margin: '8px 0 6px',
                  }}
                >
                  {primaryCorridor?.label ?? 'Choose your first corridor'}
                </h2>
                <div style={{ color: DS.sub, fontSize: '0.88rem', lineHeight: 1.55 }}>
                  {driverPlan?.waselBrainNote ?? readiness.detail}
                </div>
              </div>
              <span
                style={{
                  background: `${DS.green}16`,
                  border: `1px solid ${DS.green}2f`,
                  borderRadius: '999px',
                  color: DS.green,
                  fontWeight: 800,
                  padding: '8px 12px',
                  fontSize: '0.76rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {membership.loyaltyTier} • {membership.movementCredits} credits
              </span>
            </div>

            <div
              className="sp-3col"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                marginBottom: 16,
              }}
            >
              {capabilityCards.map(item => (
                <div
                  key={item.label}
                  style={{
                    background: 'rgba(5,12,24,0.54)',
                    borderRadius: r(18),
                    border: `1px solid ${DS.border}`,
                    padding: '16px 16px 14px',
                  }}
                >
                  <div style={{ color: item.color, fontWeight: 900, fontSize: '1.22rem' }}>
                    {item.value}
                  </div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem', marginTop: 4 }}>
                    {item.label}
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.72rem', marginTop: 4 }}>
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'grid',
                gap: 10,
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              }}
            >
              <button
                onClick={() => navigate('/app/offer-ride')}
                style={{
                  height: 46,
                  borderRadius: '999px',
                  border: 'none',
                  background: DS.gradC,
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Open route
              </button>
              <button
                onClick={() => navigate('/app/trust')}
                style={{
                  height: 46,
                  borderRadius: '999px',
                  border: `1px solid ${DS.border}`,
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Trust
              </button>
              <button
                onClick={() => navigate('/app/settings')}
                style={{
                  height: 46,
                  borderRadius: '999px',
                  border: `1px solid ${DS.border}`,
                  background: 'rgba(255,255,255,0.04)',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Settings
              </button>
            </div>
          </div>

          <div
            style={{
              background: DS.card,
              borderRadius: r(24),
              padding: '22px',
              border: `1px solid ${DS.border}`,
              display: 'grid',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <ShieldCheck size={18} color={DS.green} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Ready state</div>
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>
                {readiness.headline}
              </div>
              <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.55, marginTop: 6 }}>
                {pendingSteps.length > 0
                  ? `Finish ${pendingSteps.length} more step${pendingSteps.length === 1 ? '' : 's'} to fully unlock the lane.`
                  : 'All checks are complete. You can go live now.'}
              </div>
            </div>
            <div
              style={{
                height: 10,
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${readinessPercent}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${DS.green}, ${DS.cyan})`,
                }}
              />
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(pendingSteps.length > 0 ? pendingSteps : readiness.steps.slice(0, 3)).map(step => (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    background: DS.card2,
                    borderRadius: r(14),
                    padding: '12px 14px',
                    border: `1px solid ${step.complete ? `${DS.green}33` : DS.border}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: r(9),
                      background: step.complete ? `${DS.green}16` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${step.complete ? `${DS.green}2f` : DS.border}`,
                      color: step.complete ? DS.green : DS.gold,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {step.complete ? 'OK' : '!'}
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>
                      {step.label}
                    </div>
                    <div
                      style={{
                        color: DS.muted,
                        fontSize: '0.74rem',
                        lineHeight: 1.5,
                        marginTop: 4,
                      }}
                    >
                      {step.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="sp-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
        >
          <div
            style={{
              background: DS.card,
              borderRadius: r(22),
              padding: '22px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Brain size={18} color={DS.cyan} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Route pulse</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                primaryCorridor?.label ?? 'No route selected yet',
                driverPlan
                  ? `Pickup ${driverPlan.corridor.pickupPoints[0] ?? 'Trusted point'} • ${driverPlan.corridor.autoGroupWindow}`
                  : 'Choose a corridor to unlock launch timing.',
                driverPlan
                  ? `${driverPlan.emptySeatCostJod} JOD lost per empty seat • ${driverPlan.recommendedSeatPriceJod} JOD target`
                  : 'Price and fill targets appear here.',
              ].map(line => (
                <div
                  key={line}
                  style={{
                    background: DS.card2,
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 10,
                marginTop: 14,
              }}
            >
              {capabilityMatrix.map(item => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: r(14),
                    padding: '12px 14px',
                    border: `1px solid ${DS.border}`,
                    background: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.76rem' }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      color: item.ready ? DS.green : DS.gold,
                      fontWeight: 900,
                      fontSize: '0.74rem',
                      marginTop: 6,
                    }}
                  >
                    {item.ready ? 'Ready' : 'Blocked'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              background: DS.card,
              borderRadius: r(22),
              padding: '22px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Network size={18} color={DS.green} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Demand add-ons</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {marketplaceNodes.map(node => (
                <div
                  key={node.id}
                  style={{
                    background: DS.card2,
                    borderRadius: r(14),
                    padding: '12px 14px',
                    border: `1px solid ${DS.border}`,
                  }}
                >
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>
                    {node.title}
                  </div>
                  <div
                    style={{
                      color: DS.muted,
                      fontSize: '0.74rem',
                      lineHeight: 1.55,
                      marginTop: 4,
                    }}
                  >
                    {node.summary}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 14,
                borderRadius: r(16),
                border: `1px solid ${DS.border}`,
                background:
                  'linear-gradient(135deg, rgba(240,168,48,0.10), rgba(255,255,255,0.03))',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Truck size={18} color={DS.gold} />
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.8rem' }}>
                  Lane expansion
                </div>
                <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55, marginTop: 4 }}>
                  {driverPlan
                    ? `Packages can add ${driverPlan.packageBonusJod} JOD on ${primaryCorridor?.label ?? 'this route'}.`
                    : 'Package-ready corridors surface here after route selection.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}
