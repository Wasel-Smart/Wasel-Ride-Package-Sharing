import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Brain, Route, Sparkles, CheckCircle } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  DS,
  PageShell,
  Protected,
  r,
  SectionHead,
} from '../../pages/waselServiceShared';
import {
  activateWaselPlus,
  getMovementMembershipSnapshot,
  startCommuterPass,
  type MovementMembershipSnapshot,
} from '../../services/movementMembership';
import {
  createReminderFromSuggestion,
  formatRouteReminderSchedule,
  getRecurringRouteSuggestions,
  getRouteReminderForCorridor,
  getRouteReminders,
  syncRouteReminders,
} from '../../services/movementRetention';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import { getFeaturedCorridors, getHabitLoopPrograms } from '../../config/wasel-movement-network';
import { C } from '../../utils/wasel-ds';

function tierLabel(tier: MovementMembershipSnapshot['loyaltyTier']) {
  if (tier === 'infrastructure') return 'Infrastructure';
  if (tier === 'network') return 'Network';
  if (tier === 'dense') return 'Dense';
  return 'Starter';
}

const PLUS_PRICE_JOD = 4.99;

export default function WaselPlusPage() {
  const nav = useIframeSafeNavigate();
  const { user } = useLocalAuth();
  const habitPrograms = useMemo(() => getHabitLoopPrograms(), []);
  const featuredCorridors = useMemo(() => getFeaturedCorridors(4), []);
  const [membership, setMembership] = useState(() => getMovementMembershipSnapshot());
  const [savedReminders, setSavedReminders] = useState(() => getRouteReminders());
  const [retentionMessage, setRetentionMessage] = useState<string | null>(null);

  const routeIntelligence = useLiveRouteIntelligence({
    from: membership.dailyRoute?.from,
    to: membership.dailyRoute?.to,
  });

  const recurringSuggestions = useMemo(
    () => getRecurringRouteSuggestions(4),
    [routeIntelligence.updatedAt],
  );

  const dailySignal = routeIntelligence.selectedSignal;

  // Merged into one effect to prevent double-sync on updatedAt change
  useEffect(() => {
    setSavedReminders(getRouteReminders());
    void syncRouteReminders(user ?? undefined).then(delivered => {
      if (delivered.length > 0) setSavedReminders(getRouteReminders());
    });
  }, [routeIntelligence.updatedAt, user?.email, user?.phone]);

  // Personalized savings headline
  const monthlySavingsJOD = useMemo(() => {
    if (!dailySignal?.priceQuote.discountJod) return null;
    return (dailySignal.priceQuote.discountJod * 22).toFixed(0);
  }, [dailySignal]);

  const handleActivatePlus = () => {
    activateWaselPlus();
    setMembership(getMovementMembershipSnapshot());
  };

  const handleStartPass = (routeId: string) => {
    startCommuterPass(routeId);
    setMembership(getMovementMembershipSnapshot());
  };

  const handleSaveReminder = (corridorId: string) => {
    const suggestion = recurringSuggestions.find(item => item.corridorId === corridorId);
    if (!suggestion) return;
    const reminder = createReminderFromSuggestion(suggestion);
    setSavedReminders(getRouteReminders());
    setRetentionMessage(`Reminder saved. ${formatRouteReminderSchedule(reminder)}.`);
  };

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji={<Sparkles size={24} />}
          title="Wasel Plus"
          titleAr="واصل بلس"
          sub={
            monthlySavingsJOD && membership.dailyRoute
              ? `Save ~${monthlySavingsJOD} JOD/month on ${membership.dailyRoute.label}`
              : 'Credits, passes, and reminders for repeat commuters.'
          }
          color={DS.gold}
          action={{ label: 'Find a route', onClick: () => nav('/app/find-ride') }}
        />

        {/* ── Membership stats ── */}
        <div
          className="sp-4col"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}
        >
          {[
            {
              label: 'Membership',
              value: membership.plusActive ? 'Active' : `${PLUS_PRICE_JOD} JOD/mo`,
              detail: membership.plusActive ? 'Benefits are on' : 'Tap below to activate',
              color: DS.gold,
            },
            {
              label: 'Credits',
              value: String(membership.movementCredits),
              detail: membership.movementCredits > 0 ? 'Earned from trips' : 'Earn on every ride',
              color: DS.green,
            },
            {
              label: 'Streak',
              value: `${membership.streakDays}d`,
              detail: 'Daily activity',
              color: DS.cyan,
            },
            {
              label: 'Tier',
              value: tierLabel(membership.loyaltyTier),
              detail: dailySignal
                ? `${dailySignal.priceQuote.finalPriceJod} JOD daily route`
                : (membership.commuterPassRoute?.label ?? 'No pass selected'),
              color: DS.blue,
            },
          ].map(item => (
            <div
              key={item.label}
              style={{
                background: C.card,
                borderRadius: r(18),
                padding: '18px 18px 16px',
                border: `1px solid ${DS.border}`,
                boxShadow: `0 12px 28px ${C.overlay}`,
              }}
            >
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.18rem', marginBottom: 4 }}>
                {item.value}
              </div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.45, marginTop: 4 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        {/* ── Plan + Benefits ── */}
        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 18, marginBottom: 18 }}
        >
          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <BadgeDollarSign size={18} color={DS.gold} />
              <div style={{ color: C.text, fontWeight: 900 }}>Your plan</div>
            </div>
            <div style={{ color: DS.sub, fontSize: '0.84rem', lineHeight: 1.65, marginBottom: 18 }}>
              Built for cheaper repeat travel.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                membership.plusActive
                  ? 'Wasel Plus is active.'
                  : `Activate Wasel Plus for ${PLUS_PRICE_JOD} JOD/month.`,
                membership.commuterPassRoute
                  ? `Pass: ${membership.commuterPassRoute.label} · ${membership.commuterPassRoute.subscriptionPriceJod} JOD/mo`
                  : 'Choose a commuter route below.',
                membership.dailyRoute
                  ? `Daily route: ${membership.dailyRoute.label} at ${dailySignal?.priceQuote.finalPriceJod ?? membership.dailyRoute.sharedPriceJod} JOD`
                  : 'Your daily route will appear here.',
              ].map(line => (
                <div
                  key={line}
                  style={{
                    background: DS.card2, borderRadius: r(12),
                    padding: '12px 14px', border: `1px solid ${DS.border}`,
                    color: C.text, fontSize: '0.8rem', lineHeight: 1.55,
                  }}
                >
                  {line}
                </div>
              ))}
            </div>
            <button
              onClick={handleActivatePlus}
              style={{
                width: '100%', height: 50, marginTop: 16,
                borderRadius: '999px', border: 'none',
                background: DS.gradGold, color: C.text,
                fontWeight: 800, fontFamily: DS.F,
                cursor: 'pointer', boxShadow: `0 8px 24px ${DS.gold}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {membership.plusActive ? (
                <><CheckCircle size={16} /> Manage plan</>
              ) : (
                `Activate Wasel Plus · ${PLUS_PRICE_JOD} JOD/mo`
              )}
            </button>
          </div>

          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Brain size={18} color={DS.cyan} />
              <div style={{ color: C.text, fontWeight: 900 }}>Benefits</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {habitPrograms.map(program => (
                <div
                  key={program.id}
                  style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}
                >
                  <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>{program.title}</div>
                  <div style={{ color: DS.sub, fontSize: '0.75rem', lineHeight: 1.55, marginTop: 4 }}>{program.summary}</div>
                  <div style={{ color: DS.gold, fontSize: '0.72rem', fontWeight: 700, marginTop: 6 }}>{program.outcome}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Commuter passes ── */}
        <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}`, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Route size={18} color={DS.green} />
            <div style={{ color: C.text, fontWeight: 900 }}>Commuter passes on strategic corridors</div>
          </div>
          <div
            className="sp-2col"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}
          >
            {featuredCorridors.map(corridor => {
              const active = membership.commuterPassRoute?.id === corridor.id;
              const liveSignal = routeIntelligence.allSignals.find(s => s.id === corridor.id) ?? null;
              const passPrice = corridor.subscriptionPriceJod;
              return (
                <div
                  key={corridor.id}
                  style={{
                    background: DS.card2, borderRadius: r(16),
                    padding: '16px 16px 14px',
                    border: `1px solid ${active ? `${DS.gold}35` : DS.border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: '0.84rem' }}>{corridor.label}</div>
                    <span style={{ color: active ? DS.gold : DS.cyan, fontSize: '0.72rem', fontWeight: 700 }}>
                      {liveSignal?.forecastDemandScore ?? corridor.predictedDemandScore}/100
                    </span>
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.75rem', lineHeight: 1.55, marginTop: 8 }}>
                    {liveSignal?.nextWaveWindow ?? corridor.autoGroupWindow}
                  </div>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 12 }}
                  >
                    {[
                      { label: 'Shared seat', value: `${liveSignal?.priceQuote.finalPriceJod ?? corridor.sharedPriceJod} JOD` },
                      { label: 'Monthly pass', value: `${passPrice} JOD` },
                      { label: 'Savings', value: liveSignal ? `${liveSignal.priceQuote.discountJod} JOD` : `${corridor.savingsPercent}%` },
                    ].map(item => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: r(12), border: `1px solid ${DS.border}`,
                          background: C.elevated, padding: '10px 10px 9px',
                        }}
                      >
                        <div style={{ color: DS.muted, fontSize: '0.66rem', textTransform: 'uppercase' }}>{item.label}</div>
                        <div style={{ color: C.text, fontWeight: 800, fontSize: '0.78rem', marginTop: 5 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleStartPass(corridor.id)}
                    style={{
                      width: '100%', height: 42, marginTop: 12,
                      borderRadius: '999px', border: 'none',
                      background: active ? DS.gradGold : DS.gradC,
                      color: C.text, fontWeight: 800, cursor: 'pointer',
                    }}
                  >
                    {active ? 'Current pass ✓' : `Start ${corridor.from} pass · ${passPrice} JOD/mo`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Recurring suggestions + Saved reminders ── */}
        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18, marginBottom: 18 }}
        >
          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Route size={18} color={DS.cyan} />
              <div style={{ color: C.text, fontWeight: 900 }}>Suggested recurring routes</div>
            </div>
            {retentionMessage && (
              <div style={{
                marginBottom: 12, borderRadius: r(12),
                border: `1px solid ${DS.cyan}35`, background: `${DS.cyan}12`,
                padding: '11px 12px', color: C.text, fontSize: '0.78rem',
              }}>
                {retentionMessage}
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {recurringSuggestions.map(suggestion => {
                const alreadySaved = Boolean(getRouteReminderForCorridor(suggestion.corridorId));
                return (
                  <div
                    key={suggestion.corridorId}
                    style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>{suggestion.label}</div>
                      <span style={{ color: DS.gold, fontSize: '0.72rem', fontWeight: 700 }}>{suggestion.confidenceScore}/100</span>
                    </div>
                    <div style={{ color: DS.sub, fontSize: '0.75rem', lineHeight: 1.55, marginTop: 6 }}>{suggestion.reason}</div>
                    <div style={{ color: DS.cyan, fontSize: '0.74rem', lineHeight: 1.55, marginTop: 6 }}>
                      {suggestion.priceQuote.finalPriceJod} JOD · {suggestion.recommendedFrequency} at {suggestion.recommendedTime}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button
                        onClick={() => handleSaveReminder(suggestion.corridorId)}
                        style={{
                          height: 38, padding: '0 14px', borderRadius: '999px', border: 'none',
                          background: alreadySaved ? DS.gradG : DS.gradC,
                          color: C.text, fontWeight: 800, cursor: 'pointer',
                        }}
                      >
                        {alreadySaved ? 'Reminder active ✓' : 'Save reminder'}
                      </button>
                      <button
                        onClick={() => nav(`/app/find-ride?from=${encodeURIComponent(suggestion.from)}&to=${encodeURIComponent(suggestion.to)}&search=1`)}
                        style={{
                          height: 38, padding: '0 14px', borderRadius: '999px',
                          border: `1px solid ${DS.border}`, background: DS.card,
                          color: C.text, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Open route
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Sparkles size={18} color={DS.gold} />
              <div style={{ color: C.text, fontWeight: 900 }}>
                Saved reminders {savedReminders.length > 0 && `(${savedReminders.length})`}
              </div>
            </div>
            {savedReminders.length > 0 ? (
              <div style={{ display: 'grid', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {savedReminders.map(reminder => (
                  <div
                    key={reminder.id}
                    style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}
                  >
                    <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>{reminder.label}</div>
                    <div style={{ color: DS.sub, fontSize: '0.75rem', marginTop: 4 }}>
                      {formatRouteReminderSchedule(reminder)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.65 }}>
                Save a route suggestion to see reminders here.
              </div>
            )}
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}
