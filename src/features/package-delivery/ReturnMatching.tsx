import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  PackageSearch,
  QrCode,
  RefreshCw,
  Route,
  ScanLine,
  Search,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  createConnectedPackage,
  getConnectedRides,
  type PackageRequest,
} from '../../services/journeyLogistics';

const D = {
  bg: 'var(--wasel-service-bg)',
  card: 'var(--wasel-service-card)',
  card2: 'var(--wasel-service-card-2)',
  border: 'var(--wasel-service-border)',
  gold: 'var(--warning)',
  green: 'var(--success)',
  text: 'var(--wasel-service-text)',
  sub: 'var(--wasel-service-sub)',
  muted: 'var(--wasel-service-muted)',
  F: "var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)",
  MONO: "'JetBrains Mono','Fira Mono',monospace",
} as const;

const RETAILERS = [
  ['noon', 'Noon', 'نون', 'N', '#FFEE00'],
  ['amazon', 'Amazon.jo', 'أمازون', 'A', '#FF9900'],
  ['namshi', 'Namshi', 'نمشي', 'NM', '#E91E8C'],
  ['markavip', 'MarkaVIP', 'ماركا VIP', 'MV', '#8B5CF6'],
  ['other', 'Other / Custom', 'متجر آخر', '+', D.gold],
] as const;

const RETURN_REASONS = [
  ['wrong_size', 'Wrong size', 'المقاس غير مناسب'],
  ['damaged', 'Item damaged', 'القطعة متضررة'],
  ['not_match', 'Not as shown', 'لا يطابق المعروض'],
  ['changed_mind', 'Changed mind', 'غيّرت رأيي'],
  ['late_delivery', 'Late delivery', 'وصل متأخراً'],
] as const;

const STEPS = [
  ['Retailer', 'المتجر'],
  ['Item details', 'تفاصيل الطلب'],
  ['Route match', 'مطابقة الرحلة'],
  ['Tracking', 'التتبع'],
] as const;

const panel = {
  background: D.card,
  border: `1px solid ${D.border}`,
  borderRadius: 20,
  boxShadow: '0 18px 42px rgba(15, 23, 42, 0.08)',
} as const;

const inputStyle = {
  width: '100%',
  background: D.card2,
  border: `1.5px solid ${D.border}`,
  borderRadius: 12,
  color: D.text,
  fontSize: '0.9rem',
  fontFamily: D.F,
  padding: '12px 14px',
  outline: 'none',
  boxSizing: 'border-box',
} as const;

function inferWeight(size: 'small' | 'medium' | 'large') {
  return size === 'large' ? '7 kg' : size === 'medium' ? '3 kg' : '<1 kg';
}

function primary(enabled: boolean) {
  return {
    height: 48,
    borderRadius: 14,
    border: 'none',
    background: enabled ? `linear-gradient(135deg, ${D.gold}, #E89200)` : 'var(--surface-muted-strong)',
    color: enabled ? 'var(--text-inverse)' : D.muted,
    fontWeight: 800,
    fontFamily: D.F,
    cursor: enabled ? 'pointer' : 'not-allowed',
  } as const;
}

export function ReturnMatching() {
  const { language } = useLanguage();
  const { user } = useLocalAuth();
  const isRTL = language === 'ar';
  const nav = useIframeSafeNavigate();

  const [step, setStep] = useState(0);
  const [retailer, setRetailer] = useState('');
  const [orderId, setOrderId] = useState('');
  const [item, setItem] = useState('');
  const [size, setSize] = useState<'small' | 'medium' | 'large'>('small');
  const [reason, setReason] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdReturn, setCreatedReturn] = useState<PackageRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(
    () =>
      getConnectedRides()
        .filter((ride) => ride.acceptsPackages && ride.to === 'Amman')
        .map((ride) => ({
          id: ride.id,
          driverName: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
          departureTime: `${ride.date} · ${ride.time || 'Flexible'}`,
          fromCity: ride.from,
          toCity: ride.to,
          priceJOD: ride.price,
        })),
    [],
  );

  const selectedTrip = matches.find((match) => match.id === selectedMatch) ?? null;
  const selectedReason = RETURN_REASONS.find((entry) => entry[0] === reason)?.[1] ?? reason;

  const searchMatches = async () => {
    setSearching(true);
    setError(null);
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSearching(false);
    setStep(2);
  };

  const confirmReturn = async () => {
    setCreating(true);
    setError(null);
    try {
      const created = await createConnectedPackage({
        from: selectedTrip?.fromCity ?? 'Aqaba',
        to: 'Amman',
        weight: inferWeight(size),
        note: [orderId && `Order ${orderId}`, item, selectedReason].filter(Boolean).join(' · '),
        packageType: 'return',
        senderName: user?.name,
        senderEmail: user?.email,
      });
      setCreatedReturn(created);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create return request.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: D.bg, color: D.text, fontFamily: D.F, padding: '28px 16px 88px' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ ...panel, padding: '28px 30px', marginBottom: 18, background: 'linear-gradient(135deg, rgb(var(--warning-rgb) / 0.14), rgb(var(--accent-secondary-rgb) / 0.12), rgba(255,255,255,0.04))', border: `1px solid ${D.gold}24` }}>
          <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(0, 1.2fr) minmax(260px, 0.8fr)' }} className="raje3-grid">
            <div>
              <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', padding: '8px 14px', borderRadius: 999, background: `${D.gold}14`, border: `1px solid ${D.gold}24`, color: D.gold, fontSize: '0.7rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
                <PackageSearch size={14} />
                {isRTL ? 'توصيل الطرود - شبكة الإرجاع' : 'Package Delivery - return network'}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${D.gold}, #E89200)`, display: 'grid', placeItems: 'center', color: 'var(--text-inverse)', flexShrink: 0 }}>
                  <PackageSearch size={26} />
                </div>
                <div>
                  <h1 style={{ fontSize: 'clamp(1.55rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0 }}>
                    {isRTL ? 'توصيل الطرود - الإرجاع الذكي' : 'Package Delivery Smart Returns'}
                  </h1>
                  <p style={{ margin: '10px 0 0', color: D.sub, lineHeight: 1.72, maxWidth: 560 }}>
                    {isRTL ? 'نربط طلب الإرجاع برحلات حيّة جاهزة لحمل الطرود إلى عمّان، ثم نضع التتبع في صفحة واحدة واضحة.' : 'Attach a return request to live package-ready rides heading into Amman, then keep the whole handoff in one clear tracking flow.'}
                  </p>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                [isRTL ? 'متاجر جاهزة' : 'Retailers ready', String(RETAILERS.length)],
                [isRTL ? 'رحلات قابلة للمطابقة' : 'Live route matches', String(matches.length)],
                [isRTL ? 'التتبع' : 'Tracking', isRTL ? 'معرّف واحد' : 'One ID'],
              ].map(([label, value]) => (
                <div key={label} style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 16, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: D.sub, fontSize: '0.78rem', fontWeight: 700 }}>{label}</span>
                  <span style={{ fontWeight: 900 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ ...panel, padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 20 }} className="raje3-grid">
            {STEPS.map(([en, ar], index) => {
              const active = step === index;
              const complete = step > index || (step === 3 && index === 3);
              return (
                <div key={en} style={{ display: 'flex', gap: 10, alignItems: 'center', borderRadius: 16, padding: '12px 14px', background: active || complete ? `${D.gold}10` : D.card2, border: `1px solid ${active || complete ? `${D.gold}3c` : D.border}` }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', background: complete ? `${D.green}18` : `${D.gold}18`, border: `1px solid ${complete ? `${D.green}34` : `${D.gold}28`}`, color: complete ? D.green : D.gold, flexShrink: 0 }}>
                    {complete ? <Check size={15} /> : index + 1}
                  </div>
                  <div>
                    <div style={{ color: D.muted, fontSize: '0.68rem' }}>{isRTL ? 'الخطوة' : 'Step'} {index + 1}</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{isRTL ? ar : en}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 6px' }}>{isRTL ? 'اختر المتجر المرتبط بالطلب' : 'Select the retailer'}</h2>
                <p style={{ margin: '0 0 18px', color: D.muted, fontSize: '0.82rem' }}>{isRTL ? 'ابدأ باسم المتجر ثم أضف مرجع الطلب إن وُجد.' : 'Start with the store, then add the order reference if you have it.'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 18 }}>
                  {RETAILERS.map(([id, name, nameAr, mark, color]) => (
                    <button key={id} type="button" onClick={() => setRetailer(id)} style={{ background: retailer === id ? `${color}12` : D.card2, border: `1px solid ${retailer === id ? `${color}55` : D.border}`, borderRadius: 18, padding: '16px 14px', cursor: 'pointer', textAlign: 'left', display: 'grid', gap: 10 }}>
                      <div style={{ width: 46, height: 46, borderRadius: 14, display: 'grid', placeItems: 'center', background: `${color}18`, border: `1px solid ${color}30`, color, fontWeight: 900 }}>{mark}</div>
                      <div style={{ fontWeight: 800 }}>{isRTL ? nameAr : name}</div>
                    </button>
                  ))}
                </div>
                {retailer ? (
                  <div style={{ marginBottom: 18 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: D.sub, display: 'block', marginBottom: 7 }}>{isRTL ? 'رقم الطلب' : 'Order ID'}</label>
                    <input value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="e.g. NOON-2026-XXXXXX" style={inputStyle} />
                  </div>
                ) : null}
                <button type="button" onClick={() => retailer && setStep(1)} disabled={!retailer} style={{ ...primary(Boolean(retailer)), width: '100%' }}>
                  {isRTL ? 'التالي - تفاصيل الطلب' : 'Next - Return details'}
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 6px' }}>{isRTL ? 'أضف تفاصيل القطعة المرتجعة' : 'Describe the return item'}</h2>
                <p style={{ margin: '0 0 18px', color: D.muted, fontSize: '0.82rem' }}>{isRTL ? 'الوصف الواضح يساعد على المطابقة والتتبع.' : 'Clear item details make route matching and support much easier.'}</p>
                <div style={{ display: 'grid', gap: 16, marginBottom: 20 }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: D.sub, display: 'block', marginBottom: 7 }}>{isRTL ? 'وصف القطعة' : 'Item description'}</label>
                    <input value={item} onChange={(event) => setItem(event.target.value)} placeholder={isRTL ? 'مثال: حذاء أبيض، مقاس 42' : 'e.g. White sneakers, size 42'} style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {([
                      ['small', 'Small', 'صغير'],
                      ['medium', 'Medium', 'متوسط'],
                      ['large', 'Large', 'كبير'],
                    ] as const).map(([key, en, ar]) => (
                      <button key={key} type="button" onClick={() => setSize(key)} style={{ flex: 1, minWidth: 110, padding: '11px 0', borderRadius: 12, border: `1px solid ${size === key ? `${D.gold}50` : D.border}`, background: size === key ? `${D.gold}10` : D.card2, color: size === key ? D.gold : D.sub, fontWeight: size === key ? 800 : 600, cursor: 'pointer' }}>
                        {isRTL ? ar : en}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {RETURN_REASONS.map(([id, en, ar]) => (
                      <button key={id} type="button" onClick={() => setReason(id)} style={{ padding: '12px 14px', borderRadius: 12, border: `1px solid ${reason === id ? `${D.gold}50` : D.border}`, background: reason === id ? `${D.gold}10` : D.card2, color: reason === id ? D.gold : D.sub, fontWeight: reason === id ? 800 : 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10 }}>
                        {reason === id ? <Check size={15} /> : <div style={{ width: 15 }} />}
                        {isRTL ? ar : en}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setStep(0)} style={{ flex: 1, minWidth: 160, height: 48, borderRadius: 14, border: `1px solid ${D.border}`, background: 'transparent', color: D.sub, fontWeight: 700, cursor: 'pointer' }}>
                    {isRTL ? 'رجوع' : 'Back'}
                  </button>
                  <button type="button" onClick={() => { if (item && reason) void searchMatches(); }} disabled={!item || !reason || searching} style={{ ...primary(Boolean(item && reason) && !searching), flex: 2, minWidth: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {searching ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />{isRTL ? 'جارٍ البحث عن المطابقات...' : 'Finding matches...'}</> : <><Search size={16} />{isRTL ? 'ابحث عن الرحلات المناسبة' : 'Find matching rides'}</>}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 900, margin: '0 0 6px' }}>{isRTL ? 'الرحلات المطابقة' : 'Matching routes'}</h2>
                <p style={{ margin: '0 0 18px', color: D.muted, fontSize: '0.82rem' }}>
                  {matches.length > 0 ? (isRTL ? `${matches.length} رحلة جاهزة للطرود متاحة الآن لهذا الإرجاع.` : `${matches.length} package-ready routes are currently available for this return.`) : (isRTL ? 'لا توجد مطابقة مباشرة الآن، لكننا نستطيع إنشاء الطلب في وضع البحث.' : 'No direct match yet, but the return can still be created in search mode.')}
                </p>
                {matches.length > 0 ? (
                  <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                    {matches.map((match) => (
                      <button key={match.id} type="button" onClick={() => setSelectedMatch(match.id)} style={{ background: selectedMatch === match.id ? `${D.gold}10` : D.card2, border: `1px solid ${selectedMatch === match.id ? `${D.gold}50` : D.border}`, borderRadius: 16, padding: '16px 18px', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>{match.driverName}</div>
                            <div style={{ color: D.sub, fontSize: '0.76rem' }}>{match.fromCity} → {match.toCity} · {match.departureTime}</div>
                          </div>
                          <div style={{ color: D.gold, fontFamily: D.MONO, fontWeight: 900, whiteSpace: 'nowrap' }}>JOD {match.priceJOD.toFixed(1)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: `${D.gold}12`, border: `1px solid ${D.gold}30`, borderRadius: 16, padding: '14px 15px', marginBottom: 18 }}>
                    <AlertCircle size={16} color={D.gold} />
                    <span style={{ fontSize: '0.82rem' }}>{isRTL ? 'سيبقى الطلب في وضع البحث حتى تظهر رحلة مناسبة.' : 'The request will stay open until a suitable route appears.'}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setStep(1)} style={{ flex: 1, minWidth: 160, height: 48, borderRadius: 14, border: `1px solid ${D.border}`, background: 'transparent', color: D.sub, fontWeight: 700, cursor: 'pointer' }}>
                    {isRTL ? 'رجوع' : 'Back'}
                  </button>
                  <button type="button" onClick={() => void confirmReturn()} disabled={creating || (matches.length > 0 && !selectedMatch)} style={{ ...primary(!creating && (matches.length === 0 || Boolean(selectedMatch))), flex: 2, minWidth: 220 }}>
                    {creating ? (isRTL ? 'جارٍ إنشاء طلب الإرجاع...' : 'Creating return request...') : (isRTL ? 'أنشئ الطلب وأكمل' : 'Create and continue')}
                  </button>
                </div>
                {error ? <div style={{ marginTop: 14, color: '#FCA5A5', fontSize: '0.8rem' }}>{error}</div> : null}
              </motion.div>
            )}

            {step === 3 && createdReturn && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div style={{ textAlign: 'center', padding: '12px 0 10px' }}>
                  <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'rgba(107,181,21,0.12)', border: `2px solid ${D.green}`, display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}>
                    <CheckCircle2 size={36} color={D.green} />
                  </div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: D.green, margin: '0 0 8px' }}>{isRTL ? 'تم إنشاء طلب الإرجاع' : 'Return request created'}</h2>
                  <p style={{ margin: '0 auto 20px', color: D.muted, lineHeight: 1.72, maxWidth: 620 }}>
                    {createdReturn.matchedRideId ? (isRTL ? `تمت المطابقة مباشرة مع ${createdReturn.matchedDriver ?? 'كابتن واصل'} ويمكنك متابعة الحالة من التتبع.` : `The request is already attached to a live route with ${createdReturn.matchedDriver ?? 'a Wasel captain'}.`) : (isRTL ? 'تم إنشاء الطلب في وضع البحث وسيبقى ظاهراً حتى تتم المطابقة.' : 'The request was created in search mode and will stay visible until a route match appears.')}
                  </p>
                  <div style={{ background: D.card2, border: `1px solid ${D.gold}30`, borderRadius: 18, padding: 24, marginBottom: 18, display: 'grid', gap: 12, justifyItems: 'center' }}>
                    <div style={{ width: 126, height: 126, borderRadius: 18, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, rgba(168,214,20,0.15), rgba(71,183,230,0.10))', border: `2px solid ${D.gold}40` }}>
                      <QrCode size={58} color={D.gold} />
                    </div>
                    <div style={{ color: D.gold, fontFamily: D.MONO, letterSpacing: '0.12em' }}>{createdReturn.trackingId}</div>
                    <div style={{ fontSize: '0.66rem', color: D.muted }}>{isRTL ? 'استخدم هذا المعرّف لمتابعة الإرجاع من صفحة الطرود' : 'Use this ID to continue tracking from the packages page'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => nav('/app/package-delivery')} style={{ flex: 1, minWidth: 180, height: 48, borderRadius: 14, border: `1px solid ${D.border}`, background: 'transparent', color: D.sub, fontWeight: 700, cursor: 'pointer' }}>
                      {isRTL ? 'إرجاع جديد' : 'New return'}
                    </button>
                    <button type="button" onClick={() => nav('/app/packages')} style={{ ...primary(true), flex: 1, minWidth: 180 }}>
                      {isRTL ? 'افتح التتبع' : 'Open tracking'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ ...panel, padding: '22px 24px', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ScanLine size={18} color={D.gold} />
            <div style={{ fontWeight: 800 }}>{isRTL ? 'كيف يعمل توصيل الطرود' : 'How Package Delivery works'}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              [<Store key="store" size={18} color={D.gold} />, isRTL ? 'حدد المتجر والطلب' : 'Pick the retailer and order'],
              [<PackageSearch key="pkg" size={18} color={D.gold} />, isRTL ? 'صف القطعة وسبب الإرجاع' : 'Describe the item and return reason'],
              [<Route key="route" size={18} color={D.gold} />, isRTL ? 'نطابقك مع رحلة جاهزة' : 'We match it to a package-ready route'],
              [<ShieldCheck key="track" size={18} color={D.gold} />, isRTL ? 'معرّف واحد يتابع الحالة كاملة' : 'One tracking ID follows the whole handoff'],
            ].map(([icon, title]) => (
              <div key={String(title)} style={{ background: D.card2, border: `1px solid ${D.border}`, borderRadius: 16, padding: '14px 15px', display: 'grid', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: `${D.gold}12`, border: `1px solid ${D.gold}25`, display: 'grid', placeItems: 'center' }}>{icon}</div>
                <div style={{ fontSize: '0.78rem', color: D.sub, lineHeight: 1.6 }}>{title}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .raje3-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default ReturnMatching;
