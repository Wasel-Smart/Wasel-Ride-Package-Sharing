/**
 * Wasel Raje3 Returns
 * Connected to the shared ride/package network.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, Star, CheckCircle2, AlertCircle, Search, RefreshCw, QrCode,
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLocalAuth } from '../../contexts/LocalAuth';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import { createConnectedPackage, getConnectedRides, type PackageRequest } from '../../services/journeyLogistics';
import { ServiceFlowPlaybook } from '../shared/ServiceFlowPlaybook';

const D = {
  bg:'#040C18', card:'#0A1628', card2:'#0D1F38',
  border:'rgba(199,255,26,0.12)', gold:'#C7FF1A', cyan:'#16C7F2', green:'#60C536',
  text:'#EFF6FF', sub:'rgba(148,163,184,0.80)', muted:'rgba(100,130,180,0.60)',
  F:"var(--wasel-font-sans, 'Plus Jakarta Sans', 'Cairo', 'Tajawal', sans-serif)", MONO:"'JetBrains Mono','Fira Mono',monospace",
} as const;

const RETAILERS = [
  { id:'noon', name:'Noon', nameAr:'نون', logo:'🟡', color:'#FFEE00' },
  { id:'amazon', name:'Amazon.jo', nameAr:'أمازون', logo:'📦', color:'#FF9900' },
  { id:'namshi', name:'Namshi', nameAr:'نمشي', logo:'👗', color:'#E91E8C' },
  { id:'markavip', name:'MarkaVIP', nameAr:'ماركة VIP', logo:'💎', color:'#8B5CF6' },
  { id:'other', name:'Other / Custom', nameAr:'أخرى', logo:'📬', color:D.gold },
];

const RETURN_REASONS = [
  { id:'wrong_size', label:'Wrong size', labelAr:'مقاس خاطئ' },
  { id:'damaged', label:'Item damaged', labelAr:'منتج تالف' },
  { id:'not_match', label:'Not as shown', labelAr:'لا يطابق الوصف' },
  { id:'changed_mind', label:'Changed mind', labelAr:'غيّرت رأيي' },
  { id:'late_delivery', label:'Late delivery', labelAr:'توصيل متأخر' },
];

function inferWeight(size: 'small' | 'medium' | 'large') {
  if (size === 'large') return '7 kg';
  if (size === 'medium') return '3 kg';
  return '<1 kg';
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
  const [size, setSize] = useState<'small'|'medium'|'large'>('small');
  const [reason, setReason] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdReturn, setCreatedReturn] = useState<PackageRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(
    () =>
      getConnectedRides()
        .filter(ride => ride.acceptsPackages && ride.to === 'Amman')
        .map(ride => ({
          id: ride.id,
          driverName: ride.carModel ? `${ride.carModel.split(' ')[0]} Captain` : 'Wasel Captain',
          rating: 4.8,
          trips: 12,
          departureTime: `${ride.date} · ${ride.time || 'Flexible'}`,
          fromCity: ride.from,
          toCity: ride.to,
          priceJOD: ride.price,
        })),
    [],
  );

  const selectedTrip = matches.find(match => match.id === selectedMatch) ?? null;

  const searchMatches = async () => {
    setSearching(true);
    setError(null);
    await new Promise(resolve => setTimeout(resolve, 450));
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
        note: [orderId && `Order ${orderId}`, item, reason].filter(Boolean).join(' · '),
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
    <div style={{ minHeight:'100vh', background:D.bg, fontFamily:D.F, color:D.text, padding:'28px 16px 80px' }} dir={isRTL?'rtl':'ltr'}>
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ background:'linear-gradient(135deg,#0B1D45 0%,#2A1A05 60%,#0A1628 100%)', borderRadius:20, padding:'28px 32px', marginBottom:24, border:`1px solid ${D.gold}20` }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:12 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:`linear-gradient(135deg,${D.gold},#E89200)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.4rem', flexShrink:0 }}>🔄</div>
            <div>
              <h1 style={{ fontSize:'1.35rem', fontWeight:900, letterSpacing:'-0.03em', margin:0 }}>{isRTL ? 'رجّع — إرجاع ذكي' : 'Raje3 Smart Returns'}</h1>
              <p style={{ fontSize:'0.72rem', color:D.muted, margin:'3px 0 0' }}>
                {isRTL ? 'مطابق مع الرحلات الحية التي تقبل الطرود والمتجهة إلى عمّان' : 'Matched against live package-ready rides heading into Amman'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:18, padding:'28px 28px' }}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <h2 style={{ fontSize:'1.05rem', fontWeight:800, margin:'0 0 20px', color:D.text }}>{isRTL?'اختر المتجر':'Select your retailer'}</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:10, marginBottom:20 }}>
                  {RETAILERS.map(retailerItem => (
                    <motion.div key={retailerItem.id} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }} onClick={() => setRetailer(retailerItem.id)} style={{
                      background: retailer===retailerItem.id ? `${retailerItem.color}0E` : D.card2,
                      border:`1px solid ${retailer===retailerItem.id ? retailerItem.color+'40' : D.border}`,
                      borderRadius:12, padding:'14px', cursor:'pointer', textAlign:'center',
                    }}>
                      <div style={{ fontSize:'1.8rem', marginBottom:6 }}>{retailerItem.logo}</div>
                      <div style={{ fontSize:'0.78rem', fontWeight:700, color:D.text }}>{isRTL?retailerItem.nameAr:retailerItem.name}</div>
                    </motion.div>
                  ))}
                </div>
                {retailer ? (
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:'0.75rem', fontWeight:700, color:D.sub, display:'block', marginBottom:7 }}>{isRTL?'رقم الطلب':'Order ID'}</label>
                    <input
                      value={orderId}
                      onChange={e=>setOrderId(e.target.value)}
                      placeholder="e.g. NOON-2026-XXXXXX"
                      style={{ width:'100%', background:D.card2, border:`1.5px solid ${D.border}`, borderRadius:10, color:D.text, fontSize:'0.875rem', fontFamily:D.F, padding:'10px 13px', outline:'none', boxSizing:'border-box' }}
                    />
                  </div>
                ) : null}
                <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={() => retailer && setStep(1)} disabled={!retailer} style={{ width:'100%', height:48, borderRadius:12, border:'none', background: retailer ? `linear-gradient(135deg,${D.gold},#E89200)` : 'rgba(255,255,255,0.08)', color: retailer ? '#040C18' : D.muted, fontWeight:800, fontSize:'0.9rem', fontFamily:D.F, cursor: retailer ? 'pointer' : 'not-allowed' }}>
                  {isRTL?'التالي — تفاصيل المرتجع':'Next — Return details'} →
                </motion.button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <h2 style={{ fontSize:'1.05rem', fontWeight:800, margin:'0 0 20px', color:D.text }}>{isRTL?'تفاصيل المنتج المُرجَع':'Return item details'}</h2>
                <div style={{ display:'flex', flexDirection:'column', gap:14, marginBottom:20 }}>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:700, color:D.sub, display:'block', marginBottom:7 }}>{isRTL?'وصف المنتج':'Item description'}</label>
                    <input value={item} onChange={e=>setItem(e.target.value)} placeholder={isRTL?'مثال: حذاء رياضي أبيض، مقاس 42':'e.g. White sneakers, size 42'} style={{ width:'100%', background:D.card2, border:`1.5px solid ${D.border}`, borderRadius:10, color:D.text, fontSize:'0.875rem', fontFamily:D.F, padding:'10px 13px', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:700, color:D.sub, display:'block', marginBottom:9 }}>{isRTL?'حجم الطرد':'Package size'}</label>
                    <div style={{ display:'flex', gap:8 }}>
                      {([['small','Small','صغير'],['medium','Medium','متوسط'],['large','Large','كبير']] as const).map(([key, en, arText]) => (
                        <button key={key} onClick={() => setSize(key)} style={{ flex:1, padding:'10px 0', borderRadius:10, border:`1px solid ${size===key ? D.gold+'50' : D.border}`, background: size===key ? `${D.gold}10` : D.card2, color: size===key ? D.gold : D.sub, fontSize:'0.78rem', fontWeight: size===key ? 700 : 400, fontFamily:D.F, cursor:'pointer' }}>
                          {isRTL?arText:en}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize:'0.75rem', fontWeight:700, color:D.sub, display:'block', marginBottom:9 }}>{isRTL?'سبب الإرجاع':'Return reason'}</label>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {RETURN_REASONS.map(reasonItem => (
                        <button key={reasonItem.id} onClick={() => setReason(reasonItem.id)} style={{ padding:'10px 14px', borderRadius:10, border:`1px solid ${reason===reasonItem.id ? D.gold+'50' : D.border}`, background: reason===reasonItem.id ? `${D.gold}10` : D.card2, color: reason===reasonItem.id ? D.gold : D.sub, fontSize:'0.82rem', fontWeight: reason===reasonItem.id ? 700 : 400, fontFamily:D.F, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:8 }}>
                          {reason===reasonItem.id ? <Check size={14}/> : <div style={{width:14}}/>}
                          {isRTL?reasonItem.labelAr:reasonItem.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setStep(0)} style={{ flex:1, height:48, borderRadius:12, border:`1px solid ${D.border}`, background:'transparent', color:D.sub, fontWeight:600, fontSize:'0.88rem', fontFamily:D.F, cursor:'pointer' }}>← {isRTL?'رجوع':'Back'}</button>
                  <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={() => { if (item && reason) void searchMatches(); }} disabled={!item || !reason || searching} style={{ flex:2, height:48, borderRadius:12, border:'none', background: item&&reason ? `linear-gradient(135deg,${D.gold},#E89200)` : 'rgba(255,255,255,0.08)', color: item&&reason ? '#040C18' : D.muted, fontWeight:800, fontSize:'0.9rem', fontFamily:D.F, cursor: item&&reason ? 'pointer' : 'not-allowed', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    {searching ? <><RefreshCw size={16} style={{animation:'spin 1s linear infinite'}}/>{isRTL?'جارٍ البحث…':'Finding matches…'}</> : <><Search size={15}/>{isRTL?'ابحث عن رحلة':'Find matching rides'}</>}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}>
                <h2 style={{ fontSize:'1.05rem', fontWeight:800, margin:'0 0 6px', color:D.text }}>{isRTL?'رحلات مطابقة':'Matching rides'}</h2>
                <p style={{ fontSize:'0.76rem', color:D.muted, margin:'0 0 18px' }}>
                  {matches.length > 0
                    ? (isRTL ? `${matches.length} رحلة تدعم الطرود ويمكن استخدامها للإرجاع إلى عمّان` : `${matches.length} package-ready rides can be used for this return into Amman`)
                    : (isRTL ? 'لا توجد رحلات حية مطابقة حالياً، لكن سننشئ طلب إرجاع ونبقيه قيد البحث.' : 'No live rides match right now, but we can still create the return request and keep it searching.')}
                </p>
                {matches.length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:18 }}>
                    {matches.map(match => (
                      <button key={match.id} onClick={() => setSelectedMatch(match.id)} style={{ background: selectedMatch===match.id ? `rgba(199,255,26,0.07)` : D.card2, border:`1px solid ${selectedMatch===match.id ? D.gold+'50' : D.border}`, borderRadius:14, padding:'16px 18px', cursor:'pointer', textAlign:'left' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
                          <div>
                            <div style={{ fontSize:'0.88rem', fontWeight:800, color:D.text }}>{match.driverName}</div>
                            <div style={{ display:'flex', gap:8, alignItems:'center', marginTop:6, color:D.sub, fontSize:'0.74rem' }}>
                              <Star size={11} color={D.gold} fill={D.gold} />
                              <span>{match.rating}</span>
                              <span>· {match.trips} trips</span>
                            </div>
                            <div style={{ color:D.muted, fontSize:'0.74rem', marginTop:8 }}>{match.fromCity} → {match.toCity} · {match.departureTime}</div>
                          </div>
                          <div style={{ color:D.gold, fontFamily:D.MONO, fontWeight:900 }}>JOD {match.priceJOD.toFixed(1)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display:'flex', gap:10, alignItems:'center', background:`${D.gold}12`, border:`1px solid ${D.gold}30`, borderRadius:14, padding:'12px 14px', marginBottom:18, color:D.text, fontSize:'0.82rem' }}>
                    <AlertCircle size={16} color={D.gold} />
                    <span>{isRTL ? 'سيُنشأ الطلب بحالة بحث حتى تظهر رحلة مناسبة.' : 'The return will be created in searching mode until a matching ride appears.'}</span>
                  </div>
                )}
                <div style={{ display:'flex', gap:8 }}>
                  <button onClick={() => setStep(1)} style={{ flex:1, height:48, borderRadius:12, border:`1px solid ${D.border}`, background:'transparent', color:D.sub, fontWeight:600, fontSize:'0.88rem', fontFamily:D.F, cursor:'pointer' }}>← {isRTL?'رجوع':'Back'}</button>
                  <motion.button whileHover={{ scale:1.02 }} whileTap={{ scale:0.97 }} onClick={() => void confirmReturn()} disabled={creating || (matches.length > 0 && !selectedMatch)} style={{ flex:2, height:48, borderRadius:12, border:'none', background: !creating && (matches.length === 0 || selectedMatch) ? `linear-gradient(135deg,${D.gold},#E89200)` : 'rgba(255,255,255,0.08)', color: !creating && (matches.length === 0 || selectedMatch) ? '#040C18' : D.muted, fontWeight:800, fontSize:'0.9rem', fontFamily:D.F, cursor: !creating && (matches.length === 0 || selectedMatch) ? 'pointer' : 'not-allowed' }}>
                    {creating ? (isRTL?'جارٍ إنشاء طلب الإرجاع…':'Creating return request…') : (isRTL?'مراجعة وتأكيد':'Review & Confirm')} →
                  </motion.button>
                </div>
                {error ? <div style={{ marginTop:14, color:'#FCA5A5', fontSize:'0.8rem' }}>{error}</div> : null}
              </motion.div>
            )}

            {step === 3 && createdReturn && (
              <motion.div key="done" initial={{ opacity:0, scale:0.95 }} animate={{ opacity:1, scale:1 }}>
                <div style={{ textAlign:'center', padding:'16px 0 24px' }}>
                  <div style={{ width:70, height:70, borderRadius:'50%', background:'rgba(96,197,54,0.12)', border:`2px solid ${D.green}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <CheckCircle2 size={34} color={D.green}/>
                  </div>
                  <h2 style={{ fontSize:'1.3rem', fontWeight:900, color:D.green, margin:'0 0 6px' }}>{isRTL?'تم إنشاء طلب الإرجاع!':'Return Request Created!'}</h2>
                  <p style={{ fontSize:'0.8rem', color:D.muted, margin:'0 0 24px', lineHeight:1.7 }}>
                    {createdReturn.matchedRideId
                      ? (isRTL ? `تم ربط الطلب بمسار حي مع ${createdReturn.matchedDriver ?? 'سائق واصل'}.` : `The request is already matched to a live route with ${createdReturn.matchedDriver ?? 'a Wasel captain'}.`)
                      : (isRTL ? 'تم إنشاء الطلب بحالة بحث وسيظهر في تتبع الطرود حتى تتم المطابقة.' : 'The request was created in searching mode and will stay visible in package tracking until matched.')}
                  </p>
                  <div style={{ background:D.card2, border:`1px solid ${D.gold}30`, borderRadius:16, padding:'24px', marginBottom:20, display:'inline-block' }}>
                    <div style={{ width:120, height:120, background:'linear-gradient(135deg,rgba(199,255,26,0.15),rgba(22,199,242,0.10))', border:`2px solid ${D.gold}40`, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                      <QrCode size={56} color={D.gold}/>
                    </div>
                    <div style={{ fontSize:'0.72rem', fontFamily:D.MONO, color:D.gold, letterSpacing:'0.12em' }}>{createdReturn.trackingId}</div>
                    <div style={{ fontSize:'0.62rem', color:D.muted, marginTop:4 }}>{isRTL?'استخدم هذا المعرّف للمتابعة في صفحة الطرود':'Use this ID to continue tracking from the packages page'}</div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <motion.button whileHover={{ scale:1.03 }} onClick={() => nav('/app/raje3')} style={{ flex:1, height:44, borderRadius:12, border:`1px solid ${D.border}`, background:D.card2, color:D.sub, fontWeight:600, fontSize:'0.82rem', fontFamily:D.F, cursor:'pointer' }}>
                      {isRTL?'طلب جديد':'New return'}
                    </motion.button>
                    <motion.button whileHover={{ scale:1.03 }} onClick={() => nav('/app/packages')} style={{ flex:1, height:44, borderRadius:12, border:'none', background:`linear-gradient(135deg,${D.gold},#E89200)`, color:'#040C18', fontWeight:800, fontSize:'0.82rem', fontFamily:D.F, cursor:'pointer' }}>
                      {isRTL?'افتح التتبع':'Open tracking'}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ background:D.card, border:`1px solid ${D.border}`, borderRadius:16, padding:'22px 24px', marginTop:16 }}>
          <div style={{ fontSize:'0.82rem', fontWeight:700, color:D.gold, marginBottom:16 }}>{isRTL?'كيف يعمل رجّع؟':'How Raje3 works'}</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:14 }}>
            {[
              { icon:'📦', title:isRTL?'أدخل تفاصيل الإرجاع':'Enter return details' },
              { icon:'🔍', title:isRTL?'نفحص الرحلات الحية':'We inspect live rides' },
              { icon:'🤝', title:isRTL?'نربط الطلب بالشبكة':'We connect the request to the network' },
              { icon:'✅', title:isRTL?'نتابع بنفس معرّف التتبع':'One tracking ID follows the return' },
            ].map(item => (
              <div key={item.title} style={{ textAlign:'center' }}>
                <div style={{ width:40, height:40, borderRadius:12, background:`${D.gold}12`, border:`1px solid ${D.gold}25`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', margin:'0 auto 8px' }}>{item.icon}</div>
                <div style={{ fontSize:'0.72rem', color:D.sub, lineHeight:1.5 }}>{item.title}</div>
              </div>
            ))}
          </div>
        </div>

        <ServiceFlowPlaybook focusService="returns" />
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default ReturnMatching;

