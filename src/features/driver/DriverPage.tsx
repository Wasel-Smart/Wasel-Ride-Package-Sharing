import { useMemo, useState } from 'react';
import { AlertTriangle, Brain, Network, ShieldCheck, Truck, Wifi, WifiOff } from 'lucide-react';
import { ProtectedPagePreview } from '../../components/system/ProtectedPagePreview';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { useLanguage } from '../../contexts/LanguageContext';
import { DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
import { C, GRAD_HERO, R, SH } from '../../utils/wasel-ds';
import { getDriverReadinessSummary } from '../../services/driverOnboarding';
import { getMovementMembershipSnapshot } from '../../services/movementMembership';
import { buildDriverRoutePlan, getMarketplaceNodes } from '../../config/wasel-movement-network';

export default function DriverPage() {
  const { user } = useLocalAuth();
  const navigate = useIframeSafeNavigate();
  const { t } = useLanguage();

  const [offlineMode, setOfflineMode] = useState(false);

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

  const pluralSteps = pendingSteps.length === 1 ? '' : 's';

  const capabilityCards = [
    {
      label: t('driverPageExpanded.readiness'),
      value: `${readinessPercent}%`,
      detail: `${completedSteps}/${readiness.steps.length} ${t('driverPageExpanded.readiness').toLowerCase()}`,
      color: DS.green,
    },
    {
      label: t('driverPageExpanded.fullTrip'),
      value: driverPlan ? `${driverPlan.grossWhenFullJod} JOD` : '--',
      detail: t('driverPageExpanded.seatsFilled'),
      color: DS.gold,
    },
    {
      label: t('driverPageExpanded.packageAddon'),
      value: driverPlan ? `${driverPlan.packageBonusJod} JOD` : '--',
      detail: t('driverPageExpanded.extraLane'),
      color: DS.cyan,
    },
  ];

  const capabilityMatrix = [
    { label: t('driver.trip.status'), ready: readiness.canOfferRide },
    { label: t('driverPageExpanded.packageAddon'), ready: readiness.canCarryPackages },
    {
      label: t('driverPageExpanded.earnings'),
      ready:
        user.emailVerified &&
        (user.verificationLevel === 'level_2' || user.verificationLevel === 'level_3'),
    },
  ];

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji={<Truck size={24} />}
          title={t('driverPageExpanded.driverConsole')}
          titleAr={t('driverPageExpanded.driverConsole')}
          sub="Own a corridor with earnings, readiness, and route proof in one view."
          subAr={t('driverPageExpanded.corridorOverview')}
          color={DS.blue}
          action={{
            label: 'Offer a ride',
            labelAr: t('driverPageExpanded.offerRide'),
            onClick: () => navigate('/app/offer-ride'),
          }}
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
              background: GRAD_HERO,
              borderRadius: R.xxl,
              padding: '24px',
              border: `1px solid ${DS.border}`,
              boxShadow: SH.lg,
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
                    letterSpacing: 0,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('driverPageExpanded.bestLiveLane')}
                </div>
                <h2
                  style={{
                    color: C.text,
                    fontWeight: 900,
                    fontSize: '2rem',
                    lineHeight: 1.05,
                    margin: '8px 0 6px',
                  }}
                >
                  {primaryCorridor?.label ?? t('driverPageExpanded.chooseFirstCorridor')}
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
                {membership.loyaltyTier} | {membership.movementCredits} {t('driverPage.credits')}
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
                    background: C.elevated,
                    borderRadius: R.xl,
                    border: `1px solid ${DS.border}`,
                    padding: '16px 16px 14px',
                  }}
                >
                  <div style={{ color: item.color, fontWeight: 900, fontSize: '1.22rem' }}>
                    {item.value}
                  </div>
                  <div style={{ color: C.text, fontWeight: 800, fontSize: '0.8rem', marginTop: 4 }}>
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
                  color: C.bgDeep,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('driverPageExpanded.openRoute')}
              </button>
              <button
                onClick={() => navigate('/app/trust')}
                style={{
                  height: 46,
                  borderRadius: '999px',
                  border: `1px solid ${DS.border}`,
                  background: C.elevated,
                  color: C.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('driverPageExpanded.trust')}
              </button>
              <button
                onClick={() => navigate('/app/settings')}
                style={{
                  height: 46,
                  borderRadius: '999px',
                  border: `1px solid ${DS.border}`,
                  background: C.elevated,
                  color: C.text,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('driverPageExpanded.settings')}
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
              <div style={{ color: C.text, fontWeight: 900 }}>
                {t('driverPageExpanded.readyState')}
              </div>
            </div>
            <div>
              <div style={{ color: C.text, fontWeight: 900, fontSize: '1.1rem' }}>
                {readiness.headline}
              </div>
              <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.55, marginTop: 6 }}>
                {pendingSteps.length > 0
                  ? t('driverPageExpanded.stepsToUnlock')
                      .replace('{count}', String(pendingSteps.length))
                      .replace('{plural}', pluralSteps)
                  : t('driverPageExpanded.allChecksComplete')}
              </div>
            </div>
            <div
              style={{
                height: 10,
                background: C.elevated,
                borderRadius: R.full,
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

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setOfflineMode(!offlineMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${DS.border}`,
                  background: offlineMode ? `${DS.gold}16` : C.elevated,
                  color: offlineMode ? DS.gold : C.text,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {offlineMode ? <WifiOff size={14} /> : <Wifi size={14} />}
                {offlineMode
                  ? t('driverPageExpanded.offlineMode')
                  : t('driverPageExpanded.onlineMode')}
              </button>
              <span style={{ color: DS.muted, fontSize: '0.72rem' }}>
                {offlineMode
                  ? t('driverPageExpanded.localSyncOnly')
                  : t('driverPageExpanded.liveUpdatesActive')}
              </span>
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
                      borderRadius: R.md,
                      background: step.complete ? C.greenDim : C.elevated,
                      border: `1px solid ${step.complete ? `${DS.green}2f` : DS.border}`,
                      color: step.complete ? DS.green : DS.gold,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {step.complete ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
                  </div>
                  <div>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: '0.8rem' }}>
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
              <div style={{ color: C.text, fontWeight: 900 }}>
                {t('driverPageExpanded.routePulse')}
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                primaryCorridor?.label ?? t('driverPageExpanded.noRouteSelected'),
                driverPlan
                  ? `Pickup ${driverPlan.corridor.pickupPoints[0] ?? 'Trusted point'} | ${driverPlan.corridor.autoGroupWindow}`
                  : t('driverPageExpanded.chooseCorridorTiming'),
                driverPlan
                  ? `${driverPlan.emptySeatCostJod} JOD lost per empty seat | ${driverPlan.recommendedSeatPriceJod} JOD target`
                  : t('driverPageExpanded.priceAndFillTargets'),
              ].map(line => (
                <div
                  key={line}
                  style={{
                    background: DS.card2,
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    padding: '12px 14px',
                    color: C.text,
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
                    background: C.elevated,
                  }}
                >
                  <div style={{ color: C.text, fontWeight: 800, fontSize: '0.76rem' }}>
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
                    {item.ready
                      ? t('driver.dashboard.activeTrip')
                      : t('driverPageExpanded.readyState')}
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
              <div style={{ color: C.text, fontWeight: 900 }}>
                {t('driverPageExpanded.demandAddons')}
              </div>
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
                  <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
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
                background: `linear-gradient(135deg, ${C.goldDim}, ${C.elevated})`,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
            >
              <Truck size={18} color={DS.gold} />
              <div>
                <div style={{ color: C.text, fontWeight: 800, fontSize: '0.8rem' }}>
                  {t('driverPageExpanded.laneExpansion')}
                </div>
                <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.55, marginTop: 4 }}>
                  {driverPlan
                    ? `${t('driverPageExpanded.packageBonus')
                        .replace('{bonus}', String(driverPlan.packageBonusJod))
                        .replace(
                          '{route}',
                          primaryCorridor?.label ?? t('driverPageExpanded.corridor'),
                        )}.`
                    : t('driverPageExpanded.packageReadyCorridors')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}
