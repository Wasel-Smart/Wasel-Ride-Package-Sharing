import { Shield } from 'lucide-react';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, r } from '../../../pages/waselServiceShared';
import { C } from '../../../utils/wasel-ds';
import type { PostedRide } from '../../../services/journeyLogistics';
import type { LiveCorridorSignal } from '../../../services/routeDemandIntelligence';
import type { DriverRoutePlan } from '../../../config/wasel-movement-network';
import { cityLabel, OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS, packageCapacityLabel } from '../offerRideContent';
import { tx } from '../../../locales/tx';
import { useLanguage } from '../../../contexts/LanguageContext';

type OfferRideForm = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number;
  price: number;
  gender: string;
  prayer: boolean;
  carModel: string;
  note: string;
  acceptsPackages: boolean;
  packageCapacity: string;
  packageNote: string;
};

type OfferRideFormPanelProps = {
  form: OfferRideForm;
  step: number;
  corridorCount: number;
  recentPostedRides: PostedRide[];
  draftMessage: string | null;
  formError: string | null;
  busyState: 'idle' | 'posting';
  genderMeta: Record<string, { label: string; color: string }>;
  driverPlan: DriverRoutePlan | null;
  liveSignal?: LiveCorridorSignal | null;
  onUpdate: (key: string, value: string | number | boolean) => void;
  onStepChange: (step: number) => void;
  onSubmit: () => void;
};

export function OfferRideFormPanel({
  form,
  step,
  corridorCount,
  recentPostedRides,
  draftMessage,
  formError,
  busyState,
  genderMeta,
  driverPlan,
  liveSignal = null,
  onUpdate,
  onStepChange,
  onSubmit,
}: OfferRideFormPanelProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const local = (en: string, arText: string) => (ar ? arText : en);
  const city = (value: string) => cityLabel(value, language);
  const capacity = (value: string) => packageCapacityLabel(value, language);
  const errorDisplay = formError ? (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        marginBottom: 16,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: `${DS.gold}12`,
        border: `1px solid ${DS.gold}30`,
        borderRadius: r(14),
        padding: '12px 14px',
        color: C.text,
        fontSize: '0.84rem',
      }}
    >
      <Shield size={16} color={DS.gold} />
      <span>{formError}</span>
    </div>
  ) : null;

  return (
    <div
      style={{
        background: DS.card,
        borderRadius: r(20),
        padding: '28px 28px',
        border: `1px solid ${DS.border}`,
      }}
    >
      <div
        className="sp-2col"
        style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 14, marginBottom: 20 }}
      >
        <div
          style={{
            background: DS.card2,
            borderRadius: r(16),
            padding: '16px 18px',
            border: `1px solid ${DS.border}`,
          }}
        >
          <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
            {tx('offerRideFormPanel.posting_confidence')}
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              {
                label: local('Live corridor', 'الممر المباشر'),
                value:
                  corridorCount > 0
                    ? local(`${corridorCount} rides already posted on this route`, `${corridorCount} رحلات منشورة على هذا المسار`)
                    : local('No live rides on this route yet', 'لا توجد رحلات مباشرة على هذا المسار بعد'),
              },
              {
                label: local('Route signal', 'إشارة المسار'),
                value: liveSignal
                  ? local(`${liveSignal.forecastDemandScore}/100 demand score with ${liveSignal.pricePressure} pricing`, `درجة الطلب ${liveSignal.forecastDemandScore}/100 مع تسعير متوازن`)
                  : driverPlan
                    ? local(`${driverPlan.corridor.predictedDemandScore}/100 demand score with ${driverPlan.corridor.density} density`, `درجة الطلب ${driverPlan.corridor.predictedDemandScore}/100 مع كثافة مناسبة`)
                    : local('Pick a corridor to unlock route intelligence', 'اختر مسارًا لعرض ذكاء الطريق'),
              },
              {
                label: local('Live proof', 'الإثبات المباشر'),
                value: liveSignal
                  ? local(
                    `${liveSignal.liveSearches} searches | ${liveSignal.liveBookings} bookings | ${liveSignal.activeDemandAlerts} alerts`,
                    `${liveSignal.liveSearches} بحث | ${liveSignal.liveBookings} حجز | ${liveSignal.activeDemandAlerts} تنبيه`,
                  )
                  : local('Production proof appears when Wasel sees corridor demand', 'يظهر الإثبات عند وجود طلب على المسار'),
              },
              {
                label: local('Package visibility', 'توفّر الطرود'),
                value: form.acceptsPackages
                  ? local(`Eligible for package matching (${form.packageCapacity})`, `مؤهل لمطابقة الطرود (${capacity(form.packageCapacity)})`)
                  : local('Passengers only', 'للركاب فقط'),
              },
              { label: local('Draft status', 'حالة المسودة'), value: draftMessage || local('Draft autosaves on this device.', 'يتم حفظ المسودة تلقائيًا على هذا الجهاز.') },
            ].map(item => (
              <div
                key={item.label}
                style={{
                  borderRadius: r(12),
                  border: `1px solid ${DS.border}`,
                  padding: '12px 13px',
                  background: DS.card,
                }}
              >
                <div
                  style={{
                    color: DS.muted,
                    fontSize: '0.68rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0,
                  }}
                >
                  {item.label}
                </div>
                <div style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem', marginTop: 6 }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            background: DS.card2,
            borderRadius: r(16),
            padding: '16px 18px',
            border: `1px solid ${DS.border}`,
          }}
        >
          <div style={{ color: C.text, fontWeight: 800, marginBottom: 10 }}>
            {tx('offerRideFormPanel.recent_corridor_posts')}
          </div>
          {recentPostedRides.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {recentPostedRides.map(ride => (
                <div
                  key={ride.id}
                  style={{
                    borderRadius: r(12),
                    border: `1px solid ${DS.border}`,
                    padding: '12px 13px',
                    background: DS.card,
                  }}
                >
                  <div style={{ color: C.text, fontWeight: 700, fontSize: '0.82rem' }}>
                    {city(ride.from)} {tx('offerRideFormPanel.to')}
                    {city(ride.to)}
                  </div>
                  <div style={{ color: DS.muted, fontSize: '0.74rem', marginTop: 4 }}>
                    {ride.date} {tx('offerRideFormPanel.at')}
                    {ride.time} | {ride.carModel || local('Vehicle pending', 'السيارة قيد التحديد')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: DS.muted, fontSize: '0.8rem' }}>
              {tx(
                'offerRideFormPanel.this_route_will_become_the_first_visible_posting_for_the_current_corridor',
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[1, 2, 3].map(item => (
          <div
            key={item}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: step >= item ? DS.gradC : DS.card2,
            }}
          />
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
          <h3 style={{ color: C.text, fontWeight: 800, gridColumn: '1/-1', margin: '0 0 4px' }}>
            {tx('offerRideFormPanel.route_details')}
          </h3>
          {[
            { label: local('From', 'من'), key: 'from' as const },
            { label: local('To', 'إلى'), key: 'to' as const },
          ].map(field => (
            <div key={field.label}>
              <label
                style={{
                  display: 'block',
                  color: DS.muted,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {field.label}
              </label>
              <select
                value={form[field.key]}
                onChange={event => onUpdate(field.key, event.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: r(10),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {CITIES.map(city => (
                  <option key={city} value={city} style={{ background: DS.card }}>
                    {cityLabel(city, language)}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label
              style={{
                display: 'block',
                color: DS.muted,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {tx('common.date')}
            </label>
            <input
              type="date"
              value={form.date}
              onChange={event => onUpdate('date', event.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: r(10),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                fontFamily: DS.F,
                fontSize: '0.9rem',
                outline: 'none',
                colorScheme: 'dark',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                color: DS.muted,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {tx('common.time')}
            </label>
            <input
              type="time"
              value={form.time}
              onChange={event => onUpdate('time', event.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: r(10),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                fontFamily: DS.F,
                fontSize: '0.9rem',
                outline: 'none',
                colorScheme: 'dark',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ gridColumn: '1/-1' }}>{errorDisplay}</div>
          <button
            data-testid="offer-ride-step-1"
            onClick={() => onStepChange(2)}
            style={{
              gridColumn: '1/-1',
              height: 50,
              borderRadius: r(14),
              border: 'none',
              background: DS.gradC,
              color: C.text,
              fontWeight: 800,
              fontFamily: DS.F,
              fontSize: '0.95rem',
              cursor: 'pointer',
              boxShadow: `0 4px 20px ${DS.cyan}30`,
            }}
          >
            {tx('common.continue')}
          </button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 style={{ color: C.text, fontWeight: 800, margin: '0 0 4px' }}>
            {tx('offerRideFormPanel.seats_pricing_and_capacity')}
          </h3>
          {driverPlan && (
            <div
              className="sp-3col"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}
            >
              {[
                {
                  label: local('Recommended seat price', 'سعر المقعد المقترح'),
                  value: `${driverPlan.recommendedSeatPriceJod} JOD`,
                  detail: local('Cheaper than solo movement while protecting fill rate', 'أوفر من التنقل الفردي ويحافظ على امتلاء الرحلة'),
                },
                {
                  label: local('Full route gross', 'إيراد المسار عند الامتلاء'),
                  value: `${driverPlan.grossWhenFullJod} JOD`,
                  detail: local(`${driverPlan.corridor.fillTargetSeats} seats is the target load for this corridor`, `${driverPlan.corridor.fillTargetSeats} مقاعد هي سعة الهدف لهذا المسار`),
                },
                {
                  label: local('Best pickup point', 'أفضل نقطة انطلاق'),
                  value:
                    liveSignal?.recommendedPickupPoint ??
                    driverPlan.corridor.pickupPoints[0] ??
                    local('Trusted corridor node', 'نقطة موثوقة على المسار'),
                  detail: liveSignal?.nextWaveWindow ?? driverPlan.corridor.autoGroupWindow,
                },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    borderRadius: r(14),
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    padding: '13px 14px',
                  }}
                >
                  <div
                    style={{
                      color: DS.muted,
                      fontSize: '0.68rem',
                      textTransform: 'uppercase',
                      letterSpacing: 0,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{ color: C.text, fontWeight: 800, fontSize: '0.84rem', marginTop: 6 }}
                  >
                    {item.value}
                  </div>
                  <div
                    style={{ color: DS.sub, fontSize: '0.73rem', lineHeight: 1.45, marginTop: 5 }}
                  >
                    {item.detail}
                  </div>
                </div>
              ))}
            </div>
          )}
          {[
            { label: local('Available Seats', 'المقاعد المتاحة'), key: 'seats' as const, min: 1, max: 7 },
            { label: local('Price per Seat (JOD)', 'سعر المقعد (دينار)'), key: 'price' as const, min: 1, max: 50 },
          ].map(field => (
            <div key={field.label}>
              <label
                style={{
                  display: 'block',
                  color: DS.muted,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {field.label}
              </label>
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={form[field.key]}
                onChange={event => onUpdate(field.key, Number(event.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: r(10),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
          {driverPlan && (
            <div
              style={{
                borderRadius: r(14),
                border: `1px solid ${DS.cyan}24`,
                background: `${DS.cyan}08`,
                padding: '13px 14px',
              }}
            >
              <div style={{ color: C.text, fontWeight: 800, fontSize: '0.82rem' }}>
                {tx('offerRideFormPanel.wasel_brain_recommendation')}
              </div>
              <div style={{ color: DS.sub, fontSize: '0.76rem', lineHeight: 1.6, marginTop: 6 }}>
                {driverPlan.waselBrainNote} {tx('offerRideFormPanel.empty_seat_risk_is_about')}
                {driverPlan.emptySeatCostJod}{' '}
                {tx('offerRideFormPanel.jod_per_open_seat_and_package_ready_supply_can_add_about')}{' '}
                {driverPlan.packageBonusJod} {tx('offerRideFormPanel.jod_on_this_route')}
                {liveSignal
                  ? local(
                    ` Live route proof shows ${liveSignal.routeOwnershipScore}/100 ownership with ${liveSignal.productionSources[0]}.`,
                    ` يوضح الدليل المباشر ملكية بمقدار ${liveSignal.routeOwnershipScore}/100.`,
                  )
                  : ''}
              </div>
            </div>
          )}
          <div>
            <label
              style={{
                display: 'block',
                color: DS.muted,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {tx('services.ridesharing.carModel')}
            </label>
            <input
              placeholder={tx('offerRideFormPanel.e_g_toyota_camry_2023')}
              value={form.carModel}
              onChange={event => onUpdate('carModel', event.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: r(10),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                fontFamily: DS.F,
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            onClick={() => onUpdate('acceptsPackages', !form.acceptsPackages)}
            style={{
              padding: '12px 18px',
              borderRadius: r(10),
              border: `1px solid ${form.acceptsPackages ? DS.green : DS.border}`,
              background: form.acceptsPackages ? `${DS.green}10` : DS.card2,
              color: form.acceptsPackages ? DS.green : DS.sub,
              fontFamily: DS.F,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {tx('offerRideFormPanel.package_network')}{' '}
            {form.acceptsPackages ? 'Accepting packages on this ride' : 'Passengers only'}
          </button>
          {form.acceptsPackages && (
            <div>
              <label
                style={{
                  display: 'block',
                  color: DS.muted,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {tx('offerRideFormPanel.package_capacity')}
              </label>
              <select
                value={form.packageCapacity}
                onChange={event => onUpdate('packageCapacity', event.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: r(10),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {OFFER_RIDE_PACKAGE_CAPACITY_OPTIONS.map(size => (
                  <option key={size} value={size} style={{ background: DS.card }}>
                    {capacity(size)}
                  </option>
                ))}
              </select>
            </div>
          )}
          {errorDisplay}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onStepChange(1)}
              style={{
                flex: 1,
                height: 50,
                borderRadius: r(14),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: DS.sub,
                fontFamily: DS.F,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tx('common.back')}
            </button>
            <button
              data-testid="offer-ride-step-2"
              onClick={() => onStepChange(3)}
              style={{
                flex: 2,
                height: 50,
                borderRadius: r(14),
                border: 'none',
                background: DS.gradC,
                color: C.text,
                fontWeight: 800,
                fontFamily: DS.F,
                cursor: 'pointer',
                boxShadow: `0 4px 20px ${DS.cyan}30`,
              }}
            >
              {tx('common.continue')}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'grid', gap: 14 }}>
          <h3 style={{ color: C.text, fontWeight: 800, margin: '0 0 4px' }}>
            {tx('offerRideFormPanel.preferences_and_connected_delivery')}
          </h3>
          <div>
            <label
              style={{
                display: 'block',
                color: DS.muted,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              {tx('profileExpanded.genderPreference')}
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(genderMeta).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => onUpdate('gender', key)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '99px',
                    border: `1px solid ${form.gender === key ? value.color : DS.border}`,
                    background: form.gender === key ? `${value.color}15` : DS.card2,
                    color: form.gender === key ? value.color : DS.sub,
                    fontFamily: DS.F,
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                  }}
                >
                  {value.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => onUpdate('prayer', !form.prayer)}
            style={{
              padding: '12px 18px',
              borderRadius: r(10),
              border: `1px solid ${form.prayer ? DS.gold : DS.border}`,
              background: form.prayer ? `${DS.gold}10` : DS.card2,
              color: form.prayer ? DS.gold : DS.sub,
              fontFamily: DS.F,
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {tx('offerRideFormPanel.prayer_stops')}
            {form.prayer ? 'Enabled' : 'Optional'}
          </button>
          {form.acceptsPackages && (
            <div>
              <label
                style={{
                  display: 'block',
                  color: DS.muted,
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                {tx('offerRideFormPanel.package_note')}
              </label>
              <input
                placeholder={tx('offerRideFormPanel.example_compact_parcels_only')}
                value={form.packageNote}
                onChange={event => onUpdate('packageNote', event.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: r(10),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: C.text,
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          <div>
            <label
              style={{
                display: 'block',
                color: DS.muted,
                fontSize: '0.7rem',
                fontWeight: 700,
                letterSpacing: 0,
                textTransform: 'uppercase',
                marginBottom: 6,
              }}
            >
              {tx('offerRideFormPanel.note_for_passengers')}
            </label>
            <textarea
              rows={2}
              placeholder={tx('offerRideFormPanel.anything_passengers_should_know')}
              value={form.note}
              onChange={event => onUpdate('note', event.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: r(10),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: C.text,
                fontFamily: DS.F,
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div
            style={{
              background: DS.card2,
              borderRadius: r(14),
              padding: '18px 20px',
              border: `1px solid ${DS.border}`,
            }}
          >
            <h4
              style={{ color: DS.cyan, fontWeight: 700, margin: '0 0 12px', fontSize: '0.85rem' }}
            >
              {tx('offerRideFormPanel.summary')}
            </h4>
            <div style={{ color: C.text, fontSize: '0.9rem', lineHeight: 1.8 }}>
              {form.from} {tx('offerRideFormPanel.to_2')}
              {form.to} - {form.date || local('Choose date', 'اختر التاريخ')} {tx('offerRideFormPanel.at_2')}
              {form.time}
              <br />
              {form.seats} {tx('offerRideFormPanel.seats')}
              {form.price} {tx('offerRideFormPanel.jod_seat')}
              {form.carModel || local('Car TBD', 'السيارة قيد التحديد')}
              <br />
              {form.acceptsPackages
                ? local(`Packages enabled (${form.packageCapacity})`, `الطرود مفعّلة (${form.packageCapacity})`)
                : local('Passengers only', 'للركاب فقط')}
              {driverPlan && (
                <>
                  <br />
                  {tx('offerRideFormPanel.wasel_brain_target')}
                  {driverPlan.recommendedSeatPriceJod} {tx('offerRideFormPanel.jod_seat_2')}{' '}
                  {driverPlan.corridor.savingsPercent}
                  {tx('offerRideFormPanel.cheaper_than_solo_movement_best_pickup_at')}{' '}
                  {liveSignal?.recommendedPickupPoint ??
                    driverPlan.corridor.pickupPoints[0] ??
                    'the top corridor node'}
                  {liveSignal
                    ? `, with ${liveSignal.activeDemandAlerts} active alerts and ${liveSignal.nextWaveWindow} as the next dense departure window`
                    : ''}
                </>
              )}
            </div>
          </div>
          {errorDisplay}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onStepChange(2)}
              style={{
                flex: 1,
                height: 50,
                borderRadius: r(14),
                border: `1px solid ${DS.border}`,
                background: DS.card2,
                color: DS.sub,
                fontFamily: DS.F,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tx('common.back')}
            </button>
            <button
              data-testid="offer-ride-submit"
              disabled={busyState === 'posting'}
              onClick={onSubmit}
              style={{
                flex: 2,
                height: 50,
                borderRadius: r(14),
                border: 'none',
                background: DS.gradG,
                color: C.text,
                fontWeight: 800,
                fontFamily: DS.F,
                cursor: busyState === 'posting' ? 'wait' : 'pointer',
                opacity: busyState === 'posting' ? 0.75 : 1,
                boxShadow: `0 4px 20px ${DS.green}30`,
              }}
            >
              {busyState === 'posting' ? 'Posting connected ride...' : 'Post Connected Ride'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
