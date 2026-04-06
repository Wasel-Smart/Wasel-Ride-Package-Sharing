import { useEffect, useMemo, useState } from 'react';
import { BadgeDollarSign, Brain, Route, Sparkles } from 'lucide-react';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { CoreExperienceBanner, DS, PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
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
  hydrateRouteReminders,
  syncRouteReminders,
} from '../../services/movementRetention';
import { useLiveRouteIntelligence } from '../../services/routeDemandIntelligence';
import {
  getFeaturedCorridors,
  getHabitLoopPrograms,
} from '../../config/wasel-movement-network';

function tierLabel(tier: MovementMembershipSnapshot['loyaltyTier']) {
  if (tier === 'infrastructure') return 'Infrastructure';
  if (tier === 'network') return 'Network';
  if (tier === 'dense') return 'Dense';
  return 'Starter';
}

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

  const handleActivatePlus = () => {
    activateWaselPlus();
    setMembership(getMovementMembershipSnapshot());
  };

  const handleStartPass = (routeId: string) => {
    startCommuterPass(routeId);
    setMembership(getMovementMembershipSnapshot());
  };

  const handleSaveReminder = (corridorId: string) => {
    const suggestion = recurringSuggestions.find((item) => item.corridorId === corridorId);
    if (!suggestion) return;

    const reminder = createReminderFromSuggestion(suggestion, user?.id);
    setSavedReminders(getRouteReminders());
    setRetentionMessage(`Reminder saved for ${reminder.label}. ${formatRouteReminderSchedule(reminder)}.`);
  };

  useEffect(() => {
    setSavedReminders(getRouteReminders());
  }, [routeIntelligence.updatedAt]);

  useEffect(() => {
    if (!user?.id) return;
    void hydrateRouteReminders(user.id).then((reminders) => {
      setSavedReminders(reminders);
    });
  }, [user?.id, routeIntelligence.updatedAt]);

  useEffect(() => {
    void syncRouteReminders(user ?? undefined).then((delivered) => {
      if (delivered.length > 0) {
        setSavedReminders(getRouteReminders());
      }
    });
  }, [routeIntelligence.updatedAt, user?.email, user?.phone]);

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji="✨"
          title="Membership"
          titleAr="حركتي"
          sub="Manage credits, commuter passes, and reminders that make repeat travel easier."
          color={DS.gold}
          action={{ label: 'Find a ride', onClick: () => nav('/app/find-ride') }}
        />

        <CoreExperienceBanner
          title="This page should make repeat travel cheaper, simpler, and easier to keep on schedule."
          detail="Use one place to activate benefits, pin your commuter route, and save reminders before the next strong departure window."
          tone={DS.gold}
        />

        <div className="sp-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            { label: 'Membership', value: membership.plusActive ? 'Active' : 'Inactive', detail: membership.plusActive ? 'Wasel Plus benefits are live' : 'Activate to unlock route-level rewards', color: DS.gold },
            { label: 'Credits', value: String(membership.movementCredits), detail: 'Earned from rides, routes, and package activity', color: DS.green },
            { label: 'Streak', value: `${membership.streakDays} days`, detail: 'Tracked across your regular travel', color: DS.cyan },
            { label: 'Tier', value: tierLabel(membership.loyaltyTier), detail: dailySignal ? `${dailySignal.priceQuote.finalPriceJod} JOD on your daily route` : membership.commuterPassRoute?.label ?? 'No commuter pass selected yet', color: DS.blue },
          ].map((item) => (
            <div key={item.label} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.03))', borderRadius: r(18), padding: '18px 18px 16px', border: `1px solid ${DS.border}`, boxShadow: '0 12px 28px rgba(0,0,0,0.16)' }}>
              <div style={{ color: item.color, fontWeight: 900, fontSize: '1.18rem', marginBottom: 4 }}>{item.value}</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{item.label}</div>
              <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.45, marginTop: 4 }}>{item.detail}</div>
            </div>
          ))}
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 18, marginBottom: 18 }}>
          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <BadgeDollarSign size={18} color={DS.gold} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Membership overview</div>
            </div>
            <div style={{ color: DS.sub, fontSize: '0.84rem', lineHeight: 1.65, marginBottom: 18 }}>
              Membership should help you spend less, remember your usual route, and get back into booking faster.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[ 
                membership.plusActive
                  ? 'Wasel Plus is active and your route benefits are already stacking up.'
                  : 'Activate Wasel Plus to start stacking credits, route savings, and priority matching.',
                membership.commuterPassRoute
                  ? `Your commuter pass is pinned to ${membership.commuterPassRoute.label} at about ${membership.commuterPassRoute.subscriptionPriceJod} JOD for repeat monthly travel.`
                  : 'Choose a commuter route to make repeat travel easier to manage.',
                membership.dailyRoute
                  ? `Your daily route is centered on ${membership.dailyRoute.label}, currently ${dailySignal?.priceQuote.finalPriceJod ?? membership.dailyRoute.sharedPriceJod} JOD after credits and ${membership.dailyRoute.savingsPercent}% cheaper than solo movement when shared demand is healthy.`
                  : 'Once you start moving more often, Wasel will remember your preferred route.',
              ].map((line) => (
                <div key={line} style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}`, color: '#fff', fontSize: '0.8rem', lineHeight: 1.55 }}>
                  {line}
                </div>
              ))}
            </div>
            <button onClick={handleActivatePlus} style={{ width: '100%', height: 50, marginTop: 16, borderRadius: '999px', border: 'none', background: DS.gradGold, color: '#fff', fontWeight: 800, fontFamily: DS.F, cursor: 'pointer', boxShadow: `0 8px 24px ${DS.gold}35` }}>
              {membership.plusActive ? 'Refresh membership benefits' : 'Activate Wasel Plus'}
            </button>
          </div>

          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Brain size={18} color={DS.cyan} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Helpful programs</div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {habitPrograms.map((program) => (
                <div key={program.id} style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>{program.title}</div>
                  <div style={{ color: DS.sub, fontSize: '0.75rem', lineHeight: 1.55, marginTop: 4 }}>{program.summary}</div>
                  <div style={{ color: DS.gold, fontSize: '0.72rem', fontWeight: 700, marginTop: 6 }}>{program.outcome}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}`, marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Route size={18} color={DS.green} />
            <div style={{ color: '#fff', fontWeight: 900 }}>Commuter passes</div>
          </div>
          <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
            {featuredCorridors.map((corridor) => {
              const active = membership.commuterPassRoute?.id === corridor.id;
              const liveSignal = routeIntelligence.allSignals.find((signal) => signal.id === corridor.id) ?? null;
              return (
                <div key={corridor.id} style={{ background: DS.card2, borderRadius: r(16), padding: '16px 16px 14px', border: `1px solid ${active ? `${DS.gold}35` : DS.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem' }}>{corridor.label}</div>
                    <span style={{ color: active ? DS.gold : DS.cyan, fontSize: '0.72rem', fontWeight: 700 }}>
                      {liveSignal?.forecastDemandScore ?? corridor.predictedDemandScore}/100
                    </span>
                  </div>
                  <div style={{ color: DS.sub, fontSize: '0.75rem', lineHeight: 1.55, marginTop: 8 }}>
                    {liveSignal?.nextWaveWindow ?? corridor.autoGroupWindow}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8, marginTop: 12 }}>
                    {[
                      { label: 'Shared seat', value: `${liveSignal?.priceQuote.finalPriceJod ?? corridor.sharedPriceJod} JOD` },
                      { label: 'Monthly pass', value: `${corridor.subscriptionPriceJod} JOD` },
                      { label: 'Savings', value: liveSignal ? `${liveSignal.priceQuote.discountJod} JOD` : `${corridor.savingsPercent}%` },
                    ].map((item) => (
                      <div key={item.label} style={{ borderRadius: r(12), border: `1px solid ${DS.border}`, background: 'rgba(255,255,255,0.03)', padding: '10px 10px 9px' }}>
                        <div style={{ color: DS.muted, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
                        <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.78rem', marginTop: 5 }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => handleStartPass(corridor.id)} style={{ width: '100%', height: 42, marginTop: 12, borderRadius: '999px', border: 'none', background: active ? DS.gradGold : DS.gradC, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    {active ? 'Current commuter pass' : `Start ${corridor.from} pass`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sp-2col" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 18, marginBottom: 18 }}>
          <div style={{ background: DS.card, borderRadius: r(20), padding: '24px', border: `1px solid ${DS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Route size={18} color={DS.cyan} />
              <div style={{ color: '#fff', fontWeight: 900 }}>Recommended reminders</div>
            </div>
            {retentionMessage ? (
              <div style={{ marginBottom: 12, borderRadius: r(12), border: `1px solid ${DS.cyan}35`, background: `${DS.cyan}12`, padding: '11px 12px', color: '#fff', fontSize: '0.78rem' }}>
                {retentionMessage}
              </div>
            ) : null}
            <div style={{ display: 'grid', gap: 10 }}>
              {recurringSuggestions.map((suggestion) => {
                const alreadySaved = Boolean(getRouteReminderForCorridor(suggestion.corridorId));
                return (
                  <div key={suggestion.corridorId} style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>{suggestion.label}</div>
                      <span style={{ color: DS.gold, fontSize: '0.72rem', fontWeight: 700 }}>{suggestion.confidenceScore}/100</span>
                    </div>
                    <div style={{ color: DS.sub, fontSize: '0.75rem', lineHeight: 1.55, marginTop: 6 }}>{suggestion.reason}</div>
                    <div style={{ color: DS.cyan, fontSize: '0.74rem', lineHeight: 1.55, marginTop: 6 }}>
                      {suggestion.priceQuote.finalPriceJod} JOD now | {suggestion.recommendedFrequency} at {suggestion.recommendedTime}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      <button onClick={() => handleSaveReminder(suggestion.corridorId)} style={{ height: 38, padding: '0 14px', borderRadius: '999px', border: 'none', background: alreadySaved ? DS.gradG : DS.gradC, color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                        {alreadySaved ? 'Reminder active' : 'Enable reminder'}
                      </button>
                      <button onClick={() => nav(`/app/find-ride?from=${encodeURIComponent(suggestion.from)}&to=${encodeURIComponent(suggestion.to)}&search=1`)} style={{ height: 38, padding: '0 14px', borderRadius: '999px', border: `1px solid ${DS.border}`, background: DS.card, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
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
              <div style={{ color: '#fff', fontWeight: 900 }}>Saved reminders</div>
            </div>
            {savedReminders.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {savedReminders.slice(0, 5).map((reminder) => (
                  <div key={reminder.id} style={{ background: DS.card2, borderRadius: r(12), padding: '12px 14px', border: `1px solid ${DS.border}` }}>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.82rem' }}>{reminder.label}</div>
                    <div style={{ color: DS.sub, fontSize: '0.75rem', marginTop: 4 }}>{formatRouteReminderSchedule(reminder)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: DS.sub, fontSize: '0.8rem', lineHeight: 1.65 }}>
                As soon as you pin a recurring route, Wasel can nudge you before the next strong departure window.
              </div>
            )}
          </div>
        </div>

        <div style={{ background: DS.card, borderRadius: r(20), padding: '22px', border: `1px solid ${DS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Sparkles size={18} color={DS.blue} />
            <div style={{ color: '#fff', fontWeight: 900 }}>Why this helps</div>
          </div>
          <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.65 }}>
            Once you have credits, a saved route, a commuter pass, and lower shared pricing, getting around takes less effort and fewer repeated decisions.
          </div>
        </div>
      </PageShell>
    </Protected>
  );
}
