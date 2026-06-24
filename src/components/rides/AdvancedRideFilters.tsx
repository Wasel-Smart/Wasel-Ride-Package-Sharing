/**
 * AdvancedRideFilters.tsx — Wasel advanced ride search filters
 *
 * Adds gender preference, car type, amenities, minimum rating,
 * women-only option, price range, and departure time window.
 * Integrates with the existing RideSearchDraft / RideResult types.
 */
import { useCallback, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useLanguage } from '../../contexts/LanguageContext';

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface RideAdvancedFilters {
  genderPreference: 'any' | 'male' | 'female';
  carTypes: string[];
  amenities: string[];
  minRating: number;
  womenOnly: boolean;
  prayerStops: boolean;
  musicFree: boolean;
  petFriendly: boolean;
  minPriceJod: number;
  maxPriceJod: number;
  departureWindowStart: string;  // "HH:MM"
  departureWindowEnd: string;
}

export const DEFAULT_FILTERS: RideAdvancedFilters = {
  genderPreference: 'any',
  carTypes: [],
  amenities: [],
  minRating: 0,
  womenOnly: false,
  prayerStops: false,
  musicFree: false,
  petFriendly: false,
  minPriceJod: 0,
  maxPriceJod: 999,
  departureWindowStart: '00:00',
  departureWindowEnd: '23:59',
};

function isDefault(filters: RideAdvancedFilters): boolean {
  return JSON.stringify(filters) === JSON.stringify(DEFAULT_FILTERS);
}

// ─── Filter application ───────────────────────────────────────────────────────

export interface FilterableRide {
  id: string;
  priceJod?: number;
  price?: number;  // fallback
  driverRating?: number;
  driverGender?: 'male' | 'female' | null;
  carType?: string;
  amenities?: string[];
  time?: string;   // "HH:MM"
  departureIso?: string;
}

export function applyAdvancedFilters<T extends FilterableRide>(
  rides: T[],
  filters: RideAdvancedFilters,
): T[] {
  if (isDefault(filters)) return rides;

  return rides.filter((ride) => {
    const price = ride.priceJod ?? ride.price ?? 0;
    if (price < filters.minPriceJod || price > filters.maxPriceJod) return false;

    if (filters.minRating > 0 && (ride.driverRating ?? 0) < filters.minRating) return false;

    if (filters.womenOnly && ride.driverGender !== 'female') return false;

    if (filters.genderPreference !== 'any' && ride.driverGender && ride.driverGender !== filters.genderPreference) return false;

    if (filters.carTypes.length > 0 && ride.carType && !filters.carTypes.includes(ride.carType)) return false;

    if (filters.amenities.length > 0) {
      const rideAmenities = ride.amenities ?? [];
      if (!filters.amenities.every((a) => rideAmenities.includes(a))) return false;
    }

    // Departure time window
    const rideTime = ride.time ?? ride.departureIso?.slice(11, 16) ?? '';
    if (rideTime && (rideTime < filters.departureWindowStart || rideTime > filters.departureWindowEnd)) return false;

    return true;
  });
}

// ─── UI Component ─────────────────────────────────────────────────────────────

interface AdvancedRideFiltersProps {
  filters: RideAdvancedFilters;
  onChange: (filters: RideAdvancedFilters) => void;
  resultCount?: number;
}

const CAR_TYPES = ['sedan', 'suv', 'van', 'minibus', 'pickup'];
const AMENITIES = ['wifi', 'charger', 'water', 'ac', 'music'];

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px',
        borderRadius: 999,
        border: `1px solid ${active ? 'rgba(10,155,142,0.8)' : 'rgba(255,255,255,0.15)'}`,
        background: active ? 'rgba(10,155,142,0.18)' : 'transparent',
        color: active ? '#0A9B8E' : 'rgba(255,255,255,0.65)',
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

function RatingStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star === value ? 0 : star)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: star <= value ? '#FBBF24' : 'rgba(255,255,255,0.3)', padding: 0 }}
          aria-label={`${star} stars`}
        >
          ★
        </button>
      ))}
      {value > 0 && (
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.76rem', marginLeft: 4, alignSelf: 'center' }}>
          {value}+
        </span>
      )}
    </div>
  );
}

export function AdvancedRideFilters({ filters, onChange, resultCount }: AdvancedRideFiltersProps) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);
  const activeCount = isDefault(filters) ? 0 : 1; // simplified

  const set = useCallback(
    <K extends keyof RideAdvancedFilters>(key: K, value: RideAdvancedFilters[K]) => {
      onChange({ ...filters, [key]: value });
    },
    [filters, onChange],
  );

  const toggleArray = useCallback(
    (key: 'carTypes' | 'amenities', val: string) => {
      const arr = filters[key];
      const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
      onChange({ ...filters, [key]: next });
    },
    [filters, onChange],
  );

  const reset = useCallback(() => onChange(DEFAULT_FILTERS), [onChange]);

  const labels = {
    title: ar ? 'فلاتر متقدمة' : 'Advanced filters',
    gender: ar ? 'تفضيل الجنس' : 'Gender preference',
    genderAny: ar ? 'أي' : 'Any',
    genderMale: ar ? 'ذكر' : 'Male driver',
    genderFemale: ar ? 'أنثى' : 'Female driver',
    carType: ar ? 'نوع السيارة' : 'Car type',
    amenities: ar ? 'المميزات' : 'Amenities',
    minRating: ar ? 'الحد الأدنى للتقييم' : 'Minimum rating',
    priceRange: ar ? 'نطاق السعر' : 'Price range (JOD)',
    departureWindow: ar ? 'نافذة المغادرة' : 'Departure window',
    preferences: ar ? 'تفضيلات' : 'Preferences',
    womenOnly: ar ? 'سائقات فقط' : 'Women-only driver',
    prayerStops: ar ? 'توقفات للصلاة' : 'Prayer stops',
    musicFree: ar ? 'بدون موسيقى' : 'Music-free ride',
    petFriendly: ar ? 'مناسب للحيوانات' : 'Pet-friendly',
    reset: ar ? 'إعادة تعيين' : 'Reset',
    apply: ar ? 'تطبيق' : `Apply${resultCount !== undefined ? ` (${resultCount})` : ''}`,
    filterBtn: ar ? 'تصفية' : 'Filters',
  };

  return (
    <div dir={ar ? 'rtl' : 'ltr'}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 999,
          border: `1px solid ${open || activeCount > 0 ? 'rgba(10,155,142,0.7)' : 'rgba(255,255,255,0.2)'}`,
          background: open || activeCount > 0 ? 'rgba(10,155,142,0.12)' : 'transparent',
          color: open || activeCount > 0 ? '#0A9B8E' : 'rgba(255,255,255,0.7)',
          fontWeight: 700,
          fontSize: '0.82rem',
          cursor: 'pointer',
        }}
      >
        <Filter size={14} />
        {labels.filterBtn}
        {activeCount > 0 && (
          <span style={{ background: '#0A9B8E', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 900 }}>
            {activeCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            marginTop: 12,
            padding: '20px 22px',
            borderRadius: 20,
            background: 'rgba(10,20,36,0.97)',
            border: '1px solid rgba(255,255,255,0.1)',
            display: 'grid',
            gap: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#fff', fontWeight: 900, fontSize: '0.95rem' }}>{labels.title}</span>
            <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* Gender */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.gender}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['any', 'male', 'female'] as const).map((g) => (
                <Chip
                  key={g}
                  label={g === 'any' ? labels.genderAny : g === 'male' ? labels.genderMale : labels.genderFemale}
                  active={filters.genderPreference === g}
                  onClick={() => set('genderPreference', g)}
                />
              ))}
            </div>
          </div>

          {/* Car types */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.carType}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CAR_TYPES.map((ct) => (
                <Chip key={ct} label={ct} active={filters.carTypes.includes(ct)} onClick={() => toggleArray('carTypes', ct)} />
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.amenities}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AMENITIES.map((a) => (
                <Chip key={a} label={a} active={filters.amenities.includes(a)} onClick={() => toggleArray('amenities', a)} />
              ))}
            </div>
          </div>

          {/* Rating */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.minRating}</div>
            <RatingStars value={filters.minRating} onChange={(v) => set('minRating', v)} />
          </div>

          {/* Price range */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.priceRange}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                min={0}
                max={filters.maxPriceJod}
                value={filters.minPriceJod}
                onChange={(e) => set('minPriceJod', Number(e.target.value))}
                style={{ width: 70, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.84rem' }}
              />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
              <input
                type="number"
                min={filters.minPriceJod}
                max={999}
                value={filters.maxPriceJod === 999 ? '' : filters.maxPriceJod}
                placeholder="Max"
                onChange={(e) => set('maxPriceJod', e.target.value ? Number(e.target.value) : 999)}
                style={{ width: 70, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          {/* Departure window */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.departureWindow}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="time" value={filters.departureWindowStart} onChange={(e) => set('departureWindowStart', e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.84rem' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>—</span>
              <input type="time" value={filters.departureWindowEnd} onChange={(e) => set('departureWindowEnd', e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.84rem' }} />
            </div>
          </div>

          {/* Boolean prefs */}
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.76rem', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{labels.preferences}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                ['womenOnly', labels.womenOnly],
                ['prayerStops', labels.prayerStops],
                ['musicFree', labels.musicFree],
                ['petFriendly', labels.petFriendly],
              ] as const).map(([key, label]) => (
                <label
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 10, background: filters[key] ? 'rgba(10,155,142,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filters[key] ? 'rgba(10,155,142,0.4)' : 'rgba(255,255,255,0.1)'}` }}
                >
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    style={{ accentColor: '#0A9B8E', width: 15, height: 15 }}
                  />
                  <span style={{ color: filters[key] ? '#0A9B8E' : 'rgba(255,255,255,0.7)', fontWeight: 700, fontSize: '0.8rem' }}>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <Button variant="ghost" size="sm" onClick={reset} className="text-white/50 hover:text-white">
              {labels.reset}
            </Button>
            <Button size="sm" onClick={() => setOpen(false)} className="bg-teal-600 hover:bg-teal-500 text-white">
              {labels.apply}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
