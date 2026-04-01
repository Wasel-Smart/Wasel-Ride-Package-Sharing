import { motion } from 'motion/react';
import { MapWrapper } from '../../../components/MapWrapper';
import { CITIES } from '../../../pages/waselCoreRideData';
import { DS, midpoint, pill, r, resolveCityCoord } from '../../../pages/waselServiceShared';
import {
  FIND_RIDE_PACKAGE_WEIGHTS,
  type FindRideStaticCopy,
} from '../findRideContent';

type PackageState = {
  from: string;
  to: string;
  weight: string;
  note: string;
  sent: boolean;
};

type FindRidePackagePanelProps = {
  ar: boolean;
  copy: FindRideStaticCopy;
  t: {
    from: string;
    to: string;
    weight: string;
    note: string;
    notePh: string;
    deliveryRoute: string;
    deliveryHint: string;
    packageFriendly: string;
    sendPackageBtn: string;
  };
  pkg: PackageState;
  setPkg: React.Dispatch<React.SetStateAction<PackageState>>;
};

export function FindRidePackagePanel({
  ar,
  copy,
  t,
  pkg,
  setPkg,
}: FindRidePackagePanelProps) {
  return (
    <div
      style={{
        background: DS.card,
        borderRadius: r(20),
        padding: 28,
        border: `1px solid ${DS.border}`,
      }}
    >
      {pkg.sent ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>{copy.packageIcon}</div>
          <h3 style={{ color: DS.green, fontWeight: 900, fontSize: '1.3rem' }}>{copy.packageSent}</h3>
          <p style={{ color: DS.sub, marginTop: 8 }}>
            {copy.packageHint} {pkg.to}.
          </p>
          <button
            onClick={() => setPkg((previous) => ({ ...previous, sent: false }))}
            style={{
              marginTop: 20,
              padding: '10px 24px',
              borderRadius: '99px',
              border: `1px solid ${DS.border}`,
              background: DS.card2,
              color: DS.cyan,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {copy.packageReset}
          </button>
        </div>
      ) : (
        <>
          <h3 style={{ color: '#fff', fontWeight: 800, marginBottom: 20 }}>{copy.packageTitle}</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 10,
              marginBottom: 18,
            }}
          >
            {copy.packageFlow.map((step) => (
              <div
                key={step.title}
                style={{
                  borderRadius: r(14),
                  padding: '12px 13px',
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                }}
              >
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '0.84rem', marginBottom: 4 }}>
                  {step.title}
                </div>
                <div style={{ color: DS.sub, fontSize: '0.74rem', lineHeight: 1.5 }}>{step.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gap: 14, gridTemplateColumns: '1fr 1fr' }}>
            {([
              { label: t.from, value: pkg.from, key: 'from' as const },
              { label: t.to, value: pkg.to, key: 'to' as const },
            ]).map((field) => (
              <div key={field.label}>
                <label
                  style={{
                    display: 'block',
                    color: DS.muted,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: ar ? undefined : '0.08em',
                    textTransform: ar ? undefined : 'uppercase',
                    marginBottom: 6,
                  }}
                >
                  {field.label}
                </label>
                <select
                  value={field.value}
                  onChange={(event) =>
                    setPkg((previous) => ({ ...previous, [field.key]: event.target.value }))
                  }
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: r(10),
                    border: `1px solid ${DS.border}`,
                    background: DS.card2,
                    color: '#fff',
                    fontFamily: DS.F,
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                >
                  {CITIES.map((city) => (
                    <option key={city} value={city} style={{ background: DS.card }}>
                      {city}
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
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: ar ? undefined : '0.08em',
                  textTransform: ar ? undefined : 'uppercase',
                  marginBottom: 6,
                }}
              >
                {t.weight}
              </label>
              <select
                value={pkg.weight}
                onChange={(event) => setPkg((previous) => ({ ...previous, weight: event.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: r(10),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: '#fff',
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  outline: 'none',
                }}
              >
                {FIND_RIDE_PACKAGE_WEIGHTS.map((weight) => (
                  <option key={weight} style={{ background: DS.card }}>
                    {weight}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  color: DS.muted,
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: ar ? undefined : '0.08em',
                  textTransform: ar ? undefined : 'uppercase',
                  marginBottom: 6,
                }}
              >
                {t.note}
              </label>
              <input
                placeholder={t.notePh}
                value={pkg.note}
                onChange={(event) => setPkg((previous) => ({ ...previous, note: event.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: r(10),
                  border: `1px solid ${DS.border}`,
                  background: DS.card2,
                  color: '#fff',
                  fontFamily: DS.F,
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              background: DS.card2,
              borderRadius: r(14),
              padding: 12,
              border: `1px solid ${DS.border}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 10,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <p style={{ color: DS.muted, fontSize: '0.7rem', fontWeight: 700, margin: '0 0 4px' }}>
                  {t.deliveryRoute}
                </p>
                <p style={{ color: DS.sub, fontSize: '0.8rem', margin: 0 }}>{t.deliveryHint}</p>
              </div>
              <span style={{ ...pill(DS.gold), fontSize: '0.72rem' }}>{t.packageFriendly}</span>
            </div>
            <MapWrapper
              mode="static"
              center={midpoint(resolveCityCoord(pkg.from), resolveCityCoord(pkg.to))}
              pickupLocation={resolveCityCoord(pkg.from)}
              dropoffLocation={resolveCityCoord(pkg.to)}
              height={180}
              showMosques={false}
              showRadars={false}
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setPkg((previous) => ({ ...previous, sent: true }))}
            style={{
              marginTop: 20,
              width: '100%',
              height: 52,
              borderRadius: r(14),
              border: 'none',
              background: DS.gradGold,
              color: '#fff',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            {copy.packageIcon} {t.sendPackageBtn}
          </motion.button>
        </>
      )}
    </div>
  );
}
