import { FormEvent, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Bus,
  CalendarDays,
  CheckCircle,
  CreditCard,
  Headphones,
  MapPin,
  Package,
  Search,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { WaselLogo } from '../../../components/wasel-ds/WaselLogo';
import { C, F, InlineCurrencySwitcher } from '../HomePageShared';
import { MobilityOSLandingMap } from '../MobilityOSLandingMap';
import type { TripMode } from './types';

interface HomeHeroSectionProps {
  ar: boolean;
  user: User | null;
  firstName: string;
  tripMode: TripMode;
  onTripModeChange: (mode: TripMode) => void;
  onNavigate: (path: string) => void;
  primaryTripPath: string;
}

type SearchKind = 'shared' | 'bus' | 'parcel';

const JORDAN_CITIES = ['Amman', 'Irbid', 'Aqaba', 'Zarqa', 'Jerash', 'Madaba'] as const;
const JORDAN_CITY_AR: Record<(typeof JORDAN_CITIES)[number], string> = {
  Amman: 'عمان',
  Irbid: 'إربد',
  Aqaba: 'العقبة',
  Zarqa: 'الزرقاء',
  Jerash: 'جرش',
  Madaba: 'مادبا',
};

function TripSearchCard({ ar, onNavigate }: { ar: boolean; onNavigate: (path: string) => void }) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [kind, setKind] = useState<SearchKind>('shared');
  const [from, setFrom] = useState('Amman');
  const [to, setTo] = useState('Irbid');
  const [date, setDate] = useState(today);
  const [seats, setSeats] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const tripTypes = [
    { key: 'shared' as const, title: ar ? 'رحلة مشتركة' : 'Shared Ride', icon: Users },
    { key: 'bus' as const, title: ar ? 'باص' : 'Bus', icon: Bus },
    { key: 'parcel' as const, title: ar ? 'توصيل طرد' : 'Parcel Delivery', icon: Package },
  ];

  const cityLabel = (city: string) =>
    ar ? JORDAN_CITY_AR[city as keyof typeof JORDAN_CITY_AR] || city : city;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSearched(false);

    const normalizedFrom = from.trim();
    const normalizedTo = to.trim();
    const count = Number(seats);

    if (!normalizedFrom || !normalizedTo || !date) {
      setError(ar ? 'أكمل نقطة الانطلاق والوجهة والتاريخ.' : 'Add origin, destination, and date.');
      return;
    }

    if (normalizedFrom.toLowerCase() === normalizedTo.toLowerCase()) {
      setError(ar ? 'اختر مدينتين مختلفتين.' : 'Choose two different cities.');
      return;
    }

    if (!Number.isFinite(count) || count < 1 || count > 8) {
      setError(ar ? 'العدد يجب أن يكون بين 1 و 8.' : 'Count must be between 1 and 8.');
      return;
    }

    setError('');
    setLoading(true);

    window.setTimeout(() => {
      const params = new URLSearchParams({
        from: normalizedFrom,
        to: normalizedTo,
        date,
        seats: String(count),
        search: '1',
        type: kind,
      });
      const base = kind === 'bus' ? '/bus' : kind === 'parcel' ? '/packages' : '/find-ride';
      setLoading(false);
      setSearched(true);
      onNavigate(`${base}?${params.toString()}`);
    }, 420);
  };

  return (
    <div className="wasel-home-search-card">
      <form onSubmit={handleSubmit} noValidate>
        <div className="wasel-home-search-heading">
          <div>
            <div className="wasel-home-eyebrow">{ar ? 'ابحث الآن' : 'Search now'}</div>
            <div className="wasel-home-search-subtitle">
              {ar ? 'أسعار واضحة وتوفر فوري قبل الحجز' : 'Clear prices and availability before booking'}
            </div>
          </div>
          <div className="wasel-home-price-note">
            {ar ? 'من 2 د.أ للمقعد' : 'From JOD 2 per seat'}
          </div>
        </div>

        <div className="wasel-home-trip-toggle" role="group" aria-label={ar ? 'نوع الرحلة' : 'Trip type'}>
          {tripTypes.map(option => {
            const Icon = option.icon;
            const selected = kind === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => setKind(option.key)}
                className={selected ? 'is-selected' : ''}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{option.title}</span>
              </button>
            );
          })}
        </div>

        <div className="wasel-home-search-grid">
          <label className="wasel-home-field">
            <span>
              <MapPin size={14} aria-hidden="true" />
              {ar ? 'من' : 'From'}
            </span>
            <input
              list="wasel-jordan-cities"
              value={from}
              onChange={event => setFrom(event.target.value)}
              autoComplete="off"
              aria-label={ar ? 'مدينة الانطلاق' : 'Origin city'}
            />
          </label>

          <label className="wasel-home-field">
            <span>
              <MapPin size={14} aria-hidden="true" />
              {ar ? 'إلى' : 'To'}
            </span>
            <input
              list="wasel-jordan-cities"
              value={to}
              onChange={event => setTo(event.target.value)}
              autoComplete="off"
              aria-label={ar ? 'مدينة الوصول' : 'Destination city'}
            />
          </label>

          <label className="wasel-home-field">
            <span>
              <CalendarDays size={14} aria-hidden="true" />
              {ar ? 'التاريخ' : 'Date'}
            </span>
            <input
              type="date"
              value={date}
              min={today}
              onChange={event => setDate(event.target.value)}
              aria-label={ar ? 'تاريخ الرحلة' : 'Trip date'}
            />
          </label>

          <label className="wasel-home-field">
            <span>
              <Users size={14} aria-hidden="true" />
              {kind === 'parcel' ? (ar ? 'قطع' : 'Items') : ar ? 'مقاعد' : 'Seats'}
            </span>
            <input
              type="number"
              min="1"
              max="8"
              inputMode="numeric"
              value={seats}
              onChange={event => setSeats(event.target.value)}
              aria-label={kind === 'parcel' ? (ar ? 'عدد القطع' : 'Number of items') : ar ? 'عدد المقاعد' : 'Number of seats'}
            />
          </label>
        </div>

        <datalist id="wasel-jordan-cities">
          {JORDAN_CITIES.map(city => (
            <option key={city} value={city}>
              {cityLabel(city)}
            </option>
          ))}
        </datalist>

        {error ? (
          <div className="wasel-home-form-error" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="wasel-home-search-skeleton" aria-live="polite" aria-label={ar ? 'جاري البحث' : 'Searching routes'}>
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {searched && !loading ? (
          <div className="wasel-home-empty-state" role="status">
            {ar ? 'إذا لم تظهر نتائج فورية، جرّب تاريخاً أو مساراً آخر.' : 'If nothing appears immediately, try another route or date.'}
          </div>
        ) : null}

        <button type="submit" className="wasel-home-search-submit" disabled={loading}>
          <Search size={17} aria-hidden="true" />
          {loading ? (ar ? 'جاري البحث...' : 'Searching...') : ar ? 'ابحث عن المسارات' : 'Search Routes'}
        </button>
      </form>
    </div>
  );
}

export function HomeHeroSection({
  ar,
  user,
  firstName,
  tripMode,
  onTripModeChange,
  onNavigate,
  primaryTripPath,
}: HomeHeroSectionProps) {
  void tripMode;
  void onTripModeChange;

  const trustSignals = [
    { icon: Shield, label: ar ? 'سائقون موثقون' : 'Verified drivers' },
    { icon: CreditCard, label: ar ? 'دفع آمن' : 'Secure payments' },
    { icon: Headphones, label: ar ? 'دعم مباشر' : 'Live support' },
    { icon: CheckCircle, label: ar ? 'إلغاء واضح' : 'Clear cancellation' },
    { icon: Star, label: ar ? 'تقييمات موثوقة' : 'Trusted ratings' },
  ];

  const ctas = [
    { label: ar ? 'ابحث عن رحلة' : 'Find a Ride', path: primaryTripPath, primary: true },
    { label: ar ? 'احجز باص' : 'Book Bus', path: '/bus' },
    { label: ar ? 'أرسل طرد' : 'Send Package', path: '/packages' },
  ];

  return (
    <motion.section className="wasel-home-hero" initial={false}>
      <div className="wasel-home-hero-copy">
        <div className="wasel-home-hero-topbar">
          <div className="wasel-home-brand-stack">
            <div className="wasel-home-badge">
              <Shield size={12} color={C.cyan} aria-hidden="true" />
              {ar ? 'تنقل موثوق في الأردن' : 'Trusted transport across Jordan'}
            </div>
            <WaselLogo size={34} theme="light" variant="full" />
          </div>
          {user ? <InlineCurrencySwitcher ar={ar} /> : null}
        </div>

        <h1 className="wasel-home-title">
          {ar
            ? `رحلات مشتركة وباصات وتوصيل طرود في الأردن${firstName ? `، ${firstName}` : ''}.`
            : `Shared rides, buses, and parcel delivery across Jordan${firstName ? `, ${firstName}` : ''}.`}
        </h1>

        <p className="wasel-home-subtitle">
          {ar
            ? 'ابحث عن رحلة، احجز باصاً، أرسل طرداً، قارن الأسعار، وتحرك بين المدن بسرعة ووضوح.'
            : 'Find rides, book buses, send packages, compare routes, and travel faster.'}
        </p>

        <div className="wasel-home-primary-actions" aria-label={ar ? 'إجراءات رئيسية' : 'Primary actions'}>
          {ctas.map(item => (
            <button
              key={item.path}
              type="button"
              className={item.primary ? 'is-primary' : ''}
              onClick={() => onNavigate(item.path)}
            >
              {item.label}
              {item.primary ? <ArrowRight size={16} aria-hidden="true" /> : null}
            </button>
          ))}
        </div>

        <div className="wasel-home-chip-row" aria-label={ar ? 'مؤشرات الثقة' : 'Trust signals'}>
          {trustSignals.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="wasel-home-trust-chip">
                <Icon size={14} aria-hidden="true" />
                {item.label}
              </div>
            );
          })}
        </div>

        <TripSearchCard ar={ar} onNavigate={onNavigate} />
      </div>

      <div className="wasel-home-hero-aside" aria-label={ar ? 'خريطة مسارات الأردن' : 'Jordan route map'}>
        <MobilityOSLandingMap minimalText preferredHeight={520} />
      </div>
    </motion.section>
  );
}
