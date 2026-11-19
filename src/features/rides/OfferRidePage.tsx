/**
 * OfferRidePage — pure render shell.
 *
 * All state, effects, and business logic live in useOfferRideController.
 * This file is intentionally thin: it only maps controller output to JSX.
 */

import { Brain, CheckCircle2, Network } from 'lucide-react';
import { PageShell, Protected, r, SectionHead } from '../../pages/waselServiceShared';
import { C } from '../../utils/wasel-ds';
import { OfferRideFormPanel } from './components/OfferRideFormPanel';
import { OfferRideIncomingRequests } from './components/OfferRideIncomingRequests';
import { useOfferRideController } from './hooks/useOfferRideController';

export function OfferRidePage() {
  const {
    nav,
    ar,
    form,
    step,
    busyState,
    formError,
    draftMessage,
    submitted,
    updateForm,
    moveToStep,
    resetForm,
    setDraftMessage,
    offerGate,
    packageGate,
    driverReadiness,
    readinessHeadline,
    readinessDetail,
    readinessStepLabels,
    driverPlan,
    selectedSignal,
    corridorCount,
    recentPostedRides,
    incomingRequests,
    marketplaceNodes,
    quickMetrics,
    city,
    capacity,
    departureWindow,
    handlePostRide,
    tx,
    GENDER_META,
    DS,
  } = useOfferRideController();

  return (
    <Protected>
      <PageShell>
        <SectionHead
          emoji={<Network size={24} />}
          title={tx('dashboard.offerRide')}
          titleAr="اعرض مشوار"
          sub={ar ? 'انشر مسارًا وسعرًا وسعة وخيار الطرود.' : 'Publish a corridor, fare, capacity, and package option.'}
          color={DS.blue}
        />

        {/* ── Readiness / package gate banner ── */}
        {(!offerGate.allowed || (form.acceptsPackages && !packageGate.allowed)) && (
          <div
            style={{
              marginBottom: 18,
              background: C.goldDim,
              border: `1px solid ${DS.gold}35`,
              borderRadius: r(18),
              padding: '16px 18px',
              color: C.text,
            }}
          >
            <div style={{ fontWeight: 800, marginBottom: 6 }}>
              {!offerGate.allowed
                ? readinessHeadline
                : ar ? 'إكمال متطلبات الطرود' : 'Finish package requirements'}
            </div>
            <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>
              {!offerGate.allowed
                ? readinessDetail
                : packageGate.reason ?? 'Finish the package checks before carrying packages.'}
            </div>
            {!offerGate.allowed && (
              <div style={{ color: DS.sub, fontSize: '0.78rem', lineHeight: 1.5, marginTop: 8 }}>
                {ar
                  ? 'يتم حفظ تفاصيل المسار تلقائيًا على هذا الجهاز. يمكنك نشره فور اعتماد مستندات السائق.'
                  : 'Your route details save automatically on this device. You can publish as soon as your driver documents are approved.'}
              </div>
            )}
            {!offerGate.allowed && (
              <ol
                aria-label={ar ? 'تقدم إعداد السائق' : 'Driver setup progress'}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))',
                  gap: 8,
                  listStyle: 'none',
                  padding: 0,
                  margin: '14px 0 0',
                }}
              >
                {driverReadiness.steps.map((readinessStep, index) => (
                  <li
                    key={readinessStep.id}
                    style={{
                      display: 'flex',
                      gap: 8,
                      alignItems: 'center',
                      border: `1px solid ${readinessStep.complete ? `${DS.green}55` : DS.border}`,
                      background: readinessStep.complete ? C.greenDim : DS.card2,
                      borderRadius: r(12),
                      padding: '9px 10px',
                      color: readinessStep.complete ? C.text : DS.sub,
                      fontSize: '0.72rem',
                      lineHeight: 1.35,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        flex: '0 0 20px',
                        height: 20,
                        borderRadius: '50%',
                        background: readinessStep.complete ? DS.green : C.elevated,
                        color: readinessStep.complete ? '#050B12' : DS.muted,
                        fontWeight: 800,
                        fontSize: '0.68rem',
                      }}
                    >
                      {readinessStep.complete ? '✓' : index + 1}
                    </span>
                    <span>{readinessStepLabels?.[readinessStep.id] ?? readinessStep.label}</span>
                  </li>
                ))}
              </ol>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
              <button
                aria-label={driverReadiness.status === 'pending_review'
                  ? (ar ? 'متابعة حالة المراجعة' : 'Check approval status')
                  : tx('offerRidePage.finish_checks')}
                onClick={() => { void nav('/app/trust'); }}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: '99px',
                  border: 'none',
                  background: DS.gradG,
                  color: C.text,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {driverReadiness.status === 'pending_review'
                  ? ar ? 'متابعة حالة المراجعة' : 'Check approval status'
                  : tx('offerRidePage.finish_checks')}
              </button>
              <button
                aria-label={tx('offerRidePage.driver_console')}
                onClick={() => { void nav('/app/driver'); }}
                style={{
                  height: 40,
                  padding: '0 16px',
                  borderRadius: '99px',
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tx('offerRidePage.driver_console')}
              </button>
            </div>
          </div>
        )}

        {/* ── Step progress bar ── */}
        {!submitted && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }} role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step} aria-label={ar ? `الخطوة ${step} من 3` : `Step ${step} of 3`}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 5,
                  borderRadius: 999,
                  background: s <= step ? DS.cyan : C.elevated,
                  border: `1px solid ${s <= step ? DS.cyan : DS.border}`,
                  transition: 'background 0.25s',
                }}
                title={`Step ${s} of 3`}
              />
            ))}
          </div>
        )}

        {/* Incoming requests shown BEFORE the form */}
        {incomingRequests.length > 0 && (
          <OfferRideIncomingRequests
            incomingRequests={incomingRequests}
            onStatusMessage={setDraftMessage}
          />
        )}

        <div
          className="sp-2col"
          style={{ display: 'grid', gridTemplateColumns: '1.18fr 0.82fr', gap: 18, alignItems: 'start' }}
        >
          {/* ── Main column: form or success state ── */}
          <div>
            {submitted ? (
              <div
                style={{
                  background: DS.card,
                  borderRadius: r(16),
                  padding: '44px 26px',
                  textAlign: 'center',
                  border: `1px solid ${DS.border}`,
                }}
              >
                <div
                  style={{
                    width: 64, height: 64, borderRadius: r(16), margin: '0 auto 18px',
                    display: 'grid', placeItems: 'center',
                    background: C.greenDim, border: `1px solid ${DS.green}35`, color: DS.green,
                  }}
                >
                  <CheckCircle2 size={30} />
                </div>
                <h2 style={{ color: DS.green, fontWeight: 800, fontSize: '1.6rem', margin: '0 0 12px' }}>
                  {tx('offerRidePage.ride_offer_is_live')}
                </h2>
                <p style={{ color: DS.sub, margin: 0 }}>
                  <strong style={{ color: C.text }}>{city(form.from)}</strong>{' '}
                  {tx('offerRidePage.to')}{' '}
                  <strong style={{ color: C.text }}>{city(form.to)}</strong>{' '}
                  {tx('offerRidePage.is_now_open_across_the_movement_network')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginTop: 22 }}>
                  {[
                    { label: ar ? 'المسارات المباشرة' : 'Live routes', value: corridorCount > 0 ? `${corridorCount + 1}` : '1' },
                    { label: ar ? 'الرحلة الكاملة' : 'Full trip', value: driverPlan ? `${driverPlan.grossWhenFullJod} ${ar ? 'دينار' : 'JOD'}` : '--' },
                    { label: ar ? 'الوضع' : 'Mode', value: form.acceptsPackages ? (ar ? `طرود ${capacity(form.packageCapacity)}` : `Packages ${form.packageCapacity}`) : (ar ? 'ركاب' : 'Passengers') },
                  ].map(item => (
                    <div key={item.label} style={{ background: DS.card2, borderRadius: r(16), padding: '14px 15px', border: `1px solid ${DS.border}` }}>
                      <div style={{ color: DS.muted, fontSize: '0.68rem', textTransform: 'uppercase' }}>{item.label}</div>
                      <div style={{ color: C.text, fontWeight: 800, fontSize: '0.86rem', marginTop: 6 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <button
                  aria-label={tx('offerRidePage.post_another_route')}
                  onClick={resetForm}
                  style={{ height: 46, marginTop: 24, padding: '0 20px', borderRadius: '999px', border: 'none', background: DS.gradC, color: C.text, fontWeight: 800, cursor: 'pointer' }}
                >
                  {tx('offerRidePage.post_another_route')}
                </button>
              </div>
            ) : (
              <OfferRideFormPanel
                form={form}
                step={step}
                corridorCount={corridorCount}
                recentPostedRides={recentPostedRides}
                draftMessage={draftMessage}
                formError={formError}
                busyState={busyState}
                genderMeta={GENDER_META}
                driverPlan={driverPlan}
                liveSignal={selectedSignal}
                onUpdate={updateForm}
                onStepChange={moveToStep}
                onSubmit={() => { void handlePostRide(); }}
              />
            )}
          </div>

          {/* ── Sidebar: route intel + quick actions ── */}
          <div style={{ display: 'grid', gap: 14 }}>
            {/* Route launch card */}
            <div style={{ background: `linear-gradient(135deg, ${C.cyanDim}, ${C.cardSolid} 62%, ${C.goldDim})`, borderRadius: r(22), padding: '20px', border: `1px solid ${DS.border}` }}>
              <div style={{ color: DS.cyan, fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
                {tx('offerRidePage.launch_route')}
              </div>
              <h2 style={{ color: C.text, fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.1, margin: '8px 0 10px' }}>
                {city(form.from)} {tx('offerRidePage.to_2')}{city(form.to)}
              </h2>
              <div style={{ color: DS.sub, fontSize: '0.82rem', lineHeight: 1.55 }}>
                {ar
                  ? 'راقب الطلب والسعة والتسعير قبل نشر هذا المسار.'
                  : selectedSignal?.recommendedReason ?? driverPlan?.waselBrainNote ?? 'Choose the route, keep the price sharp, and open supply fast.'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 16 }}>
                {quickMetrics.map(item => (
                  <div key={item.label} style={{ background: C.elevated, borderRadius: r(16), border: `1px solid ${DS.border}`, padding: '14px 14px 12px' }}>
                    <div style={{ color: item.color, fontWeight: 800, fontSize: '1rem' }}>{item.value}</div>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: '0.74rem', marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Corridor pulse */}
            <div style={{ background: DS.card, borderRadius: r(20), padding: '18px', border: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Brain size={18} color={DS.cyan} aria-hidden="true" />
                <div style={{ color: C.text, fontWeight: 900 }}>{tx('offerRidePage.corridor_pulse')}</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  selectedSignal
                    ? ar ? `${selectedSignal.activeDemandAlerts} تنبيه | ${selectedSignal.liveBookings} حجز` : `${selectedSignal.activeDemandAlerts} alerts | ${selectedSignal.liveBookings} bookings`
                    : ar ? `${corridorCount} مسار مباشر على هذا الممر` : `${corridorCount} live route${corridorCount === 1 ? '' : 's'} on this lane`,
                  selectedSignal
                    ? ar ? `نافذة الانطلاق التالية: ${departureWindow(selectedSignal.nextWaveWindow)}` : `${selectedSignal.nextWaveWindow} | ${selectedSignal.recommendedPickupPoint}`
                    : ar ? 'تظهر أفضل نافذة للانطلاق هنا' : (driverPlan?.corridor.autoGroupWindow ?? 'Best pickup window appears here'),
                  selectedSignal
                    ? ar ? 'بيانات الحركة المباشرة تدعم هذا المسار.' : selectedSignal.productionSources.slice(0, 3).join(' | ')
                    : driverPlan
                      ? ar ? `${driverPlan.emptySeatCostJod} دينار تكلفة المقعد الشاغر` : `${driverPlan.emptySeatCostJod} JOD lost per empty seat`
                      : ar ? 'تظهر معلومات المسار بعد الاختيار' : 'Route intelligence appears after lane selection',
                ].map(line => (
                  <div key={line} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px', color: C.text, fontSize: '0.78rem', lineHeight: 1.55 }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Add-on demand nodes */}
            <div style={{ background: DS.card, borderRadius: r(20), padding: '18px', border: `1px solid ${DS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Network size={18} color={DS.green} aria-hidden="true" />
                <div style={{ color: C.text, fontWeight: 900 }}>{tx('offerRidePage.add_on_demand')}</div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {marketplaceNodes.map(node => (
                  <div key={node.id} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px' }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: '0.8rem' }}>{ar ? 'خدمة إضافية مرتبطة بالمسار' : node.title}</div>
                    <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.5, marginTop: 4 }}>{ar ? 'اربط هذه الخدمة بنفس الممر لتبقى الحركة والطرود والدعم في سياق واحد.' : node.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ background: DS.card, borderRadius: r(20), padding: '18px', border: `1px solid ${DS.border}` }}>
              <div style={{ color: C.text, fontWeight: 800, marginBottom: 12 }}>{tx('offerRidePage.quick_actions')}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {driverReadiness.steps.filter(s => !s.complete).slice(0, 2).map(s => (
                  <div key={s.id} style={{ borderRadius: r(14), border: `1px solid ${DS.border}`, background: DS.card2, padding: '12px 14px' }}>
                    <div style={{ color: C.text, fontWeight: 800, fontSize: '0.8rem' }}>{s.label}</div>
                    <div style={{ color: DS.muted, fontSize: '0.74rem', lineHeight: 1.5, marginTop: 4 }}>{s.description}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                <button
                  aria-label={tx('offerRidePage.open_driver_console')}
                  onClick={() => { void nav('/app/driver'); }}
                  style={{ height: 42, borderRadius: '999px', border: 'none', background: DS.gradC, color: C.text, fontWeight: 800, cursor: 'pointer' }}
                >
                  {tx('offerRidePage.open_driver_console')}
                </button>
                <button
                  aria-label={tx('offerRidePage.trust_center')}
                  onClick={() => { void nav('/app/trust'); }}
                  style={{ height: 42, borderRadius: '999px', border: `1px solid ${DS.border}`, background: DS.card2, color: C.text, fontWeight: 800, cursor: 'pointer' }}
                >
                  {tx('offerRidePage.trust_center')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {incomingRequests.length === 0 && (
          <OfferRideIncomingRequests
            incomingRequests={incomingRequests}
            onStatusMessage={setDraftMessage}
          />
        )}
      </PageShell>
    </Protected>
  );
}

export default OfferRidePage;
