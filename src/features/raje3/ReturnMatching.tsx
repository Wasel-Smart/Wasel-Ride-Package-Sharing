/**
 * Wasel Raje3 Returns
 * Connected to the shared ride/package network.
 */
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Check, CheckCircle2, QrCode, RefreshCw, Search, Star } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useIframeSafeNavigate } from '../../hooks/useIframeSafeNavigate';
import {
  createConnectedPackage,
  getConnectedRides,
  type PackageRequest,
} from '../../services/journeyLogistics';

const D = {
  bg: '#040C18',
  card: '#0A1628',
  card2: '#0D1F38',
  border: 'rgba(240,168,48,0.12)',
  gold: '#F0A830',
  cyan: '#00C8E8',
  green: '#00C875',
  text: '#EFF6FF',
  sub: 'rgba(148,163,184,0.80)',
  muted: 'rgba(100,130,180,0.60)',
  F: "-apple-system,'Inter','Cairo',sans-serif",
  MONO: "'JetBrains Mono','Fira Mono',monospace",
} as const;

const RETAILERS = [
  { id: 'noon', name: 'Noon', logo: 'N', color: '#FFEE00' },
  { id: 'amazon', name: 'Amazon.jo', logo: 'A', color: '#FF9900' },
  { id: 'namshi', name: 'Namshi', logo: 'N', color: '#E91E8C' },
  { id: 'markavip', name: 'MarkaVIP', logo: 'M', color: '#8B5CF6' },
  { id: 'other', name: 'Other', logo: '+', color: D.gold },
];

const RETURN_REASONS = [
  { id: 'wrong_size', label: 'Wrong size' },
  { id: 'damaged', label: 'Item damaged' },
  { id: 'not_match', label: 'Not as shown' },
  { id: 'changed_mind', label: 'Changed mind' },
  { id: 'late_delivery', label: 'Late delivery' },
];

function inferWeight(size: 'small' | 'medium' | 'large') {
  if (size === 'large') return '7 kg';
  if (size === 'medium') return '3 kg';
  return '<1 kg';
}

export function ReturnMatching() {
  const { language } = useLanguage();
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
  const selectedRetailer = RETAILERS.find(item => item.id === retailer) ?? null;
  const selectedReason = RETURN_REASONS.find(item => item.id === reason) ?? null;

  const searchMatches = async () => {
    setSearching(true);
    setError(null);
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
      });
      setCreatedReturn(created);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create return request.');
    } finally {
      setCreating(false);
    }
  };

  const stageLabels = ['Retailer', 'Details', 'Match', 'Track'];
  const liveLane = selectedTrip
    ? `${selectedTrip.fromCity} → ${selectedTrip.toCity}`
    : 'Aqaba → Amman';
  const railLines = [
    selectedRetailer
      ? `${selectedRetailer.name} • ${orderId || 'Order ID pending'}`
      : 'Retailer not selected',
    item ? `${item} • ${inferWeight(size)}` : `Package size ${size}`,
    selectedReason?.label ?? 'Return reason pending',
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: D.bg,
        fontFamily: D.F,
        color: D.text,
        padding: '28px 16px 80px',
      }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg,#0B1D45 0%,#2A1A05 60%,#0A1628 100%)',
            borderRadius: 24,
            padding: '26px 28px',
            marginBottom: 18,
            border: `1px solid ${D.gold}20`,
            boxShadow: '0 18px 48px rgba(0,0,0,0.22)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 14,
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div
                style={{
                  color: D.cyan,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Round-trip return lane
              </div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 900,
                  letterSpacing: '-0.03em',
                  margin: '8px 0 6px',
                }}
              >
                Raje3 Round Trip
              </h1>
              <p style={{ fontSize: '0.82rem', color: D.sub, margin: 0, lineHeight: 1.55 }}>
                Build the return, match it to a live ride into Amman, and keep one tracking ID.
              </p>
            </div>
            <div
              style={{
                background: 'rgba(5,12,24,0.44)',
                border: `1px solid ${D.border}`,
                borderRadius: 18,
                padding: '14px 16px',
                minWidth: 220,
              }}
            >
              <div style={{ color: D.gold, fontSize: '0.72rem', fontWeight: 800 }}>Live lane</div>
              <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 900, marginTop: 6 }}>
                {liveLane}
              </div>
              <div style={{ color: D.muted, fontSize: '0.74rem', marginTop: 6 }}>
                {matches.length} package-ready rides available right now
              </div>
            </div>
          </div>
        </div>

        <div
          className="sp-2col"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.08fr 0.92fr',
            gap: 18,
            alignItems: 'start',
          }}
        >
          <div
            style={{
              background: D.card,
              border: `1px solid ${D.border}`,
              borderRadius: 22,
              padding: '22px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 10,
                marginBottom: 20,
              }}
            >
              {stageLabels.map((label, index) => {
                const active = step === index;
                const complete = step > index || (index === 3 && createdReturn);
                return (
                  <div
                    key={label}
                    style={{
                      borderRadius: 14,
                      padding: '12px 12px 10px',
                      border: `1px solid ${active ? `${D.gold}55` : D.border}`,
                      background: active ? `${D.gold}10` : D.card2,
                    }}
                  >
                    <div
                      style={{
                        color: complete ? D.green : active ? D.gold : D.muted,
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {complete ? 'Live' : `Step ${index + 1}`}
                    </div>
                    <div
                      style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 800, marginTop: 6 }}
                    >
                      {label}
                    </div>
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div
                  key="s0"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <h2 style={{ fontSize: '1.12rem', fontWeight: 900, margin: '0 0 18px' }}>
                    Select retailer
                  </h2>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    {RETAILERS.map(retailerItem => (
                      <motion.button
                        key={retailerItem.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRetailer(retailerItem.id)}
                        style={{
                          background:
                            retailer === retailerItem.id ? `${retailerItem.color}12` : D.card2,
                          border: `1px solid ${retailer === retailerItem.id ? `${retailerItem.color}55` : D.border}`,
                          borderRadius: 14,
                          padding: '16px 14px',
                          cursor: 'pointer',
                          color: '#fff',
                          textAlign: 'left',
                        }}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 12,
                            background: 'rgba(255,255,255,0.06)',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 900,
                            marginBottom: 10,
                          }}
                        >
                          {retailerItem.logo}
                        </div>
                        <div style={{ fontSize: '0.84rem', fontWeight: 800 }}>
                          {retailerItem.name}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        color: D.sub,
                        display: 'block',
                        marginBottom: 8,
                      }}
                    >
                      Order ID
                    </label>
                    <input
                      value={orderId}
                      onChange={event => setOrderId(event.target.value)}
                      placeholder="NOON-2026-XXXXXX"
                      style={{
                        width: '100%',
                        background: D.card2,
                        border: `1px solid ${D.border}`,
                        borderRadius: 12,
                        color: D.text,
                        fontSize: '0.9rem',
                        fontFamily: D.F,
                        padding: '12px 14px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => retailer && setStep(1)}
                    disabled={!retailer}
                    style={{
                      width: '100%',
                      height: 50,
                      borderRadius: 14,
                      border: 'none',
                      background: retailer
                        ? `linear-gradient(135deg,${D.gold},#E89200)`
                        : 'rgba(255,255,255,0.08)',
                      color: retailer ? '#040C18' : D.muted,
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      fontFamily: D.F,
                      cursor: retailer ? 'pointer' : 'not-allowed',
                    }}
                  >
                    Continue to return details
                  </button>
                </motion.div>
              )}

              {step === 1 && (
                <motion.div
                  key="s1"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <h2 style={{ fontSize: '1.12rem', fontWeight: 900, margin: '0 0 18px' }}>
                    Return details
                  </h2>
                  <div style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
                    <div>
                      <label
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: D.sub,
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Item description
                      </label>
                      <input
                        value={item}
                        onChange={event => setItem(event.target.value)}
                        placeholder="White sneakers, size 42"
                        style={{
                          width: '100%',
                          background: D.card2,
                          border: `1px solid ${D.border}`,
                          borderRadius: 12,
                          color: D.text,
                          fontSize: '0.9rem',
                          fontFamily: D.F,
                          padding: '12px 14px',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: D.sub,
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Package size
                      </label>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                          gap: 8,
                        }}
                      >
                        {(['small', 'medium', 'large'] as const).map(option => (
                          <button
                            key={option}
                            onClick={() => setSize(option)}
                            style={{
                              height: 42,
                              borderRadius: 12,
                              border: `1px solid ${size === option ? `${D.gold}55` : D.border}`,
                              background: size === option ? `${D.gold}12` : D.card2,
                              color: size === option ? D.gold : D.sub,
                              fontWeight: 800,
                              cursor: 'pointer',
                            }}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          color: D.sub,
                          display: 'block',
                          marginBottom: 8,
                        }}
                      >
                        Return reason
                      </label>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {RETURN_REASONS.map(reasonItem => (
                          <button
                            key={reasonItem.id}
                            onClick={() => setReason(reasonItem.id)}
                            style={{
                              padding: '12px 14px',
                              borderRadius: 12,
                              border: `1px solid ${reason === reasonItem.id ? `${D.gold}55` : D.border}`,
                              background: reason === reasonItem.id ? `${D.gold}12` : D.card2,
                              color: reason === reasonItem.id ? D.gold : D.sub,
                              fontWeight: 800,
                              cursor: 'pointer',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                            }}
                          >
                            {reason === reasonItem.id ? (
                              <Check size={15} />
                            ) : (
                              <div style={{ width: 15 }} />
                            )}
                            {reasonItem.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 8 }}>
                    <button
                      onClick={() => setStep(0)}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        border: `1px solid ${D.border}`,
                        background: 'transparent',
                        color: D.sub,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => {
                        if (item && reason) void searchMatches();
                      }}
                      disabled={!item || !reason || searching}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        border: 'none',
                        background:
                          item && reason
                            ? `linear-gradient(135deg,${D.gold},#E89200)`
                            : 'rgba(255,255,255,0.08)',
                        color: item && reason ? '#040C18' : D.muted,
                        fontWeight: 900,
                        cursor: item && reason ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      {searching ? (
                        <>
                          <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} />
                          Finding rides
                        </>
                      ) : (
                        <>
                          <Search size={15} />
                          Find matching rides
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="s2"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                >
                  <h2 style={{ fontSize: '1.12rem', fontWeight: 900, margin: '0 0 8px' }}>
                    Match a return ride
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: D.muted, margin: '0 0 18px' }}>
                    {matches.length > 0
                      ? `${matches.length} package-ready rides are open into Amman right now.`
                      : 'No live ride is open right now. You can still create the return and keep it searching.'}
                  </p>

                  {matches.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
                      {matches.map(match => (
                        <button
                          key={match.id}
                          onClick={() => setSelectedMatch(match.id)}
                          style={{
                            background: selectedMatch === match.id ? `${D.gold}10` : D.card2,
                            border: `1px solid ${selectedMatch === match.id ? `${D.gold}55` : D.border}`,
                            borderRadius: 16,
                            padding: '16px 18px',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              flexWrap: 'wrap',
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: D.text }}>
                                {match.driverName}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: 8,
                                  alignItems: 'center',
                                  marginTop: 6,
                                  color: D.sub,
                                  fontSize: '0.74rem',
                                }}
                              >
                                <Star size={11} color={D.gold} fill={D.gold} />
                                <span>{match.rating}</span>
                                <span>· {match.trips} trips</span>
                              </div>
                              <div style={{ color: D.muted, fontSize: '0.74rem', marginTop: 8 }}>
                                {match.fromCity} → {match.toCity} · {match.departureTime}
                              </div>
                            </div>
                            <div style={{ color: D.gold, fontFamily: D.MONO, fontWeight: 900 }}>
                              JOD {match.priceJOD.toFixed(1)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                        background: `${D.gold}12`,
                        border: `1px solid ${D.gold}30`,
                        borderRadius: 14,
                        padding: '12px 14px',
                        marginBottom: 18,
                        color: D.text,
                        fontSize: '0.82rem',
                      }}
                    >
                      <AlertCircle size={16} color={D.gold} />
                      <span>
                        The return will stay in searching mode until a matching ride appears.
                      </span>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '0.9fr 1.1fr', gap: 8 }}>
                    <button
                      onClick={() => setStep(1)}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        border: `1px solid ${D.border}`,
                        background: 'transparent',
                        color: D.sub,
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Back
                    </button>
                    <button
                      onClick={() => void confirmReturn()}
                      disabled={creating || (matches.length > 0 && !selectedMatch)}
                      style={{
                        height: 48,
                        borderRadius: 12,
                        border: 'none',
                        background:
                          !creating && (matches.length === 0 || selectedMatch)
                            ? `linear-gradient(135deg,${D.gold},#E89200)`
                            : 'rgba(255,255,255,0.08)',
                        color:
                          !creating && (matches.length === 0 || selectedMatch)
                            ? '#040C18'
                            : D.muted,
                        fontWeight: 900,
                        cursor:
                          !creating && (matches.length === 0 || selectedMatch)
                            ? 'pointer'
                            : 'not-allowed',
                      }}
                    >
                      {creating ? 'Creating return' : 'Create return'}
                    </button>
                  </div>
                  {error ? (
                    <div style={{ marginTop: 14, color: '#FCA5A5', fontSize: '0.8rem' }}>
                      {error}
                    </div>
                  ) : null}
                </motion.div>
              )}

              {step === 3 && createdReturn && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        background: 'rgba(0,200,117,0.12)',
                        border: `2px solid ${D.green}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                      }}
                    >
                      <CheckCircle2 size={34} color={D.green} />
                    </div>
                    <h2 style={{ fontSize: '1.36rem', fontWeight: 900, color: D.green, margin: 0 }}>
                      Return is live
                    </h2>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: D.muted,
                        margin: '10px 0 22px',
                        lineHeight: 1.65,
                      }}
                    >
                      {createdReturn.matchedRideId
                        ? `Matched to ${createdReturn.matchedDriver ?? 'a Wasel captain'} on a live route.`
                        : 'Created in searching mode. It will stay visible until a live route picks it up.'}
                    </p>
                    <div
                      style={{
                        background: D.card2,
                        border: `1px solid ${D.gold}30`,
                        borderRadius: 18,
                        padding: '22px',
                        marginBottom: 18,
                        display: 'inline-block',
                      }}
                    >
                      <div
                        style={{
                          width: 116,
                          height: 116,
                          background:
                            'linear-gradient(135deg,rgba(240,168,48,0.15),rgba(0,200,232,0.10))',
                          border: `2px solid ${D.gold}40`,
                          borderRadius: 14,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 10px',
                        }}
                      >
                        <QrCode size={54} color={D.gold} />
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: D.MONO,
                          color: D.gold,
                          letterSpacing: '0.12em',
                        }}
                      >
                        {createdReturn.trackingId}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        onClick={() => {
                          setStep(0);
                          setRetailer('');
                          setOrderId('');
                          setItem('');
                          setSize('small');
                          setReason('');
                          setSelectedMatch('');
                          setCreatedReturn(null);
                        }}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          border: `1px solid ${D.border}`,
                          background: D.card2,
                          color: D.sub,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        New return
                      </button>
                      <button
                        onClick={() => nav('/app/packages')}
                        style={{
                          height: 44,
                          borderRadius: 12,
                          border: 'none',
                          background: `linear-gradient(135deg,${D.gold},#E89200)`,
                          color: '#040C18',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        Open tracking
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(240,168,48,0.12), rgba(8,18,35,0.96) 68%, rgba(0,200,232,0.08))',
                borderRadius: 22,
                padding: '20px',
                border: `1px solid ${D.border}`,
              }}
            >
              <div
                style={{
                  color: D.gold,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                Return state
              </div>
              <h2
                style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900, margin: '8px 0 10px' }}
              >
                {createdReturn ? 'Tracking live' : step >= 2 ? 'Matching now' : 'Building return'}
              </h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {railLines.map(line => (
                  <div
                    key={line}
                    style={{
                      background: 'rgba(5,12,24,0.44)',
                      borderRadius: 14,
                      border: `1px solid ${D.border}`,
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.8rem',
                      lineHeight: 1.5,
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
                {[
                  { label: 'Size', value: size },
                  { label: 'Lane', value: liveLane.replace(' → ', '-') },
                  {
                    label: 'Mode',
                    value: selectedTrip ? 'Matched' : step >= 2 ? 'Searching' : 'Draft',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    style={{
                      background: 'rgba(5,12,24,0.44)',
                      borderRadius: 14,
                      border: `1px solid ${D.border}`,
                      padding: '12px 12px 10px',
                    }}
                  >
                    <div
                      style={{
                        color: D.muted,
                        fontSize: '0.66rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.label}
                    </div>
                    <div
                      style={{ color: '#fff', fontSize: '0.78rem', fontWeight: 800, marginTop: 6 }}
                    >
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: D.card,
                border: `1px solid ${D.border}`,
                borderRadius: 20,
                padding: '18px',
              }}
            >
              <div style={{ color: '#fff', fontWeight: 900, marginBottom: 12 }}>Network pulse</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {[
                  `${matches.length} rides can absorb package returns into Amman.`,
                  selectedTrip
                    ? `${selectedTrip.driverName} leaves ${selectedTrip.departureTime}.`
                    : 'Select a ride to lock pricing and timing.',
                  createdReturn?.matchedRideId
                    ? `Tracking ID ${createdReturn.trackingId} is already active.`
                    : 'One ID will follow the full return flow.',
                ].map(line => (
                  <div
                    key={line}
                    style={{
                      background: D.card2,
                      borderRadius: 14,
                      border: `1px solid ${D.border}`,
                      padding: '12px 14px',
                      color: '#fff',
                      fontSize: '0.78rem',
                      lineHeight: 1.55,
                    }}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                background: D.card,
                border: `1px solid ${D.border}`,
                borderRadius: 20,
                padding: '18px',
              }}
            >
              <div style={{ color: '#fff', fontWeight: 900, marginBottom: 12 }}>Actions</div>
              <div style={{ display: 'grid', gap: 10 }}>
                <button
                  onClick={() => nav('/app/packages')}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: 'none',
                    background: `linear-gradient(135deg,${D.gold},#E89200)`,
                    color: '#040C18',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  Open package tracking
                </button>
                <button
                  onClick={() => nav('/app/find-ride')}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: `1px solid ${D.border}`,
                    background: D.card2,
                    color: '#fff',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Open ride network
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default ReturnMatching;
